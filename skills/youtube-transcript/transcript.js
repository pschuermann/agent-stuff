#!/usr/bin/env node

import { YoutubeTranscript } from 'youtube-transcript-plus';

const args = process.argv.slice(2);
const showTimestamps = args.includes('--timestamps');
const videoId = args.find(a => !a.startsWith('--'));

if (!videoId) {
  console.error('Usage: transcript.js <video-id-or-url> [--timestamps]');
  console.error('Example: transcript.js EBw7gsDPAYQ');
  console.error('Example: transcript.js https://www.youtube.com/watch?v=EBw7gsDPAYQ');
  console.error('Example: transcript.js EBw7gsDPAYQ --timestamps');
  process.exit(1);
}

// Extract video ID if full URL is provided
let extractedId = videoId;
if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
  const match = videoId.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) {
    extractedId = match[1];
  }
}

try {
  const transcript = await YoutubeTranscript.fetchTranscript(extractedId);
  
  for (const entry of transcript) {
    if (showTimestamps) {
      const timestamp = formatTimestamp(entry.offset / 1000);
      console.log(`[${timestamp}] ${entry.text}`);
    } else {
      console.log(entry.text);
    }
  }
} catch (error) {
  console.error('Error fetching transcript:', error.message);
  process.exit(1);
}

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
