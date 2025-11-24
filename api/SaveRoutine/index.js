
const { getPool, sql } = require('../shared/sql');

module.exports = async function (context, req) {
    const { routine, reports, mappings, attributes, outputSheets, sheetDetails, userInputs } = req.body;
    
    if (!routine || !routine.id) {
        context.res = { status: 400, body: "Invalid payload" };
        return;
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Delete existing hierarchy for this routine
        const request = new sql.Request(transaction);
        await request.input('id', sql.NVarChar, routine.id).query('DELETE FROM Routines WHERE id = @id');

        // 2. Insert Routine
        const rReq = new sql.Request(transaction);
        rReq.input('id', sql.NVarChar, routine.id)
            .input('routine_name', sql.NVarChar, routine.routine_name)
            .input('routine_display_name', sql.NVarChar, routine.routine_display_name || '')
            .input('version', sql.NVarChar, routine.version || '')
            .input('last_edited_date', sql.DateTime2, new Date(routine.last_edited_date))
            .input('routine_group', sql.NVarChar, routine.routine_group)
            .input('routine_type', sql.NVarChar, routine.routine_type)
            .input('fund_types', sql.NVarChar, JSON.stringify(routine.fund_types || []))
            .input('capital_structure', sql.NVarChar, routine.capital_structure)
            .input('region', sql.NVarChar, routine.region)
            .input('helper_routines', sql.NVarChar, JSON.stringify(routine.helper_routines || []))
            .input('to_show', sql.NVarChar, routine.to_show)
            .input('display_in_dropdown', sql.NVarChar, routine.display_in_dropdown)
            .input('is_active', sql.Bit, 1);
            
        await rReq.query(`INSERT INTO Routines 
            (id, routine_name, routine_display_name, version, last_edited_date, routine_group, routine_type, fund_types, capital_structure, region, helper_routines, to_show, display_in_dropdown, is_active)
            VALUES 
            (@id, @routine_name, @routine_display_name, @version, @last_edited_date, @routine_group, @routine_type, @fund_types, @capital_structure, @region, @helper_routines, @to_show, @display_in_dropdown, @is_active)`);

        // 3. Insert Children
        
        // Reports
        if (reports && reports.length > 0) {
            for (const r of reports) {
                const req = new sql.Request(transaction);
                req.input('id', sql.NVarChar, r.id)
                   .input('routine_id', sql.NVarChar, routine.id)
                   .input('report_name', sql.NVarChar, r.report_name)
                   .input('is_optional', sql.Bit, r.is_optional ? 1 : 0);
                await req.query('INSERT INTO Reports (id, routine_id, report_name, is_optional) VALUES (@id, @routine_id, @report_name, @is_optional)');
            }
        }

        // Mappings
        if (mappings && mappings.length > 0) {
            for (const m of mappings) {
                const req = new sql.Request(transaction);
                req.input('id', sql.NVarChar, m.id)
                   .input('report_id', sql.NVarChar, m.report_id)
                   .input('field_mapping_name', sql.NVarChar, m.field_mapping_name)
                   .input('data_type', sql.NVarChar, m.data_type)
                   .input('is_required', sql.Bit, m.is_required ? 1 : 0)
                   .input('blanks_allowed', sql.NVarChar, m.blanks_allowed);
                await req.query('INSERT INTO CDMMappings (id, report_id, field_mapping_name, data_type, is_required, blanks_allowed) VALUES (@id, @report_id, @field_mapping_name, @data_type, @is_required, @blanks_allowed)');
            }
        }

        // Attributes
        if (attributes && attributes.length > 0) {
            for (const a of attributes) {
                const req = new sql.Request(transaction);
                req.input('id', sql.NVarChar, a.id)
                   .input('cdm_mapping_id', sql.NVarChar, a.cdm_mapping_id)
                   .input('attribute_name', sql.NVarChar, a.attribute_name);
                await req.query('INSERT INTO Attributes (id, cdm_mapping_id, attribute_name) VALUES (@id, @cdm_mapping_id, @attribute_name)');
            }
        }

        // OutputSheets
        if (outputSheets && outputSheets.length > 0) {
            for (const s of outputSheets) {
                const req = new sql.Request(transaction);
                req.input('id', sql.NVarChar, s.id)
                   .input('routine_id', sql.NVarChar, routine.id)
                   .input('sheet_name', sql.NVarChar, s.sheet_name)
                   .input('order_index', sql.Int, s.order_index || 0);
                await req.query('INSERT INTO OutputSheets (id, routine_id, sheet_name, order_index) VALUES (@id, @routine_id, @sheet_name, @order_index)');
            }
        }

        // SheetDetails
        if (sheetDetails && sheetDetails.length > 0) {
            for (const d of sheetDetails) {
                const req = new sql.Request(transaction);
                req.input('id', sql.NVarChar, d.id)
                   .input('output_sheet_id', sql.NVarChar, d.output_sheet_id)
                   .input('field_name', sql.NVarChar, d.field_name)
                   .input('fill_color_format', sql.NVarChar, d.fill_color_format)
                   .input('data_format', sql.NVarChar, d.data_format)
                   .input('column_order', sql.Int, d.column_order)
                   .input('document_type', sql.NVarChar, d.document_type || null)
                   .input('verification_rde_name', sql.NVarChar, d.verification_rde_name || null)
                   .input('verification_required_status', sql.NVarChar, d.verification_required_status || null)
                   .input('field_description', sql.NVarChar, d.field_description || null)
                   .input('verification_data_type', sql.NVarChar, d.verification_data_type || null)
                   .input('old_model_name', sql.NVarChar, d.old_model_name || null)
                   .input('old_model_mapping', sql.NVarChar, d.old_model_mapping || null)
                   .input('new_model_name', sql.NVarChar, d.new_model_name || null)
                   .input('table_name', sql.NVarChar, d.table_name || null)
                   .input('new_model_mapping', sql.NVarChar, d.new_model_mapping || null);

                await req.query(`INSERT INTO SheetDetails 
                    (id, output_sheet_id, field_name, fill_color_format, data_format, column_order, document_type, verification_rde_name, verification_required_status, field_description, verification_data_type, old_model_name, old_model_mapping, new_model_name, table_name, new_model_mapping)
                    VALUES 
                    (@id, @output_sheet_id, @field_name, @fill_color_format, @data_format, @column_order, @document_type, @verification_rde_name, @verification_required_status, @field_description, @verification_data_type, @old_model_name, @old_model_mapping, @new_model_name, @table_name, @new_model_mapping)`);
            }
        }
        
        // User Inputs
        if (userInputs && userInputs.length > 0) {
            for (const u of userInputs) {
                const req = new sql.Request(transaction);
                req.input('id', sql.NVarChar, u.id)
                   .input('routine_id', sql.NVarChar, routine.id)
                   .input('user_input_name', sql.NVarChar, u.user_input_name)
                   .input('input_location', sql.NVarChar, u.input_location)
                   .input('textbox_type', sql.NVarChar, u.textbox_type)
                   .input('validations', sql.NVarChar, u.validations)
                   .input('min_value', sql.NVarChar, u.min_value)
                   .input('max_value', sql.NVarChar, u.max_value)
                   .input('is_mandatory', sql.Bit, u.is_mandatory ? 1 : 0);
                   
                await req.query(`INSERT INTO UserInputs (id, routine_id, user_input_name, input_location, textbox_type, validations, min_value, max_value, is_mandatory) 
                                 VALUES (@id, @routine_id, @user_input_name, @input_location, @textbox_type, @validations, @min_value, @max_value, @is_mandatory)`);
            }
        }

        await transaction.commit();
        context.res = { body: { success: true } };

    } catch (err) {
        if (transaction) await transaction.rollback();
        context.log.error(err);
        context.res = { status: 500, body: "Error saving routine: " + err.message };
    }
};
