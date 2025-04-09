export const  drawKeypoints =(keypoints: any, ctx: any)  => {
    ctx.fillStyle = 'Green';
    ctx.strokeStyle = 'White';
    ctx.lineWidth = 2;
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];
        if (keypoint.score > 0.5) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }

}

export  const drawSkeleton = (keypoints: any, ctx: any, adjacentPairs: any) => {
    const color = "#fff";
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    adjacentPairs.forEach(([i, j]: any) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1.score > 0.5 && kp2.score > 0.5) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.stroke();
        }
        
    });
}