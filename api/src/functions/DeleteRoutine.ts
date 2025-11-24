import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, sql } from '../shared/sql';

export async function deleteRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const id = request.query.get('id');
    
    if (!id) {
        return { status: 400, body: "Missing ID" };
    }

    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar(50), id)
            .query('DELETE FROM Routines WHERE id = @id');
            
        return { status: 200, jsonBody: { success: true } };
    } catch (err: any) {
        context.error(err);
        return { status: 500, body: "Error deleting routine" };
    }
}

app.http('deleteRoutine', {
    methods: ['DELETE', 'POST'],
    authLevel: 'anonymous',
    route: 'routine/delete',
    handler: deleteRoutine
});