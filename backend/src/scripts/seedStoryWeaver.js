/**
 * StoryWeaver Library Seeder (Prisma version)
 *
 * Fetches openly-licensed children's stories from StoryWeaver (storyweaver.org.in)
 * and populates the ToggleTail story library in MySQL.
 *
 * All stories are licensed under CC BY 4.0 — free to use with attribution.
 * https://creativecommons.org/licenses/by/4.0/
 *
 * Usage: node src/scripts/seedStoryWeaver.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SW_API = 'https://storyweaver.org.in/api/v1';

// Map our interest categories to StoryWeaver search queries
const CATEGORY_SEARCHES = {
  'Super Heroes':     ['heroes', 'brave', 'courage', 'adventure'],
  'Dragons & Magic':  ['magic', 'wizard', 'fairy', 'enchanted'],
  'Fairy Tales':      ['princess', 'prince', 'kingdom', 'fairy tale'],
  'Mystery & Puzzles':['mystery', 'puzzle', 'detective', 'riddle'],
  'Dinosaurs':        ['dinosaur', 'prehistoric', 'fossil'],
  'Ocean Adventures': ['ocean', 'sea', 'fish', 'underwater', 'whale'],
  'Cute Animals':     ['animals', 'cat', 'dog', 'rabbit', 'bear', 'puppy'],
  'Space & Robots':   ['space', 'robot', 'moon', 'star', 'planet', 'rocket'],
};

function mapLevel(swLevel) {
  const level = parseInt(swLevel, 10);
  if (level <= 1) return 'Beginner';
  if (level <= 2) return 'Intermediate';
  return 'Advanced';
}

function mapAgeBand(swLevel) {
  const level = parseInt(swLevel, 10);
  if (level <= 1) return '4-6';
  if (level <= 2) return '6-8';
  if (level <= 3) return '8-10';
  return '10-12';
}

async function searchStories(query, page = 1, perPage = 10) {
  const url = `${SW_API}/stories-search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&language=English&sort=Most%20Read`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function fetchStoryPages(storyId) {
  try {
    const res = await fetch(`${SW_API}/stories/${storyId}/pages`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || [];
  } catch {
    return null;
  }
}

async function processStory(swStory, category) {
  try {
    // Skip if already imported
    const existing = await prisma.story.findFirst({
      where: { provider: 'StoryWeaver', externalId: swStory.id.toString() },
    });
    if (existing) {
      console.log(`    ○ Skipped  : "${swStory.name}" (already exists)`);
      return null;
    }

    const pages = await fetchStoryPages(swStory.id);
    if (!pages || pages.length === 0) return null;

    const pageTexts = pages.map((p) => (p.content || '').trim()).filter(Boolean);
    if (pageTexts.length === 0) return null;

    const fullText    = pageTexts.join('\n\n');
    const wordCount   = fullText.split(/\s+/).filter(Boolean).length;
    const authors     = (swStory.authors || []).map((a) => a.name).join(', ') || 'Unknown';
    const illustrators= (swStory.illustrators || []).map((i) => i.name).join(', ') || null;
    const coverUrl    = swStory.coverImage?.sizes?.[4]?.url || swStory.coverImage?.sizes?.[0]?.url || null;

    await prisma.story.create({
      data: {
        title:       swStory.name,
        text:        fullText,
        category,
        ageBand:     mapAgeBand(swStory.level),
        readingLevel:mapLevel(swStory.level),
        language:    'en',
        sourceType:  'library',
        provider:    'StoryWeaver',
        externalId:  swStory.id.toString(),
        author:      authors,
        illustrator: illustrators,
        coverUrl,
        attribution: `"${swStory.name}" by ${authors}. From StoryWeaver (storyweaver.org.in). Licensed under CC BY 4.0.`,
        license:     'CC BY 4.0',
        sourceUrl:   `https://storyweaver.org.in/en/stories/${swStory.slug}`,
        wordCount,
        pages: {
          create: pageTexts.map((content, pageIndex) => ({ pageIndex, content })),
        },
      },
    });

    console.log(`    ✓ Added    : "${swStory.name}" (${category})`);
    return true;
  } catch (err) {
    console.error(`    ✗ Error    : "${swStory.name}" — ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('🌱  StoryWeaver Library Seeder\n');

  let totalAdded   = 0;
  let totalSkipped = 0;

  for (const [category, queries] of Object.entries(CATEGORY_SEARCHES)) {
    console.log(`\n📚  Category: ${category}`);
    const seen = new Set();

    for (const query of queries) {
      console.log(`    Searching: "${query}"...`);
      const stories = await searchStories(query, 1, 8);
      if (stories.length === 0) { console.log('    No results'); continue; }

      for (const story of stories) {
        if (seen.has(story.id)) continue;
        const result = await processStory(story, category);
        if (result) { seen.add(story.id); totalAdded++; }
        else totalSkipped++;
        // Be polite to the external API
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    console.log(`    Total for ${category}: ${seen.size} stories added`);
  }

  console.log(`\n✅  Done — added ${totalAdded}, skipped ${totalSkipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
