
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const INPUT_PATH = path.join(__dirname, '../../public/App icons/officiallogo.jpeg');
const OUTPUT_DIR = path.join(__dirname, '../../public/App icons');
const WEB_ICON_PATH = path.join(__dirname, '../../public/icon.png');

async function processIcon() {
    console.log('🚀 Starting "Elite Refinement" Background Removal...');
    
    try {
        const image = await Jimp.read(INPUT_PATH);
        const { width, height } = image.bitmap;
        
        console.log(`📏 Input Image: ${width}x${height}`);

        // 1. Background Removal (Color Keying)
        // We'll sample the corner pixel as the background color
        const bgColor = image.getPixelColor(0, 0);
        const { r: br, g: bg, b: bb } = Jimp.intToRGBA(bgColor);
        console.log(`🔍 Detected Background Color (RGBA): ${br}, ${bg}, ${bb}`);

        const threshold = 40; // Sensitivity for color matching

        image.scan(0, 0, width, height, (x, y, idx) => {
            const r = image.bitmap.data[idx + 0];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];
            
            // Calculate Euclidean distance from background color
            const distance = Math.sqrt(
                Math.pow(r - br, 2) + 
                Math.pow(g - bg, 2) + 
                Math.pow(b - bb, 2)
            );

            if (distance < threshold) {
                image.bitmap.data[idx + 3] = 0; // Make transparent
            }
        });

        // 2. Surgical Edge Erosion (2px)
        console.log('✂️  Applying Alpha Erosion...');
        const erosionPixels = 2;
        const originalData = Buffer.from(image.bitmap.data);
        
        image.scan(0, 0, width, height, (x, y, idx) => {
            if (image.bitmap.data[idx + 3] === 0) return;

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

        // 3. Autocrop
        console.log('📐 Finding bounding box...');
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
            image.crop(minX, minY, logoWidth, logoHeight);
            console.log(`✂️ Cropped to: ${logoWidth}x${logoHeight}`);
        }

        // 4. Contrast & Color Boost
        image.contrast(0.1);
        image.color([{ apply: 'saturate', params: [10] }]);

        // 5. Generate Final Assets
        console.log('💾 Saving Refined Assets...');

        const generateAsset = async (size, targetPath) => {
            const backgroundColor = 0x020817FF; // Matching Navy Opaque
            const canvas = new Jimp(size, size, backgroundColor); 
            const iconSize = Math.floor(size * 0.9); // Slight padding
            
            const scaledLogo = image.clone().scaleToFit(iconSize, iconSize);
            const xPos = Math.floor((size - scaledLogo.bitmap.width) / 2);
            const yPos = Math.floor((size - scaledLogo.bitmap.height) / 2);
            
            canvas.composite(scaledLogo, xPos, yPos);
            await canvas.writeAsync(targetPath);
        };

        await generateAsset(512, path.join(OUTPUT_DIR, 'Kontrola_GooglePlay_512x512.png'));
        await generateAsset(512, path.join(OUTPUT_DIR, 'Kontrola_Desktop_512x512.png'));
        await generateAsset(512, WEB_ICON_PATH);
        await generateAsset(1024, path.join(OUTPUT_DIR, 'Kontrola_Apple_1024x1024.png'));

        // Save transparent master
        await image.writeAsync(path.join(OUTPUT_DIR, 'meta_data_icon_transparent.png'));

        console.log('✅ Refined icons generated successfully!');
        
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

processIcon();
