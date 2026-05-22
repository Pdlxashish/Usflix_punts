/**
 * Video Thumbnail Generator
 * Extracts a frame from video files to create thumbnails
 */
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

// Set FFmpeg path if needed (Windows compatibility)
// ffmpeg will use system PATH by default, but we can set it explicitly if needed
// Uncomment and set if FFmpeg is not in PATH:
// ffmpeg.setFfmpegPath('C:\\path\\to\\ffmpeg.exe');
// ffmpeg.setFfprobePath('C:\\path\\to\\ffprobe.exe');

/**
 * Generate thumbnail from video file
 * @param videoPath - Path to the video file
 * @param outputPath - Path where thumbnail should be saved (optional)
 * @param timeInSeconds - Time position to extract frame (default: 1 second)
 * @returns Promise<string> - Path to generated thumbnail
 */
export async function generateVideoThumbnail(
  videoPath: string,
  outputPath?: string,
  timeInSeconds: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`🎬 Starting thumbnail generation for: ${videoPath}`);
      
      // Check if video file exists
      if (!fs.existsSync(videoPath)) {
        const error = new Error(`Video file not found: ${videoPath}`);
        console.error(`❌ ${error.message}`);
        reject(error);
        return;
      }

      // Generate output path if not provided
      if (!outputPath) {
        const videoDir = path.dirname(videoPath);
        const videoName = path.basename(videoPath, path.extname(videoPath));
        outputPath = path.join(videoDir, `${videoName}-thumb.jpg`);
      }

      console.log(`📁 Output path: ${outputPath}`);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Capture as const so TypeScript knows it's a string inside callbacks
      const resolvedOutputPath: string = outputPath;

      // Extract frame from video with proper aspect ratio handling
      // Using 'scale' filter to maintain aspect ratio and crop to fit 2:3 portrait format
      ffmpeg(videoPath)
        .outputOptions([
          '-vf', 'scale=1080:1620:force_original_aspect_ratio=increase,crop=1080:1620',
          '-frames:v', '1',
          '-q:v', '2'  // High quality JPEG (1-31, lower is better)
        ])
        .seekInput(timeInSeconds)
        .output(resolvedOutputPath)
        .on("start", (commandLine) => {
          console.log(`🔧 FFmpeg command: ${commandLine}`);
        })
        .on("end", () => {
          // Verify the thumbnail was created
          if (fs.existsSync(resolvedOutputPath)) {
            console.log(`✅ Generated thumbnail: ${resolvedOutputPath}`);
            resolve(resolvedOutputPath);
          } else {
            const error = new Error(`Thumbnail file was not created: ${resolvedOutputPath}`);
            console.error(`❌ ${error.message}`);
            reject(error);
          }
        })
        .on("error", (err, stdout, stderr) => {
          console.error(`⚠️ Thumbnail generation failed for ${videoPath}`);
          console.error(`Error: ${err.message}`);
          if (stderr) console.error(`FFmpeg stderr: ${stderr}`);
          reject(err);
        })
        .run();
    } catch (err) {
      console.error(`❌ Exception in generateVideoThumbnail:`, err);
      reject(err);
    }
  });
}

/**
 * Check if a file is a video based on extension
 */
export function isVideoFile(filename: string): boolean {
  const videoExtensions = [
    ".mp4", ".mov", ".webm", ".avi", ".mkv", 
    ".3gp", ".mpeg", ".mpg", ".m4v", ".flv"
  ];
  const ext = path.extname(filename).toLowerCase();
  return videoExtensions.includes(ext);
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        resolve(Math.round(duration));
      }
    });
  });
}

/**
 * Convert video to web-compatible format (H.264 MP4)
 * This ensures browser compatibility across all devices
 */
export async function convertToWebFormat(
  inputPath: string,
  outputPath?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!outputPath) {
        const videoDir = path.dirname(inputPath);
        const videoName = path.basename(inputPath, path.extname(inputPath));
        outputPath = path.join(videoDir, `${videoName}-web.mp4`);
      }

      const resolvedOutputPath: string = outputPath;

      ffmpeg(inputPath)
        .videoCodec("libx264") // H.264 codec for wide compatibility
        .audioCodec("aac") // AAC audio for wide compatibility
        .format("mp4")
        .outputOptions([
          "-preset fast", // Encoding speed
          "-crf 23", // Quality (lower = better, 18-28 is good range)
          "-movflags +faststart", // Enable streaming
        ])
        .output(resolvedOutputPath)
        .on("end", () => {
          console.log(`✅ Converted to web format: ${resolvedOutputPath}`);
          resolve(resolvedOutputPath);
        })
        .on("error", (err) => {
          console.error(`⚠️ Video conversion failed:`, err);
          reject(err);
        })
        .run();
    } catch (err) {
      reject(err);
    }
  });
}
