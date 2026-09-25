import React, { createContext, useState, useContext, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    language: 'English', // English, Tamil, Hindi
    overlayEnabled: false,
    textSize: 'large', // medium, large, xlarge
    cameraPosition: 'user', // user (front), environment (back)
    history: []
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addToHistory = (text) => {
    setSettings(prev => ({
      ...prev,
      history: [{ text, timestamp: new Date().toISOString() }, ...prev.history].slice(0, 100)
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, addToHistory }}>
      {children}
    </SettingsContext.Provider>
  );
};
