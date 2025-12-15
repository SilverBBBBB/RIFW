import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function ProcessSearch(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const apiKey = process.env.AI_API;
    if (!apiKey) {
        return { status: 500, body: "AI_API environment variable not set." };
    }

    let body: any;
    try {
        body = await request.json();
    } catch (error) {
        return { status: 400, body: "Invalid JSON body" };
    }

    const query = body.query;
    if (!query) {
        return { status: 400, body: "Missing 'query' in request body" };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an AI assistant for a dashboard. Your goal is to convert a natural language user query into a structured JSON object representing filters.

        The available filters are:
        1. Global Filters:
           - version: string (e.g., "1", "2")
           - startDate: string (YYYY-MM-DD)
           - endDate: string (YYYY-MM-DD)

        2. Column Filters (map these to the 'columnFilters' object):
           - routine_name: string
           - routine_type: string (e.g., "Capital", "Expense")
           - region: string (e.g., "North America", "Europe")
           - fund_types: string
           - routine_group: string
           - report_name: string
           - sheet_name: string

        Current Date: ${new Date().toISOString().split('T')[0]}

        Rules:
        - Extract dates relative to the current date if mentioned (e.g., "since January" means startDate is Jan 1st of current year).
        - Map keywords to the most likely column filter.
        - Return ONLY the JSON object. No markdown formatting.

        User Query: "${query}"
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up potential markdown code blocks
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const filters = JSON.parse(cleanJson);

        return {
            status: 200,
            jsonBody: filters
        };

    } catch (error: any) {
        context.log("Error processing AI search:", error);
        return {
            status: 500,
            body: `Internal Server Error processing AI request. Details: ${error.message || error}`
        };
    }
}

app.http('ProcessSearch', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: ProcessSearch
});
