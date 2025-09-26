from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY, INET
import json

db = SQLAlchemy()

class Server(db.Model):
    __tablename__ = 'servers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    hostname = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(INET, nullable=False)
    port = db.Column(db.Integer, default=22)
    username = db.Column(db.String(100), nullable=False)
    ssh_key_path = db.Column(db.String(500))
    description = db.Column(db.Text)
    tags = db.Column(ARRAY(db.String), default=[])
    status = db.Column(db.String(50), default='active')
    last_ping = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'hostname': self.hostname,
            'ip_address': str(self.ip_address),
            'port': self.port,
            'username': self.username,
            'ssh_key_path': self.ssh_key_path,
            'description': self.description,
            'tags': self.tags or [],
            'status': self.status,
            'last_ping': self.last_ping.isoformat() if self.last_ping else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class CustomCommand(db.Model):
    __tablename__ = 'custom_commands'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    description = db.Column(db.Text)
    command = db.Column(db.Text, nullable=False)
    timeout = db.Column(db.Integer, default=300)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'command': self.command,
            'timeout': self.timeout,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class CustomPlaybook(db.Model):
    __tablename__ = 'custom_playbooks'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    description = db.Column(db.Text)
    file_path = db.Column(db.String(500), nullable=False)
    variables = db.Column(db.JSON)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'file_path': self.file_path,
            'variables': self.variables or {},
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ExecutionLog(db.Model):
    __tablename__ = 'execution_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    execution_type = db.Column(db.String(50), nullable=False)
    target_servers = db.Column(ARRAY(db.Integer))
    command_id = db.Column(db.Integer, db.ForeignKey('custom_commands.id'))
    playbook_id = db.Column(db.Integer, db.ForeignKey('custom_playbooks.id'))
    status = db.Column(db.String(50), nullable=False)
    output = db.Column(db.Text)
    error_message = db.Column(db.Text)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    executed_by = db.Column(db.String(100))
    
    def to_dict(self):
        return {
            'id': self.id,
            'execution_type': self.execution_type,
            'target_servers': self.target_servers or [],
            'command_id': self.command_id,
            'playbook_id': self.playbook_id,
            'status': self.status,
            'output': self.output,
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'executed_by': self.executed_by
        }

class ServerGroup(db.Model):
    __tablename__ = 'server_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ServerGroupMember(db.Model):
    __tablename__ = 'server_group_members'
    
    server_id = db.Column(db.Integer, db.ForeignKey('servers.id'), primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('server_groups.id'), primary_key=True)

