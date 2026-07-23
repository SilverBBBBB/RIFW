import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { authenticate, isAuthResponse } from "../shared/auth";
import { canReviewRoutine, rowVersionMatches } from "../shared/routineReview";
import { getPool, sql } from "../shared/sql";

interface ReviewRoutinePayload {
  id?: string;
  row_version?: string;
}

const validString = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

export async function reviewRoutine(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const auth = await authenticate(request, ["Admin", "User"], context);
  if (isAuthResponse(auth)) return auth;

  let body: ReviewRoutinePayload;
  try {
    body = await request.json() as ReviewRoutinePayload;
  } catch {
    return { status: 400, body: "Invalid JSON payload." };
  }

  if (!validString(body.id, 50) || !validString(body.row_version, 100)) {
    return { status: 400, body: "Routine ID and row version are required." };
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const routineResult = await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), body.id)
      .query(`SELECT id, routine_name, review_status, last_changed_by_user_id, row_version
              FROM Routines WITH (UPDLOCK, HOLDLOCK) WHERE id=@id`);
    const routine = routineResult.recordset[0];

    if (!routine) {
      await transaction.rollback();
      return { status: 404, body: "Routine not found." };
    }

    if (!rowVersionMatches(routine.row_version, body.row_version)) {
      await transaction.rollback();
      return { status: 409, body: "This routine changed before it could be reviewed. Reload and retry." };
    }
    if (routine.review_status !== "Pending") {
      await transaction.rollback();
      return { status: 409, body: "This routine is not pending review." };
    }
    if (!canReviewRoutine(routine.last_changed_by_user_id, auth.id)) {
      await transaction.rollback();
      return {
        status: 403,
        body: routine.last_changed_by_user_id === auth.id
          ? "Another user must review your change."
          : "The latest editor could not be verified."
      };
    }

    await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), body.id)
      .input("reviewed_by_user_id", sql.Int, auth.id)
      .query(`UPDATE Routines
              SET review_status='Reviewed', reviewed_by_user_id=@reviewed_by_user_id,
                  reviewed_at=SYSUTCDATETIME()
              WHERE id=@id`);

    await new sql.Request(transaction)
      .input("routine_id", sql.NVarChar(50), body.id)
      .input("routine_name", sql.NVarChar(255), routine.routine_name)
      .input("changed_by", sql.NVarChar(255), auth.username)
      .input("change_type", sql.NVarChar(50), "Reviewed")
      .input("change_details", sql.NVarChar(sql.MAX), JSON.stringify({ review_status: "Reviewed" }))
      .query(`INSERT INTO ActivityLog (routine_id,routine_name,changed_by,change_type,change_details)
              VALUES (@routine_id,@routine_name,@changed_by,@change_type,@change_details)`);

    const updatedResult = await new sql.Request(transaction)
      .input("id", sql.NVarChar(50), body.id)
      .query(`SELECT r.row_version, r.review_status, r.last_edited_date,
                     r.last_changed_by_user_id, editor.Username AS last_changed_by_username,
                     r.reviewed_by_user_id, reviewer.Username AS reviewed_by_username,
                     r.reviewed_at
              FROM Routines r
              LEFT JOIN Users editor ON editor.Id=r.last_changed_by_user_id
              LEFT JOIN Users reviewer ON reviewer.Id=r.reviewed_by_user_id
              WHERE r.id=@id`);
    const updated = updatedResult.recordset[0];
    await transaction.commit();

    return {
      status: 200,
      jsonBody: {
        routine: {
          ...updated,
          row_version: updated.row_version.toString("base64")
        }
      }
    };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* transaction was not active */ }
    context.error(error);
    return { status: 500, body: "Error reviewing routine." };
  }
}

app.http("reviewRoutine", {
  methods: ["POST"],
  route: "routine/review",
  authLevel: "anonymous",
  handler: reviewRoutine
});
