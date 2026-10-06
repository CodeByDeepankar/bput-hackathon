async function testPiped() {
  const videoId = 'aqz-KE-bpKQ';
  const url = `https://pipedapi.kavin.rocks/streams/${videoId}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("HLS URL:", data.hls);
  } catch(e) {
    console.error(e);
  }
}
testPiped();
