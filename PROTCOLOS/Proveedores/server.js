require('dotenv').config();
const path = require('path');
const express = require('express');
const sql = require('mssql');

const app = express();
app.use(express.json());

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'Opticas_San_Antonio',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig).connect().catch((err) => {
      poolPromise = null; // permite reintentar
      throw err;
    });
  }
  return poolPromise;
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Error de base de datos' });
  });

const round2 = (n) => Math.round(n * 100) / 100;
const categoria = (p) => (p >= 4.5 ? 'Excelente' : p >= 3.5 ? 'Bueno' : p >= 2.5 ? 'Aceptable' : 'Deficiente');
const texto = (v, max) => String(v ?? '').trim().slice(0, max);

async function cargarCriterios(pool) {
  const r = await pool.request().query('SELECT id, nombre, descripcion, ponderacion FROM evaluacion.Criterios ORDER BY orden');
  return r.recordset;
}

// Valida el cuerpo y recalcula el puntaje en el servidor (no se confía en el cliente)
function validar(body, criterios) {
  const d = {
    proveedor: texto(body.proveedor, 200),
    nit: texto(body.nit, 30),
    fecha: texto(body.fecha, 10),
    periodo: texto(body.periodo, 100),
    version: texto(body.version, 30),
    vigencia: texto(body.vigencia, 30),
    codigo: texto(body.codigo, 30),
    aceptado: body.aceptado,
    observaciones: texto(body.observaciones, 2000),
  };
  if (!d.proveedor) return { error: 'Falta el nombre del proveedor' };
  if (!d.nit) return { error: 'Falta el NIT' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) || isNaN(new Date(d.fecha))) return { error: 'Fecha inválida' };
  if (d.aceptado !== 'S' && d.aceptado !== 'N') return { error: 'Indica si se acepta el proveedor' };

  const cal = body.calificaciones || {};
  let total = 0;
  d.detalle = [];
  for (const c of criterios) {
    const n = Number(cal[c.id]);
    if (!Number.isInteger(n) || n < 1 || n > 5) return { error: `Falta calificar: ${c.nombre}` };
    total += n * Number(c.ponderacion);
    d.detalle.push({ criterio_id: c.id, calificacion: n });
  }
  d.puntaje = round2(total);
  d.categoria = categoria(d.puntaje);
  return { datos: d };
}

async function guardar(id, body) {
  const pool = await getPool();
  const criterios = await cargarCriterios(pool);
  const v = validar(body, criterios);
  if (v.error) return { status: 400, body: { error: v.error } };
  const d = v.datos;

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const prov = await new sql.Request(tx)
      .input('nit', sql.NVarChar(30), d.nit)
      .input('nombre', sql.NVarChar(200), d.proveedor)
      .query(`
        DECLARE @pid INT = (SELECT id FROM evaluacion.Proveedores WHERE nit = @nit);
        IF @pid IS NULL
        BEGIN
          INSERT INTO evaluacion.Proveedores (nombre, nit) VALUES (@nombre, @nit);
          SET @pid = SCOPE_IDENTITY();
        END
        ELSE UPDATE evaluacion.Proveedores SET nombre = @nombre WHERE id = @pid;
        SELECT @pid AS id;
      `);
    const proveedorId = prov.recordset[0].id;

    const req = new sql.Request(tx)
      .input('proveedor_id', sql.Int, proveedorId)
      .input('fecha', sql.Date, new Date(d.fecha + 'T00:00:00Z'))
      .input('periodo', sql.NVarChar(100), d.periodo || null)
      .input('version', sql.NVarChar(30), d.version || null)
      .input('vigencia', sql.NVarChar(30), d.vigencia || null)
      .input('codigo', sql.NVarChar(30), d.codigo || null)
      .input('puntaje', sql.Decimal(4, 2), d.puntaje)
      .input('categoria', sql.NVarChar(20), d.categoria)
      .input('aceptado', sql.Char(1), d.aceptado)
      .input('observaciones', sql.NVarChar(2000), d.observaciones || null);

    let evalId = id;
    if (id) {
      const u = await req.input('id', sql.Int, id).query(`
        UPDATE evaluacion.Evaluaciones SET proveedor_id=@proveedor_id, fecha=@fecha, periodo=@periodo, version=@version,
          vigencia=@vigencia, codigo=@codigo, puntaje=@puntaje, categoria=@categoria, aceptado=@aceptado,
          observaciones=@observaciones, actualizado_en=SYSDATETIME()
        WHERE id=@id`);
      if (!u.rowsAffected[0]) { await tx.rollback(); return { status: 404, body: { error: 'Evaluación no encontrada' } }; }
      await new sql.Request(tx).input('id', sql.Int, id).query('DELETE FROM evaluacion.EvaluacionDetalle WHERE evaluacion_id=@id');
    } else {
      const ins = await req.query(`
        INSERT INTO evaluacion.Evaluaciones (proveedor_id, fecha, periodo, version, vigencia, codigo, puntaje, categoria, aceptado, observaciones)
        OUTPUT INSERTED.id
        VALUES (@proveedor_id, @fecha, @periodo, @version, @vigencia, @codigo, @puntaje, @categoria, @aceptado, @observaciones)`);
      evalId = ins.recordset[0].id;
    }

    for (const x of d.detalle) {
      await new sql.Request(tx)
        .input('e', sql.Int, evalId)
        .input('c', sql.Int, x.criterio_id)
        .input('n', sql.TinyInt, x.calificacion)
        .query('INSERT INTO evaluacion.EvaluacionDetalle (evaluacion_id, criterio_id, calificacion) VALUES (@e, @c, @n)');
    }
    await tx.commit();
    return { status: 200, body: { ok: true, id: evalId, puntaje: d.puntaje, categoria: d.categoria } };
  } catch (err) {
    try { await tx.rollback(); } catch {}
    throw err;
  }
}

// Página
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'proveedores.html')));
app.get('/proveedores.css', (req, res) => res.sendFile(path.join(__dirname, 'proveedores.css')));
app.get('/proveedores.html', (req, res) => res.sendFile(path.join(__dirname, 'proveedores.html')));
// Logo y páginas de protocolos (para el encabezado y el botón Inicio)
app.use('/PROTOCOLOS', express.static(path.join(__dirname, '..', 'PROTOCOLOS')));

app.get('/api/criterios', wrap(async (req, res) => {
  const pool = await getPool();
  const c = await cargarCriterios(pool);
  res.json(c.map((x) => ({ ...x, ponderacion: Number(x.ponderacion) })));
}));

app.get('/api/evaluaciones', wrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT e.id, p.nombre AS proveedor, p.nit, CONVERT(char(10), e.fecha, 23) AS fecha,
           e.periodo, e.puntaje, e.categoria, e.aceptado
    FROM evaluacion.Evaluaciones e JOIN evaluacion.Proveedores p ON p.id = e.proveedor_id
    ORDER BY e.fecha DESC, e.id DESC`);
  res.json(r.recordset);
}));

app.get('/api/evaluaciones/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Id inválido' });
  const pool = await getPool();
  const r = await pool.request().input('id', sql.Int, id).query(`
    SELECT e.id, p.nombre AS proveedor, p.nit, CONVERT(char(10), e.fecha, 23) AS fecha, e.periodo, e.version,
           e.vigencia, e.codigo, e.puntaje, e.categoria, e.aceptado, e.observaciones
    FROM evaluacion.Evaluaciones e JOIN evaluacion.Proveedores p ON p.id = e.proveedor_id WHERE e.id = @id;
    SELECT criterio_id, calificacion FROM evaluacion.EvaluacionDetalle WHERE evaluacion_id = @id;`);
  const ev = r.recordsets[0][0];
  if (!ev) return res.status(404).json({ error: 'Evaluación no encontrada' });
  ev.calificaciones = {};
  r.recordsets[1].forEach((x) => (ev.calificaciones[x.criterio_id] = x.calificacion));
  res.json(ev);
}));

app.post('/api/evaluaciones', wrap(async (req, res) => {
  const out = await guardar(null, req.body);
  res.status(out.status).json(out.body);
}));

app.put('/api/evaluaciones/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Id inválido' });
  const out = await guardar(id, req.body);
  res.status(out.status).json(out.body);
}));

app.delete('/api/evaluaciones/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Id inválido' });
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM evaluacion.Evaluaciones WHERE id = @id');
  res.json({ ok: true });
}));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Evaluación de proveedores en http://localhost:${port}`));
