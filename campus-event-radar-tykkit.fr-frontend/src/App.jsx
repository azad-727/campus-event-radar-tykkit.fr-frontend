import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login'; 
import SignUp from './pages/Auth/SignUp'; 
import Dashboard from './pages/Dashboard/Dashboard';
import OrganizerDashboard from './pages/Admin/OrganizerDashboard';
import ChangePassword from './pages/Auth/ChangePassword';
import './index.css'; 

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('tykkit_jwt');
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;