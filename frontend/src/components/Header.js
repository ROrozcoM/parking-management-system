import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLink, setActiveLink] = useState('/');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setActiveLink(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    // Verificar si el usuario es admin (javi o fito)
    if (currentUser) {
      const adminUsers = ['javi', 'fito'];
      setIsAdmin(adminUsers.includes(currentUser.username.toLowerCase()));
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="Camper Park Medina Azahara" />
          <span className="logo-text">Camper Park Medina Azahara</span>
        </Link>
        
        <nav className="nav">
          <Link
            to="/"
            className={`nav-link ${activeLink === '/' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to="/history"
            className={`nav-link ${activeLink === '/history' ? 'active' : ''}`}
          >
            Historial
          </Link>
          <Link
            to="/cash"
            className={`nav-link ${activeLink === '/cash' ? 'active' : ''}`}
          >
            💰 Caja
          </Link>
          
          {/* Enlace de Analytics - Solo visible para admins */}
          {isAdmin && (
            <Link
              to="/analytics"
              className={`nav-link ${activeLink === '/analytics' ? 'active' : ''}`}
            >
              Analytics
            </Link>
          )}
        </nav>
        
        <div className="user-info">
          {currentUser ? (
            <>
              <span className="username">
                {currentUser.username}
                {isAdmin && <span className="admin-badge"> </span>}
              </span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="login-btn">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;