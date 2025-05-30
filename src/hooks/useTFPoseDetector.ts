import { useState } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";

const useTFPoseDetector = () => {
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const loadTensorFlow = async () => {
    try {
      await tf.ready();
    } catch (error) {
      setError(`Error loading TensorFlow.js: ${error}`);
    }
  };

  const loadModel = async (model: string) => {
    if (!model) {
      setError("Selecteer eerst een model");
      return;
    }

    setIsLoading(true);

    await loadTensorFlow();

    if (detector) {
      detector.dispose();
    }

    try {
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType:
            model === "Lightning"
              ? poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
              : poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        }
      );
      setDetector(detector);
      console.log("Detector loaded: " + detector);
      setError(null);
    } catch (error) {
      setError(`Error loading model: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const detectPose = async (videoFile: File): Promise<any[]> => {
    if (!detector || !videoFile) {
      setError("Can not detect poses without a detector or a video");
      return [];
    }

    setIsDetecting(true);
    setError(null);

    const poses: any[] = [];

    const videoUrl = URL.createObjectURL(videoFile);
    const video = document.createElement("video");
    video.src = videoUrl;

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.style.display = "none";
    document.body.appendChild(video);

    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject("Video kon niet geladen worden");
      });

      await video.play();
      video.pause(); // STOP de video zodat we handmatig frames kunnen pakken

      const frameRate = 30; // gewenste frames per seconde
      const frameDuration = 1 / frameRate; // tijd tussen frames in seconden

      const totalFrames = Math.floor(video.duration * frameRate);
      console.log(`Total frames to process: ${totalFrames}`);

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        video.currentTime = frameIdx * frameDuration;

        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve(); // wachten tot video op nieuwe tijdstip staat
        });

        try {
          const detectedPoses = await detector.estimatePoses(video);
          if (detectedPoses && detectedPoses.length > 0) {
            poses.push(detectedPoses);
          }
        } catch (error) {
          console.error(
            "Error tijdens pose detectie op frame",
            frameIdx,
            error
          );
        }
      }

      console.log("Detectie klaar ✅", poses);
    } catch (error) {
      setError(
        `Detection error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsDetecting(false);
      video.remove();
      URL.revokeObjectURL(videoUrl);
    }

    return poses;
  };

  return { loadModel, error, isLoading, isDetecting, detectPose };
};

export default useTFPoseDetector;
