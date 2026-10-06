async function testCobalt() {
  const url = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
  try {
    const res = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url, videoQuality: '360' })
    });
    const data = await res.json();
    console.log(data);
  } catch(e) {
    console.error(e);
  }
}
testCobalt();
