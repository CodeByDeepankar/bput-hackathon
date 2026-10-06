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
  const { data, error: lErr } = await supabase
    .from("lessons")
    .select("id, module_id, title, description, video_path, video_url, video_type, duration, order_index, is_required, published, created_at")
    .limit(1);
    
  console.log("Primary Query Error:", lErr);
  
  if (lErr && (lErr.code === "42703" || lErr.message?.includes("video_type"))) {
    console.log("Fallback triggered");
    const fb = await supabase
        .from("lessons")
        .select("id, module_id, title, description, video_path, video_url, duration, order_index, is_required, published, created_at")
        .limit(1);
    console.log("Fallback result:", fb.data);
  }
}

check();
