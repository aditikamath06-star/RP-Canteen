import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Utensils, Calendar, LogIn, LogOut, ShieldCheck, UserCheck, Sun, Moon } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isHead, isWorker, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        {/* Brand Logo & Institution */}
        <Link to="/" className="rp-logo" aria-label="RP Canteen Home">
          <img
            src="/rp_logo.jpeg"
            alt="Rashtrotthana Parishath Logo"
            className="rp-logo-img"
          />
          <div className="rp-logo-text">
            <span className="rp-logo-title">RP Canteen</span>
            <span className="rp-logo-subtitle">Rashtrotthana Parishath</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Utensils size={16} />
            <span>Menu</span>
          </Link>

          {/* Role-based Dashboard Links */}
          {isAuthenticated ? (
            <>
              {isHead && (
                <Link
                  to="/head/dashboard"
                  className={`nav-tab ${
                    location.pathname.startsWith('/head') ? 'active' : ''
                  }`}
                >
                  <ShieldCheck size={16} />
                  <span>Head Dashboard</span>
                </Link>
              )}

              {isWorker && (
                <Link
                  to="/staff/dashboard"
                  className={`nav-tab ${
                    location.pathname.startsWith('/staff') ? 'active' : ''
                  }`}
                >
                  <UserCheck size={16} />
                  <span>Staff Dashboard</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title={`Logged in as ${user?.fullName || user?.username} (${user?.role})`}
              >
                <LogOut size={15} />
                Logout ({user?.role === 'head' ? 'Head' : 'Staff'})
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={`btn btn-secondary btn-sm ${
                location.pathname === '/login' ? 'active' : ''
              }`}
            >
              <LogIn size={16} />
              Staff Login
            </Link>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? (
              <>
                <Sun size={15} color="#f59e0b" />
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#475569" />
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Dark</span>
              </>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
