const logger = require('../utils/logger');

async function logOperation(db, currentDatabase, {
    userId,
    username,
    operationType,
    operationDesc,
    req
}) {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        if (currentDatabase === 'mysql') {
            await db.execute(
                'INSERT INTO operation_logs (user_id, username, operation_type, operation_desc, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, username, operationType, operationDesc, ipAddress, userAgent]
            );
        } else {
            const request = db.request();
            await request
                .input('userId', userId)
                .input('username', username)
                .input('operationType', operationType)
                .input('operationDesc', operationDesc)
                .input('ipAddress', ipAddress)
                .input('userAgent', userAgent)
                .query(`
                    INSERT INTO operation_logs 
                    (user_id, username, operation_type, operation_desc, ip_address, user_agent)
                    VALUES 
                    (@userId, @username, @operationType, @operationDesc, @ipAddress, @userAgent)
                `);
        }

        logger.info('记录操作日志', {
            username,
            operationType,
            operationDesc,
            ipAddress
        });
    } catch (error) {
        logger.error('记录操作日志失败', { error: error.message });
    }
}

module.exports = logOperation; 