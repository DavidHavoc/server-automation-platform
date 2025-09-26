-- Server Automation Platform Database Schema

-- Servers table for managing target servers
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER DEFAULT 22,
    username VARCHAR(100) NOT NULL,
    ssh_key_path VARCHAR(500),
    description TEXT,
    tags TEXT[], -- Array of tags for grouping
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, error
    last_ping TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom commands table
CREATE TABLE IF NOT EXISTS custom_commands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    command TEXT NOT NULL,
    timeout INTEGER DEFAULT 300, -- seconds
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom playbooks table
CREATE TABLE IF NOT EXISTS custom_playbooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    variables JSONB, -- Playbook variables in JSON format
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Execution logs table
CREATE TABLE IF NOT EXISTS execution_logs (
    id SERIAL PRIMARY KEY,
    execution_type VARCHAR(50) NOT NULL, -- 'command', 'playbook'
    target_servers INTEGER[], -- Array of server IDs
    command_id INTEGER REFERENCES custom_commands(id),
    playbook_id INTEGER REFERENCES custom_playbooks(id),
    status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed'
    output TEXT,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    executed_by VARCHAR(100)
);

-- Server groups table for organizing servers
CREATE TABLE IF NOT EXISTS server_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between servers and groups
CREATE TABLE IF NOT EXISTS server_group_members (
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES server_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (server_id, group_id)
);

-- AWX integration table to map our entities to AWX
CREATE TABLE IF NOT EXISTS awx_integration (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'server', 'playbook', 'command'
    entity_id INTEGER NOT NULL,
    awx_inventory_id INTEGER,
    awx_job_template_id INTEGER,
    awx_project_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_servers_tags ON servers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_type ON execution_logs(execution_type);
CREATE INDEX IF NOT EXISTS idx_execution_logs_started_at ON execution_logs(started_at);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_commands_updated_at BEFORE UPDATE ON custom_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_playbooks_updated_at BEFORE UPDATE ON custom_playbooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

