const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
let url, key;
for (const line of env) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=')) key = line.split('=')[1].trim();
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('lessons').select('*').limit(2);
  console.log("Lessons DB Output:");
  console.log(JSON.stringify(data, null, 2));
}

check();
