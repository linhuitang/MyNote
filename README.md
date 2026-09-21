# MyNote

MyNote 是一个 Markdown 文件优先的个人笔记应用，使用精简的 Nuxt（Vue 3 + Vite + Nitro）和 TypeScript 构建。

项目以 MIT License 开源。仓库中的 `notes` 目录默认保持为空，笔记内容由使用者自行创建和管理。

> MyNote 本身不提供账户系统。部署到网络环境时，请使用 Cloudflare Access、带认证的反向代理或其他可靠的访问控制。不要把密码、私钥、访问令牌等秘密直接提交到 Git；删除当前文件不会自动抹除已经产生的 Git 历史。

## 开发

```bash
npm install
npm run dev
```

默认读取项目中的 `notes` 目录。复制 `.env.example` 为 `.env` 后，可以使用 `NUXT_NOTES_DIRECTORY` 指向另一个 Markdown 目录。

## 保存与 Git 同步

网页编辑内容不会自动写入文件。点击“保存并同步”后，服务端会：

1. 检查文件是否被外部程序修改；
2. 原子写入 Markdown 文件；
3. 提交当前笔记文件；
4. 如果仓库配置了远端，则运行 `git push`。

文件成功写入但 Git 失败时，接口会保留本地文件，并把具体状态返回给界面。

## Docker 部署

项目提供了多阶段构建镜像，最终镜像只包含 Nuxt 的生产输出、Node.js、Git 和 SSH 客户端。

先准备部署环境变量：

```bash
cp .env.docker.example .env
```

然后构建并启动：

```bash
docker compose up -d --build
```

默认仅监听服务器本机的 `127.0.0.1:3100`。可以在 `.env` 中修改监听地址、端口、应用名称以及 Git 提交身份。应用当前没有登录鉴权，不建议将端口直接暴露到公网；远程使用时可以通过 SSH 隧道访问，或在前面配置带身份认证的 HTTPS 反向代理。

通过 SSH 隧道安全访问：

```bash
ssh -L 3100:127.0.0.1:3100 服务器用户@服务器地址
```

随后在本机打开 `http://127.0.0.1:3100`。

Compose 会把当前仓库挂载到容器的 `/repository`，应用读取 `/repository/notes`。因此网页保存后生成的 Markdown 文件、Git 提交和仓库历史都会持久化在宿主机，而不会随着容器重建丢失。

### 连接 GitHub

推荐使用一个具有写权限的 GitHub Deploy Key，让容器只能访问这个笔记仓库：

1. 如果服务器还没有用于这个仓库的密钥，生成一把专用密钥：

   ```bash
   mkdir -p docker-secrets
   ssh-keygen -t ed25519 -C "mynote-docker" -f docker-secrets/github_deploy_key
   chmod 600 docker-secrets/github_deploy_key
   ```

2. 在 GitHub 仓库的 **Settings → Deploy keys → Add deploy key** 中添加公钥内容，并勾选 **Allow write access**。
3. 在 `.env` 中配置服务器私钥的绝对路径（不能使用 `~`）：

   ```dotenv
   GITHUB_DEPLOY_KEY_PATH=/home/你的服务器用户/.ssh/id_ed25519
   ```

   如果不配置，默认读取项目下的 `docker-secrets/github_deploy_key`。
4. 确保当前仓库使用 SSH 远端地址：

   ```bash
   git remote add origin git@github.com:你的用户名/你的仓库.git
   git push -u origin main
   ```

   如果已经存在 `origin`，使用 `git remote set-url origin git@github.com:你的用户名/你的仓库.git`。

5. 使用 GitHub Compose 扩展启动：

   ```bash
   docker compose -f compose.yml -f compose.github.yml up -d --build
   ```

私钥目录已加入 `.gitignore`，不会进入 Git 仓库或 Docker 镜像。网页中的“保存并同步”会依次写入文件、创建 Git 提交并推送到 GitHub。

### 更新应用

服务器可以安装 systemd 定时同步。安装器会完成首次构建，并每分钟检查一次 `origin/main`：只更新 `notes` 时直接生效，应用代码变化时自动重建容器。

```bash
./deploy/install-systemd-sync.sh
```

安装后常用命令：

```bash
systemctl list-timers mynote-sync.timer
systemctl start mynote-sync.service
journalctl -u mynote-sync.service -n 100 --no-pager
```

## License

[MIT](./LICENSE)
