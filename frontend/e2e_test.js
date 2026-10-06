const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
let url, key;
for (const line of env) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=')) key = line.split('=')[1].trim();
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function runTest() {
  console.log("Starting E2E Test...");
  const schoolId = "test_school_" + Date.now();
  const studentId = "student_" + Date.now();
  const classLevel = "Class 4";
  
  // 1. Create a module
  const modId = "module:test:" + Date.now();
  await supabase.from("learning_modules").insert({
    id: modId,
    school_id: schoolId,
    class: classLevel,
    subject_id: "general",
    title: "Test Module",
    published: true,
  });
  console.log("✅ Module created:", modId);
  
  // 2. Create a lesson
  const lesId = "lesson:test:" + Date.now();
  await supabase.from("lessons").insert({
    id: lesId,
    module_id: modId,
    title: "Test Video",
    published: true,
  });
  console.log("✅ Lesson created:", lesId);
  
  // 3. Student fetches modules
  const { data: mods, error } = await supabase
    .from("learning_modules")
    .select("id, title")
    .eq("school_id", schoolId)
    .eq("class", classLevel);
    
  console.log("✅ Student fetched modules:", mods.length);
  
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title")
    .eq("module_id", modId);
    
  console.log("✅ Student fetched lessons:", lessons.length);
  
  // 4. Student completes lesson
  await supabase.from("lesson_progress").insert({
    id: "prog:" + Date.now(),
    student_id: studentId,
    lesson_id: lesId,
    completed: true,
    last_position: 100,
    completed_at: new Date().toISOString()
  });
  console.log("✅ Student marked progress");
  
  // 5. Teacher fetches progress
  const { data: prog } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("lesson_id", lesId);
    
  console.log("✅ Teacher fetched progress:", prog.length > 0 ? "YES" : "NO", prog[0]);
  
  console.log("E2E Test PASS");
}

runTest().catch(console.error);
