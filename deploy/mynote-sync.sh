#!/bin/sh
set -eu

repository="${MYNOTE_REPOSITORY:-/opt/MyNote}"
state_directory="${MYNOTE_SYNC_STATE_DIRECTORY:-/var/lib/mynote-sync}"
revision_file="$state_directory/deployed-revision"
lock_file="${MYNOTE_SYNC_LOCK_FILE:-/run/lock/mynote-sync.lock}"

mkdir -p "$state_directory"

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "另一个 MyNote 同步任务正在运行，本次跳过"
  exit 0
fi

cd "$repository"

if [ -f "$repository/.env" ]; then
  private_key="$(sed -n 's/^GITHUB_DEPLOY_KEY_PATH=//p' "$repository/.env" | tail -n 1)"
  if [ -n "$private_key" ] && [ -f "$private_key" ]; then
    export GIT_SSH_COMMAND="ssh -i $private_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$state_directory/github_known_hosts"
  fi
fi

echo "正在检查 origin/main..."
git fetch --prune origin main

local_revision="$(git rev-parse HEAD)"
remote_revision="$(git rev-parse origin/main)"
deployed_revision=""

if [ -f "$revision_file" ]; then
  deployed_revision="$(cat "$revision_file")"
fi

if [ "$local_revision" != "$remote_revision" ]; then
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "服务器仓库存在未提交修改，已停止自动同步"
    exit 1
  fi

  if ! git merge-base --is-ancestor "$local_revision" "$remote_revision"; then
    echo "服务器 main 与 origin/main 已分叉，已停止自动同步"
    exit 1
  fi

  echo "正在快进到 $remote_revision..."
  git merge --ff-only "$remote_revision"
fi

if [ "$deployed_revision" = "$remote_revision" ]; then
  echo "MyNote 已经是最新版本"
  exit 0
fi

requires_rebuild=1
if [ -n "$deployed_revision" ] && git cat-file -e "$deployed_revision^{commit}" 2>/dev/null; then
  changed_files="$(git diff --name-only "$deployed_revision" "$remote_revision")"
  non_note_files="$(printf '%s\n' "$changed_files" | sed '/^notes\//d; /^$/d')"

  echo "本次更新文件："
  printf '%s\n' "$changed_files"

  if [ -z "$non_note_files" ]; then
    requires_rebuild=0
  fi
fi

if [ "$requires_rebuild" -eq 1 ]; then
  echo "检测到应用代码或部署配置变化，正在重新构建容器..."
  read_only="$(sed -n 's/^MYNOTE_READ_ONLY=//p' "$repository/.env" 2>/dev/null | tail -n 1 | tr '[:upper:]' '[:lower:]')"
  if [ "$read_only" = "true" ] || [ "$read_only" = "1" ] || [ "$read_only" = "yes" ] || [ "$read_only" = "on" ]; then
    docker compose -f compose.yml -f compose.demo.yml up -d --build --remove-orphans
  else
    docker compose -f compose.yml -f compose.github.yml up -d --build --remove-orphans
  fi
else
  echo "只有 notes 目录发生变化，无需重建容器"
fi

temporary_revision_file="$revision_file.tmp"
printf '%s\n' "$remote_revision" > "$temporary_revision_file"
mv "$temporary_revision_file" "$revision_file"

echo "MyNote 已同步到 $remote_revision"
