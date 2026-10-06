const ytdl = require('@distube/ytdl-core');

async function test() {
  const url = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
  try {
    const info = await ytdl.getInfo(url);
    console.log("HLS Manifest:", info.formats.some(f => f.isHLS) || info.player_response.streamingData.hlsManifestUrl);
    
    // Check if we have HLS format
    const hlsUrl = info.player_response.streamingData.hlsManifestUrl;
    if (hlsUrl) {
      console.log("HLS URL FOUND:", hlsUrl);
    } else {
      console.log("No HLS manifest. Getting lowest format...");
      const format = ytdl.chooseFormat(info.formats, { quality: 'lowest' });
      console.log("Lowest format:", format.url);
    }
  } catch (e) {
    console.error(e);
  }
}

test();
