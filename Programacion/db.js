const sql = require('mssql');

const config = {
  user: 'appuser',
  password: 'Optica123',
  server: 'localhost',
  port: 1433,
  database: 'Opticas_San_Antonio',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

module.exports = { sql, config };