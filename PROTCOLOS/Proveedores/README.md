# Matriz de evaluación de proveedores – Centro Óptico San Antonio

Versión web del Excel "Matriz de evaluación de proveedores". Los datos se guardan en SQL Server.

> Guárdalo en una carpeta propia, separada del proyecto del cronograma (usa los mismos nombres de archivo).

## Archivos
- `index.html`: la página (lista de evaluaciones y formulario).
- `server.js`: API en Node/Express que conecta con SQL Server.
- `schema.sql`: crea las tablas y los 6 criterios dentro de tu base `Opticas_San_Antonio` (en el esquema `evaluacion`).
- `env.example`: renómbralo a `.env` y pon tus datos de conexión.
- `package.json`: dependencias.

## Crear las tablas en Opticas_San_Antonio
1. Abre SQL Server Management Studio (o Azure Data Studio) y conéctate a tu servidor.
2. Abre `schema.sql` y ejecútalo completo. Las tablas quedan en el esquema `evaluacion` (por ejemplo `evaluacion.Proveedores`), separadas del resto de tus tablas. Se puede ejecutar más de una vez sin borrar datos.
3. Con `sqlcmd` sería: `sqlcmd -S localhost -U sa -P tu_clave -i schema.sql`

## Puesta en marcha
1. Renombra `env.example` a `.env` y completa `DB_SERVER`, `DB_USER` y `DB_PASSWORD` (`DB_NAME` ya viene como `Opticas_San_Antonio`).
2. `npm install`
3. `npm start`
4. Abre http://localhost:3000

Si ya tienes corriendo el cronograma en el puerto 3000, cambia `PORT` en `.env` (por ejemplo `3001`).

## Cómo se calcula
Puntaje = suma de (calificación 1–5 × ponderación) de los 6 criterios. Las ponderaciones suman 100%.
Categorías: 4.5–5.0 Excelente · 3.5–4.4 Bueno · 2.5–3.4 Aceptable · menos de 2.5 Deficiente.
El servidor recalcula el puntaje al guardar.

## Si lo subes a GitHub
No subas el archivo `.env` (agrégalo a `.gitignore`). Para publicarlo en internet necesitas un hosting que ejecute Node.
