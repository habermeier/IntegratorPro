import os
from PIL import Image

MAX_WIDTH = 3000
TARGET_DIR = 'images'
FILES = [
    'floor-plan-clean.jpg', 
    'electric-plan-plain-full-clean-2025-11-22.jpg'
]

def resize_image(filename):
    path = os.path.join(TARGET_DIR, filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    try:
        with Image.open(path) as img:
            print(f"Processing {filename}...")
            print(f"Original Size: {img.size}")
            
            if img.width <= MAX_WIDTH:
                print("Width is already <= 3000px. Skipping.")
                return

            # Calculate new height
            aspect_ratio = img.height / img.width
            new_height = int(MAX_WIDTH * aspect_ratio)
            
            # Backup original
            backup_path = path + ".orig"
            try:
                if not os.path.exists(backup_path):
                    # We have to close the file to rename it on some OS, but here we have it open.
                    # Better strategy: Save the resized image to a temp file, then swap.
                    pass
            except Exception as e:
                pass

            # Actually, let's just save to a temp file first
            temp_path = path + ".tmp.jpg"
            resized = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
            resized.save(temp_path, quality=90, optimize=True)
            
            # Now swap
            if not os.path.exists(backup_path):
                os.rename(path, backup_path)
                print(f"Backed up original to {backup_path}")
            
            os.rename(temp_path, path)
            print(f"Resized to {resized.size} and saved to {path}")
            
    except Exception as e:
        print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    for f in FILES:
        resize_image(f)
