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
  const { data: mods } = await supabase.from('learning_modules').select('id, school_id, class');
  console.log("Modules:");
  console.log(mods);
  const { data: roles } = await supabase.from('user_roles').select('user_id, role, school_id, class');
  console.log("Roles:");
  console.log(roles);
}
check();
