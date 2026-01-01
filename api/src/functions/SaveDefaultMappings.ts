import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../shared/sql';

export async function saveDefaultMappings(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Saving DefaultReportMappings...');

    try {
        const body: any = await request.json();
        const { report_name, mappings, username } = body;

        if (!report_name) {
            return { status: 400, body: "Missing report_name" };
        }

        const pool = await getPool();
        const transaction = pool.transaction();

        await transaction.begin();

        try {
            const request = transaction.request();

            // 1. Delete existing defaults for this report
            await request
                .input('report_name', report_name)
                .query('DELETE FROM DefaultReportMappings WHERE report_name = @report_name');

            // 2. Insert new defaults
            if (mappings && mappings.length > 0) {
                for (const map of mappings) {
                    const insertReq = transaction.request();
                    await insertReq
                        .input('id', map.id)
                        .input('report_name', report_name)
                        .input('field_mapping_name', map.field_mapping_name)
                        .input('data_type', map.data_type)
                        .input('is_required', map.is_required ? 1 : 0)
                        .input('blanks_allowed', map.blanks_allowed)
                        .query(`
                            INSERT INTO DefaultReportMappings 
                            (id, report_name, field_mapping_name, data_type, is_required, blanks_allowed)
                            VALUES 
                            (@id, @report_name, @field_mapping_name, @data_type, @is_required, @blanks_allowed)
                        `);
                }
            }

            // 3. Optional: Log activity (if desired, though usually for Routines)
            // But usually we log config changes.

            await transaction.commit();

            return { status: 200, body: "Saved successfully" };
        } catch (err: any) {
            await transaction.rollback();
            throw err;
        }

    } catch (err: any) {
        context.error(err);
        return { status: 500, body: "Error saving default mappings: " + err.message };
    }
}

app.http('saveDefaultMappings', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: saveDefaultMappings
});
