# MyNote

MyNote 是一个 **Markdown 文件优先、Git 驱动** 的个人笔记应用。它使用 Nuxt、Vue 3、Nitro 和 TypeScript 构建，可在浏览器中编辑笔记，也可以直接使用任意文本编辑器修改 `notes` 目录中的 `.md` 文件。

网页中的修改只有在点击“保存并同步”后才会写入磁盘、创建 Git 提交并推送到远端仓库。

> [!WARNING]
> MyNote 没有内置账户系统。不要把未受保护的服务端口直接暴露到公网。生产环境必须配置 Cloudflare Access、带认证的反向代理或其他可靠的访问控制。公开仓库中的笔记、图片及其 Git 历史对所有人可见，不要提交密码、私钥、访问令牌等秘密。

## 功能

- Markdown 编辑、实时预览与阅读模式
- Markdown 工具栏，支持标题、粗体、列表、引用、链接、代码和图片
- 图片选择、截图粘贴和拖拽上传
- 笔记标题与正文搜索
- YAML Frontmatter 标签和标签筛选
- 响应式桌面端与移动端界面
- 浅色、深色和跟随系统主题
- Git 更新历史、提交详情和单篇笔记历史
- 乐观锁检查，避免覆盖外部编辑器产生的修改
- 保存、删除笔记时自动创建 Git 提交并推送
- 删除笔记时同步删除该笔记的专属图片目录
- Docker 部署和健康检查
- systemd 定时拉取远端更新，并按需重建容器

## 技术栈

- [Nuxt](https://nuxt.com/) 4
- [Vue](https://vuejs.org/) 3
- [Nitro](https://nitro.build/)
- TypeScript
- [Marked](https://marked.js.org/) 和 DOMPurify
- Git、Docker Compose、systemd

## 工作方式

```text
浏览器或本地编辑器
        │
        ▼
notes/*.md 与 *.assets/
        │
        ▼
Git commit → Git push → 远端仓库
                           │
                           ▼
                  服务器定时拉取更新
```

笔记始终是普通 Markdown 文件，不依赖专用数据库。Compose 会把宿主机仓库挂载到容器的 `/repository`，因此笔记、图片和 Git 历史不会因容器重建而丢失。

## 项目结构

```text
MyNote/
├── app/                    # Vue 页面、组件和样式
├── server/                 # Nitro API、文件操作和 Git 同步
├── shared/                 # 前后端共享类型与工具
├── notes/                  # Markdown 笔记与图片资源
├── public/                 # Logo 和站点图标
├── docker/                 # 容器入口脚本
├── deploy/                 # systemd 自动同步脚本
├── compose.yml             # 基础 Docker Compose 配置
├── compose.github.yml      # GitHub SSH Secret 扩展配置
└── Dockerfile
```

## 笔记格式

标题默认读取第一个一级标题，标签保存在 YAML Frontmatter 中：

```md
---
tags: [Nuxt, Docker]
---

# 部署记录

这里是正文。
```

网页上传的图片保存在与笔记同名的专属目录中：

```text
notes/
├── 部署记录.md
└── 部署记录.assets/
    └── 20260921131859-ab12cd34.webp
```

Markdown 使用相对路径引用图片，所以在 VS Code、Obsidian 等外部编辑器中也可以正常显示：

```md
![部署截图](./部署记录.assets/20260921131859-ab12cd34.webp)
```

## 本地开发

### 环境要求

- Node.js 22 或更高版本
- npm
- Git

### 启动项目

```bash
git clone https://github.com/YOUR_USERNAME/MyNote.git
cd MyNote
npm ci
cp .env.example .env
npm run dev
```

浏览器访问 `http://localhost:3000`。

默认读取项目中的 `notes` 目录。如需使用其他目录，修改 `.env`：

```dotenv
NUXT_NOTES_DIRECTORY=./notes
```

常用命令：

```bash
npm run dev        # 启动开发服务器
npm run typecheck  # TypeScript 检查
npm run build      # 生产构建
npm run preview    # 预览生产构建
```

## 保存与 Git 同步

点击“保存并同步”后，服务端会依次执行：

1. 比较笔记版本，检查文件是否被其他程序修改；
2. 原子写入 Markdown 文件，并保存本次新增的图片；
3. 将当前笔记及其专属图片目录加入 Git 暂存区；
4. 创建 Git 提交；
5. 如果仓库存在远端，则运行 `git push`。

删除笔记时，其同名 `.assets` 目录会一起删除并写入同一次 Git 提交。文件写入成功但 Git 提交或推送失败时，应用会保留本地修改并在界面中显示错误原因。

## Docker 快速部署

适合只在服务器本机使用，或者自行配置安全入口的场景。

### 1. 准备环境

服务器需要：

- Linux
- Git
- Docker Engine
- Docker Compose Plugin（可以运行 `docker compose version`）

### 2. 克隆并配置

```bash
sudo mkdir -p /opt/MyNote
sudo chown "$USER":"$USER" /opt/MyNote
git clone https://github.com/YOUR_USERNAME/MyNote.git /opt/MyNote
cd /opt/MyNote
cp .env.docker.example .env
```

编辑 `.env`：

```dotenv
MYNOTE_BIND_ADDRESS=127.0.0.1
MYNOTE_PORT=3100
MYNOTE_APP_NAME=MyNote
GIT_USER_NAME=MyNote
GIT_USER_EMAIL=mynote@example.com
GITHUB_DEPLOY_KEY_PATH=/opt/MyNote/docker-secrets/github_deploy_key
```

### 3. 构建并启动

```bash
docker compose up -d --build
```

### 4. 检查运行状态

```bash
docker compose ps
docker compose logs --tail=100 mynote
curl http://127.0.0.1:3100/api/notes
```

默认只监听 `127.0.0.1:3100`，不会直接接受公网连接。不要为了方便把 `MYNOTE_BIND_ADDRESS` 改为 `0.0.0.0`，除非服务器前方已经有完善的防火墙和身份认证。

停止或重启：

```bash
docker compose stop
docker compose restart
```

## 配置 GitHub 自动推送

如果需要在网页保存后自动推送到 GitHub，推荐为这个仓库创建一把独立的、具有写权限的 Deploy Key。不要使用能够访问整个 GitHub 账户的个人 SSH Key。

### 1. 创建仓库专用密钥

```bash
cd /opt/MyNote
mkdir -p docker-secrets
ssh-keygen -t ed25519 -C "mynote-deploy" -f docker-secrets/github_deploy_key
chmod 600 docker-secrets/github_deploy_key
```

该命令会生成：

```text
docker-secrets/github_deploy_key      # 私钥，不要复制或提交
docker-secrets/github_deploy_key.pub  # 公钥，添加到 GitHub
```

`docker-secrets/` 已被 `.gitignore` 和 `.dockerignore` 排除。

### 2. 添加 GitHub Deploy Key

打开 GitHub 仓库：

```text
Settings → Deploy keys → Add deploy key
```

填写名称，粘贴以下命令输出的公钥，并勾选 **Allow write access**：

```bash
cat /opt/MyNote/docker-secrets/github_deploy_key.pub
```

### 3. 改用 SSH 远端

```bash
cd /opt/MyNote
git remote set-url origin git@github.com:YOUR_USERNAME/MyNote.git
ssh -i /opt/MyNote/docker-secrets/github_deploy_key -o IdentitiesOnly=yes -T git@github.com
```

看到“successfully authenticated”表示密钥可用。GitHub 不提供 Shell 登录，因此后半句提示没有 Shell access 是正常现象。

### 4. 配置密钥路径

确认 `.env` 中使用绝对路径，不能使用 `~`：

```dotenv
GITHUB_DEPLOY_KEY_PATH=/opt/MyNote/docker-secrets/github_deploy_key
```

### 5. 使用 GitHub Compose 扩展启动

```bash
docker compose -f compose.yml -f compose.github.yml up -d --build
```

`compose.github.yml` 会通过 Docker Secret 以只读方式把私钥挂载到容器中，并为 Git 命令配置该密钥。

## systemd 自动拉取与部署

项目提供了安装脚本，可每分钟检查一次 `origin/main`：

- 只有 `notes/` 变化：仓库快进后直接生效，不重建容器；
- 应用源码或部署配置变化：自动重新构建并启动容器；
- 工作区存在未提交修改或分支发生分叉：停止同步，避免覆盖数据；
- 构建失败：不会更新已部署版本标记，下次运行会继续重试。

### 安装前提

1. 项目已经克隆到服务器；
2. `origin` 指向需要同步的 GitHub 仓库；
3. Deploy Key 已添加到 GitHub 并允许写入；
4. 私钥位于 `docker-secrets/github_deploy_key`，或者 `.env` 已配置其他绝对路径；
5. 已安装 `docker`、`git`、`flock` 和 `systemctl`。

### 一键安装

```bash
cd /opt/MyNote
sudo ./deploy/install-systemd-sync.sh
```

安装器会：

1. 在缺失时创建 `.env`；
2. 验证 Deploy Key 路径和 Docker Compose 配置；
3. 首次构建并启动 MyNote；
4. 安装 `mynote-sync.service` 和 `mynote-sync.timer`；
5. 每 60 秒检查一次 GitHub 更新。

### 管理定时同步

```bash
# 查看定时器
systemctl status mynote-sync.timer
systemctl list-timers mynote-sync.timer

# 立即执行一次同步
systemctl start mynote-sync.service

# 查看最近日志
journalctl -u mynote-sync.service -n 100 --no-pager

# 持续查看日志
journalctl -u mynote-sync.service -f

# 暂停和恢复
systemctl stop mynote-sync.timer
systemctl start mynote-sync.timer
```

## 从本地编辑器同步到服务器

本地修改源码或 `notes` 后：

```bash
git add -A
git commit -m "Update notes"
git push origin main
```

服务器上的 systemd timer 会在下一次检查时拉取更新。笔记与图片变更会直接出现在挂载目录中；源码变更会触发 Docker 重建。

网页端保存也会创建并推送提交。如果本地和网页端同时产生提交，后推送的一方可能因为远端已有新提交而失败。建议避免同时编辑；发生冲突时，在对应仓库中先检查修改，再执行：

```bash
git pull --rebase origin main
git push origin main
```

不要在未确认工作区内容前运行会丢弃修改的 Git 命令。

## 安全访问方式

### SSH 隧道

不配置公网域名时，可以从本机建立 SSH 隧道：

```bash
ssh -L 3100:127.0.0.1:3100 USER@SERVER_IP
```

随后访问 `http://127.0.0.1:3100`。

### Cloudflare Tunnel 与 Access

推荐流程：

1. 在 Cloudflare Zero Trust 中创建 Self-hosted Application；
2. 为应用域名设置只允许本人邮箱或身份组访问的 Allow Policy；
3. 启用 MFA，并避免 `Everyone` 或 `Bypass` 规则；
4. 创建 Cloudflare Tunnel 并在服务器安装 `cloudflared`；
5. 将 Public Hostname 的 Service 指向 `http://127.0.0.1:3100`；
6. 确认首页和 `/api/*` 都受到同一个 Access Application 保护；
7. 保持 3100 端口只绑定 `127.0.0.1`，不要再建立绕过 Access 的公网入口。

MyNote 自身不会验证用户身份，Cloudflare Access 或其他上游认证是生产部署的安全边界。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NUXT_NOTES_DIRECTORY` | `./notes` | 非 Docker 环境中的笔记目录 |
| `MYNOTE_BIND_ADDRESS` | `127.0.0.1` | Docker 在宿主机监听的地址 |
| `MYNOTE_PORT` | `3100` | Docker 在宿主机监听的端口 |
| `MYNOTE_APP_NAME` | `MyNote` | 页面中显示的应用名称 |
| `GIT_USER_NAME` | `MyNote` | 自动提交使用的 Git 用户名 |
| `GIT_USER_EMAIL` | `mynote@localhost` | 自动提交使用的 Git 邮箱 |
| `GITHUB_DEPLOY_KEY_PATH` | `./docker-secrets/github_deploy_key` | GitHub Deploy Key 私钥路径 |
| `MYNOTE_REPOSITORY` | 安装时写入 | systemd 同步使用的仓库路径 |

容器内部固定使用：

```text
NUXT_NOTES_DIRECTORY=/repository/notes
MYNOTE_REPOSITORY_DIRECTORY=/repository
NITRO_PORT=3000
```

通常不需要修改这些容器内部变量。

## 备份与恢复

GitHub 远端是主要的异地备份，但尚未成功推送的提交只存在于服务器本地。建议定期检查：

```bash
cd /opt/MyNote
git status
git log --oneline -5
git fetch origin
git status -sb
```

恢复到新服务器时，只需重新克隆仓库、配置 Deploy Key 和 `.env`，然后重新运行安装脚本。

删除笔记后，旧内容仍可能存在于 Git 历史。若笔记中误提交了密码、Token 或私钥，应先撤销并轮换凭据，再按 GitHub 的敏感数据清理流程重写历史。

## 常见问题

### 3100 端口已被占用

修改 `.env`：

```dotenv
MYNOTE_PORT=3200
```

然后重新启动：

```bash
docker compose -f compose.yml -f compose.github.yml up -d
```

### 容器无法读取 SSH Key

检查路径和权限：

```bash
grep '^GITHUB_DEPLOY_KEY_PATH=' .env
ls -l /opt/MyNote/docker-secrets/github_deploy_key
chmod 600 /opt/MyNote/docker-secrets/github_deploy_key
```

路径必须是宿主机上的绝对路径，并且文件必须存在。

### 网页保存成功但 Git 推送失败

```bash
cd /opt/MyNote
git status -sb
git log --oneline --decorate -5
git remote -v
```

如果远端存在新的提交，先确认没有未提交修改，再使用 `git pull --rebase origin main`。如果 SSH 验证失败，重新检查 Deploy Key 和远端地址。

### systemd 没有自动更新

```bash
systemctl status mynote-sync.timer
systemctl status mynote-sync.service
journalctl -u mynote-sync.service -n 100 --no-pager
```

同步脚本会主动拒绝覆盖脏工作区或分叉分支，日志中会说明停止原因。

### 查看容器健康状态

```bash
docker inspect --format '{{json .State.Health}}' mynote
docker compose logs --tail=100 mynote
curl http://127.0.0.1:3100/api/notes
```

## 参与贡献

欢迎提交 Issue 和 Pull Request。提交前请至少运行：

```bash
npm ci
npm run typecheck
npm run build
```

请不要在示例、测试文件或提交历史中包含真实笔记、服务器地址、密钥或个人数据。

## License

[MIT](./LICENSE)
