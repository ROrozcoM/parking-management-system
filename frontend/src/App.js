import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Analytics from './pages/Analytics';
import CashRegister from './pages/CashRegister';
import './index.css';

function AppRoutes() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [cashSessionActive, setCashSessionActive] = useState(null);
  const [checkingCash, setCheckingCash] = useState(true);

  // Verificar estado de caja cada 30 segundos
  useEffect(() => {
    if (!currentUser || isLoginPage) {
      setCheckingCash(false);
      return;
    }

    const checkCashSession = async () => {
      try {
        const response = await fetch('/api/cash/active-session', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setCashSessionActive(true);
        } else {
          setCashSessionActive(false);
        }
      } catch (err) {
        setCashSessionActive(false);
      } finally {
        setCheckingCash(false);
      }
    };

    // Check inicial
    checkCashSession();

    // Check cada 30 segundos
    const interval = setInterval(checkCashSession, 30000);

    return () => clearInterval(interval);
  }, [currentUser, isLoginPage]);

  return (
    <div className="app">
      {!isLoginPage && <Header />}
      
      {/* Banner de caja cerrada */}
      {!isLoginPage && currentUser && !checkingCash && cashSessionActive === false && (
        <div style={{
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '0.75rem 1rem',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.95rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
          position: 'sticky',
          top: 0
        }}>
          🔒 CAJA CERRADA - No se pueden registrar pagos. 
          <a 
            href="/cash" 
            style={{ 
              color: 'white', 
              textDecoration: 'underline',
              marginLeft: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            Ir a Caja para abrir sesión
          </a>
        </div>
      )}

      <main className="main-content">
        <Routes>
          <Route
            path="/login"
            element={currentUser ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/"
            element={currentUser ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/history"
            element={currentUser ? <History /> : <Navigate to="/login" />}
          />
          <Route
            path="/analytics"
            element={currentUser ? <Analytics /> : <Navigate to="/login" />}
          />
          <Route
            path="/cash"
            element={currentUser ? <CashRegister /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {!isLoginPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;