# Installation Guide

This comprehensive installation guide will walk you through setting up the Server Automation Platform with AWX from scratch. Follow these steps carefully to ensure a successful deployment.

## Quick Start

For those who want to get started immediately:

```bash
git clone 
cd server-automation-platform
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

Wait 5-10 minutes for initialization, then access the platform at http://localhost.

## Detailed Installation

### Step 1: System Preparation

#### Update System Packages

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
# or for newer versions
sudo dnf update -y
```

#### Install Required Packages

```bash
# Ubuntu/Debian
sudo apt install -y curl wget git unzip

# CentOS/RHEL
sudo yum install -y curl wget git unzip
# or
sudo dnf install -y curl wget git unzip
```

### Step 2: Docker Installation

#### Install Docker

**Ubuntu/Debian:**
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
```

**CentOS/RHEL:**
```bash
# Remove old versions
sudo yum remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

# Install dependencies
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io
```

#### Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

#### Configure Docker

```bash
# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (optional, for non-root usage)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### Step 3: Download and Configure Platform

#### Clone Repository

```bash
# Clone the repository
git clone https://github.com/DavidHavoc/server-automation-platform.git
cd server-automation-platform

# Verify contents
ls -la
```

#### Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env  # or use your preferred editor
```

**Important Environment Variables:**

```bash
# Database Configuration
POSTGRES_DB=awx
POSTGRES_USER=awx
POSTGRES_PASSWORD=change_this_secure_password

# AWX Configuration
AWX_ADMIN_USER=admin
AWX_ADMIN_PASSWORD=change_this_admin_password
SECRET_KEY=change_this_secret_key_to_something_random

# API Configuration
API_SECRET_KEY=change_this_api_secret_key

# Network Configuration
AWX_WEB_PORT=8080
API_PORT=5000
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

**Security Note:** Always change default passwords and use strong, randomly generated values for production deployments.

#### Create Data Directories

```bash
# Create required directories
mkdir -p data/{playbooks,ssh_keys,logs}

# Set proper permissions
chmod 755 data
chmod 700 data/ssh_keys
chmod 755 data/playbooks
chmod 755 data/logs

# Verify directory structure
tree data/
```

### Step 4: Build and Deploy

#### Build Custom Images

```bash
# Build the API image
docker-compose build server_api

# Verify images
docker images | grep server-automation
```

#### Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# Monitor startup progress
docker-compose logs -f
```

#### Verify Service Status

```bash
# Check service status
docker-compose ps

# All services should show "Up" status
# Example output:
# NAME                    COMMAND                  SERVICE             STATUS              PORTS
# awx_nginx              "/docker-entrypoint.…"   nginx               Up                  0.0.0.0:80->80/tcp
# awx_postgres           "docker-entrypoint.s…"   postgres            Up (healthy)        5432/tcp
# awx_redis              "docker-entrypoint.s…"   redis               Up (healthy)        6379/tcp
# awx_task               "/usr/bin/tini -- /u…"   awx_task            Up                  8052/tcp
# awx_web                "/usr/bin/tini -- /u…"   awx_web             Up                  8052/tcp
# server_management_api  "python src/main.py"     server_api          Up                  0.0.0.0:5000->5000/tcp
```

### Step 5: Initial Configuration

#### Wait for AWX Initialization

AWX requires several minutes to initialize its database and services:

```bash
# Monitor AWX web service logs
docker-compose logs -f awx_web

# Look for messages indicating AWX is ready:
# "AWX is ready"
# "Listening at: http://0.0.0.0:8052"
```

This process typically takes 5-10 minutes on the first startup.

#### Verify Web Access

1. **Admin Panel**: Open http://localhost (or your server's IP address)
2. **AWX Interface**: Open http://localhost:8080 (development access)

#### Test API Endpoints

```bash
# Test API health
curl http://localhost:5000/api/health

# Expected response:
# {"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}

# Test servers endpoint
curl http://localhost:5000/api/servers

# Expected response:
# []
```

### Step 6: Post-Installation Setup

#### Create First Server Entry

1. Access the admin panel at http://localhost
2. Navigate to the "Servers" page
3. Click "Add Server"
4. Fill in details for a test server:
   - Name: `test-server`
   - Hostname: `your-test-server.com`
   - IP Address: `192.168.1.100`
   - Username: `ubuntu`
   - Port: `22`

#### Test SSH Connectivity

1. Select your newly created server
2. Click the "Ping" button to test connectivity
3. If successful, you should see a green status indicator

#### Create First Command

1. Navigate to the "Commands" page
2. Click "Add Command"
3. Create a simple test command:
   - Name: `System Info`
   - Command: `uname -a && uptime`
   - Description: `Display system information`

#### Execute Your First Command

1. Find your command in the list
2. Click the "Execute" button
3. Select your test server
4. Click "Execute on 1 server(s)"
5. Monitor the execution and view results

## Production Deployment

### Security Hardening

#### SSL/TLS Configuration

1. **Obtain SSL Certificates:**
   ```bash
   # Using Let's Encrypt (example)
   sudo apt install certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Configure SSL:**
   ```bash
   # Copy certificates
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
   
   # Set permissions
   sudo chmod 644 nginx/ssl/cert.pem
   sudo chmod 600 nginx/ssl/key.pem
   ```

3. **Enable HTTPS:**
   ```bash
   # Edit nginx/nginx.conf and uncomment the HTTPS server block
   # Update the .env file:
   NGINX_HTTPS_PORT=443
   
   # Restart services
   docker-compose restart nginx
   ```

#### Firewall Configuration

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### Database Security

1. **Change Default Passwords:**
   ```bash
   # Update .env with strong passwords
   POSTGRES_PASSWORD=very_secure_random_password_here
   AWX_ADMIN_PASSWORD=another_secure_password_here
   ```

2. **Restrict Database Access:**
   ```bash
   # In docker-compose.yml, remove exposed ports for postgres and redis
   # Comment out or remove these lines:
   # ports:
   #   - "5432:5432"
   ```

### Performance Optimization

#### Resource Allocation

Update docker-compose.yml with appropriate resource limits:

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  awx_web:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

#### Database Tuning

Create a custom PostgreSQL configuration:

```bash
# Create custom postgres config
cat > postgres/postgresql.conf << EOF
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100

# Logging
log_statement = 'none'
log_min_duration_statement = 1000
EOF
```

Update docker-compose.yml to use the custom config:

```yaml
postgres:
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
```

### Backup and Recovery

#### Automated Backup Script

Create a backup script:

```bash
cat > backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Starting backup at $(date)"

# Backup database
echo "Backing up database..."
docker-compose exec -T postgres pg_dump -U awx awx > "$BACKUP_DIR/database.sql"

# Backup data directories
echo "Backing up data directories..."
tar -czf "$BACKUP_DIR/data.tar.gz" data/

# Backup configuration
echo "Backing up configuration..."
cp .env "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"
cp -r nginx/ "$BACKUP_DIR/"

# Cleanup old backups (keep last 7 days)
find /backup -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed at $(date)"
echo "Backup location: $BACKUP_DIR"
EOF

chmod +x backup.sh
```

#### Schedule Regular Backups

```bash
# Add to crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /path/to/server-automation-platform/backup.sh >> /var/log/platform-backup.log 2>&1
```

### Monitoring and Logging

#### Log Rotation

Configure log rotation for Docker containers:

```bash
# Create logrotate configuration
sudo cat > /etc/logrotate.d/docker-containers << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF
```

#### Health Monitoring

Create a health check script:

```bash
cat > health-check.sh << 'EOF'
#!/bin/bash

# Check service status
echo "=== Service Status ==="
docker-compose ps

# Check API health
echo -e "\n=== API Health ==="
curl -s http://localhost:5000/api/health | jq .

# Check disk usage
echo -e "\n=== Disk Usage ==="
df -h

# Check memory usage
echo -e "\n=== Memory Usage ==="
free -h

# Check Docker stats
echo -e "\n=== Container Stats ==="
docker stats --no-stream
EOF

chmod +x health-check.sh
```

## Troubleshooting Installation

### Common Issues

#### Port Conflicts

**Problem:** Services fail to start due to port conflicts.

**Solution:**
```bash
# Check what's using the ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :5432

# Stop conflicting services or change ports in .env
```

#### Insufficient Resources

**Problem:** Services crash or become unresponsive.

**Solution:**
```bash
# Check system resources
free -h
df -h

# Monitor container resource usage
docker stats

# Increase system resources or adjust container limits
```

#### Permission Issues

**Problem:** Permission denied errors when accessing files.

**Solution:**
```bash
# Fix data directory permissions
sudo chown -R $USER:$USER data/
chmod 755 data/
chmod 700 data/ssh_keys/

# Fix Docker socket permissions (if needed)
sudo chmod 666 /var/run/docker.sock
```

#### Database Connection Issues

**Problem:** API cannot connect to database.

**Solution:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify database is running
docker-compose ps postgres

# Test database connection
docker-compose exec postgres psql -U awx -d awx -c "SELECT version();"
```

### Getting Help

If you encounter issues during installation:

1. **Check the logs:**
   ```bash
   docker-compose logs [service_name]
   ```

2. **Verify system requirements:**
   - Minimum 8GB RAM
   - 50GB free disk space
   - Docker 20.10+
   - Docker Compose 1.29+

3. **Review the troubleshooting section** in the main README

4. **Search existing issues** on GitHub

5. **Create a new issue** with:
   - System information (OS, Docker version, etc.)
   - Complete error messages
   - Steps to reproduce the problem
   - Relevant log outputs

## Next Steps

After successful installation:

1. **Read the Usage Guide** in the main README
2. **Configure your first servers** and test connectivity
3. **Create useful commands** for your environment
4. **Upload or create playbooks** for automation tasks
5. **Set up monitoring and backups** for production use
6. **Review security settings** and harden the deployment

