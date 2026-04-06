const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const INPUT_PATH = path.join(__dirname, '../../public/App icons/meta_data_icon.PNG');
const OUTPUT_DIR = path.join(__dirname, '../../public/App icons');
const WEB_ICON_PATH = path.join(__dirname, '../../src/app/icon.png');

async function processIcon() {
    console.log('🚀 Starting "Advanced Elite" Icon Refinement (v5)...');
    
    try {
        const image = await Jimp.read(INPUT_PATH);
        const { width, height } = image.bitmap;
        
        console.log(`📏 Input Image: ${width}x${height}`);

        // 1. Surgical Edge Erosion (4.0px)
        // We iterate through every pixel. If a pixel is near a "boundary" (transparency transition),
        // we force it to be 100% transparent if it's within the 4px erosion zone.
        // For simplicity and quality, we can also use a "Median Filter" or similar, 
        // but here we'll use a distance-based alpha clamping.
        
        console.log('✂️  Applying 4.0px Alpha Erosion...');
        
        // First, let's ensure we have a clean transparency mask.
        // We'll treat very dark/very light pixels as background if needed, 
        // but let's assume the source has some alpha we can refine.
        
        const erosionPixels = 4;
        const tempImage = image.clone();

        image.scan(0, 0, width, height, (x, y, idx) => {
            const alpha = image.bitmap.data[idx + 3];
            
            // If the pixel is already semi-transparent, it's a candidate for erosion
            if (alpha < 255) {
                // If it's quite transparent, kill it immediately (Binary Clamping)
                if (alpha < 180) {
                    image.bitmap.data[idx + 3] = 0;
                }
            }
        });

        // SECOND PASS: Neighbor check for erosion
        // If a pixel is within 4 pixels of any transparent pixel, we erode it.
        // This is the "kill shot" for the fringes.
        const originalData = Buffer.from(image.bitmap.data);
        
        image.scan(0, 0, width, height, (x, y, idx) => {
            let isNearTransparent = false;
            
            for (let dx = -erosionPixels; dx <= erosionPixels; dx++) {
                for (let dy = -erosionPixels; dy <= erosionPixels; dy++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = (ny * width + nx) * 4;
                        if (originalData[nIdx + 3] === 0) {
                            isNearTransparent = true;
                            break;
                        }
                    }
                }
                if (isNearTransparent) break;
            }
            
            if (isNearTransparent) {
                image.bitmap.data[idx + 3] = 0;
            }
        });

        // 2. Autocrop: Find the bounding box of the logo (non-transparent pixels)
        console.log('📐 Finding bounding box (Autocrop)...');
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let foundAny = false;

        image.scan(0, 0, width, height, (x, y, idx) => {
            if (image.bitmap.data[idx + 3] > 0) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                foundAny = true;
            }
        });

        if (foundAny) {
            const logoWidth = maxX - minX + 1;
            const logoHeight = maxY - minY + 1;
            console.log(`✂️ Cropping logo to bounding box: ${logoWidth}x${logoHeight}`);
            image.crop(minX, minY, logoWidth, logoHeight);
        }

        // 3. Vibrance & Contrast Boost (+15%)
        console.log('🎨 Boosting Vibrance & Contrast (+15%)...');
        image.color([
            { apply: 'saturate', params: [15] },
            { apply: 'brighten', params: [5] }
        ]);
        image.contrast(0.15);

        // 4. Final Mastering: Generate Assets (Full-Bleed 98%)
        console.log('💾 Saving "Full-Bleed" (v6) Assets...');

        const generateAsset = async (size, targetPath) => {
            const canvas = new Jimp(size, size, 0x00000000); // Transparent canvas
            const scaleFactor = 0.98; // 98% fill ratio
            const iconSize = Math.floor(size * scaleFactor);
            
            const scaledLogo = image.clone().scaleToFit(iconSize, iconSize);
            const xPos = Math.floor((size - scaledLogo.bitmap.width) / 2);
            const yPos = Math.floor((size - scaledLogo.bitmap.height) / 2);
            
            canvas.composite(scaledLogo, xPos, yPos);
            await canvas.writeAsync(targetPath);
        };

        // Asset 1: Google Play (512x512)
        await generateAsset(512, path.join(OUTPUT_DIR, 'Kontrola_GooglePlay_512x512.png'));
        
        // Asset 2: Desktop (512x512)
        await generateAsset(512, path.join(OUTPUT_DIR, 'Kontrola_Desktop_512x512.png'));
        
        // Asset 3: Web Icon (512x512)
        await generateAsset(512, WEB_ICON_PATH);

        // Asset 4: Apple (1024x1024)
        await generateAsset(1024, path.join(OUTPUT_DIR, 'Kontrola_Apple_1024x1024.png'));

        // Asset 5: Transparent Master (for testing)
        await image.writeAsync(path.join(OUTPUT_DIR, 'meta_data_icon_transparent.png'));

        console.log('✅ All v6 "Full-Bleed" assets successfully generated!');
        
    } catch (err) {
        console.error('❌ Error processing icon:', err);
    }
}

processIcon();
