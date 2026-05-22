/**
 * Cloud Storage Configuration
 * Supports AWS S3 and Cloudflare R2
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const USE_CLOUD_STORAGE = process.env.USE_CLOUD_STORAGE === "true";

// Initialize S3/R2 client
let s3Client: S3Client | null = null;

if (USE_CLOUD_STORAGE) {
  // For AWS S3
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  // For Cloudflare R2
  else if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
}

/**
 * Upload file to cloud storage or local filesystem
 */
export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  if (USE_CLOUD_STORAGE && s3Client) {
    // Upload to cloud storage
    const bucket = process.env.AWS_S3_BUCKET || process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new Error("Cloud storage bucket not configured");
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimetype,
      })
    );

    // Return public URL
    if (process.env.R2_PUBLIC_URL) {
      return `${process.env.R2_PUBLIC_URL}/${filename}`;
    } else if (process.env.AWS_S3_BUCKET) {
      const region = process.env.AWS_REGION || "us-east-1";
      return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
    }

    throw new Error("Cloud storage public URL not configured");
  } else {
    // Save to local filesystem
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, fileBuffer);

    return `/uploads/${filename}`;
  }
}

/**
 * Delete file from cloud storage or local filesystem
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (USE_CLOUD_STORAGE && s3Client) {
    // Extract filename from URL
    const filename = fileUrl.split("/").pop();
    if (!filename) return;

    const bucket = process.env.AWS_S3_BUCKET || process.env.R2_BUCKET_NAME;
    if (!bucket) return;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: filename,
      })
    );
  } else {
    // Delete from local filesystem
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const filename = fileUrl.replace("/uploads/", "");
    const filepath = path.join(uploadDir, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }
}

/**
 * Get file URL (for local storage, prepend base URL)
 */
export function getFileUrl(filename: string): string {
  if (USE_CLOUD_STORAGE) {
    if (process.env.R2_PUBLIC_URL) {
      return `${process.env.R2_PUBLIC_URL}/${filename}`;
    } else if (process.env.AWS_S3_BUCKET) {
      const region = process.env.AWS_REGION || "us-east-1";
      const bucket = process.env.AWS_S3_BUCKET;
      return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
    }
  }

  return `/uploads/${filename}`;
}

export const isCloudStorageEnabled = USE_CLOUD_STORAGE && s3Client !== null;
