
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool, sql } from '../shared/sql';
import { authenticate, isAuthResponse } from '../shared/auth';
const ALLOWED_ROLES = ['Admin', 'User']; // Define roles that can be assigned

export async function UpdateUserRole(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const auth = await authenticate(request, ['Admin'], context);
        if (isAuthResponse(auth)) return auth;

        // 2. Get and validate input from the request body
        const { userId, newRole } = await request.json() as { userId: number, newRole: string };

        if (!userId || !newRole) {
            return { status: 400, body: 'Bad Request: Please provide userId and newRole.' };
        }

        if (!ALLOWED_ROLES.includes(newRole)) {
            return { status: 400, body: `Bad Request: Invalid role. Allowed roles are: ${ALLOWED_ROLES.join(', ')}` };
        }
        
        // Admins cannot change their own role to prevent self-lockout
        if (auth.id === userId && newRole !== 'Admin') {
            return { status: 400, body: 'Bad Request: Admins cannot demote themselves.' };
        }

        // 3. Update user role in the database
        const pool = await getPool();
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('newRole', sql.VarChar, newRole)
            .query('UPDATE [Users] SET [Role] = @newRole, TokenVersion = TokenVersion + 1 WHERE Id = @userId AND IsActive = 1');

        return {
            status: 200,
            body: `User role updated successfully for user ID: ${userId}`
        };

    } catch (error) {
        context.log(error);
        return {
            status: 500,
            body: "An error occurred while updating the user role."
        };
    }
}

app.http('UpdateUserRole', {
    methods: ['PUT', 'POST'], // Allow both PUT and POST
    authLevel: 'anonymous', // We handle auth manually
    handler: UpdateUserRole
});
