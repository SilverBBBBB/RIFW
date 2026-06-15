import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, sql } from '../shared/sql';
import { authenticate, isAuthResponse } from '../shared/auth';

export async function saveConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const auth = await authenticate(request, ['Admin'], context);
    if (isAuthResponse(auth)) return auth;
    let body: any;
    try {
        body = await request.json();
    } catch (error) {
         return { status: 400, body: "Invalid JSON payload" };
    }

    const { category, values } = body;
    
    const allowedCategories = ['versions', 'routineTypes', 'fundTypes', 'regions', 'capitalStructures', 'dataTypes', 'reportNames', 'helperRoutines'];
    if (!allowedCategories.includes(category) || !Array.isArray(values) || values.length > 500) {
        return { status: 400, body: "Invalid payload: Missing category or values array" };
    }
    if (values.some(value => typeof value !== 'string' || !value.trim() || value.length > 255)) {
        return { status: 400, body: "Configuration values must be non-empty strings up to 255 characters." };
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // 1. Delete all for category
        await new sql.Request(transaction)
            .input('cat', sql.NVarChar(50), category)
            .query('DELETE FROM AppConfig WHERE category = @cat');

        // 2. Insert new values
        for (const val of values) {
            await new sql.Request(transaction)
                .input('cat', sql.NVarChar(50), category)
                .input('val', sql.NVarChar(255), val)
                .query('INSERT INTO AppConfig (category, value) VALUES (@cat, @val)');
        }

        await transaction.commit();
        return { status: 200, jsonBody: { success: true } };
    } catch (err: any) {
        if (transaction) await transaction.rollback();
        context.error(err);
        return { status: 500, body: "Error saving config" };
    }
}

app.http('config', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: saveConfig
});
