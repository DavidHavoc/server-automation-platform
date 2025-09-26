import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { History, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import { useToast } from './ui/use-toast'

export function ExecutionsPage() {
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchExecutions()
  }, [])

  const fetchExecutions = async () => {
    try {
      const response = await fetch('/api/executions')
      const data = await response.json()
      setExecutions(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch execution history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'running':
        return <Activity className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'running':
        return <Badge variant="secondary">Running</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDuration = (startedAt, completedAt) => {
    if (!completedAt) return '-'
    
    const start = new Date(startedAt)
    const end = new Date(completedAt)
    const duration = Math.round((end - start) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.round(duration / 60)}m`
    return `${Math.round(duration / 3600)}h`
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Execution History</h1>
        <p className="text-gray-600 mt-2">View command and playbook execution logs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>
            {executions.length} execution{executions.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target Servers</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Executed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(execution.status)}
                      {getStatusBadge(execution.status)}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{execution.execution_type}</TableCell>
                  <TableCell>
                    {execution.target_servers?.length || 0} server{execution.target_servers?.length !== 1 ? 's' : ''}
                  </TableCell>
                  <TableCell>
                    {execution.started_at ? new Date(execution.started_at).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    {formatDuration(execution.started_at, execution.completed_at)}
                  </TableCell>
                  <TableCell>{execution.executed_by || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {executions.length === 0 && (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No executions yet</h3>
              <p className="text-gray-500">
                Execution history will appear here after you run commands or playbooks
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

