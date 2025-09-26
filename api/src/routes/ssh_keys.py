from flask import Blueprint, request, jsonify
from src.utils.ssh_manager import SSHManager
from src.models.server import db, Server
import os
import logging

logger = logging.getLogger(__name__)
ssh_keys_bp = Blueprint('ssh_keys', __name__)
ssh_manager = SSHManager()

@ssh_keys_bp.route('/ssh-keys/generate', methods=['POST'])
def generate_ssh_key():
    """Generate a new SSH key pair"""
    try:
        data = request.get_json()
        key_name = data.get('key_name')
        
        if not key_name:
            return jsonify({'error': 'Key name is required'}), 400
        
        # Generate key pair
        result = ssh_manager.generate_ssh_key_pair(key_name)
        
        return jsonify({
            'message': 'SSH key pair generated successfully',
            'private_key_path': result['private_key_path'],
            'public_key_path': result['public_key_path'],
            'public_key_content': result['public_key_content']
        })
        
    except Exception as e:
        logger.error(f"Failed to generate SSH key: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ssh_keys_bp.route('/ssh-keys/test-connection', methods=['POST'])
def test_ssh_connection():
    """Test SSH connection to a server"""
    try:
        data = request.get_json()
        
        required_fields = ['hostname', 'port', 'username']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        result = ssh_manager.test_ssh_connection(
            hostname=data['hostname'],
            port=data['port'],
            username=data['username'],
            key_path=data.get('key_path'),
            password=data.get('password'),
            timeout=data.get('timeout', 10)
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"SSH connection test failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ssh_keys_bp.route('/ssh-keys/copy-to-server', methods=['POST'])
def copy_public_key():
    """Copy public key to server's authorized_keys"""
    try:
        data = request.get_json()
        
        required_fields = ['hostname', 'port', 'username', 'public_key_content']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        result = ssh_manager.copy_public_key_to_server(
            hostname=data['hostname'],
            port=data['port'],
            username=data['username'],
            public_key_content=data['public_key_content'],
            password=data.get('password')
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to copy public key: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ssh_keys_bp.route('/servers/<int:server_id>/info', methods=['GET'])
def get_server_info(server_id):
    """Get detailed server information via SSH"""
    try:
        server = Server.query.get_or_404(server_id)
        
        result = ssh_manager.get_server_info(
            hostname=server.hostname,
            port=server.port,
            username=server.username,
            key_path=server.ssh_key_path
        )
        
        return jsonify({
            'server_id': server_id,
            'server_name': server.name,
            'info': result
        })
        
    except Exception as e:
        logger.error(f"Failed to get server info: {str(e)}")
        return jsonify({'error': str(e)}), 500

@ssh_keys_bp.route('/servers/<int:server_id>/setup-ssh', methods=['POST'])
def setup_ssh_for_server(server_id):
    """Setup SSH key authentication for a server"""
    try:
        server = Server.query.get_or_404(server_id)
        data = request.get_json()
        
        # Generate SSH key pair for this server
        key_name = f"server_{server.id}_{server.name}"
        key_result = ssh_manager.generate_ssh_key_pair(key_name)
        
        # Copy public key to server (requires password for initial setup)
        password = data.get('password')
        if not password:
            return jsonify({'error': 'Password required for initial SSH setup'}), 400
        
        copy_result = ssh_manager.copy_public_key_to_server(
            hostname=server.hostname,
            port=server.port,
            username=server.username,
            public_key_content=key_result['public_key_content'],
            password=password
        )
        
        if not copy_result['success']:
            return jsonify({
                'error': 'Failed to copy public key to server',
                'details': copy_result['error']
            }), 400
        
        # Update server with SSH key path
        server.ssh_key_path = key_result['private_key_path']
        db.session.commit()
        
        # Test the new key-based connection
        test_result = ssh_manager.test_ssh_connection(
            hostname=server.hostname,
            port=server.port,
            username=server.username,
            key_path=key_result['private_key_path']
        )
        
        return jsonify({
            'message': 'SSH key authentication setup successfully',
            'private_key_path': key_result['private_key_path'],
            'public_key_path': key_result['public_key_path'],
            'connection_test': test_result
        })
        
    except Exception as e:
        logger.error(f"Failed to setup SSH for server: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssh_keys_bp.route('/ssh-keys/list', methods=['GET'])
def list_ssh_keys():
    """List all SSH keys in the keys directory"""
    try:
        keys_dir = ssh_manager.ssh_keys_dir
        
        if not os.path.exists(keys_dir):
            return jsonify({'keys': []})
        
        keys = []
        for filename in os.listdir(keys_dir):
            if filename.endswith('.pub'):
                key_name = filename[:-4]  # Remove .pub extension
                private_key_path = os.path.join(keys_dir, key_name)
                public_key_path = os.path.join(keys_dir, filename)
                
                if os.path.exists(private_key_path):
                    # Read public key content
                    with open(public_key_path, 'r') as f:
                        public_key_content = f.read().strip()
                    
                    keys.append({
                        'name': key_name,
                        'private_key_path': private_key_path,
                        'public_key_path': public_key_path,
                        'public_key_content': public_key_content,
                        'created': os.path.getctime(private_key_path)
                    })
        
        return jsonify({'keys': keys})
        
    except Exception as e:
        logger.error(f"Failed to list SSH keys: {str(e)}")
        return jsonify({'error': str(e)}), 500

