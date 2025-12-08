import React, { useRef, useState, useEffect } from 'react';
import { useOpenCV } from '../hooks/useOpenCV';
import { Loader2 } from 'lucide-react';

interface WallDetectorProps {
    imageUrl: string;
    onLinesDetected?: (lines: any[]) => void;
}

const WallDetector: React.FC<WallDetectorProps> = ({ imageUrl, onLinesDetected }) => {
    const { loaded, cv } = useOpenCV();
    const [processing, setProcessing] = useState(false);
    const [linesFound, setLinesFound] = useState<number>(0);
    const [imageLoaded, setImageLoaded] = useState(false);

    // We need a reference to the source image (hidden) to read pixels
    const imgRef = useRef<HTMLImageElement>(null);
    // Canvas to draw the debug output
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const detectWalls = () => {
        if (!loaded || !cv || !imgRef.current || !canvasRef.current) return;
        setProcessing(true);

        // Give UI a moment to update
        setTimeout(() => {
            try {
                const src = cv.imread(imgRef.current);
                const gray = new cv.Mat();
                const edges = new cv.Mat();
                const lines = new cv.Mat();

                // 1. Grayscale
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

                // 2. Canny Edge Detection
                // SUPER AGGRESSIVE: 20/80 threshold to catch very faint gray lines
                cv.Canny(gray, edges, 20, 80, 3);

                // 3. Probabilistic Hough Line Transform
                // threshold: 10 (Lower votes to catch more lines)
                // minLineLength: 5 (Shorter segments allowed)
                // maxLineGap: 50 (Connect larger gaps)
                cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 10, 5, 50);

                // 4. Draw Lines on Canvas
                const ctx = canvasRef.current!.getContext('2d');
                if (ctx) {
                    // DEBUG: Show the Canny Edge Map first to see what we are detecting
                    // Explicitly Clear Canvas to remove any previous frame or debris
                    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                    console.log("WallDetector v1.13: Canvas Cleared, drawing BLUE lines.");

                    // Overlay Lines on top
                    ctx.lineWidth = 20; // High visibility
                    ctx.strokeStyle = '#0000FF'; // Blue as requested
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                }

                const detectedLines = [];
                for (let i = 0; i < lines.rows; ++i) {
                    let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
                    let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);

                    if (ctx) {
                        ctx.beginPath();
                        ctx.moveTo(startPoint.x, startPoint.y);
                        ctx.lineTo(endPoint.x, endPoint.y);
                        ctx.stroke();
                    }
                    // ... keep pushing to detectedLines
                    detectedLines.push({
                        x1: startPoint.x, y1: startPoint.y,
                        x2: endPoint.x, y2: endPoint.y
                    });
                }

                setLinesFound(detectedLines.length);
                if (onLinesDetected) onLinesDetected(detectedLines);

                // Cleanup OpenCV memory
                src.delete();
                gray.delete();
                edges.delete();
                lines.delete();
            } catch (err) {
                console.error("OpenCV processing failed:", err);
            } finally {
                setProcessing(false);
            }
        }, 100);
    };

    // Auto-Run when dependencies are ready
    useEffect(() => {
        console.log("WallDetector: Dependencies check", { loaded, imageLoaded });
        if (loaded && imageLoaded && !processing && linesFound === 0) {
            console.log("WallDetector: Auto-Starting disabled for stability...");
            // detectWalls();
        }
    }, [loaded, imageLoaded]);

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
            <img
                ref={imgRef}
                src={imageUrl}
                className="hidden"
                alt="analysis-source"
                crossOrigin="anonymous"
                onLoad={() => {
                    console.log("WallDetector: Source Image Loaded");
                    setImageLoaded(true);
                }}
            />

            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none opacity-100"
                width={imgRef.current?.naturalWidth || 2000}
                height={imgRef.current?.naturalHeight || 2000}
            />

            {/* DEBUG UI: Version Banner */}
            <div className="absolute top-0 right-0 p-3 bg-slate-900 border border-slate-700 text-white font-bold z-50 pointer-events-auto shadow-xl rounded-bl-xl text-xs flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-blue-400">CV: v1.14 (Manual Mode)</span>
                </div>
                <div className="text-slate-400 font-mono">Detected Lines: {linesFound}</div>
                {/* Manual Trigger Button */}
                <button
                    onClick={detectWalls}
                    disabled={!loaded || processing}
                    className={`mt-1 px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all
                        ${processing ? 'bg-slate-700 text-slate-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'}
                    `}
                >
                    {processing ? (
                        <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Scanning...</span>
                    ) : (
                        "Scan Walls"
                    )}
                </button>
            </div>
        </div>
    );
};

export default WallDetector;
