import { useRef, useState } from "react";
import useTFPoseDetector from "../hooks/useTFPoseDetector";
import "../App.css";

const VideoPoseDetector = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [poses, setPoses] = useState<any[]>([]);

  const { loadModel, isLoading, isDetecting, detectPose, error } =
    useTFPoseDetector();

  const handleVideoFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    if (videoRef.current) {
      const videoURL = URL.createObjectURL(file);
      videoRef.current.src = videoURL;
      videoRef.current.onloadedmetadata = () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      };
    }
  };

  const handleDetectPoses = async () => {
    if (!videoFile) return;
    const detected = await detectPose(videoFile);
    setPoses(detected);
  };

  return (
    <div className="pose-detection-container">
      <h2>Video Pose Detection</h2>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleVideoFileUpload}
        accept="video/*"
        className="file-input"
      />
      <div className="control-buttons">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="control-button upload-button"
          disabled={isLoading}
        >
          {isLoading ? "Loading Model..." : "Upload Video"}
        </button>
        <button
          onClick={handleDetectPoses}
          className="control-button play-button"
          disabled={isLoading || isDetecting || !videoFile}
        >
          Detect Poses
        </button>
      </div>
      <div className="video-container">
        <video
          ref={videoRef}
          controls={true}
          playsInline
          className="video-element"
        />
        <canvas ref={canvasRef} className="canvas-overlay" />
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div style={{ marginTop: "1rem" }}>
        {poses.length > 0 && (
          <div>Detected {poses.length} frames with poses.</div>
        )}
      </div>
    </div>
  );
};

export default VideoPoseDetector;
