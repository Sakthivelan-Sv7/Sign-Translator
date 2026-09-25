import React from 'react';
import { BookOpen, CheckCircle, Circle } from 'lucide-react';
import { vocabularyCategories, allVocabularyWords } from '../data/vocabulary';

// For MVP Phase 1 UI display, we will mock the count of collected samples.
// In a real database, this would be fetched from the backend.
const getMockCollectedCount = (word) => {
  // Just a visual mock to show what it looks like when some are collected
  const collectedWords = ['hello', 'thank you', 'mother', 'water', 'happy'];
  return collectedWords.includes(word) ? 1 : 0;
};

const VocabularyCoverage = () => {
  const totalTarget = allVocabularyWords.length;
  const currentCoverage = allVocabularyWords.filter(w => getMockCollectedCount(w) > 0).length;
  const coveragePercentage = Math.round((currentCoverage / totalTarget) * 100);

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2><BookOpen style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Vocabulary Coverage</h2>
        <span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-lg)', fontSize: '0.9rem', fontWeight: '500' }}>
          Phase 1 Goal: {totalTarget} Signs
        </span>
      </div>

      {/* Overall Progress */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '600' }}>Overall Dataset Completion</span>
          <span style={{ color: 'var(--text-secondary)' }}>{currentCoverage} / {totalTarget} collected</span>
        </div>
        <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', height: '12px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${coveragePercentage}%`, 
            backgroundColor: 'var(--accent-primary)', 
            height: '100%',
            transition: 'width 0.5s ease' 
          }} />
        </div>
      </div>

      {/* Categories Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {vocabularyCategories.map((category) => {
          const catCollected = category.words.filter(w => getMockCollectedCount(w) > 0).length;
          
          return (
            <div key={category.name} className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{category.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                  {catCollected}/{category.words.length}
                </span>
              </div>
              
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {category.words.map(word => {
                  const isCollected = getMockCollectedCount(word) > 0;
                  return (
                    <li key={word} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      color: isCollected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.95rem'
                    }}>
                      {isCollected ? (
                        <CheckCircle size={16} color="var(--success)" />
                      ) : (
                        <Circle size={16} color="var(--border-color)" />
                      )}
                      {word}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VocabularyCoverage;
