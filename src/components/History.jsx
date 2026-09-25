import React from 'react';
import { History as HistoryIcon, Clock } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const History = () => {
  const { settings } = useSettings();

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2><HistoryIcon style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Translation History</h2>
        <span style={{ color: 'var(--text-secondary)' }}>Current Session</span>
      </div>

      <div className="glass-panel" style={{ minHeight: '60vh' }}>
        {settings.history.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', padding: '4rem 0' }}>
            <HistoryIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No translations recorded in this session.</p>
            <p style={{ fontSize: '0.9rem' }}>Go to the Live Recognition screen to start translating.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {settings.history.map((item, index) => (
              <li key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                padding: '1rem', 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Clock size={14} /> {formatTime(item.timestamp)}
                </div>
                <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {item.text}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default History;
