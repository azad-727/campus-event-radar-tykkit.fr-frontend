import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login'; 
import SignUp from './pages/Auth/SignUp'; 
import Dashboard from './pages/Dashboard/Dashboard';
import OrganizerDashboard from './pages/Admin/OrganizerDashboard';
import ChangePassword from './pages/Auth/ChangePassword';
import StaticPage from './pages/Static/StaticPage';
import './index.css'; 

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('tykkit_jwt');
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

const aboutContent = [
  "Tykkit is the ultimate campus event platform, designed exclusively for modern students.",
  "We believe that experiencing a campus event should be seamless, social, and entirely digital.",
  "Built with cutting-edge tech to handle high-scale ticketing effortlessly."
];

const privacyContent = [
  "Your privacy is our priority.",
  "We only collect the data necessary to secure your passes (Student ID, Name, Email).",
  "We do not sell your personal data to third-party vendors."
];

const termsContent = [
  "By using Tykkit, you agree to the following terms:",
  "1. Passes are strictly non-transferable unless explicitly stated.",
  "2. Canceling a pass frees it up for another student; deliberate hoarding may result in a ban.",
  "3. All event details are subject to change by the organizers."
];

const productsContent = [
  "Tykkit Core: The student-facing app for securing event passes.",
  "Tykkit Admin: The organizer dashboard for live stats and QR scanning.",
  "Coming soon: Tykkit API for developer integrations."
];

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin" element={<ProtectedRoute><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/about" element={<StaticPage title="About Tykkit" content={aboutContent} />} />
        <Route path="/privacy" element={<StaticPage title="Privacy Policy" content={privacyContent} />} />
        <Route path="/terms" element={<StaticPage title="Terms of Service" content={termsContent} />} />
        <Route path="/products" element={<StaticPage title="Our Products" content={productsContent} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;