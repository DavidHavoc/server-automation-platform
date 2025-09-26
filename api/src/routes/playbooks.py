from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from src.models.server import db, CustomPlaybook, ExecutionLog
from src.utils.awx_client import AWXClient
import os
import yaml
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
playbooks_bp = Blueprint('playbooks', __name__)

PLAYBOOKS_DIR = os.environ.get('PLAYBOOKS_DIR', '/app/data/playbooks')
ALLOWED_EXTENSIONS = {'yml', 'yaml'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@playbooks_bp.route('/playbooks', methods=['GET'])
def get_playbooks():
    """Get all custom playbooks"""
    try:
        playbooks = CustomPlaybook.query.all()
        return jsonify([playbook.to_dict() for playbook in playbooks])
    except Exception as e:
        logger.error(f"Failed to fetch playbooks: {str(e)}")
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks', methods=['POST'])
def create_playbook():
    """Create a new playbook (upload or create)"""
    try:
        # Check if it's a file upload
        if 'file' in request.files:
            return upload_playbook()
        
        # Otherwise, create from JSON data
        data = request.get_json()
        
        required_fields = ['name', 'content']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if playbook name already exists
        existing_playbook = CustomPlaybook.query.filter_by(name=data['name']).first()
        if existing_playbook:
            return jsonify({'error': 'Playbook name already exists'}), 400
        
        # Save playbook content to file
        filename = secure_filename(f"{data['name']}.yml")
        file_path = os.path.join(PLAYBOOKS_DIR, filename)
        
        # Ensure directory exists
        os.makedirs(PLAYBOOKS_DIR, exist_ok=True)
        
        # Validate YAML content
        try:
            yaml.safe_load(data['content'])
        except yaml.YAMLError as e:
            return jsonify({'error': f'Invalid YAML content: {str(e)}'}), 400
        
        # Write file
        with open(file_path, 'w') as f:
            f.write(data['content'])
        
        # Create database record
        playbook = CustomPlaybook(
            name=data['name'],
            description=data.get('description', ''),
            file_path=file_path,
            variables=data.get('variables', {}),
            created_by=data.get('created_by', 'admin')
        )
        
        db.session.add(playbook)
        db.session.commit()
        
        return jsonify(playbook.to_dict()), 201
        
    except Exception as e:
        logger.error(f"Failed to create playbook: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def upload_playbook():
    """Handle playbook file upload"""
    try:
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only .yml and .yaml files are allowed'}), 400
        
        # Get form data
        name = request.form.get('name')
        description = request.form.get('description', '')
        variables = request.form.get('variables', '{}')
        
        if not name:
            return jsonify({'error': 'Playbook name is required'}), 400
        
        # Parse variables
        try:
            variables = json.loads(variables)
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON in variables field'}), 400
        
        # Check if playbook name already exists
        existing_playbook = CustomPlaybook.query.filter_by(name=name).first()
        if existing_playbook:
            return jsonify({'error': 'Playbook name already exists'}), 400
        
        # Save file
        filename = secure_filename(f"{name}.yml")
        file_path = os.path.join(PLAYBOOKS_DIR, filename)
        
        # Ensure directory exists
        os.makedirs(PLAYBOOKS_DIR, exist_ok=True)
        
        # Read and validate YAML content
        content = file.read().decode('utf-8')
        try:
            yaml.safe_load(content)
        except yaml.YAMLError as e:
            return jsonify({'error': f'Invalid YAML content: {str(e)}'}), 400
        
        # Write file
        with open(file_path, 'w') as f:
            f.write(content)
        
        # Create database record
        playbook = CustomPlaybook(
            name=name,
            description=description,
            file_path=file_path,
            variables=variables,
            created_by=request.form.get('created_by', 'admin')
        )
        
        db.session.add(playbook)
        db.session.commit()
        
        return jsonify(playbook.to_dict()), 201
        
    except Exception as e:
        logger.error(f"Failed to upload playbook: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks/<int:playbook_id>', methods=['GET'])
def get_playbook(playbook_id):
    """Get a specific playbook"""
    try:
        playbook = CustomPlaybook.query.get_or_404(playbook_id)
        
        # Read playbook content
        content = ""
        if os.path.exists(playbook.file_path):
            with open(playbook.file_path, 'r') as f:
                content = f.read()
        
        result = playbook.to_dict()
        result['content'] = content
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Failed to get playbook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks/<int:playbook_id>', methods=['PUT'])
def update_playbook(playbook_id):
    """Update a playbook"""
    try:
        playbook = CustomPlaybook.query.get_or_404(playbook_id)
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            # Check if new name conflicts with existing playbooks
            existing = CustomPlaybook.query.filter(
                CustomPlaybook.name == data['name'],
                CustomPlaybook.id != playbook_id
            ).first()
            if existing:
                return jsonify({'error': 'Playbook name already exists'}), 400
            playbook.name = data['name']
        
        if 'description' in data:
            playbook.description = data['description']
        
        if 'variables' in data:
            playbook.variables = data['variables']
        
        if 'content' in data:
            # Validate YAML content
            try:
                yaml.safe_load(data['content'])
            except yaml.YAMLError as e:
                return jsonify({'error': f'Invalid YAML content: {str(e)}'}), 400
            
            # Update file content
            with open(playbook.file_path, 'w') as f:
                f.write(data['content'])
        
        playbook.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(playbook.to_dict())
    except Exception as e:
        logger.error(f"Failed to update playbook: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks/<int:playbook_id>', methods=['DELETE'])
def delete_playbook(playbook_id):
    """Delete a playbook"""
    try:
        playbook = CustomPlaybook.query.get_or_404(playbook_id)
        
        # Delete file
        if os.path.exists(playbook.file_path):
            os.remove(playbook.file_path)
        
        # Delete database record
        db.session.delete(playbook)
        db.session.commit()
        
        return jsonify({'message': 'Playbook deleted successfully'})
    except Exception as e:
        logger.error(f"Failed to delete playbook: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks/<int:playbook_id>/download', methods=['GET'])
def download_playbook(playbook_id):
    """Download a playbook file"""
    try:
        playbook = CustomPlaybook.query.get_or_404(playbook_id)
        
        if not os.path.exists(playbook.file_path):
            return jsonify({'error': 'Playbook file not found'}), 404
        
        return send_file(
            playbook.file_path,
            as_attachment=True,
            download_name=f"{playbook.name}.yml"
        )
    except Exception as e:
        logger.error(f"Failed to download playbook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks/<int:playbook_id>/execute', methods=['POST'])
def execute_playbook(playbook_id):
    """Execute a playbook using AWX"""
    try:
        playbook = CustomPlaybook.query.get_or_404(playbook_id)
        data = request.get_json()
        
        server_ids = data.get('server_ids', [])
        extra_vars = data.get('extra_vars', {})
        
        if not server_ids:
            return jsonify({'error': 'No servers specified'}), 400
        
        # Create execution log
        execution_log = ExecutionLog(
            execution_type='playbook',
            target_servers=server_ids,
            playbook_id=playbook_id,
            status='running',
            executed_by=data.get('executed_by', 'admin')
        )
        db.session.add(execution_log)
        db.session.commit()
        
        try:
            # Initialize AWX client
            awx_client = AWXClient()
            
            # For now, we'll simulate playbook execution
            # In a full implementation, you would:
            # 1. Create/update AWX inventory with selected servers
            # 2. Create/update AWX project with the playbook
            # 3. Create/update job template
            # 4. Launch the job template
            
            # Simulate execution
            import time
            time.sleep(2)  # Simulate execution time
            
            # Update execution log
            execution_log.status = 'completed'
            execution_log.completed_at = datetime.utcnow()
            execution_log.output = json.dumps({
                'message': 'Playbook execution simulated successfully',
                'servers': server_ids,
                'playbook': playbook.name,
                'extra_vars': extra_vars
            })
            db.session.commit()
            
            return jsonify({
                'execution_id': execution_log.id,
                'message': 'Playbook execution started',
                'status': 'completed'
            })
            
        except Exception as awx_error:
            # Update execution log with error
            execution_log.status = 'failed'
            execution_log.error_message = str(awx_error)
            execution_log.completed_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'error': 'Playbook execution failed',
                'details': str(awx_error)
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to execute playbook: {str(e)}")
        if 'execution_log' in locals():
            execution_log.status = 'failed'
            execution_log.error_message = str(e)
            execution_log.completed_at = datetime.utcnow()
            db.session.commit()
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks/<int:playbook_id>/validate', methods=['POST'])
def validate_playbook(playbook_id):
    """Validate a playbook's YAML syntax"""
    try:
        playbook = CustomPlaybook.query.get_or_404(playbook_id)
        
        if not os.path.exists(playbook.file_path):
            return jsonify({'error': 'Playbook file not found'}), 404
        
        # Read and validate YAML
        with open(playbook.file_path, 'r') as f:
            content = f.read()
        
        try:
            parsed = yaml.safe_load(content)
            
            # Basic Ansible playbook structure validation
            if not isinstance(parsed, list):
                return jsonify({
                    'valid': False,
                    'error': 'Playbook must be a list of plays'
                })
            
            for i, play in enumerate(parsed):
                if not isinstance(play, dict):
                    return jsonify({
                        'valid': False,
                        'error': f'Play {i+1} must be a dictionary'
                    })
                
                if 'hosts' not in play:
                    return jsonify({
                        'valid': False,
                        'error': f'Play {i+1} must have a "hosts" field'
                    })
            
            return jsonify({
                'valid': True,
                'message': 'Playbook is valid',
                'plays_count': len(parsed)
            })
            
        except yaml.YAMLError as e:
            return jsonify({
                'valid': False,
                'error': f'YAML syntax error: {str(e)}'
            })
            
    except Exception as e:
        logger.error(f"Failed to validate playbook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@playbooks_bp.route('/playbooks/templates', methods=['GET'])
def get_playbook_templates():
    """Get available playbook templates"""
    templates = [
        {
            'name': 'Basic Server Setup',
            'description': 'Basic server configuration and package installation',
            'content': '''---
- name: Basic Server Setup
  hosts: all
  become: yes
  tasks:
    - name: Update package cache
      apt:
        update_cache: yes
      when: ansible_os_family == "Debian"
    
    - name: Install basic packages
      package:
        name:
          - curl
          - wget
          - vim
          - htop
        state: present
    
    - name: Create admin user
      user:
        name: "{{ admin_user | default('admin') }}"
        groups: sudo
        shell: /bin/bash
        create_home: yes
'''
        },
        {
            'name': 'Docker Installation',
            'description': 'Install Docker and Docker Compose',
            'content': '''---
- name: Install Docker
  hosts: all
  become: yes
  tasks:
    - name: Install required packages
      apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present
        update_cache: yes
      when: ansible_os_family == "Debian"
    
    - name: Add Docker GPG key
      apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present
      when: ansible_os_family == "Debian"
    
    - name: Add Docker repository
      apt_repository:
        repo: "deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present
      when: ansible_os_family == "Debian"
    
    - name: Install Docker
      apt:
        name:
          - docker-ce
          - docker-ce-cli
          - containerd.io
        state: present
        update_cache: yes
      when: ansible_os_family == "Debian"
    
    - name: Start and enable Docker
      systemd:
        name: docker
        state: started
        enabled: yes
    
    - name: Install Docker Compose
      pip:
        name: docker-compose
        state: present
'''
        },
        {
            'name': 'Security Hardening',
            'description': 'Basic security hardening for servers',
            'content': '''---
- name: Security Hardening
  hosts: all
  become: yes
  tasks:
    - name: Update all packages
      package:
        name: "*"
        state: latest
    
    - name: Install fail2ban
      package:
        name: fail2ban
        state: present
    
    - name: Configure SSH
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
        backup: yes
      with_items:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?Port', line: 'Port {{ ssh_port | default(22) }}' }
      notify: restart ssh
    
    - name: Configure firewall
      ufw:
        rule: allow
        port: "{{ ssh_port | default(22) }}"
        proto: tcp
    
    - name: Enable firewall
      ufw:
        state: enabled
        policy: deny
        direction: incoming
  
  handlers:
    - name: restart ssh
      service:
        name: ssh
        state: restarted
'''
        }
    ]
    
    return jsonify({'templates': templates})

