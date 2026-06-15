import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, sql } from '../shared/sql';
import { authenticate, isAuthResponse } from '../shared/auth';
import { randomUUID } from 'crypto';

// Generate a random UUID-like string
function generateId(): string {
    return randomUUID();
}

interface ImportPayload {
    routines: any[];
    reports: any[];
    mappings: any[];
    attributes: any[];
    outputSheets: any[];
    sheetDetails: any[];
    userInputs: any[];
}

interface ValidationError {
    routine_ref_id: string | number;
    field: string;
    message: string;
}

export async function importRoutines(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const auth = await authenticate(request, ['Admin'], context);
    if (isAuthResponse(auth)) return auth;
    let body: ImportPayload;
    try {
        body = await request.json() as ImportPayload;
    } catch (error) {
        return { status: 400, body: "Invalid JSON payload" };
    }

    const { routines, reports, mappings, attributes, outputSheets, sheetDetails, userInputs } = body;

    if (!routines || !Array.isArray(routines) || routines.length === 0) {
        return { status: 400, body: "No routines provided in the payload" };
    }
    const collections = [routines, reports || [], mappings || [], attributes || [], outputSheets || [], sheetDetails || [], userInputs || []];
    if (collections.some(items => !Array.isArray(items) || items.length > 10000)) {
        return { status: 413, body: "Import exceeds the maximum of 10,000 rows per sheet." };
    }

    // Validation
    const validationErrors: ValidationError[] = [];

    // Validate mandatory fields for routines
    routines.forEach((r, idx) => {
        const refId = r['Ref_ID'] || r.Ref_ID || idx + 1;
        if (!r['Routine Name'] && !r.routine_name) {
            validationErrors.push({ routine_ref_id: refId, field: 'Routine Name', message: 'Routine Name is required' });
        }
        if (!r['Type'] && !r.routine_type) {
            validationErrors.push({ routine_ref_id: refId, field: 'Type', message: 'Type is required' });
        }
        if (!r['Region'] && !r.region) {
            validationErrors.push({ routine_ref_id: refId, field: 'Region', message: 'Region is required' });
        }
    });
    const refIds = routines.map(r => String(r['Ref_ID'] || r.Ref_ID || ''));
    refIds.forEach((id, index) => {
        if (!id || refIds.indexOf(id) !== index) {
            validationErrors.push({ routine_ref_id: id || 'Unknown', field: 'Ref_ID', message: 'Ref_ID values must be present and unique.' });
        }
    });

    const reportKeys = new Set((reports || []).map(rep => `${String(rep['Routine_Ref_ID'] || rep.Routine_Ref_ID)}|${rep['Report Name'] || rep.report_name}`));
    const mappingKeys = new Set((mappings || []).map(map => `${String(map['Routine_Ref_ID'] || map.Routine_Ref_ID)}|${map['Report Name'] || map.report_name}|${map['Field Name'] || map.field_mapping_name}`));
    const sheetKeys = new Set((outputSheets || []).map(sheet => `${String(sheet['Routine_Ref_ID'] || sheet.Routine_Ref_ID)}|${sheet['Sheet Name'] || sheet.sheet_name}`));
    (mappings || []).forEach((map, idx) => {
        const key = `${String(map['Routine_Ref_ID'] || map.Routine_Ref_ID)}|${map['Report Name'] || map.report_name}`;
        if (!reportKeys.has(key)) validationErrors.push({ routine_ref_id: map['Routine_Ref_ID'] || 'Unknown', field: 'Report Name', message: `CDM Mappings row ${idx + 1} references a missing report.` });
    });
    (attributes || []).forEach((attribute, idx) => {
        const key = `${String(attribute['Routine_Ref_ID'] || attribute.Routine_Ref_ID)}|${attribute['Report Name'] || attribute.report_name}|${attribute['CDM Field Name'] || attribute.cdm_field_name}`;
        if (!mappingKeys.has(key)) validationErrors.push({ routine_ref_id: attribute['Routine_Ref_ID'] || 'Unknown', field: 'CDM Field Name', message: `Attributes row ${idx + 1} references a missing mapping.` });
    });
    (sheetDetails || []).forEach((detail, idx) => {
        const key = `${String(detail['Routine_Ref_ID'] || detail.Routine_Ref_ID)}|${detail['Sheet Name'] || detail.sheet_name}`;
        if (!sheetKeys.has(key)) validationErrors.push({ routine_ref_id: detail['Routine_Ref_ID'] || 'Unknown', field: 'Sheet Name', message: `Sheet Details row ${idx + 1} references a missing output sheet.` });
    });

    // Bot readiness validation for sheet details
    (sheetDetails || []).forEach((sd, idx) => {
        const status = sd['Verification Required Status'] || sd.verification_required_status;
        if (status === 'Required') {
            if (!sd['Document Type'] && !sd.document_type) {
                validationErrors.push({
                    routine_ref_id: sd['Routine_Ref_ID'] || sd.Routine_Ref_ID || 'Unknown',
                    field: 'Document Type',
                    message: `Sheet Details row ${idx + 1}: Document Type is required when Verification Required Status is "Required"`
                });
            }
            if (!sd['Verification RDE Name'] && !sd.verification_rde_name) {
                validationErrors.push({
                    routine_ref_id: sd['Routine_Ref_ID'] || sd.Routine_Ref_ID || 'Unknown',
                    field: 'Verification RDE Name',
                    message: `Sheet Details row ${idx + 1}: Verification RDE Name is required when Verification Required Status is "Required"`
                });
            }
        }
    });

    if (validationErrors.length > 0) {
        return {
            status: 400,
            jsonBody: {
                error: 'Validation failed',
                details: validationErrors
            }
        };
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Build ID maps for hierarchy construction
        // Map from Ref_ID -> new routine UUID
        const routineIdMap = new Map<string, string>();
        // Map from Ref_ID + Report Name -> new report UUID
        const reportIdMap = new Map<string, string>();
        // Map from Ref_ID + Report Name + Field Name -> new CDM mapping UUID
        const mappingIdMap = new Map<string, string>();
        // Map from Ref_ID + Sheet Name -> new output sheet UUID
        const sheetIdMap = new Map<string, string>();

        const importedRoutineNames: string[] = [];

        // 1. Process Routines
        for (const r of routines) {
            const refId = String(r['Ref_ID'] || r.Ref_ID);
            const routineUuid = generateId();
            routineIdMap.set(refId, routineUuid);

            const routineName = r['Routine Name'] || r.routine_name;
            importedRoutineNames.push(routineName);

            // Parse comma-separated fields to JSON arrays
            let regionValue = r['Region'] || r.region || '';
            let fundTypesValue = r['Fund Types'] || r.fund_types || '';

            if (typeof regionValue === 'string') {
                regionValue = regionValue.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            }
            if (typeof fundTypesValue === 'string') {
                fundTypesValue = fundTypesValue.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            }

            const toShow = r['To Show'] || r.to_show || 'Yes';
            const displayInDropdown = r['Display in Dropdown'] || r.display_in_dropdown || 'Yes';

            await new sql.Request(transaction)
                .input('id', sql.NVarChar(50), routineUuid)
                .input('routine_name', sql.NVarChar(255), routineName)
                .input('routine_display_name', sql.NVarChar(255), r['Display Name'] || r.routine_display_name || '')
                .input('version', sql.NVarChar(50), r['Version'] || r.version || '')
                .input('last_edited_date', sql.DateTime2, new Date())
                .input('routine_group', sql.NVarChar(100), r['Group'] || r.routine_group || null)
                .input('routine_type', sql.NVarChar(100), r['Type'] || r.routine_type)
                .input('fund_types', sql.NVarChar(sql.MAX), JSON.stringify(fundTypesValue))
                .input('capital_structure', sql.NVarChar(100), r['Capital Structure'] || r.capital_structure || null)
                .input('region', sql.NVarChar(sql.MAX), JSON.stringify(regionValue))
                .input('helper_routines', sql.NVarChar(sql.MAX), JSON.stringify([]))
                .input('to_show', sql.NVarChar(10), toShow)
                .input('display_in_dropdown', sql.NVarChar(10), displayInDropdown)
                .input('is_active', sql.Bit, 1)
                .query(`INSERT INTO Routines 
                    (id, routine_name, routine_display_name, version, last_edited_date, routine_group, routine_type, fund_types, capital_structure, region, helper_routines, to_show, display_in_dropdown, is_active)
                    VALUES 
                    (@id, @routine_name, @routine_display_name, @version, @last_edited_date, @routine_group, @routine_type, @fund_types, @capital_structure, @region, @helper_routines, @to_show, @display_in_dropdown, @is_active)`);
        }

        // 2. Process Reports
        for (const rep of (reports || [])) {
            const refId = String(rep['Routine_Ref_ID'] || rep.Routine_Ref_ID);
            const routineUuid = routineIdMap.get(refId);
            if (!routineUuid) continue; // Skip if no matching routine

            const reportUuid = generateId();
            const reportName = rep['Report Name'] || rep.report_name;
            const mapKey = `${refId}|${reportName}`;
            reportIdMap.set(mapKey, reportUuid);

            const isOptional = rep['Is Optional'] === true || rep['Is Optional'] === 'TRUE' || rep.is_optional === true;

            await new sql.Request(transaction)
                .input('id', sql.NVarChar(50), reportUuid)
                .input('routine_id', sql.NVarChar(50), routineUuid)
                .input('report_name', sql.NVarChar(255), reportName)
                .input('is_optional', sql.Bit, isOptional ? 1 : 0)
                .query('INSERT INTO Reports (id, routine_id, report_name, is_optional) VALUES (@id, @routine_id, @report_name, @is_optional)');
        }

        // 3. Process CDM Mappings
        for (const m of (mappings || [])) {
            const refId = String(m['Routine_Ref_ID'] || m.Routine_Ref_ID);
            const reportName = m['Report Name'] || m.report_name;
            const reportKey = `${refId}|${reportName}`;
            const reportUuid = reportIdMap.get(reportKey);
            if (!reportUuid) continue;

            const mappingUuid = generateId();
            const fieldName = m['Field Name'] || m.field_mapping_name;
            const mappingKey = `${refId}|${reportName}|${fieldName}`;
            mappingIdMap.set(mappingKey, mappingUuid);

            const isRequired = m['Required?'] === true || m['Required?'] === 'TRUE' || m.is_required === true;
            const blanksAllowed = m['Blanks Allowed?'] || m.blanks_allowed || 'Allowed';

            await new sql.Request(transaction)
                .input('id', sql.NVarChar(50), mappingUuid)
                .input('report_id', sql.NVarChar(50), reportUuid)
                .input('field_mapping_name', sql.NVarChar(255), fieldName)
                .input('data_type', sql.NVarChar(50), m['Data Type'] || m.data_type || 'String')
                .input('is_required', sql.Bit, isRequired ? 1 : 0)
                .input('blanks_allowed', sql.NVarChar(20), blanksAllowed)
                .query('INSERT INTO CDMMappings (id, report_id, field_mapping_name, data_type, is_required, blanks_allowed) VALUES (@id, @report_id, @field_mapping_name, @data_type, @is_required, @blanks_allowed)');
        }

        // 4. Process Attributes
        for (const a of (attributes || [])) {
            const refId = String(a['Routine_Ref_ID'] || a.Routine_Ref_ID);
            const reportName = a['Report Name'] || a.report_name;
            const cdmFieldName = a['CDM Field Name'] || a.cdm_field_name;
            const mappingKey = `${refId}|${reportName}|${cdmFieldName}`;
            const mappingUuid = mappingIdMap.get(mappingKey);
            if (!mappingUuid) continue;

            const attrUuid = generateId();
            await new sql.Request(transaction)
                .input('id', sql.NVarChar(50), attrUuid)
                .input('cdm_mapping_id', sql.NVarChar(50), mappingUuid)
                .input('attribute_name', sql.NVarChar(255), a['Attribute Name'] || a.attribute_name)
                .query('INSERT INTO Attributes (id, cdm_mapping_id, attribute_name) VALUES (@id, @cdm_mapping_id, @attribute_name)');
        }

        // 5. Process Output Sheets
        for (const s of (outputSheets || [])) {
            const refId = String(s['Routine_Ref_ID'] || s.Routine_Ref_ID);
            const routineUuid = routineIdMap.get(refId);
            if (!routineUuid) continue;

            const sheetUuid = generateId();
            const sheetName = s['Sheet Name'] || s.sheet_name;
            const sheetKey = `${refId}|${sheetName}`;
            sheetIdMap.set(sheetKey, sheetUuid);

            await new sql.Request(transaction)
                .input('id', sql.NVarChar(50), sheetUuid)
                .input('routine_id', sql.NVarChar(50), routineUuid)
                .input('sheet_name', sql.NVarChar(255), sheetName)
                .input('order_index', sql.Int, parseInt(s['Order Index'] || s.order_index) || 0)
                .query('INSERT INTO OutputSheets (id, routine_id, sheet_name, order_index) VALUES (@id, @routine_id, @sheet_name, @order_index)');
        }

        // 6. Process Sheet Details (RDEs)
        for (const d of (sheetDetails || [])) {
            const refId = String(d['Routine_Ref_ID'] || d.Routine_Ref_ID);
            const sheetName = d['Sheet Name'] || d.sheet_name;
            const sheetKey = `${refId}|${sheetName}`;
            const sheetUuid = sheetIdMap.get(sheetKey);
            if (!sheetUuid) continue;

            const detailUuid = generateId();
            const fillColor = d['Fill Color'] || d.fill_color_format || '#FFFFFF';
            const dataFormat = d['Data Format'] || d.data_format || 'General';

            await new sql.Request(transaction)
                .input('id', sql.NVarChar(50), detailUuid)
                .input('output_sheet_id', sql.NVarChar(50), sheetUuid)
                .input('field_name', sql.NVarChar(255), d['Field Name'] || d.field_name)
                .input('fill_color_format', sql.NVarChar(20), fillColor)
                .input('data_format', sql.NVarChar(50), dataFormat)
                .input('column_order', sql.Int, parseInt(d['Column Order'] || d.column_order) || 0)
                .input('document_type', sql.NVarChar(100), d['Document Type'] || d.document_type || null)
                .input('verification_rde_name', sql.NVarChar(255), d['Verification RDE Name'] || d.verification_rde_name || null)
                .input('verification_required_status', sql.NVarChar(50), d['Verification Required Status'] || d.verification_required_status || null)
                .input('field_description', sql.NVarChar(sql.MAX), d['Description'] || d.field_description || null)
                .query(`INSERT INTO SheetDetails 
                    (id, output_sheet_id, field_name, fill_color_format, data_format, column_order, document_type, verification_rde_name, verification_required_status, field_description)
                    VALUES 
                    (@id, @output_sheet_id, @field_name, @fill_color_format, @data_format, @column_order, @document_type, @verification_rde_name, @verification_required_status, @field_description)`);
        }

        // 7. Process User Inputs
        for (const u of (userInputs || [])) {
            const refId = String(u['Routine_Ref_ID'] || u.Routine_Ref_ID);
            const routineUuid = routineIdMap.get(refId);
            if (!routineUuid) continue;

            const inputUuid = generateId();
            const isMandatory = u['Mandatory?'] === true || u['Mandatory?'] === 'TRUE' || u.is_mandatory === true;

            await new sql.Request(transaction)
                .input('id', sql.NVarChar(50), inputUuid)
                .input('routine_id', sql.NVarChar(50), routineUuid)
                .input('user_input_name', sql.NVarChar(255), u['Input Name'] || u.user_input_name)
                .input('input_location', sql.NVarChar(100), u['Location'] || u.input_location || null)
                .input('textbox_type', sql.NVarChar(100), u['Type'] || u.textbox_type || null)
                .input('validations', sql.NVarChar(255), u['Validations'] || u.validations || null)
                .input('min_value', sql.NVarChar(50), u['Min'] || u.min_value || null)
                .input('max_value', sql.NVarChar(50), u['Max'] || u.max_value || null)
                .input('is_mandatory', sql.Bit, isMandatory ? 1 : 0)
                .query(`INSERT INTO UserInputs (id, routine_id, user_input_name, input_location, textbox_type, validations, min_value, max_value, is_mandatory) 
                       VALUES (@id, @routine_id, @user_input_name, @input_location, @textbox_type, @validations, @min_value, @max_value, @is_mandatory)`);
        }

        // 8. Insert Activity Log entry
        await new sql.Request(transaction)
            .input('routine_id', sql.NVarChar(50), null) // Bulk import touches multiple routines
            .input('routine_name', sql.NVarChar(255), `Bulk Import (${routines.length} routines)`)
            .input('changed_by', sql.NVarChar(255), auth.username)
            .input('change_type', sql.NVarChar(50), 'Bulk Import')
            .input('change_details', sql.NVarChar(sql.MAX), JSON.stringify({
                imported_count: routines.length,
                routine_names: importedRoutineNames
            }))
            .query(`INSERT INTO ActivityLog (routine_id, routine_name, changed_by, change_type, change_details)
                    VALUES (@routine_id, @routine_name, @changed_by, @change_type, @change_details)`);

        await transaction.commit();

        return {
            status: 200,
            jsonBody: {
                success: true,
                imported_count: routines.length,
                routine_names: importedRoutineNames
            }
        };

    } catch (err) {
        if (transaction) await transaction.rollback();
        context.error(err);
        return {
            status: 500,
            jsonBody: { error: 'Error importing routines.' }
        };
    }
}

app.http('importRoutines', {
    methods: ['POST'],
    route: 'routines/import',
    authLevel: 'anonymous',
    handler: importRoutines
});
