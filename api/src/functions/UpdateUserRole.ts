
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as jwt from 'jsonwebtoken';
import { getPool, sql } from '../shared/sql';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ALLOWED_ROLES = ['Admin', 'User']; // Define roles that can be assigned

interface UserPayload {
    id: number;
    username: string;
    role: string;
}

export async function UpdateUserRole(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        // 1. Authenticate and authorize admin
        const authHeader = request.headers.get('X-Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { status: 401, body: 'Unauthorized: No token provided.' };
        }
        const token = authHeader.split(' ')[1];

        let decoded: UserPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        } catch (e) {
            return { status: 401, body: 'Unauthorized: Invalid token.' };
        }
        
        if (decoded.role?.trim().toLowerCase() !== 'admin') {
            return { status: 403, body: 'Forbidden: You do not have admin privileges.' };
        }

        // 2. Get and validate input from the request body
        const { userId, newRole } = await request.json() as { userId: number, newRole: string };

        if (!userId || !newRole) {
            return { status: 400, body: 'Bad Request: Please provide userId and newRole.' };
        }

        if (!ALLOWED_ROLES.includes(newRole)) {
            return { status: 400, body: `Bad Request: Invalid role. Allowed roles are: ${ALLOWED_ROLES.join(', ')}` };
        }
        
        // Admins cannot change their own role to prevent self-lockout
        if (decoded.id === userId && newRole !== 'Admin') {
            return { status: 400, body: 'Bad Request: Admins cannot demote themselves.' };
        }

        // 3. Update user role in the database
        const pool = await getPool();
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('newRole', sql.VarChar, newRole)
            .query('UPDATE [Users] SET [Role] = @newRole WHERE Id = @userId');

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
