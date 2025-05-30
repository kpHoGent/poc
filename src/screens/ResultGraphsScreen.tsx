import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  angleDifferencePerAngle,
  dtwAlignAngleSequences,
  extractAngleVectorsFromVideo,
  interpolatePerAngleArray,
  warpTimeDynamically,
} from "../utils/comparisonAlgorithms";
import { Pose } from "@tensorflow-models/pose-detection";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register required components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ResultGraphsScreenProps {
  video1Poses: Pose[][]; // Array of poses for each frame of video 1
  video2Poses: Pose[][]; // Array of poses for each frame of video 2
  handleGoToVisualization: (interpolated: number[][]) => void; // Optional callback for navigation
}

const ResultGraphsScreen: React.FC<ResultGraphsScreenProps> = ({
  video1Poses,
  video2Poses,
  handleGoToVisualization,
}) => {
  const [perAngleSimilarities, setPerAngleSimilarities] = useState<number[][]>(
    []
  );

  useEffect(() => {
    if (video1Poses.length === 0 || video2Poses.length === 0) return;

    //const angles1 = extractAngleVectorsFromVideo(video1Poses);
    //const angles2 = extractAngleVectorsFromVideo(video2Poses);

    const singlePoseReferenceVideo = video1Poses.map(
      (posesInFrame) => posesInFrame[0]
    );
    const singlePoseComparisonVideo = video2Poses.map(
      (posesInFrame) => posesInFrame[0]
    );

    const { alignedReference, alignedComparison, alignedPath } =
      warpTimeDynamically(singlePoseReferenceVideo, singlePoseComparisonVideo);

    console.log("Aligned Path:", alignedPath);
    console.log("Aligned Reference:", alignedReference);
    console.log("Aligned Comparison:", alignedComparison);

    const anglesFromReference = extractAngleVectorsFromVideo(alignedReference);
    const anglesFromComparison =
      extractAngleVectorsFromVideo(alignedComparison);

    console.log("Angles from Reference:", anglesFromReference);
    console.log("Angles from Comparison:", anglesFromComparison);

    const perAngle = angleDifferencePerAngle(
      anglesFromReference,
      anglesFromComparison
    );

    const mappedPerAngle: (number[] | undefined)[] = Array(
      video2Poses.length
    ).fill(undefined);

    alignedPath.forEach(([iRef, jComp], idx) => {
      mappedPerAngle[jComp] = perAngle[idx];
    });

    // Stap 2: Forward-fill undefined waarden
    let lastKnown: number[] = [];
    const filledPerAngle: number[][] = mappedPerAngle.map((angles) => {
      if (angles !== undefined) {
        lastKnown = angles;
        return angles;
      } else {
        return lastKnown;
      }
    });

    // Stap 3: Setten als number[][]
    setPerAngleSimilarities(filledPerAngle);
  }, [video1Poses, video2Poses]);

  const navigateToVisualization = () => {
    const transposed: number[][] = perAngleSimilarities[0].map((_, frameIdx) =>
      perAngleSimilarities.map((angleArr) => angleArr[frameIdx])
    );
    handleGoToVisualization(transposed);
  };

  return (
    <div>
      <h1>Result Graphs</h1>
      {[
        "Schouder - Elleboog - Pols",
        "Heup - Knie - Enkel",
        "Heup - Schouder - Elleboog",
        "Schouder - Heup - Knie",
      ].map((label, i) => (
        <div key={i} style={{ marginBottom: "2rem" }}>
          <h2>{label}</h2>
          <Line
            data={{
              labels: perAngleSimilarities[i]?.map((_, idx) => idx),
              datasets: [
                {
                  label: `${label}`,
                  data: perAngleSimilarities[i],
                  borderColor: "rgba(75, 192, 192, 1)",
                  backgroundColor: "rgba(75, 192, 192, 0.2)",
                  fill: true,
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" as const },
              },
              scales: {
                x: {
                  title: { display: true, text: "Frames (na DTW)" },
                  ticks: {
                    stepSize: 15,
                    callback: (value: any, index: number) =>
                      index % 15 === 0 ? value : null,
                  },
                },
                y: {
                  title: {
                    display: true,
                    text: "Verschil in graden",
                  },
                  min: 0,
                  max: 180,
                },
              },
            }}
          />
        </div>
      ))}
      <button
        style={{
          marginTop: "2rem",
          padding: "0.7rem 2rem",
          fontSize: "1.1rem",
        }}
        onClick={navigateToVisualization}
      >
        Ga naar Visualisatie
      </button>
    </div>
  );
};

export default ResultGraphsScreen;
