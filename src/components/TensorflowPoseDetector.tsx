import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { drawPoses } from "../utils/drawFunctions.ts";
import "@mediapipe/pose";
import "@tensorflow/tfjs-core";

const PoseDetectionComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const animationFrameRef = useRef<number>(0);

  const availableModels = [
    { value: "", label: "Selecteer een model" },
    { value: "Lightning", label: "Lightning" },
    { value: "Thunder", label: "Thunder" },
  ];

  useEffect(() => {
    loadTensorFlow();
    return () => {
      if (detector) {
        detector.dispose();
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const loadTensorFlow = async () => {
    setIsLoading(true);
    try {
      await tf.ready();
    } catch (error) {
      setError(`Error loading TensorFlow.js: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModel = async () => {
    if (!model) {
      setError("Selecteer eerst een model");
      return;
    }

    setIsLoading(true);
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
      console.log("Model geladen:", detector);
      setError(null);
    } catch (error) {
      setError(`Error loading model: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoReady(false);

    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.onloadedmetadata = () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          setVideoReady(true);
        }
      };
      videoRef.current.onerror = () => {
        setError("Error loading video");
      };
    }
  };

  const detectPose = async () => {
    if (!model || !videoRef.current || !videoReady || !detector) {
      return;
    }

    try {
      let poses;

      
        poses = await detector.estimatePoses(videoRef.current);
      console.log("Poses detected:", poses);
      

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }

      if (poses && poses.length > 0) {
        drawPoses(poses, ctx);
      }
    } catch (error) {
      console.error("Detection error:", error);
      setError(
        `Detection error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      stopDetection();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(detectPose);
  };
  const startDetection = () => {
    if (!isDetecting && videoReady && detector) {
      setIsDetecting(true);
      videoRef.current?.play().catch((e) => {
        setError(`Video play error: ${e}`);
        setIsDetecting(false);
      });
      detectPose();
    }
  };

  const stopDetection = () => {
    setIsDetecting(false);
    cancelAnimationFrame(animationFrameRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <div className="pose-detection-container">
      <h2>Pose Estimation</h2>

      <div className="controls">
        <div className="model-selection">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isLoading}
          >
            {availableModels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button onClick={loadModel} disabled={isLoading || !model}>
            {isLoading ? "Laden..." : "Laad Model"}
          </button>
        </div>

        <input
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          disabled={isLoading}
        />

        {videoUrl && (
          <>
            <button
              onClick={startDetection}
              disabled={isLoading || isDetecting || !detector || !videoReady}
            >
              Start Detectie
            </button>
            <button onClick={stopDetection} disabled={!isDetecting}>
              Stop Detectie
            </button>
          </>
        )}
      </div>

      {isLoading && <p>Model laden...</p>}
      {error && <p className="error">{error}</p>}

      <div className="video-container">
        <video
          ref={videoRef}
          playsInline
          loop
          muted
          style={{ display: isDetecting ? "none" : "block" }}
        />
        <canvas
          ref={canvasRef}
          style={{ display: isDetecting ? "block" : "none" }}
        />
      </div>
    </div>
  );
};

export default PoseDetectionComponent;
