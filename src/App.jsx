import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import CompanyAdminDashboard from './pages/CompanyAdminDashboard';
import TravelAdminDashboard from './pages/TravelAdminDashboard';
import DriverDashboard from './pages/DriverDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import LoadingScreen from './components/LoadingScreen';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDashboardPath(user.role)} replace /> : <LoginPage />} />
      
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['company-admin']}>
            <CompanyAdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/travel-admin" 
        element={
          <ProtectedRoute allowedRoles={['travel-admin']}>
            <TravelAdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/driver" 
        element={
          <ProtectedRoute allowedRoles={['driver']}>
            <DriverDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/employee" 
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route path="/unauthorized" element={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized Access</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      } />
      
      <Route path="/" element={<Navigate to={user ? getDashboardPath(user.role) : '/login'} replace />} />
    </Routes>
  );
}

function getDashboardPath(role) {
  switch (role) {
    case 'company-admin':
      return '/admin';
    case 'travel-admin':
      return '/travel-admin';
    case 'driver':
      return '/driver';
    case 'employee':
      return '/employee';
    default:
      return '/login';
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;