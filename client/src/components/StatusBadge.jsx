import React from 'react';

export const StatusBadge = ({ status, label }) => {
  let displayLabel = label;
  let cssClass = 'status-pill';

  switch (status) {
    case 'available':
      cssClass += ' available';
      displayLabel = displayLabel || 'Available';
      break;
    case 'unavailable':
      cssClass += ' unavailable';
      displayLabel = displayLabel || 'Unavailable Today';
      break;
    case 'in_stock':
      cssClass += ' in_stock';
      displayLabel = displayLabel || 'In Stock';
      break;
    case 'low_stock':
      cssClass += ' low_stock';
      displayLabel = displayLabel || 'Low Stock';
      break;
    case 'out_of_stock':
      cssClass += ' out_of_stock';
      displayLabel = displayLabel || 'Out of Stock';
      break;
    default:
      displayLabel = displayLabel || status;
  }

  return <span className={cssClass}>{displayLabel}</span>;
};
