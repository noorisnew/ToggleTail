/**
 * ToggleTail Database Seeder (Prisma / MySQL)
 *
 * Populates the database with:
 *   1. Default feature flags
 *   2. The built-in story library (original ToggleTail stories)
 *
 * Usage:
 *   npm run db:seed        (from the backend/ directory)
 *   node prisma/seed.js    (direct)
 *
 * Safe to re-run — uses upsert so it won't duplicate existing records.
 */

require('dotenv').config();
const path = require('path');
// Load .env from one level up (backend/.env)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Split story text into pages and compute word count. */
function computeMeta(text) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const pages     = text.split('\n\n').map((p) => p.trim()).filter(Boolean);
  return { wordCount, pages: pages.length ? pages : [text] };
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

const FEATURE_FLAGS = [
  { name: 'aiStoriesEnabled',   enabled: true,  description: 'Enable AI story generation via OpenAI' },
  { name: 'ttsEnabled',         enabled: true,  description: 'Enable ElevenLabs text-to-speech narration' },
  { name: 'offlineModeEnabled', enabled: true,  description: 'Enable offline fallback to bundled story library' },
];

// ─── Library Stories ──────────────────────────────────────────────────────────

const LIBRARY_STORIES = [
  // ── CUTE ANIMALS ──────────────────────────────────────────────────────────
  {
    title: 'Benny the Brave Bunny',
    text: `Benny was a small brown bunny who lived in a cozy burrow under the old oak tree.\n\nOne sunny morning, Benny hopped out to find breakfast. He spotted the most beautiful orange carrot in Farmer Green's garden!\n\n"I'm too small to get that big carrot," Benny said sadly. But then he had an idea!\n\nBenny found his friends - Squeaky the mouse and Chirpy the sparrow. Together, they worked as a team.\n\nSqueaky dug around the carrot. Chirpy pulled from above. And Benny tugged with all his might!\n\nPOP! Out came the carrot! It was the biggest, most delicious carrot they had ever seen.\n\nBenny smiled and said, "Let's share it!" And so they did, because good friends share everything.\n\nThe end.`,
    category: 'Cute Animals', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: 'Whiskers and the Yarn Ball',
    text: `Whiskers was a fluffy gray kitten with the softest paws in the whole neighborhood.\n\nOne rainy day, Whiskers found a big red ball of yarn in the living room.\n\n"What fun!" said Whiskers, and she batted the ball with her paw.\n\nThe yarn rolled across the floor. Whiskers chased it under the table!\n\nIt bounced off a chair leg. Whiskers pounced after it!\n\nRound and round she went, until... oh no! Whiskers was all tangled up!\n\n"Meow!" she cried. Her friend, the old dog Bruno, came to help.\n\nBruno gently pulled the yarn away, bit by bit, until Whiskers was free.\n\n"Thank you, Bruno!" purred Whiskers happily.\n\nFrom that day on, Whiskers only played with yarn when Bruno was watching.\n\nThe end.`,
    category: 'Cute Animals', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: "The Little Bear's First Snow",
    text: `Little Bear woke up one winter morning to find the world had turned white!\n\n"Mama! Mama! What happened?" asked Little Bear, pressing his nose against the window.\n\n"That's snow, dear," said Mama Bear with a warm smile. "Would you like to play in it?"\n\nLittle Bear had never seen snow before. He put on his red scarf and ran outside.\n\nCRUNCH! CRUNCH! His paws made funny sounds in the snow.\n\nHe stuck out his tongue and caught a snowflake. It was cold and tickly!\n\nLittle Bear made a snow angel, then rolled a big snowball.\n\nSoon his friends Rabbit and Fox came to play. They built a snowman together!\n\nWhen Little Bear got cold, he went inside for hot cocoa with Mama.\n\n"Snow is wonderful," yawned Little Bear, falling asleep by the warm fire.\n\nThe end.`,
    category: 'Cute Animals', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: "Dotty the Dalmatian's Spots",
    text: `Dotty was a dalmatian puppy with exactly one hundred spots.\n\nShe loved to count them every morning. One, two, three... all the way to one hundred!\n\nOne day at the park, Dotty met Patches the cow. Patches had big black patches all over.\n\n"Your spots are so small and round!" said Patches.\n\nThen Dotty met Stripes the zebra. He had lines going all over his body!\n\n"Your spots are all different from my stripes!" said Stripes.\n\nDotty felt confused. Were spots better than patches? Were stripes better than spots?\n\nHer mom licked her head gently. "Everyone is special in their own way," she said.\n\n"Patches make Patches special. Stripes make Stripes special. And your beautiful spots make you special!"\n\nDotty wagged her tail happily. She loved being exactly who she was!\n\nThe end.`,
    category: 'Cute Animals', ageBand: '4-6', readingLevel: 'Beginner',
  },

  // ── SUPER HEROES ──────────────────────────────────────────────────────────
  {
    title: 'Captain Kindness',
    text: `Maya was an ordinary girl who discovered something extraordinary - the power of kindness!\n\nEvery time Maya did something kind, her heart glowed with a golden light.\n\nWhen she helped an old man carry his groceries, she could run super fast!\n\nWhen she shared her lunch with a hungry friend, she grew super strong!\n\nWhen she stood up for a kid being bullied, she could even fly!\n\nThe town's grumpy mayor, Mr. Crumble, tried to make everyone mean.\n\n"Kindness makes you weak!" he shouted. But Maya knew better.\n\nShe flew to the town square and did the kindest thing of all - she gave Mr. Crumble a hug.\n\nHis grumpy heart melted. Tears fell from his eyes. "I forgot how good kindness feels," he whispered.\n\nFrom that day on, Captain Kindness and the whole town spread kindness everywhere!\n\nThe end.`,
    category: 'Super Heroes', ageBand: '6-8', readingLevel: 'Intermediate',
  },
  {
    title: 'The Tiny Hero',
    text: `Leo was the smallest kid in his class. He wished he could be big and strong like a superhero.\n\nOne night, a shooting star landed in his backyard. Inside was a tiny golden cape!\n\nWhen Leo put on the cape, something amazing happened. He stayed small, but now he could shrink even smaller!\n\n"What kind of power is this?" Leo wondered.\n\nThe next day, a kitten got stuck inside a drainpipe at school. Everyone tried to help, but no one could reach it.\n\nLeo knew what to do. He shrank down tiny and crawled into the pipe!\n\nHe found the scared kitten and gently guided it out to safety.\n\nEveryone cheered! "You're a hero!" they shouted.\n\nLeo learned that heroes come in all sizes. Sometimes being small is the biggest superpower of all!\n\nThe end.`,
    category: 'Super Heroes', ageBand: '6-8', readingLevel: 'Intermediate',
  },
  {
    title: 'The Homework Hero',
    text: `Zara had a secret identity. By day, she was a regular fourth grader. By night, she was... The Homework Hero!\n\nHer superpower? She could make any subject fun and easy to understand!\n\nWhen her friend Tom struggled with math, Zara showed him how to turn fractions into pizza slices.\n\n"I get it now!" Tom exclaimed. Math wasn't scary anymore!\n\nWhen her little brother couldn't read his book, Zara made silly voices for each character.\n\nSoon he was reading all by himself, giggling at every page.\n\nThe evil villain Boredom tried to make kids hate learning. He zapped classrooms with his Snooze Ray!\n\nBut The Homework Hero fought back with games, songs, and stories that made learning an adventure.\n\n"Learning is the greatest superpower," Zara told everyone. "Because knowledge can change the world!"\n\nThe end.`,
    category: 'Super Heroes', ageBand: '6-8', readingLevel: 'Intermediate',
  },

  // ── DRAGONS & MAGIC ────────────────────────────────────────────────────────
  {
    title: "The Dragon Who Couldn't Breathe Fire",
    text: `Ember was a young dragon who had a big problem. No matter how hard she tried, she couldn't breathe fire!\n\nAll the other dragons could breathe big, beautiful flames. But when Ember tried, only bubbles came out!\n\n"You're not a real dragon," the other dragons teased.\n\nEmber flew away to the Misty Mountains, feeling sad and alone.\n\nThere, she met an old, wise dragon named Ash. "What can you do?" Ash asked.\n\n"Only bubbles," Ember sighed, blowing a stream of shimmering bubbles.\n\n"Show me," said Ash. Ember blew bubbles that sparkled in every color of the rainbow!\n\nOne day, a forest fire threatened the village below. The fire-breathing dragons couldn't put it out!\n\nBut Ember's magical bubbles floated down and burst into rain, saving everyone!\n\n"Three cheers for Ember!" everyone shouted. She learned that being different can be wonderful.\n\nThe end.`,
    category: 'Dragons & Magic', ageBand: '6-8', readingLevel: 'Intermediate',
  },
  {
    title: 'The Magic Paintbrush',
    text: `Young Lily found an old paintbrush in her grandmother's attic. It glowed with a soft purple light!\n\nWhenever Lily painted something with it, her painting came to life!\n\nShe painted a butterfly - and it flew off the paper, fluttering around her room!\n\nShe painted a delicious cupcake - and she could actually eat it! It tasted like chocolate!\n\nLily got excited. She painted a huge castle with towers and flags.\n\nWHOOSH! Suddenly she was standing inside a real castle. "Wow!" she gasped.\n\nBut then Lily felt lonely in the empty castle. She painted her family and friends.\n\nPOP! POP! POP! They all appeared, smiling and waving!\n\n"The best magic," Lily realized, "is sharing wonderful things with people you love."\n\nShe painted them all flying home on a rainbow, laughing all the way.\n\nThe end.`,
    category: 'Dragons & Magic', ageBand: '6-8', readingLevel: 'Intermediate',
  },
  {
    title: "The Wizard's Messy Room",
    text: `Wizard Wimbly had a problem. His magic room was SO messy!\n\nSpell books everywhere! Potion bottles stacked in wobbly towers! And his wand? Completely lost!\n\n"I'll just use magic to clean it!" said Wimbly. But where was his wand?\n\nHe tried to remember a cleaning spell. "CLEANICUS ROOMICUS!" he shouted.\n\nNothing happened. He forgot you need a wand for that spell!\n\nSo Wizard Wimbly did something he hadn't done in years. He cleaned by hand!\n\nHe picked up each book. He organized each potion. He swept the dusty floors.\n\nUnder a pile of socks, he finally found his wand!\n\n"I did it!" cheered Wimbly. His room sparkled and shined.\n\nHe learned that sometimes the best magic is simply doing things yourself.\n\nThe end.`,
    category: 'Dragons & Magic', ageBand: '4-6', readingLevel: 'Beginner',
  },

  // ── FAIRY TALES ────────────────────────────────────────────────────────────
  {
    title: 'The Princess Who Said Please',
    text: `Princess Penny lived in a beautiful golden castle. She had fancy dresses and sparkling jewels.\n\nBut Princess Penny had something even more special - magical manners!\n\nEvery time she said "Please," flowers bloomed around her.\n\nEvery time she said "Thank you," birds sang sweet songs.\n\nAnd every time she was kind to someone, her crown glowed bright!\n\nOne day, a grumpy giant came to the kingdom. "Give me all your gold!" he roared.\n\nThe king and queen were scared. But Princess Penny walked right up to the giant.\n\n"Please, Mr. Giant, why are you so sad?" she asked kindly.\n\nThe giant began to cry. "No one is ever nice to me," he sobbed.\n\nPrincess Penny hugged his big toe. "Would you like to be my friend?"\n\nThe giant smiled for the first time in years. Penny's kindness had saved the kingdom!\n\nThe end.`,
    category: 'Fairy Tales', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: 'The Brave Little Knight',
    text: `Sir Oliver was the smallest knight in the kingdom. His armor was too big. His shield was too heavy.\n\n"You're too little to be a knight," laughed the other knights.\n\nBut Sir Oliver had the bravest heart in all the land!\n\nOne day, the kingdom's kitten climbed up the tallest tower and couldn't get down.\n\nThe big knights tried to climb up, but they were too heavy! The tower shook and wobbled.\n\n"I'll do it!" said Sir Oliver. He was light enough to climb all the way up!\n\nAt the top, the scared kitten meowed. Sir Oliver gently picked her up.\n\nHe climbed down carefully, one step at a time, with the kitten safe in his arms.\n\nThe king gave Sir Oliver a medal. "True bravery isn't about being big," said the king.\n\n"It's about having a big heart!" And Sir Oliver's heart was the biggest of all.\n\nThe end.`,
    category: 'Fairy Tales', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: 'The Enchanted Garden',
    text: `Once upon a time, there was a garden that nobody could find. It was hidden behind a secret door.\n\nA curious girl named Rose discovered the door one day, covered in vines and flowers.\n\nWhen she stepped through, she gasped! The garden was filled with talking flowers!\n\n"Welcome, Rose!" said a cheerful sunflower. "We've been waiting for someone kind to find us."\n\nA shy violet whispered, "Will you be our friend?"\n\nRose spent the whole day in the garden. The daisies told jokes. The roses sang songs.\n\nBut as the sun set, Rose knew she had to go home.\n\n"Will you come back?" the flowers asked sadly.\n\n"I promise," said Rose. "A good friend always keeps her promises."\n\nAnd she did come back, every single day, bringing water and sunshine and love.\n\nThe garden grew more beautiful than ever, all because of one kind girl named Rose.\n\nThe end.`,
    category: 'Fairy Tales', ageBand: '6-8', readingLevel: 'Intermediate',
  },

  // ── DINOSAURS ──────────────────────────────────────────────────────────────
  {
    title: "Tiny Rex's Big Day",
    text: `Tiny Rex was the smallest T-Rex in the whole dinosaur valley.\n\nHis arms were too short to reach things. His legs were stubby. And his roar? More like a squeak!\n\n"I wish I was big like the others," Tiny Rex sighed.\n\nOne day, a baby Triceratops fell into a narrow canyon. "Help!" she cried.\n\nThe big dinosaurs tried to help, but they were too large to fit through the rocks!\n\n"I can do it!" said Tiny Rex. He squeezed through the narrow opening.\n\nHe found the scared baby and gently guided her back out to safety.\n\n"You saved me!" the baby Triceratops cheered.\n\nAll the dinosaurs stomped their feet in celebration. BOOM! BOOM! BOOM!\n\n"Being small isn't so bad," Tiny Rex realized. "I can do things no one else can!"\n\nHe held his tiny head high and let out his mightiest squeak.\n\nThe end.`,
    category: 'Dinosaurs', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: 'The Dinosaur School Bus',
    text: `Every morning in Dino Valley, a big yellow Brachiosaurus named Bumper gave rides to school.\n\nSmall dinosaurs would climb on his long neck and slide down to his back!\n\nStella the Stegosaurus sat in front. Her plates made a great shade from the sun!\n\nTerry the Pterodactyl flew alongside, making sure no one fell off.\n\nAnd little Vicky the Velociraptor always sat in the very back, because she liked the bumpy ride!\n\nOne rainy day, the path to school was flooded. "Oh no!" everyone cried.\n\nBut Bumper was so tall, he could wade right through the water!\n\n"Hang on tight!" he called. All the little dinos cheered as they splashed through.\n\nThey arrived at school safe and sound, a little wet but very happy.\n\n"Thanks, Bumper!" everyone shouted. He was the best school bus in the world!\n\nThe end.`,
    category: 'Dinosaurs', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: 'The Egg Mystery',
    text: `Professor Diplodocus found a mysterious egg in the valley. It was blue with purple spots!\n\n"What kind of dinosaur is this?" he wondered. No one had ever seen an egg like it.\n\nAll the dinosaurs gathered around to guess.\n\n"It's a T-Rex egg!" said Tommy T-Rex. But the egg was way too small.\n\n"It's a Triceratops egg!" said Trina Triceratops. But the color was all wrong.\n\nDays passed. Everyone waited to see what would hatch.\n\nCRACK! CRACK! CRACK! The egg began to break!\n\nOut popped... a tiny purple dinosaur that no one had ever seen before!\n\n"What are you?" asked Professor Diplodocus gently.\n\nThe baby dinosaur smiled. "I'm ME!" it chirped happily.\n\nEveryone laughed and cheered. They named the new friend Puzzle, because some mysteries are wonderful just the way they are!\n\nThe end.`,
    category: 'Dinosaurs', ageBand: '6-8', readingLevel: 'Intermediate',
  },

  // ── OCEAN ADVENTURES ───────────────────────────────────────────────────────
  {
    title: 'Sammy the Shy Seahorse',
    text: `Sammy was a little seahorse who was very, very shy.\n\nWhenever other fish swam by, he would hide in the coral.\n\n"Come play with us!" called the friendly clownfish. But Sammy was too scared.\n\nOne day, a tiny baby fish got lost in the big ocean. She was crying little bubble tears.\n\nAll the big fish swam past, too busy to notice.\n\nBut Sammy saw her. He floated over slowly.\n\n"Don't be scared," Sammy whispered. "I'll help you find your family."\n\nHe led the baby fish through the coral, showing her all the colorful sights.\n\nWhen they found her family, they were so happy! "Thank you, brave seahorse!"\n\nSammy realized something important. He wasn't shy - he was gentle. And gentle is wonderful!\n\nFrom that day on, Sammy had lots of friends who loved his quiet, kind ways.\n\nThe end.`,
    category: 'Ocean Adventures', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: "The Whale's Wonderful Song",
    text: `Deep in the blue ocean lived a young whale named Walter.\n\nWalter loved to sing! His songs traveled for miles through the water.\n\nBut the other ocean animals would swim away when he started singing.\n\n"Your songs are too loud!" said the dolphins.\n\n"Your songs make bubbles everywhere!" complained the crabs.\n\nWalter felt sad. He stopped singing altogether.\n\nThe ocean became quiet. Too quiet! Fish forgot which way to swim. Jellyfish bumped into rocks.\n\nEveryone realized something was missing. They missed Walter's songs!\n\n"Please sing again!" they asked. "Your songs help us know where we are!"\n\nWalter smiled a big whale smile and began to sing the most beautiful song ever.\n\nAll the creatures of the ocean danced and swirled to his wonderful music.\n\n"Your voice is special," they told him. "Never stop being you!"\n\nThe end.`,
    category: 'Ocean Adventures', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: "Pearl's Treasure Hunt",
    text: `Pearl was an adventurous young octopus with eight curious arms.\n\nOne day, she found an old map tucked inside a sunken bottle.\n\n"X marks the spot!" Pearl read. "There's treasure in the Kelp Forest!"\n\nPearl set off on her adventure. She swam through sparkly caves and over sandy hills.\n\nIn the Kelp Forest, she met a grumpy old crab guarding a treasure chest.\n\n"This is MY treasure!" the crab snapped.\n\n"What's inside?" Pearl asked kindly.\n\nThe crab looked sad. "I don't know. I can't open it. My claws are too big!"\n\nPearl used her clever arms to open the rusty lock. CLICK!\n\nInside was... a beautiful painting of the ocean! And a note that said: "The real treasure is friendship."\n\nPearl and the crab looked at each other and smiled. They hung the painting in Mr. Crab's home and had tea together every day after that.\n\nThe end.`,
    category: 'Ocean Adventures', ageBand: '6-8', readingLevel: 'Intermediate',
  },

  // ── MYSTERY & PUZZLES ──────────────────────────────────────────────────────
  {
    title: 'The Case of the Missing Cookie',
    text: `Detective Daisy was only seven years old, but she was the best detective on Maple Street!\n\nOne afternoon, her brother Danny came crying. "Someone ate my cookie!"\n\nDaisy grabbed her magnifying glass. "Don't worry! I'm on the case!"\n\nShe looked for clues. First, she found crumbs leading to the kitchen.\n\nThen she found chocolate smudges on the refrigerator handle.\n\nFinally, she found a suspicious brown pawprint on the floor!\n\nDaisy followed the pawprints to... Biscuit the dog's bed!\n\nThere was Biscuit, licking chocolate off his whiskers, looking very guilty.\n\n"Case closed!" announced Daisy. "The cookie thief is Biscuit!"\n\nEveryone laughed, even Danny. Mom gave Danny a new cookie.\n\nAnd Biscuit got a tummy rub and a promise to keep cookies up high from now on!\n\nThe end.`,
    category: 'Mystery & Puzzles', ageBand: '6-8', readingLevel: 'Intermediate',
  },
  {
    title: 'The Riddle of Rainbow Bridge',
    text: `To cross Rainbow Bridge, you had to solve a riddle.\n\nA clever troll named Trenton lived under the bridge. He loved riddles more than anything!\n\nOne day, three friends arrived: Maya, Leo, and tiny Pip.\n\n"Answer my riddle and you may cross!" Trenton said with a grin.\n\n"I have hands but cannot clap. I have a face but cannot smile. What am I?"\n\nMaya thought hard. "A clock!" she shouted.\n\n"Correct!" laughed Trenton. "But wait - here's a harder one!"\n\n"I get wetter the more I dry. What am I?"\n\nLeo scratched his head. Then he snapped his fingers. "A towel!"\n\n"Amazing!" Trenton cheered. "One last riddle!"\n\n"What belongs to you but others use it more than you do?"\n\nThey all thought and thought. Finally, tiny Pip spoke up: "Your name!"\n\nTrenton did a happy dance. "You three are the cleverest friends I've ever met!"\n\nHe invited them for tea under the bridge, and they stayed friends forever.\n\nThe end.`,
    category: 'Mystery & Puzzles', ageBand: '8-10', readingLevel: 'Advanced',
  },
  {
    title: "Where's Whiskers?",
    text: `Grandma's cat Whiskers was missing! Mia and Max needed to find him.\n\nThey searched the living room. Under the couch? No Whiskers!\n\nThey checked the kitchen. Behind the fridge? No Whiskers!\n\nThey looked in the laundry basket. In the warm towels? No Whiskers!\n\nMia noticed something fuzzy sticking out from the closet.\n\nThey peeked inside and found... Grandma's fur coat! But no Whiskers.\n\nMax heard a soft sound. "Meow..." Where was it coming from?\n\nThey listened carefully. It came from UP HIGH!\n\nThey looked at the tall bookshelf. There, on the very top, sat Whiskers!\n\n"How did you get up there?" they giggled.\n\nGrandpa got the ladder and helped Whiskers down safely.\n\n"Sometimes," Mia said, "you have to look up to find what you're looking for!"\n\nThe end.`,
    category: 'Mystery & Puzzles', ageBand: '4-6', readingLevel: 'Beginner',
  },

  // ── SPACE & ROBOTS ─────────────────────────────────────────────────────────
  {
    title: 'Beep the Friendly Robot',
    text: `Beep was a small robot with a big heart. Well, a big battery, but it felt like a heart!\n\nEvery morning, Beep beeped happily: "BEEP BEEP! Good morning!"\n\nBeep helped everyone in the house. He made toast. He found lost socks. He never forgot anything!\n\nBut sometimes Beep felt different from the humans he loved.\n\n"I don't have a nose to smell flowers," Beep said sadly. "Or fingers that feel soft things."\n\nLittle Emma gave Beep a big hug. "But Beep, you have something special!"\n\n"What's that?" Beep asked, his lights blinking with curiosity.\n\n"You always know when someone needs a friend. That's better than any sensor!"\n\nBeep's screen showed a happy smile. "BEEP BEEP! I love being me!"\n\nFrom that day on, Beep knew that what made him different also made him wonderful.\n\nThe end.`,
    category: 'Space & Robots', ageBand: '4-6', readingLevel: 'Beginner',
  },
  {
    title: "Luna's Trip to the Moon",
    text: `Luna had always dreamed of visiting the moon. It was named after her, after all!\n\nOn her eighth birthday, she drew a rocket ship with silver crayons.\n\nThat night, something magical happened. Her drawing started to GLOW!\n\nThe rocket floated off the paper and grew to full size! "All aboard!" said a friendly voice.\n\nLuna climbed in and WHOOOOSH! Off she went into space!\n\nShe passed twinkling stars and colorful planets. Everything was so beautiful!\n\nShe landed softly on the moon. The ground was dusty and gray, but it sparkled in the sunlight!\n\nLuna took a moon rock to bring home. It was light as a feather!\n\nAs she flew back to Earth, she waved goodbye to the stars.\n\nShe woke up in her bed, but guess what was under her pillow?\n\nA real moon rock, gray and sparkly, with a note: "Dream big, Luna!"\n\nThe end.`,
    category: 'Space & Robots', ageBand: '6-8', readingLevel: 'Intermediate',
  },
  {
    title: 'The Helpful Space Friends',
    text: `In a space station far above Earth, three robots lived together.\n\nThere was Spark, who loved to build things.\n\nThere was Glow, who could light up any dark room.\n\nAnd there was Zip, who could zoom super fast!\n\nOne day, the space station's engine broke down. Oh no!\n\nSpark tried to fix it, but couldn't see in the dark engine room.\n\nGlow lit up the room, but didn't know what parts to use.\n\nZip brought the parts fast, but didn't know how to put them together.\n\n"Let's work as a team!" said Spark.\n\nGlow lit the way. Zip brought the parts. Spark built and fixed.\n\nVROOOOM! The engine came back to life!\n\nThe three robots high-fived with their robot hands.\n\n"We're better together!" they cheered. And they absolutely were.\n\nThe end.`,
    category: 'Space & Robots', ageBand: '4-6', readingLevel: 'Beginner',
  },
];

// ─── Seed function ─────────────────────────────────────────────────────────────

async function main() {
  console.log('📚  ToggleTail Database Seeder\n');

  // 1. Feature flags
  console.log('⚑   Seeding feature flags...');
  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where:  { name: flag.name },
      create: flag,
      update: { enabled: flag.enabled, description: flag.description },
    });
  }
  console.log(`    ✓ ${FEATURE_FLAGS.length} feature flags upserted\n`);

  // 2. Library stories
  console.log('📖  Seeding story library...');
  let added = 0;
  let skipped = 0;

  for (const storyData of LIBRARY_STORIES) {
    // Check if this library story already exists by title
    const existing = await prisma.story.findFirst({
      where: { title: storyData.title, sourceType: 'library' },
    });

    if (existing) {
      console.log(`    ○ Skipped  : "${storyData.title}"`);
      skipped++;
      continue;
    }

    const { wordCount, pages } = computeMeta(storyData.text);

    await prisma.story.create({
      data: {
        title:        storyData.title,
        text:         storyData.text,
        category:     storyData.category,
        ageBand:      storyData.ageBand,
        readingLevel: storyData.readingLevel,
        language:     'en',
        sourceType:   'library',
        provider:     'internal',
        author:       'ToggleTail Stories',
        license:      'Proprietary',
        wordCount,
        pages: {
          create: pages.map((content, pageIndex) => ({ pageIndex, content })),
        },
      },
    });

    console.log(`    ✓ Added    : "${storyData.title}" (${storyData.category})`);
    added++;
  }

  console.log(`\n    Stories added  : ${added}`);
  console.log(`    Stories skipped: ${skipped}`);

  // 3. Summary by category
  const counts = await prisma.story.groupBy({
    by:      ['category'],
    where:   { sourceType: 'library' },
    _count:  { id: true },
    orderBy: { category: 'asc' },
  });

  console.log('\n📊  Library stories by category:');
  for (const row of counts) {
    console.log(`    ${row.category.padEnd(20)} : ${row._count.id}`);
  }

  console.log('\n✅  Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
