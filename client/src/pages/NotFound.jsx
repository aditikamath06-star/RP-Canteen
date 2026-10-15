import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <div
      style={{
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.25rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '480px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            background: '#e8f5e9',
            color: '#1b4332',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <Utensils size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Page Not Found</h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          The page you are looking for does not exist or has been moved in the RP Canteen portal.
        </p>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Return to Canteen Home
        </Link>
      </div>
    </div>
  );
};
