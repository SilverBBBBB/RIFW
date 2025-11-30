
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as jwt from 'jsonwebtoken';
import { getPool, sql } from '../shared/sql';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface UserPayload {
    id: number;
    username: string;
    role: string;
}

export async function GetUsers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        // 1. Authenticate the user
        const authHeader = request.headers.get('X-Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { status: 401, body: 'Unauthorized: No token provided.' };
        }
        const token = authHeader.split(' ')[1];

        // 2. Verify the token and check for admin role
        let decoded: UserPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        } catch (e) {
            return { status: 401, body: 'Unauthorized: Invalid token.' };
        }
        
        if (decoded.role?.trim().toLowerCase() !== 'admin') {
            return { status: 403, body: 'Forbidden: You do not have admin privileges.' };
        }

        // 3. Fetch users from the database
        const pool = await getPool();
        const result = await pool.request().query('SELECT Id, Username, Role FROM [Users]');

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
