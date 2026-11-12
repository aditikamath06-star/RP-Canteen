import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PublicHome } from './pages/PublicHome';
import { StaffLogin } from './pages/StaffLogin';
import { WorkerDashboard } from './pages/WorkerDashboard';
import { HeadDashboard } from './pages/HeadDashboard';
import { BranchDashboard } from './pages/BranchDashboard';
import { NotFound } from './pages/NotFound';

// Protected Route wrapper with role-based guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        <p style={{ color: '#64748b' }}>Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Role-based redirection if accessing unauthorized route
    if (user?.role === 'worker') {
      return <Navigate to="/staff/dashboard" replace />;
    }
    if (user?.role === 'branch') {
      return <Navigate to="/branch/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <Routes>
            {/* Public Customer Route: Pure Vegetarian Daily Menu, No Prices */}
            <Route path="/" element={<PublicHome />} />

            {/* Authorised Staff Login */}
            <Route path="/login" element={<StaffLogin />} />

            {/* Worker / Cook Staff Dashboard */}
            <Route
              path="/staff/dashboard"
              element={
                <ProtectedRoute allowedRoles={['worker', 'head']}>
                  <WorkerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Head of Canteen Administrative Dashboard */}
            <Route
              path="/head/dashboard"
              element={
                <ProtectedRoute allowedRoles={['head']}>
                  <HeadDashboard />
                </ProtectedRoute>
              }
            />

            {/* Branch Food Indent & Orders Portal */}
            <Route
              path="/branch/dashboard"
              element={
                <ProtectedRoute allowedRoles={['branch', 'head']}>
                  <BranchDashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}
