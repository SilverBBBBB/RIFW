import * as sql from 'mssql';

const config: sql.config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER!, 
  database: process.env.SQL_DATABASE,
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