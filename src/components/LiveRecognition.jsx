import React, { useRef, useState, useEffect } from 'react';
import { Volume2, Loader, Activity, Play, Square } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { initializeVisionPipeline } from '../utils/visionPipeline';
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import { translateGloss, getLanguageCode } from '../utils/translator';
import { loadModel, pushFrame, runInference, runInferenceOnSequence } from '../utils/signInference';

const LiveRecognition = () => {
  const { settings, addToHistory } = useSettings();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentCaption, setCurrentCaption] = useState("Initializing...");
  const [confidence, setConfidence] = useState(0);
  const [isListening, setIsListening] = useState(true);
  const [motionStatus, setMotionStatus] = useState("Waiting for sign...");

  const handLandmarkerRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const requestRef = useRef();

  const settingsRef = useRef(settings);
  const isListeningRef = useRef(isListening);
  const lastTriggeredRef = useRef(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    isListeningRef.current = isListening;
    if (isListening) {
      setCurrentCaption("Listening for signs...");
      setMotionStatus("Waiting for sign...");
      setConfidence(0);
    } else {
      setCurrentCaption("Recognition Paused");
      setMotionStatus("Recognition Stopped");
    }
  }, [isListening]);

  const toggleListening = () => {
    setIsListening((prev) => !prev);
  };

  const triggerTTS = (text) => {
    if (!text) return;
    const targetLang = settingsRef.current.language;
    const translatedText = translateGloss(text, targetLang);

    const utterance = new SpeechSynthesisUtterance(translatedText);
    const langCode = getLanguageCode(targetLang);
    utterance.lang = langCode;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(langCode) || v.lang.startsWith(langCode.split('-')[0]));
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: settings.cameraPosition, width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const pipeline = await initializeVisionPipeline();
        if (pipeline && pipeline.handLandmarker) {
          handLandmarkerRef.current = pipeline.handLandmarker;
        }
        if (pipeline && pipeline.poseLandmarker) {
          poseLandmarkerRef.current = pipeline.poseLandmarker;
        }

        await loadModel(); // loads model.onnx + labels.json

        setIsModelLoaded(true);
      } catch (err) {
        console.error("Camera access denied or model load failed", err);
      }
    };
    setup();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [settings.cameraPosition]);

  const predictWebcam = async () => {
    if (!videoRef.current || !canvasRef.current || !handLandmarkerRef.current || !poseLandmarkerRef.current) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    if (video.currentTime !== predictWebcam.lastVideoTime) {
      predictWebcam.lastVideoTime = video.currentTime;

      const handResults = handLandmarkerRef.current.detectForVideo(video, performance.now());
      const poseResults = poseLandmarkerRef.current.detectForVideo(video, performance.now());

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (settingsRef.current.overlayEnabled && handResults.landmarks) {
        const drawingUtils = new DrawingUtils(ctx);
        for (const landmarks of handResults.landmarks) {
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 2
          });
          drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });
        }
      }

      if (isListeningRef.current) {
        // Extract left/right hand landmarks (same logic as Data Capture)
        let left = null;
        let right = null;
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

        // Extract pose landmarks (shoulders, elbows, wrists - same indices as Data Capture)
        let pose = null;
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

        if (pose) {
          // Push frame to dynamic velocity segmentation engine (Option 2)
          const { velocity, isGestureActive, hasHandInFrame, completedClip } = pushFrame(left, right, pose, performance.now());

          if (!hasHandInFrame) {
            setMotionStatus("Raise hand in front of camera...");
          } else if (isGestureActive) {
            setMotionStatus("Signing detected...");
          } else {
            setMotionStatus("Hand ready — start signing...");
          }

          let result = null;

          if (completedClip) {
            // Motion completion detected! Run inference on clean segmented gesture clip
            setMotionStatus("Recognizing sign...");
            result = await runInferenceOnSequence(completedClip, true);
          } else if (hasHandInFrame) {
            // Rolling stream evaluation backup
            result = await runInference();
          }

          if (result && result.stable && result.stableLabel) {
            if (result.stableLabel !== lastTriggeredRef.current) {
              lastTriggeredRef.current = result.stableLabel;

              const translatedCandidate = translateGloss(result.stableLabel, settingsRef.current.language);
              setCurrentCaption(translatedCandidate);
              setConfidence(Math.round(result.confidence * 100));
              addToHistory(result.stableLabel);

              triggerTTS(result.stableLabel);
            }
          } else if (result && !result.stable) {
            // allow the same word to be re-triggered after the stable streak breaks
            lastTriggeredRef.current = null;
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const handleVideoPlay = () => {
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const playTTS = () => {
    triggerTTS(currentCaption);
  };

  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', backgroundColor: '#000', position: 'relative' }}>
      {/* Video Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          onPlay={handleVideoPlay}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', transform: 'scaleX(-1)' }}
        />

        {/* State Indicator */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {isModelLoaded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(0,0,0,0.65)',
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--accent-primary)',
              fontSize: '0.85rem',
              fontWeight: '500',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Activity size={14} />
              {motionStatus}
            </div>
          )}

          <button
            onClick={toggleListening}
            disabled={!isModelLoaded}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: isListening ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
              color: isListening ? 'var(--error)' : 'var(--success)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--border-radius-sm)',
              fontWeight: '600',
              cursor: isModelLoaded ? 'pointer' : 'not-allowed',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.2s ease'
            }}
            title={isListening ? "Stop Live Recognition" : "Start Live Recognition"}
          >
            {isListening ? (
              <>
                <Square size={14} fill="currentColor" /> Stop Recognition
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" /> Start Recognition
              </>
            )}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--border-radius-sm)',
            color: isModelLoaded ? (isListening ? 'var(--success)' : 'var(--warning)') : 'var(--text-secondary)',
            fontWeight: '600',
            backdropFilter: 'blur(4px)'
          }}>
            {isModelLoaded ? (
              <>
                <div style={{ width: '12px', height: '12px', backgroundColor: isListening ? 'var(--success)' : 'var(--warning)', borderRadius: '50%', animation: isListening ? 'pulse 1.5s infinite' : 'none' }}></div>
                {isListening ? 'Listening' : 'Paused'}
              </>
            ) : (
              <>
                <Loader className="spin" size={16} />
                Loading Model...
              </>
            )}
          </div>
        </div>
      </div>

      {/* Caption Bar */}
      <div style={{
        height: '180px',
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)',
        padding: '1.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '1rem',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{
            fontSize: settings.textSize === 'large' ? '2.5rem' : settings.textSize === 'xlarge' ? '3.5rem' : '1.8rem',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.2
          }}>
            {currentCaption}
          </p>
          <button
            onClick={playTTS}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '1rem',
              borderRadius: '50%',
              display: 'flex',
              color: 'var(--text-primary)'
            }}
            aria-label="Replay Audio"
          >
            <Volume2 size={32} />
          </button>
        </div>

        {/* Confidence Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confidence</span>
          <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${confidence}%`,
              backgroundColor: confidence > 85 ? 'var(--success)' : confidence > 60 ? 'var(--warning)' : 'var(--error)',
              transition: 'width 0.3s ease, background-color 0.3s ease'
            }} />
          </div>
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
      `}</style>
    </div>
  );
};

export default LiveRecognition;