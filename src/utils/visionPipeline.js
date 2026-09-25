import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';

let visionPipelineInstance = null;
let isInitializing = false;
let initPromise = null;

export const initializeVisionPipeline = async () => {
  if (visionPipelineInstance) {
    return visionPipelineInstance;
  }
  
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  
  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      const [handLandmarker, poseLandmarker] = await Promise.all([
        HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        }),
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        })
      ]);

      visionPipelineInstance = { handLandmarker, poseLandmarker };
      isInitializing = false;
      return visionPipelineInstance;
    } catch (error) {
      console.error("Failed to initialize MediaPipe", error);
      isInitializing = false;
      return null;
    }
  })();

  return initPromise;
};
