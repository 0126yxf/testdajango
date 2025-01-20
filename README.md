# Web管理系统

这是一个基于 Node.js 的 Web 管理系统，提供用户管理、日志记录等功能。

## 功能特点

- 用户登录和身份验证
- 管理员后台界面
- 文件上传功能
- 操作日志记录
- 数据库支持（SQL Server）
- RESTful API 接口

## 安装说明

1. 克隆项目到本地
```bash
git clone [项目地址]
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
- 复制 `.env.example` 文件为 `.env`
- 修改数据库连接等相关配置

## 使用方法

1. 启动服务器
```bash
node server.js
```

2. 访问系统
- 主页：http://localhost:3000
- 管理后台：http://localhost:3000/admin.html
- 登录页面：http://localhost:3000/login.html

## 项目结构

```
├── config/          # 配置文件
├── database/        # 数据库相关文件
├── middleware/      # 中间件
├── public/          # 静态资源文件
├── utils/          # 工具函数
├── logs/           # 日志文件
├── server.js       # 服务器入口文件
└── README.md       # 项目说明文档
```

## 技术栈

- Node.js
- Express.js
- SQL Server
- HTML/CSS/JavaScript
- Bootstrap

## 配置说明

主要配置文件位于 `config` 目录下：
- 数据库配置
- 服务器配置
- 日志配置

## 部署说明

### 开发环境部署

1. 环境要求
   - Node.js >= 14.x
   - SQL Server 2019 或以上
   - Windows/Linux/MacOS 操作系统

2. 数据库配置
   ```bash
   # 在 SQL Server 中创建数据库
   # 执行 database/init.sql 初始化数据库结构
   ```

3. 环境变量配置
   ```bash
   # .env 文件配置示例
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_DATABASE=your_database
   PORT=3000
   ```

4. 启动开发服务器
   ```bash
   # 开发模式启动
   node server.js
   
   # 或使用 nodemon（推荐）
   nodemon server.js
   ```

### 生产环境部署

1. 服务器要求
   - Node.js >= 14.x
   - SQL Server 2019 或以上
   - PM2 进程管理器
   - Nginx（可选，用于反向代理）

2. 安装 PM2
   ```bash
   npm install pm2 -g
   ```

3. 部署步骤
   ```bash
   # 拉取代码
   git pull origin main

   # 安装依赖
   npm install --production

   # 配置环境变量
   cp .env.example .env
   # 修改 .env 文件中的生产环境配置

   # 使用 PM2 启动服务
   pm2 start server.js --name "web-admin-system"
   ```

4. Nginx 配置（可选）
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. PM2 常用命令
   ```bash
   # 查看应用状态
   pm2 status

   # 查看日志
   pm2 logs

   # 重启应用
   pm2 restart web-admin-system

   # 停止应用
   pm2 stop web-admin-system
   ```

6. 系统维护
   - 定期备份数据库
   - 监控服务器资源使用情况
   - 检查日志文件大小并进行归档
   - 定期更新依赖包

## 许可证

该项目采用 MIT 许可证。

## 维护者

[您的名字/团队名称]

## 致谢

感谢所有为这个项目做出贡献的开发者。
