import os
from PIL import Image

# Brain Directory
brain_dir = r"C:\Users\richm\.gemini\antigravity\brain\7cad3c8c-bcf5-42b9-a17f-5d9bebf6581c"

# Scene Paths
scenes = [
    os.path.join(brain_dir, "promo_intro_cinematic_1774996020298.png"),
    os.path.join(brain_dir, "promo_business_dashboard_1774996083513.png"),
    os.path.join(brain_dir, "promo_vehicle_intelligence_1774996193806.png"),
    os.path.join(brain_dir, "promo_ai_advisor_1774996250122.png"),
]

# Output Path
output_gif = os.path.join(brain_dir, "kontrola_promo.gif")

def render():
    print("Starting KONTROLA Promotional Rendering...")
    imgs = []
    
    # Target resolution for clear sharing (720p aspect)
    target_size = (1280, 720)
    
    for s in scenes:
        if os.path.exists(s):
            print(f"Processing scene: {os.path.basename(s)}")
            img = Image.open(s).convert("RGB")
            # Resize for optimal GIF balance
            img = img.resize(target_size, Image.Resampling.LANCZOS)
            imgs.append(img)
        else:
            print(f"Warning: Scene file not found at {s}")

    if not imgs:
        print("Error: No images were found for rendering.")
        return

    # Duration settings (4000ms = 4 seconds per scene)
    # Total duration: 16 seconds
    print(f"Rendering animated GIF to {output_gif}...")
    imgs[0].save(
        output_gif,
        save_all=True,
        append_images=imgs[1:],
        duration=4000,
        loop=0,
        optimize=True,
        quality=95
    )
    print("Success! Promotional video (GIF) is ready.")

if __name__ == "__main__":
    render()
