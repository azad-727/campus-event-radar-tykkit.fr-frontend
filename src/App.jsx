import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login'; 
import SignUp from './pages/Auth/SignUp'; 
import Dashboard from './pages/Dashboard/Dashboard';
import OrganizerDashboard from './pages/Admin/OrganizerDashboard';
import './index.css'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        {/* Route 2: The Main Application */}
        <Route path="/" element={
            <div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>
                <h1>tykkit.fr Dashboard</h1>
                <p>You have successfully logged in.</p>
                {/* <Dashboard /> */} 
            </div>
        } />
        <Route path="/admin" element={<OrganizerDashboard />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;