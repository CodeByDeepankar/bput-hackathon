const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
let url, key;
for (const line of env) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key); 

async function runTest() {
  console.log("Starting E2E Test...");
  const schoolId = "school:canonical:oav";
  
  // 1. Teacher creates Class 5 Module & Video
  const class5ModId = "module:e2e:c5_" + Date.now();
  const { error: e1 } = await supabase.from("learning_modules").insert({
    id: class5ModId,
    school_id: schoolId,
    class: "Class 5",
    subject_id: "subject:science",
    title: "Class 5 Test Module",
    published: true,
  });
  if (e1) console.log("Insert e1 error:", e1);
  
  const class5LesId = "lesson:e2e:c5_" + Date.now();
  const { error: e2 } = await supabase.from("lessons").insert({
    id: class5LesId,
    module_id: class5ModId,
    title: "Class 5 Test Video",
    published: true,
  });
  if (e2) console.log("Insert e2 error:", e2);

  // 2. Teacher creates Class 4 Module & Video
  const class4ModId = "module:e2e:c4_" + Date.now();
  await supabase.from("learning_modules").insert({
    id: class4ModId,
    school_id: schoolId,
    class: "Class 4",
    subject_id: "subject:science",
    title: "Class 4 Test Module",
    published: true,
  });
  
  const class4LesId = "lesson:e2e:c4_" + Date.now();
  await supabase.from("lessons").insert({
    id: class4LesId,
    module_id: class4ModId,
    title: "Class 4 Test Video",
    published: true,
  });

  // Helper to simulate API query
  async function fetchStudentModules(school, studentClass) {
    const { data: mods } = await supabase
      .from("learning_modules")
      .select("id, title")
      .eq("school_id", school)
      .eq("class", studentClass);
      
    if (!mods || mods.length === 0) return { modules: [] };
    
    const modIds = mods.map(m => m.id);
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, module_id, title")
      .in("module_id", modIds)
      .or("published.eq.true,published.is.null");
      
    const enriched = mods.map(m => {
      m.lessons = (lessons || []).filter(l => l.module_id === m.id);
      return m;
    });
    
    return { modules: enriched };
  }

  // 3. Student A: OAV, Class 5
  console.log("\\n--- Student A (Class 5) ---");
  const resA = await fetchStudentModules(schoolId, "Class 5");
  const seesC5Mod = resA.modules.some(m => m.id === class5ModId);
  const seesC5Les = resA.modules.some(m => m.lessons.some(l => l.id === class5LesId));
  const seesC4Mod = resA.modules.some(m => m.id === class4ModId);
  console.log("Class 5 student sees Class 5 module/video:", seesC5Mod && seesC5Les ? "PASS" : "FAIL");
  console.log("Class 5 student sees Class 4 module:", seesC4Mod ? "FAIL" : "PASS");
  
  // 4. Student B: OAV, Class 4
  console.log("\\n--- Student B (Class 4) ---");
  const resB = await fetchStudentModules(schoolId, "Class 4");
  const seesC4ModB = resB.modules.some(m => m.id === class4ModId);
  const seesC4LesB = resB.modules.some(m => m.lessons.some(l => l.id === class4LesId));
  const seesC5ModB = resB.modules.some(m => m.id === class5ModId);
  console.log("Class 4 student sees Class 4 module/video:", seesC4ModB && seesC4LesB ? "PASS" : "FAIL");
  console.log("Class 4 student sees Class 5 module:", seesC5ModB ? "FAIL" : "PASS");

  // 5. Progress Flow
  console.log("\\n--- Progress Flow ---");
  const studentA_Id = "student_a_" + Date.now();
  const { error: pErr } = await supabase.from("lesson_progress").insert({
    id: "prog:" + Date.now(),
    student_id: studentA_Id,
    lesson_id: class5LesId,
    completed: true,
    last_position: 100
  });
  if (pErr) console.log("Progress insert err:", pErr);
  
  const { data: prog } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("lesson_id", class5LesId);
  console.log("Teacher progress fetch:", prog && prog.length > 0 ? "PASS" : "FAIL");
}

runTest().catch(console.error);
