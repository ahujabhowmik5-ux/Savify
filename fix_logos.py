#!/usr/bin/env python3
"""Fix specific logo issues."""

from PIL import Image, ImageDraw
import os

LOGOS_DIR = "client/public/logos"

def make_rounded_corners_transparent(filepath, radius=32):
    """Remove white corners by making them transparent with rounded corners."""
    img = Image.open(filepath).convert("RGBA")
    w, h = img.size
    
    # Create a rounded rectangle mask
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (w - 1, h - 1)], radius=radius, fill=255)
    
    # Apply mask to alpha channel
    img.putalpha(mask)
    img.save(filepath, "PNG")
    print(f"  Rounded corners: {os.path.basename(filepath)}")


def create_dark_bg_logo(filepath, bg_color=(30, 30, 30, 255), padding=32, corner_radius=40):
    """Add a dark rounded background behind a text logo for dark UI visibility."""
    img = Image.open(filepath).convert("RGBA")
    w, h = img.size
    
    # Create dark background canvas
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([(padding//2, padding//2), (w - padding//2, h - padding//2)], 
                           radius=corner_radius, fill=bg_color)
    
    # Find content bounds (non-transparent, non-white)
    pixels = img.load()
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
    
    if min_x >= max_x or min_y >= max_y:
        bbox = img.split()[3].getbbox()
        if bbox:
            min_x, min_y, max_x, max_y = bbox
    
    # Crop content
    content = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    cw, ch = content.size
    
    # Available space inside the dark box
    box_w = w - padding
    box_h = h - padding
    inner_pad = 24  # padding inside the dark box
    avail_w = box_w - inner_pad * 2
    avail_h = box_h - inner_pad * 2
    
    # Scale content to fit
    ratio = min(avail_w / cw, avail_h / ch)
    new_w = int(cw * ratio)
    new_h = int(ch * ratio)
    content_resized = content.resize((new_w, new_h), Image.LANCZOS)
    
    # Center on canvas
    offset_x = (w - new_w) // 2
    offset_y = (h - new_h) // 2
    canvas.paste(content_resized, (offset_x, offset_y), content_resized)
    
    canvas.save(filepath, "PNG")
    print(f"  Dark bg added: {os.path.basename(filepath)} content {cw}x{ch} -> {new_w}x{new_h}")


def resize_netflix(filepath):
    """Make Netflix logo bigger by reducing padding."""
    img = Image.open(filepath).convert("RGBA")
    w, h = img.size
    
    # Find content bounds
    pixels = img.load()
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
    
    # Less padding for Netflix - 8px instead of 16
    target = 256
    padding = 8
    content_size = target - (padding * 2)
    
    ratio = min(content_size / cw, content_size / ch)
    new_w = int(cw * ratio)
    new_h = int(ch * ratio)
    content_resized = content.resize((new_w, new_h), Image.LANCZOS)
    
    canvas = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    offset_x = (target - new_w) // 2
    offset_y = (target - new_h) // 2
    canvas.paste(content_resized, (offset_x, offset_y), content_resized)
    
    canvas.save(filepath, "PNG")
    print(f"  Resized Netflix: {cw}x{ch} -> {new_w}x{new_h} (less padding)")


def main():
    logos_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), LOGOS_DIR)
    
    # 1. Fix Swiggy Instamart white corners
    print("1. Fixing Swiggy Instamart corners...")
    make_rounded_corners_transparent(os.path.join(logos_path, "swiggy_instamart.png"), radius=40)
    
    # 2. Fix Coursera - dark background
    print("2. Fixing Coursera with dark background...")
    create_dark_bg_logo(os.path.join(logos_path, "coursera.png"), 
                        bg_color=(28, 28, 30, 255), padding=16, corner_radius=36)
    
    # 3. Fix Udemy - dark background
    print("3. Fixing Udemy with dark background...")
    create_dark_bg_logo(os.path.join(logos_path, "udemy.png"),
                        bg_color=(28, 28, 30, 255), padding=16, corner_radius=36)
    
    # 4. Fix Netflix - make bigger
    print("4. Fixing Netflix size...")
    resize_netflix(os.path.join(logos_path, "netflix.png"))
    
    print("\nAll fixes applied!")


if __name__ == "__main__":
    main()
