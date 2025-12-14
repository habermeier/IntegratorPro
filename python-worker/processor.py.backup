import cv2
import numpy as np
import argparse
import json
import sys
from skimage.morphology import skeletonize
from shapely.geometry import LineString
from shapely.validation import make_valid
import warnings

# Suppress warnings to keep stdout clean
warnings.filterwarnings("ignore")

def log(msg):
    """Log to stderr to avoid polluting stdout which is reserved for JSON."""
    sys.stderr.write(f"[INFO] {msg}\n")
    sys.stderr.flush()

def error(msg):
    sys.stderr.write(f"[ERROR] {msg}\n")
    sys.stderr.flush()

def simplify_coordinates(coords, tolerance=2.0):
    """
    Simplify a list of coordinates using the Douglas-Peucker algorithm.
    """
    if len(coords) < 3:
        return coords
    
    line = LineString(coords)
    simplified = line.simplify(tolerance, preserve_topology=True)
    
    if simplified.is_empty:
        return []
    
    # Extract coordinates from simplified geometry
    if simplified.geom_type == 'LineString':
        return list(simplified.coords)
    elif simplified.geom_type == 'MultiLineString':
        # Handle cases where simplification splits the line
        result = []
        for geom in simplified.geoms:
            result.extend(list(geom.coords))
        return result
    else:
        return coords

def process_image(image_path):
    log(f"Processing: {image_path}")
    
    # 1. READ IMAGE
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    height, width = img.shape
    log(f"Image Dimensions: {width}x{height}")

    # 2. PREPROCESSING
    # Adaptive Thresholding to handle varying lighting/scan quality
    # block_size and C might need tuning based on specific floorplans
    thresh = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY_INV, 25, 15)
    
    # Morphological Closing to fill small gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closing = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    # 3. SKELETONIZATION
    # Convert to boolean for skimage (True = Wall/White, False = Background)
    # Ensure binary image is strictly 0 and 1
    binary_bool = closing > 127
    
    log("Running Skeletonization...")
    skeleton = skeletonize(binary_bool)
    
    # Convert back to uint8 (0-255) for OpenCV contour detection
    skeleton_uint8 = (skeleton * 255).astype(np.uint8)
    
    # 4. VECTOR EXTRACTION (TRACING)
    # Find contours on the skeleton
    # CHAIN_APPROX_NONE stores all the boundary points, which is what we want for a 1px line
    contours, _ = cv2.findContours(skeleton_uint8, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    
    log(f"Found {len(contours)} initial segments")
    
    vectors = []
    
    for cnt in contours:
        # Convert contour to standard list of [x, y]
        # cnt is shape (N, 1, 2)
        pts = cnt.reshape(-1, 2).tolist()
        
        # Filter noise: extremely short lines
        if len(pts) < 5:
            continue
            
        # Simplify geometry
        simplified_pts = simplify_coordinates(pts, tolerance=2.0)
        
        # Normalize to percentages (0-100)
        clean_pts = [[round((p[0] / width) * 100.0, 3), round((p[1] / height) * 100.0, 3)] for p in simplified_pts]
        
        if len(clean_pts) > 1:
            vectors.append(clean_pts)

    log(f"extracted {len(vectors)} wall vectors after simplification")

    # 5. SYMBOL DETECTION
    detected_symbols = []
    
    # Detect Circular Symbols (e.g. Recessed Lights)
    # Use HoughCircles on the gray image
    # Parameters might need tuning: dp=1, minDist=20, param1=50, param2=30, minRadius=5, maxRadius=30
    log("Running Circular Symbol Detection...")
    circles = cv2.HoughCircles(img, cv2.HOUGH_GRADIENT, dp=1, minDist=20,
                               param1=50, param2=25, minRadius=5, maxRadius=40)
    
    if circles is not None:
        circles = np.uint16(np.around(circles))
        for i in circles[0, :]:
            # i = [x, y, radius]
            # Convert to percentage relative to width/height
            x_pct = (float(i[0]) / width) * 100.0
            y_pct = (float(i[1]) / height) * 100.0
            
            detected_symbols.append({
                "type": "LIGHT",
                "x": round(x_pct, 2),
                "y": round(y_pct, 2),
                "radius": int(i[2]),
                "notes": f"Detected Light (r={i[2]})"
            })
            
    log(f"Detected {len(detected_symbols)} potential symbols")

    # 6. OUTPUT JSON STRUCTURE
    output_data = {
        "metadata": {
            "width": width,
            "height": height,
            "processed_with": "skeletonize"
        },
        "walls": vectors,
        "detected_symbols": detected_symbols
    }
    
    # Dump strictly to stdout
    print(json.dumps(output_data))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Floorplan Vectorizer")
    parser.add_argument("--input", required=True, help="Path to input image")
    
    args = parser.parse_args()
    
    try:
        process_image(args.input)
    except Exception as e:
        error(str(e))
        sys.exit(1)
