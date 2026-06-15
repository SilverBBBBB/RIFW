
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from '../shared/sql';
import { authenticate, isAuthResponse } from '../shared/auth';

export async function GetUsers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const auth = await authenticate(request, ['Admin'], context);
        if (isAuthResponse(auth)) return auth;

        // 3. Fetch users from the database
        const pool = await getPool();
        const result = await pool.request().query('SELECT Id, Username, Role, IsActive FROM [Users] ORDER BY Username');

        return {
            status: 200,
            jsonBody: result.recordset
        };

    } catch (error) {
        context.log(error);
        return {
            status: 500,
            body: "An error occurred while fetching users."
        };
    }
}

app.http('GetUsers', {
    methods: ['GET'],
    authLevel: 'anonymous', // We handle auth manually inside the function
    handler: GetUsers
});
