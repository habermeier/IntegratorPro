import { useState, useCallback, useEffect, useRef } from 'react';

export interface Point {
    x: number;
    y: number;
}

export interface PolygonDrawingConfig {
    snapDistance?: number;  // Distance to snap to first point (default: 20)
    minPoints?: number;     // Minimum points to close polygon (default: 3)
    enabled: boolean;       // Is drawing mode active?
    onComplete: (points: Point[]) => void;  // Called when polygon is closed
    onCancel?: () => void;  // Called when drawing is cancelled
}

export interface PolygonDrawingState {
    // Current path being drawn (null = not drawing)
    path: Point[] | null;

    // Start drawing
    start: () => void;

    // Add point to path
    addPoint: (point: Point) => void;

    // Close polygon (snap to first point)
    close: () => void;

    // Cancel drawing
    cancel: () => void;

    // Undo last point
    undoPoint: () => void;

    // Check if point is near first point (for snap indicator)
    isNearStart: (point: Point) => boolean;

    // Can the polygon be closed?
    canClose: () => boolean;
}

export const usePolygonDrawing = (config: PolygonDrawingConfig): PolygonDrawingState => {
    const {
        snapDistance = 20,
        minPoints = 3,
        enabled,
        onComplete,
        onCancel,
    } = config;

    const [path, setPath] = useState<Point[] | null>(null);
    const mountedRef = useRef(false);

    // Prevent initial mount from triggering effects
    useEffect(() => {
        mountedRef.current = true;
    }, []);

    // Start drawing
    const start = useCallback(() => {
        console.log('🟢 Starting polygon drawing');
        setPath([]);
    }, []);

    // Add point to path
    const addPoint = useCallback((point: Point) => {
        setPath(prev => {
            if (!prev) return prev;

            // Check if clicking near first point to close
            if (prev.length >= minPoints) {
                const firstPoint = prev[0];
                const dx = point.x - firstPoint.x;
                const dy = point.y - firstPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < snapDistance) {
                    console.log('🎯 Snap to close detected');
                    // Close the polygon
                    onComplete(prev);
                    return null; // Clear path
                }
            }

            // Add point normally
            console.log('➕ Adding point to polygon:', point);
            return [...prev, point];
        });
    }, [minPoints, snapDistance, onComplete]);

    // Close polygon manually (Enter key)
    const close = useCallback(() => {
        if (!path || path.length < minPoints) {
            console.warn('⚠️ Not enough points to close polygon');
            return;
        }

        console.log('✅ Closing polygon manually');
        onComplete(path);
        setPath(null);
    }, [path, minPoints, onComplete]);

    // Cancel drawing
    const cancel = useCallback(() => {
        console.log('❌ Cancelling polygon drawing');
        setPath(null);
        if (onCancel) onCancel();
    }, [onCancel]);

    // Undo last point
    const undoPoint = useCallback(() => {
        setPath(prev => {
            if (!prev || prev.length === 0) return null;

            const newPath = prev.slice(0, -1);
            console.log('↩️ Undoing last point, remaining:', newPath.length);

            if (newPath.length === 0) {
                console.log('📭 No points left, cancelling');
                if (onCancel) onCancel();
                return null;
            }

            return newPath;
        });
    }, [onCancel]);

    // Check if point is near start (for snap indicator)
    const isNearStart = useCallback((point: Point): boolean => {
        if (!path || path.length < minPoints) return false;

        const firstPoint = path[0];
        const dx = point.x - firstPoint.x;
        const dy = point.y - firstPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance < snapDistance;
    }, [path, minPoints, snapDistance]);

    // Can the polygon be closed?
    const canClose = useCallback((): boolean => {
        return path !== null && path.length >= minPoints;
    }, [path, minPoints]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!enabled || !path) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

            if (e.code === 'Enter' && canClose()) {
                e.preventDefault();
                close();
            } else if (e.code === 'Escape') {
                e.preventDefault();
                undoPoint();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, path, canClose, close, undoPoint]);

    return {
        path,
        start,
        addPoint,
        close,
        cancel,
        undoPoint,
        isNearStart,
        canClose,
    };
};
