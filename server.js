const express = require('express');
const cors = require('cors');
const { sql, config } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Obtener todos los registros
app.get('/api/hallazgos', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT * FROM Hallazgos');
    res.json(result.recordset);
  } catch (err) {
    console.error('--- ERROR EN GET /api/hallazgos ---');
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Crear un nuevo registro
app.post('/api/hallazgos', async (req, res) => {
  const { hallazgo, tipo, fechaInicio, fechaFinal, estado } = req.body;
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('hallazgo', sql.NVarChar, hallazgo)
      .input('tipo', sql.NVarChar, tipo)
      .input('fechaInicio', sql.Date, fechaInicio || null)
      .input('fechaFinal', sql.Date, fechaFinal || null)
      .input('estado', sql.NVarChar, estado)
      .query(`INSERT INTO Hallazgos ([Hallazgos], [Tipo de hallazgo], [Fecha de inicio], [Fecha final], [Estado])
              OUTPUT INSERTED.ID
              VALUES (@hallazgo, @tipo, @fechaInicio, @fechaFinal, @estado)`);
    res.json({ id: result.recordset[0].ID });
  } catch (err) {
    console.error('--- ERROR EN POST /api/hallazgos ---');
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Actualizar un registro existente
app.put('/api/hallazgos/:id', async (req, res) => {
  const { id } = req.params;
  const { hallazgo, tipo, fechaInicio, fechaFinal, estado } = req.body;
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .input('hallazgo', sql.NVarChar, hallazgo)
      .input('tipo', sql.NVarChar, tipo)
      .input('fechaInicio', sql.Date, fechaInicio || null)
      .input('fechaFinal', sql.Date, fechaFinal || null)
      .input('estado', sql.NVarChar, estado)
      .query(`UPDATE Hallazgos SET
                [Hallazgos]=@hallazgo,
                [Tipo de hallazgo]=@tipo,
                [Fecha de inicio]=@fechaInicio,
                [Fecha final]=@fechaFinal,
                [Estado]=@estado
              WHERE ID=@id`);
    res.sendStatus(200);
  } catch (err) {
    console.error('--- ERROR EN PUT /api/hallazgos/:id ---');
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Eliminar un registro
app.delete('/api/hallazgos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Hallazgos WHERE ID=@id');
    res.sendStatus(200);
  } catch (err) {
    console.error('--- ERROR EN DELETE /api/hallazgos/:id ---');
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => console.log('Servidor corriendo en http://localhost:3000'));