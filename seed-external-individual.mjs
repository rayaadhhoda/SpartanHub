/**
 * seed-external-individual.mjs
 * Run once to seed granular, individual external (non-SJSU) AI use cases into the DB.
 * This is a mockup to show what separated cases look like from a single institution.
 *
 * Usage:
 *   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node seed-external-individual.mjs
 */

import { createClient } from '@supabase/supabase-js';

const BACKEND_URL   = process.env.BACKEND_URL   || 'https://spartanhub-backend.onrender.com';
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  || 'https://tbuqupjlrpsxkysdjlhc.supabase.co';
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidXF1cGpscnBzeGt5c2RqbGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NzAzOTgsImV4cCI6MjA3OTE0NjM5OH0.MD5PALQ2TBImAbhjK5s5gDaZNk7xhwuAPwhowKN1TPs';
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const EXTERNAL_RESOURCES = [
  {
    title: 'AI and Critical Thinking (Columbia University Case Study)',
    description: 'A specific faculty use case by Kirkwood Adams (Lecturer, Undergraduate Writing Program) exploring how generative AI can be integrated into writing curriculum to foster critical thinking skills.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Undergraduate',
    tags: ['external', 'columbia', 'writing', 'critical-thinking'],
    status: 'online',
    url: 'https://ai.ctl.columbia.edu/explore/examples/#ai-and-critical-thinking',
    source: 'Columbia University',
    sourceUrl: 'https://ai.ctl.columbia.edu/explore/examples/',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'AI and the Humanities (Columbia University Case Study)',
    description: 'Faculty use case by Matthew Connelly (Professor of History) showcasing methodologies for utilizing AI tools in historical research and humanities data analysis.',
    type: 'LINK',
    department: 'General',
    subject: 'HIST',
    level: 'Graduate',
    tags: ['external', 'columbia', 'humanities', 'history', 'research'],
    status: 'online',
    url: 'https://ai.ctl.columbia.edu/explore/examples/#ai-and-the-humanities',
    source: 'Columbia University',
    sourceUrl: 'https://ai.ctl.columbia.edu/explore/examples/',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'AI and Language Instruction (Columbia University Case Study)',
    description: 'An example by Nicholas Figueroa (Lecturer of Spanish) demonstrating the use of conversational AI agents to provide students with immersive Spanish language practice.',
    type: 'LINK',
    department: 'World Languages and Literatures',
    subject: 'FORL',
    level: 'Undergraduate',
    tags: ['external', 'columbia', 'language', 'spanish'],
    status: 'online',
    url: 'https://ai.ctl.columbia.edu/explore/examples/#ai-and-language-instruction',
    source: 'Columbia University',
    sourceUrl: 'https://ai.ctl.columbia.edu/explore/examples/',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  }
];

async function seed() {
  console.log(`\n🌱 SpartanHub External Resource Seeder (INDIVIDUAL CASES MOCKUP)`);
  console.log(`   Backend: ${BACKEND_URL}\n`);

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌  Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running.\n');
    process.exit(1);
  }

  // Sign in to get JWT
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('❌  Supabase sign-in failed:', authError?.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log(`   ✅ Signed in as ${ADMIN_EMAIL}`);

  // Fetch existing resources to avoid duplicates
  let existing = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/resources`);
    if (res.ok) existing = await res.json();
    console.log(`   Found ${existing.length} existing resources in DB.`);
  } catch (e) {
    console.warn('   ⚠️  Could not fetch existing resources — will attempt inserts anyway.');
  }

  const existingTitles = new Set(existing.map(r => r.title?.trim().toLowerCase()));

  let added = 0;
  let skipped = 0;

  for (const resource of EXTERNAL_RESOURCES) {
    const titleKey = resource.title.trim().toLowerCase();

    if (existingTitles.has(titleKey)) {
      console.log(`   ⏭  Skipped (already exists): ${resource.title}`);
      skipped++;
      continue;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(resource),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`   ❌ Failed to add "${resource.title}": ${res.status} ${text}`);
      } else {
        const saved = await res.json();
        console.log(`   ✅ Added: ${resource.title} (id: ${saved.id || 'n/a'})`);
        added++;
      }
    } catch (e) {
      console.error(`   ❌ Network error for "${resource.title}":`, e.message);
    }
  }

  console.log(`\n   Done. ${added} added, ${skipped} skipped.\n`);
}

seed();
