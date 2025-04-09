import { useRef, useState } from "react";
import { usePoseLandmarker } from "../hooks/usePoseLandmarker";
import "../App.css";


const VideoPoseDetector = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const {detectPoseLandmarks, loading} = usePoseLandmarker(videoRef.current, canvasRef.current);

    const handleVideoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !videoRef.current) return;

        const videoURL = URL.createObjectURL(file);
        videoRef.current.src = videoURL;

        videoRef.current.onloadedmetadata = () => {
            if (canvasRef.current && videoRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
            }
        };

        videoRef.current.onplay = () => {
            setIsPlaying(true);
            startPoseDetection();
        };
        videoRef.current.onpause = () => {
            setIsPlaying(false);
        };
    }

    const startPoseDetection = () => {
        if (videoRef.current && !videoRef.current.paused) {
            const detectFrame = () => {
                if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                    detectPoseLandmarks();
                    requestAnimationFrame(detectFrame);
                }
            };
            requestAnimationFrame(detectFrame);
        }
    };

    const togglePlayPause = () => {
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play().catch(error => {
                console.error("Play failed:", error);
            });
        } else {
            videoRef.current.pause();
        }
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
                    disabled={loading}
                >
                    {loading ? 'Loading Model...' : 'Upload Video'}
                </button>
                
                <button
                    onClick={togglePlayPause}
                    className={`control-button play-button ${isPlaying ? 'playing' : ''}`}
                    disabled={loading}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>
            </div>
            
            <div className="video-container">
                <video 
                    ref={videoRef} 
                    controls={false}
                    playsInline
                    className="video-element"
                />
                <canvas 
                    ref={canvasRef} 
                    className="canvas-overlay"
                />
            </div>
        </div>
    );
    
};

export default VideoPoseDetector;