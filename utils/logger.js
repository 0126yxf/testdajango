const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
    }

    // 确保日志目录存在
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    // 获取当前日期作为文件名
    getLogFileName() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
    }

    // 格式化日志消息
    formatMessage(level, message, details = null) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;
        if (details) {
            logMessage += `\n${JSON.stringify(details, null, 2)}`;
        }
        return logMessage + '\n';
    }

    // 写入日志
    async writeLog(level, message, details = null) {
        const logFile = path.join(this.logDir, this.getLogFileName());
        const logMessage = this.formatMessage(level, message, details);

        try {
            await fs.promises.appendFile(logFile, logMessage);
            // 同时输出到控制台
            console.log(logMessage);
        } catch (error) {
            console.error('写入日志失败:', error);
        }
    }

    // 不同级别的日志方法
    async info(message, details = null) {
        await this.writeLog('INFO', message, details);
    }

    async warn(message, details = null) {
        await this.writeLog('WARN', message, details);
    }

    async error(message, details = null) {
        await this.writeLog('ERROR', message, details);
    }

    async debug(message, details = null) {
        if (process.env.NODE_ENV === 'development') {
            await this.writeLog('DEBUG', message, details);
        }
    }
}

// 创建单例
const logger = new Logger();
module.exports = logger; 