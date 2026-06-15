import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPool } from "../shared/sql";

export async function health(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS healthy");
    return {
      status: 200,
      jsonBody: {
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    context.error(error);
    return {
      status: 503,
      jsonBody: {
        status: "unhealthy",
        database: "unavailable",
        timestamp: new Date().toISOString()
      }
    };
  }
}

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: health
});
