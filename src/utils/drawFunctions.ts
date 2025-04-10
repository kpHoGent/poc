import * as poseDetection from "@tensorflow-models/pose-detection";

export const  drawPoses =(poses: poseDetection.Pose[], ctx: any)  => {
    // For each detected pose
    for (const pose of poses) {
        // Draw keypoints
        for (const keypoint of pose.keypoints) {
             // Skip if keypoint is undefined
            if (keypoint.score !== undefined && keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();

                // Optionally draw keypoint name
                // ctx.fillStyle = 'white';
                // ctx.fillText(keypoint.name, keypoint.x + 10, keypoint.y + 5);
            }
        }

        // Draw skeleton (if available)
        if (pose.keypoints.length > 5) { // Basic check to ensure we have enough keypoints
            drawSkeleton(pose, ctx);
        }

        const leftHip = pose.keypoints[KEYPOINTS.LEFT_HIP];
        const leftShoulder = pose.keypoints[KEYPOINTS.LEFT_SHOULDER];
        const leftElbow = pose.keypoints[KEYPOINTS.LEFT_ELBOW];

       
            
            const angle = calculateAngle(
                [leftHip.x, leftHip.y],    // Punt A (linkerheup)
                [leftShoulder.x, leftShoulder.y],  // Punt B (linkerschouder, middelpunt)
                [leftElbow.x, leftElbow.y]   // Punt C (linkerelleboog)
            );

            // Toon de hoek bij de schouder
            ctx.fillStyle = 'yellow';
            ctx.font = '16px Arial';
            ctx.fillText(`${Math.round(angle)}°`, leftShoulder.x + 15, leftShoulder.y);
        
    }

}

// Draw the skeleton connecting keypoints
function drawSkeleton(pose : poseDetection.Pose, ctx: any) {
    // Define connections for a human skeleton
    const connections = [
        ['nose', 'left_eye'], ['nose', 'right_eye'],
        ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
        ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
        ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
    ];

    // Create a map for fast keypoint lookup
    const keypointMap : any = {};
    pose.keypoints.forEach((keypoint : any) => {
        keypointMap[keypoint.name] = keypoint;
    });

    // Draw connections
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 4;

    for (const [p1Name, p2Name] of connections) {
        const p1 = keypointMap[p1Name];
        const p2 = keypointMap[p2Name];

        if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }
}

function calculateAngle(a: [number, number], b: [number, number], c: [number, number]): number {
    // a = eerste punt, b = midden punt (gewricht), c = eindpunt
    
    // Bereken de hoek met arctan2
    const radians = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0]);
    
    // Converteer naar graden en neem absolute waarde
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    // Zorg ervoor dat we de kleinste hoek nemen (altijd ≤ 180 graden)
    if (angle > 180.0) {
        angle = 360.0 - angle;
    }
    
    return angle;
}

enum KEYPOINTS {
    NOSE = 0,
    LEFT_EYE = 1,
    RIGHT_EYE = 2,
    LEFT_EAR = 3,
    RIGHT_EAR = 4,
    LEFT_SHOULDER = 5,
    RIGHT_SHOULDER = 6,
    LEFT_ELBOW = 7,
    RIGHT_ELBOW = 8,
    LEFT_WRIST = 9,
    RIGHT_WRIST = 10,
    LEFT_HIP = 11,
    RIGHT_HIP = 12,
    LEFT_KNEE = 13,
    RIGHT_KNEE = 14,
    LEFT_ANKLE = 15,
    RIGHT_ANKLE = 16
  }
  
