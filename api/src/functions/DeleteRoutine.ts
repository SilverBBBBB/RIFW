import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, sql } from '../shared/sql';

export async function deleteRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const id = request.query.get('id');
    
    if (!id) {
        return { status: 400, body: "Missing ID" };
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Get routine details before deleting
        const result = await new sql.Request(transaction)
            .input('id', sql.NVarChar(50), id)
            .query('SELECT routine_name FROM Routines WHERE id = @id');
        
        const routineName = result.recordset.length > 0 ? result.recordset[0].routine_name : 'Unknown';

        // Delete the routine
        await new sql.Request(transaction)
            .input('id', sql.NVarChar(50), id)
            .query('DELETE FROM Routines WHERE id = @id');

        // Log the deletion
        await new sql.Request(transaction)
            .input('routine_id', sql.NVarChar(50), id)
            .input('routine_name', sql.NVarChar(255), routineName)
            .input('changed_by', sql.NVarChar(255), 'Admin') // TODO: Replace with actual user
            .input('change_type', sql.NVarChar(50), 'Deleted')
            .input('change_details', sql.NVarChar(sql.MAX), `Routine with ID ${id} and name "${routineName}" was deleted.`)
            .query(`INSERT INTO ActivityLog (routine_id, routine_name, changed_by, change_type, change_details)
                    VALUES (@routine_id, @routine_name, @changed_by, @change_type, @change_details)`);
            
        await transaction.commit();
        return { status: 200, jsonBody: { success: true } };
    } catch (err: any) {
        if (transaction) await transaction.rollback();
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