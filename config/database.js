const mysql = require('mysql2/promise');
const sql = require('mssql');
const logger = require('../utils/logger');

// MySQL 配置
const mysqlConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'notice_system'
};

// SQL Server 配置
const sqlServerConfig = {
    user: 'SHroot',
    password: 'SHroot',
    database: 'notice_system',
    server: 'localhost',
    port: 1433,
    options: {
        encrypt: true,  // 使用加密
        trustServerCertificate: true,  // 信任自签名证书
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        retryDelay: 1000,
        retryAttempts: 3
    }
};

class DatabaseFactory {
    static currentConnection = null;
    static currentPool = null;
    static keepAliveInterval = null;

    static async closeCurrentConnection() {
        try {
            if (this.keepAliveInterval) {
                clearInterval(this.keepAliveInterval);
                this.keepAliveInterval = null;
            }

            if (this.currentPool) {
                await this.currentPool.close();
                this.currentPool = null;
            }
            if (this.currentConnection) {
                if (this.currentConnection.end) {
                    await this.currentConnection.end();
                }
                this.currentConnection = null;
            }
            logger.info('数据库连接已关闭');
        } catch (error) {
            logger.error('关闭数据库连接失败:', error);
            throw error;
        }
    }

    static async createConnection(type = 'mysql') {
        try {
            logger.info(`尝试连接到 ${type} 数据库`);
            // 先关闭现有连接
            await this.closeCurrentConnection();

            // 创建新连接
            switch (type.toLowerCase()) {
                case 'mysql':
                    this.currentConnection = await mysql.createPool(mysqlConfig);
                    break;
                
                case 'sqlserver':
                    this.currentPool = await sql.connect(sqlServerConfig);
                    this.currentConnection = this.currentPool;
                    
                    this.keepAliveInterval = setInterval(async () => {
                        try {
                            await this.currentPool.request().query('SELECT 1');
                            logger.debug('数据库保活检查成功');
                        } catch (error) {
                            logger.error('数据库保活检查失败，尝试重新连接', error);
                            await this.reconnect(type);
                        }
                    }, 60000);

                    this.currentPool.on('error', async (err) => {
                        logger.error('数据库连接错误，尝试重新连接', err);
                        await this.reconnect(type);
                    });
                    break;
                
                default:
                    throw new Error('不支持的数据库类型');
            }

            logger.info(`成功连接到 ${type} 数据库`);
            return this.currentConnection;
        } catch (error) {
            logger.error('数据库连接失败', { 
                type,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    static async reconnect(type) {
        try {
            logger.info('尝试重新连接数据库');
            await this.closeCurrentConnection();
            await this.createConnection(type);
            logger.info('数据库重新连接成功');
        } catch (error) {
            logger.error('数据库重新连接失败', error);
            setTimeout(() => this.reconnect(type), 5000);
        }
    }

    static getCurrentConnection() {
        return this.currentConnection;
    }
}

module.exports = {
    DatabaseFactory,
    mysqlConfig,
    sqlServerConfig
}; 