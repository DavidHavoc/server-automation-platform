import os
import paramiko
import subprocess
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)

class SSHManager:
    def __init__(self, ssh_keys_dir="/app/data/ssh_keys"):
        self.ssh_keys_dir = ssh_keys_dir
        os.makedirs(ssh_keys_dir, exist_ok=True)
    
    def generate_ssh_key_pair(self, key_name):
        """Generate a new SSH key pair"""
        try:
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            
            # Get public key
            public_key = private_key.public_key()
            
            # Serialize private key
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            # Serialize public key in OpenSSH format
            public_ssh = public_key.public_bytes(
                encoding=serialization.Encoding.OpenSSH,
                format=serialization.PublicFormat.OpenSSH
            )
            
            # Save keys to files
            private_key_path = os.path.join(self.ssh_keys_dir, f"{key_name}")
            public_key_path = os.path.join(self.ssh_keys_dir, f"{key_name}.pub")
            
            with open(private_key_path, 'wb') as f:
                f.write(private_pem)
            os.chmod(private_key_path, 0o600)
            
            with open(public_key_path, 'wb') as f:
                f.write(public_ssh)
            os.chmod(public_key_path, 0o644)
            
            return {
                'private_key_path': private_key_path,
                'public_key_path': public_key_path,
                'public_key_content': public_ssh.decode('utf-8')
            }
            
        except Exception as e:
            logger.error(f"Failed to generate SSH key pair: {str(e)}")
            raise
    
    def test_ssh_connection(self, hostname, port, username, key_path=None, password=None, timeout=10):
        """Test SSH connection to a server"""
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            if key_path and os.path.exists(key_path):
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    key_filename=key_path,
                    timeout=timeout
                )
            elif password:
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    password=password,
                    timeout=timeout
                )
            else:
                # Try without authentication (for testing)
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    timeout=timeout
                )
            
            # Test with a simple command
            stdin, stdout, stderr = ssh.exec_command('echo "SSH connection successful"')
            output = stdout.read().decode().strip()
            error = stderr.read().decode().strip()
            
            ssh.close()
            
            return {
                'success': True,
                'output': output,
                'error': error
            }
            
        except Exception as e:
            ssh.close()
            return {
                'success': False,
                'error': str(e)
            }
    
    def execute_command(self, hostname, port, username, command, key_path=None, password=None, timeout=300):
        """Execute a command on a remote server via SSH"""
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            if key_path and os.path.exists(key_path):
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    key_filename=key_path,
                    timeout=10
                )
            elif password:
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    password=password,
                    timeout=10
                )
            else:
                ssh.connect(
                    hostname=hostname,
                    port=port,
                    username=username,
                    timeout=10
                )
            
            # Execute command
            stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
            
            # Read output
            output = stdout.read().decode()
            error = stderr.read().decode()
            exit_code = stdout.channel.recv_exit_status()
            
            ssh.close()
            
            return {
                'success': exit_code == 0,
                'exit_code': exit_code,
                'output': output,
                'error': error
            }
            
        except Exception as e:
            ssh.close()
            return {
                'success': False,
                'error': str(e),
                'exit_code': -1
            }
    
    def copy_public_key_to_server(self, hostname, port, username, public_key_content, password=None):
        """Copy public key to server's authorized_keys"""
        try:
            # Use ssh-copy-id equivalent
            command = f'echo "{public_key_content}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
            
            result = self.execute_command(
                hostname=hostname,
                port=port,
                username=username,
                command=command,
                password=password
            )
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_server_info(self, hostname, port, username, key_path=None, password=None):
        """Get basic server information"""
        commands = {
            'hostname': 'hostname',
            'os_info': 'cat /etc/os-release | head -5',
            'uptime': 'uptime',
            'disk_usage': 'df -h /',
            'memory_info': 'free -h',
            'cpu_info': 'nproc'
        }
        
        results = {}
        
        for info_type, command in commands.items():
            result = self.execute_command(
                hostname=hostname,
                port=port,
                username=username,
                command=command,
                key_path=key_path,
                password=password,
                timeout=30
            )
            
            if result['success']:
                results[info_type] = result['output'].strip()
            else:
                results[info_type] = f"Error: {result['error']}"
        
        return results

