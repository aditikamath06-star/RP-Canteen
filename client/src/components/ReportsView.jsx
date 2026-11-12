import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Trash2,
  Package,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Building2,
  PieChart as PieIcon,
  BarChart2,
  FileSpreadsheet,
} from 'lucide-react';

export const ReportsView = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('kn') ? 'kn' : 'en';

  const [timeframe, setTimeframe] = useState('month'); // 'week' | 'month' | 'year' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'inventory_cost' | 'diners' | 'wastage' | 'consumption_rate'

  // Search in consumption rates table
  const [consumptionSearch, setConsumptionSearch] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { timeframe };
      if (timeframe === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const res = await api.getReportAnalytics(params);
      if (res.success) {
        setReportData(res);
      } else {
        setError(res.message || 'Failed to load analytics.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to report server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe !== 'custom' || (customStart && customEnd)) {
      loadAnalytics();
    }
  }, [timeframe]);

  const handleExportCsv = () => {
    const params = { timeframe };
    if (timeframe === 'custom' && customStart && customEnd) {
      params.startDate = customStart;
      params.endDate = customEnd;
    }
    const token = localStorage.getItem('rp_canteen_token') || localStorage.getItem('token') || '';
    const url = api.getReportCsvDownloadUrl(params);

    // Fetch as blob with auth header and trigger browser download
    fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Download failed with HTTP ${res.status}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const err = await res.json();
          throw new Error(err.message || 'Server returned error instead of CSV');
        }
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `RP_Canteen_Report_${reportData?.dateRange?.startDate || 'export'}_to_${reportData?.dateRange?.endDate || 'today'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      })
      .catch((err) => alert('CSV download failed: ' + err.message));
  };

  const handlePrint = () => {
    window.print();
  };

  const cards = reportData?.summaryCards || {};
  const invPillar = reportData?.inventoryPillar || {};
  const dinersPillar = reportData?.dinersPillar || {};
  const wastagePillar = reportData?.wastagePillar || {};

  // Filter consumption rates
  const filteredConsumptionRates = (invPillar.consumptionRates || []).filter((item) => {
    if (!consumptionSearch.trim()) return true;
    const term = consumptionSearch.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="reports-container" style={{ paddingBottom: '3rem' }}>
      {/* Top Action Bar & Date Range Controls */}
      <div
        className="no-print"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={24} style={{ color: '#15803d' }} />
            {currentLang === 'kn' ? 'ಕ್ಯಾಂಟೀನ್ ಸಮಗ್ರ ವರದಿಗಳು ಮತ್ತು ಅಂಕಿಅಂಶಗಳು' : 'Comprehensive Canteen Reports & Analytics'}
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            {reportData?.dateRange
              ? `${currentLang === 'kn' ? 'ವರದಿ ಅವಧಿ:' : 'Report Period:'} ${reportData.dateRange.startDate} ${currentLang === 'kn' ? 'ರಿಂದ' : 'to'} ${reportData.dateRange.endDate} (${reportData.dateRange.daysInPeriod} ${currentLang === 'kn' ? 'ದಿನಗಳು' : 'days'})`
              : currentLang === 'kn' ? 'ಅವಧಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ' : 'Select timeframe to analyze'}
          </p>
        </div>

        {/* Timeframe Buttons & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
            {[
              { id: 'week', labelEn: 'Weekly (7d)', labelKn: 'ವಾರ (೭ ದಿನ)' },
              { id: 'month', labelEn: 'Monthly (30d)', labelKn: 'ಮಾಸಿಕ (೩೦ ದಿನ)' },
              { id: 'year', labelEn: 'Yearly (365d)', labelKn: 'ವಾರ್ಷಿಕ (೧ ವರ್ಷ)' },
              { id: 'custom', labelEn: 'Custom', labelKn: 'ಕಸ್ಟಮ್' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                style={{
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: timeframe === tf.id ? '#ffffff' : 'transparent',
                  color: timeframe === tf.id ? '#15803d' : '#64748b',
                  fontWeight: timeframe === tf.id ? '700' : '500',
                  boxShadow: timeframe === tf.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setTimeframe(tf.id)}
              >
                {currentLang === 'kn' ? tf.labelKn : tf.labelEn}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {timeframe === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '4px 8px', height: '34px' }}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>-</span>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: '0.8rem', padding: '4px 8px', height: '34px' }}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadAnalytics}
                style={{ fontSize: '0.78rem', height: '34px' }}
              >
                {currentLang === 'kn' ? 'ಅನ್ವಯಿಸಿ' : 'Apply'}
              </button>
            </div>
          )}

          {/* Export to CSV */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleExportCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', height: '36px' }}
            title={currentLang === 'kn' ? 'ಎಕ್ಸೆಲ್ / CSV ಗೆ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ' : 'Export complete report to Excel / CSV'}
          >
            <FileSpreadsheet size={15} style={{ color: '#16a34a' }} />
            <span>{currentLang === 'kn' ? 'CSV ರಫ್ತು' : 'Export CSV'}</span>
          </button>

          {/* Print / Save PDF */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', height: '36px' }}
            title={currentLang === 'kn' ? 'ವರದಿಯನ್ನು ಮುದ್ರಿಸಿ' : 'Print / Save PDF Report'}
          >
            <Printer size={15} />
            <span>{currentLang === 'kn' ? 'ಮುದ್ರಿಸಿ' : 'Print Report'}</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadAnalytics}
            disabled={loading}
            style={{ fontSize: '0.8rem', height: '36px', padding: '0 10px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Printable Institution Header (Only visible during print) */}
      <div className="only-print" style={{ display: 'none', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '20px', margin: 0 }}>ರಾಷ್ಟ್ರೋತ್ಥಾನ ಪರಿಷತ್ • RASHTROTTHANA CANTEEN</h1>
        <h2 style={{ fontSize: '15px', margin: '4px 0 0 0', color: '#475569' }}>
          Official Management Analytics & Audit Report ({reportData?.dateRange?.startDate} to {reportData?.dateRange?.endDate})
        </h2>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* 4 HIGH-LEVEL KPI METRIC CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* KPI 1: Cost of Inventory */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            borderLeft: '4px solid #16a34a',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {currentLang === 'kn' ? 'ದಾಸ್ತಾನು ಒಟ್ಟು ಮೌಲ್ಯ' : 'Current Store Inventory'}
            </span>
            <DollarSign size={18} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
            ₹{Number(cards.totalInventoryValuation || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {currentLang === 'kn' ? 'ಅಡುಗೆಮನೆಯಲ್ಲಿರುವ ಸಾಮಗ್ರಿಗಳು' : `${cards.activeInventoryItemsCount || 0} active stock ingredients`}
          </div>
        </div>

        {/* KPI 2: Spend & Cooking Consumption */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            borderLeft: '4px solid #0284c7',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {currentLang === 'kn' ? 'ಬಳಕೆಯಾದ ಸಾಮಗ್ರಿಗಳ ವೆಚ್ಚ' : 'Consumption Cost'}
            </span>
            <TrendingDown size={18} style={{ color: '#0284c7' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
            ₹{Number(cards.totalConsumptionCost || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {currentLang === 'kn'
              ? `ಮರುಪೂರಣ ವೆಚ್ಚ: ₹${Number(cards.totalRestockSpend || 0).toLocaleString('en-IN')}`
              : `Restock Spend: ₹${Number(cards.totalRestockSpend || 0).toLocaleString('en-IN')}`}
          </div>
        </div>

        {/* KPI 3: People Eating in Canteen */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            borderLeft: '4px solid #ea580c',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {currentLang === 'kn' ? 'ಊಟ ಸೇವಿಸಿದ ಜನರ ಸಂಖ್ಯೆ' : 'Total People Fed'}
            </span>
            <Users size={18} style={{ color: '#ea580c' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
            {Number(cards.totalPeopleFed || 0).toLocaleString('en-IN')}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>
              {currentLang === 'kn' ? 'ಜನರು' : 'meals'}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {currentLang === 'kn' ? '೫ ಶಾಖೆಗಳು & ಸಮಾರಂಭಗಳು' : 'Across 5 branches & banquets'}
          </div>
        </div>

        {/* KPI 4: Food Wastage */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            borderLeft: '4px solid #ef4444',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {currentLang === 'kn' ? 'ಒಟ್ಟು ಆಹಾರ ವ್ಯರ್ಥ / ಉಳಿಕೆ' : 'Total Food Wastage'}
            </span>
            <Trash2 size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>
            {Number(cards.totalWastageQuantity || 0).toLocaleString('en-IN')}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#64748b' }}>kg</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
            {cards.totalWastageQuantity === 0
              ? currentLang === 'kn' ? '✓ ಶೂನ್ಯ ವ್ಯರ್ಥ (ಉತ್ತಮ ನಿಯಂತ್ರಣ)' : '✓ Zero Waste (Optimum preparation)'
              : currentLang === 'kn' ? 'ದಾಖಲಾದ ದೈನಂದಿನ ಉಳಿಕೆ' : 'Logged from kitchen excess'}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '8px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', labelEn: 'Executive Summary', labelKn: 'ಒಟ್ಟಾರೆ ಸಾರಾಂಶ' },
          { id: 'consumption_rate', labelEn: 'Inventory Consumption & Burn Rate', labelKn: 'ದಾಸ್ತಾನು ಬಳಕೆ ಮತ್ತು ದೈನಂದಿನ ವೇಗ' },
          { id: 'diners', labelEn: 'People Eating in Canteen', labelKn: 'ಶಾಖೆಗಳ ಊಟದ ವಿವರಗಳು' },
          { id: 'wastage', labelEn: 'Food Wastage Analysis', labelKn: 'ಆಹಾರ ವ್ಯರ್ಥದ ವಿಶ್ಲೇಷಣೆ' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.id ? '700' : '500',
              color: activeTab === tab.id ? '#15803d' : '#64748b',
              background: activeTab === tab.id ? '#dcfce7' : 'transparent',
              border: activeTab === tab.id ? '1px solid #86efac' : '1px solid transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {currentLang === 'kn' ? tab.labelKn : tab.labelEn}
          </button>
        ))}
      </div>

      {/* =========================================================================
          TAB 1: EXECUTIVE SUMMARY (CHARTS + OVERVIEW)
          ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'diners') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Chart 1: Daily Diners Trend (Bar Chart SVG) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                  {currentLang === 'kn' ? 'ದೈನಂದಿನ ಊಟ ಸೇವಿಸಿದ ಜನರ ಪ್ರವೃತ್ತಿ' : 'Daily Diners Trend'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {timeframe === 'year'
                    ? (currentLang === 'kn' ? 'ವರ್ಷದ ಮಾಸಿಕ ಊಟ ಮಾಡಿದವರ ಸಾರಾಂಶ' : 'Monthly diner counts across the year')
                    : (currentLang === 'kn' ? 'ಆಯ್ಕೆಮಾಡಿದ ಅವಧಿಯಲ್ಲಿ ದಿನಂಪ್ರತಿ ಊಟ ಮಾಡಿದವರು' : 'Daily headcount fed in canteen')}
                </span>
              </div>
            </div>

            {/* Responsive Pure SVG Bar Chart */}
            {(() => {
              const rawSeries = dinersPillar.dailyDinersTimeSeries || [];

              if (rawSeries.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {currentLang === 'kn' ? 'ಯಾವುದೇ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ' : 'No dining data in this timeframe.'}
                  </div>
                );
              }

              // If more than 31 days (e.g. Yearly), group into clean monthly bars
              let chartData = rawSeries;
              if (rawSeries.length > 31) {
                const monthMap = {};
                rawSeries.forEach((s) => {
                  const key = s.date ? s.date.slice(0, 7) : 'Unknown'; // YYYY-MM
                  if (!monthMap[key]) {
                    monthMap[key] = { date: key, label: key, total: 0, breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
                  }
                  monthMap[key].total += s.total || 0;
                  monthMap[key].breakfast += s.breakfast || 0;
                  monthMap[key].lunch += s.lunch || 0;
                  monthMap[key].snacks += s.snacks || 0;
                  monthMap[key].dinner += s.dinner || 0;
                });
                chartData = Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date));
              }

              const maxDiners = Math.max(10, ...chartData.map((s) => s.total || 0));
              const svgWidth = 460;
              const svgHeight = 200;
              const marginLeft = 38;
              const marginRight = 16;
              const marginTop = 20;
              const marginBottom = 36;
              const plotWidth = svgWidth - marginLeft - marginRight;
              const plotHeight = svgHeight - marginTop - marginBottom;

              const count = chartData.length;
              const slotWidth = plotWidth / (count || 1);
              const barWidth = Math.max(4, Math.min(26, slotWidth * 0.65));

              return (
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    style={{ width: '100%', height: 'auto', display: 'block', overflow: 'hidden' }}
                  >
                    {/* Horizontal Grid lines & Y-Axis values */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = marginTop + plotHeight - pct * plotHeight;
                      const val = Math.round(pct * maxDiners);
                      return (
                        <g key={i}>
                          <line
                            x1={marginLeft}
                            y1={y}
                            x2={svgWidth - marginRight}
                            y2={y}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                            strokeDasharray={pct > 0 ? '3 3' : 'none'}
                          />
                          <text
                            x={marginLeft - 6}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#94a3b8"
                            fontWeight="500"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars */}
                    {chartData.map((item, idx) => {
                      const x = marginLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
                      const barH = Math.max(2, (item.total / maxDiners) * plotHeight);
                      const y = marginTop + plotHeight - barH;
                      const isYearly = rawSeries.length > 31;
                      const dateLabel = isYearly ? item.date.slice(5) : item.date ? item.date.slice(5) : '';

                      // Show label on bottom:
                      // All if count <= 12, every 5th if monthly
                      const showLabel = count <= 14 || (idx % Math.ceil(count / 7) === 0) || idx === count - 1;

                      return (
                        <g key={idx}>
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barH}
                            rx="3"
                            fill={item.total > 0 ? '#16a34a' : '#e2e8f0'}
                            opacity={item.total > 0 ? 0.92 : 0.45}
                          >
                            <title>{`${item.date}: ${item.total} people (Breakfast: ${item.breakfast}, Lunch: ${item.lunch}, Snacks: ${item.snacks}, Dinner: ${item.dinner})`}</title>
                          </rect>

                          {/* Date Tick below X Axis */}
                          {showLabel && (
                            <text
                              x={x + barWidth / 2}
                              y={marginTop + plotHeight + 16}
                              textAnchor="middle"
                              fontSize="8"
                              fill="#64748b"
                            >
                              {dateLabel}
                            </text>
                          )}

                          {/* Headcount Number above bar */}
                          {item.total > 0 && slotWidth >= 16 && (
                            <text
                              x={x + barWidth / 2}
                              y={y - 4}
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="700"
                              fill="#15803d"
                            >
                              {item.total}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '10px', background: '#16a34a', borderRadius: '2px' }} />
                      {currentLang === 'kn' ? 'ಊಟ ಸೇವಿಸಿದ ಜನರ ಸಂಖ್ಯೆ' : 'Diners Served'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Chart 2: Branch Headcounts Share (Donut / Distribution) */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                  {currentLang === 'kn' ? 'ಶಾಖಾವಾರು ಊಟದ ಹಂಚಿಕೆ' : 'Branch Dining Distribution'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {currentLang === 'kn' ? '೫ ಶಾಖೆಗಳ ಬೇಡಿಕೆ ಪ್ರಮಾಣ' : 'Meal shares across all 5 branches'}
                </span>
              </div>
              <Building2 size={20} style={{ color: '#0369a1' }} />
            </div>

            {/* Branch Share List with visual percentage bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(dinersPillar.branchBreakdown || []).map((b, i) => {
                const totalFed = dinersPillar.totalPeopleFed || 1;
                const pct = Math.round((b.total / totalFed) * 100) || 0;
                const colors = ['#0284c7', '#7c3aed', '#e11d48', '#0f766e', '#d97706'];
                const color = colors[i % colors.length];

                return (
                  <div key={i} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#1e293b' }}>
                        {currentLang === 'kn' && b.nameKn ? b.nameKn : b.name}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color }}>
                        {b.total} {currentLang === 'kn' ? 'ಜನರು' : 'people'} ({pct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.3s ease' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.72rem', color: '#64748b' }}>
                      <span>{currentLang === 'kn' ? 'ಉಪಾಹಾರ' : 'Breakfast'}: {b.breakfast || 0}</span>
                      <span>•</span>
                      <span>{currentLang === 'kn' ? 'ಮಧ್ಯಾಹ್ನ' : 'Lunch'}: {b.lunch || 0}</span>
                      <span>•</span>
                      <span>{currentLang === 'kn' ? 'ತಿಂಡಿ' : 'Snacks'}: {b.snacks || 0}</span>
                      <span>•</span>
                      <span>{currentLang === 'kn' ? 'ರಾತ್ರಿ' : 'Dinner'}: {b.dinner || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: INVENTORY CONSUMPTION & RATE OF CONSUMPTION
          ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'consumption_rate') && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                {currentLang === 'kn' ? 'ದಾಸ್ತಾನು ಬಳಕೆ ಮತ್ತು ದೈನಂದಿನ ವೇಗ (Burn Rate)' : 'Rate of Consumption of Inventory Items & Burn Rate'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {currentLang === 'kn'
                  ? 'ಸಾಮಗ್ರಿಗಳ ಬಳಕೆಯ ವೇಗ, ಅಡುಗೆಮನೆಯಲ್ಲಿ ಉಳಿದಿರುವ ದಿನಗಳು ಹಾಗೂ ಮರುಆದೇಶ ಅಗತ್ಯತೆಯ ವಿಶ್ಲೇಷಣೆ.'
                  : 'Daily usage velocity, remaining stock days before runout, and reordering urgency.'}
              </p>
            </div>

            {/* Search Box */}
            <input
              type="text"
              className="form-input no-print"
              style={{ maxWidth: '240px', fontSize: '0.8rem', padding: '4px 10px' }}
              placeholder={currentLang === 'kn' ? 'ಸಾಮಗ್ರಿ ಹುಡುಕಿ...' : 'Search ingredient...'}
              value={consumptionSearch}
              onChange={(e) => setConsumptionSearch(e.target.value)}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>{currentLang === 'kn' ? 'ಸಾಮಗ್ರಿ ಹೆಸರು' : 'Ingredient Name'}</th>
                  <th>{currentLang === 'kn' ? 'ವಿಭಾಗ' : 'Category'}</th>
                  <th>{currentLang === 'kn' ? 'ಅವಧಿಯಲ್ಲಿ ಬಳಕೆ' : 'Used in Period'}</th>
                  <th>{currentLang === 'kn' ? 'ದೈನಂದಿನ ಬಳಕೆಯ ವೇಗ' : 'Daily Burn Rate'}</th>
                  <th>{currentLang === 'kn' ? 'ಪ್ರಸ್ತುತ ದಾಸ್ತಾನು' : 'Current Stock'}</th>
                  <th>{currentLang === 'kn' ? 'ದಾಸ್ತಾನು ಮುಗಿಯುವ ದಿನಗಳು' : 'Stock Remaining'}</th>
                  <th>{currentLang === 'kn' ? 'ಸ್ಥಿತಿ' : 'Urgency Status'}</th>
                  <th>{currentLang === 'kn' ? 'ಬಳಕೆಯ ಮೌಲ್ಯ' : 'Consumption Cost'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsumptionRates.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      {currentLang === 'kn' ? 'ಈ ಅವಧಿಯಲ್ಲಿ ಯಾವುದೇ ಬಳಕೆಯ ದಾಖಲೆಗಳಿಲ್ಲ' : 'No ingredient consumption recorded in this timeframe.'}
                    </td>
                  </tr>
                ) : (
                  filteredConsumptionRates.map((item, idx) => {
                    const isCritical = item.stockStatus === 'Critical';
                    const isLow = item.stockStatus === 'Low';

                    return (
                      <tr key={idx} style={{ background: isCritical ? '#fff1f2' : isLow ? '#fffbeb' : 'transparent' }}>
                        <td>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>₹{item.unitPrice || 0} / {item.unit}</div>
                        </td>
                        <td>
                          <span className="category-pill">{item.category}</span>
                        </td>
                        <td style={{ fontWeight: '700', color: '#0f172a' }}>
                          {item.consumedQty} {item.unit}
                        </td>
                        <td style={{ color: '#0369a1', fontWeight: '600' }}>
                          {item.dailyBurnRate} {item.unit} / {currentLang === 'kn' ? 'ದಿನ' : 'day'}
                        </td>
                        <td style={{ fontWeight: '600' }}>
                          {item.currentStock} {item.unit}
                        </td>
                        <td>
                          <span style={{ fontWeight: '700', color: isCritical ? '#dc2626' : isLow ? '#d97706' : '#16a34a' }}>
                            {item.daysRemaining > 90 ? '> 90 days' : `${item.daysRemaining} ${currentLang === 'kn' ? 'ದಿನಗಳು' : 'days'}`}
                          </span>
                        </td>
                        <td>
                          {isCritical ? (
                            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700' }}>
                              ⚠️ {currentLang === 'kn' ? 'ತುರ್ತು ಮರುಆದೇಶ' : 'Critical Depletion'}
                            </span>
                          ) : isLow ? (
                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700' }}>
                              ⚡ {currentLang === 'kn' ? 'ಕಡಿಮೆ ದಾಸ್ತಾನು' : 'Low Stock'}
                            </span>
                          ) : (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700' }}>
                              ✓ {currentLang === 'kn' ? 'ಸಾಕಷ್ಟಿದೆ' : 'Adequate'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: '700', color: '#0f172a' }}>
                          ₹{Number(item.consumedCost || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: FOOD WASTAGE ANALYSIS
          ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'wastage') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Top Wasted Dishes Table */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                  {currentLang === 'kn' ? 'ವ್ಯರ್ಥವಾದ ತಿನಿಸುಗಳ ವಿಶ್ಲೇಷಣೆ' : 'Top Leftover & Wasted Dishes'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {currentLang === 'kn' ? 'ಉಳಿಕೆಯಾದ ತಿನಿಸುಗಳು ಮತ್ತು ಕಾರಣಗಳು' : 'Recorded surplus and disposition'}
                </span>
              </div>
              <Trash2 size={20} style={{ color: '#ef4444' }} />
            </div>

            {(wastagePillar.topWastedDishes || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <CheckCircle size={32} style={{ color: '#16a34a', margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: '700', color: '#15803d' }}>
                  {currentLang === 'kn' ? 'ಅದ್ಭುತ! ಶೂನ್ಯ ಆಹಾರ ವ್ಯರ್ಥ' : 'Zero Food Wastage Logged!'}
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {currentLang === 'kn' ? 'ಈ ಅವಧಿಯಲ್ಲಿ ಅಡುಗೆಮನೆಯಿಂದ ಯಾವುದೇ ಆಹಾರ ವ್ಯರ್ಥವಾಗಿಲ್ಲ.' : 'All prepared food was successfully consumed or distributed without surplus.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>{currentLang === 'kn' ? 'ಖಾದ್ಯದ ಹೆಸರು' : 'Dish'}</th>
                      <th>{currentLang === 'kn' ? 'ವಿಭಾಗ' : 'Category'}</th>
                      <th>{currentLang === 'kn' ? 'ವ್ಯರ್ಥ ಪ್ರಮಾಣ' : 'Quantity'}</th>
                      <th>{currentLang === 'kn' ? 'ಕಾರಣ / ವಿಲೇವಾರಿ' : 'Reason / Disposition'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(wastagePillar.topWastedDishes || []).map((dish, di) => (
                      <tr key={di}>
                        <td style={{ fontWeight: '700', color: '#1e293b' }}>
                          {currentLang === 'kn' && dish.dishNameKn ? dish.dishNameKn : dish.dishName}
                        </td>
                        <td>
                          <span className="category-pill">{dish.category}</span>
                        </td>
                        <td style={{ fontWeight: '700', color: '#dc2626' }}>
                          {dish.quantity} {dish.unit}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.78rem' }}>
                          {dish.reasons || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Wastage by Reason Distribution */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                  {currentLang === 'kn' ? 'ಆಹಾರ ವ್ಯರ್ಥದ ಪ್ರಮುಖ ಕಾರಣಗಳು' : 'Wastage by Reason / Disposal'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {currentLang === 'kn' ? 'ಉಳಿಕೆಗೆ ಕಾರಣಗಳ ಪರಿಶೀಲನೆ' : 'Operational factors behind food surplus'}
                </span>
              </div>
            </div>

            {(wastagePillar.wastageByReason || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                {currentLang === 'kn' ? 'ಯಾವುದೇ ವ್ಯರ್ಥದ ಕಾರಣ ದಾಖಲಾಗಿಲ್ಲ' : 'No wastage reasons recorded.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(wastagePillar.wastageByReason || []).map((reasonItem, ri) => (
                  <div key={ri} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600' }}>
                      <span style={{ color: '#334155' }}>{reasonItem.reason}</span>
                      <span style={{ color: '#dc2626' }}>{reasonItem.quantity} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Special Events Catering Summary Table in Period */}
      {(dinersPillar.specialEvents || []).length > 0 && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
            {currentLang === 'kn' ? 'ಈ ಅವಧಿಯ ವಿಶೇಷ ಸಮಾರಂಭದ ಔತಣಕೂಟಗಳು' : 'Special Event Functions in Period'}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>{currentLang === 'kn' ? 'ಸಮಾರಂಭದ ಹೆಸರು' : 'Event Name'}</th>
                  <th>{currentLang === 'kn' ? 'ಶಾಖೆ' : 'Branch'}</th>
                  <th>{currentLang === 'kn' ? 'ದಿನಾಂಕ & ಅವಧಿ' : 'Date & Session'}</th>
                  <th>{currentLang === 'kn' ? 'ಜನರ ಸಂಖ್ಯೆ' : 'Headcount'}</th>
                  <th>{currentLang === 'kn' ? 'ಖಾದ್ಯಗಳು' : 'Requested Dishes'}</th>
                  <th>{currentLang === 'kn' ? 'ಸ್ಥಿತಿ' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {(dinersPillar.specialEvents || []).map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: '700', color: '#1e293b' }}>{ev.eventName}</td>
                    <td>{currentLang === 'kn' && ev.branchNameKn ? ev.branchNameKn : ev.branchNameEn}</td>
                    <td>{ev.eventDate} ({ev.mealSession})</td>
                    <td style={{ fontWeight: '700', color: '#0f172a' }}>{ev.peopleCount} {currentLang === 'kn' ? 'ಜನರು' : 'people'}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(ev.requestedDishes || []).map((d, di) => (
                          <span key={di} style={{ background: '#f1f5f9', padding: '1px 8px', borderRadius: '10px', fontSize: '0.72rem' }}>
                            {currentLang === 'kn' && d.dishNameKn ? d.dishNameKn : d.dishName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', fontSize: '0.72rem' }}>
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

