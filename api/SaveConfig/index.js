
const { getPool, sql } = require('../shared/sql');

module.exports = async function (context, req) {
    const { category, values } = req.body;
    
    if (!category || !Array.isArray(values)) {
        context.res = { status: 400, body: "Invalid payload" };
        return;
    }

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);
        
        // 1. Delete all for category
        await request.input('cat', sql.NVarChar, category)
            .query('DELETE FROM AppConfig WHERE category = @cat');

        // 2. Insert new values
        for (const val of values) {
            const iReq = new sql.Request(transaction);
            iReq.input('cat', sql.NVarChar, category)
                .input('val', sql.NVarChar, val);
            await iReq.query('INSERT INTO AppConfig (category, value) VALUES (@cat, @val)');
        }

        await transaction.commit();
        context.res = { body: { success: true } };
    } catch (err) {
        if (transaction) await transaction.rollback();
        context.log.error(err);
        context.res = { status: 500, body: "Error saving config" };
    }
};
