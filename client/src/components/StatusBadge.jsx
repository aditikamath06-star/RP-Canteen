import React from 'react';
import { useTranslation } from 'react-i18next';

export const StatusBadge = ({ status, label }) => {
  const { t } = useTranslation();
  let displayLabel = label;
  let cssClass = 'status-pill';

  switch (status) {
    case 'available':
      cssClass += ' available';
      displayLabel = displayLabel || t('status.available', 'Available');
      break;
    case 'unavailable':
      cssClass += ' unavailable';
      displayLabel = displayLabel || t('status.unavailable', 'Unavailable');
      break;
    case 'in_stock':
      cssClass += ' in_stock';
      displayLabel = displayLabel || t('status.in_stock', 'In Stock');
      break;
    case 'low_stock':
      cssClass += ' low_stock';
      displayLabel = displayLabel || t('status.low_stock', 'Low Stock');
      break;
    case 'out_of_stock':
      cssClass += ' out_of_stock';
      displayLabel = displayLabel || t('status.out_of_stock', 'Out of Stock');
      break;
    case 'published':
      cssClass += ' available';
      displayLabel = displayLabel || t('status.published', 'Published');
      break;
    case 'draft':
      cssClass += ' unavailable';
      displayLabel = displayLabel || t('status.draft', 'Draft');
      break;
    default:
      displayLabel = displayLabel || status;
  }

  return <span className={cssClass}>{displayLabel}</span>;
};
