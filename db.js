const sql = require('mssql');

const config = {
  user: 'appuser',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'Opticas_San_Antonio',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

module.exports = { sql, config };