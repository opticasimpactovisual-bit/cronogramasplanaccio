IF EXISTS (SELECT * FROM sys.server_principals WHERE name = 'appuser')
    DROP LOGIN appuser;
    CREATE LOGIN appuser WITH PASSWORD = 'Optica123', CHECK_POLICY = OFF;
    USE Opticas_San_Antonio;
    CREATE USER appuser FOR LOGIN appuser;
    ALTER ROLE db_owner ADD MEMBER appuser;
    SELECT name, is_disabled FROM sys.server_principals WHERE name = 'appuser';
