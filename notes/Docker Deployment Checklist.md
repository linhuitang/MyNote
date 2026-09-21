---
tags: [Docker, Deployment]
---

# Docker Deployment Checklist

Use this sample checklist when deploying MyNote to a personal server.

## Before deployment

- [ ] Docker Engine and the Docker Compose plugin are installed
- [ ] The repository is cloned into `/opt/MyNote`
- [ ] `.env.docker.example` has been copied to `.env`
- [ ] Port `3100` is available, or `MYNOTE_PORT` has been changed
- [ ] A repository-specific GitHub Deploy Key has been created

## Start the application

```bash
docker compose -f compose.yml -f compose.github.yml up -d --build
```

Check that the container is healthy:

```bash
docker compose ps
docker compose logs --tail=100 mynote
curl http://127.0.0.1:3100/api/notes
```

## Secure access

MyNote does not include its own account system. Keep the application bound to `127.0.0.1` and access it through one of these options:

- An SSH tunnel for private, occasional access
- Cloudflare Tunnel protected by Cloudflare Access
- An authenticated reverse proxy

> Never expose an unprotected MyNote port directly to the public internet.

