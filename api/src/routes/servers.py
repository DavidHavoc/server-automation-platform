from flask import Blueprint, request, jsonify
from src.models.server import db, Server, CustomCommand, CustomPlaybook, ExecutionLog
from datetime import datetime
import paramiko
import os
import json

servers_bp = Blueprint('servers', __name__)

@servers_bp.route('/servers', methods=['GET'])
def get_servers():
    """Get all servers"""
    try:
        servers = Server.query.all()
        return jsonify([server.to_dict() for server in servers])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/servers', methods=['POST'])
def create_server():
    """Create a new server"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'hostname', 'ip_address', 'username']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if server name already exists
        existing_server = Server.query.filter_by(name=data['name']).first()
        if existing_server:
            return jsonify({'error': 'Server name already exists'}), 400
        
        # Create new server
        server = Server(
            name=data['name'],
            hostname=data['hostname'],
            ip_address=data['ip_address'],
            port=data.get('port', 22),
            username=data['username'],
            ssh_key_path=data.get('ssh_key_path'),
            description=data.get('description'),
            tags=data.get('tags', [])
        )
        
        db.session.add(server)
        db.session.commit()
        
        return jsonify(server.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/servers/<int:server_id>', methods=['GET'])
def get_server(server_id):
    """Get a specific server"""
    try:
        server = Server.query.get_or_404(server_id)
        return jsonify(server.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/servers/<int:server_id>', methods=['PUT'])
def update_server(server_id):
    """Update a server"""
    try:
        server = Server.query.get_or_404(server_id)
        data = request.get_json()
        
        # Update fields
        for field in ['name', 'hostname', 'ip_address', 'port', 'username', 'ssh_key_path', 'description', 'tags']:
            if field in data:
                setattr(server, field, data[field])
        
        server.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(server.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/servers/<int:server_id>', methods=['DELETE'])
def delete_server(server_id):
    """Delete a server"""
    try:
        server = Server.query.get_or_404(server_id)
        db.session.delete(server)
        db.session.commit()
        
        return jsonify({'message': 'Server deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/servers/<int:server_id>/ping', methods=['POST'])
def ping_server(server_id):
    """Test SSH connection to a server"""
    try:
        server = Server.query.get_or_404(server_id)
        
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            # Connect to server
            if server.ssh_key_path and os.path.exists(server.ssh_key_path):
                ssh.connect(
                    hostname=server.hostname,
                    port=server.port,
                    username=server.username,
                    key_filename=server.ssh_key_path,
                    timeout=10
                )
            else:
                # For demo purposes, we'll assume password authentication
                # In production, you'd want to handle this more securely
                ssh.connect(
                    hostname=server.hostname,
                    port=server.port,
                    username=server.username,
                    timeout=10
                )
            
            # Execute a simple command
            stdin, stdout, stderr = ssh.exec_command('echo "Connection successful"')
            output = stdout.read().decode().strip()
            
            # Update server status
            server.status = 'active'
            server.last_ping = datetime.utcnow()
            db.session.commit()
            
            ssh.close()
            
            return jsonify({
                'status': 'success',
                'message': 'Server is reachable',
                'output': output
            })
            
        except Exception as ssh_error:
            server.status = 'error'
            server.last_ping = datetime.utcnow()
            db.session.commit()
            
            ssh.close()
            
            return jsonify({
                'status': 'error',
                'message': f'SSH connection failed: {str(ssh_error)}'
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/commands', methods=['GET'])
def get_commands():
    """Get all custom commands"""
    try:
        commands = CustomCommand.query.all()
        return jsonify([command.to_dict() for command in commands])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/commands', methods=['POST'])
def create_command():
    """Create a new custom command"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'command']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if command name already exists
        existing_command = CustomCommand.query.filter_by(name=data['name']).first()
        if existing_command:
            return jsonify({'error': 'Command name already exists'}), 400
        
        # Create new command
        command = CustomCommand(
            name=data['name'],
            description=data.get('description'),
            command=data['command'],
            timeout=data.get('timeout', 300),
            created_by=data.get('created_by', 'admin')
        )
        
        db.session.add(command)
        db.session.commit()
        
        return jsonify(command.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/commands/<int:command_id>/execute', methods=['POST'])
def execute_command(command_id):
    """Execute a command on selected servers"""
    try:
        command = CustomCommand.query.get_or_404(command_id)
        data = request.get_json()
        server_ids = data.get('server_ids', [])
        
        if not server_ids:
            return jsonify({'error': 'No servers specified'}), 400
        
        # Create execution log
        execution_log = ExecutionLog(
            execution_type='command',
            target_servers=server_ids,
            command_id=command_id,
            status='running',
            executed_by=data.get('executed_by', 'admin')
        )
        db.session.add(execution_log)
        db.session.commit()
        
        results = []
        
        for server_id in server_ids:
            server = Server.query.get(server_id)
            if not server:
                continue
                
            try:
                # Execute command via SSH
                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                if server.ssh_key_path and os.path.exists(server.ssh_key_path):
                    ssh.connect(
                        hostname=server.hostname,
                        port=server.port,
                        username=server.username,
                        key_filename=server.ssh_key_path,
                        timeout=10
                    )
                else:
                    ssh.connect(
                        hostname=server.hostname,
                        port=server.port,
                        username=server.username,
                        timeout=10
                    )
                
                stdin, stdout, stderr = ssh.exec_command(command.command, timeout=command.timeout)
                output = stdout.read().decode()
                error = stderr.read().decode()
                
                ssh.close()
                
                results.append({
                    'server_id': server_id,
                    'server_name': server.name,
                    'status': 'success',
                    'output': output,
                    'error': error
                })
                
            except Exception as ssh_error:
                results.append({
                    'server_id': server_id,
                    'server_name': server.name,
                    'status': 'error',
                    'error': str(ssh_error)
                })
        
        # Update execution log
        execution_log.status = 'completed'
        execution_log.completed_at = datetime.utcnow()
        execution_log.output = json.dumps(results)
        db.session.commit()
        
        return jsonify({
            'execution_id': execution_log.id,
            'results': results
        })
        
    except Exception as e:
        if 'execution_log' in locals():
            execution_log.status = 'failed'
            execution_log.error_message = str(e)
            execution_log.completed_at = datetime.utcnow()
            db.session.commit()
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/executions', methods=['GET'])
def get_executions():
    """Get execution history"""
    try:
        executions = ExecutionLog.query.order_by(ExecutionLog.started_at.desc()).limit(100).all()
        return jsonify([execution.to_dict() for execution in executions])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@servers_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

