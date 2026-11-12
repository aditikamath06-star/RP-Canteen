import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CookingPot,
  Building2,
  BookOpen,
  HeartHandshake,
  Check,
  LogIn,
} from 'lucide-react';

export const StaffLogin = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('kn') ? 'kn' : 'en';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const DEMO_ACCOUNTS = [
    {
      roleTag: 'Canteen Administration',
      titleEn: 'Canteen Head',
      titleKn: 'ಕ್ಯಾಂಟೀನ್ ಮುಖ್ಯಸ್ಥರು',
      username: 'canteenhead',
      password: 'Head@RP2026',
      badgeColor: '#15803d',
      badgeBg: '#dcfce7',
      icon: ShieldCheck,
      description: 'Manage menus, recipes, inventory, pricing, wastage & branch approvals',
    },
    {
      roleTag: 'Kitchen Staff',
      titleEn: 'Canteen Cook / Worker',
      titleKn: 'ಅಡುಗೆ ಸಿಬ್ಬಂದಿ',
      username: 'canteenworker',
      password: 'Worker@RP2026',
      badgeColor: '#b45309',
      badgeBg: '#fef3c7',
      icon: CookingPot,
      description: 'View daily menu, preparation checklists, recipes & log wastage',
    },
    {
      roleTag: 'Branch Unit',
      titleEn: 'Head Office',
      titleKn: 'ಪ್ರಧಾನ ಕಚೇರಿ',
      username: 'headoffice',
      password: 'Branch@HO2026',
      badgeColor: '#0369a1',
      badgeBg: '#e0f2fe',
      icon: Building2,
      description: 'Daily office food requirements & conference function orders',
    },
    {
      roleTag: 'Branch Unit',
      titleEn: 'Mudranalaya (Printing Press)',
      titleKn: 'ಮುದ್ರಣಾಲಯ',
      username: 'mudranalaya',
      password: 'Branch@Press2026',
      badgeColor: '#7c3aed',
      badgeBg: '#f3e8ff',
      icon: BookOpen,
      description: 'Press staff daily food indents & press events food orders',
    },
    {
      roleTag: 'Branch Unit',
      titleEn: 'Rashtrotthana Blood Centre',
      titleKn: 'ರಕ್ತನಿಧಿ',
      username: 'bloodbank',
      password: 'Branch@BB2026',
      badgeColor: '#e11d48',
      badgeBg: '#ffe4e6',
      icon: HeartHandshake,
      description: 'Daily staff meals & blood donation camp special food requests',
    },
    {
      roleTag: 'Branch Unit',
      titleEn: 'Samraksha Centre',
      titleKn: 'ಸಂರಕ್ಷಾ',
      username: 'samraksha',
      password: 'Branch@Samraksha2026',
      badgeColor: '#0f766e',
      badgeBg: '#ccfbf1',
      icon: Building2,
      description: 'Thalassemia care staff daily food & special gathering requests',
    },
    {
      roleTag: 'Branch Unit',
      titleEn: 'Ashtanga Yoga',
      titleKn: 'ಅಷ್ಟಾಂಗ ಯೋಗ',
      username: 'ashtangayoga',
      password: 'Branch@Yoga2026',
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
      icon: Building2,
      description: 'Yoga centre staff daily food & yoga workshop banquet requests',
    },
  ];

  const handleQuickFill = (acc) => {
    setIdentifier(acc.username);
    setPassword(acc.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError(t('login.validationError', 'Please provide both username/email and password.'));
      return;
    }

    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (user.role === 'head') {
        navigate('/head/dashboard');
      } else if (user.role === 'branch') {
        navigate('/branch/dashboard');
      } else {
        navigate('/staff/dashboard');
      }
    } catch (err) {
      setError(
        err.message || t('messages.errorOccurred', 'Authentication failed. Please verify your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.25rem',
        background: 'var(--bg-page)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: LOGIN FORM */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '20px',
            padding: '2.25rem 2rem',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* RP Logo Monogram & Heading */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <img
              src="/rp_logo.jpeg"
              alt="Rashtrotthana Parishath Logo"
              className="rp-logo-img large"
              style={{ margin: '0 auto 0.75rem', display: 'block' }}
            />
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              {t('login.title', 'Authorised Staff & Branch Login')}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {t('login.subtitle', 'RP Canteen • Rashtrotthana Parishath')}
            </p>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username or Email Input */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" htmlFor="identifier" style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                {t('login.usernameOrEmail', 'Username or Email')}
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  id="identifier"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px', height: '42px' }}
                  placeholder={t('login.usernamePlaceholder', 'Enter username or email')}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="password" style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                {t('login.password', 'Password')}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: '40px', height: '42px' }}
                  placeholder={t('login.passwordPlaceholder', 'Enter security password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                  aria-label={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={loading}
            >
              <LogIn size={18} />
              <span>{loading ? t('login.signingIn', 'Verifying Credentials...') : t('login.signInBtn', 'Sign In to Canteen Portal')}</span>
            </button>
          </form>

          {/* Quick Notice */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              lineHeight: '1.4',
            }}
          >
            Click any account on the right to auto-fill its credentials instantly.
          </div>
        </div>

        {/* RIGHT COLUMN: ALL LOGIN CREDENTIALS & 1-CLICK AUTO-FILL */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '20px',
            padding: '1.75rem 1.5rem',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              🔑 {currentLang === 'kn' ? 'ತ್ವರಿತ ಲಾಗಿನ್ ಖಾತೆಗಳು' : 'Quick Login Accounts'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              {currentLang === 'kn'
                ? 'ಯಾವುದೇ ಖಾತೆಯ "ಸ್ವಯಂ ಭರ್ತಿ" ಕ್ಲಿಕ್ ಮಾಡಿ ಲಾಗಿನ್ ವಿವರಗಳನ್ನು ತುಂಬಿ:'
                : 'Click "Auto-Fill" on any account to fill its credentials into the login box:'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DEMO_ACCOUNTS.map((acc, idx) => {
              const IconComp = acc.icon;
              const isSelected = identifier === acc.username;

              return (
                <div
                  key={idx}
                  style={{
                    border: isSelected ? '2px solid #16a34a' : '1px solid var(--border-color)',
                    background: isSelected ? '#f0fdf4' : 'var(--bg-page)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: acc.badgeBg,
                        color: acc.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComp size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {currentLang === 'kn' ? acc.titleKn : acc.titleEn}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                        user: <strong>{acc.username}</strong> | pass: <strong>{acc.password}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickFill(acc)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      flexShrink: 0,
                      background: isSelected ? '#15803d' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#0f172a',
                      border: isSelected ? '1px solid #15803d' : '1px solid #cbd5e1',
                    }}
                  >
                    {isSelected
                      ? currentLang === 'kn'
                        ? '✓ ಭರ್ತಿಯಾಗಿದೆ'
                        : '✓ Filled'
                      : currentLang === 'kn'
                      ? 'ಸ್ವಯಂ ಭರ್ತಿ'
                      : 'Auto-Fill'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
