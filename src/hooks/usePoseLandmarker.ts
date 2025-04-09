import { useEffect, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export function usePoseLandmarker(
  video: HTMLVideoElement | null,
  canvas: HTMLCanvasElement | null
): any {
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker>();
  const [drawingUtils, setDrawingUtils] = useState<DrawingUtils | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setDrawingUtils(new DrawingUtils(ctx));
}, [canvas]);

  useEffect(() => {
    const createPoseLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 2,
      });

      setPoseLandmarker(poseLandmarker);
      setLoading(false);
    };

    createPoseLandmarker();
  }, []);

  async function detectPoseLandmarks() {
    if (!video || !canvas || !poseLandmarker || !drawingUtils) return;
    

    let startTimeMs = performance.now();
    if (video.currentTime) {
      
      poseLandmarker.detectForVideo(
        video,
        startTimeMs,
       (result) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return; 
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const landmark of result.landmarks) {
          drawingUtils.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
          });
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        }
        ctx.restore();
        }
      );
    }
  }

  return {detectPoseLandmarks, loading};
}
