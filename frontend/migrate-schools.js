const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
let url, key;
for (const line of env) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function migrate() {
  const CANONICAL_OAV_ID = "school:canonical:oav";
  
  console.log("Migrating user_roles...");
  const { data: users, error: uErr } = await supabase.from('user_roles').select('*');
  if (users) {
    for (const u of users) {
      if (['oav', 'OAV', 'default', 'Government High School'].includes(u.school_id)) {
        await supabase.from('user_roles').update({ school_id: CANONICAL_OAV_ID }).eq('user_id', u.user_id);
      }
    }
  }
  
  console.log("Migrating learning_modules...");
  const { data: mods, error: mErr } = await supabase.from('learning_modules').select('*');
  if (mods) {
    for (const m of mods) {
      if (['oav', 'OAV', 'default'].includes(m.school_id)) {
        await supabase.from('learning_modules').update({ school_id: CANONICAL_OAV_ID }).eq('id', m.id);
      }
    }
  }
  
  console.log("Migration complete.");
}
migrate().catch(console.error);
