import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { ServersPage } from './components/ServersPage'
import { CommandsPage } from './components/CommandsPage'
import { PlaybooksPage } from './components/PlaybooksPage'
import { ExecutionsPage } from './components/ExecutionsPage'
import { Toaster } from './components/ui/toaster'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}>
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/servers" element={<ServersPage />} />
              <Route path="/commands" element={<CommandsPage />} />
              <Route path="/playbooks" element={<PlaybooksPage />} />
              <Route path="/executions" element={<ExecutionsPage />} />
            </Routes>
          </main>
        </div>
        
        <Toaster />
      </div>
    </Router>
  )
}

export default App

