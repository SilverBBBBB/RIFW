import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as jwt from "jsonwebtoken";
import { getPool, sql } from "./sql";

export type AppRole = "Admin" | "User";

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: AppRole;
  tokenVersion: number;
}

interface TokenPayload {
  id: number;
  username: string;
  tokenVersion: number;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
};

export const signToken = (user: AuthenticatedUser): string =>
  jwt.sign(
    {
      id: user.id,
      username: user.username,
      tokenVersion: user.tokenVersion
    },
    getJwtSecret(),
    {
      expiresIn: "1h",
      issuer: "routine-info-workflow",
      audience: "routine-info-workflow"
    }
  );

export async function authenticate(
  request: HttpRequest,
  allowedRoles: AppRole[],
  context: InvocationContext
): Promise<AuthenticatedUser | HttpResponseInit> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { status: 401, body: "Authentication required." };
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(authHeader.slice(7), getJwtSecret(), {
      issuer: "routine-info-workflow",
      audience: "routine-info-workflow"
    }) as TokenPayload;
  } catch {
    return { status: 401, body: "Invalid or expired session." };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, payload.id)
      .query("SELECT Id, Username, Role, TokenVersion FROM Users WHERE Id = @id AND IsActive = 1");

    if (result.recordset.length !== 1) {
      return { status: 401, body: "Invalid or expired session." };
    }

    const record = result.recordset[0];
    const user: AuthenticatedUser = {
      id: record.Id,
      username: record.Username,
      role: record.Role?.trim() as AppRole,
      tokenVersion: record.TokenVersion
    };

    if (payload.tokenVersion !== user.tokenVersion) {
      return { status: 401, body: "Session has been revoked." };
    }
    if (!allowedRoles.includes(user.role)) {
      return { status: 403, body: "Insufficient permissions." };
    }
    return user;
  } catch (error) {
    context.error("Authentication lookup failed.", error);
    return { status: 500, body: "Authentication service unavailable." };
  }
}

export const isAuthResponse = (
  value: AuthenticatedUser | HttpResponseInit
): value is HttpResponseInit => "status" in value;

export const passwordValidationError = (password: unknown): string | null => {
  if (typeof password !== "string" || password.length < 12) {
    return "Password must contain at least 12 characters.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Password must include uppercase, lowercase, number, and special characters.";
  }
  return null;
};
