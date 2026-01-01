
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../shared/sql';

export async function getData(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Fetching all data...');

    try {
        const pool = await getPool();

        // Fetch all data in parallel for performance
        const [
            rRoutines,
            rReports,
            rMappings,
            rAttributes,
            rSheets,
            rDetails,
            rUserInputs,
            rConfig,
            rActivityLogs,
            rDefaultMappings
        ] = await Promise.all([
            pool.request().query('SELECT * FROM Routines'),
            pool.request().query('SELECT * FROM Reports'),
            pool.request().query('SELECT * FROM CDMMappings'),
            pool.request().query('SELECT * FROM Attributes'),
            pool.request().query('SELECT * FROM OutputSheets'),
            pool.request().query('SELECT * FROM SheetDetails'),
            pool.request().query('SELECT * FROM UserInputs'),
            pool.request().query('SELECT * FROM AppConfig'),
            pool.request().query('SELECT * FROM ActivityLog'),
            pool.request().query('SELECT * FROM DefaultReportMappings')
        ]);

        // Process Config into object
        const configObj: Record<string, string[]> = {
            versions: [], routineTypes: [], fundTypes: [], regions: [],
            capitalStructures: [], dataTypes: [], reportNames: [], helperRoutines: []
        };

        rConfig.recordset.forEach((row: any) => {
            if (configObj[row.category]) {
                configObj[row.category].push(row.value);
            }
        });

        // Parse JSON fields in Routines
        const routines = rRoutines.recordset.map((r: any) => ({
            ...r,
            fund_types: r.fund_types ? JSON.parse(r.fund_types) : [],
            helper_routines: r.helper_routines ? JSON.parse(r.helper_routines) : [],
            is_active: !!r.is_active
        }));

        return {
            status: 200,
            jsonBody: {
                routines,
                reports: rReports.recordset.map((r: any) => ({ ...r, is_optional: !!r.is_optional })),
                cdmMappings: rMappings.recordset.map((m: any) => ({ ...m, is_required: !!m.is_required })),
                attributes: rAttributes.recordset,
                outputSheets: rSheets.recordset,
                sheetDetails: rDetails.recordset,
                userInputs: rUserInputs.recordset.map((u: any) => ({ ...u, is_mandatory: !!u.is_mandatory })),
                config: configObj,
                activityLogs: rActivityLogs.recordset,
                defaultMappings: rDefaultMappings.recordset.map((m: any) => ({ ...m, is_required: !!m.is_required }))
            }
        };
    } catch (err: any) {
        context.error(err);
        return { status: 500, body: "Error fetching data: " + err.message };
    }
}

app.http('data', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getData
});