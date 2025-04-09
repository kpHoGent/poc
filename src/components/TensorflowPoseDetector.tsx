import React, { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { drawKeypoints, drawSkeleton } from '../utils/drawFunctions.ts';

const PoseDetectionComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Laad het MoveNet model
  useEffect(() => {
    const loadModel = async () => {
      setIsLoading(true);
      try {
        await tf.ready();
        await tf.setBackend('webgl');
        console.log('Current backend:', tf.getBackend());
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          {
            runtime: 'tfjs',
            modelType: 'lite', // Probeer eerst 'lite' versie
            enableSmoothing: true
          }
        );
        setModel(detector);
      } catch (error) {
        console.error('Error loading model:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      // Cleanup
      if (model) {
        model.dispose();
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Verwerk video upload
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.onloadedmetadata = () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      };
    }
  };

  const detectPoses = async () => {
    if (!model || !videoRef.current?.readyState) return;
  
    try {
      const poses = await model.estimatePoses(videoRef.current, {
        flipHorizontal: false,});
        console.log('Poses:', poses);
      const ctx = canvasRef.current?.getContext('2d');
      
      if (ctx && canvasRef.current && poses.length > 0) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(videoRef.current, 0, 0);
        
        poses.forEach(pose => {
          drawKeypoints(pose.keypoints, ctx);
          drawSkeleton(pose.keypoints, ctx, 
            poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.BlazePose));
        });
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  
    
      animationFrameRef.current = requestAnimationFrame(detectPoses);
    
  };
  
  const startDetection = () => {
    if (!isDetecting) {
      setIsDetecting(true);
      videoRef.current?.play();
      detectPoses();
    }
  };

  // Stop pose detectie
  const stopDetection = () => {
    setIsDetecting(false);
    cancelAnimationFrame(animationFrameRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

 
  return (
    <div className="pose-detection-container">
      <h2>Pose Estimation met MoveNet</h2>
      
      <div className="controls">
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
              disabled={isLoading || isDetecting}
            >
              Start Detectie
            </button>
            <button 
              onClick={stopDetection} 
              disabled={!isDetecting}
            >
              Stop Detectie
            </button>
          </>
        )}
      </div>

      {isLoading && <p>Model laden...</p>}

      <div className="video-container">
        <video 
          ref={videoRef} 
          playsInline 
          loop 
          muted 
          style={{ display: isDetecting ? 'none' : 'block' }}
        />
        <canvas 
          ref={canvasRef} 
          style={{ display: isDetecting ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
};
  

export default PoseDetectionComponent;