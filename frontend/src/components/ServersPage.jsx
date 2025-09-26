import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Plus, Server, Edit, Trash2, Activity, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from './ui/use-toast'

export function ServersPage() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ip_address: '',
    port: 22,
    username: '',
    description: '',
    tags: ''
  })

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers')
      const data = await response.json()
      setServers(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch servers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const serverData = {
      ...formData,
      port: parseInt(formData.port),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    }

    try {
      const url = editingServer ? `/api/servers/${editingServer.id}` : '/api/servers'
      const method = editingServer ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serverData)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Server ${editingServer ? 'updated' : 'created'} successfully`
        })
        setDialogOpen(false)
        resetForm()
        fetchServers()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to save server",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save server",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (server) => {
    setEditingServer(server)
    setFormData({
      name: server.name,
      hostname: server.hostname,
      ip_address: server.ip_address,
      port: server.port,
      username: server.username,
      description: server.description || '',
      tags: server.tags ? server.tags.join(', ') : ''
    })
    setDialogOpen(true)
  }

  const handleDelete = async (serverId) => {
    if (!confirm('Are you sure you want to delete this server?')) return

    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Server deleted successfully"
        })
        fetchServers()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete server",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive"
      })
    }
  }

  const handlePing = async (serverId) => {
    try {
      const response = await fetch(`/api/servers/${serverId}/ping`, {
        method: 'POST'
      })

      const result = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success",
          description: result.message
        })
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive"
        })
      }
      
      fetchServers() // Refresh to update status
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ping server",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      hostname: '',
      ip_address: '',
      port: 22,
      username: '',
      description: '',
      tags: ''
    })
    setEditingServer(null)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servers</h1>
          <p className="text-gray-600 mt-2">Manage your server inventory</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingServer ? 'Edit Server' : 'Add New Server'}
              </DialogTitle>
              <DialogDescription>
                {editingServer ? 'Update server information' : 'Add a new server to your inventory'}
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
                  <Label htmlFor="hostname" className="text-right">Hostname</Label>
                  <Input
                    id="hostname"
                    value={formData.hostname}
                    onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ip_address" className="text-right">IP Address</Label>
                  <Input
                    id="ip_address"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="port" className="text-right">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: e.target.value})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tags" className="text-right">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="col-span-3"
                    placeholder="web, production, database"
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
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingServer ? 'Update' : 'Create'} Server
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Servers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Server Inventory</CardTitle>
          <CardDescription>
            {servers.length} server{servers.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Ping</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(server.status)}
                      {getStatusBadge(server.status)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>{server.hostname}</TableCell>
                  <TableCell>{server.ip_address}</TableCell>
                  <TableCell>{server.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {server.tags?.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {server.last_ping ? new Date(server.last_ping).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePing(server.id)}
                      >
                        <Activity className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(server)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(server.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {servers.length === 0 && (
            <div className="text-center py-8">
              <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No servers configured</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first server</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Server
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

