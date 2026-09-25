import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Volume2, Type, Eye, Camera as CameraIcon, Play } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { getLanguageCode } from '../utils/translator';

const Settings = () => {
  const { settings, updateSetting } = useSettings();
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };
    
    // Load voices immediately if available, and also listen for changes
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const testVoice = () => {
    const langCode = getLanguageCode(settings.language);
    const testPhrase = settings.language === 'Hindi' ? "यह एक परीक्षण है" : 
                       settings.language === 'Tamil' ? "இது ஒரு சோதனை" : 
                       "This is a test";
    
    const utterance = new SpeechSynthesisUtterance(testPhrase);
    utterance.lang = langCode;
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(langCode) || v.lang.startsWith(langCode.split('-')[0]));
    if (voice) {
      utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const isVoiceAvailable = (lang) => {
    if (availableVoices.length === 0) return true; // Assume true while loading
    const langCode = getLanguageCode(lang);
    // Relaxed check: match full code or just the language part (e.g. 'hi' from 'hi-IN')
    return availableVoices.some(v => v.lang.startsWith(langCode) || v.lang.startsWith(langCode.split('-')[0]));
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2><SettingsIcon style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Settings</h2>
        <span style={{ color: 'var(--text-secondary)' }}>App Configuration</span>
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Language Selection */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Volume2 size={18} /> Output Language (TTS)
          </h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {['English', 'Hindi', 'Tamil'].map(lang => {
              const available = isVoiceAvailable(lang);
              return (
                <div key={lang} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button
                    onClick={() => updateSetting('language', lang)}
                    disabled={!available}
                    className={settings.language === lang ? 'btn-primary' : 'btn-secondary'}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      opacity: available ? 1 : 0.5,
                      cursor: available ? 'pointer' : 'not-allowed'
                    }}
                    title={!available ? `${lang} voice not available on this device.` : ''}
                  >
                    {lang}
                  </button>
                  {!available && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Unavailable</span>}
                </div>
              );
            })}
            <button 
              onClick={testVoice}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}
            >
              <Play size={16} /> Test Voice
            </button>
          </div>
        </div>

        {/* Text Size */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Type size={18} /> Caption Text Size
          </h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['medium', 'large', 'xlarge'].map(size => (
              <button
                key={size}
                onClick={() => updateSetting('textSize', size)}
                className={settings.textSize === size ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.5rem 1rem', textTransform: 'capitalize' }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Camera Selection */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <CameraIcon size={18} /> Camera Input
          </h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => updateSetting('cameraPosition', 'user')}
              className={settings.cameraPosition === 'user' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem' }}
            >
              Front (User)
            </button>
            <button
              onClick={() => updateSetting('cameraPosition', 'environment')}
              className={settings.cameraPosition === 'environment' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem' }}
            >
              Back (Environment)
            </button>
          </div>
        </div>

        {/* Overlay Toggle */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <Eye size={18} /> Debug Overlays
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={settings.overlayEnabled}
              onChange={(e) => updateSetting('overlayEnabled', e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '1rem' }}>Show MediaPipe Landmark Overlay (Skeleton tracking)</span>
          </label>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Useful for debugging model extraction, but distracting for everyday use. Default is OFF.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Settings;
