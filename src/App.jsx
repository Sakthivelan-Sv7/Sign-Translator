import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import DataCapture from './components/DataCapture';
import VocabularyCoverage from './components/VocabularyCoverage';
import LiveRecognition from './components/LiveRecognition';
import History from './components/History';
import Settings from './components/Settings';
import { Camera, Home, Layers, BookOpen, Video, History as HistoryIcon, Settings as SettingsIcon } from 'lucide-react';
import { SettingsProvider } from './context/SettingsContext';
import './index.css';

const Navigation = () => {
  const location = useLocation();
  
  const NavLink = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--border-radius-md)',
          textDecoration: 'none',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
          fontWeight: '500',
          transition: 'all 0.2s ease'
        }}
      >
        <Icon size={18} /> <span className="nav-label">{label}</span>
      </Link>
    );
  };
  
  return (
    <nav style={{ 
      backgroundColor: 'var(--bg-secondary)', 
      borderBottom: '1px solid var(--border-color)',
      padding: '1rem 0'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            backgroundColor: 'var(--accent-primary)', 
            padding: '0.5rem', 
            borderRadius: 'var(--border-radius-md)',
            display: 'flex'
          }}>
            <Layers size={24} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>SignBridge</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          <NavLink to="/" icon={Home} label="Home" />
          <NavLink to="/live" icon={Video} label="Live Recognition" />
          <NavLink to="/history" icon={HistoryIcon} label="Transcript" />
          <NavLink to="/capture" icon={Camera} label="Data Capture" />
          <NavLink to="/vocabulary" icon={BookOpen} label="Vocabulary" />
          <NavLink to="/settings" icon={SettingsIcon} label="Settings" />
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nav-label { display: none; }
        }
      `}</style>
    </nav>
  );
};

const HomePage = () => (
  <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
    <div>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Real-Time ISL Translation</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
        A fully client-side, privacy-preserving Indian Sign Language translator built on MediaPipe Tasks Vision.
      </p>
    </div>
    
    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <Link to="/live" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '1rem 2rem', fontSize: '1.1rem' }}>
        <Video size={20} /> Start Live Translation
      </Link>
      <Link to="/capture" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '1rem 2rem', fontSize: '1.1rem' }}>
        <Camera size={20} /> Collect Data
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <SettingsProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navigation />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/live" element={<LiveRecognition />} />
              <Route path="/history" element={<History />} />
              <Route path="/vocabulary" element={<VocabularyCoverage />} />
              <Route path="/capture" element={<DataCapture />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SettingsProvider>
  );
}

export default App;
