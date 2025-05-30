import * as poseDetection from "@tensorflow-models/pose-detection";
import { calculateAngle } from "./drawFunctions";

export function calculateCosineSimilarity(
  pose1: poseDetection.Pose,
  pose2: poseDetection.Pose
): number {
  if (
    !pose1.keypoints ||
    !pose2.keypoints ||
    pose1.keypoints.length !== pose2.keypoints.length
  ) {
    throw new Error("Poses must have the same number of keypoints.");
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < pose1.keypoints.length; i++) {
    const kp1 = pose1.keypoints[i];
    const kp2 = pose2.keypoints[i];

    if (kp1.score && kp2.score) {
      // Only consider keypoints with sufficient confidence
      const x1 = kp1.x;
      const y1 = kp1.y;
      const x2 = kp2.x;
      const y2 = kp2.y;

      dotProduct += x1 * x2 + y1 * y2;
      magnitude1 += x1 * x1 + y1 * y1;
      magnitude2 += x2 * x2 + y2 * y2;
    }
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
  const normalizedPose1 = normalizePose(pose1);
  const normalizedPose2 = normalizePose(pose2);
  const similarity = calculateCosineSimilarity(
    normalizedPose1,
    normalizedPose2
  );
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
  const path: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const cost = euclideanDistance(
        refAnglesPerFrame[i],
        userAnglesPerFrame[j]
      );
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

  // Backtracking
  let i = n - 1;
  let j = m - 1;

  while (i >= 0 && j >= 0) {
    path.unshift([i, j]);
    const diag = i > 0 && j > 0 ? costMatrix[i - 1][j - 1] : Infinity;
    const left = j > 0 ? costMatrix[i][j - 1] : Infinity;
    const up = i > 0 ? costMatrix[i - 1][j] : Infinity;

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

  const aligned1: number[][] = [];
  const aligned2: number[][] = [];

  for (const [i1, i2] of path) {
    aligned1.push(seq1[i1]);
    aligned2.push(seq2[i2]);
  }

  return { aligned1, aligned2, alignmentPath: path };
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
