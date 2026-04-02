/**
 * Makes all uploaded S3 variants publicly readable.
 * Run once after generate-variants.mjs if images show as broken.
 *
 * Usage:
 *   AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy node scripts/fix-variant-acls.mjs
 */

import { S3Client, ListObjectsV2Command, PutObjectAclCommand } from "@aws-sdk/client-s3";

const BUCKET = "project-images-660c";
const REGION = "eu-north-1";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required.");
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// List all variants
const variants = [];
let ContinuationToken;
do {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "variants/", ContinuationToken }));
  for (const obj of res.Contents ?? []) variants.push(obj.Key);
  ContinuationToken = res.NextContinuationToken;
} while (ContinuationToken);

console.log(`Found ${variants.length} variants. Making them public...\n`);

let ok = 0;
let failed = 0;
for (let i = 0; i < variants.length; i++) {
  const key = variants[i];
  try {
    await s3.send(new PutObjectAclCommand({ Bucket: BUCKET, Key: key, ACL: "public-read" }));
    process.stdout.write(`\r[${i + 1}/${variants.length}] ${ok} done, ${failed} failed`);
    ok++;
  } catch (err) {
    failed++;
    if (i === 0) {
      // If the very first one fails, ACLs are likely blocked on the bucket.
      // Tell the user to add a bucket policy instead.
      console.error(`\n\nFailed to set ACL: ${err.message}`);
      console.error(`
Your bucket likely has "Block Public ACLs" enabled.
Fix it in the AWS Console instead:

1. Go to S3 → project-images-660c → Permissions → Bucket policy
2. Make sure the policy Resource is:
   "arn:aws:s3:::project-images-660c/*"
   (the /* covers both root images AND the variants/ folder)

If the policy already has /* and variants are still 403, paste your bucket policy
here and we can check it together.
`);
      process.exit(1);
    }
  }
}

console.log(`\n\nDone. ${ok} variants are now public.`);
