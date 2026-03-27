/**
 * seed-external.mjs
 * Run once to seed external (non-SJSU) AI use case resources into the DB.
 *
 * Usage:
 *   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node seed-external.mjs
 *
 * Or set them in a .env file and use: npx dotenv-cli node seed-external.mjs
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
    title: 'AI in Education: 39 Examples — University of San Diego',
    description: 'A curated overview of 39 real-world applications of AI in education, covering personalized learning, automated administrative tasks, improved accessibility, and more. Published by USD\'s online degree program.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Faculty/Admin',
    tags: ['external', 'ai-in-education', 'teaching', 'use-cases'],
    status: 'online',
    url: 'https://onlinedegrees.sandiego.edu/artificial-intelligence-education/',
    source: 'University of San Diego',
    sourceUrl: 'https://onlinedegrees.sandiego.edu/artificial-intelligence-education/',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'Faculty AI Use Cases — Texas A&M University',
    description: 'A list of faculty-submitted AI use cases from Texas A&M, showcasing how instructors across disciplines are integrating AI tools into their teaching and research workflows.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Faculty/Admin',
    tags: ['external', 'faculty', 'ai-use-cases', 'teaching'],
    status: 'online',
    url: 'https://ai.tamu.edu/teach-with-ai/list-of-faculty-ai-use-cases.html',
    source: 'Texas A&M University',
    sourceUrl: 'https://ai.tamu.edu/teach-with-ai/list-of-faculty-ai-use-cases.html',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'AI Meets Education Library — Stanford University',
    description: 'A repository by Stanford Digital Education detailing how Stanford instructors are adapting their pedagogy, assignments, and assessments for the era of generative AI.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Faculty/Admin',
    tags: ['external', 'pedagogy', 'assessment'],
    status: 'online',
    url: 'https://digitaleducation.stanford.edu/ai-meets-education-stanford',
    source: 'Stanford University',
    sourceUrl: 'https://digitaleducation.stanford.edu/ai-meets-education-stanford',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'AI in Teaching Collection — MIT',
    description: 'A vast collection of resources and case studies collected by MIT\'s teaching lab highlighting innovative applications of artificial intelligence across various MIT disciplines.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Faculty/Admin',
    tags: ['external', 'STEM', 'innovation'],
    status: 'online',
    url: 'https://teaching.mit.edu/resource-type/artificial-intelligence',
    source: 'MIT',
    sourceUrl: 'https://teaching.mit.edu/resource-type/artificial-intelligence',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'The AI Pedagogy Project — Harvard University',
    description: 'Developed by the metaLAB at Harvard, this is an interactive collection of hands-on assignments and teaching strategies designed to help educators thoughtfully integrate AI.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Faculty/Admin',
    tags: ['external', 'hands-on', 'assignments', 'humanities'],
    status: 'online',
    url: 'https://aipedagogyproject.org/',
    source: 'Harvard University',
    sourceUrl: 'https://aipedagogyproject.org/',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'Faculty AI Use Case Library — UNC Charlotte',
    description: 'Crowdsourced examples from UNC Charlotte faculty demonstrating specific, actionable ways they have incorporated AI securely into their curriculum and administrative tasks.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Faculty/Admin',
    tags: ['external', 'administrative', 'curriculum-design'],
    status: 'online',
    url: 'https://teaching.charlotte.edu/ai-teaching-and-learning/charlotte-faculty-ai-use-case-library',
    source: 'UNC Charlotte',
    sourceUrl: 'https://teaching.charlotte.edu/ai-teaching-and-learning/charlotte-faculty-ai-use-case-library',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  },
  {
    title: 'AI Chatbots and Student Learning Guide — Vanderbilt University',
    description: 'A comprehensive guide from Vanderbilt\'s Center for Teaching covering the capabilities, ethical implications, and practical pedagogical applications of AI chatbots.',
    type: 'LINK',
    department: 'General',
    subject: 'EDUC',
    level: 'Faculty/Admin',
    tags: ['external', 'chatbots', 'ethics', 'guide'],
    status: 'online',
    url: 'https://cft.vanderbilt.edu/guides-sub-pages/ai-chatbots-and-student-learning/',
    source: 'Vanderbilt University',
    sourceUrl: 'https://cft.vanderbilt.edu/guides-sub-pages/ai-chatbots-and-student-learning/',
    dateAdded: TODAY,
    views: 0,
    downloads: 0,
  }
];

async function seed() {
  console.log(`\n🌱 SpartanHub External Resource Seeder`);
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

