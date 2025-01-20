const express = require('express');
const { 
    DatabaseFactory, 
    mysqlConfig,
    sqlServerConfig 
} = require('./config/database');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const QRCode = require('qrcode');
const logger = require('./utils/logger');
const logOperation = require('./middleware/operationLog');

// 创建 Express 应用
const app = express();
const port = 3000;

// 基本中间件
app.use(cors());
app.use(express.json());

// 数据库相关变量
let db;
let currentDatabase = process.env.DATABASE_TYPE || 'mysql';

// 创建数据库连接
(async () => {
    try {
        db = await DatabaseFactory.createConnection(currentDatabase);
        console.log(`成功连接到 ${currentDatabase} 数据库`);
    } catch (error) {
        console.error('数据库连接失败:', error);
        process.exit(1);
    }
})();

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function(req, file, cb) {
        // 检查文件类型
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传 PDF 或图片文件 (jpg, jpeg, png)'));
        }
    }
}).single('file');

// 使用内存存储替代 MySQL 会话存储
const sessionStore = new session.MemoryStore();

// 添加会话中间件
app.use(session({
    key: 'auth_token',
    secret: 'your_session_secret',
    store: sessionStore,  // 使用内存存储
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    },
    rolling: true
}));

// 处理根路径
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 获取文件列表
app.get('/api/files', async (req, res) => {
    try {
        let files;
        
        if (currentDatabase === 'mysql') {
            const [rows] = await db.execute(`
                SELECT 
                    f.id, 
                    f.title, 
                    f.file_name, 
                    f.file_size, 
                    f.required_signs, 
                    f.created_at,
                    (SELECT COUNT(*) FROM signatures s WHERE s.file_id = f.id) as current_signs
                FROM files f
                ORDER BY f.created_at DESC
            `);
            files = rows;
        } else {
            // SQL Server 查询
            const result = await db.query(`
                SELECT 
                    f.id, 
                    f.title, 
                    f.file_name, 
                    f.file_size, 
                    f.required_signs, 
                    f.created_at,
                    (SELECT COUNT(*) FROM signatures s WHERE s.file_id = f.id) as current_signs
                FROM files f
                ORDER BY f.created_at DESC
            `);
            files = result.recordset;
        }

        // 为每个文件添加分享链接和状态
        const filesWithShareInfo = files.map(file => ({
            ...file,
            shareLink: `${req.protocol}://${req.get('host')}/sign.html?id=${file.id}`,
            status: file.current_signs >= file.required_signs ? '已完成' : `${file.current_signs}/${file.required_signs}`
        }));

        console.log('Files retrieved successfully:', filesWithShareInfo.length);

        res.json({
            success: true,
            data: filesWithShareInfo
        });
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取列表失败',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 获取单个文件信息和预览
app.get('/api/files/:id', async (req, res) => {
    try {
        let file;
        if (currentDatabase === 'mysql') {
            const [files] = await db.execute(`
                SELECT f.*, 
                    (SELECT COUNT(*) FROM signatures s WHERE s.file_id = f.id) as current_signs
                FROM files f 
                WHERE f.id = ?
            `, [req.params.id]);
            
            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            file = files[0];
        } else {
            // SQL Server 查询
            const sql = require('mssql');
            const request = new sql.Request();
            request.input('fileId', sql.NVarChar, req.params.id);

            const result = await request.query(`
                SELECT f.*, 
                    (SELECT COUNT(*) FROM signatures s WHERE s.file_id = f.id) as current_signs
                FROM files f 
                WHERE f.id = @fileId
            `);
            
            if (!result.recordset.length) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            file = result.recordset[0];
        }

        // 添加预览URL
        file.previewUrl = `/api/files/${file.id}/preview`;
        
        res.json({
            success: true,
            data: file
        });
    } catch (error) {
        console.error('获取文件失败:', error);
        res.status(500).json({
            success: false,
            message: '获取文件失败: ' + error.message
        });
    }
});

// 文件预览接口
app.get('/api/files/:id/preview', async (req, res) => {
    try {
        let file;
        if (currentDatabase === 'mysql') {
            const [files] = await db.execute(
                'SELECT file_name, file_type, file_data FROM files WHERE id = ?',
                [req.params.id]
            );
            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            file = files[0];
        } else {
            // SQL Server 查询
            const sql = require('mssql');
            const request = new sql.Request();
            request.input('fileId', sql.NVarChar, req.params.id);

            const result = await request.query(`
                SELECT file_name, file_type, file_data 
                FROM files 
                WHERE id = @fileId
            `);

            if (!result.recordset.length) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            file = result.recordset[0];
        }

        // 获取文件扩展名
        const ext = path.extname(file.file_name).toLowerCase();

        // 设置正确的 Content-Type
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
        } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            res.setHeader('Content-Type', file.file_type);
        } else {
            // 不支持的文件类型，返回提示页面
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            font-family: Arial, sans-serif;
                            background-color: #f5f5f5;
                        }
                        .message {
                            text-align: center;
                            padding: 20px;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .download-btn {
                            display: inline-block;
                            margin-top: 15px;
                            padding: 10px 20px;
                            background-color: #007bff;
                            color: white;
                            text-decoration: none;
                            border-radius: 4px;
                        }
                    </style>
                </head>
                <body>
                    <div class="message">
                        <h3>该文件类型不支持在线预览</h3>
                        <p>文件类型: ${ext}</p>
                        <a href="/api/files/${req.params.id}/download" class="download-btn">下载文件</a>
                    </div>
                </body>
                </html>
            `);
        }

        // 发送文件数据
        res.send(file.file_data);

    } catch (error) {
        console.error('预览失败:', error);
        res.status(500).json({
            success: false,
            message: '文件预览失败: ' + error.message
        });
    }
});

// 文件下载接口
app.get('/api/files/:id/download', async (req, res) => {
    try {
        let file;
        if (req.session.database === 'mysql') {
            const [files] = await db.execute(
                'SELECT file_name, file_data FROM files WHERE id = ?',
                [req.params.id]
            );
            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            file = files[0];
        } else {
            const result = await db.query`
                SELECT file_name, file_data FROM files WHERE id = ${req.params.id}
            `;
            if (!result.recordset.length) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
            file = result.recordset[0];
        }

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
        res.send(file.file_data);
    } catch (error) {
        console.error('下载失败:', error);
        res.status(500).json({
            success: false,
            message: '文件下载失败'
        });
    }
});

// 删除文件接口
app.delete('/api/files/:id', async (req, res) => {
    try {
        let result;
        if (req.session.database === 'mysql') {
            [result] = await db.execute(
                'DELETE FROM files WHERE id = ?',
                [req.params.id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
        } else {
            result = await db.query`
                DELETE FROM files WHERE id = ${req.params.id}
            `;
            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }
        }

        res.json({
            success: true,
            message: '文件删除成功'
        });
    } catch (error) {
        console.error('删除失败:', error);
        res.status(500).json({
            success: false,
            message: '文件删除失败'
        });
    }
});

// 登录接口
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, database } = req.body;
        logger.info('登录尝试', { username, database });

        // 验证数据库类型
        if (!['mysql', 'sqlserver'].includes(database)) {
            return res.status(400).json({
                success: false,
                message: '不支持的数据库类型'
            });
        }

        // 重新创建数据库连接
        try {
            db = await DatabaseFactory.createConnection(database);
            currentDatabase = database; // 更新当前数据库类型
            console.log(`切换到 ${database} 数据库`);
        } catch (error) {
            throw new Error(`数据库连接失败: ${error.message}`);
        }

        // 验证用户名和密码
        let user;
        if (database === 'mysql') {
            const [users] = await db.execute(
                'SELECT id, username FROM users WHERE username = ? AND password = ?',
                [username, password]
            );
            user = users[0];
        } else {
            const result = await db.query`
                SELECT id, username FROM users 
                WHERE username = ${username} AND password = ${password}
            `;
            user = result.recordset[0];
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 设置会话
        req.session.isLoggedIn = true;
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.database = database;

        // 记录登录操作
        await logOperation(db, currentDatabase, {
            userId: user.id,
            username: user.username,
            operationType: 'LOGIN',
            operationDesc: `用户登录 [${database}]`,
            req
        });

        logger.info('登录成功', { username, database });
        res.json({
            success: true,
            message: '登录成功'
        });
    } catch (error) {
        logger.error('登录失败', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            message: '登录失败: ' + error.message
        });
    }
});

// 登出接口
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout failed:', err);
            return res.status(500).json({
                success: false,
                message: '退出失败'
            });
        }
        res.json({
            success: true,
            message: '退出成功'
        });
    });
});

// 检查登录状态API
app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.isLoggedIn) {
        res.json({
            success: true,
            message: '已登录'
        });
    } else {
        res.status(401).json({
            success: false,
            message: '未登录或会话已过期'
        });
    }
});

// 提交签名
app.post('/api/files/:id/sign', async (req, res) => {
    try {
        const fileId = req.params.id;
        const { signatureData, signerName } = req.body;

        if (!signatureData || !signerName) {
            return res.status(400).json({
                success: false,
                message: '签名数据和签名人姓名不能为空'
            });
        }

        if (req.session.database === 'mysql') {
            await db.execute(
                'INSERT INTO signatures (file_id, signer_name, signature_data) VALUES (?, ?, ?)',
                [fileId, signerName, signatureData]
            );
        } else {
            await db.query`
                INSERT INTO signatures (file_id, signer_name, signature_data)
                VALUES (${fileId}, ${signerName}, ${signatureData})
            `;
        }

        res.json({
            success: true,
            message: '签名成功'
        });
    } catch (error) {
        console.error('签名失败:', error);
        res.status(500).json({
            success: false,
            message: '签名失败'
        });
    }
});

// 获取文件预览（包含签名信息）
app.get('/api/files/:id/preview-with-signatures', async (req, res) => {
    try {
        let file, signatures;
        
        if (currentDatabase === 'mysql') {
            // MySQL 查询
            const [files] = await db.execute(
                'SELECT * FROM files WHERE id = ?',
                [req.params.id]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }

            const [sigs] = await db.execute(
                'SELECT signer_name, signature_data, created_at FROM signatures WHERE file_id = ? ORDER BY created_at DESC',
                [req.params.id]
            );

            file = files[0];
            signatures = sigs;
        } else {
            // SQL Server 查询
            const sql = require('mssql');
            const request = new sql.Request();
            request.input('fileId', sql.NVarChar, req.params.id);

            const fileResult = await request.query(`
                SELECT * FROM files WHERE id = @fileId
            `);

            if (!fileResult.recordset.length) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }

            const sigResult = await request.query(`
                SELECT signer_name, signature_data, created_at 
                FROM signatures 
                WHERE file_id = @fileId 
                ORDER BY created_at DESC
            `);

            file = fileResult.recordset[0];
            signatures = sigResult.recordset;
        }

        // 处理日期格式
        const formattedSignatures = signatures.map(sig => ({
            ...sig,
            created_at: new Date(sig.created_at).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })
        }));

        res.json({
            success: true,
            data: {
                file,
                signatures: formattedSignatures
            }
        });
    } catch (error) {
        console.error('获取预览失败:', error);
        res.status(500).json({
            success: false,
            message: '获取预览失败: ' + error.message
        });
    }
});

// 添加路由中间件来保护管理页面 - 移到前面
app.use(['/admin.html', '/upload.html'], async (req, res, next) => {
    try {
        // 检查是否有会话
        if (!req.session || !req.session.isLoggedIn) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: '未登录或会话已过期'
                });
            }
            return res.redirect('/login.html');
        }
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 添加图片静态服务
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 静态文件服务
app.use(express.static('public'));

// 文件上传处理
app.post('/api/files', (req, res) => {
    // 检查登录状态
    if (!req.session || !req.session.isLoggedIn) {
        return res.status(401).json({
            success: false,
            message: '未登录或会话已过期'
        });
    }

    upload(req, res, async function(err) {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        try {
            // 检查文件是否存在
            if (!req.file) {
                throw new Error('请选择要上传的文件');
            }

            const { title, requiredSigns } = req.body;
            if (!title || !requiredSigns) {
                throw new Error('请填写所有必填字段');
            }

            // 获取文件信息
            const fileBuffer = req.file.buffer;
            const fileName = req.file.originalname;
            const fileSize = req.file.size;
            const fileType = req.file.mimetype;

            // 生成唯一文件标识符
            const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            try {
                // 根据数据库类型执行不同的插入操作
                if (req.session.database === 'mysql') {
                    await db.execute(
                        'INSERT INTO files (id, title, file_name, file_size, file_type, file_data, required_signs, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [fileId, title, fileName, fileSize, fileType, fileBuffer, requiredSigns, req.session.userId]
                    );
                } else {
                    // SQL Server 插入 - 使用 sql.Request()
                    const sql = require('mssql');
                    const request = new sql.Request();
                    
                    // 将 Buffer 转换为 SQL Server 可接受的格式
                    const fileData = '0x' + fileBuffer.toString('hex');
                    
                    const query = `
                        INSERT INTO files (id, title, file_name, file_size, file_type, file_data, required_signs, created_by)
                        VALUES (@id, @title, @fileName, @fileSize, @fileType, ${fileData}, @requiredSigns, @userId)
                    `;

                    request.input('id', sql.NVarChar, fileId);
                    request.input('title', sql.NVarChar, title);
                    request.input('fileName', sql.NVarChar, fileName);
                    request.input('fileSize', sql.BigInt, fileSize);
                    request.input('fileType', sql.NVarChar, fileType);
                    request.input('requiredSigns', sql.Int, parseInt(requiredSigns));
                    request.input('userId', sql.Int, req.session.userId);

                    await request.query(query);
                }

                // 生成分享链接
                const shareLink = `${req.protocol}://${req.get('host')}/sign/${fileId}`;

                // 记录上传操作
                await logOperation(db, currentDatabase, {
                    userId: req.session.userId,
                    username: req.session.username,
                    operationType: 'UPLOAD',
                    operationDesc: `上传文件 [${fileName}]`,
                    req
                });

                logger.info('文件上传成功', { fileId });
                res.json({
                    success: true,
                    message: '文件上传成功',
                    data: {
                        id: fileId,
                        title,
                        fileName,
                        fileSize,
                        shareLink
                    }
                });

            } catch (dbError) {
                console.error('Database error:', dbError);
                throw new Error('保存文件失败: ' + dbError.message);
            }

        } catch (error) {
            logger.error('文件上传失败', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                message: '上传失败: ' + error.message
            });
        }
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    logger.error('服务器错误', { 
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    res.status(500).json({
        success: false,
        message: '服务器错误'
    });
});

// 处理404错误
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({
            success: false,
            message: '接口不存在'
        });
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

// 分享链接生成接口
app.get('/api/files/:id/share', async (req, res) => {
    try {
        const fileId = req.params.id;
        const shareUrl = `${req.protocol}://${req.get('host')}/sign.html?id=${fileId}`;
        
        // 生成二维码
        const qrCode = await QRCode.toDataURL(shareUrl);
        
        res.json({
            success: true,
            data: {
                shareUrl,
                qrCode
            }
        });
    } catch (error) {
        console.error('生成分享链接失败:', error);
        res.status(500).json({
            success: false,
            message: '生成分享链接失败'
        });
    }
});

// 权限验证中间件
const authMiddleware = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.status(401).json({
            success: false,
            message: '未登录或会话已过期'
        });
    }
    next();
};

// 获取操作日志 - 添加权限验证
app.get('/api/logs', authMiddleware, async (req, res) => {
    try {
        let logs;
        const { startDate, endDate, username, operationType } = req.query;

        if (currentDatabase === 'mysql') {
            let query = `
                SELECT * FROM operation_logs 
                WHERE 1=1
            `;
            const params = [];

            if (startDate) {
                query += ' AND DATE(created_at) >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND DATE(created_at) <= ?';
                params.push(endDate);
            }
            if (username) {
                query += ' AND username LIKE ?';
                params.push(`%${username}%`);
            }
            if (operationType) {
                query += ' AND operation_type = ?';
                params.push(operationType);
            }

            query += ' ORDER BY created_at DESC';
            const [rows] = await db.execute(query, params);
            logs = rows;
        } else {
            const request = db.request();
            let query = `
                SELECT * FROM operation_logs 
                WHERE 1=1
            `;

            if (startDate) {
                query += ' AND CAST(created_at AS DATE) >= @startDate';
                request.input('startDate', startDate);
            }
            if (endDate) {
                query += ' AND CAST(created_at AS DATE) <= @endDate';
                request.input('endDate', endDate);
            }
            if (username) {
                query += ' AND username LIKE @username';
                request.input('username', `%${username}%`);
            }
            if (operationType) {
                query += ' AND operation_type = @operationType';
                request.input('operationType', operationType);
            }

            query += ' ORDER BY created_at DESC';
            const result = await request.query(query);
            logs = result.recordset;
        }

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        logger.error('获取操作日志失败', { error: error.message });
        res.status(500).json({
            success: false,
            message: '获取操作日志失败'
        });
    }
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}); 