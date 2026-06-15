import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { authenticate, isAuthResponse } from "../shared/auth";
import { getPool, sql } from "../shared/sql";
import { compareRoutines } from "./CompareRoutine";

interface RoutinePayload {
  routine: Record<string, any>;
  reports?: Record<string, any>[];
  mappings?: Record<string, any>[];
  attributes?: Record<string, any>[];
  sheetCatalog?: Record<string, any>[];
  outputSheets?: Record<string, any>[];
  sheetDetails?: Record<string, any>[];
  userInputs?: Record<string, any>[];
}

const requiredString = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

const validatePayload = (body: RoutinePayload): string | null => {
  const routine = body.routine;
  if (!routine || !requiredString(routine.id, 50)) return "Missing or invalid routine ID.";
  if (!requiredString(routine.routine_name, 255)) return "Routine name is required.";
  if (!requiredString(routine.routine_display_name, 255)) return "Routine display name is required.";
  if (!requiredString(routine.routine_group, 100)) return "Routine group is required.";
  if (!requiredString(routine.routine_type, 100)) return "Routine type is required.";
  if (!Array.isArray(routine.region) || routine.region.length === 0) return "At least one region is required.";

  const collections = [
    body.reports || [],
    body.mappings || [],
    body.attributes || [],
    body.sheetCatalog || [],
    body.outputSheets || [],
    body.sheetDetails || [],
    body.userInputs || []
  ];
  if (collections.some(items => !Array.isArray(items) || items.length > 5000)) {
    return "Routine payload exceeds collection limits.";
  }

  const reportIds = new Set((body.reports || []).map(item => item.id));
  const mappingIds = new Set((body.mappings || []).map(item => item.id));
  const sheetIds = new Set((body.outputSheets || []).map(item => item.id));
  const assignedSheetIds = new Set<string>();
  if ((body.mappings || []).some(item => !reportIds.has(item.report_id))) return "A mapping references an unknown report.";
  if ((body.attributes || []).some(item => !mappingIds.has(item.cdm_mapping_id))) return "An attribute references an unknown mapping.";
  if ((body.sheetDetails || []).some(item => !sheetIds.has(item.output_sheet_id))) return "A sheet detail references an unknown sheet.";
  if ((body.outputSheets || []).some(item => item.routine_id !== routine.id)) return "A sheet references the wrong routine.";
  for (const item of body.outputSheets || []) {
    const key = item.sheet_id || (typeof item.sheet_name === "string" ? item.sheet_name.trim().toLowerCase() : "");
    if (!key) return "Each output sheet must reference a shared sheet.";
    if (assignedSheetIds.has(key)) return "A routine cannot reference the same sheet more than once.";
    assignedSheetIds.add(key);
  }
  if ((body.reports || []).some(item => item.routine_id !== routine.id)) return "A report references the wrong routine.";
  if ((body.userInputs || []).some(item => item.routine_id !== routine.id)) return "A user input references the wrong routine.";
  return null;
};

const normalizeSheetName = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeClassification = (value: unknown): "Main" | "Helper" | "Unclassified" => {
  if (value === "Main" || value === "Helper" || value === "Unclassified") return value;
  return "Unclassified";
};

const normalizeRoutine = (routine: Record<string, any>) => ({
  ...routine,
  fund_types: Array.isArray(routine.fund_types) ? routine.fund_types : [],
  region: Array.isArray(routine.region) ? routine.region : [],
  helper_routines: Array.isArray(routine.helper_routines) ? routine.helper_routines : [],
  is_active: Boolean(routine.is_active)
});

export async function saveRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const auth = await authenticate(request, ["Admin", "User"], context);
  if (isAuthResponse(auth)) return auth;

  let body: RoutinePayload;
  try {
    body = await request.json() as RoutinePayload;
  } catch {
    return { status: 400, body: "Invalid JSON payload." };
  }

  const validationError = validatePayload(body);
  if (validationError) return { status: 400, body: validationError };

  const { routine, reports = [], mappings = [], attributes = [], sheetCatalog = [], outputSheets = [], sheetDetails = [], userInputs = [] } = body;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const existingResult = await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), routine.id)
      .query("SELECT * FROM Routines WITH (UPDLOCK, HOLDLOCK) WHERE id = @id");
    const existing = existingResult.recordset[0];
    const changeType = existing ? "Updated" : "Created";

    if (existing) {
      if (!requiredString(routine.row_version, 100)) {
        await transaction.rollback();
        return { status: 409, body: "This routine has changed. Reload it before saving." };
      }
      const suppliedVersion = Buffer.from(routine.row_version, "base64");
      if (!Buffer.isBuffer(existing.row_version) || !existing.row_version.equals(suppliedVersion)) {
        await transaction.rollback();
        return { status: 409, body: "This routine was updated by another user. Reload and retry." };
      }
    }

    let delta: Record<string, any> = body;
    if (existing) {
      const req = () => new sql.Request(transaction).input("id", sql.NVarChar(50), routine.id);
      const existingData = {
        routine: normalizeRoutine(existing),
        reports: (await req().query("SELECT * FROM Reports WHERE routine_id = @id")).recordset,
        mappings: (await req().query("SELECT m.* FROM CDMMappings m JOIN Reports r ON m.report_id = r.id WHERE r.routine_id = @id")).recordset,
        attributes: (await req().query("SELECT a.* FROM Attributes a JOIN CDMMappings m ON a.cdm_mapping_id = m.id JOIN Reports r ON m.report_id = r.id WHERE r.routine_id = @id")).recordset,
        outputSheets: (await req().query("SELECT * FROM OutputSheets WHERE routine_id = @id")).recordset,
        sheetDetails: (await req().query("SELECT d.* FROM SheetDetails d JOIN OutputSheets s ON d.output_sheet_id = s.id WHERE s.routine_id = @id")).recordset,
        userInputs: (await req().query("SELECT * FROM UserInputs WHERE routine_id = @id")).recordset
      };
      delta = compareRoutines(existingData, body);
    }

    const routineRequest = new sql.Request(transaction)
      .input("id", sql.NVarChar(50), routine.id)
      .input("routine_name", sql.NVarChar(255), routine.routine_name.trim())
      .input("routine_display_name", sql.NVarChar(255), routine.routine_display_name.trim())
      .input("version", sql.NVarChar(50), routine.version || "")
      .input("last_edited_date", sql.DateTime2, new Date())
      .input("routine_group", sql.NVarChar(100), routine.routine_group.trim())
      .input("routine_type", sql.NVarChar(100), routine.routine_type.trim())
      .input("fund_types", sql.NVarChar(sql.MAX), JSON.stringify(routine.fund_types || []))
      .input("capital_structure", sql.NVarChar(100), routine.capital_structure || null)
      .input("region", sql.NVarChar(sql.MAX), JSON.stringify(routine.region || []))
      .input("helper_routines", sql.NVarChar(sql.MAX), JSON.stringify(routine.helper_routines || []))
      .input("to_show", sql.NVarChar(10), routine.to_show || "Yes")
      .input("display_in_dropdown", sql.NVarChar(10), routine.display_in_dropdown || "Yes");

    if (existing) {
      await routineRequest.query(`
        UPDATE Routines SET routine_name=@routine_name, routine_display_name=@routine_display_name,
          version=@version, last_edited_date=@last_edited_date, routine_group=@routine_group,
          routine_type=@routine_type, fund_types=@fund_types, capital_structure=@capital_structure,
          region=@region, helper_routines=@helper_routines, to_show=@to_show,
          display_in_dropdown=@display_in_dropdown, is_active=1
        WHERE id=@id`);

      await new sql.Request(transaction).input("id", sql.NVarChar(50), routine.id).query(`
        DELETE a FROM Attributes a JOIN CDMMappings m ON a.cdm_mapping_id=m.id JOIN Reports r ON m.report_id=r.id WHERE r.routine_id=@id;
        DELETE m FROM CDMMappings m JOIN Reports r ON m.report_id=r.id WHERE r.routine_id=@id;
        DELETE FROM Reports WHERE routine_id=@id;
        DELETE d FROM SheetDetails d JOIN OutputSheets s ON d.output_sheet_id=s.id WHERE s.routine_id=@id;
        DELETE FROM OutputSheets WHERE routine_id=@id;
        DELETE FROM UserInputs WHERE routine_id=@id;`);
    } else {
      await routineRequest.query(`
        INSERT INTO Routines
          (id,routine_name,routine_display_name,version,last_edited_date,routine_group,routine_type,fund_types,capital_structure,region,helper_routines,to_show,display_in_dropdown,is_active)
        VALUES
          (@id,@routine_name,@routine_display_name,@version,@last_edited_date,@routine_group,@routine_type,@fund_types,@capital_structure,@region,@helper_routines,@to_show,@display_in_dropdown,1)`);
    }

    for (const item of reports) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), item.id).input("routine_id", sql.NVarChar(50), routine.id)
        .input("report_name", sql.NVarChar(255), item.report_name).input("is_optional", sql.Bit, item.is_optional ? 1 : 0)
        .query("INSERT INTO Reports (id,routine_id,report_name,is_optional) VALUES (@id,@routine_id,@report_name,@is_optional)");
    }
    for (const item of mappings) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), item.id).input("report_id", sql.NVarChar(50), item.report_id)
        .input("field_mapping_name", sql.NVarChar(255), item.field_mapping_name).input("data_type", sql.NVarChar(50), item.data_type)
        .input("is_required", sql.Bit, item.is_required ? 1 : 0).input("blanks_allowed", sql.NVarChar(20), item.blanks_allowed)
        .query("INSERT INTO CDMMappings (id,report_id,field_mapping_name,data_type,is_required,blanks_allowed) VALUES (@id,@report_id,@field_mapping_name,@data_type,@is_required,@blanks_allowed)");
    }
    for (const item of attributes) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), item.id).input("cdm_mapping_id", sql.NVarChar(50), item.cdm_mapping_id)
        .input("attribute_name", sql.NVarChar(255), item.attribute_name)
        .query("INSERT INTO Attributes (id,cdm_mapping_id,attribute_name) VALUES (@id,@cdm_mapping_id,@attribute_name)");
    }

    const catalogById = new Map(sheetCatalog.map(item => [item.id, item]));
    const catalogByNameKey = new Map(sheetCatalog.map(item => [normalizeSheetName(item.sheet_name), item]));
    const preparedSheets: Record<string, any>[] = [];

    for (const item of outputSheets) {
      const payloadCatalog = (item.sheet_id ? catalogById.get(item.sheet_id) : undefined)
        || catalogByNameKey.get(normalizeSheetName(item.sheet_name))
        || item;
      const sheetName = String(payloadCatalog.sheet_name || item.sheet_name || "").trim();
      const nameKey = normalizeSheetName(sheetName);
      if (!sheetName || !nameKey) {
        await transaction.rollback();
        return { status: 400, body: "Each output sheet must have a name." };
      }
      const classification = normalizeClassification(payloadCatalog.classification);
      const requestedId = item.sheet_id || payloadCatalog.id;

      const existingCatalogResult = await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), requestedId || "")
        .input("name_key", sql.NVarChar(255), nameKey)
        .query("SELECT TOP 1 * FROM SheetCatalog WITH (UPDLOCK, HOLDLOCK) WHERE id=@id OR name_key=@name_key");
      const existingCatalog = existingCatalogResult.recordset[0];
      let sheetId = existingCatalog?.id || requestedId || item.id;

      if (existingCatalog) {
        const changingCatalog =
          existingCatalog.sheet_name !== sheetName ||
          existingCatalog.classification !== classification;
        if (changingCatalog && payloadCatalog.row_version) {
          const suppliedVersion = Buffer.from(payloadCatalog.row_version, "base64");
          if (!Buffer.isBuffer(existingCatalog.row_version) || !existingCatalog.row_version.equals(suppliedVersion)) {
            await transaction.rollback();
            return { status: 409, body: "A sheet was updated by another user. Reload and retry." };
          }
        }
        if (changingCatalog) {
          await new sql.Request(transaction)
            .input("id", sql.NVarChar(50), sheetId)
            .input("sheet_name", sql.NVarChar(255), sheetName)
            .input("classification", sql.NVarChar(20), classification)
            .query("UPDATE SheetCatalog SET sheet_name=@sheet_name, classification=@classification WHERE id=@id");
        }
      } else {
        const maxOrderResult = await new sql.Request(transaction)
          .query("SELECT COALESCE(MAX(global_order), 0) + 1 AS next_order FROM SheetCatalog WITH (UPDLOCK, HOLDLOCK)");
        const nextOrder = maxOrderResult.recordset[0]?.next_order || 1;
        await new sql.Request(transaction)
          .input("id", sql.NVarChar(50), sheetId)
          .input("sheet_name", sql.NVarChar(255), sheetName)
          .input("name_key", sql.NVarChar(255), nameKey)
          .input("classification", sql.NVarChar(20), classification)
          .input("global_order", sql.Int, nextOrder)
          .query("INSERT INTO SheetCatalog (id,sheet_name,name_key,classification,global_order) VALUES (@id,@sheet_name,@name_key,@classification,@global_order)");
      }

      preparedSheets.push({
        ...item,
        sheet_id: sheetId,
        sheet_name: sheetName
      });
    }

    for (const item of preparedSheets) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), item.id).input("routine_id", sql.NVarChar(50), routine.id)
        .input("sheet_id", sql.NVarChar(50), item.sheet_id)
        .input("sheet_name", sql.NVarChar(255), item.sheet_name).input("order_index", sql.Int, item.order_index || 0)
        .query("INSERT INTO OutputSheets (id,routine_id,sheet_id,sheet_name,order_index) VALUES (@id,@routine_id,@sheet_id,@sheet_name,@order_index)");
    }
    for (const item of sheetDetails) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), item.id).input("output_sheet_id", sql.NVarChar(50), item.output_sheet_id)
        .input("field_name", sql.NVarChar(255), item.field_name).input("fill_color_format", sql.NVarChar(20), item.fill_color_format)
        .input("data_format", sql.NVarChar(50), item.data_format).input("column_order", sql.Int, item.column_order)
        .input("document_type", sql.NVarChar(100), item.document_type || null).input("verification_rde_name", sql.NVarChar(255), item.verification_rde_name || null)
        .input("verification_required_status", sql.NVarChar(50), item.verification_required_status || null).input("field_description", sql.NVarChar(sql.MAX), item.field_description || null)
        .input("verification_data_type", sql.NVarChar(50), item.verification_data_type || null).input("old_model_name", sql.NVarChar(100), item.old_model_name || null)
        .input("old_model_mapping", sql.NVarChar(255), item.old_model_mapping || null).input("new_model_name", sql.NVarChar(100), item.new_model_name || null)
        .input("table_name", sql.NVarChar(100), item.table_name || null).input("new_model_mapping", sql.NVarChar(255), item.new_model_mapping || null)
        .query(`INSERT INTO SheetDetails
          (id,output_sheet_id,field_name,fill_color_format,data_format,column_order,document_type,verification_rde_name,verification_required_status,field_description,verification_data_type,old_model_name,old_model_mapping,new_model_name,table_name,new_model_mapping)
          VALUES (@id,@output_sheet_id,@field_name,@fill_color_format,@data_format,@column_order,@document_type,@verification_rde_name,@verification_required_status,@field_description,@verification_data_type,@old_model_name,@old_model_mapping,@new_model_name,@table_name,@new_model_mapping)`);
    }
    for (const item of userInputs) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), item.id).input("routine_id", sql.NVarChar(50), routine.id)
        .input("user_input_name", sql.NVarChar(255), item.user_input_name).input("input_location", sql.NVarChar(100), item.input_location)
        .input("textbox_type", sql.NVarChar(100), item.textbox_type).input("validations", sql.NVarChar(255), item.validations || null)
        .input("min_value", sql.NVarChar(50), item.min_value || null).input("max_value", sql.NVarChar(50), item.max_value || null)
        .input("is_mandatory", sql.Bit, item.is_mandatory ? 1 : 0)
        .query("INSERT INTO UserInputs (id,routine_id,user_input_name,input_location,textbox_type,validations,min_value,max_value,is_mandatory) VALUES (@id,@routine_id,@user_input_name,@input_location,@textbox_type,@validations,@min_value,@max_value,@is_mandatory)");
    }

    await new sql.Request(transaction)
      .input("routine_id", sql.NVarChar(50), routine.id).input("routine_name", sql.NVarChar(255), routine.routine_name)
      .input("changed_by", sql.NVarChar(255), auth.username).input("change_type", sql.NVarChar(50), changeType)
      .input("change_details", sql.NVarChar(sql.MAX), JSON.stringify(delta))
      .query("INSERT INTO ActivityLog (routine_id,routine_name,changed_by,change_type,change_details) VALUES (@routine_id,@routine_name,@changed_by,@change_type,@change_details)");

    const versionResult = await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), routine.id)
      .query("SELECT row_version FROM Routines WHERE id=@id");
    await transaction.commit();

    return {
      status: 200,
      jsonBody: {
        success: true,
        row_version: versionResult.recordset[0].row_version.toString("base64")
      }
    };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* transaction was not active */ }
    context.error(error);
    return { status: 500, body: "Error saving routine." };
  }
}

app.http("routine", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: saveRoutine
});
