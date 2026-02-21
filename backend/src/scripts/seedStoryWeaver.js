/**
 * StoryWeaver Library Seeder
 * 
 * Fetches openly-licensed children's stories from StoryWeaver (storyweaver.org.in)
 * and populates the ToggleTail story library.
 * 
 * All stories are licensed under CC BY 4.0 - free to use with attribution.
 * https://creativecommons.org/licenses/by/4.0/
 * 
 * Usage: node src/scripts/seedStoryWeaver.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Story = require('../models/Story');

// StoryWeaver API base URL
const SW_API = 'https://storyweaver.org.in/api/v1';

// Map our app's interest categories to StoryWeaver search queries
const CATEGORY_SEARCHES = {
  'Super Heroes': ['heroes', 'brave', 'courage', 'adventure'],
  'Dragons & Magic': ['magic', 'wizard', 'fairy', 'enchanted'],
  'Fairy Tales': ['princess', 'prince', 'kingdom', 'fairy tale'],
  'Mystery & Puzzles': ['mystery', 'puzzle', 'detective', 'riddle'],
  'Dinosaurs': ['dinosaur', 'prehistoric', 'fossil'],
  'Ocean Adventures': ['ocean', 'sea', 'fish', 'underwater', 'whale'],
  'Cute Animals': ['animals', 'cat', 'dog', 'rabbit', 'bear', 'puppy'],
  'Space & Robots': ['space', 'robot', 'moon', 'star', 'planet', 'rocket'],
};

// Map StoryWeaver levels to our reading levels
function mapLevel(swLevel) {
  const level = parseInt(swLevel);
  if (level <= 1) return 'Beginner';
  if (level <= 2) return 'Intermediate';
  return 'Advanced';
}

// Map StoryWeaver levels to age bands
function mapAgeBand(swLevel) {
  const level = parseInt(swLevel);
  if (level <= 1) return '4-6';
  if (level <= 2) return '6-8';
  if (level <= 3) return '8-10';
  return '10-12';
}

// Fetch stories from StoryWeaver API
async function searchStories(query, page = 1, perPage = 10) {
  const url = `${SW_API}/stories-search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&language=English&sort=Most%20Read`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching stories for "${query}":`, error.message);
    return [];
  }
}

// Fetch story pages/content
async function fetchStoryPages(storyId) {
  const url = `${SW_API}/stories/${storyId}/pages`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error fetching pages for story ${storyId}:`, error.message);
    return null;
  }
}

// Fetch full story details
async function fetchStoryDetails(storyId) {
  const url = `${SW_API}/stories/${storyId}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error(`Error fetching story ${storyId}:`, error.message);
    return null;
  }
}

// Process and save a story
async function processStory(swStory, category) {
  try {
    // Check if story already exists
    const existing = await Story.findOne({ 
      provider: 'StoryWeaver',
      externalId: swStory.id.toString()
    });
    
    if (existing) {
      console.log(`  Skipping "${swStory.name}" - already in library`);
      return null;
    }

    // Fetch story pages for content
    const pages = await fetchStoryPages(swStory.id);
    if (!pages || pages.length === 0) {
      console.log(`  Skipping "${swStory.name}" - no pages available`);
      return null;
    }

    // Extract text content from pages
    const pageTexts = pages
      .filter(p => p.content && p.content.trim())
      .map(p => p.content.trim());

    if (pageTexts.length === 0) {
      console.log(`  Skipping "${swStory.name}" - no text content`);
      return null;
    }

    // Get author names
    const authors = (swStory.authors || []).map(a => a.name).join(', ') || 'Unknown';
    const illustrators = (swStory.illustrators || []).map(i => i.name).join(', ');

    // Create story document
    const story = new Story({
      title: swStory.name,
      text: pageTexts.join('\n\n'),
      pages: pageTexts,
      category: category,
      ageBand: mapAgeBand(swStory.level),
      readingLevel: mapLevel(swStory.level),
      language: 'en',
      sourceType: 'library',
      provider: 'StoryWeaver',
      externalId: swStory.id.toString(),
      author: authors,
      illustrator: illustrators || undefined,
      coverImageUrl: swStory.coverImage?.sizes?.[4]?.url || swStory.coverImage?.sizes?.[0]?.url,
      attribution: `"${swStory.name}" by ${authors}. From StoryWeaver (storyweaver.org.in). Licensed under CC BY 4.0.`,
      license: 'CC BY 4.0',
      sourceUrl: `https://storyweaver.org.in/en/stories/${swStory.slug}`,
    });

    await story.save();
    console.log(`  ✓ Added "${swStory.name}" (${category})`);
    return story;
  } catch (error) {
    console.error(`  Error processing "${swStory.name}":`, error.message);
    return null;
  }
}

// Main seeding function
async function seedStories() {
  console.log('🌱 StoryWeaver Library Seeder\n');
  console.log('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }

  let totalAdded = 0;
  let totalSkipped = 0;

  // Process each category
  for (const [category, queries] of Object.entries(CATEGORY_SEARCHES)) {
    console.log(`\n📚 Category: ${category}`);
    console.log('─'.repeat(40));

    const addedForCategory = new Set();

    for (const query of queries) {
      console.log(`  Searching: "${query}"...`);
      
      // Fetch stories for this query
      const stories = await searchStories(query, 1, 8);
      
      if (stories.length === 0) {
        console.log(`    No stories found`);
        continue;
      }

      // Process each story
      for (const story of stories) {
        // Skip if we already added this story for this category
        if (addedForCategory.has(story.id)) continue;
        
        const result = await processStory(story, category);
        if (result) {
          addedForCategory.add(story.id);
          totalAdded++;
        } else {
          totalSkipped++;
        }

        // Rate limiting - be nice to the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`  Added ${addedForCategory.size} stories for ${category}`);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SEEDING COMPLETE');
  console.log('═'.repeat(50));
  console.log(`✓ Stories added: ${totalAdded}`);
  console.log(`○ Stories skipped: ${totalSkipped}`);
  
  // Show library stats
  const stats = await Story.aggregate([
    { $match: { sourceType: 'library', provider: 'StoryWeaver' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log('\n📖 Library by Category:');
  for (const stat of stats) {
    console.log(`   ${stat._id}: ${stat.count} stories`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

// Run the seeder
seedStories().catch(console.error);
