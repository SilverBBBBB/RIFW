import * as sql from 'mssql';

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER!,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: false,
    connectTimeout: 30000
  }
};

let pool: sql.ConnectionPool | null = null;

export const getPool = async (): Promise<sql.ConnectionPool> => {
  if (pool?.connected) return pool;
  try {
    pool = new sql.ConnectionPool(config);
    pool.on("error", () => {
      pool = null;
    });
    await pool.connect();
    return pool;
  } catch (err) {
    pool = null;
    throw err;
  }
};

export { sql };
