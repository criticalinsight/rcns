const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

async function createPoster(details, imagePath, outputPath) {
    console.log("Generating poster...");

    const width = 1200;
    const height = 675;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a1a'; // Dark background
    ctx.fillRect(0, 0, width, height);

    // Load Original Image
    const img = await loadImage(imagePath);

    // Draw Image on Left (contain)
    // We want it to take up roughly 40-50% of the width
    const imgTargetWidth = 500;
    const scale = Math.min(imgTargetWidth / img.width, height / img.height);
    const imgW = img.width * scale;
    const imgH = img.height * scale;
    const imgX = 50 + (imgTargetWidth - imgW) / 2;
    const imgY = (height - imgH) / 2;

    ctx.drawImage(img, imgX, imgY, imgW, imgH);

    // Text Content
    const textX = 600;
    const textY = 100;
    const maxWidth = 550;

    // Styles
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    // Title (Topic)
    ctx.font = 'bold 40px Arial'; // Use system font for now
    wrapText(ctx, details.topic || "Rotary Event", textX, textY, maxWidth, 50);

    // Speaker
    let currentY = textY + 120; // Adjust based on title length
    if (details.speaker) {
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#f0c040'; // Gold
        ctx.fillText("Speaker:", textX, currentY);
        ctx.font = '30px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(details.speaker, textX + 140, currentY);
        currentY += 60;
    }

    // Date & Time
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#f0c040';
    ctx.fillText("When:", textX, currentY);
    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${details.date || ''} | ${details.time || ''}`, textX, currentY + 40);
    currentY += 100;

    // Venue
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#f0c040';
    ctx.fillText("Where:", textX, currentY);
    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffffff';
    wrapText(ctx, details.venue || "TBA", textX, currentY + 40, maxWidth, 35);

    // Footer / Club Name
    ctx.font = 'italic 20px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(details.clubName || "Rotary Club", textX, height - 50);

    // Save
    const buffer = canvas.toBuffer('image/jpeg');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Poster saved to ${outputPath}`);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

module.exports = { createPoster };
