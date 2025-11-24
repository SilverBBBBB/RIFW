
const { getPool } = require('../shared/sql');

module.exports = async function (context, req) {
    try {
        const pool = await getPool();
        
        // Fetch all data in parallel
        const rRoutines = await pool.request().query('SELECT * FROM Routines');
        const rReports = await pool.request().query('SELECT * FROM Reports');
        const rMappings = await pool.request().query('SELECT * FROM CDMMappings');
        const rAttributes = await pool.request().query('SELECT * FROM Attributes');
        const rSheets = await pool.request().query('SELECT * FROM OutputSheets');
        const rDetails = await pool.request().query('SELECT * FROM SheetDetails');
        const rUserInputs = await pool.request().query('SELECT * FROM UserInputs');
        const rConfig = await pool.request().query('SELECT * FROM AppConfig');

        // Process Config into object
        const configObj = {
            versions: [], routineTypes: [], fundTypes: [], regions: [], 
            capitalStructures: [], dataTypes: [], reportNames: [], helperRoutines: []
        };
        
        rConfig.recordset.forEach(row => {
            if (configObj[row.category]) {
                configObj[row.category].push(row.value);
            }
        });

        // Parse JSON fields in Routines
        const routines = rRoutines.recordset.map(r => ({
            ...r,
            fund_types: r.fund_types ? JSON.parse(r.fund_types) : [],
            helper_routines: r.helper_routines ? JSON.parse(r.helper_routines) : [],
            is_active: !!r.is_active
        }));
        
        // Convert BIT to boolean for other tables
        const reports = rReports.recordset.map(r => ({ ...r, is_optional: !!r.is_optional }));
        const mappings = rMappings.recordset.map(m => ({ ...m, is_required: !!m.is_required }));
        const userInputs = rUserInputs.recordset.map(u => ({ ...u, is_mandatory: !!u.is_mandatory }));

        context.res = {
            body: {
                routines,
                reports,
                cdmMappings: mappings,
                attributes: rAttributes.recordset,
                outputSheets: rSheets.recordset,
                sheetDetails: rDetails.recordset,
                userInputs,
                config: configObj
            }
        };
    } catch (err) {
        context.log(err);
        context.res = { status: 500, body: "Error fetching data: " + err.message };
    }
};
