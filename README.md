# Server Automation Platform with AWX

A comprehensive server automation platform built around Ansible AWX, providing a modern web interface for managing servers, executing commands, and running playbooks at scale. This platform combines the power of AWX with custom management tools to create a complete infrastructure automation solution.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Server Automation Platform is designed to simplify and streamline server management tasks through automation. Built on top of Ansible AWX, it provides an intuitive web interface for managing server inventories, executing custom commands, and running Ansible playbooks across multiple servers simultaneously.

### Key Benefits

- **Centralized Management**: Manage all your servers from a single, unified interface
- **Scalable Automation**: Execute commands and playbooks across hundreds of servers
- **Security First**: SSH key-based authentication with secure credential management
- **User-Friendly**: Modern React-based admin panel with intuitive workflows
- **Extensible**: RESTful API for integration with existing tools and workflows
- **Production Ready**: Docker-based deployment with comprehensive monitoring

## Architecture

The platform follows a microservices architecture with the following components:

### Core Components

1. **AWX (Ansible AWX)**: The automation engine that executes playbooks and manages inventories
2. **Server Management API**: Custom Flask-based API for enhanced server management
3. **Admin Panel**: React-based web interface for platform management
4. **PostgreSQL Database**: Shared database for AWX and custom components
5. **Redis**: Message broker for AWX task queuing
6. **Nginx**: Reverse proxy and static file server

### Component Interaction

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │  AWX Web UI     │    │   AWX REST API  │
│   (React)       │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │  Server Management API  │
                    │      (Flask)            │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────┴───────────┐
                    │     PostgreSQL DB       │
                    │   (Shared with AWX)     │
                    └─────────────────────────┘
```

## Features

### Server Management
- Add and configure servers with SSH credentials
- Automatic SSH key generation and distribution
- Server health monitoring and status tracking
- Server grouping and tagging for organization
- Real-time connection testing

### Command Execution
- Create and manage custom shell commands
- Execute commands on multiple servers simultaneously
- Real-time output streaming and logging
- Command history and audit trails
- Timeout and error handling

### Playbook Management
- Upload and manage Ansible playbooks
- Built-in playbook templates for common tasks
- YAML syntax validation and error checking
- Variable management and customization
- Playbook execution tracking and logging

### Admin Panel
- Modern, responsive web interface
- Dashboard with system overview and statistics
- Server inventory management
- Command and playbook libraries
- Execution history and monitoring
- User-friendly forms and wizards

### Security Features
- SSH key-based authentication
- Encrypted credential storage
- Role-based access control (via AWX)
- Audit logging for all operations
- Network isolation between components

## Prerequisites

Before installing the Server Automation Platform, ensure your system meets the following requirements:

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended, CentOS 7+, or similar)
- **CPU**: Minimum 4 cores (8+ cores recommended for production)
- **Memory**: Minimum 8GB RAM (16GB+ recommended for production)
- **Storage**: Minimum 50GB free disk space (SSD recommended)
- **Network**: Internet access for downloading dependencies

### Software Dependencies

- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 1.29 or later
- **Git**: For cloning the repository
- **curl**: For health checks and testing

### Network Requirements

The platform requires the following ports to be available:

| Port | Service | Description |
|------|---------|-------------|
| 80 | HTTP | Web interface (redirects to HTTPS if configured) |
| 443 | HTTPS | Secure web interface (optional) |
| 5432 | PostgreSQL | Database (internal only) |
| 6379 | Redis | Message broker (internal only) |
| 8080 | AWX | Direct AWX access (development only) |

### Target Server Requirements

Servers managed by the platform should have:

- SSH server running and accessible
- Python 2.7+ or Python 3.6+ installed
- Sudo access for the automation user (if privilege escalation is needed)
- Network connectivity to the platform host

## Installation

Follow these steps to install and configure the Server Automation Platform:

### Step 1: Clone the Repository

```bash
git clone 
cd server-automation-platform
```

### Step 2: Configure Environment Variables

Copy the example environment file and customize it for your deployment:

```bash
cp .env.example .env
```

Edit the `.env` file with your preferred settings:

```bash
# Database Configuration
POSTGRES_DB=awx
POSTGRES_USER=awx
POSTGRES_PASSWORD=your_secure_password_here

# AWX Configuration
AWX_ADMIN_USER=admin
AWX_ADMIN_PASSWORD=your_admin_password_here
SECRET_KEY=your_secret_key_here

# API Configuration
API_SECRET_KEY=your_api_secret_key_here

# Network Configuration
AWX_WEB_PORT=8080
API_PORT=5000
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
```

### Step 3: Create Required Directories

Ensure all necessary directories exist with proper permissions:

```bash
mkdir -p data/{playbooks,ssh_keys,logs}
chmod 755 data
chmod 700 data/ssh_keys
```

### Step 4: Build and Start Services

For production deployment:

```bash
docker-compose up -d
```

For development with hot reload:

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Step 5: Wait for Services to Initialize

The initial startup may take several minutes as AWX initializes its database and services. Monitor the logs:

```bash
docker-compose logs -f awx_web
```

Wait for the message indicating AWX is ready to accept connections.

### Step 6: Verify Installation

Check that all services are running:

```bash
docker-compose ps
```

All services should show as "Up" status. Test the web interface by navigating to:

- **Admin Panel**: http://localhost (or your server's IP)
- **AWX Interface**: http://localhost:8080 (development only)

### Step 7: Initial Configuration

1. **Access the Admin Panel**: Open your web browser and navigate to the platform URL
2. **Add Your First Server**: Use the Servers page to add a server to manage
3. **Test Connectivity**: Use the ping function to verify SSH connectivity
4. **Create a Command**: Try creating and executing a simple command like `uptime`
5. **Upload a Playbook**: Upload or create your first Ansible playbook

## Configuration

### Database Configuration

The platform uses PostgreSQL as its primary database, shared between AWX and the custom API. Database settings are configured through environment variables:

```bash
# PostgreSQL Configuration
POSTGRES_DB=awx                    # Database name
POSTGRES_USER=awx                  # Database user
POSTGRES_PASSWORD=secure_password  # Database password
POSTGRES_HOST=postgres             # Database host (container name)
POSTGRES_PORT=5432                 # Database port
```

For production deployments, consider:

- Using a strong, randomly generated password
- Enabling SSL connections
- Configuring regular backups
- Setting up database monitoring

### AWX Configuration

AWX is configured through environment variables in the docker-compose.yml file. Key settings include:

```yaml
environment:
  SECRET_KEY: awxsecret                    # Django secret key
  DATABASE_NAME: awx                      # Database name
  DATABASE_USER: awx                      # Database user
  DATABASE_PASSWORD: awxpass              # Database password
  DATABASE_HOST: postgres                 # Database host
  REDIS_HOST: redis                       # Redis host
  AWX_ADMIN_USER: admin                   # Initial admin user
  AWX_ADMIN_PASSWORD: password            # Initial admin password
```

### API Configuration

The Server Management API is configured through environment variables:

```bash
# Flask Configuration
FLASK_ENV=production                     # Environment (development/production)
SECRET_KEY=your-secret-key-here         # Flask secret key
DATABASE_URL=postgresql://...           # Database connection string

# AWX Integration
AWX_HOST=awx_web                        # AWX hostname
AWX_PORT=8052                           # AWX port
AWX_USERNAME=admin                      # AWX API username
AWX_PASSWORD=password                   # AWX API password
```

### SSL/TLS Configuration

To enable HTTPS, you'll need SSL certificates. Place your certificate files in the `nginx/ssl/` directory:

```bash
mkdir -p nginx/ssl
cp your-certificate.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem
```

Then uncomment the HTTPS server block in `nginx/nginx.conf` and restart the services:

```bash
docker-compose restart nginx
```

### Backup Configuration

Regular backups are essential for production deployments. The platform stores data in several locations:

1. **Database**: PostgreSQL data volume
2. **Playbooks**: `data/playbooks/` directory
3. **SSH Keys**: `data/ssh_keys/` directory
4. **Logs**: `data/logs/` directory

Example backup script:

```bash
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
docker-compose exec -T postgres pg_dump -U awx awx > "$BACKUP_DIR/database.sql"

# Backup data directories
tar -czf "$BACKUP_DIR/data.tar.gz" data/

# Backup configuration
cp .env "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"
```

## Usage Guide

This section provides detailed instructions for using the Server Automation Platform effectively.

### Managing Servers

#### Adding a New Server

1. Navigate to the **Servers** page in the admin panel
2. Click the **Add Server** button
3. Fill in the server details:
   - **Name**: A unique identifier for the server
   - **Hostname**: The server's hostname or FQDN
   - **IP Address**: The server's IP address
   - **Port**: SSH port (default: 22)
   - **Username**: SSH username for connections
   - **Description**: Optional description
   - **Tags**: Comma-separated tags for organization

4. Click **Create Server** to save

#### Setting Up SSH Authentication

For secure, password-less authentication:

1. Select a server from the servers list
2. Click the **Setup SSH** button
3. Enter the server's current password
4. The platform will:
   - Generate an SSH key pair
   - Copy the public key to the server
   - Test the key-based connection
   - Update the server configuration

#### Testing Server Connectivity

Use the ping function to verify server connectivity:

1. Find the server in the servers list
2. Click the **Ping** button (activity icon)
3. View the connection status and response time

### Executing Commands

#### Creating Custom Commands

1. Navigate to the **Commands** page
2. Click **Add Command**
3. Configure the command:
   - **Name**: Descriptive name for the command
   - **Description**: What the command does
   - **Command**: The actual shell command to execute
   - **Timeout**: Maximum execution time in seconds

4. Click **Create Command** to save

#### Running Commands on Servers

1. Find the command in the commands list
2. Click the **Execute** button (play icon)
3. Select target servers from the list
4. Click **Execute on X server(s)**
5. Monitor execution progress and view results

#### Common Command Examples

Here are some useful commands to get started:

| Command Name | Command | Description |
|--------------|---------|-------------|
| System Info | `uname -a && uptime` | Display system information and uptime |
| Disk Usage | `df -h` | Show disk space usage |
| Memory Usage | `free -h` | Display memory usage |
| Running Processes | `ps aux \| head -20` | List top 20 running processes |
| Network Interfaces | `ip addr show` | Show network interface configuration |
| Update Package Cache | `sudo apt update` | Update package repository cache (Ubuntu/Debian) |
| Install Package | `sudo apt install -y {{package_name}}` | Install a package (use variables for flexibility) |

### Managing Playbooks

#### Creating a New Playbook

1. Navigate to the **Playbooks** page
2. Click **Create Playbook**
3. Use the tabs to configure:
   - **Details**: Name, description, and variables
   - **Content**: YAML playbook content
   - **Templates**: Choose from pre-built templates

4. Click **Create Playbook** to save

#### Using Playbook Templates

The platform includes several built-in templates:

1. **Basic Server Setup**: Package installation and user management
2. **Docker Installation**: Complete Docker and Docker Compose setup
3. **Security Hardening**: Basic security configurations

To use a template:

1. Go to the **Templates** tab when creating a playbook
2. Select a template from the dropdown
3. Click **Use This Template**
4. Customize the content as needed

#### Uploading Existing Playbooks

1. Click **Upload** on the Playbooks page
2. Fill in the playbook details
3. Select your `.yml` or `.yaml` file
4. Configure any variables in JSON format
5. Click **Upload Playbook**

#### Executing Playbooks

1. Find the playbook in the list
2. Click the **Execute** button (play icon)
3. Select target servers
4. Click **Execute on X server(s)**
5. Monitor execution progress

### Monitoring and Logging

#### Viewing Execution History

The **Executions** page shows a complete history of all command and playbook executions:

- **Status**: Success, failure, or running
- **Type**: Command or playbook execution
- **Target Servers**: Number of servers involved
- **Duration**: Execution time
- **Executed By**: User who initiated the execution

#### Dashboard Overview

The dashboard provides a quick overview of your infrastructure:

- **Server Statistics**: Total, active, and error counts
- **Command Library**: Number of available commands
- **Recent Activity**: Latest executions and their status
- **System Health**: Overall platform status

### Best Practices

#### Server Organization

- Use descriptive names for servers (e.g., `web-prod-01`, `db-staging-02`)
- Apply consistent tagging (e.g., `production`, `web`, `database`)
- Group related servers for easier management
- Maintain up-to-date descriptions

#### Command Management

- Create reusable commands with clear names
- Use variables in commands for flexibility (e.g., `{{package_name}}`)
- Set appropriate timeouts for long-running commands
- Test commands on development servers first

#### Playbook Development

- Follow Ansible best practices for playbook structure
- Use meaningful task names and descriptions
- Implement proper error handling
- Test playbooks thoroughly before production use
- Version control your playbooks externally

#### Security Considerations

- Regularly rotate SSH keys
- Use least-privilege principles for server access
- Monitor execution logs for suspicious activity
- Keep the platform updated with security patches
- Implement network segmentation where possible

## API Documentation

The Server Automation Platform provides a comprehensive RESTful API for programmatic access to all functionality. This section documents the available endpoints and their usage.

### Authentication

Currently, the API uses basic authentication. In production deployments, consider implementing token-based authentication or OAuth2.

### Base URL

All API endpoints are prefixed with `/api/`:

```
http://your-platform-host/api/
```

### Server Management Endpoints

#### List Servers

```http
GET /api/servers
```

Returns a list of all configured servers.

**Response:**
```json
[
  {
    "id": 1,
    "name": "web-server-01",
    "hostname": "web01.example.com",
    "ip_address": "192.168.1.10",
    "port": 22,
    "username": "ubuntu",
    "status": "active",
    "tags": ["web", "production"],
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Server

```http
POST /api/servers
Content-Type: application/json

{
  "name": "new-server",
  "hostname": "server.example.com",
  "ip_address": "192.168.1.20",
  "port": 22,
  "username": "ubuntu",
  "description": "New web server",
  "tags": ["web", "staging"]
}
```

#### Update Server

```http
PUT /api/servers/{id}
Content-Type: application/json

{
  "description": "Updated description",
  "tags": ["web", "production", "updated"]
}
```

#### Delete Server

```http
DELETE /api/servers/{id}
```

#### Test Server Connection

```http
POST /api/servers/{id}/ping
```

### Command Management Endpoints

#### List Commands

```http
GET /api/commands
```

#### Create Command

```http
POST /api/commands
Content-Type: application/json

{
  "name": "System Update",
  "description": "Update system packages",
  "command": "sudo apt update && sudo apt upgrade -y",
  "timeout": 600
}
```

#### Execute Command

```http
POST /api/commands/{id}/execute
Content-Type: application/json

{
  "server_ids": [1, 2, 3],
  "executed_by": "admin"
}
```

### Playbook Management Endpoints

#### List Playbooks

```http
GET /api/playbooks
```

#### Create Playbook

```http
POST /api/playbooks
Content-Type: application/json

{
  "name": "Web Server Setup",
  "description": "Configure web server",
  "content": "---\n- name: Setup web server\n  hosts: all\n  tasks:\n    - name: Install nginx\n      apt:\n        name: nginx\n        state: present",
  "variables": {
    "nginx_port": 80
  }
}
```

#### Upload Playbook

```http
POST /api/playbooks
Content-Type: multipart/form-data

file: [playbook.yml file]
name: "Uploaded Playbook"
description: "Playbook uploaded from file"
variables: "{\"key\": \"value\"}"
```

#### Execute Playbook

```http
POST /api/playbooks/{id}/execute
Content-Type: application/json

{
  "server_ids": [1, 2],
  "extra_vars": {
    "custom_var": "value"
  },
  "executed_by": "admin"
}
```

### SSH Key Management Endpoints

#### Generate SSH Key Pair

```http
POST /api/ssh-keys/generate
Content-Type: application/json

{
  "key_name": "server_01_key"
}
```

#### Test SSH Connection

```http
POST /api/ssh-keys/test-connection
Content-Type: application/json

{
  "hostname": "server.example.com",
  "port": 22,
  "username": "ubuntu",
  "key_path": "/path/to/private/key"
}
```

#### Setup SSH for Server

```http
POST /api/servers/{id}/setup-ssh
Content-Type: application/json

{
  "password": "current_server_password"
}
```

### Execution History Endpoints

#### List Executions

```http
GET /api/executions
```

Returns execution history with status, timing, and results.

### Error Handling

The API uses standard HTTP status codes and returns error details in JSON format:

```json
{
  "error": "Server not found",
  "details": "No server exists with ID 999"
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

### Rate Limiting

Currently, no rate limiting is implemented. For production deployments, consider implementing rate limiting to prevent abuse.

## Troubleshooting

This section covers common issues and their solutions.

### Installation Issues

#### Docker Compose Fails to Start

**Problem**: Services fail to start with port binding errors.

**Solution**: Check if ports are already in use:
```bash
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :5432
```

Stop conflicting services or change ports in the configuration.

#### AWX Takes Too Long to Initialize

**Problem**: AWX web interface is not accessible after 10+ minutes.

**Solution**: 
1. Check AWX logs for errors:
   ```bash
   docker-compose logs awx_web
   ```

2. Ensure sufficient system resources (8GB+ RAM recommended)

3. Restart AWX services:
   ```bash
   docker-compose restart awx_web awx_task
   ```

#### Database Connection Errors

**Problem**: API returns database connection errors.

**Solution**:
1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify environment variables in `.env` file

### Server Management Issues

#### SSH Connection Failures

**Problem**: Cannot connect to servers via SSH.

**Troubleshooting Steps**:

1. **Verify Network Connectivity**:
   ```bash
   ping server-hostname
   telnet server-ip 22
   ```

2. **Check SSH Service**:
   ```bash
   # On the target server
   sudo systemctl status ssh
   sudo systemctl status sshd  # CentOS/RHEL
   ```

3. **Verify SSH Configuration**:
   ```bash
   # Check SSH config on target server
   sudo sshd -T | grep -E "(PasswordAuthentication|PubkeyAuthentication|PermitRootLogin)"
   ```

4. **Test Manual SSH Connection**:
   ```bash
   ssh -v username@server-hostname
   ```

#### SSH Key Authentication Issues

**Problem**: Key-based authentication fails after setup.

**Solution**:
1. Check key permissions:
   ```bash
   # On the platform host
   ls -la data/ssh_keys/
   
   # On the target server
   ls -la ~/.ssh/
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

2. Verify key format:
   ```bash
   ssh-keygen -l -f ~/.ssh/authorized_keys
   ```

3. Check SSH logs:
   ```bash
   # On target server
   sudo tail -f /var/log/auth.log  # Ubuntu/Debian
   sudo tail -f /var/log/secure    # CentOS/RHEL
   ```

### Command Execution Issues

#### Commands Timeout

**Problem**: Commands fail with timeout errors.

**Solution**:
1. Increase timeout value for long-running commands
2. Check server load and performance
3. Break complex commands into smaller parts
4. Use background execution for very long tasks

#### Permission Denied Errors

**Problem**: Commands fail with permission errors.

**Solution**:
1. Ensure the SSH user has necessary permissions
2. Use `sudo` in commands when needed
3. Configure passwordless sudo if required:
   ```bash
   # Add to /etc/sudoers on target server
   username ALL=(ALL) NOPASSWD:ALL
   ```

### Playbook Execution Issues

#### YAML Syntax Errors

**Problem**: Playbooks fail with YAML parsing errors.

**Solution**:
1. Use the built-in validation feature
2. Check YAML syntax with online validators
3. Ensure proper indentation (spaces, not tabs)
4. Validate with `ansible-playbook --syntax-check`

#### Ansible Module Not Found

**Problem**: Playbooks fail with "module not found" errors.

**Solution**:
1. Ensure Ansible is installed on target servers
2. Check Python version compatibility
3. Install required Ansible collections
4. Use fully qualified collection names (FQCN)

### Performance Issues

#### Slow Web Interface

**Problem**: Admin panel loads slowly or times out.

**Solution**:
1. Check system resources:
   ```bash
   docker stats
   htop
   ```

2. Optimize database queries
3. Increase container resource limits
4. Use SSD storage for better I/O performance

#### High Memory Usage

**Problem**: Platform consumes excessive memory.

**Solution**:
1. Monitor container memory usage:
   ```bash
   docker stats --no-stream
   ```

2. Adjust container memory limits in docker-compose.yml
3. Optimize database configuration
4. Clean up old execution logs

### Network Issues

#### Cannot Access Web Interface

**Problem**: Web interface is not accessible from external networks.

**Solution**:
1. Check firewall settings:
   ```bash
   sudo ufw status
   sudo iptables -L
   ```

2. Verify port forwarding (if using NAT)
3. Check nginx configuration
4. Ensure services are binding to correct interfaces

#### Internal Service Communication Failures

**Problem**: Services cannot communicate with each other.

**Solution**:
1. Check Docker network:
   ```bash
   docker network ls
   docker network inspect server-automation-platform_awx_network
   ```

2. Verify service names in docker-compose.yml
3. Check DNS resolution between containers
4. Restart Docker daemon if necessary

### Data Recovery

#### Database Corruption

**Problem**: Database becomes corrupted or inaccessible.

**Recovery Steps**:
1. Stop all services:
   ```bash
   docker-compose down
   ```

2. Restore from backup:
   ```bash
   docker-compose up -d postgres
   docker-compose exec postgres psql -U awx -d awx < backup.sql
   ```

3. Restart all services:
   ```bash
   docker-compose up -d
   ```

#### Lost SSH Keys

**Problem**: SSH private keys are lost or corrupted.

**Recovery Steps**:
1. Regenerate SSH keys for affected servers
2. Manually copy new public keys to servers
3. Update server configurations in the platform
4. Test connectivity

### Log Analysis

#### Enabling Debug Logging

For detailed troubleshooting, enable debug logging:

1. **API Debug Logging**:
   ```bash
   # In .env file
   FLASK_ENV=development
   FLASK_DEBUG=1
   ```

2. **AWX Debug Logging**:
   ```bash
   # Add to docker-compose.yml
   environment:
     AWX_LOGGING_MODE: DEBUG
   ```

3. **Database Query Logging**:
   ```bash
   # In PostgreSQL container
   echo "log_statement = 'all'" >> /var/lib/postgresql/data/postgresql.conf
   ```

#### Log Locations

Important log files and their locations:

| Component | Log Location | Command |
|-----------|--------------|---------|
| API | Container logs | `docker-compose logs server_api` |
| AWX Web | Container logs | `docker-compose logs awx_web` |
| AWX Task | Container logs | `docker-compose logs awx_task` |
| PostgreSQL | Container logs | `docker-compose logs postgres` |
| Nginx | Container logs | `docker-compose logs nginx` |
| Execution Logs | Database | Query `execution_logs` table |

### Getting Help

If you encounter issues not covered in this guide:

1. **Check the GitHub Issues**: Search for similar problems and solutions
2. **Enable Debug Logging**: Gather detailed logs before reporting issues
3. **Provide System Information**: Include OS, Docker version, and error messages
4. **Create Minimal Reproduction**: Provide steps to reproduce the issue
5. **Community Support**: Join our community forums for assistance

Remember to sanitize any sensitive information (passwords, IP addresses, etc.) before sharing logs or configurations.

## Contributing

We welcome contributions to the Server Automation Platform! This section outlines how to contribute effectively.

### Development Setup

1. **Fork the Repository**: Create a fork of the project on GitHub

2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/your-username/server-automation-platform.git
   cd server-automation-platform
   ```

3. **Set Up Development Environment**:
   ```bash
   # Use development configuration
   cp .env.example .env
   docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
   ```

4. **Install Development Dependencies**:
   ```bash
   # For API development
   cd api
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # For frontend development
   cd ../frontend
   npm install
   ```

### Code Style and Standards

#### Python (API)
- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Write docstrings for all functions and classes
- Use meaningful variable and function names
- Maximum line length: 100 characters

#### JavaScript/React (Frontend)
- Use ES6+ features
- Follow React best practices and hooks patterns
- Use meaningful component and variable names
- Implement proper error handling
- Use Tailwind CSS for styling

#### General Guidelines
- Write clear, self-documenting code
- Include comments for complex logic
- Follow the existing project structure
- Ensure backward compatibility when possible

### Testing

#### Running Tests

```bash
# API tests
cd api
python -m pytest tests/

# Frontend tests
cd frontend
npm test
```

#### Writing Tests

- Write unit tests for all new functions
- Include integration tests for API endpoints
- Test error conditions and edge cases
- Maintain test coverage above 80%

### Submitting Changes

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**: Implement your feature or fix

3. **Test Thoroughly**: Ensure all tests pass and functionality works

4. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Add feature: description of your changes"
   ```

5. **Push to Your Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**: Submit a PR with a clear description

### Pull Request Guidelines

- **Clear Title**: Use descriptive titles that explain the change
- **Detailed Description**: Explain what changes were made and why
- **Link Issues**: Reference any related GitHub issues
- **Screenshots**: Include screenshots for UI changes
- **Testing**: Describe how the changes were tested
- **Breaking Changes**: Clearly mark any breaking changes

### Reporting Issues

When reporting bugs or requesting features:

1. **Search Existing Issues**: Check if the issue already exists
2. **Use Issue Templates**: Follow the provided templates
3. **Provide Details**: Include system information, logs, and steps to reproduce
4. **Be Specific**: Clear, specific issues are easier to address

### Documentation

- Update documentation for any new features
- Include code examples and usage instructions
- Update API documentation for endpoint changes
- Ensure README accuracy

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project includes several third-party components with their own licenses:

- **Ansible AWX**: Apache License 2.0
- **Flask**: BSD 3-Clause License
- **React**: MIT License
- **PostgreSQL**: PostgreSQL License
- **Redis**: BSD 3-Clause License
- **Nginx**: BSD 2-Clause License

Please review the individual license files in the respective component directories for complete license information.

---

