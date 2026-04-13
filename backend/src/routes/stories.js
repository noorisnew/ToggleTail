/**
 * Stories Routes — /api/stories
 * Migrated from Mongoose to Prisma (MySQL).
 *
 * Key differences from the MongoDB version:
 *  - Story pages are stored in the story_pages table (one row per page).
 *  - word_count is computed before every create/update.
 *  - IDs coming in from URL params are parsed to integers.
 *  - Specific routes (library, generate, parent/all) are declared BEFORE /:id
 *    so Express does not accidentally match them as an ID.
 */

const express = require('express');
const OpenAI  = require('openai');
const prisma  = require('../lib/prisma');
const dbState = require('../lib/dbState');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isDbConnected = () => dbState.isConnected;

let openai = null;
const getOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

/** Split story text into pages and compute word count. */
const computeStoryMeta = (text) => {
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const pages     = text.split('\n\n').map((p) => p.trim()).filter(Boolean);
  return { wordCount, pages: pages.length ? pages : [text] };
};

/** Record an anonymous analytics increment (non-critical). */
const recordAnalytics = async (field) => {
  if (!isDbConnected()) return;
  try {
    const date = new Date().toISOString().split('T')[0];
    await prisma.dailyStat.upsert({
      where:  { date },
      create: { date, [field]: 1 },
      update: { [field]: { increment: 1 } },
    });
  } catch {
    // Analytics are non-critical — swallow any error
  }
};

/** Shape a Prisma story row into the response format expected by the frontend. */
const formatStory = (story) => {
  if (!story) return null;
  // Convert the story_pages rows back into a plain pages array
  const pages = story.pages
    ? story.pages
        .sort((a, b) => a.pageIndex - b.pageIndex)
        .map((p) => p.content)
    : undefined;
  // Include _id as a string alias for id so the React Native frontend,
  // which was originally built against MongoDB ObjectIds, works without changes.
  return { ...story, _id: story.id.toString(), pages };
};

// ─── Reading-level / interest configuration ───────────────────────────────────

const READING_LEVELS = {
  Beginner:     { wordCount: 100, pageCount: 4,  vocabulary: 'very simple words, short sentences',       ageRange: '3-5 years old' },
  Intermediate: { wordCount: 300, pageCount: 8,  vocabulary: 'simple vocabulary, medium sentences',      ageRange: '5-7 years old' },
  Advanced:     { wordCount: 500, pageCount: 12, vocabulary: 'richer vocabulary, longer sentences',      ageRange: '7-10 years old' },
};

const INTEREST_THEMES = {
  'Super Heroes':     'superheroes with amazing powers saving the day',
  'Dragons & Magic':  'magical dragons and wizards in enchanted lands',
  'Fairy Tales':      'princesses, knights, and fairy tale adventures',
  'Mystery & Puzzles':'solving mysteries and finding hidden clues',
  'Dinosaurs':        'friendly dinosaurs in prehistoric times',
  'Ocean Adventures': 'underwater adventures with sea creatures',
  'Cute Animals':     'adorable animals and their forest friends',
  'Space & Robots':   'exciting space exploration with robots',
};

// ─── GET /api/stories/library ─────────────────────────────────────────────────
router.get('/library', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      error:   'Database unavailable',
      message: 'Library requires a database connection. Use bundled stories instead.',
      stories: [],
    });
  }

  try {
    const { ageBand, readingLevel, category, limit = 20, offset = 0 } = req.query;

    const where = { sourceType: 'library' };
    if (ageBand)      where.OR = [{ ageBand }, { ageBand: 'all' }];
    if (readingLevel) where.readingLevel = readingLevel;
    if (category)     where.category = category;

    const [stories, total] = await Promise.all([
      prisma.story.findMany({
        where,
        select: { id: true, title: true, category: true, ageBand: true, readingLevel: true, coverUrl: true, wordCount: true, provider: true },
        orderBy: { createdAt: 'desc' },
        skip:  parseInt(offset, 10),
        take:  parseInt(limit,  10),
      }),
      prisma.story.count({ where }),
    ]);

    // Add _id string alias so the frontend (built against MongoDB ObjectIds) works unchanged.
    const storiesWithAlias = stories.map((s) => ({ ...s, _id: s.id.toString() }));

    res.json({
      success: true,
      stories: storiesWithAlias,
      pagination: {
        total,
        limit:   parseInt(limit,  10),
        offset:  parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + stories.length < total,
      },
    });
  } catch (error) {
    console.error('Library fetch error:', error.message);
    res.status(500).json({ error: 'Could not fetch library stories' });
  }
});

// ─── POST /api/stories/generate ──────────────────────────────────────────────
// Declared before /:id so Express does not treat "generate" as an ID.
router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const {
      childName      = 'little reader',
      age            = 5,
      readingLevel   = 'Beginner',
      interests      = [],
      customPrompt   = '',
      title          = '',
      theme          = '',
      mainCharacter  = '',
      specialCharacters = '',
      storyContext   = '',
      storyLength    = 'Medium',
      agentStyle     = 'creative',
      childId        = null,
    } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured', fallback: true });
    }

    const levelConfig  = READING_LEVELS[readingLevel] || READING_LEVELS.Beginner;
    const multipliers  = { Short: 0.6, Medium: 1.0, Long: 1.5 };
    const multiplier   = multipliers[storyLength] || 1.0;
    const targetWords  = Math.round(levelConfig.wordCount * multiplier);
    const targetPages  = Math.max(2, Math.round(levelConfig.pageCount * multiplier));

    const interestParts = interests.map((i) => INTEREST_THEMES[i] || i);
    if (theme && !interestParts.includes(theme)) interestParts.push(theme);
    const themesText = interestParts.filter(Boolean).join(', ') || 'a fun adventure';

    const styleInstructions = {
      creative:    'Use vivid imagination and surprising plot twists.',
      educational: 'Weave in a simple learning concept naturally without being preachy.',
      adventurous: 'Keep the pace exciting — plenty of action and discovery.',
      calming:     'Use gentle, soothing language ideal for winding down at bedtime.',
    };
    const styleInstruction = styleInstructions[agentStyle] || styleInstructions.creative;

    const systemPrompt =
`You are a children's story writer creating engaging, age-appropriate stories.
Write for ${levelConfig.ageRange} children using ${levelConfig.vocabulary}.
The story should be about ${targetWords} words total.
Split the story into exactly ${targetPages} paragraphs (pages), separated by a blank line.
Each paragraph should be 2-4 sentences — short and easy to read aloud.
Include a gentle moral or lesson woven naturally into the story.
${styleInstruction}
Do not add headings, chapter titles, or labels — only the story paragraphs.`;

    const characterLine  = mainCharacter      ? `The main character is: ${mainCharacter}.`                 : '';
    const supportingLine = specialCharacters  ? `Supporting characters include: ${specialCharacters}.`      : '';
    const contextLine    = storyContext       ? `Story setting / context: ${storyContext}.`                  : '';

    const userPrompt = customPrompt ||
`Write a children's story${title ? ` titled "${title}"` : ''} for ${childName}, age ${age}.
Themes: ${themesText}.
${characterLine}
${supportingLine}
${contextLine}
Make it magical, fun, and positive!`.trim();

    const completion = await getOpenAI().chat.completions.create({
      model:      'gpt-4o-mini',
      messages:   [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: Math.max(600, targetWords * 6),
      temperature: 0.8,
    });

    const storyText = completion.choices[0]?.message?.content || '';

    let generatedTitle = title;
    if (!generatedTitle && storyText) {
      const titleCompletion = await getOpenAI().chat.completions.create({
        model:    'gpt-4o-mini',
        messages: [{ role: 'user', content: `Create a short, catchy title (3-5 words) for this children's story:\n\n${storyText.substring(0, 500)}` }],
        max_tokens: 20,
      });
      generatedTitle = titleCompletion.choices[0]?.message?.content?.replace(/"/g, '').trim() || 'A Magical Story';
    }

    const category = interests.length > 0 ? interests[0] : 'General';

    await recordAnalytics('storiesGenerated');

    // Persist to DB if connected (non-fatal if it fails)
    let savedStory = null;
    if (isDbConnected()) {
      try {
        const { wordCount, pages } = computeStoryMeta(storyText);
        savedStory = await prisma.story.create({
          data: {
            title:             generatedTitle,
            text:              storyText,
            category,
            readingLevel,
            sourceType:        'aiGenerated',
            provider:          'openai',
            wordCount,
            createdByParentId: req.parentId || null,
            createdForChildId: childId ? parseInt(childId, 10) : null,
            pages: {
              create: pages.map((content, pageIndex) => ({ pageIndex, content })),
            },
          },
          include: { pages: true },
        });
      } catch (dbErr) {
        console.error('Story DB save failed (non-fatal):', dbErr.message);
        savedStory = null;
      }
    }

    const storyPayload = savedStory
      ? formatStory(savedStory)
      : { title: generatedTitle, text: storyText, readingLevel, generatedFor: childName, themes: interests };

    res.json({ success: true, title: generatedTitle, text: storyText, savedToDb: !!savedStory, story: storyPayload });
  } catch (error) {
    console.error('Story generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate story', message: error.message, fallback: true });
  }
});

// ─── GET /api/stories/parent/all ──────────────────────────────────────────────
// Declared before /:id to avoid the "parent" segment being treated as an ID.
router.get('/parent/all', requireAuth, async (req, res) => {
  try {
    const stories = await prisma.story.findMany({
      where:   { createdByParentId: req.parentId },
      include: { pages: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, stories: stories.map(formatStory) });
  } catch (error) {
    console.error('Get parent stories error:', error.message);
    res.status(500).json({ error: 'Could not fetch stories' });
  }
});

// ─── POST /api/stories/suggest ───────────────────────────────────────────────
// Returns story title suggestions based on child interests.
// Declared before /:id so Express does not treat "suggest" as an ID.
router.post('/suggest', async (req, res) => {
  try {
    const { interests = [], count = 3 } = req.body;

    // If OpenAI is available, generate personalised suggestions.
    if (process.env.OPENAI_API_KEY) {
      const interestText = interests.length > 0 ? interests.join(', ') : 'adventure, animals, magic';

      const completion = await getOpenAI().chat.completions.create({
        model:    'gpt-4o-mini',
        messages: [{
          role:    'user',
          content: `Generate ${count} creative children's story title suggestions based on these interests: ${interestText}.
Return a JSON object with a "suggestions" array. Each item must have "title" (3-5 words), "theme" (matching one interest), and "description" (one sentence).
Example: {"suggestions":[{"title":"The Dragon Who Baked","theme":"Dragons & Magic","description":"A tiny dragon discovers her true talent is baking magical cookies."}]}`,
        }],
        max_tokens:      300,
        temperature:     0.9,
        response_format: { type: 'json_object' },
      });

      try {
        const parsed     = JSON.parse(completion.choices[0]?.message?.content || '{}');
        const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
        if (suggestions.length > 0) {
          return res.json({ suggestions: suggestions.slice(0, count), fallback: false });
        }
      } catch {
        // Fall through to static fallback
      }
    }

    // Static fallback — always works even without OpenAI.
    const FALLBACK = {
      'Super Heroes':     { title: "The Brave Hero's Quest",    theme: 'Super Heroes' },
      'Dragons & Magic':  { title: 'The Friendly Dragon',       theme: 'Dragons & Magic' },
      'Fairy Tales':      { title: 'The Princess and the Star', theme: 'Fairy Tales' },
      'Mystery & Puzzles':{ title: 'The Secret of the Lost Key',theme: 'Mystery & Puzzles' },
      'Dinosaurs':        { title: "Dino's Big Day",            theme: 'Dinosaurs' },
      'Ocean Adventures': { title: 'Under the Sea Adventure',   theme: 'Ocean Adventures' },
      'Cute Animals':     { title: 'The Forest Friends',        theme: 'Cute Animals' },
      'Space & Robots':   { title: "Robot's Space Journey",     theme: 'Space & Robots' },
    };

    const suggestions = interests.length > 0
      ? interests.slice(0, count).map((i) => FALLBACK[i] || { title: 'A Magical Story', theme: i })
      : Object.values(FALLBACK).slice(0, count);

    res.json({ suggestions, fallback: true });
  } catch (error) {
    console.error('Suggest stories error:', error.message);
    res.status(500).json({ suggestions: [], fallback: true });
  }
});

// ─── GET /api/stories/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      error:   'Database unavailable',
      message: 'Story lookup requires a database connection.',
    });
  }

  try {
    const story = await prisma.story.findUnique({
      where:   { id: parseInt(req.params.id, 10) },
      include: { pages: true },
    });

    if (!story) return res.status(404).json({ error: 'Story not found' });

    await recordAnalytics('storiesOpened');

    res.json({ success: true, story: formatStory(story) });
  } catch (error) {
    console.error('Get story error:', error.message);
    res.status(500).json({ error: 'Could not fetch story' });
  }
});

// ─── POST /api/stories ────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, text, category = 'General', readingLevel = 'Beginner', childId } = req.body;

    if (!title || !text) {
      return res.status(400).json({ error: 'Title and text are required' });
    }

    const { wordCount, pages } = computeStoryMeta(text.trim());

    const story = await prisma.story.create({
      data: {
        title:             title.trim(),
        text:              text.trim(),
        category,
        readingLevel,
        sourceType:        'parentCreated',
        provider:          'internal',
        wordCount,
        createdByParentId: req.parentId,
        createdForChildId: childId ? parseInt(childId, 10) : null,
        pages: {
          create: pages.map((content, pageIndex) => ({ pageIndex, content })),
        },
      },
      include: { pages: true },
    });

    res.status(201).json({ success: true, story: formatStory(story) });
  } catch (error) {
    console.error('Create story error:', error.message);
    res.status(500).json({ error: 'Could not create story' });
  }
});

// ─── DELETE /api/stories/:id ──────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const story = await prisma.story.findFirst({
      where: { id: parseInt(req.params.id, 10), createdByParentId: req.parentId },
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found or not authorized' });
    }

    // Cascade deletes story_pages, approvals, narrations, playback_sessions
    await prisma.story.delete({ where: { id: story.id } });

    res.json({ success: true, message: 'Story deleted' });
  } catch (error) {
    console.error('Delete story error:', error.message);
    res.status(500).json({ error: 'Could not delete story' });
  }
});

module.exports = router;
