
const { getPool, sql } = require('../shared/sql');

module.exports = async function (context, req) {
    const id = req.query.id || (req.body && req.body.id);
    
    if (!id) {
        context.res = { status: 400, body: "Missing ID" };
        return;
    }

    try {
        const pool = await getPool();
        // CASCADE delete configured in DB Schema takes care of children
        await pool.request()
            .input('id', sql.NVarChar, id)
            .query('DELETE FROM Routines WHERE id = @id');
            
        context.res = { body: { success: true } };
    } catch (err) {
        context.log.error(err);
        context.res = { status: 500, body: "Error deleting routine" };
    }
};
