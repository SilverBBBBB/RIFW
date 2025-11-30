import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as bcrypt from 'bcryptjs';
import { getPool, sql } from '../shared/sql';

export async function Register(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, hashedPassword)
            .query('INSERT INTO Users (Username, Password) VALUES (@username, @password)');

        return {
            status: 201,
            body: "User registered successfully."
        };
    } catch (error) {
        context.log(error);
        if (error.message.includes('UNIQUE KEY')) {
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