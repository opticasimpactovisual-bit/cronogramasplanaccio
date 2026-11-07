// Prueba la conexión con SQL Server y revisa las tablas de la matriz de proveedores.
// Uso:  npm run probar
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'Opticas_San_Antonio',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
};

const TABLAS = ['Proveedores', 'Criterios', 'Evaluaciones', 'EvaluacionDetalle'];

(async () => {
  console.log(`Conectando a ${config.server}:${config.port} / base ${config.database} con usuario ${config.user || '(vacío)'}...`);
  let pool;
  try {
    pool = await sql.connect(config);
  } catch (e) {
    console.error('\n❌ No se pudo conectar:', e.message);
    if (/Login failed/i.test(e.message)) console.error('   → Revisa DB_USER y DB_PASSWORD en .env, y que SQL Server permita autenticación SQL (modo mixto).');
    else if (/ECONNREFUSED|ETIMEOUT|getaddrinfo|Failed to connect/i.test(e.message)) console.error('   → Revisa DB_SERVER y DB_PORT, que el servicio SQL Server esté encendido y que TCP/IP esté habilitado en el puerto 1433 (SQL Server Configuration Manager).');
    else if (/Cannot open database/i.test(e.message)) console.error('   → La base de datos no existe o el usuario no tiene permiso sobre ella. Revisa DB_NAME.');
    process.exit(1);
  }
  console.log('✅ Conexión correcta.\n');

  let ok = true;
  for (const t of TABLAS) {
    try {
      const r = await pool.request().query(`SELECT COUNT(*) AS n FROM evaluacion.${t}`);
      console.log(`✅ evaluacion.${t.padEnd(18)} ${r.recordset[0].n} registro(s)`);
    } catch (e) {
      ok = false;
      console.log(`❌ evaluacion.${t.padEnd(18)} no encontrada (${e.message})`);
    }
  }
  await pool.close();
  console.log(ok ? '\nTodo listo. Ejecuta "npm start" y abre http://localhost:' + (process.env.PORT || 3000)
                 : '\nFaltan tablas: ejecuta schema.sql en la base ' + config.database + '.');
  process.exit(ok ? 0 : 1);
})();
