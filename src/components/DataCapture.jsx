import { useState, useRef, useEffect } from 'react';
import { Camera, Video, Save, Activity, AlertTriangle, Download, Loader } from 'lucide-react';
import { allVocabularyWords, vocabularyCategories } from '../data/vocabulary';
import { initializeVisionPipeline } from '../utils/visionPipeline';
import { saveSample, getSampleCounts, getAllSamples } from '../utils/indexedDB';

const DataCapture = () => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const handLandmarkerRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const requestRef = useRef();
  const isRecordingRef = useRef(false);
  const framesRef = useRef([]);
  const recordingStartTimeRef = useRef(0);

  const refreshCounts = async () => {
    try {
      const counts = await getSampleCounts();
      setCapturedSamples(counts);
    } catch (err) {
      console.error("Failed to load sample counts", err);
    }
  };

  useEffect(() => {
    refreshCounts();

    const setup = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        const pipeline = await initializeVisionPipeline();
        if (pipeline && pipeline.handLandmarker && pipeline.poseLandmarker) {
          handLandmarkerRef.current = pipeline.handLandmarker;
          poseLandmarkerRef.current = pipeline.poseLandmarker;
          setIsModelLoaded(true);
        }
      } catch (err) {
        console.error("Error accessing camera or models:", err);
      }
    };

    setup();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

 const recordFrame = (timestamp) => {
  if (!isRecordingRef.current) return;

  if (recordingStartTimeRef.current === 0) {
    recordingStartTimeRef.current = timestamp;
  }
  const elapsed = timestamp - recordingStartTimeRef.current;
  console.log("DEBUG timestamp:", timestamp, "startTime:", recordingStartTimeRef.current, "elapsed:", elapsed);

  if (elapsed > 2000) { // 2 seconds
    console.log(`Recording loop ended, frames captured: ${framesRef.current.length}`);
    finishRecording();
    return;
  }

  if (videoRef.current && handLandmarkerRef.current && poseLandmarkerRef.current) {
    const video = videoRef.current;

    const handResults = handLandmarkerRef.current.detectForVideo(video, performance.now());
    const poseResults = poseLandmarkerRef.current.detectForVideo(video, performance.now());
    let left = null;
    let right = null;
    let pose = null;

    if (handResults.landmarks && handResults.landmarks.length > 0) {
      handResults.landmarks.forEach((landmarks, index) => {
        const handedness = handResults.handednesses[index][0].categoryName;
        const rawPoints = landmarks.map(lm => [lm.x, lm.y, lm.z]);
        if (handedness === 'Left') {
          left = rawPoints;
        } else {
          right = rawPoints;
        }
      });
    }

    if (poseResults.landmarks && poseResults.landmarks.length > 0) {
      const p = poseResults.landmarks[0];
      pose = [
        [p[11].x, p[11].y, p[11].z],
        [p[12].x, p[12].y, p[12].z],
        [p[13].x, p[13].y, p[13].z],
        [p[14].x, p[14].y, p[14].z],
        [p[15].x, p[15].y, p[15].z],
        [p[16].x, p[16].y, p[16].z]
      ];
    }

    framesRef.current.push({ left, right, pose });
    console.log(`Frame ${framesRef.current.length}: hand=${!!(left || right)}, pose=${!!pose}`);
  }

  requestRef.current = requestAnimationFrame(recordFrame);
};

  const finishRecording = async () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    cancelAnimationFrame(requestRef.current);
    
    const sample = {
      id: crypto.randomUUID(),
      signLabel: currentLabel,
      frames: [...framesRef.current],
      frameCount: framesRef.current.length,
      timestamp: Date.now()
    };
    
    console.log("Saving sample object:", sample);

    try {
      await saveSample(sample);
      console.log("Sample saved successfully");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      refreshCounts();
    } catch (err) {
      console.error("IndexedDB Save Error:", err);
      alert("Failed to save sample. Check console for details.");
    }
  };

  const handleRecord = () => {
    if (!currentLabel) {
      alert("Please select a sign label first.");
      return;
    }
    if (!hasConsent) {
      alert("You must provide consent before recording human-subjects data.");
      return;
    }
    if (!isModelLoaded) {
      alert("Models are still loading, please wait.");
      return;
    }
    
    if (!isRecording) {
      framesRef.current = [];
      recordingStartTimeRef.current = 0;
      setIsRecording(true);
      isRecordingRef.current = true;
      console.log("Recording started");
      requestRef.current = requestAnimationFrame(recordFrame);
    }
  };

  const handleExport = async () => {
    try {
      const allSamples = await getAllSamples();
      if (allSamples.length === 0) {
        alert("No data to export.");
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allSamples));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "signbridge_dataset.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error("Failed to export", err);
      alert("Failed to export data.");
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2><Video style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Data Capture Tool</h2>
        <span style={{ color: 'var(--text-secondary)' }}>Phase 1 Data Collection</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        
        {/* Main Camera View */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            aspectRatio: '16/9', 
            backgroundColor: '#000', 
            borderRadius: 'var(--border-radius-md)',
            overflow: 'hidden'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            {isRecording && (
              <div style={{ 
                position: 'absolute', 
                top: '1rem', 
                right: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--error)',
                fontWeight: '600',
                animation: 'pulse 1s infinite'
              }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--error)', borderRadius: '50%' }}></div>
                Recording
              </div>
            )}
            {showSuccess && !isRecording && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(16, 185, 129, 0.9)',
                padding: '1rem 2rem',
                borderRadius: 'var(--border-radius-md)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 10
              }}>
                <Save size={24} /> Successfully Captured "{currentLabel}"!
              </div>
            )}
            {!isModelLoaded && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Loader className="spin" size={16} /> Loading Models...
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="sign-label" style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>Select Target Sign</label>
                <select 
                  id="sign-label"
                  value={currentLabel}
                  onChange={(e) => setCurrentLabel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(30, 41, 59, 1)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  <option value="" disabled>-- Select a sign to record --</option>
                  {vocabularyCategories.map(cat => (
                    <optgroup key={cat.name} label={cat.name}>
                      {cat.words.map(word => (
                        <option key={word} value={word}>{word}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.5rem', 
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '0.75rem',
                borderRadius: 'var(--border-radius-sm)',
                marginTop: '0.5rem'
              }}>
                <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <label style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={hasConsent}
                    onChange={(e) => setHasConsent(e.target.checked)}
                    style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                  />
                  I explicitly consent to having my video recorded and stored for the purpose of training the SignBridge dataset.
                </label>
              </div>
            </div>
            
            <button 
              className={isRecording ? "btn-secondary" : "btn-primary"} 
              onClick={handleRecord}
              disabled={!hasConsent || !currentLabel || !isModelLoaded || isRecording}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                height: '46px',
                marginTop: '1.8rem',
                opacity: (!hasConsent || !currentLabel || !isModelLoaded || isRecording) ? 0.5 : 1,
                cursor: (!hasConsent || !currentLabel || !isModelLoaded || isRecording) ? 'not-allowed' : 'pointer'
              }}
            >
              {isRecording ? <Save size={18} /> : <Camera size={18} />}
              {isRecording ? 'Recording...' : 'Record Sign'}
            </button>
          </div>
        </div>

        {/* Sidebar Status / Progress */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} /> Collection Progress
          </h3>
          
          {Object.keys(capturedSamples).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
              No samples captured yet. Start recording to see progress.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {Object.entries(capturedSamples).map(([label, count]) => (
                <li key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--border-radius-sm)' }}>
                  <span style={{ fontWeight: '500' }}>{label}</span>
                  <span style={{ backgroundColor: 'var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {count} samples
                  </span>
                </li>
              ))}
            </ul>
          )}
          
          <button 
            onClick={handleExport}
            className="btn-secondary"
            style={{ 
              width: '100%', 
              marginTop: '1.5rem', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.75rem'
            }}
          >
            <Download size={18} /> Export All Data
          </button>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        
        /* Custom scrollbar for sidebar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1); 
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--bg-tertiary); 
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary); 
        }
      `}</style>
    </div>
  );
};

export default DataCapture;
