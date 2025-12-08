import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useOpenCV } from '../hooks/useOpenCV';

export interface WallDetectorHandle {
    detectWalls: () => Promise<any[]>;
}

interface WallDetectorProps {
    imageUrl: string;
}

const WallDetector = forwardRef<WallDetectorHandle, WallDetectorProps>(({ imageUrl }, ref) => {
    const { loaded, cv } = useOpenCV();
    const [imageLoaded, setImageLoaded] = useState(false);

    // Hidden references
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
        detectWalls: () => {
            return new Promise((resolve, reject) => {
                if (!loaded || !cv || !imgRef.current) {
                    reject("OpenCV not ready");
                    return;
                }

                try {
                    console.log("WallDetector: Starting detection downscaled...");
                    if (!imgRef.current) throw new Error("Image Ref missing");

                    const width = imgRef.current.width;
                    const height = imgRef.current.height;
                    console.log("WallDetector: Original dimensions:", width, height);

                    const MAX_DIM = 512;
                    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
                    const newWidth = Math.floor(width * scale);
                    const newHeight = Math.floor(height * scale);
                    console.log("WallDetector: Scaling to:", newWidth, newHeight, "Scale:", scale);

                    // Create a temporary canvas for downscaling
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = newWidth;
                    tempCanvas.height = newHeight;
                    const ctx = tempCanvas.getContext('2d');
                    if (!ctx) throw new Error("Could not get temp canvas context");

                    ctx.drawImage(imgRef.current, 0, 0, newWidth, newHeight);

                    ctx.drawImage(imgRef.current, 0, 0, newWidth, newHeight);

                    // Read from canvas using matFromImageData (safer)
                    console.log("WallDetector: Getting ImageData...");
                    const imgData = ctx.getImageData(0, 0, newWidth, newHeight);

                    console.log("WallDetector: creating Mat from ImageData...");
                    const src = cv.matFromImageData(imgData);
                    console.log("WallDetector: Mat created. Cols:", src.cols, "Rows:", src.rows);

                    const gray = new cv.Mat();
                    const edges = new cv.Mat();
                    const lines = new cv.Mat();

                    console.log("WallDetector: Converting to Gray...");
                    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

                    console.log("WallDetector: Canny Edge Detection...");
                    cv.Canny(gray, edges, 20, 80, 3);

                    console.log("WallDetector: HoughLinesP...");
                    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 10, 5, 50);
                    console.log("WallDetector: HoughLinesP success. Lines:", lines.rows);

                    const detectedLines = [];
                    for (let i = 0; i < lines.rows; ++i) {
                        detectedLines.push({
                            x1: lines.data32S[i * 4] / scale,
                            y1: lines.data32S[i * 4 + 1] / scale,
                            x2: lines.data32S[i * 4 + 2] / scale,
                            y2: lines.data32S[i * 4 + 3] / scale,
                            type: 'WALL'
                        });
                    }
                    console.log("WallDetector: Lines processed.");

                    // Cleanup
                    src.delete(); gray.delete(); edges.delete(); lines.delete();

                    resolve(detectedLines);
                } catch (err) {
                    console.error("WallDetector: Detection failed", err);
                    reject(err);
                }
            });
        }
    }));

    return (
        <div className="hidden">
            {/* Hidden Source Image for CV Analysis */}
            <img
                ref={imgRef}
                src={imageUrl}
                crossOrigin="anonymous"
                onLoad={() => setImageLoaded(true)}
                alt="analysis-source"
            />
        </div>
    );
});

export default React.memo(WallDetector);
