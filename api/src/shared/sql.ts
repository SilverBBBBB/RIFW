import * as sql from 'mssql';

const config: sql.config = {
user: process.env.DB_USER,          // Was SQL_USER
  password: process.env.DB_PASSWORD,  // Was SQL_PASSWORD
  server: process.env.DB_SERVER!,     // Was SQL_SERVER!
  database: process.env.DB_NAME,      // Was SQL_DATABASE
  options: {
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: true,
    connectTimeout: 30000
  }
};

let pool: sql.ConnectionPool | null = null;

export const getPool = async (): Promise<sql.ConnectionPool> => {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log('Connected to SQL Database');
    return pool;
  } catch (err) {
    console.error('Database Connection Failed', err);
    throw err;
  }
};

export { sql };