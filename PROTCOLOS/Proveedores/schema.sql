-- =====================================================================
-- Matriz de evaluación de proveedores - Centro Óptico San Antonio
--
-- BASE DE DATOS DESTINO:  Opticas_San_Antonio
--
-- Este script genera las tablas ÚNICAMENTE en la base de datos
-- Opticas_San_Antonio (debe existir previamente). Si no existe, el
-- script se detiene sin crear nada.
--
-- Las tablas quedan en un esquema propio llamado "evaluacion", así no chocan con
-- tablas que ya tengas (por ejemplo una tabla Proveedores).
-- Es seguro ejecutarlo más de una vez: no borra datos existentes.
-- =====================================================================

-- Verifica que exista la base de datos Opticas_San_Antonio
IF DB_ID('Opticas_San_Antonio') IS NULL
BEGIN
    RAISERROR('No existe la base de datos Opticas_San_Antonio. Créala antes de ejecutar este script.', 16, 1);
    SET NOEXEC ON;  -- detiene el resto del script
END
GO

-- Todas las tablas se crean en la base de datos Opticas_San_Antonio
USE Opticas_San_Antonio;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'evaluacion')
    EXEC('CREATE SCHEMA evaluacion');
GO

IF OBJECT_ID('evaluacion.Proveedores', 'U') IS NULL
CREATE TABLE evaluacion.Proveedores (
    id     INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(200) NOT NULL,
    nit    NVARCHAR(30)  NOT NULL UNIQUE
);
GO

IF OBJECT_ID('evaluacion.Criterios', 'U') IS NULL
CREATE TABLE evaluacion.Criterios (
    id          INT PRIMARY KEY,
    nombre      NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(400) NOT NULL,
    ponderacion DECIMAL(4,2)  NOT NULL CHECK (ponderacion > 0 AND ponderacion <= 1),
    orden       INT NOT NULL
);
GO

IF OBJECT_ID('evaluacion.Evaluaciones', 'U') IS NULL
CREATE TABLE evaluacion.Evaluaciones (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    proveedor_id   INT           NOT NULL REFERENCES evaluacion.Proveedores(id),
    fecha          DATE          NOT NULL,
    periodo        NVARCHAR(100) NULL,
    version        NVARCHAR(30)  NULL,
    vigencia       NVARCHAR(30)  NULL,
    codigo         NVARCHAR(30)  NULL,
    puntaje        DECIMAL(4,2)  NOT NULL,
    categoria      NVARCHAR(20)  NOT NULL,
    aceptado       CHAR(1)       NOT NULL CHECK (aceptado IN ('S', 'N')),
    observaciones  NVARCHAR(2000) NULL,
    creado_en      DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    actualizado_en DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
GO

IF OBJECT_ID('evaluacion.EvaluacionDetalle', 'U') IS NULL
CREATE TABLE evaluacion.EvaluacionDetalle (
    evaluacion_id INT     NOT NULL REFERENCES evaluacion.Evaluaciones(id) ON DELETE CASCADE,
    criterio_id   INT     NOT NULL REFERENCES evaluacion.Criterios(id),
    calificacion  TINYINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    PRIMARY KEY (evaluacion_id, criterio_id)
);
GO

IF NOT EXISTS (SELECT 1 FROM evaluacion.Criterios)
INSERT INTO evaluacion.Criterios (id, nombre, descripcion, ponderacion, orden) VALUES
(1, N'Precio',                   N'El costo del producto es competitivo en comparación con otros proveedores.', 0.10, 1),
(2, N'Calidad de producto',      N'La calidad de los productos ofrecidos cumple con los estándares del laboratorio.', 0.30, 2),
(3, N'Tiempo de entrega',        N'El proveedor entrega a tiempo o en el plazo estipulado.', 0.20, 3),
(4, N'Experiencia y reputación', N'El proveedor tiene experiencia trabajando con otros laboratorios ópticos.', 0.10, 4),
(5, N'Servicio al cliente',      N'El proveedor tiene un buen servicio postventa y responde rápidamente a las consultas.', 0.15, 5),
(6, N'Cumplimiento normativo',   N'El proveedor cumple con las regulaciones locales y cuenta con las certificaciones necesarias.', 0.15, 6);
GO

-- Fin del script (se reactiva la ejecución por si se detuvo arriba)
SET NOEXEC OFF;
GO
