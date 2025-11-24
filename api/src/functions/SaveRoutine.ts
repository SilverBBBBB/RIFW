import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, sql } from '../shared/sql';

export async function saveRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    let body: any;
    try {
        body = await request.json();
    } catch (error) {
        return { status: 400, body: "Invalid JSON payload" };
    }

    const { routine, reports, mappings, attributes, outputSheets, sheetDetails, userInputs } = body;
    
    if (!routine || !routine.id) {
        return { status: 400, body: "Invalid payload: Missing routine ID" };
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Delete existing hierarchy (Cascade delete handles children)
        await new sql.Request(transaction)
            .input('id', sql.NVarChar(50), routine.id)
            .query('DELETE FROM Routines WHERE id = @id');

        // 2. Insert Routine
        await new sql.Request(transaction)
            .input('id', sql.NVarChar(50), routine.id)
            .input('routine_name', sql.NVarChar(255), routine.routine_name)
            .input('routine_display_name', sql.NVarChar(255), routine.routine_display_name || '')
            .input('version', sql.NVarChar(50), routine.version || '')
            .input('last_edited_date', sql.DateTime2, new Date(routine.last_edited_date))
            .input('routine_group', sql.NVarChar(100), routine.routine_group)
            .input('routine_type', sql.NVarChar(100), routine.routine_type)
            .input('fund_types', sql.NVarChar(sql.MAX), JSON.stringify(routine.fund_types || []))
            .input('capital_structure', sql.NVarChar(100), routine.capital_structure)
            .input('region', sql.NVarChar(100), routine.region)
            .input('helper_routines', sql.NVarChar(sql.MAX), JSON.stringify(routine.helper_routines || []))
            .input('to_show', sql.NVarChar(10), routine.to_show)
            .input('display_in_dropdown', sql.NVarChar(10), routine.display_in_dropdown)
            .input('is_active', sql.Bit, 1)
            .query(`INSERT INTO Routines 
            (id, routine_name, routine_display_name, version, last_edited_date, routine_group, routine_type, fund_types, capital_structure, region, helper_routines, to_show, display_in_dropdown, is_active)
            VALUES 
            (@id, @routine_name, @routine_display_name, @version, @last_edited_date, @routine_group, @routine_type, @fund_types, @capital_structure, @region, @helper_routines, @to_show, @display_in_dropdown, @is_active)`);

        // 3. Insert Children
        
        if (reports && reports.length > 0) {
            for (const r of reports) {
                await new sql.Request(transaction)
                   .input('id', sql.NVarChar(50), r.id)
                   .input('routine_id', sql.NVarChar(50), routine.id)
                   .input('report_name', sql.NVarChar(255), r.report_name)
                   .input('is_optional', sql.Bit, r.is_optional ? 1 : 0)
                   .query('INSERT INTO Reports (id, routine_id, report_name, is_optional) VALUES (@id, @routine_id, @report_name, @is_optional)');
            }
        }

        if (mappings && mappings.length > 0) {
            for (const m of mappings) {
                await new sql.Request(transaction)
                   .input('id', sql.NVarChar(50), m.id)
                   .input('report_id', sql.NVarChar(50), m.report_id)
                   .input('field_mapping_name', sql.NVarChar(255), m.field_mapping_name)
                   .input('data_type', sql.NVarChar(50), m.data_type)
                   .input('is_required', sql.Bit, m.is_required ? 1 : 0)
                   .input('blanks_allowed', sql.NVarChar(20), m.blanks_allowed)
                   .query('INSERT INTO CDMMappings (id, report_id, field_mapping_name, data_type, is_required, blanks_allowed) VALUES (@id, @report_id, @field_mapping_name, @data_type, @is_required, @blanks_allowed)');
            }
        }

        if (attributes && attributes.length > 0) {
            for (const a of attributes) {
                await new sql.Request(transaction)
                   .input('id', sql.NVarChar(50), a.id)
                   .input('cdm_mapping_id', sql.NVarChar(50), a.cdm_mapping_id)
                   .input('attribute_name', sql.NVarChar(255), a.attribute_name)
                   .query('INSERT INTO Attributes (id, cdm_mapping_id, attribute_name) VALUES (@id, @cdm_mapping_id, @attribute_name)');
            }
        }

        if (outputSheets && outputSheets.length > 0) {
            for (const s of outputSheets) {
                await new sql.Request(transaction)
                   .input('id', sql.NVarChar(50), s.id)
                   .input('routine_id', sql.NVarChar(50), routine.id)
                   .input('sheet_name', sql.NVarChar(255), s.sheet_name)
                   .input('order_index', sql.Int, s.order_index || 0)
                   .query('INSERT INTO OutputSheets (id, routine_id, sheet_name, order_index) VALUES (@id, @routine_id, @sheet_name, @order_index)');
            }
        }

        if (sheetDetails && sheetDetails.length > 0) {
            for (const d of sheetDetails) {
                await new sql.Request(transaction)
                   .input('id', sql.NVarChar(50), d.id)
                   .input('output_sheet_id', sql.NVarChar(50), d.output_sheet_id)
                   .input('field_name', sql.NVarChar(255), d.field_name)
                   .input('fill_color_format', sql.NVarChar(20), d.fill_color_format)
                   .input('data_format', sql.NVarChar(50), d.data_format)
                   .input('column_order', sql.Int, d.column_order)
                   .input('document_type', sql.NVarChar(100), d.document_type || null)
                   .input('verification_rde_name', sql.NVarChar(255), d.verification_rde_name || null)
                   .input('verification_required_status', sql.NVarChar(50), d.verification_required_status || null)
                   .input('field_description', sql.NVarChar(sql.MAX), d.field_description || null)
                   .input('verification_data_type', sql.NVarChar(50), d.verification_data_type || null)
                   .input('old_model_name', sql.NVarChar(100), d.old_model_name || null)
                   .input('old_model_mapping', sql.NVarChar(255), d.old_model_mapping || null)
                   .input('new_model_name', sql.NVarChar(100), d.new_model_name || null)
                   .input('table_name', sql.NVarChar(100), d.table_name || null)
                   .input('new_model_mapping', sql.NVarChar(255), d.new_model_mapping || null)
                   .query(`INSERT INTO SheetDetails 
                    (id, output_sheet_id, field_name, fill_color_format, data_format, column_order, document_type, verification_rde_name, verification_required_status, field_description, verification_data_type, old_model_name, old_model_mapping, new_model_name, table_name, new_model_mapping)
                    VALUES 
                    (@id, @output_sheet_id, @field_name, @fill_color_format, @data_format, @column_order, @document_type, @verification_rde_name, @verification_required_status, @field_description, @verification_data_type, @old_model_name, @old_model_mapping, @new_model_name, @table_name, @new_model_mapping)`);
            }
        }
        
        if (userInputs && userInputs.length > 0) {
            for (const u of userInputs) {
                await new sql.Request(transaction)
                   .input('id', sql.NVarChar(50), u.id)
                   .input('routine_id', sql.NVarChar(50), routine.id)
                   .input('user_input_name', sql.NVarChar(255), u.user_input_name)
                   .input('input_location', sql.NVarChar(100), u.input_location)
                   .input('textbox_type', sql.NVarChar(100), u.textbox_type)
                   .input('validations', sql.NVarChar(255), u.validations)
                   .input('min_value', sql.NVarChar(50), u.min_value)
                   .input('max_value', sql.NVarChar(50), u.max_value)
                   .input('is_mandatory', sql.Bit, u.is_mandatory ? 1 : 0)
                   .query(`INSERT INTO UserInputs (id, routine_id, user_input_name, input_location, textbox_type, validations, min_value, max_value, is_mandatory) 
                           VALUES (@id, @routine_id, @user_input_name, @input_location, @textbox_type, @validations, @min_value, @max_value, @is_mandatory)`);
            }
        }

        await transaction.commit();
        return { status: 200, jsonBody: { success: true } };

    } catch (err: any) {
        if (transaction) await transaction.rollback();
        context.error(err);
        return { status: 500, body: "Error saving routine: " + err.message };
    }
}

app.http('routine', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: saveRoutine
});