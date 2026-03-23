# Deployment Runbook — artembratchenko.com

## Prerequisites

- Hetzner VPS with Ubuntu 22.04+ (or Debian 12+)
- DNS A record for `artembratchenko.com` pointing to VPS IP
- SSH access to VPS as root or sudo user

## 1. Install Docker Engine

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

## 2. Install Certbot

```bash
apt update && apt install -y certbot
```

## 3. Bootstrap SSL Certificate

**IMPORTANT:** Run certbot BEFORE starting Docker. Certbot standalone needs port 80 free.

```bash
# Test with staging first (avoids rate limits)
certbot certonly --standalone --staging -d artembratchenko.com

# If staging succeeds, issue real certificate
certbot certonly --standalone -d artembratchenko.com

# Verify certificate files exist
ls /etc/letsencrypt/live/artembratchenko.com/
# Expected: fullchain.pem  privkey.pem  cert.pem  chain.pem
```

## 4. Clone Repository and Configure

```bash
mkdir -p /opt/portfolio
cd /opt/portfolio
git clone git@github.com:artembruh/portfolio.git .

# Create .env from template
cp .env.example .env
# Edit .env with production RPC URLs
nano .env
```

## 5. First Deploy

```bash
cd /opt/portfolio
docker compose up -d --build
```

Verify:
```bash
# Check services are running
docker compose ps

# Check backend health
docker compose exec backend curl -f http://localhost:3000/api/health

# Check HTTPS from outside
curl -I https://artembratchenko.com
```

## 6. SSL Certificate Renewal (Cron)

Certbot standalone requires port 80 free, so Nginx must be stopped during renewal.

Add to root crontab (`crontab -e`):

```
0 0,12 * * * docker compose -f /opt/portfolio/docker-compose.yml stop nginx && certbot renew --quiet && docker compose -f /opt/portfolio/docker-compose.yml start nginx
```

This runs twice daily (Let's Encrypt recommends this frequency). Renewal only happens when certs are within 30 days of expiry.

## 7. Updating the Application

```bash
cd /opt/portfolio
git pull origin main
docker compose up -d --build
```

## Troubleshooting

### Backend not starting
```bash
docker compose logs backend
```
Common cause: missing or invalid env vars in .env

### Nginx returning 502
```bash
docker compose ps
# Check if backend is healthy
docker compose logs nginx
```
Common cause: backend not yet healthy (wait for start_period)

### WebSocket not connecting
```bash
# Test Socket.IO handshake through Nginx
curl "https://artembratchenko.com/socket.io/?EIO=4&transport=polling"
```
Common cause: Nginx not proxying /socket.io/ path correctly

### SSL certificate expired
```bash
certbot certificates
# Manual renewal
docker compose stop nginx
certbot renew
docker compose start nginx
```

## Notes

- CORS is intentionally disabled — Nginx handles same-origin routing so cross-origin requests are not needed.
- Backend port 3000 is NOT exposed on the host — only reachable via Nginx through Docker internal network.
- All RPC URLs are loaded from .env via Docker `env_file` directive.
