import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Utensils, LogIn, LogOut, ShieldCheck, UserCheck, Building2, Sun, Moon } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Navbar = () => {
  const { t } = useTranslation();
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
            <span className="rp-logo-title">{t('nav.title', 'RP Canteen')}</span>
            <span className="rp-logo-subtitle">{t('nav.subtitle', 'Rashtrotthana Parishath')}</span>
          </div>
        </Link>

        {/* Navigation Links and Action Controls */}
        <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
          <Link
            to="/"
            className={`nav-tab ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Utensils size={16} />
            <span>{t('nav.menu', 'Menu')}</span>
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
                  <span>{t('nav.headDashboard', 'Head Dashboard')}</span>
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
                  <span>{t('nav.staffDashboard', 'Staff Dashboard')}</span>
                </Link>
              )}

              {user?.role === 'branch' && (
                <Link
                  to="/branch/dashboard"
                  className={`nav-tab ${
                    location.pathname.startsWith('/branch') ? 'active' : ''
                  }`}
                >
                  <Building2 size={16} />
                  <span>{user?.branchNameKn || t('nav.branchPortal', 'Branch Portal')}</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title={`Logged in as ${user?.fullName || user?.username} (${user?.role})`}
              >
                <LogOut size={15} />
                <span>
                  {t('nav.logout', 'Logout')} ({user?.role === 'head' ? t('nav.head', 'Head') : user?.role === 'branch' ? t('nav.branch', 'Branch') : t('nav.staff', 'Staff')})
                </span>
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
              <span>{t('nav.staffLogin', 'Staff Login')}</span>
            </Link>
          )}

          {/* Language Switcher - Clearly visible in header on Desktop, Android & iOS */}
          <LanguageSwitcher />

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
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{t('nav.light', 'Light')}</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#475569" />
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{t('nav.dark', 'Dark')}</span>
              </>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
