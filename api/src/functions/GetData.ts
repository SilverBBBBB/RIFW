
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../shared/sql';
import { authenticate, isAuthResponse } from '../shared/auth';

export async function getData(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Fetching all data...');
    const auth = await authenticate(request, ['Admin', 'User'], context);
    if (isAuthResponse(auth)) return auth;

    try {
        const pool = await getPool();

        // Fetch all data in parallel for performance
        const [
            rRoutines,
            rReports,
            rMappings,
            rAttributes,
            rSheetCatalog,
            rSheets,
            rDetails,
            rUserInputs,
            rConfig,
            rActivityLogs,
            rDefaultMappings
        ] = await Promise.all([
            pool.request().query(`SELECT r.*,
                                         editor.Username AS last_changed_by_username,
                                         reviewer.Username AS reviewed_by_username
                                  FROM Routines r
                                  LEFT JOIN Users editor ON editor.Id=r.last_changed_by_user_id
                                  LEFT JOIN Users reviewer ON reviewer.Id=r.reviewed_by_user_id`),
            pool.request().query('SELECT * FROM Reports'),
            pool.request().query('SELECT * FROM CDMMappings'),
            pool.request().query('SELECT * FROM Attributes'),
            pool.request().query('SELECT * FROM SheetCatalog'),
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
        const safeParseArray = (val: any) => {
            if (!val) return [];
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [val];
            } catch (e) {
                return [val];
            }
        };

        const routines = rRoutines.recordset.map((r: any) => ({
            ...r,
            row_version: Buffer.isBuffer(r.row_version) ? r.row_version.toString('base64') : undefined,
            fund_types: safeParseArray(r.fund_types),
            region: safeParseArray(r.region),
            helper_routines: safeParseArray(r.helper_routines),
            is_active: !!r.is_active
        }));

        return {
            status: 200,
            jsonBody: {
                routines,
                reports: rReports.recordset.map((r: any) => ({ ...r, is_optional: !!r.is_optional })),
                cdmMappings: rMappings.recordset.map((m: any) => ({ ...m, is_required: !!m.is_required })),
                attributes: rAttributes.recordset,
                sheetCatalog: rSheetCatalog.recordset.map((s: any) => ({
                    ...s,
                    row_version: Buffer.isBuffer(s.row_version) ? s.row_version.toString('base64') : undefined
                })),
                outputSheets: rSheets.recordset,
                sheetDetails: rDetails.recordset,
                userInputs: rUserInputs.recordset.map((u: any) => ({ ...u, is_mandatory: !!u.is_mandatory })),
                config: configObj,
                activityLogs: rActivityLogs.recordset,
                defaultMappings: rDefaultMappings.recordset.map((m: any) => ({ ...m, is_required: !!m.is_required }))
            }
        };
    } catch (err) {
        context.error(err);
        return { status: 500, jsonBody: { error: 'Error fetching data.' } };
    }
}

app.http('data', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: getData
});
