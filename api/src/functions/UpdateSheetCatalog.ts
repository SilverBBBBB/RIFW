import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { authenticate, isAuthResponse } from "../shared/auth";
import { getPool, sql } from "../shared/sql";

const validClassification = (value: unknown): value is "Main" | "Helper" | "Unclassified" =>
  value === "Main" || value === "Helper" || value === "Unclassified";

export async function updateSheetCatalog(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const auth = await authenticate(request, ["Admin", "User"], context);
  if (isAuthResponse(auth)) return auth;

  let body: Record<string, any>;
  try {
    body = await request.json() as Record<string, any>;
  } catch {
    return { status: 400, body: "Invalid JSON payload." };
  }

  if (typeof body.id !== "string" || !validClassification(body.classification)) {
    return { status: 400, body: "Sheet ID and valid classification are required." };
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const existingResult = await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), body.id)
      .query("SELECT row_version FROM SheetCatalog WITH (UPDLOCK, HOLDLOCK) WHERE id=@id");
    const existing = existingResult.recordset[0];
    if (!existing) {
      await transaction.rollback();
      return { status: 404, body: "Sheet not found." };
    }
    if (body.row_version && !existing.row_version.equals(Buffer.from(body.row_version, "base64"))) {
      await transaction.rollback();
      return { status: 409, body: "This sheet was updated by another user. Reload and retry." };
    }

    const result = await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), body.id)
      .input("classification", sql.NVarChar(20), body.classification)
      .query("UPDATE SheetCatalog SET classification=@classification WHERE id=@id; SELECT row_version FROM SheetCatalog WHERE id=@id");

    await transaction.commit();
    return {
      status: 200,
      jsonBody: {
        success: true,
        row_version: result.recordset[0].row_version.toString("base64")
      }
    };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* transaction was not active */ }
    context.error(error);
    return { status: 500, body: "Error updating sheet." };
  }
}

app.http("updateSheetCatalog", {
  methods: ["POST"],
  route: "sheets/catalog",
  authLevel: "anonymous",
  handler: updateSheetCatalog
});
