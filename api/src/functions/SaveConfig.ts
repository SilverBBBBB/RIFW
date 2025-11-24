import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, sql } from '../shared/sql';

export async function saveConfig(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    let body: any;
    try {
        body = await request.json();
    } catch (error) {
         return { status: 400, body: "Invalid JSON payload" };
    }

    const { category, values } = body;
    
    if (!category || !Array.isArray(values)) {
        return { status: 400, body: "Invalid payload: Missing category or values array" };
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