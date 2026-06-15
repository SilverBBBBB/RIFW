import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { authenticate, isAuthResponse } from "../shared/auth";
import { getPool, sql } from "../shared/sql";

export async function deleteRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const auth = await authenticate(request, ["Admin", "User"], context);
  if (isAuthResponse(auth)) return auth;

  const id = request.query.get("id");
  const rowVersion = request.query.get("rowVersion");
  if (!id || !rowVersion) return { status: 400, body: "Routine ID and row version are required." };

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const result = await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), id)
      .query("SELECT routine_name, row_version FROM Routines WITH (UPDLOCK, HOLDLOCK) WHERE id=@id");
    if (result.recordset.length === 0) {
      await transaction.rollback();
      return { status: 404, body: "Routine not found." };
    }
    const record = result.recordset[0];
    if (!record.row_version.equals(Buffer.from(rowVersion, "base64"))) {
      await transaction.rollback();
      return { status: 409, body: "This routine was updated by another user. Reload and retry." };
    }

    await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), id)
      .query("DELETE FROM Routines WHERE id=@id");
    await new sql.Request(transaction)
      .input("routine_name", sql.NVarChar(255), record.routine_name)
      .input("changed_by", sql.NVarChar(255), auth.username)
      .input("change_type", sql.NVarChar(50), "Deleted")
      .input("change_details", sql.NVarChar(sql.MAX), JSON.stringify({ id, routine_name: record.routine_name }))
      .query("INSERT INTO ActivityLog (routine_id,routine_name,changed_by,change_type,change_details) VALUES (NULL,@routine_name,@changed_by,@change_type,@change_details)");

    await transaction.commit();
    return { status: 200, jsonBody: { success: true } };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* transaction was not active */ }
    context.error(error);
    return { status: 500, body: "Error deleting routine." };
  }
}

app.http("deleteRoutine", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "routine/delete",
  handler: deleteRoutine
});
