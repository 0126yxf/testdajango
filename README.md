# Web管理系统

这是一个基于 Node.js 的 Web 管理系统，提供用户管理、日志记录等功能。主要用于文件管理和系统操作日志记录。

## 功能特点

- 用户登录和身份验证系统
- 管理员后台管理界面
- 文件上传和管理功能
- 系统操作日志记录和查看
- SQL Server 数据库支持
- RESTful API 接口设计

## 环境要求

- Node.js >= 14.x
- SQL Server 2019 或以上
- Windows 操作系统
- 现代浏览器（Chrome、Firefox、Edge等）

## 安装说明

1. 克隆项目到本地
```bash
git clone https://github.com/0126yxf/testdajango.git
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
- 创建 `.env` 文件
- 配置以下环境变量：
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database
PORT=3000
```

## 数据库配置

1. 在 SQL Server 中创建数据库
2. 执行 `database/init.sql` 初始化数据库结构
3. 在 `config/database.js` 中配置数据库连接信息

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
├── config/          # 配置文件目录
│   └── database.js  # 数据库配置
├── database/        # 数据库相关文件
│   ├── init.sql     # 数据库初始化脚本
│   └── init-sqlserver.sql
├── middleware/      # 中间件
│   └── operationLog.js  # 操作日志中间件
├── public/          # 静态资源文件
│   ├── admin.html   # 管理页面
│   ├── login.html   # 登录页面
│   └── styles/      # 样式文件
├── utils/          # 工具函数
│   └── logger.js   # 日志工具
├── logs/           # 日志文件目录
├── server.js       # 服务器入口文件
└── README.md       # 项目说明文档
```

## 主要功能说明

1. 用户管理
   - 用户登录/注销
   - 权限控制
   - 用户信息管理

2. 文件管理
   - 文件上传
   - 文件列表查看
   - 文件下载

3. 日志系统
   - 操作日志记录
   - 日志查询
   - 日志导出

## 部署说明

### 开发环境部署

1. 按照安装说明完成基础配置
2. 使用 `nodemon` 启动服务（支持热重载）：
```bash
nodemon server.js
```

### 生产环境部署

1. 安装 PM2
```bash
npm install pm2 -g
```

2. 使用 PM2 启动服务
```bash
pm2 start server.js --name "web-admin-system"
```

3. PM2 常用命令
```bash
pm2 status              # 查看应用状态
pm2 logs               # 查看日志
pm2 restart web-admin-system  # 重启应用
pm2 stop web-admin-system    # 停止应用
```

## 维护者

- 作者：杨雪飞
- 邮箱：1160360825@qq.com

## 许可证

该项目采用 MIT 许可证。


