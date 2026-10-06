async function testInvidious() {
  const videoId = 'aqz-KE-bpKQ';
  // using a public invidious instance
  const url = `https://invidious.jing.rocks/api/v1/videos/${videoId}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(data.hlsUrl);
    console.log(data.formatStreams?.map(f => f.resolution));
  } catch(e) {
    console.error(e);
  }
}
testInvidious();
