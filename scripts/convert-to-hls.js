const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputVideo = process.argv[2];

if (!inputVideo) {
  console.error('Usage: node convert-to-hls.js <input-video.mp4>');
  process.exit(1);
}

if (!fs.existsSync(inputVideo)) {
  console.error(`File not found: ${inputVideo}`);
  process.exit(1);
}

const basename = path.basename(inputVideo, path.extname(inputVideo));
const outputDir = path.join(path.dirname(inputVideo), `${basename}_hls`);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Starting HLS conversion for ${inputVideo}...`);
console.log(`Output directory: ${outputDir}`);

// This ffmpeg command creates a master.m3u8 with 360p, 480p, and 720p variants
const ffmpegCmd = `
ffmpeg -i "${inputVideo}" \\
  -filter_complex \\
  "[0:v]split=3[v1][v2][v3]; \\
   [v1]scale=w=640:h=360[v1out]; \\
   [v2]scale=w=854:h=480[v2out]; \\
   [v3]scale=w=1280:h=720[v3out]" \\
  -map "[v1out]" -c:v:0 libx264 -b:v:0 800k -maxrate:v:0 856k -bufsize:v:0 1200k -g 48 -sc_threshold 0 -keyint_min 48 \\
  -map "[v2out]" -c:v:1 libx264 -b:v:1 1400k -maxrate:v:1 1498k -bufsize:v:1 2100k -g 48 -sc_threshold 0 -keyint_min 48 \\
  -map "[v3out]" -c:v:2 libx264 -b:v:2 2800k -maxrate:v:2 2996k -bufsize:v:2 4200k -g 48 -sc_threshold 0 -keyint_min 48 \\
  -map a:0 -c:a:0 aac -b:a:0 96k -ac 2 \\
  -map a:0 -c:a:1 aac -b:a:1 128k -ac 2 \\
  -map a:0 -c:a:2 aac -b:a:2 192k -ac 2 \\
  -f hls \\
  -hls_time 4 \\
  -hls_playlist_type vod \\
  -hls_flags independent_segments \\
  -hls_segment_type mpegts \\
  -hls_segment_filename "${outputDir}/stream_%v_data%03d.ts" \\
  -master_pl_name master.m3u8 \\
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \\
  "${outputDir}/stream_%v.m3u8"
`;

try {
  execSync(ffmpegCmd.trim().replace(/\n/g, ' '), { stdio: 'inherit' });
  console.log(`\nHLS conversion complete!`);
  console.log(`\nNext Steps:`);
  console.log(`1. Upload the entire '${outputDir}' folder to your Supabase storage bucket (e.g., 'learning-videos').`);
  console.log(`2. Get the public URL for 'master.m3u8' from Supabase.`);
  console.log(`3. When creating a lesson in the Teacher Dashboard, select 'Upload Video (MP4 / WebM)' and paste the master.m3u8 URL into the 'Direct Storage Video URL' field.`);
} catch (error) {
  console.error('\nError during HLS conversion:', error.message);
  console.log('Make sure ffmpeg is installed and available in your PATH.');
}
