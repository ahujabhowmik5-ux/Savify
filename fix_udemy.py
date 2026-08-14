#!/usr/bin/env python3
"""Fix Udemy logo - invert dark text to white on dark bg."""

from PIL import Image, ImageDraw
import os

LOGOS_DIR = "client/public/logos"

def fix_udemy(filepath):
    """Recreate Udemy on dark bg with white text by inverting non-purple colors."""
    # Re-read from the uploaded original
    orig_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                              "all logos by name", "udemy logo.png")
    img = Image.open(orig_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    # Find content bounds
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 10:
                continue
            if r > 240 and g > 240 and b > 240:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    
    # Crop content
    content = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    cw, ch = content.size
    cpixels = content.load()
    
    # Invert dark/black pixels to white, keep purple as-is
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = cpixels[x, y]
            if a < 10:
                continue
            # Skip white/near-white (make transparent)
            if r > 240 and g > 240 and b > 240:
                cpixels[x, y] = (0, 0, 0, 0)
                continue
            # Keep purple tones (the hat accent)
            if b > 100 and r > 80 and g < 80:
                continue
            # Dark pixels (text) -> make white
            if r < 80 and g < 80 and b < 80:
                cpixels[x, y] = (255, 255, 255, a)
    
    # Create dark bg canvas 256x256
    target = 256
    padding = 16
    canvas = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([(padding//2, padding//2), (target - padding//2, target - padding//2)], 
                           radius=36, fill=(28, 28, 30, 255))
    
    # Scale content to fit
    inner_pad = 32
    avail_w = target - padding - inner_pad * 2
    avail_h = target - padding - inner_pad * 2
    ratio = min(avail_w / cw, avail_h / ch)
    new_w = int(cw * ratio)
    new_h = int(ch * ratio)
    content_resized = content.resize((new_w, new_h), Image.LANCZOS)
    
    offset_x = (target - new_w) // 2
    offset_y = (target - new_h) // 2
    canvas.paste(content_resized, (offset_x, offset_y), content_resized)
    
    canvas.save(filepath, "PNG")
    print(f"  Fixed Udemy: inverted text to white on dark bg, {new_w}x{new_h}")


def main():
    logos_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), LOGOS_DIR)
    fix_udemy(os.path.join(logos_path, "udemy.png"))
    print("Done!")


if __name__ == "__main__":
    main()
