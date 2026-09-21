#!/bin/sh
set -eu

repository_directory="${MYNOTE_REPOSITORY_DIRECTORY:-/repository}"

git config --global --add safe.directory "$repository_directory"

if [ -n "${GIT_USER_NAME:-}" ]; then
  git config --global user.name "$GIT_USER_NAME"
fi

if [ -n "${GIT_USER_EMAIL:-}" ]; then
  git config --global user.email "$GIT_USER_EMAIL"
fi

exec "$@"
