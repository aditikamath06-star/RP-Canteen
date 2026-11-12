import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VegBadge } from './VegBadge';
import { ShieldCheck, MapPin, Clock } from 'lucide-react';

export const Footer = () => {
  const { t } = useTranslation();

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
                  {t('nav.title', 'RP Canteen')}
                </span>
                <span className="rp-logo-subtitle" style={{ color: '#94a3b8' }}>
                  {t('nav.subtitle', 'Rashtrotthana Parishath')}
                </span>
              </div>
            </div>
            <p style={{ lineHeight: '1.6', marginBottom: '1rem', color: '#cbd5e1' }}>
              {t('footer.description', 'Serving fresh, authentic, sattvic pure vegetarian food for staffs and visitors of Rashtrotthana Parishath.')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <VegBadge showLabel={true} />
              <span style={{ fontSize: '0.75rem', color: '#86efac' }}>
                {t('footer.sattvicStandard', 'Strictly 100% Sattvic Vegetarian')}
              </span>
            </div>
          </div>

          {/* Canteen Timings */}
          <div className="footer-col">
            <h4>
              <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
              {t('footer.timings', 'Timings & Meal Service')}
            </h4>
            <ul style={{ listStyle: 'none', lineHeight: '1.8', color: '#cbd5e1' }}>
              <li>{t('footer.breakfastTime', 'Breakfast: 08:00 AM – 09:00 AM')}</li>
              <li>{t('footer.lunchTime', 'Lunch: 12:30 PM – 02:00 PM')}</li>
              <li>{t('footer.snacksTime', 'Evening Snacks: 04:30 PM – 06:00 PM')}</li>
              <li>{t('footer.dinnerTime', 'Dinner: 07:30 PM – 09:30 PM')}</li>
            </ul>
          </div>

          {/* Quick Links & Authorised Access */}
          <div className="footer-col">
            <h4>
              <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px' }} />
              {t('footer.institutionalStandards', 'Institutional Standards')}
            </h4>
            <ul style={{ listStyle: 'none', lineHeight: '1.8' }}>
              <li>
                <Link to="/" style={{ color: '#cbd5e1' }}>{t('nav.menu', 'Menu')}</Link>
              </li>
              <li>
                <Link to="/login" style={{ color: '#cbd5e1' }}>{t('nav.staffLogin', 'Staff Login')}</Link>
              </li>
              <li style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                {t('footer.zeroPricePolicy', 'Zero Commercial Food Prices')}
              </li>
              <li style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                {t('footer.hygieneStandard', 'Traditional Kitchen Hygiene Standards')}
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
            © {new Date().getFullYear()} {t('footer.copyright', 'Rashtrotthana Parishath. All rights reserved.')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
            <span>{t('footer.servingCommunity', 'Serving the community with purity and devotion.')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
