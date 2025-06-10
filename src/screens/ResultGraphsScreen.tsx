import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  angleDifferencePerAngle,
  dtwAlignAngleSequences,
  extractAngleVectorsFromVideo,
  preprocessPoses,
  warpTimeDynamically,
  dtw,
  dtwPerAngle,
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
  const [graphSimilarities, setGraphSimilarities] = useState<number[][]>([]);
  const [perAngleSimilarities, setPerAngleSimilarities] = useState<number[][]>(
    []
  );

  /*useEffect(() => {
    if (video1Poses.length === 0 || video2Poses.length === 0) return;

    //const angles1 = extractAngleVectorsFromVideo(video1Poses);
    //const angles2 = extractAngleVectorsFromVideo(video2Poses);

    const singlePoseReferenceVideo = video1Poses.map(
      (posesInFrame) => posesInFrame[0]
    );
    const singlePoseComparisonVideo = video2Poses.map(
      (posesInFrame) => posesInFrame[0]
    );

    const preprocessedReference = preprocessPoses(singlePoseReferenceVideo);
    const preprocessedComparison = preprocessPoses(singlePoseComparisonVideo);

    const { alignedReference, alignedComparison, alignedPath } = dtw(
      preprocessedReference,
      preprocessedComparison
    );

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

    setGraphSimilarities(perAngle);

    // Stap 3: Setten als number[][]
    setPerAngleSimilarities(filledPerAngle);
  }, [video1Poses, video2Poses]); */

  useEffect(() => {
    if (video1Poses.length === 0 || video2Poses.length === 0) return;

    // 1. Haal eerste pose per frame uit beide video's
    const singlePoseReferenceVideo = video1Poses.map(
      (posesInFrame) => posesInFrame[0]
    );
    const singlePoseComparisonVideo = video2Poses.map(
      (posesInFrame) => posesInFrame[0]
    );

    // 2. Bereken de hoeken per frame
    const anglesReference = extractAngleVectorsFromVideo(
      singlePoseReferenceVideo
    );
    const anglesComparison = extractAngleVectorsFromVideo(
      singlePoseComparisonVideo
    );

    // 3. Voer DTW uit op de hoeken
    const { alignedReference, alignedComparison, alignedPath } = dtwPerAngle(
      anglesReference,
      anglesComparison
    );

    console.log("Alignment Path:", alignedPath);
    console.log("Aligned Angles Reference:", alignedReference);
    console.log("Aligned Angles Comparison:", alignedComparison);

    // 4. Bereken per-angle verschillen
    const perAngle = angleDifferencePerAngle(
      alignedReference,
      alignedComparison
    );

    // 5. Map de aligned resultaten naar de originele video frames (optioneel)
    const mappedPerAngle: (number[] | undefined)[] = Array(
      video2Poses.length
    ).fill(undefined);

    alignedPath.forEach(([iRef, jComp], idx) => {
      mappedPerAngle[jComp] = perAngle[idx];
    });

    // 6. Forward-fill undefined waarden
    let lastKnown: number[] = [];
    const filledPerAngle: number[][] = mappedPerAngle.map((angles) => {
      if (angles !== undefined) {
        lastKnown = angles;
        return angles;
      } else {
        return lastKnown;
      }
    });

    // 7. Zet de states
    setGraphSimilarities(perAngle);
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
      <div style={{ marginBottom: "2rem" }}>
        <h2>Verschillen per hoek</h2>
        <Line
          data={{
            labels: perAngleSimilarities[0]?.map((_, idx) => idx),
            datasets: [
              {
                label: "Schouder - Elleboog - Pols",
                data: perAngleSimilarities[0],
                borderColor: "rgba(75, 192, 192, 1)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                fill: false,
              },
              {
                label: "Heup - Knie - Enkel",
                data: perAngleSimilarities[1],
                borderColor: "rgba(255, 99, 132, 1)",
                backgroundColor: "rgba(255, 99, 132, 0.2)",
                fill: false,
              },
              {
                label: "Heup - Schouder - Elleboog",
                data: perAngleSimilarities[2],
                borderColor: "rgba(54, 162, 235, 1)",
                backgroundColor: "rgba(54, 162, 235, 0.2)",
                fill: false,
              },
              {
                label: "Schouder - Heup - Knie",
                data: perAngleSimilarities[3],
                borderColor: "rgba(255, 206, 86, 1)",
                backgroundColor: "rgba(255, 206, 86, 0.2)",
                fill: false,
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
