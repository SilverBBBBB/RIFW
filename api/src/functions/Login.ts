import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as bcrypt from 'bcryptjs';
import { getPool, sql } from '../shared/sql';
import { normalizeRole, signToken } from '../shared/auth';

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function Login(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    let body: { username?: string; password?: string };
    try {
        body = await request.json() as { username?: string; password?: string };
    } catch {
        return { status: 400, body: "Invalid JSON payload." };
    }
    const username = body.username?.trim();
    const password = body.password;

    if (!username || !password) {
        return {
            status: 400,
            body: "Please provide a username and password."
        };
    }

    try {
        const clientKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const now = Date.now();
        const current = attempts.get(clientKey);
        if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
            return { status: 429, body: "Too many login attempts. Try again later." };
        }
        if (!current || current.resetAt <= now) {
            attempts.set(clientKey, { count: 0, resetAt: now + WINDOW_MS });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT Id, Username, Password, Role, TokenVersion, IsActive FROM Users WHERE Username = @username');

        const user = result.recordset[0];
        const passwordMatch = user?.IsActive === true && await bcrypt.compare(password, user.Password);

        if (!passwordMatch) {
            attempts.get(clientKey)!.count += 1;
            return { status: 401, body: "Invalid username or password." };
        }

        const role = normalizeRole(user.Role);
        if (!role) {
            context.error("Login lookup returned an unsupported role.");
            return { status: 403, body: "Account role is invalid." };
        }

        attempts.delete(clientKey);
        const token = signToken({
            id: user.Id,
            username: user.Username,
            role,
            tokenVersion: user.TokenVersion
        });

        return {
            status: 200,
            jsonBody: {
                token,
                user: {
                    id: user.Id,
                    username: user.Username,
                    role: role.toLowerCase()
                }
            }
        };
    } catch (error) {
        context.error(error);
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
