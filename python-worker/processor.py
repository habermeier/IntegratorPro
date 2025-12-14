import cv2
import numpy as np
import argparse
import json
import sys
from scipy import ndimage
from scipy.spatial.distance import cdist
from skimage.morphology import skeletonize
from shapely.geometry import LineString, Point
from shapely.ops import nearest_points
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
        result = []
        for geom in simplified.geoms:
            result.extend(list(geom.coords))
        return result
    else:
        return coords

# ============================================================================
# PHASE 1: PREPROCESSING
# ============================================================================

def remove_text_regions(img):
    """
    Remove text regions using OCR detection.
    Returns binary mask where white=keep, black=remove.
    """
    log("Phase 1.1: Text removal via OCR...")

    try:
        import pytesseract
        from PIL import Image

        # Convert to PIL Image
        pil_img = Image.fromarray(img)

        # Get bounding boxes of text
        data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT)

        # Create mask (start with all white = keep everything)
        mask = np.ones_like(img, dtype=np.uint8) * 255

        text_boxes_found = 0
        for i in range(len(data['text'])):
            # Only process if confidence is reasonable
            if int(data['conf'][i]) > 10:
                x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                # Expand bounding box by 8 pixels in all directions
                padding = 8
                x1 = max(0, x - padding)
                y1 = max(0, y - padding)
                x2 = min(img.shape[1], x + w + padding)
                y2 = min(img.shape[0], y + h + padding)
                # Black out text region
                mask[y1:y2, x1:x2] = 0
                text_boxes_found += 1

        log(f"  -> Found and masked {text_boxes_found} text regions")
        return mask

    except ImportError:
        log("  -> pytesseract not available, skipping text removal")
        return np.ones_like(img, dtype=np.uint8) * 255
    except Exception as e:
        log(f"  -> Text removal failed: {e}, continuing without it")
        return np.ones_like(img, dtype=np.uint8) * 255

def preprocess_image(img):
    """
    Phase 1: Comprehensive preprocessing to isolate wall-like structures.
    Returns cleaned binary image.
    """
    log("Phase 1: Preprocessing...")

    # 1.1: Text Removal
    text_mask = remove_text_regions(img)
    img_no_text = cv2.bitwise_and(img, text_mask)

    # 1.2: Adaptive Thresholding
    log("Phase 1.2: Adaptive thresholding...")
    thresh = cv2.adaptiveThreshold(img_no_text, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 25, 15)

    # 1.3: Morphological Opening (removes small symbols, dots)
    log("Phase 1.3: Morphological opening to remove noise...")
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    # 1.4: Connected Component Filtering (RELAXED - walls are long/large!)
    log("Phase 1.4: Connected component filtering...")
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(opening, connectivity=8)

    # Create output image (start with zeros)
    cleaned = np.zeros_like(opening)

    components_kept = 0
    for i in range(1, num_labels):  # Skip background (0)
        area = stats[i, cv2.CC_STAT_AREA]
        comp_width = stats[i, cv2.CC_STAT_WIDTH]
        comp_height = stats[i, cv2.CC_STAT_HEIGHT]

        # RELAXED Filter criteria - be permissive, let later stages filter
        if area < 20:  # Tiny noise only
            continue
        if comp_width < 8 and comp_height < 8:  # Very small symbols only
            continue

        # Aspect ratio check - only remove EXTREME aspect ratios
        aspect_ratio = max(comp_width, comp_height) / (min(comp_width, comp_height) + 1e-6)
        if aspect_ratio > 50:  # Only extremely thin lines
            continue

        # Keep this component
        cleaned[labels == i] = 255
        components_kept += 1

    log(f"  -> Kept {components_kept}/{num_labels-1} components after filtering")

    return cleaned

# ============================================================================
# PATH A: RIDGE DETECTION (FILLED WALLS)
# ============================================================================

def detect_filled_walls_ridge(binary_img, width, height):
    """
    Path A: Detect filled/thick walls using distance transform and ridge detection.
    Returns list of wall vectors with metadata.
    """
    log("Path A: Ridge detection for filled walls...")

    # A.1: Distance Transform
    log("  A.1: Computing distance transform...")
    dist_transform = cv2.distanceTransform(binary_img, cv2.DIST_L2, 5)

    # Normalize for visualization/debugging
    dist_normalized = cv2.normalize(dist_transform, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # A.2: Ridge Extraction (local maxima of distance transform)
    log("  A.2: Extracting ridges (local maxima)...")
    # Threshold distance transform to get thick regions only
    min_ridge_distance = 3.0  # Minimum thickness/2 (walls must be at least 6px thick)
    ridge_mask = (dist_transform > min_ridge_distance).astype(np.uint8) * 255

    # Skeletonize the thick regions to get centerlines
    ridge_binary = ridge_mask > 127
    ridge_skeleton = skeletonize(ridge_binary)
    ridge_skeleton_uint8 = (ridge_skeleton * 255).astype(np.uint8)

    # A.3: Extract ridge contours
    log("  A.3: Tracing ridge centerlines...")
    contours, _ = cv2.findContours(ridge_skeleton_uint8, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)

    vectors = []
    for cnt in contours:
        pts = cnt.reshape(-1, 2).tolist()

        if len(pts) < 10:  # Minimum length for filled walls
            continue

        # Measure thickness along the ridge
        thicknesses = []
        for pt in pts[::5]:  # Sample every 5th point
            if 0 <= pt[1] < dist_transform.shape[0] and 0 <= pt[0] < dist_transform.shape[1]:
                thickness = dist_transform[pt[1], pt[0]] * 2  # diameter = 2 * radius
                thicknesses.append(thickness)

        if not thicknesses:
            continue

        avg_thickness = np.mean(thicknesses)
        std_thickness = np.std(thicknesses)

        # Filter by thickness consistency (filled walls have uniform thickness)
        if avg_thickness < 6 or avg_thickness > 25:  # Outside wall thickness range
            continue
        if std_thickness > avg_thickness * 0.4:  # Too variable (not a uniform wall)
            continue

        # Simplify and normalize
        simplified_pts = simplify_coordinates(pts, tolerance=2.0)
        normalized_pts = [[round((p[0] / width) * 100.0, 3), round((p[1] / height) * 100.0, 3)]
                         for p in simplified_pts]

        if len(normalized_pts) > 1:
            # Calculate length
            length = sum(np.linalg.norm(np.array(normalized_pts[i]) - np.array(normalized_pts[i-1]))
                        for i in range(1, len(normalized_pts)))

            vectors.append({
                'coords': normalized_pts,
                'source': 'ridge',
                'thickness_px': round(avg_thickness, 2),
                'length_normalized': round(length, 2),
                'confidence': 0.7  # Single-method detection
            })

    log(f"  -> Path A detected {len(vectors)} filled wall segments")
    return vectors

# ============================================================================
# PATH B: PARALLEL LINE DETECTION (HOLLOW WALLS)
# ============================================================================

def detect_hollow_walls_parallel(binary_img, width, height):
    """
    Path B: Detect hollow/double-line walls using edge detection and parallel line pairing.
    Returns list of wall vectors with metadata.
    """
    log("Path B: Parallel line detection for hollow walls...")

    # B.1: Edge Detection
    log("  B.1: Canny edge detection...")
    # Slight blur to reduce noise
    blurred = cv2.GaussianBlur(binary_img, (3, 3), 0.8)
    edges = cv2.Canny(blurred, 40, 120)

    # B.2: Line Segment Detection using LSD
    log("  B.2: Line segment detection (LSD)...")
    lsd = cv2.createLineSegmentDetector(0)
    lines, widths, prec, nfa = lsd.detect(edges)

    if lines is None or len(lines) == 0:
        log("  -> No lines detected by LSD")
        return []

    lines = lines.reshape(-1, 4)  # [[x1, y1, x2, y2], ...]
    log(f"  -> LSD found {len(lines)} line segments")

    # B.3: Parallel Line Pairing
    log("  B.3: Pairing parallel lines...")

    def line_angle(line):
        """Calculate angle of line in degrees."""
        x1, y1, x2, y2 = line
        return np.degrees(np.arctan2(y2 - y1, x2 - x1))

    def line_length(line):
        """Calculate length of line."""
        x1, y1, x2, y2 = line
        return np.sqrt((x2 - x1)**2 + (y2 - y1)**2)

    def perpendicular_distance(line1, line2):
        """Calculate perpendicular distance between two parallel lines."""
        x1, y1, x2, y2 = line1
        x3, y3, x4, y4 = line2

        # Midpoint of line1
        mx1, my1 = (x1 + x2) / 2, (y1 + y2) / 2
        # Midpoint of line2
        mx2, my2 = (x3 + x4) / 2, (y3 + y4) / 2

        # Vector of line1
        dx, dy = x2 - x1, y2 - y1
        length = np.sqrt(dx**2 + dy**2)
        if length < 1e-6:
            return float('inf')

        # Unit perpendicular vector
        perp_x, perp_y = -dy / length, dx / length

        # Distance from midpoint of line2 to line1
        dist = abs((mx2 - mx1) * perp_x + (my2 - my1) * perp_y)
        return dist

    def lines_overlap_parallel(line1, line2):
        """Check if two lines overlap in their parallel direction (0-1 overlap ratio)."""
        x1, y1, x2, y2 = line1
        x3, y3, x4, y4 = line2

        # Project line2 endpoints onto line1
        dx, dy = x2 - x1, y2 - y1
        length1_sq = dx**2 + dy**2

        if length1_sq < 1e-6:
            return 0

        # Parameter t for projection: P = line1_start + t * line1_vector
        t3 = ((x3 - x1) * dx + (y3 - y1) * dy) / length1_sq
        t4 = ((x4 - x1) * dx + (y4 - y1) * dy) / length1_sq

        # Overlap range on line1's parameter space [0, 1]
        overlap_start = max(0, min(t3, t4))
        overlap_end = min(1, max(t3, t4))

        overlap = max(0, overlap_end - overlap_start)
        return overlap

    # Find parallel pairs
    pairs = []
    used = set()

    for i, line1 in enumerate(lines):
        if i in used:
            continue

        angle1 = line_angle(line1)
        length1 = line_length(line1)

        if length1 < 20:  # Too short
            continue

        best_match = None
        best_score = 0

        for j, line2 in enumerate(lines):
            if j <= i or j in used:
                continue

            angle2 = line_angle(line2)
            length2 = line_length(line2)

            if length2 < 20:
                continue

            # Check parallelism
            angle_diff = abs(angle1 - angle2)
            if angle_diff > 180:
                angle_diff = 360 - angle_diff

            if angle_diff > 5:  # Not parallel enough
                continue

            # Check distance (wall thickness)
            dist = perpendicular_distance(line1, line2)
            if dist < 4 or dist > 15:  # Outside typical wall thickness range
                continue

            # Check overlap in parallel direction
            overlap = lines_overlap_parallel(line1, line2)
            if overlap < 0.5:  # Less than 50% overlap
                continue

            # Score this pairing
            score = overlap * min(length1, length2) / (1 + abs(dist - 8))  # Prefer ~8px gap

            if score > best_score:
                best_score = score
                best_match = (j, line2, dist)

        if best_match:
            j, line2, dist = best_match
            pairs.append((line1, line2, dist))
            used.add(i)
            used.add(j)

    log(f"  -> Found {len(pairs)} parallel line pairs")

    # B.4: Calculate Centerlines
    log("  B.4: Computing centerlines of paired walls...")
    vectors = []

    for line1, line2, gap in pairs:
        x1, y1, x2, y2 = line1
        x3, y3, x4, y4 = line2

        # Centerline = average of the two lines
        cx1, cy1 = (x1 + x3) / 2, (y1 + y3) / 2
        cx2, cy2 = (x2 + x4) / 2, (y2 + y4) / 2

        # Convert to percentage coordinates
        coords = [
            [round((cx1 / width) * 100.0, 3), round((cy1 / height) * 100.0, 3)],
            [round((cx2 / width) * 100.0, 3), round((cy2 / height) * 100.0, 3)]
        ]

        # Calculate length
        length = np.sqrt((cx2 - cx1)**2 + (cy2 - cy1)**2)
        length_normalized = (length / width) * 100.0

        vectors.append({
            'coords': coords,
            'source': 'parallel',
            'thickness_px': round(gap, 2),
            'length_normalized': round(length_normalized, 2),
            'confidence': 0.7  # Single-method detection
        })

    log(f"  -> Path B generated {len(vectors)} hollow wall segments")
    return vectors

# ============================================================================
# PHASE 3: FUSION
# ============================================================================

def fuse_wall_detections(ridge_walls, parallel_walls, width, height):
    """
    Fuse results from both detection paths, removing duplicates and boosting
    confidence for walls detected by both methods.
    """
    log("Phase 3: Fusing wall detections...")

    def wall_distance(wall1, wall2):
        """Calculate Hausdorff distance between two wall centerlines."""
        coords1 = np.array(wall1['coords'])
        coords2 = np.array(wall2['coords'])

        # Sample points along each wall
        if len(coords1) < 2 or len(coords2) < 2:
            return float('inf')

        # Calculate pairwise distances
        dists = cdist(coords1, coords2, metric='euclidean')

        # Hausdorff distance (max of min distances)
        return max(np.min(dists, axis=1).max(), np.min(dists, axis=0).max())

    # Find duplicates (walls detected by both methods)
    duplicates = []
    threshold = 5.0  # percentage points (on 0-100 scale)

    for i, r_wall in enumerate(ridge_walls):
        for j, p_wall in enumerate(parallel_walls):
            dist = wall_distance(r_wall, p_wall)
            if dist < threshold:
                duplicates.append((i, j, dist))

    log(f"  -> Found {len(duplicates)} walls detected by both methods")

    # Create fused result
    fused_walls = []
    used_ridge = set()
    used_parallel = set()

    # Process duplicates (dual-confirmed walls)
    for r_idx, p_idx, dist in duplicates:
        r_wall = ridge_walls[r_idx]
        p_wall = parallel_walls[p_idx]

        # Average the centerlines
        r_coords = np.array(r_wall['coords'])
        p_coords = np.array(p_wall['coords'])

        # Use the longer one as base (more detail)
        if len(r_coords) >= len(p_coords):
            coords = r_wall['coords']
        else:
            coords = p_wall['coords']

        # Average thickness
        avg_thickness = (r_wall['thickness_px'] + p_wall['thickness_px']) / 2

        fused_walls.append({
            'coords': coords,
            'source': 'dual_confirmed',
            'thickness_px': round(avg_thickness, 2),
            'length_normalized': max(r_wall['length_normalized'], p_wall['length_normalized']),
            'confidence': 0.95  # High confidence - both methods agree!
        })

        used_ridge.add(r_idx)
        used_parallel.add(p_idx)

    # Add unique ridge walls
    for i, wall in enumerate(ridge_walls):
        if i not in used_ridge:
            fused_walls.append(wall)

    # Add unique parallel walls
    for i, wall in enumerate(parallel_walls):
        if i not in used_parallel:
            fused_walls.append(wall)

    log(f"  -> Fused result: {len(fused_walls)} total walls")
    log(f"     - Dual-confirmed: {len(duplicates)}")
    log(f"     - Ridge-only: {len(ridge_walls) - len(used_ridge)}")
    log(f"     - Parallel-only: {len(parallel_walls) - len(used_parallel)}")

    return fused_walls

# ============================================================================
# PHASE 4: VALIDATION & POST-PROCESSING
# ============================================================================

def validate_and_filter_walls(walls):
    """
    Final validation and filtering of detected walls.
    """
    log("Phase 4: Validation and filtering...")

    filtered = []

    for wall in walls:
        coords = np.array(wall['coords'])

        # Skip if too few points
        if len(coords) < 2:
            continue

        # Calculate total length (in percentage units 0-100)
        length = sum(np.linalg.norm(coords[i] - coords[i-1]) for i in range(1, len(coords)))

        # RELAXED: Filter by minimum length (0.5% of image diagonal ~= 20-30px on 4000px image)
        if length < 0.5:  # Very short segments only
            continue

        # Check straightness (optional, for now just pass through)
        # Could measure deviation from best-fit line here

        filtered.append(wall)

    log(f"  -> Kept {len(filtered)}/{len(walls)} walls after validation")
    return filtered

# ============================================================================
# MAIN PROCESSING PIPELINE
# ============================================================================

def process_image(image_path):
    log(f"Processing: {image_path}")

    # 1. READ IMAGE
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    height, width = img.shape
    log(f"Image Dimensions: {width}x{height}")

    # PHASE 1: PREPROCESSING
    cleaned_binary = preprocess_image(img)

    # PHASE 2: DUAL-PATH DETECTION
    ridge_walls = detect_filled_walls_ridge(cleaned_binary, width, height)
    parallel_walls = detect_hollow_walls_parallel(cleaned_binary, width, height)

    # PHASE 3: FUSION
    fused_walls = fuse_wall_detections(ridge_walls, parallel_walls, width, height)

    # PHASE 4: VALIDATION
    final_walls = validate_and_filter_walls(fused_walls)

    # SYMBOL DETECTION (keep existing logic)
    log("Symbol detection (circular lights)...")
    detected_symbols = []

    circles = cv2.HoughCircles(img, cv2.HOUGH_GRADIENT, dp=1, minDist=20,
                               param1=50, param2=25, minRadius=5, maxRadius=40)

    if circles is not None:
        circles = np.uint16(np.around(circles))
        for i in circles[0, :]:
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

    # OUTPUT JSON (convert numpy types to native Python)
    def convert_to_native(obj):
        """Convert numpy types to native Python types for JSON serialization."""
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: convert_to_native(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_to_native(item) for item in obj]
        else:
            return obj

    output_data = {
        "metadata": {
            "width": int(width),
            "height": int(height),
            "processing": {
                "method": "hybrid_ridge_parallel",
                "version": "2.0"
            },
            "detection_stats": {
                "path_a_ridge": len(ridge_walls),
                "path_b_parallel": len(parallel_walls),
                "dual_confirmed": len([w for w in final_walls if w.get('source') == 'dual_confirmed']),
                "ridge_only": len([w for w in final_walls if w.get('source') == 'ridge']),
                "parallel_only": len([w for w in final_walls if w.get('source') == 'parallel']),
                "total_walls": len(final_walls)
            }
        },
        "walls": [{'coords': [[float(p[0]), float(p[1])] for p in w['coords']],
                   'source': w['source'],
                   'thickness_px': float(w['thickness_px']),
                   'confidence': float(w['confidence'])}
                  for w in final_walls],
        "detected_symbols": convert_to_native(detected_symbols)
    }

    print(json.dumps(output_data))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hybrid Floorplan Wall Vectorizer")
    parser.add_argument("--input", required=True, help="Path to input image")

    args = parser.parse_args()

    try:
        process_image(args.input)
    except Exception as e:
        error(str(e))
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
