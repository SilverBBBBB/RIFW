import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as bcrypt from 'bcryptjs';
import { getPool, sql } from '../shared/sql';
import { authenticate, isAuthResponse, passwordValidationError } from '../shared/auth';

export async function Register(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const auth = await authenticate(request, ['Admin'], context);
    if (isAuthResponse(auth)) return auth;

    let body: { username?: string; password?: string; role?: string };
    try {
        body = await request.json() as { username?: string; password?: string; role?: string };
    } catch {
        return { status: 400, body: "Invalid JSON payload." };
    }
    const username = body.username?.trim();
    const password = body.password;
    const role = body.role === 'Admin' ? 'Admin' : 'User';

    if (!username || !password) {
        return {
            status: 400,
            body: "Please provide a username and password."
        };
    }
    if (!/^[A-Za-z0-9._-]{3,100}$/.test(username)) {
        return { status: 400, body: "Username must be 3-100 characters and contain only letters, numbers, dots, underscores, or hyphens." };
    }
    const passwordError = passwordValidationError(password);
    if (passwordError) return { status: 400, body: passwordError };

    try {
        const pool = await getPool();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, hashedPassword)
            .input('role', sql.VarChar, role)
            .query('INSERT INTO Users (Username, Password, Role) VALUES (@username, @password, @role)');

        return {
            status: 201,
            body: "User registered successfully."
        };
    } catch (error) {
        context.log(error);
        if (error instanceof Error && (error.message.includes('UNIQUE KEY') || error.message.includes('duplicate'))) {
            return {
                status: 409,
                body: "Username already exists."
            };
        }
        return {
            status: 500,
            body: "An error occurred while registering the user."
        };
    }
}

app.http('Register', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: Register
});
