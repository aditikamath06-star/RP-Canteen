import React from 'react';
import { Link } from 'react-router-dom';
import { VegBadge } from './VegBadge';
import { ShieldCheck, Heart, MapPin, Clock } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-inner">
          {/* Institutional Info & Pure Vegetarian Commitment */}
          <div className="footer-col">
            <div className="rp-logo" style={{ marginBottom: '1rem' }}>
              <img
                src="/rp_logo.jpeg"
                alt="Rashtrotthana Parishath Logo"
                className="rp-logo-img"
              />
              <div className="rp-logo-text">
                <span className="rp-logo-title" style={{ color: '#ffffff' }}>
                  RP Canteen
                </span>
                <span className="rp-logo-subtitle" style={{ color: '#94a3b8' }}>
                  Rashtrotthana Parishath
                </span>
              </div>
            </div>
            <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#cbd5e1' }}>
              Serving fresh, authentic, sattvic pure vegetarian food for staffs and visitors of Rashtrotthana Parishath.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <VegBadge showLabel={true} />
              <span style={{ fontSize: '0.75rem', color: '#86efac' }}>
                Exclusively 100% Vegetarian Canteen
              </span>
            </div>
          </div>

          {/* Canteen Timings */}
          <div className="footer-col">
            <h4>
              <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Meal Timings
            </h4>
            <ul style={{ listStyle: 'none', lineHeight: '1.8', color: '#cbd5e1' }}>
              <li><strong>Breakfast:</strong> 07:30 AM – 10:30 AM</li>
              <li><strong>Lunch:</strong> 12:30 PM – 02:30 PM</li>
              <li><strong>Snacks:</strong> 04:30 PM – 06:30 PM</li>
              <li><strong>Dinner:</strong> 07:30 PM – 09:30 PM</li>
            </ul>
          </div>

          {/* Quick Links & Authorised Access */}
          <div className="footer-col">
            <h4>
              <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Authorised Access
            </h4>
            <ul style={{ listStyle: 'none', lineHeight: '1.8' }}>
              <li>
                <Link to="/" style={{ color: '#cbd5e1' }}>Menu</Link>
              </li>
              <li>
                <Link to="/login" style={{ color: '#cbd5e1' }}>Authorised Staff Login</Link>
              </li>
            </ul>
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Rashtrotthana Parishath, Bengaluru, Karnataka
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} Rashtrotthana Parishath. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
            <span>Institutional Vegetarian Canteen System</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
