import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Server, Terminal, FileText, Activity, AlertCircle, CheckCircle } from 'lucide-react'

export function Dashboard() {
  const [stats, setStats] = useState({
    servers: { total: 0, active: 0, error: 0 },
    commands: { total: 0 },
    playbooks: { total: 0 },
    executions: { total: 0, recent: [] }
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch servers
      const serversResponse = await fetch('/api/servers')
      const servers = await serversResponse.json()
      
      // Fetch commands
      const commandsResponse = await fetch('/api/commands')
      const commands = await commandsResponse.json()
      
      // Fetch executions
      const executionsResponse = await fetch('/api/executions')
      const executions = await executionsResponse.json()

      setStats({
        servers: {
          total: servers.length,
          active: servers.filter(s => s.status === 'active').length,
          error: servers.filter(s => s.status === 'error').length
        },
        commands: { total: commands.length },
        playbooks: { total: 0 }, // Will be implemented later
        executions: { 
          total: executions.length,
          recent: executions.slice(0, 5)
        }
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  const statCards = [
    {
      title: 'Total Servers',
      value: stats.servers.total,
      description: `${stats.servers.active} active, ${stats.servers.error} errors`,
      icon: Server,
      color: 'blue'
    },
    {
      title: 'Commands',
      value: stats.commands.total,
      description: 'Custom commands available',
      icon: Terminal,
      color: 'green'
    },
    {
      title: 'Playbooks',
      value: stats.playbooks.total,
      description: 'Ansible playbooks',
      icon: FileText,
      color: 'purple'
    },
    {
      title: 'Executions',
      value: stats.executions.total,
      description: 'Total executions',
      icon: Activity,
      color: 'orange'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Overview of your server automation platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Executions</span>
            </CardTitle>
            <CardDescription>
              Latest command and playbook executions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.executions.recent.length > 0 ? (
                stats.executions.recent.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {execution.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : execution.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Activity className="w-4 h-4 text-blue-600 animate-spin" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {execution.execution_type === 'command' ? 'Command' : 'Playbook'} Execution
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(execution.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        execution.status === 'completed' ? 'default' :
                        execution.status === 'failed' ? 'destructive' : 'secondary'
                      }
                    >
                      {execution.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent executions</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Server Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>Server Status</span>
            </CardTitle>
            <CardDescription>
              Current status of managed servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Active Servers</span>
                </div>
                <span className="text-sm font-medium">{stats.servers.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Error Servers</span>
                </div>
                <span className="text-sm font-medium">{stats.servers.error}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Total Servers</span>
                </div>
                <span className="text-sm font-medium">{stats.servers.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

