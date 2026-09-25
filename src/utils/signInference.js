// SignBridge - Real Model Inference & Gesture Segmentation Module
// Supports both dynamic motion velocity segmentation and raw window inference,
// plus time-warping speed variation data augmentation.

import * as ort from "onnxruntime-web";

const TARGET_FRAMES = 24;
const CONFIDENCE_THRESHOLD = 0.60;
const CONSECUTIVE_AGREEMENT_REQUIRED = 2;

let session = null;
let labelMap = null;

export async function loadModel() {
  session = await ort.InferenceSession.create("/model/model.onnx");
  const res = await fetch("/model/labels.json");
  labelMap = await res.json(); // { "0": "NO_SIGN", "1": "good morning", ... }
  console.log("Model loaded. Labels:", labelMap);
}

// Normalize one frame's landmarks: translation + scale invariant relative to shoulders
// pose order must match capture: [L shoulder, R shoulder, L elbow, R elbow, L wrist, R wrist]
function normalizeFrame(left, right, pose) {
  const lSh = pose[0], rSh = pose[1];
  const center = [
    (lSh[0] + rSh[0]) / 2,
    (lSh[1] + rSh[1]) / 2,
    (lSh[2] + rSh[2]) / 2,
  ];
  const dx = lSh[0] - rSh[0], dy = lSh[1] - rSh[1], dz = lSh[2] - rSh[2];
  let scale = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (scale < 1e-6) scale = 1.0;

  const normPoints = (points) => {
    if (!points) return { arr: new Array(63).fill(0), present: 0 };
    const out = [];
    for (const p of points) {
      out.push((p[0] - center[0]) / scale, (p[1] - center[1]) / scale, (p[2] - center[2]) / scale);
    }
    return { arr: out, present: 1 };
  };

  const leftN = normPoints(left);
  const rightN = normPoints(right);
  const poseN = [];
  for (const p of pose) {
    poseN.push((p[0] - center[0]) / scale, (p[1] - center[1]) / scale, (p[2] - center[2]) / scale);
  }

  // 63 + 63 + 18 + 2 = 146, same order as training
  return [...leftN.arr, ...rightN.arr, ...poseN, leftN.present, rightN.present];
}

// Linear interpolation resample from T frames to TARGET_FRAMES, per-dimension
export function resampleSequence(framesFeatures, targetLen = TARGET_FRAMES) {
  const T = framesFeatures.length;
  if (T === 0) return [];
  const D = framesFeatures[0].length;
  if (T === 1) {
    return Array.from({ length: targetLen }, () => framesFeatures[0].slice());
  }
  const oldIdx = Array.from({ length: T }, (_, i) => i / (T - 1));
  const newIdx = Array.from({ length: targetLen }, (_, i) => i / (targetLen - 1));

  const out = Array.from({ length: targetLen }, () => new Array(D).fill(0));
  for (let d = 0; d < D; d++) {
    const col = framesFeatures.map((f) => f[d]);
    for (let ni = 0; ni < newIdx.length; ni++) {
      const t = newIdx[ni];
      let j = 0;
      while (j < oldIdx.length - 1 && oldIdx[j + 1] < t) j++;
      const j2 = Math.min(j + 1, oldIdx.length - 1);
      const t0 = oldIdx[j], t1 = oldIdx[j2];
      const frac = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      out[ni][d] = col[j] + (col[j2] - col[j]) * frac;
    }
  }
  return out;
}

/**
 * Time-warping data augmentation for sequence expansion (Option 3).
 * Simulates non-linear speed variations (e.g. 0.7x, 1.3x speed factor) across frames.
 */
export function augmentSequenceTimeWarp(framesFeatures, speedFactor = 1.0) {
  const T = framesFeatures.length;
  if (T < 3 || speedFactor === 1.0) return framesFeatures;
  
  // Warp indices non-linearly using power curves or speed scaling
  const warpedIndices = [];
  for (let i = 0; i < T; i++) {
    const normTime = i / (T - 1);
    // Non-linear warp curve
    const warpedTime = Math.pow(normTime, speedFactor);
    warpedIndices.push(warpedTime * (T - 1));
  }
  
  const D = framesFeatures[0].length;
  const out = Array.from({ length: T }, () => new Array(D).fill(0));
  for (let d = 0; d < D; d++) {
    const col = framesFeatures.map((f) => f[d]);
    for (let i = 0; i < T; i++) {
      const idx = warpedIndices[i];
      const j = Math.floor(idx);
      const j2 = Math.min(j + 1, T - 1);
      const frac = idx - j;
      out[i][d] = col[j] + (col[j2] - col[j]) * frac;
    }
  }
  return out;
}

// Calculate Kinetic Velocity between consecutive landmark frames
function computeFrameVelocity(prevFrame, currFrame) {
  if (!prevFrame || !currFrame) return 0;
  let totalDist = 0;
  let count = 0;

  // Pose Wrists (indices 4 and 5)
  if (prevFrame.pose && currFrame.pose) {
    for (let i = 4; i <= 5; i++) {
      const p1 = prevFrame.pose[i];
      const p2 = currFrame.pose[i];
      if (p1 && p2) {
        const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2];
        totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
        count++;
      }
    }
  }

  // Hand keypoints (Wrists [0], Index Tips [8], Thumb Tips [4])
  ['left', 'right'].forEach((hand) => {
    if (prevFrame[hand] && currFrame[hand]) {
      const keyIndices = [0, 4, 8];
      keyIndices.forEach((idx) => {
        const p1 = prevFrame[hand][idx];
        const p2 = currFrame[hand][idx];
        if (p1 && p2) {
          const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2];
          totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
          count++;
        }
      });
    }
  });

  return count > 0 ? totalDist / count : 0;
}

// Dynamic Gesture Motion Segmentation State
let rollingBuffer = [];
const ROLLING_WINDOW_MS = 2000;
let bufferTimestamps = [];
let recentPredictions = [];

let activeGestureBuffer = [];
let lastProcessedFrame = null;
let isGestureActive = false;
let restFrameCounter = 0;
let gestureStartTime = 0;

// Velocity thresholds (calibrated for normalized MediaPipe coordinates per frame)
const MOTION_START_VELOCITY = 0.006; // Sensitive motion trigger for gesture onset
const MOTION_REST_VELOCITY = 0.003;  // Rest threshold when gesture finishes
const REST_PAUSE_FRAMES = 3;          // Settle pause frames to finalize gesture clip
const MIN_GESTURE_FRAMES = 4;         // Minimum frames required for valid gesture

export function pushFrame(left, right, pose, timestamp) {
  const currentFrame = { left, right, pose };
  const hasHandInFrame = Boolean(left || right);

  // Maintain rolling buffer for continuous stream backup
  rollingBuffer.push(currentFrame);
  bufferTimestamps.push(timestamp);
  while (bufferTimestamps.length > 0 && timestamp - bufferTimestamps[0] > ROLLING_WINDOW_MS) {
    rollingBuffer.shift();
    bufferTimestamps.shift();
  }

  // Compute frame velocity for dynamic segmentation
  const velocity = computeFrameVelocity(lastProcessedFrame, currentFrame);
  lastProcessedFrame = currentFrame;

  let completedClip = null;

  if (!isGestureActive) {
    // Detect gesture onset when hands are visible and moving
    if (hasHandInFrame && (velocity >= MOTION_START_VELOCITY || activeGestureBuffer.length > 0)) {
      isGestureActive = true;
      activeGestureBuffer = [currentFrame];
      gestureStartTime = timestamp;
      restFrameCounter = 0;
    }
  } else {
    // Accumulate frames during active gesture
    if (hasHandInFrame) {
      activeGestureBuffer.push(currentFrame);
    }

    if (velocity < MOTION_REST_VELOCITY || !hasHandInFrame) {
      restFrameCounter++;
    } else {
      restFrameCounter = 0;
    }

    const elapsed = timestamp - gestureStartTime;

    // Lock and finalize complete gesture sequence
    if (restFrameCounter >= REST_PAUSE_FRAMES || elapsed >= ROLLING_WINDOW_MS) {
      if (activeGestureBuffer.length >= MIN_GESTURE_FRAMES) {
        completedClip = [...activeGestureBuffer];
      }
      isGestureActive = false;
      activeGestureBuffer = [];
      restFrameCounter = 0;
    }
  }

  return { velocity, isGestureActive, hasHandInFrame, completedClip };
}

// Run ONNX inference on a specified sequence of frames
export async function runInferenceOnSequence(framesSequence, isSegmentedClip = true) {
  if (!session || !framesSequence || framesSequence.length < 4) {
    return { label: null, confidence: 0, stable: false };
  }

  const featureFrames = framesSequence.map((f) => normalizeFrame(f.left, f.right, f.pose));
  const resampled = resampleSequence(featureFrames); // (24, 146)

  const flat = new Float32Array(TARGET_FRAMES * 146);
  for (let t = 0; t < TARGET_FRAMES; t++) {
    for (let d = 0; d < 146; d++) {
      flat[t * 146 + d] = resampled[t][d];
    }
  }

  const tensor = new ort.Tensor("float32", flat, [1, TARGET_FRAMES, 146]);
  const results = await session.run({ landmarks: tensor });
  const logits = results.logits.data;

  // Softmax
  const maxLogit = Math.max(...logits);
  const exps = Array.from(logits, (v) => Math.exp(v - maxLogit));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((v) => v / sumExp);

  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }
  const bestLabel = labelMap[String(bestIdx)];
  const bestConf = probs[bestIdx];

  // For dynamic completed clips, evaluate confidence directly
  if (isSegmentedClip) {
    const isAccepted = bestConf >= CONFIDENCE_THRESHOLD && bestLabel !== "NO_SIGN";
    return {
      label: bestLabel,
      confidence: bestConf,
      stable: isAccepted,
      stableLabel: isAccepted ? bestLabel : null
    };
  }

  // Stream predictions consecutive smoothing
  if (bestConf >= CONFIDENCE_THRESHOLD && bestLabel !== "NO_SIGN") {
    recentPredictions.push(bestLabel);
  } else {
    recentPredictions.push(null);
  }
  if (recentPredictions.length > 2) {
    recentPredictions.shift();
  }

  const stable =
    recentPredictions.length >= 2 &&
    recentPredictions.every((p) => p === recentPredictions[0]) &&
    recentPredictions[0] !== null;

  return { label: bestLabel, confidence: bestConf, stable, stableLabel: stable ? recentPredictions[0] : null };
}

export async function runInference() {
  return runInferenceOnSequence(rollingBuffer, false);
}

