import * as poseDetection from "@tensorflow-models/pose-detection";
import { calculateAngle } from "./drawFunctions";
import DynamicTimeWarping from "dynamic-time-warping";

const RIGHT_SIDE_KEYPOINTS = [
  "right_eye",
  "right_ear",
  "right_shoulder",
  "right_elbow",
  "right_wrist",
  "right_hip",
  "right_knee",
  "right_ankle",
];

export function calculateCosineSimilarity(
  pose1: poseDetection.Pose,
  pose2: poseDetection.Pose
): number {
  const rightKps1 = pose1.keypoints.filter(
    (keypoint) => keypoint.name && RIGHT_SIDE_KEYPOINTS.includes(keypoint.name)
  );
  const rightKps2 = pose2.keypoints.filter(
    (keypoint) => keypoint.name && RIGHT_SIDE_KEYPOINTS.includes(keypoint.name)
  );

  if (rightKps1.length !== rightKps2.length) {
    throw new Error("Right-side keypoints mismatch.");
  }
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < rightKps1.length; i++) {
    const kp1 = rightKps1[i];
    const kp2 = rightKps2[i];

    // if (kp1.score && kp1.score > 0.3 && kp2.score && kp2.score > 0.3) {
    // Only consider keypoints with sufficient confidence
    const x1 = kp1.x;
    const y1 = kp1.y;
    const x2 = kp2.x;
    const y2 = kp2.y;

    dotProduct += x1 * x2 + y1 * y2;
    magnitude1 += x1 * x1 + y1 * y1;
    magnitude2 += x2 * x2 + y2 * y2;
    // }
  }

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0; // Avoid division by zero
  }

  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

export function calculateCosineDistance(
  pose1: poseDetection.Pose,
  pose2: poseDetection.Pose
): number {
  const similarity = calculateCosineSimilarity(pose1, pose2);
  return 1 - similarity;
}

export function warpTimeDynamically(
  reference: poseDetection.Pose[],
  comparison: poseDetection.Pose[]
) {
  const n = reference.length;
  const m = comparison.length;

  // Initialize the cost matrix
  const costMatrix = Array.from({ length: n }, () => Array(m).fill(Infinity));

  // Bereken de kostenmatrix
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const cost = calculateCosineDistance(reference[i], comparison[j]);
      const minPrev =
        i > 0 && j > 0
          ? Math.min(
              costMatrix[i - 1][j],
              costMatrix[i][j - 1],
              costMatrix[i - 1][j - 1]
            )
          : 0;
      costMatrix[i][j] = cost + minPrev;
    }
  }

  // Backtrack om pad te vinden
  let i = n - 1;
  let j = m - 1;
  const path: [number, number][] = [];

  while (i >= 0 && j >= 0) {
    path.unshift([i, j]);
    const diag = i > 0 && j > 0 ? costMatrix[i - 1][j - 1] : Infinity;
    const left = j > 0 ? costMatrix[i][j - 1] : Infinity;
    const up = i > 0 ? costMatrix[i - 1][j] : Infinity;

    const minCost = Math.min(diag, left, up);

    if (minCost === diag) {
      i--;
      j--;
    } else if (minCost === left) {
      j--;
    } else if (minCost === up) {
      i--;
    } else {
      break;
    }
  }

  // Genereer gealigneerde arrays op basis van path
  const alignedReference: poseDetection.Pose[] = [];
  const alignedComparison: poseDetection.Pose[] = [];

  for (const [refIdx, compIdx] of path) {
    alignedReference.push(reference[refIdx]);
    alignedComparison.push(comparison[compIdx]);
  }

  return { alignedReference, alignedComparison, alignedPath: path };
}

function extractRightSideAngles(pose: poseDetection.Pose): number[] {
  const get = (name: string) =>
    pose.keypoints.find((kp) => kp.name === name && kp.score && kp.score > 0.3);

  const shoulder = get("right_shoulder");
  const elbow = get("right_elbow");
  const wrist = get("right_wrist");
  const hip = get("right_hip");
  const knee = get("right_knee");
  const ankle = get("right_ankle");

  if (!shoulder || !elbow || !wrist || !hip || !knee || !ankle)
    return [0, 0, 0, 0];

  const ShoulderElbowWrist = calculateAngle(
    [shoulder.x, shoulder.y],
    [elbow.x, elbow.y],
    [wrist.x, wrist.y]
  ); // elleboog
  const HipKneeAnkle = calculateAngle(
    [hip.x, hip.y],
    [knee.x, knee.y],
    [ankle.x, ankle.y]
  ); // knie
  const HipShoulderElbow = calculateAngle(
    [hip.x, hip.y],
    [shoulder.x, shoulder.y],
    [elbow.x, elbow.y]
  ); // oksel
  const ShoulderHipKnee = calculateAngle(
    [shoulder.x, shoulder.y],
    [hip.x, hip.y],
    [knee.x, knee.y]
  ); // romp

  return [ShoulderElbowWrist, HipKneeAnkle, HipShoulderElbow, ShoulderHipKnee];
}

function normalizePose(pose: poseDetection.Pose): poseDetection.Pose {
  const keypoints = pose.keypoints;

  // Kies het middelpunt (bv. tussen linker en rechter heup)
  const midX = (keypoints[11].x + keypoints[12].x) / 2;
  const midY = (keypoints[11].y + keypoints[12].y) / 2;

  // Bereken schaal (afstand tussen schouders, heupen, of hele bounding box)
  const shoulderDist = Math.hypot(
    keypoints[5].x - keypoints[6].x,
    keypoints[5].y - keypoints[6].y
  );
  const scale = shoulderDist || 1; // Voorkom delen door 0

  // Normaliseer
  const normalizedKeypoints = keypoints.map((kp) => ({
    ...kp,
    x: (kp.x - midX) / scale,
    y: (kp.y - midY) / scale,
  }));

  return { ...pose, keypoints: normalizedKeypoints };
}

export function extractAngleVectorsFromVideo(
  videoPoses: poseDetection.Pose[]
): number[][] {
  return videoPoses.map((frame) => extractRightSideAngles(frame));
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

export function dtwAlignAngleSequences(
  refAnglesPerFrame: number[][],
  userAnglesPerFrame: number[][]
) {
  const n = refAnglesPerFrame.length;
  const m = userAnglesPerFrame.length;

  const costMatrix = Array.from({ length: n }, () => Array(m).fill(Infinity));

  // Initialisatie
  costMatrix[0][0] = euclideanDistance(
    refAnglesPerFrame[0],
    userAnglesPerFrame[0]
  );

  for (let i = 1; i < n; i++) {
    costMatrix[i][0] =
      costMatrix[i - 1][0] +
      euclideanDistance(refAnglesPerFrame[i], userAnglesPerFrame[0]);
  }

  for (let j = 1; j < m; j++) {
    costMatrix[0][j] =
      costMatrix[0][j - 1] +
      euclideanDistance(refAnglesPerFrame[0], userAnglesPerFrame[j]);
  }

  // Vullen van de rest van de matrix
  for (let i = 1; i < n; i++) {
    for (let j = 1; j < m; j++) {
      const cost = euclideanDistance(
        refAnglesPerFrame[i],
        userAnglesPerFrame[j]
      );
      const minPrev = Math.min(
        costMatrix[i - 1][j], // insert
        costMatrix[i][j - 1], // delete
        costMatrix[i - 1][j - 1] // match
      );
      costMatrix[i][j] = cost + minPrev;
    }
  }

  // Backtracking
  let i = n - 1;
  let j = m - 1;
  const path: [number, number][] = [];

  while (i > 0 || j > 0) {
    path.unshift([i, j]);
    if (i === 0) {
      j--;
    } else if (j === 0) {
      i--;
    } else {
      const diag = costMatrix[i - 1][j - 1];
      const left = costMatrix[i][j - 1];
      const up = costMatrix[i - 1][j];
      const min = Math.min(diag, left, up);
      if (min === diag) {
        i--;
        j--;
      } else if (min === left) {
        j--;
      } else {
        i--;
      }
    }
  }
  path.unshift([0, 0]);

  // Aligned sequences
  const aligned1: number[][] = [];
  const aligned2: number[][] = [];
  for (const [i1, i2] of path) {
    aligned1.push(refAnglesPerFrame[i1]);
    aligned2.push(userAnglesPerFrame[i2]);
  }

  return {
    aligned1,
    aligned2,
    alignmentPath: path,
    cost: costMatrix[n - 1][m - 1],
  };
}

export function cosineSimilarityVec(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export function cosineSimilarityPerAngle(
  aligned1: number[][],
  aligned2: number[][]
): number[][] {
  const numAngles = aligned1[0].length;
  const result: number[][] = Array.from({ length: numAngles }, () => []);

  for (let i = 0; i < aligned1.length; i++) {
    for (let j = 0; j < numAngles; j++) {
      const a = aligned1[i][j];
      const b = aligned2[i][j];

      const dot = a * b;
      const magA = Math.sqrt(a * a);
      const magB = Math.sqrt(b * b);
      const similarity = magA === 0 || magB === 0 ? 0 : dot / (magA * magB);

      result[j].push(similarity);
    }
  }

  return result; // array van 4 arrays met cosine similarities per frame
}

export function angleDifferencePerAngle(
  aligned1: number[][],
  aligned2: number[][]
): number[][] {
  const numAngles = aligned1[0].length;
  const result: number[][] = Array.from({ length: numAngles }, () => []);

  const isAllZero = (arr: number[]) => arr.every((val) => val === 0);

  for (let i = 0; i < aligned1.length; i++) {
    if (!isAllZero(aligned1[i]) && !isAllZero(aligned2[i])) {
      for (let j = 0; j < numAngles; j++) {
        const a = aligned1[i][j];
        const b = aligned2[i][j];

        const diff = Math.abs(a - b); // verschil in graden
        const normalizedDiff = diff / 180; // optioneel, tussen 0 en 1
        result[j].push(diff); // of gewoon `diff` als je het in graden wil tonen
      }
    }
  }

  return result;
}

export function interpolatePerAngleArray(arr: (number[] | null)[]): number[][] {
  const result = arr.slice(); // shallow copy

  for (let i = 0; i < result.length; i++) {
    if (result[i] === null) {
      // Zoek vorige niet-null waarde
      let prevIndex = i - 1;
      while (prevIndex >= 0 && result[prevIndex] === null) {
        prevIndex--;
      }

      // Zoek volgende niet-null waarde
      let nextIndex = i + 1;
      while (nextIndex < result.length && result[nextIndex] === null) {
        nextIndex++;
      }

      if (prevIndex >= 0 && nextIndex < result.length) {
        // Interpoleer tussen prev en next
        const prev = result[prevIndex]!;
        const next = result[nextIndex]!;
        const ratio = (i - prevIndex) / (nextIndex - prevIndex);

        const interpolated = prev.map(
          (val, idx) => val + ratio * (next[idx] - val)
        );
        result[i] = interpolated;
      } else if (prevIndex >= 0) {
        // Geen volgende waarde — kopieer vorige
        result[i] = [...result[prevIndex]!];
      } else if (nextIndex < result.length) {
        // Geen vorige waarde — kopieer volgende
        result[i] = [...result[nextIndex]!];
      } else {
        // Alles null? Vul met nulls
        result[i] = Array(arr[0]?.length || 0).fill(0);
      }
    }
  }

  return result as number[][];
}

function cropAndResize(pose: poseDetection.Pose, targetSize = 256) {
  const validPoints = pose.keypoints.filter(
    (keypoint) => keypoint.score && keypoint.score > 0.3
  );

  const minX = Math.min(...validPoints.map((keypoint) => keypoint.x));
  const minY = Math.min(...validPoints.map((keypoint) => keypoint.y));
  const maxX = Math.max(...validPoints.map((keypoint) => keypoint.x));
  const maxY = Math.max(...validPoints.map((keypoint) => keypoint.y));

  const width = maxX - minX;
  const height = maxY - minY;

  const scaleX = targetSize / width;
  const scaleY = targetSize / height;

  const scaledKeypoints = pose.keypoints.map((keypoint) => ({
    ...keypoint,
    x: (keypoint.x - minX) * scaleX,
    y: (keypoint.y - minY) * scaleY,
  }));

  return scaledKeypoints;
}

function l2Normalize(keypoints: poseDetection.Keypoint[]) {
  const vector = keypoints.flatMap((kp) => [kp.x, kp.y]);
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  const normalized = keypoints.map((keypoint) => ({
    ...keypoint,
    x: keypoint.x / norm,
    y: keypoint.y / norm,
  }));

  return normalized;
}

function preprocessPose(
  pose: poseDetection.Pose,
  targetSize = 256
): poseDetection.Pose {
  const croppedKeypoints = cropAndResize(pose, targetSize);
  const normalizedKeypoints = l2Normalize(croppedKeypoints);

  return {
    ...pose,
    keypoints: normalizedKeypoints,
  };
}

export function preprocessPoses(
  poses: poseDetection.Pose[],
  targetSize = 256
): poseDetection.Pose[] {
  return poses.map((pose) => preprocessPose(pose, targetSize));
}

export function dtw(
  reference: poseDetection.Pose[],
  comparison: poseDetection.Pose[]
) {
  const dtw = new DynamicTimeWarping(
    reference,
    comparison,
    calculateCosineDistance
  );

  const path = dtw.getPath();

  const alignedReference: poseDetection.Pose[] = [];
  const alignedComparison: poseDetection.Pose[] = [];

  for (const [refIdx, compIdx] of path) {
    alignedReference.push(reference[refIdx]);
    alignedComparison.push(comparison[compIdx]);
  }

  return { alignedReference, alignedComparison, alignedPath: path };
}

export function dtwPerAngle(
  referenceAngles: number[][],
  comparisonAngles: number[][]
) {
  const dtw = new DynamicTimeWarping(
    referenceAngles,
    comparisonAngles,
    euclideanDistance
  );

  const path = dtw.getPath();

  const alignedReference: number[][] = [];
  const alignedComparison: number[][] = [];

  for (const [refIdx, compIdx] of path) {
    alignedReference.push(referenceAngles[refIdx]);
    alignedComparison.push(comparisonAngles[compIdx]);
  }

  return { alignedReference, alignedComparison, alignedPath: path };
}

function computeAngleVariances(angleFrames: number[][]): number[] {
  const numAngles = angleFrames[0].length;
  const meanAngles = Array(numAngles).fill(0);
  const variances = Array(numAngles).fill(0);

  // 1. Bereken gemiddelde per hoek
  angleFrames.forEach((frame) => {
    frame.forEach((angle, idx) => {
      meanAngles[idx] += angle;
    });
  });
  meanAngles.forEach((sum, idx) => {
    meanAngles[idx] = sum / angleFrames.length;
  });

  // 2. Bereken variantie per hoek
  angleFrames.forEach((frame) => {
    frame.forEach((angle, idx) => {
      const diff = angle - meanAngles[idx];
      variances[idx] += diff * diff;
    });
  });
  variances.forEach((sum, idx) => {
    variances[idx] = sum / angleFrames.length;
  });

  return variances;
}

function normalizeWeights(variances: number[]): number[] {
  const total = variances.reduce((sum, val) => sum + val, 0);
  if (total === 0) return variances.map(() => 1 / variances.length); // fallback
  return variances.map((v) => v / total);
}

function weightedEuclideanDistance(
  v1: number[],
  v2: number[],
  weights: number[]
): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += weights[i] * diff * diff;
  }
  return Math.sqrt(sum);
}
