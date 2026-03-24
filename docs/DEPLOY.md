# Deployment Runbook

Complete walkthrough for deploying this application to a Linux VPS with Docker, Nginx reverse proxy, HTTPS, and firewall.

## Prerequisites

- Linux VPS (Ubuntu 22.04+ / Debian 12+) with root or sudo access
- Domain name with DNS managed (e.g., Hetzner DNS, Cloudflare)
- SSH key pair on your local machine

## 1. SSH Access

### Generate SSH key (if needed)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/vps_key -C "your-email@example.com"
```

### Copy public key to server

From the VPS web console (Hetzner Console, etc.):

```bash
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAA...your-public-key..." >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Verify SSH access from local machine

```bash
ssh -i ~/.ssh/vps_key root@<VPS_IP>
```

## 2. DNS Configuration

Add A records pointing to your VPS IP:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `<VPS_IP>` |
| A | `www` | `<VPS_IP>` |

Verify propagation (may take up to 1 hour):

```bash
nslookup yourdomain.com 8.8.8.8
nslookup www.yourdomain.com 8.8.8.8
```

## 3. Firewall

Configure before installing services to minimize exposure window.

### 3a. Hetzner Cloud Firewall (Primary)

Create a firewall in the Hetzner Cloud Console (**Firewalls > Create Firewall**) or via CLI:

```bash
# Install hcloud CLI (macOS)
brew install hcloud

# Create firewall
hcloud firewall create --name portfolio-fw

# Allow HTTP (any source)
hcloud firewall add-rule portfolio-fw --direction in --protocol tcp --port 80 \
  --source-ips 0.0.0.0/0 --source-ips ::/0 --description "HTTP — redirect + certbot"

# Allow HTTPS (any source)
hcloud firewall add-rule portfolio-fw --direction in --protocol tcp --port 443 \
  --source-ips 0.0.0.0/0 --source-ips ::/0 --description "HTTPS"

# Allow SSH (home IP only)
hcloud firewall add-rule portfolio-fw --direction in --protocol tcp --port 22 \
  --source-ips <YOUR_HOME_IP>/32 --description "SSH — home"

# Attach to server
hcloud firewall apply-to-resource portfolio-fw --type server --server <SERVER_NAME>

# Verify
hcloud firewall describe portfolio-fw
```

> **Tip:** If your home IP changes, update the SSH rule via Console or CLI before connecting.

### 3b. UFW — Machine-Level Fallback

Defence-in-depth: UFW stays as a second layer in case the cloud firewall is misconfigured or detached.

```bash
# Defaults — block all incoming, allow all outgoing
ufw default deny incoming
ufw default allow outgoing

# Allow only required ports
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP — redirect + certbot'
ufw allow 443/tcp comment 'HTTPS'

# Enable
echo "y" | ufw enable

# Verify
ufw status verbose
```

## 4. Install Docker Engine

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

## 5. Install Certbot

```bash
apt update && apt install -y certbot
```

## 6. Bootstrap SSL Certificate

**IMPORTANT:** Run certbot BEFORE starting Docker. Certbot standalone needs port 80 free.

```bash
# Test with staging first (avoids Let's Encrypt rate limits)
certbot certonly --standalone --staging \
  -d yourdomain.com -d www.yourdomain.com \
  --non-interactive --agree-tos -m your-email@example.com

# If staging succeeds, issue real certificate
certbot certonly --standalone \
  -d yourdomain.com -d www.yourdomain.com \
  --non-interactive --agree-tos -m your-email@example.com --force-renewal

# Verify certificate files exist
ls /etc/letsencrypt/live/yourdomain.com/
# Expected: fullchain.pem  privkey.pem  cert.pem  chain.pem
```

## 7. Clone Repository and Configure

### Option A: Public repository

```bash
mkdir -p /opt/app
cd /opt/app
git clone https://github.com/user/repo.git .
```

### Option B: Private repository (deploy key)

Generate a deploy key on the VPS:

```bash
ssh-keygen -t ed25519 -f /root/.ssh/github_deploy -N '' -C 'deploy-key'
cat /root/.ssh/github_deploy.pub
```

Add the public key as a deploy key in GitHub: **Repository > Settings > Deploy keys > Add deploy key** (read-only is sufficient).

Configure SSH to use the deploy key:

```bash
cat > /root/.ssh/config <<'EOF'
Host github.com
  IdentityFile /root/.ssh/github_deploy
  StrictHostKeyChecking accept-new
EOF
chmod 600 /root/.ssh/config
```

Clone:

```bash
mkdir -p /opt/app
cd /opt/app
git clone git@github.com:user/repo.git .
```

### Configure environment

```bash
cp .env.example .env
nano .env  # fill in production values
```

## 8. First Deploy

```bash
cd /opt/app
docker compose up -d --build
```

### Verify

```bash
# Check services are running and healthy
docker compose ps

# Check backend health
curl -sf https://yourdomain.com/api/health
# Expected: {"status":"ok"}

# Check HTTPS
curl -sI https://yourdomain.com | head -5
# Expected: HTTP/1.1 200 OK

# Check HTTP → HTTPS redirect
curl -sI http://yourdomain.com | head -3
# Expected: HTTP/1.1 301 Moved Permanently

# Check WebSocket (Socket.IO handshake)
curl -s "https://yourdomain.com/socket.io/?EIO=4&transport=polling" | head -1
# Expected: 0{"sid":"...","upgrades":["websocket"],...}
```

## 9. SSL Certificate Auto-Renewal

Certbot standalone requires port 80 free, so Nginx must stop during renewal.

Add to root crontab (`crontab -e`):

```
0 0,12 * * * docker compose -f /opt/app/docker-compose.yml stop nginx && certbot renew --quiet && docker compose -f /opt/app/docker-compose.yml start nginx
```

Runs twice daily (Let's Encrypt recommended frequency). Renewal only triggers when certs are within 30 days of expiry.

## 10. Updating the Application

```bash
cd /opt/app
git pull origin main
docker compose up -d --build
```

Only changed layers rebuild — typically takes under a minute.

## Troubleshooting

### Backend not starting

```bash
docker compose logs backend
```

Common causes:
- Missing or invalid env vars in `.env`
- WS RPC endpoint returning 405 (use a provider that supports WebSocket)

### Nginx returning 502

```bash
docker compose ps
docker compose logs nginx
```

Common cause: backend not yet healthy (healthcheck has a start_period — wait and retry)

### WebSocket not connecting

```bash
curl "https://yourdomain.com/socket.io/?EIO=4&transport=polling"
```

Common causes:
- Nginx not proxying `/socket.io/` path
- Missing WebSocket upgrade headers in nginx config
- `proxy_read_timeout` too low (should be 86400s for long-lived connections)

### SSL certificate expired

```bash
certbot certificates
# Manual renewal
docker compose stop nginx
certbot renew
docker compose start nginx
```

### DNS not resolving

```bash
# Check via authoritative nameserver
nslookup yourdomain.com <your-ns-server>

# Flush local DNS cache (macOS)
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

### Locked out of SSH

Use VPS provider's web console to access the server and verify:
- SSH key is in `~/.ssh/authorized_keys`
- UFW allows port 22: `ufw status | grep 22`
- SSH config allows key auth: `grep PubkeyAuthentication /etc/ssh/sshd_config`

## Architecture Notes

- Backend port (default 3000) is NOT exposed on the host — only reachable via Nginx through Docker's internal network
- CORS is intentionally absent — Nginx handles same-origin routing so cross-origin requests are not needed
- All secrets are loaded from `.env` via Docker Compose `env_file` directive — never committed to the repository
- Containers use `restart: unless-stopped` — auto-recover after VPS reboot
- Log rotation configured at 10MB x 3 files per service to prevent disk fill
