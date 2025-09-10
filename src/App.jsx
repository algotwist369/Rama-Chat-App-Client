import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('login');

  useEffect(() => {
    // Check URL hash for routing
    const hash = window.location.hash.slice(1);
    if (hash === 'register') {
      setCurrentPage('register');
    } else {
      setCurrentPage('login');
    }
  }, []);

  useEffect(() => {
    // Update URL hash when page changes
    window.location.hash = currentPage;
  }, [currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentPage === 'register') {
      return <Register onGoToLogin={() => setCurrentPage('login')} />;
    }
    return <Login onGoToRegister={() => setCurrentPage('register')} />;
  }

  // Route based on user role
  if (user?.role === 'admin') {
    return <AdminPanel />;
  }

  return <Dashboard />;
};

const App = () => {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </AuthProvider>
  );
};

export default App;