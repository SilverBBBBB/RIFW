import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { authenticate, isAuthResponse } from "../shared/auth";
import { getPool, sql } from "../shared/sql";

interface SheetOrderPayload {
  sheets?: Array<{
    id: string;
    global_order: number;
    row_version?: string;
  }>;
}

export async function updateSheetCatalogOrder(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const auth = await authenticate(request, ["Admin", "User"], context);
  if (isAuthResponse(auth)) return auth;

  let body: SheetOrderPayload;
  try {
    body = await request.json() as SheetOrderPayload;
  } catch {
    return { status: 400, body: "Invalid JSON payload." };
  }

  const sheets = body.sheets || [];
  if (!Array.isArray(sheets) || sheets.length === 0 || sheets.length > 5000) {
    return { status: 400, body: "At least one sheet order update is required." };
  }
  if (sheets.some(sheet => typeof sheet.id !== "string" || sheet.id.length === 0 || !Number.isInteger(sheet.global_order) || sheet.global_order < 1)) {
    return { status: 400, body: "Invalid sheet order payload." };
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    for (const sheet of sheets) {
      const existingResult = await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), sheet.id)
        .query("SELECT row_version FROM SheetCatalog WITH (UPDLOCK, HOLDLOCK) WHERE id=@id");
      const existing = existingResult.recordset[0];
      if (!existing) {
        await transaction.rollback();
        return { status: 404, body: "Sheet not found." };
      }
      if (sheet.row_version && !existing.row_version.equals(Buffer.from(sheet.row_version, "base64"))) {
        await transaction.rollback();
        return { status: 409, body: "A sheet was updated by another user. Reload and retry." };
      }

      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), sheet.id)
        .input("global_order", sql.Int, sheet.global_order)
        .query("UPDATE SheetCatalog SET global_order=@global_order WHERE id=@id");
    }

    const result = await new sql.Request(transaction)
      .query("SELECT id, row_version FROM SheetCatalog");

    await transaction.commit();

    return {
      status: 200,
      jsonBody: {
        success: true,
        sheetCatalog: result.recordset.map((sheet: any) => ({
          id: sheet.id,
          row_version: sheet.row_version.toString("base64")
        }))
      }
    };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* transaction was not active */ }
    context.error(error);
    return { status: 500, body: "Error updating sheet order." };
  }
}

app.http("updateSheetCatalogOrder", {
  methods: ["POST"],
  route: "sheets/catalog/order",
  authLevel: "anonymous",
  handler: updateSheetCatalogOrder
});
