import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Checkbox } from './ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Plus, FileText, Edit, Trash2, Play, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from './ui/use-toast'

export function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState([])
  const [servers, setServers] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState(null)
  const [executingPlaybook, setExecutingPlaybook] = useState(null)
  const [selectedServers, setSelectedServers] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    variables: '{}'
  })

  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    variables: '{}'
  })

  useEffect(() => {
    fetchPlaybooks()
    fetchServers()
    fetchTemplates()
  }, [])

  const fetchPlaybooks = async () => {
    try {
      const response = await fetch('/api/playbooks')
      const data = await response.json()
      setPlaybooks(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch playbooks",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers')
      const data = await response.json()
      setServers(data.filter(server => server.status === 'active'))
    } catch (error) {
      console.error('Failed to fetch servers:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/playbooks/templates')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      // Validate JSON variables
      JSON.parse(formData.variables)
    } catch (e) {
      toast({
        title: "Error",
        description: "Invalid JSON in variables field",
        variant: "destructive"
      })
      return
    }

    try {
      const url = editingPlaybook ? `/api/playbooks/${editingPlaybook.id}` : '/api/playbooks'
      const method = editingPlaybook ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          variables: JSON.parse(formData.variables)
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Playbook ${editingPlaybook ? 'updated' : 'created'} successfully`
        })
        setDialogOpen(false)
        resetForm()
        fetchPlaybooks()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save playbook",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save playbook",
        variant: "destructive"
      })
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    const fileInput = document.getElementById('playbook-file')
    const file = fileInput.files[0]
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive"
      })
      return
    }

    try {
      // Validate JSON variables
      JSON.parse(uploadData.variables)
    } catch (e) {
      toast({
        title: "Error",
        description: "Invalid JSON in variables field",
        variant: "destructive"
      })
      return
    }

    try {
      const formDataObj = new FormData()
      formDataObj.append('file', file)
      formDataObj.append('name', uploadData.name)
      formDataObj.append('description', uploadData.description)
      formDataObj.append('variables', uploadData.variables)
      
      const response = await fetch('/api/playbooks', {
        method: 'POST',
        body: formDataObj
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Playbook uploaded successfully"
        })
        setUploadDialogOpen(false)
        resetUploadForm()
        fetchPlaybooks()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to upload playbook",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload playbook",
        variant: "destructive"
      })
    }
  }

  const handleEdit = async (playbook) => {
    try {
      const response = await fetch(`/api/playbooks/${playbook.id}`)
      const data = await response.json()
      
      setEditingPlaybook(data)
      setFormData({
        name: data.name,
        description: data.description || '',
        content: data.content || '',
        variables: JSON.stringify(data.variables || {}, null, 2)
      })
      setDialogOpen(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load playbook for editing",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (playbookId) => {
    if (!confirm('Are you sure you want to delete this playbook?')) return

    try {
      const response = await fetch(`/api/playbooks/${playbookId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Playbook deleted successfully"
        })
        fetchPlaybooks()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete playbook",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete playbook",
        variant: "destructive"
      })
    }
  }

  const handleExecute = (playbook) => {
    setExecutingPlaybook(playbook)
    setSelectedServers([])
    setExecuteDialogOpen(true)
  }

  const handleExecutePlaybook = async () => {
    if (selectedServers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one server",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch(`/api/playbooks/${executingPlaybook.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          server_ids: selectedServers,
          executed_by: 'admin'
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: `Playbook executed on ${selectedServers.length} server(s)`
        })
        setExecuteDialogOpen(false)
        setSelectedServers([])
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to execute playbook",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute playbook",
        variant: "destructive"
      })
    }
  }

  const handleDownload = async (playbookId, playbookName) => {
    try {
      const response = await fetch(`/api/playbooks/${playbookId}/download`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${playbookName}.yml`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        toast({
          title: "Error",
          description: "Failed to download playbook",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download playbook",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      content: '',
      variables: '{}'
    })
    setEditingPlaybook(null)
    setSelectedTemplate('')
  }

  const resetUploadForm = () => {
    setUploadData({
      name: '',
      description: '',
      variables: '{}'
    })
    const fileInput = document.getElementById('playbook-file')
    if (fileInput) fileInput.value = ''
  }

  const loadTemplate = (templateContent) => {
    setFormData(prev => ({
      ...prev,
      content: templateContent
    }))
  }

  const toggleServerSelection = (serverId) => {
    setSelectedServers(prev => 
      prev.includes(serverId) 
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    )
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Playbooks</h1>
          <p className="text-gray-600 mt-2">Manage Ansible playbooks for automation</p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetUploadForm}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload Playbook</DialogTitle>
                <DialogDescription>
                  Upload an existing Ansible playbook file
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="upload-name" className="text-right">Name</Label>
                    <Input
                      id="upload-name"
                      value={uploadData.name}
                      onChange={(e) => setUploadData({...uploadData, name: e.target.value})}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="upload-description" className="text-right">Description</Label>
                    <Textarea
                      id="upload-description"
                      value={uploadData.description}
                      onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="playbook-file" className="text-right">File</Label>
                    <Input
                      id="playbook-file"
                      type="file"
                      accept=".yml,.yaml"
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="upload-variables" className="text-right">Variables</Label>
                    <Textarea
                      id="upload-variables"
                      value={uploadData.variables}
                      onChange={(e) => setUploadData({...uploadData, variables: e.target.value})}
                      className="col-span-3"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Upload Playbook</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Playbook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlaybook ? 'Edit Playbook' : 'Create New Playbook'}
                </DialogTitle>
                <DialogDescription>
                  {editingPlaybook ? 'Update playbook details' : 'Create a new Ansible playbook'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="variables" className="text-right">Variables</Label>
                      <Textarea
                        id="variables"
                        value={formData.variables}
                        onChange={(e) => setFormData({...formData, variables: e.target.value})}
                        className="col-span-3"
                        placeholder='{"key": "value"}'
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="content" className="space-y-4">
                    <div className="grid gap-4">
                      <Label htmlFor="content">Playbook Content (YAML)</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="---\n- name: Example Playbook\n  hosts: all\n  tasks:\n    - name: Example task\n      debug:\n        msg: 'Hello World'"
                        required
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="templates" className="space-y-4">
                    <div className="grid gap-4">
                      <Label>Choose a template to start with:</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate !== '' && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            {templates[parseInt(selectedTemplate)]?.description}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => loadTemplate(templates[parseInt(selectedTemplate)]?.content)}
                          >
                            Use This Template
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-6">
                  <Button type="submit">
                    {editingPlaybook ? 'Update' : 'Create'} Playbook
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Execute Playbook Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Execute Playbook</DialogTitle>
            <DialogDescription>
              Select servers to execute "{executingPlaybook?.name}" on
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Playbook:</p>
              <p className="text-sm text-gray-600">{executingPlaybook?.description || 'No description'}</p>
            </div>
            <div className="space-y-2">
              <Label>Select Servers:</Label>
              {servers.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {servers.map((server) => (
                    <div key={server.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`server-${server.id}`}
                        checked={selectedServers.includes(server.id)}
                        onCheckedChange={() => toggleServerSelection(server.id)}
                      />
                      <Label htmlFor={`server-${server.id}`} className="flex-1">
                        {server.name} ({server.ip_address})
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No active servers available</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleExecutePlaybook}
              disabled={selectedServers.length === 0}
            >
              Execute on {selectedServers.length} server(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Playbooks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ansible Playbooks</CardTitle>
          <CardDescription>
            {playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playbooks.map((playbook) => (
                <TableRow key={playbook.id}>
                  <TableCell className="font-medium">{playbook.name}</TableCell>
                  <TableCell>{playbook.description || '-'}</TableCell>
                  <TableCell>
                    {Object.keys(playbook.variables || {}).length > 0 ? (
                      <Badge variant="outline">
                        {Object.keys(playbook.variables).length} var{Object.keys(playbook.variables).length !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {playbook.created_at ? new Date(playbook.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecute(playbook)}
                        disabled={servers.length === 0}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(playbook.id, playbook.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(playbook)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(playbook.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {playbooks.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No playbooks configured</h3>
              <p className="text-gray-500 mb-4">Create your first Ansible playbook</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Playbook
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

