#!/usr/bin/env python3
"""Trim whitespace/transparency from logos and normalize to uniform visual size."""

from PIL import Image, ImageOps
import os

LOGOS_DIR = "client/public/logos"
TARGET_SIZE = 256
PADDING = 16  # px padding around the trimmed content

def trim_and_normalize(filepath):
    """Trim white/transparent background, pad, resize to uniform square."""
    img = Image.open(filepath).convert("RGBA")
    
    # Get alpha channel - find non-transparent pixels
    alpha = img.split()[3]
    
    # Also check for white pixels (some logos have white bg, not transparent)
    # Create a mask: pixel is "content" if it's not transparent AND not pure white
    pixels = img.load()
    w, h = img.size
    
    # Find bounding box of actual content
    min_x, min_y, max_x, max_y = w, h, 0, 0
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Skip fully transparent pixels
            if a < 10:
                continue
            # Skip near-white pixels (background)
            if r > 240 and g > 240 and b > 240:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    
    # If no content found (all white/transparent), use the whole image
    if min_x >= max_x or min_y >= max_y:
        # Fallback: use PIL's getbbox on alpha
        bbox = alpha.getbbox()
        if bbox:
            min_x, min_y, max_x, max_y = bbox
        else:
            print(f"  SKIP {os.path.basename(filepath)} - no content detected")
            return
    
    # Crop to content
    cropped = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    cw, ch = cropped.size
    
    # Calculate the target content size (with padding)
    content_size = TARGET_SIZE - (PADDING * 2)
    
    # Scale to fit within content_size while maintaining aspect ratio
    ratio = min(content_size / cw, content_size / ch)
    new_w = int(cw * ratio)
    new_h = int(ch * ratio)
    
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    
    # Create final canvas (transparent background)
    canvas = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    
    # Center the resized logo on canvas
    offset_x = (TARGET_SIZE - new_w) // 2
    offset_y = (TARGET_SIZE - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)
    
    # Save as PNG
    canvas.save(filepath, "PNG")
    print(f"  OK {os.path.basename(filepath)}: {w}x{h} -> crop {cw}x{ch} -> {new_w}x{new_h} centered on {TARGET_SIZE}x{TARGET_SIZE}")


def main():
    logos_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), LOGOS_DIR)
    
    png_files = sorted([f for f in os.listdir(logos_path) if f.endswith('.png')])
    
    print(f"Processing {len(png_files)} PNG logos in {logos_path}")
    print(f"Target: {TARGET_SIZE}x{TARGET_SIZE} with {PADDING}px padding\n")
    
    for f in png_files:
        filepath = os.path.join(logos_path, f)
        try:
            trim_and_normalize(filepath)
        except Exception as e:
            print(f"  ERROR {f}: {e}")


if __name__ == "__main__":
    main()
