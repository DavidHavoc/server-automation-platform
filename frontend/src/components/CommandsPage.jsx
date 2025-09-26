import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Checkbox } from './ui/checkbox'
import { Plus, Terminal, Edit, Trash2, Play } from 'lucide-react'
import { useToast } from './ui/use-toast'

export function CommandsPage() {
  const [commands, setCommands] = useState([])
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState(null)
  const [executingCommand, setExecutingCommand] = useState(null)
  const [selectedServers, setSelectedServers] = useState([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    command: '',
    timeout: 300
  })

  useEffect(() => {
    fetchCommands()
    fetchServers()
  }, [])

  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/commands')
      const data = await response.json()
      setCommands(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch commands",
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingCommand ? `/api/commands/${editingCommand.id}` : '/api/commands'
      const method = editingCommand ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          timeout: parseInt(formData.timeout)
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Command ${editingCommand ? 'updated' : 'created'} successfully`
        })
        setDialogOpen(false)
        resetForm()
        fetchCommands()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save command",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save command",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (command) => {
    setEditingCommand(command)
    setFormData({
      name: command.name,
      description: command.description || '',
      command: command.command,
      timeout: command.timeout
    })
    setDialogOpen(true)
  }

  const handleDelete = async (commandId) => {
    if (!confirm('Are you sure you want to delete this command?')) return

    try {
      const response = await fetch(`/api/commands/${commandId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Command deleted successfully"
        })
        fetchCommands()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete command",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete command",
        variant: "destructive"
      })
    }
  }

  const handleExecute = (command) => {
    setExecutingCommand(command)
    setSelectedServers([])
    setExecuteDialogOpen(true)
  }

  const handleExecuteCommand = async () => {
    if (selectedServers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one server",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch(`/api/commands/${executingCommand.id}/execute`, {
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
          description: `Command executed on ${selectedServers.length} server(s)`
        })
        setExecuteDialogOpen(false)
        setSelectedServers([])
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to execute command",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute command",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      command: '',
      timeout: 300
    })
    setEditingCommand(null)
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
          <h1 className="text-3xl font-bold text-gray-900">Commands</h1>
          <p className="text-gray-600 mt-2">Manage custom commands for server automation</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Command
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCommand ? 'Edit Command' : 'Add New Command'}
              </DialogTitle>
              <DialogDescription>
                {editingCommand ? 'Update command details' : 'Create a new custom command'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
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
                  <Label htmlFor="command" className="text-right">Command</Label>
                  <Textarea
                    id="command"
                    value={formData.command}
                    onChange={(e) => setFormData({...formData, command: e.target.value})}
                    className="col-span-3"
                    placeholder="ls -la"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="timeout" className="text-right">Timeout (s)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formData.timeout}
                    onChange={(e) => setFormData({...formData, timeout: e.target.value})}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingCommand ? 'Update' : 'Create'} Command
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Execute Command Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Execute Command</DialogTitle>
            <DialogDescription>
              Select servers to execute "{executingCommand?.name}" on
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Command:</p>
              <code className="text-sm text-gray-600">{executingCommand?.command}</code>
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
              onClick={handleExecuteCommand}
              disabled={selectedServers.length === 0}
            >
              Execute on {selectedServers.length} server(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Commands</CardTitle>
          <CardDescription>
            {commands.length} command{commands.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Command</TableHead>
                <TableHead>Timeout</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commands.map((command) => (
                <TableRow key={command.id}>
                  <TableCell className="font-medium">{command.name}</TableCell>
                  <TableCell>{command.description || '-'}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {command.command.length > 50 
                        ? `${command.command.substring(0, 50)}...` 
                        : command.command
                      }
                    </code>
                  </TableCell>
                  <TableCell>{command.timeout}s</TableCell>
                  <TableCell>
                    {command.created_at ? new Date(command.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecute(command)}
                        disabled={servers.length === 0}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(command)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(command.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {commands.length === 0 && (
            <div className="text-center py-8">
              <Terminal className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No commands configured</h3>
              <p className="text-gray-500 mb-4">Create your first custom command</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Command
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

