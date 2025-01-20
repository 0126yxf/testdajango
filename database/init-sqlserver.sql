-- 创建登录账号（如果不存在）
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'SHroot')
BEGIN
    CREATE LOGIN [SHroot] WITH PASSWORD = 'SHroot',
    DEFAULT_DATABASE = [notice_system],
    CHECK_EXPIRATION = OFF,
    CHECK_POLICY = OFF;
END
GO

-- 创建数据库
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'notice_system')
BEGIN
    CREATE DATABASE notice_system;
END
GO

USE notice_system;
GO

-- 创建数据库用户并映射到登录账号
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'SHroot')
BEGIN
    CREATE USER [SHroot] FOR LOGIN [SHroot];
END
GO

-- 授予必要的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [SHroot];
GO

-- 授予特定表的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO [SHroot];
GRANT SELECT, INSERT, UPDATE, DELETE ON files TO [SHroot];
GRANT SELECT, INSERT, UPDATE, DELETE ON signatures TO [SHroot];
GO

-- 如果需要创建表的权限
GRANT CREATE TABLE TO [SHroot];
GO

-- 如果需要执行存储过程的权限
GRANT EXECUTE TO [SHroot];
GO

-- 将用户添加到数据库角色
EXEC sp_addrolemember 'db_datareader', 'SHroot';
EXEC sp_addrolemember 'db_datawriter', 'SHroot';
GO

-- 创建用户表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' and xtype='U')
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 创建文件表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='files' and xtype='U')
BEGIN
    CREATE TABLE files (
        id NVARCHAR(50) PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,
        file_name NVARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        file_type NVARCHAR(100) NOT NULL,
        file_data VARBINARY(MAX) NOT NULL,
        required_signs INT NOT NULL DEFAULT 1,
        created_by INT,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (created_by) REFERENCES users(id)
    );
END
GO

-- 创建签名记录表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='signatures' and xtype='U')
BEGIN
    CREATE TABLE signatures (
        id INT IDENTITY(1,1) PRIMARY KEY,
        file_id NVARCHAR(50) NOT NULL,
        signer_name NVARCHAR(100) NOT NULL,
        signature_data NVARCHAR(MAX) NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );
END
GO

-- 添加索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_file_id' AND object_id = OBJECT_ID('signatures'))
BEGIN
    CREATE INDEX idx_file_id ON signatures(file_id);
END
GO

-- 插入默认管理员账户
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (username, password) VALUES ('admin', 'admin123');
END
GO

-- 创建操作日志表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='operation_logs' and xtype='U')
BEGIN
    CREATE TABLE operation_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT,
        username NVARCHAR(50),
        operation_type NVARCHAR(50) NOT NULL,
        operation_desc NVARCHAR(MAX),
        ip_address NVARCHAR(50),
        user_agent NVARCHAR(MAX),
        created_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
END
GO 