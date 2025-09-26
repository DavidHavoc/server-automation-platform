import requests
import json
import os
import logging
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class AWXClient:
    def __init__(self, base_url=None, username=None, password=None):
        self.base_url = base_url or os.environ.get('AWX_HOST', 'http://awx_web:8052')
        self.username = username or os.environ.get('AWX_USERNAME', 'admin')
        self.password = password or os.environ.get('AWX_PASSWORD', 'password')
        
        if not self.base_url.startswith('http'):
            self.base_url = f"http://{self.base_url}"
        
        self.session = requests.Session()
        self.session.auth = (self.username, self.password)
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def _make_request(self, method, endpoint, data=None, params=None):
        """Make a request to AWX API"""
        url = urljoin(f"{self.base_url}/api/v2/", endpoint.lstrip('/'))
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=30
            )
            
            if response.status_code in [200, 201, 202, 204]:
                if response.content:
                    return response.json()
                return {}
            else:
                logger.error(f"AWX API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"AWX API request failed: {str(e)}")
            return None
    
    def get_organizations(self):
        """Get all organizations"""
        return self._make_request('GET', '/organizations/')
    
    def create_organization(self, name, description=""):
        """Create a new organization"""
        data = {
            'name': name,
            'description': description
        }
        return self._make_request('POST', '/organizations/', data)
    
    def get_inventories(self, organization_id=None):
        """Get inventories"""
        params = {}
        if organization_id:
            params['organization'] = organization_id
        return self._make_request('GET', '/inventories/', params=params)
    
    def create_inventory(self, name, organization_id, description=""):
        """Create a new inventory"""
        data = {
            'name': name,
            'description': description,
            'organization': organization_id
        }
        return self._make_request('POST', '/inventories/', data)
    
    def get_hosts(self, inventory_id=None):
        """Get hosts"""
        params = {}
        if inventory_id:
            params['inventory'] = inventory_id
        return self._make_request('GET', '/hosts/', params=params)
    
    def create_host(self, name, inventory_id, variables=None):
        """Create a new host"""
        data = {
            'name': name,
            'inventory': inventory_id,
            'variables': variables or {}
        }
        return self._make_request('POST', '/hosts/', data)
    
    def get_credentials(self):
        """Get all credentials"""
        return self._make_request('GET', '/credentials/')
    
    def create_ssh_credential(self, name, username, ssh_key_data, organization_id):
        """Create SSH credential"""
        data = {
            'name': name,
            'credential_type': 1,  # Machine credential type
            'organization': organization_id,
            'inputs': {
                'username': username,
                'ssh_key_data': ssh_key_data
            }
        }
        return self._make_request('POST', '/credentials/', data)
    
    def get_projects(self):
        """Get all projects"""
        return self._make_request('GET', '/projects/')
    
    def create_project(self, name, organization_id, scm_type='git', scm_url=None, local_path=None):
        """Create a new project"""
        data = {
            'name': name,
            'organization': organization_id,
            'scm_type': scm_type
        }
        
        if scm_url:
            data['scm_url'] = scm_url
        if local_path:
            data['local_path'] = local_path
            
        return self._make_request('POST', '/projects/', data)
    
    def get_job_templates(self):
        """Get all job templates"""
        return self._make_request('GET', '/job_templates/')
    
    def create_job_template(self, name, job_type, inventory_id, project_id, playbook, credential_id=None):
        """Create a new job template"""
        data = {
            'name': name,
            'job_type': job_type,
            'inventory': inventory_id,
            'project': project_id,
            'playbook': playbook
        }
        
        if credential_id:
            data['credential'] = credential_id
            
        return self._make_request('POST', '/job_templates/', data)
    
    def launch_job_template(self, template_id, extra_vars=None):
        """Launch a job template"""
        data = {}
        if extra_vars:
            data['extra_vars'] = extra_vars
            
        return self._make_request('POST', f'/job_templates/{template_id}/launch/', data)
    
    def get_jobs(self, limit=50):
        """Get job history"""
        params = {'page_size': limit}
        return self._make_request('GET', '/jobs/', params=params)
    
    def get_job_status(self, job_id):
        """Get job status"""
        return self._make_request('GET', f'/jobs/{job_id}/')
    
    def get_job_output(self, job_id):
        """Get job output/logs"""
        return self._make_request('GET', f'/jobs/{job_id}/stdout/')
    
    def sync_server_to_awx(self, server_data, organization_name="Default"):
        """Sync a server to AWX inventory"""
        try:
            # Get or create organization
            orgs = self.get_organizations()
            if not orgs:
                return None
                
            org = None
            for o in orgs.get('results', []):
                if o['name'] == organization_name:
                    org = o
                    break
            
            if not org:
                org = self.create_organization(organization_name)
                if not org:
                    return None
            
            # Get or create inventory
            inventories = self.get_inventories(org['id'])
            inventory = None
            inventory_name = "Server Automation Inventory"
            
            for inv in inventories.get('results', []):
                if inv['name'] == inventory_name:
                    inventory = inv
                    break
            
            if not inventory:
                inventory = self.create_inventory(inventory_name, org['id'])
                if not inventory:
                    return None
            
            # Create host
            host_variables = {
                'ansible_host': server_data['ip_address'],
                'ansible_port': server_data['port'],
                'ansible_user': server_data['username']
            }
            
            if server_data.get('ssh_key_path'):
                host_variables['ansible_ssh_private_key_file'] = server_data['ssh_key_path']
            
            host = self.create_host(
                name=server_data['name'],
                inventory_id=inventory['id'],
                variables=host_variables
            )
            
            return {
                'organization_id': org['id'],
                'inventory_id': inventory['id'],
                'host_id': host['id'] if host else None
            }
            
        except Exception as e:
            logger.error(f"Failed to sync server to AWX: {str(e)}")
            return None

