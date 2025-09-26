import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Server, 
  Terminal, 
  FileText, 
  History, 
  Menu,
  ChevronLeft,
  Settings
} from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Servers', href: '/servers', icon: Server },
  { name: 'Commands', href: '/commands', icon: Terminal },
  { name: 'Playbooks', href: '/playbooks', icon: FileText },
  { name: 'Executions', href: '/executions', icon: History },
]

export function Sidebar({ open, setOpen }) {
  const location = useLocation()

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
      open ? "w-64" : "w-16"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {open && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">
              Server Automation
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
          className="p-2"
        >
          {open ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("flex-shrink-0", open ? "w-5 h-5 mr-3" : "w-5 h-5")} />
              {open && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Link
          to="/settings"
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          )}
        >
          <Settings className={cn("flex-shrink-0", open ? "w-5 h-5 mr-3" : "w-5 h-5")} />
          {open && <span>Settings</span>}
        </Link>
      </div>
    </div>
  )
}

