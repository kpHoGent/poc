import React, { useRef } from "react";
import { drawPoses } from "../utils/drawFunctions";

interface VisualizationScreenProps {
  referenceVideoUrl: string;
  targetVideoUrl: string;
  targetPoses: any[][]; // Array van poses per frame voor target video
  angleDiffs: number[][]; // Toegevoegd: per-hoekverschillen per frame
}

const VisualizationScreen: React.FC<VisualizationScreenProps> = ({
  referenceVideoUrl,
  targetVideoUrl,
  targetPoses,
  angleDiffs,
}) => {
  const refVideoRef = useRef<HTMLVideoElement>(null);
  const targetVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mapping van hoeken naar skeletonlijnen (volgorde moet overeenkomen met drawFunctions connections)
  const angleToConnectionIndices = [
    [0, 1], // 0: right_shoulder-right_elbow, right_elbow-right_wrist
    [3, 4], // 1: right_hip-right_knee, right_knee-right_ankle
    [2, 0], // 2: right_hip-right_shoulder, right_shoulder-right_elbow
    [2, 3], // 3: right_shoulder-right_hip, right_hip-right_knee
  ];

  // Synchroniseer beide video's en teken skeleton op target
  const handlePlay = () => {
    refVideoRef.current?.play();
    targetVideoRef.current?.play();
    drawLoop();
  };

  const handlePause = () => {
    refVideoRef.current?.pause();
    targetVideoRef.current?.pause();
  };

  // Herstart beide video's als ze afgelopen zijn
  const handleEnded = () => {
    if (refVideoRef.current && targetVideoRef.current) {
      refVideoRef.current.currentTime = 0;
      targetVideoRef.current.currentTime = 0;
      refVideoRef.current.play();
      targetVideoRef.current.play();
      drawLoop();
    }
  };

  // Teken skeleton op target video
  const drawLoop = () => {
    if (!targetVideoRef.current || !canvasRef.current) return;
    const video = targetVideoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Frame index bepalen
    const frameIdx = Math.floor(video.currentTime * 30); // 30 fps
    if (frameIdx < 0 || frameIdx >= angleDiffs.length) {
      // Geen valid angleDiffs voor dit frame, skip tekenen
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (targetPoses[frameIdx] && targetPoses[frameIdx].length > 0) {
      // --- Bepaal kleuren per skeletonlijn op basis van interpolatedAngleDiffs ---
      type Color = "green" | "yellow" | "red";
      const lineColors: Color[] = Array(5).fill("green");
      const colorPriority: Record<"green" | "yellow" | "red", number> = {
        green: 0,
        yellow: 1,
        red: 2,
      };

      const angleData = angleDiffs[frameIdx];
      if (Array.isArray(angleData) && angleData.length >= 4) {
        for (let angleIdx = 0; angleIdx < 4; angleIdx++) {
          const angleDiff = angleDiffs[frameIdx][angleIdx];
          let color: Color = "green";
          if (angleDiff > 20) color = "red";
          else if (angleDiff > 10) color = "yellow";

          for (const connIdx of angleToConnectionIndices[angleIdx]) {
            const currentColor = lineColors[connIdx];
            if (
              !currentColor || // eerste keer
              colorPriority[color] > colorPriority[currentColor]
            ) {
              lineColors[connIdx] = color;
            }
          }
        }
      }
      drawPoses(targetPoses[frameIdx], ctx, lineColors);
    }
    if (!video.paused && !video.ended) {
      requestAnimationFrame(drawLoop);
    }
  };

  // Canvas grootte aanpassen aan video
  const handleTargetLoaded = () => {
    if (targetVideoRef.current && canvasRef.current) {
      canvasRef.current.width = targetVideoRef.current.videoWidth;
      canvasRef.current.height = targetVideoRef.current.videoHeight;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 700 }}>
        <h3>Te vergelijken video (met skeleton)</h3>
        <div style={{ position: "relative", width: "100%" }}>
          <video
            ref={targetVideoRef}
            src={targetVideoUrl}
            onLoadedMetadata={handleTargetLoaded}
            onEnded={handleEnded}
            style={{ width: "100%", maxWidth: 700, minHeight: 320 }}
            controls={false}
            muted
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </div>
      <div style={{ width: "100%", maxWidth: 700, marginTop: "0.5rem" }}>
        <h3>Referentie video</h3>
        <video
          ref={refVideoRef}
          src={referenceVideoUrl}
          onEnded={handleEnded}
          style={{ width: "100%", maxWidth: 700, minHeight: 320 }}
          controls={false}
          muted
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "1rem",
          alignItems: "center",
          marginTop: "1.5rem",
        }}
      >
        <button onClick={handlePlay} style={{ padding: "0.5rem 1.5rem" }}>
          Play
        </button>
        <button onClick={handlePause} style={{ padding: "0.5rem 1.5rem" }}>
          Pause
        </button>
      </div>
    </div>
  );
};

export default VisualizationScreen;
