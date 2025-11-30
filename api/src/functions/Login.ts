import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { getPool, sql } from '../shared/sql';

const JWT_SECRET = 'a-very-secret-key';

export async function Login(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const { username, password } = await request.json() as any;

    if (!username || !password) {
        return {
            status: 400,
            body: "Please provide a username and password."
        };
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT * FROM Users WHERE Username = @username');

        if (result.recordset.length === 0) {
            return {
                status: 404,
                body: "User not found"
            };
        }

        const user = result.recordset[0];
        const passwordMatch = await bcrypt.compare(password, user.Password);

        if (!passwordMatch) {
            return {
                status: 401,
                body: "Incorrect password."
            };
        }

        const token = jwt.sign({ id: user.Id, username: user.Username, role: user.Role.trim() }, JWT_SECRET, { expiresIn: '1h' });

        return {
            status: 200,
            jsonBody: {
                token,
                user: {
                    id: user.Id,
                    username: user.Username,
                    role: user.Role
                }
            }
        };
    } catch (error) {
        context.log(error);
        return {
            status: 500,
            body: "An error occurred while logging in."
        };
    }
}

app.http('Login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: Login
});