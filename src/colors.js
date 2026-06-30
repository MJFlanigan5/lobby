import sharp from 'sharp';

/**
 * Extract the dominant color from an image buffer.
 * Resizes to 50x50 and averages pixel clusters to find the most prominent hue.
 */
export async function extractDominantColor(imageBuffer) {
  try {
    const { data, info } = await sharp(imageBuffer)
      .resize(50, 50, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Simple: bucket by 32-step increments, find most common bucket
    const buckets = {};
    for (const [r, g, b] of pixels) {
      const key = `${Math.floor(r / 32)},${Math.floor(g / 32)},${Math.floor(b / 32)}`;
      if (!buckets[key]) buckets[key] = { count: 0, r: 0, g: 0, b: 0 };
      buckets[key].count++;
      buckets[key].r += r;
      buckets[key].g += g;
      buckets[key].b += b;
    }

    const dominant = Object.values(buckets).sort((a, b) => b.count - a.count)[0];
    return {
      r: Math.round(dominant.r / dominant.count),
      g: Math.round(dominant.g / dominant.count),
      b: Math.round(dominant.b / dominant.count),
    };
  } catch {
    return { r: 30, g: 30, b: 30 };
  }
}
