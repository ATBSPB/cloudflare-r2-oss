# Cloudflare R2 OSS

基于 Cloudflare Workers 的轻量级 R2 对象存储文件管理界面，整个应用运行在 Cloudflare 边缘网络上。

演示站点：[https://disk.atbspb.online](https://disk.atbspb.online)

## 功能

- 文件浏览与面包屑导航
- 文件上传（支持图片、视频、拍照）
- 大文件分片上传（超过 100MB 自动分片）
- 下载、重命名、移动、删除文件和文件夹
- 拖拽上传
- 图片/视频缩略图自动生成与缓存
- 写操作通过 Cloudflare Turnstile 验证保护
- 通过子域名路由支持多 Bucket

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Cloudflare Workers |
| 后端框架 | Hono |
| 存储 | Cloudflare R2 |
| 前端框架 | React 18 + Vite |
| 样式 | Tailwind CSS |
| 人机验证 | Cloudflare Turnstile |

## 项目结构

```
.
├── client/               # 前端（React）
│   └── src/
│       ├── components/   # UI 组件
│       ├── hooks/        # 自定义 Hooks
│       └── utils/        # API 客户端、格式化、缩略图工具
├── src/                  # 后端（Hono on Workers）
│   ├── middleware/       # Turnstile 验证中间件
│   ├── routes/           # API 路由（files、buckets、raw）
│   └── utils/            # S3 签名、Bucket 路径解析
├── static/               # 构建后的前端资源（由 Workers 提供服务）
├── wrangler.toml         # Cloudflare Workers 配置
└── vite.config.ts        # Vite 构建配置
```

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/children/*` | 列出文件和文件夹 |
| PUT | `/api/items/*` | 上传文件 / 重命名 / 移动 |
| POST | `/api/items/*?uploads` | 初始化分片上传 |
| PUT | `/api/items/*?partNumber=&uploadId=` | 上传分片 |
| POST | `/api/items/*?uploadId=` | 完成分片上传 |
| DELETE | `/api/items/*` | 删除文件 |
| GET | `/api/buckets` | 列出所有 Bucket（需要 S3 凭证） |
| GET | `/raw/*` | 通过 R2 公开 URL 提供文件内容 |

## 前置要求

- Node.js 18+
- 已开启 R2 的 Cloudflare 账户
- Cloudflare Turnstile 站点密钥和密钥（用于保护写操作）

## 配置

编辑 `wrangler.toml`：

```toml
name = "cloudflare-r2-oss"
main = "src/index.ts"
compatibility_date = "2024-09-25"

[assets]
directory = "./static"
binding = "ASSETS"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "your-bucket-name"

[vars]
PUBURL = "https://pub-xxx.r2.dev"   # R2 公开访问 URL
TURNSTILE_SECRET = "0x..."          # Cloudflare Turnstile 密钥
```

如果需要多 Bucket 自动发现功能，需通过 [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) 添加 S3 API 凭证：

```bash
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY
```

## 开发

```bash
npm install
npm run dev
```

该命令会同时启动 Worker 开发服务器和 Vite 前端开发服务器。

```bash
npm run build          # 构建前端和 Worker
npm run build:client   # 仅构建前端
npm run typecheck      # TypeScript 类型检查
npm run deploy         # 构建并部署到 Cloudflare
```

## 部署

```bash
npm run deploy
```

该命令会将前端构建产物输出到 `static/`，编译 Worker 代码，然后通过 Wrangler 部署到 Cloudflare。
