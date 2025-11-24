
const sql = require('mssql');

const config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER, 
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: true,
    enableArithAbort: true
  }
};

async function getPool() {
  try {
    return await sql.connect(config);
  } catch (err) {
    console.error('SQL Connection Error', err);
    throw err;
  }
}

module.exports = { getPool, sql };
