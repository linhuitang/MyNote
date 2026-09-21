#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 root 用户运行此安装器"
  exit 1
fi

script_directory="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repository="$(dirname "$script_directory")"

for command in docker git flock systemctl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "缺少必需命令：$command"
    exit 1
  fi
done

if [ ! -d "$repository/.git" ]; then
  echo "未找到 Git 仓库：$repository"
  exit 1
fi

if [ ! -f "$repository/.env" ]; then
  git_name="$(git config --global user.name 2>/dev/null || true)"
  git_email="$(git config --global user.email 2>/dev/null || true)"
  [ -n "$git_name" ] || git_name="MyNote"
  [ -n "$git_email" ] || git_email="mynote@localhost"

  cat > "$repository/.env" <<EOF
MYNOTE_BIND_ADDRESS=127.0.0.1
MYNOTE_PORT=3100
MYNOTE_APP_NAME=MyNote
MYNOTE_MODE=notes
MYNOTE_BLOG_DESCRIPTION=A Git-powered Markdown blog.
MYNOTE_SITE_URL=
MYNOTE_READ_ONLY=false
GIT_USER_NAME=$git_name
GIT_USER_EMAIL=$git_email
GITHUB_DEPLOY_KEY_PATH=$repository/docker-secrets/github_deploy_key
EOF
  chmod 600 "$repository/.env"
  echo "已创建 $repository/.env"
else
  echo "保留现有 $repository/.env"
fi

if grep -q '^MYNOTE_PORT=3000$' "$repository/.env"; then
  sed -i 's/^MYNOTE_PORT=3000$/MYNOTE_PORT=3100/' "$repository/.env"
  echo "已将宿主机端口从 3000 调整为 3100"
elif ! grep -q '^MYNOTE_PORT=' "$repository/.env"; then
  printf '%s\n' 'MYNOTE_PORT=3100' >> "$repository/.env"
fi

if ! grep -q '^GITHUB_DEPLOY_KEY_PATH=' "$repository/.env"; then
  printf 'GITHUB_DEPLOY_KEY_PATH=%s\n' "$repository/docker-secrets/github_deploy_key" >> "$repository/.env"
fi

read_only="$(sed -n 's/^MYNOTE_READ_ONLY=//p' "$repository/.env" | tail -n 1 | tr '[:upper:]' '[:lower:]')"
app_mode="$(sed -n 's/^MYNOTE_MODE=//p' "$repository/.env" | tail -n 1 | tr '[:upper:]' '[:lower:]')"
protected_mode=0
if [ "$read_only" = "true" ] || [ "$read_only" = "1" ] || [ "$read_only" = "yes" ] || [ "$read_only" = "on" ] || [ "$app_mode" = "blog" ]; then
  protected_mode=1
fi

echo "正在验证 Docker Compose 配置..."
cd "$repository"
if [ "$protected_mode" -eq 1 ]; then
  docker compose -f compose.yml -f compose.demo.yml config >/dev/null
  echo "将以只读演示模式部署，不会向容器挂载 GitHub 私钥"
else
  private_key="$(sed -n 's/^GITHUB_DEPLOY_KEY_PATH=//p' "$repository/.env" | tail -n 1)"
  if [ -z "$private_key" ] || [ ! -f "$private_key" ]; then
    echo "GITHUB_DEPLOY_KEY_PATH 指向的私钥不存在：${private_key:-未配置}"
    exit 1
  fi
  docker compose -f compose.yml -f compose.github.yml config >/dev/null
fi

echo "正在构建并启动 MyNote..."
if [ "$protected_mode" -eq 1 ]; then
  docker compose -f compose.yml -f compose.demo.yml up -d --build --remove-orphans
else
  docker compose -f compose.yml -f compose.github.yml up -d --build --remove-orphans
fi

install -m 0644 "$repository/deploy/systemd/mynote-sync.service" /etc/systemd/system/mynote-sync.service
install -m 0644 "$repository/deploy/systemd/mynote-sync.timer" /etc/systemd/system/mynote-sync.timer

cat > /etc/default/mynote-sync <<EOF
MYNOTE_REPOSITORY="$repository"
EOF

mkdir -p /var/lib/mynote-sync
git rev-parse HEAD > /var/lib/mynote-sync/deployed-revision

systemctl daemon-reload
systemctl enable --now mynote-sync.timer

host_port="$(sed -n 's/^MYNOTE_PORT=//p' "$repository/.env" | tail -n 1)"
host_port="${host_port:-3100}"

echo
echo "MyNote 部署和自动同步已完成"
echo "访问地址（服务器本机）：http://127.0.0.1:$host_port"
echo "查看定时器：systemctl list-timers mynote-sync.timer"
echo "查看同步日志：journalctl -u mynote-sync.service -n 100 --no-pager"
