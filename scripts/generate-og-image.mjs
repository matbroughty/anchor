#!/usr/bin/env node
/**
 * Generate OG image for Anchor.band social sharing.
 *
 * Creates a 1200x630 PNG with dark neutral background
 * and centered "Anchor.band" text.
 *
 * Uses sharp (available via Next.js) for image generation.
 */

import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'public', 'og-image.png');

const width = 1200;
const height = 630;
const bgColor = '#1a1a1a';
const textColor = '#e5e5e5';

// Create SVG with text overlay
const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <text
    x="50%"
    y="45%"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="72"
    font-weight="600"
    fill="${textColor}"
    text-anchor="middle"
    dominant-baseline="middle"
  >Anchor.band</text>
  <text
    x="50%"
    y="58%"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="28"
    font-weight="400"
    fill="#737373"
    text-anchor="middle"
    dominant-baseline="middle"
  >Your music taste, tastefully.</text>
</svg>
`;

async function generateOgImage() {
  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    const stats = await sharp(outputPath).metadata();
    console.log(`OG image created successfully!`);
    console.log(`Path: ${outputPath}`);
    console.log(`Dimensions: ${stats.width}x${stats.height}`);

    // Check file size
    const { statSync } = await import('fs');
    const fileSizeKB = Math.round(statSync(outputPath).size / 1024);
    console.log(`File size: ${fileSizeKB} KB`);

    if (fileSizeKB > 300) {
      console.warn('Warning: File size exceeds 300KB WhatsApp limit');
    }
  } catch (error) {
    console.error('Failed to generate OG image:', error);
    process.exit(1);
  }
}

generateOgImage();
