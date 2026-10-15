import React from 'react';

export const VegBadge = ({ showLabel = true, size = 'md' }) => {
  return (
    <div className="veg-badge-box" title="100% Pure Vegetarian">
      <span className="veg-icon" aria-label="Vegetarian"></span>
      {showLabel && <span>PURE VEG</span>}
    </div>
  );
};
