# Configuration Guide

This guide covers all configuration options for the Server Automation Platform, from basic setup to advanced production configurations.

## Environment Variables

All configuration is managed through environment variables defined in the `.env` file. This section details each variable and its purpose.

### Database Configuration

```bash
# PostgreSQL Database Settings
POSTGRES_DB=awx                    # Database name (default: awx)
POSTGRES_USER=awx                  # Database username (default: awx)
POSTGRES_PASSWORD=secure_password  # Database password (CHANGE THIS!)
POSTGRES_HOST=postgres             # Database hostname (container name)
POSTGRES_PORT=5432                 # Database port (default: 5432)
```

**Production Recommendations:**
- Use a strong, randomly generated password (32+ characters)
- Consider using external managed database services for high availability
- Enable SSL connections for external databases

### AWX Configuration

```bash
# AWX Core Settings
AWX_ADMIN_USER=admin               # Initial admin username
AWX_ADMIN_PASSWORD=admin_password  # Initial admin password (CHANGE THIS!)
SECRET_KEY=awx_secret_key         # Django secret key (CHANGE THIS!)

# AWX Network Settings
AWX_WEB_PORT=8080                 # AWX web interface port
AWX_TASK_PORT=8052                # AWX task runner port (internal)

# AWX Advanced Settings
AWX_LOGGING_MODE=INFO             # Logging level (DEBUG, INFO, WARNING, ERROR)
AWX_PROJECT_DATA_DIR=/var/lib/awx/projects  # Project files directory
AWX_ISOLATED_VERBOSITY=1          # Ansible verbosity level (0-4)
```

**Security Notes:**
- The SECRET_KEY should be a random 50-character string
- Change default admin credentials immediately after installation
- Use strong passwords with mixed case, numbers, and symbols

### API Configuration

```bash
# Flask API Settings
API_SECRET_KEY=api_secret_key     # Flask secret key (CHANGE THIS!)
API_PORT=5000                     # API server port
API_HOST=0.0.0.0                  # API bind address (0.0.0.0 for all interfaces)

# API Database Connection
DATABASE_URL=postgresql://awx:password@postgres:5432/awx  # Full database URL

# API Features
API_DEBUG=false                   # Enable debug mode (development only)
API_CORS_ORIGINS=*               # CORS allowed origins (* for all)
```

### Network Configuration

```bash
# External Port Mappings
NGINX_HTTP_PORT=80               # HTTP port for web interface
NGINX_HTTPS_PORT=443             # HTTPS port for web interface (if SSL enabled)

# Internal Network Settings
DOCKER_NETWORK_SUBNET=172.20.0.0/16  # Docker network subnet
DOCKER_NETWORK_GATEWAY=172.20.0.1    # Docker network gateway
```

### Storage Configuration

```bash
# Data Directories
PLAYBOOKS_DIR=/app/data/playbooks    # Playbook storage directory
SSH_KEYS_DIR=/app/data/ssh_keys      # SSH keys storage directory
LOGS_DIR=/app/data/logs              # Application logs directory

# Volume Mounts
POSTGRES_DATA_DIR=./data/postgres    # PostgreSQL data directory
REDIS_DATA_DIR=./data/redis          # Redis data directory
```

### SSL/TLS Configuration

```bash
# SSL Certificate Settings
SSL_CERT_PATH=./nginx/ssl/cert.pem   # SSL certificate file path
SSL_KEY_PATH=./nginx/ssl/key.pem     # SSL private key file path
SSL_ENABLED=false                    # Enable HTTPS (true/false)

# SSL Security Settings
SSL_PROTOCOLS="TLSv1.2 TLSv1.3"     # Allowed SSL/TLS protocols
SSL_CIPHERS="ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256"  # SSL ciphers
```

## Docker Compose Configuration

The `docker-compose.yml` file defines the service architecture. This section explains key configuration options.

### Service Dependencies

```yaml
services:
  postgres:
    # Database service - must start first
    
  redis:
    # Message broker - required by AWX
    depends_on:
      - postgres
      
  awx_web:
    # AWX web interface
    depends_on:
      - postgres
      - redis
      
  awx_task:
    # AWX task runner
    depends_on:
      - postgres
      - redis
      - awx_web
      
  server_api:
    # Custom API service
    depends_on:
      - postgres
      
  nginx:
    # Reverse proxy
    depends_on:
      - awx_web
      - server_api
```

### Resource Limits

Configure resource limits for production deployments:

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
          
  awx_task:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'
```

### Volume Configuration

```yaml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/postgres
      
  redis_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/redis
      
  playbooks_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/playbooks
```

## Nginx Configuration

The Nginx reverse proxy handles routing and SSL termination. Configuration is in `nginx/nginx.conf`.

### Basic HTTP Configuration

```nginx
server {
    listen 80;
    server_name localhost;
    
    # Redirect to HTTPS (if SSL enabled)
    # return 301 https://$server_name$request_uri;
    
    # API routes
    location /api/ {
        proxy_pass http://server_api:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # AWX routes
    location /awx/ {
        proxy_pass http://awx_web:8052;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend static files
    location / {
        proxy_pass http://server_api:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### HTTPS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name localhost;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Same location blocks as HTTP configuration
    # ...
}
```

### Performance Optimization

```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# Client body size limit
client_max_body_size 100M;

# Timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# Buffer sizes
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;
```

## Database Configuration

### PostgreSQL Tuning

Create a custom PostgreSQL configuration file at `postgres/postgresql.conf`:

```ini
# Memory Settings
shared_buffers = 256MB              # 25% of system RAM (for dedicated server)
effective_cache_size = 1GB          # 75% of system RAM
work_mem = 4MB                      # Per-connection memory for sorts/hashes
maintenance_work_mem = 64MB         # Memory for maintenance operations

# Connection Settings
max_connections = 100               # Maximum concurrent connections
listen_addresses = '*'              # Listen on all addresses
port = 5432                         # PostgreSQL port

# Write-Ahead Logging (WAL)
wal_level = replica                 # Enable replication
max_wal_size = 1GB                  # Maximum WAL size
min_wal_size = 80MB                 # Minimum WAL size
checkpoint_completion_target = 0.9   # Checkpoint completion target

# Query Planner
random_page_cost = 1.1              # Cost of random page access (SSD optimized)
effective_io_concurrency = 200      # Concurrent I/O operations (SSD)

# Logging
log_destination = 'stderr'          # Log destination
logging_collector = on              # Enable log collection
log_directory = 'pg_log'            # Log directory
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'  # Log filename pattern
log_statement = 'none'              # Log statements (none/ddl/mod/all)
log_min_duration_statement = 1000   # Log slow queries (milliseconds)

# Autovacuum
autovacuum = on                     # Enable autovacuum
autovacuum_max_workers = 3          # Maximum autovacuum workers
autovacuum_naptime = 1min           # Autovacuum sleep time
```

### Database Backup Configuration

Configure automated backups with retention policies:

```bash
# Create backup configuration
cat > postgres/backup.conf << EOF
# Backup retention (days)
BACKUP_RETENTION=30

# Backup compression
BACKUP_COMPRESSION=gzip

# Backup location
BACKUP_DIR=/backup/postgres

# Backup schedule (cron format)
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
EOF
```

## AWX Advanced Configuration

### AWX Settings

AWX can be configured through environment variables or the web interface. Key settings include:

```bash
# Job Execution
AWX_TASK_ENV_ANSIBLE_HOST_KEY_CHECKING=False  # Disable host key checking
AWX_TASK_ENV_ANSIBLE_TIMEOUT=30               # Ansible timeout (seconds)
AWX_TASK_ENV_ANSIBLE_GATHERING=smart          # Fact gathering mode

# Inventory Management
AWX_AUTO_INVENTORY_SYNC=true                  # Auto-sync inventories
AWX_INVENTORY_CACHE_TIMEOUT=3600              # Inventory cache timeout (seconds)

# Project Management
AWX_PROJECT_UPDATE_VCS_REVISION=true          # Update VCS revision
AWX_PROJECT_CACHE_TIMEOUT=3600                # Project cache timeout (seconds)

# Notification Settings
AWX_EMAIL_HOST=smtp.example.com               # SMTP server
AWX_EMAIL_PORT=587                            # SMTP port
AWX_EMAIL_USE_TLS=true                        # Use TLS for email
AWX_EMAIL_HOST_USER=notifications@example.com # SMTP username
AWX_EMAIL_HOST_PASSWORD=smtp_password         # SMTP password
```

### Custom AWX Configuration

Create custom AWX settings in `awx/settings.py`:

```python
# Custom AWX settings
import os

# Security settings
ALLOWED_HOSTS = ['*']  # Configure for production
SECURE_SSL_REDIRECT = False  # Enable for HTTPS
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Database settings
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'awx'),
        'USER': os.environ.get('POSTGRES_USER', 'awx'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', ''),
        'HOST': os.environ.get('POSTGRES_HOST', 'postgres'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'prefer',
        },
    }
}

# Cache settings
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/awx/awx.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'awx': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

## API Configuration

### Flask Application Settings

Configure the Flask API in `api/src/config.py`:

```python
import os
from datetime import timedelta

class Config:
    # Basic Flask settings
    SECRET_KEY = os.environ.get('API_SECRET_KEY', 'dev-secret-key')
    DEBUG = os.environ.get('API_DEBUG', 'false').lower() == 'true'
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Security settings
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    
    # File upload settings
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size
    UPLOAD_FOLDER = '/app/data/uploads'
    
    # SSH settings
    SSH_KEYS_DIR = os.environ.get('SSH_KEYS_DIR', '/app/data/ssh_keys')
    SSH_TIMEOUT = int(os.environ.get('SSH_TIMEOUT', '30'))
    
    # AWX integration settings
    AWX_HOST = os.environ.get('AWX_HOST', 'awx_web')
    AWX_PORT = int(os.environ.get('AWX_PORT', '8052'))
    AWX_USERNAME = os.environ.get('AWX_USERNAME', 'admin')
    AWX_PASSWORD = os.environ.get('AWX_PASSWORD', 'password')
    AWX_VERIFY_SSL = os.environ.get('AWX_VERIFY_SSL', 'false').lower() == 'true'

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    
class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    
class TestingConfig(Config):
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
```

### CORS Configuration

Configure Cross-Origin Resource Sharing (CORS) for API access:

```python
from flask_cors import CORS

# Basic CORS configuration
CORS(app, origins="*")

# Advanced CORS configuration
CORS(app, 
     origins=["http://localhost:3000", "https://yourdomain.com"],
     methods=["GET", "POST", "PUT", "DELETE"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)
```

## Security Configuration

### Authentication and Authorization

#### SSH Key Management

Configure SSH key security:

```bash
# SSH key directory permissions
chmod 700 data/ssh_keys/
chmod 600 data/ssh_keys/*

# SSH key generation settings
SSH_KEY_TYPE=rsa                    # Key type (rsa, ed25519)
SSH_KEY_BITS=2048                   # Key size for RSA keys
SSH_KEY_COMMENT="automation-platform"  # Key comment
```

#### API Security

```python
# API security headers
from flask_talisman import Talisman

# Configure security headers
Talisman(app, 
         force_https=False,  # Set to True for production with HTTPS
         strict_transport_security=True,
         content_security_policy={
             'default-src': "'self'",
             'script-src': "'self' 'unsafe-inline'",
             'style-src': "'self' 'unsafe-inline'",
             'img-src': "'self' data:",
         })
```

### Network Security

#### Firewall Configuration

Configure iptables rules for additional security:

```bash
# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Drop all other traffic
iptables -A INPUT -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

#### Docker Network Security

Configure Docker network isolation:

```yaml
networks:
  awx_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
    driver_opts:
      com.docker.network.bridge.enable_icc: "false"
      com.docker.network.bridge.enable_ip_masquerade: "true"
```

## Monitoring and Logging

### Application Logging

Configure comprehensive logging:

```python
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
if not app.debug:
    file_handler = RotatingFileHandler(
        '/app/data/logs/api.log', 
        maxBytes=10240000, 
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Server Automation Platform startup')
```

### Health Monitoring

Configure health check endpoints:

```python
@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db.session.execute('SELECT 1')
        
        # Check AWX connection
        awx_client = AWXClient()
        awx_status = awx_client.get_organizations()
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected',
            'awx': 'connected' if awx_status else 'disconnected'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500
```

### Metrics Collection

Configure Prometheus metrics (optional):

```python
from prometheus_flask_exporter import PrometheusMetrics

# Initialize metrics
metrics = PrometheusMetrics(app)

# Custom metrics
metrics.info('app_info', 'Application info', version='1.0.0')

# Add custom metrics
request_count = metrics.counter(
    'requests_total', 'Total requests', 
    labels={'method': lambda: request.method, 'endpoint': lambda: request.endpoint}
)
```

## Performance Tuning

### Database Performance

#### Connection Pooling

Configure database connection pooling:

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

#### Query Optimization

```python
# Enable query logging for optimization
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Use database indexes
class Server(db.Model):
    __tablename__ = 'servers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, index=True)
```

### Application Performance

#### Caching

Configure Redis caching:

```python
from flask_caching import Cache

cache = Cache(app, config={
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_URL': 'redis://redis:6379/1',
    'CACHE_DEFAULT_TIMEOUT': 300
})

# Cache expensive operations
@cache.memoize(timeout=3600)
def get_server_info(server_id):
    # Expensive operation
    return server_info
```

#### Async Processing

Configure Celery for background tasks:

```python
from celery import Celery

celery = Celery(
    app.import_name,
    backend='redis://redis:6379/2',
    broker='redis://redis:6379/2'
)

@celery.task
def execute_command_async(server_id, command):
    # Long-running command execution
    pass
```

## Backup and Recovery

### Automated Backup Configuration

Create comprehensive backup strategy:

```bash
#!/bin/bash
# backup-config.sh

# Backup configuration
BACKUP_ROOT="/backup"
RETENTION_DAYS=30
COMPRESSION="gzip"

# Database backup
pg_dump -h postgres -U awx awx | gzip > "$BACKUP_ROOT/db-$(date +%Y%m%d).sql.gz"

# Data directories backup
tar -czf "$BACKUP_ROOT/data-$(date +%Y%m%d).tar.gz" data/

# Configuration backup
tar -czf "$BACKUP_ROOT/config-$(date +%Y%m%d).tar.gz" .env docker-compose.yml nginx/

# Cleanup old backups
find "$BACKUP_ROOT" -name "*.gz" -mtime +$RETENTION_DAYS -delete
```

### Disaster Recovery

Configure disaster recovery procedures:

```bash
#!/bin/bash
# restore.sh

BACKUP_DATE=$1
BACKUP_ROOT="/backup"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 YYYYMMDD"
    exit 1
fi

# Stop services
docker-compose down

# Restore database
gunzip -c "$BACKUP_ROOT/db-$BACKUP_DATE.sql.gz" | docker-compose exec -T postgres psql -U awx -d awx

# Restore data
tar -xzf "$BACKUP_ROOT/data-$BACKUP_DATE.tar.gz"

# Restore configuration
tar -xzf "$BACKUP_ROOT/config-$BACKUP_DATE.tar.gz"

# Start services
docker-compose up -d
```

This configuration guide provides comprehensive coverage of all configurable aspects of the Server Automation Platform. Adjust settings based on your specific requirements and environment constraints.

