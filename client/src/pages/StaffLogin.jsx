import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export const StaffLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (user.role === 'head') {
        navigate('/head/dashboard');
      } else {
        navigate('/staff/dashboard');
      }
    } catch (err) {
      setError(
        err.message || 'Authentication failed. Please verify your credentials.'
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
        padding: '3rem 1.25rem',
        background: 'var(--bg-page)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface)',
          borderRadius: '20px',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* RP Logo Monogram & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/rp_logo.jpeg"
            alt="Rashtrotthana Parishath Logo"
            className="rp-logo-img large"
            style={{ margin: '0 auto 1rem', display: 'block' }}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>
            Authorised Staff Login
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            RP Canteen • Rashtrotthana Parishath
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username or Email Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="identifier">
              Username or Email
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
                style={{ paddingLeft: '38px' }}
                placeholder="e.g. canteenhead or staff email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password Input with Show/Hide */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
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
                style={{ paddingLeft: '38px', paddingRight: '42px' }}
                placeholder="Enter your password"
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
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  padding: '4px',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? (
              'Authenticating...'
            ) : (
              <>
                <ShieldCheck size={18} /> Login to Canteen Portal
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #f1f5f9',
            fontSize: '0.8rem',
            color: '#64748b',
            lineHeight: '1.5',
            textAlign: 'center',
          }}
        >
          <p>
            Private portal for authorized canteen workers and administrators.
          </p>
          <p style={{ marginTop: '0.25rem', color: '#94a3b8' }}>
            Public customer? <a href="/">Return to Public Daily Menu</a>
          </p>
        </div>
      </div>
    </div>
  );
};
