/**
 * Pre-generates compressed WebP variants for all gallery images and uploads
 * them to S3 so the website can serve them directly — no server processing needed.
 *
 * Usage:
 *   AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy node scripts/generate-variants.mjs
 *
 * Requires @aws-sdk/client-s3:
 *   npm install --save-dev @aws-sdk/client-s3
 *
 * Variants created per image:
 *   variants/thumb/<filename>.webp  — 640px wide, quality 55  (gallery display)
 *   variants/lightbox/<filename>.webp — 1400px wide, quality 75  (lightbox view)
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const BUCKET  = "project-images-660c";
const REGION  = "eu-north-1";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/** Variants to generate for each image */
const VARIANTS = [
  { folder: "thumb",    width: 640,  quality: 55 },
  { folder: "lightbox", width: 1400, quality: 75 },
];

// ---------------------------------------------------------------------------

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error(
    "\nError: AWS credentials are required.\n" +
    "Run with:\n" +
    "  AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy node scripts/generate-variants.mjs\n"
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function variantExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** List all original (non-variant) images in the bucket */
async function listSourceImages() {
  const images = [];
  let ContinuationToken;

  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken }));
    for (const obj of res.Contents ?? []) {
      const key = obj.Key;
      if (!key || key.startsWith("variants/")) continue;
      const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) images.push(key);
    }
    ContinuationToken = res.NextContinuationToken;
  } while (ContinuationToken);

  return images;
}

async function processImage(key, index, total) {
  console.log(`\n[${index}/${total}] ${key}`);

  // Download the original from S3
  const getResult = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const inputBuffer = await streamToBuffer(getResult.Body);
  const originalKB = (inputBuffer.length / 1024).toFixed(0);
  console.log(`  Original: ${originalKB} KB`);

  for (const variant of VARIANTS) {
    const variantKey = `variants/${variant.folder}/${key}.webp`;

    if (await variantExists(variantKey)) {
      console.log(`  [skip] ${variant.folder} already exists`);
      continue;
    }

    const output = await sharp(inputBuffer)
      .rotate()
      .resize({ width: variant.width, withoutEnlargement: true, fastShrinkOnLoad: true })
      .webp({ quality: variant.quality })
      .toBuffer();

    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         variantKey,
      Body:        output,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }));

    const sizeKB = (output.length / 1024).toFixed(0);
    const reduction = (100 - (output.length / inputBuffer.length) * 100).toFixed(0);
    console.log(`  [done] ${variant.folder}: ${sizeKB} KB  (${reduction}% smaller)`);
  }
}

// ---------------------------------------------------------------------------

console.log("Listing images in S3 bucket...");
const images = await listSourceImages();
console.log(`Found ${images.length} source images.\n`);

let processed = 0;
let skipped   = 0;

for (let i = 0; i < images.length; i++) {
  try {
    await processImage(images[i], i + 1, images.length);
    processed++;
  } catch (err) {
    console.error(`  ERROR processing ${images[i]}:`, err.message);
    skipped++;
  }
}

console.log(`\n✓ Done. ${processed} processed, ${skipped} failed.`);
console.log("You can now deploy the site — gallery images will load from S3 variants.");
