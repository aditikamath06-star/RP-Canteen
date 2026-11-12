import React from 'react';
import { useTranslation } from 'react-i18next';

export const VegBadge = ({ showLabel = true, size = 'md' }) => {
  const { t, i18n } = useTranslation();
  const isKn = i18n.language?.startsWith('kn');
  const labelText = isKn ? 'ಶುದ್ಧ ಸಸ್ಯಾಹಾರ' : 'PURE VEG';

  return (
    <div className="veg-badge-box" title={isKn ? '೧೦೦% ಶುದ್ಧ ಸಾತ್ವಿಕ ಸಸ್ಯಾಹಾರ' : '100% Pure Sattvic Vegetarian'}>
      <span className="veg-icon" aria-label="Vegetarian"></span>
      {showLabel && <span>{labelText}</span>}
    </div>
  );
};
