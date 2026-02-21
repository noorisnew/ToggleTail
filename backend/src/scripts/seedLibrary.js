/**
 * Story Library Seeder
 * 
 * Seeds the database with original children's stories for each genre/interest category.
 * These are original stories created for the ToggleTail app.
 * 
 * Usage: node src/scripts/seedLibrary.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Story = require('../models/Story');

// Original stories for each category
const LIBRARY_STORIES = [
  // CUTE ANIMALS
  {
    title: "Benny the Brave Bunny",
    text: `Benny was a small brown bunny who lived in a cozy burrow under the old oak tree.

One sunny morning, Benny hopped out to find breakfast. He spotted the most beautiful orange carrot in Farmer Green's garden!

"I'm too small to get that big carrot," Benny said sadly. But then he had an idea!

Benny found his friends - Squeaky the mouse and Chirpy the sparrow. Together, they worked as a team.

Squeaky dug around the carrot. Chirpy pulled from above. And Benny tugged with all his might!

POP! Out came the carrot! It was the biggest, most delicious carrot they had ever seen.

Benny smiled and said, "Let's share it!" And so they did, because good friends share everything.

The end.`,
    category: 'Cute Animals',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "Whiskers and the Yarn Ball",
    text: `Whiskers was a fluffy gray kitten with the softest paws in the whole neighborhood.

One rainy day, Whiskers found a big red ball of yarn in the living room.

"What fun!" said Whiskers, and she batted the ball with her paw.

The yarn rolled across the floor. Whiskers chased it under the table!

It bounced off a chair leg. Whiskers pounced after it!

Round and round she went, until... oh no! Whiskers was all tangled up!

"Meow!" she cried. Her friend, the old dog Bruno, came to help.

Bruno gently pulled the yarn away, bit by bit, until Whiskers was free.

"Thank you, Bruno!" purred Whiskers happily.

From that day on, Whiskers only played with yarn when Bruno was watching.

The end.`,
    category: 'Cute Animals',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Little Bear's First Snow",
    text: `Little Bear woke up one winter morning to find the world had turned white!

"Mama! Mama! What happened?" asked Little Bear, pressing his nose against the window.

"That's snow, dear," said Mama Bear with a warm smile. "Would you like to play in it?"

Little Bear had never seen snow before. He put on his red scarf and ran outside.

CRUNCH! CRUNCH! His paws made funny sounds in the snow.

He stuck out his tongue and caught a snowflake. It was cold and tickly!

Little Bear made a snow angel, then rolled a big snowball.

Soon his friends Rabbit and Fox came to play. They built a snowman together!

When Little Bear got cold, he went inside for hot cocoa with Mama.

"Snow is wonderful," yawned Little Bear, falling asleep by the warm fire.

The end.`,
    category: 'Cute Animals',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "Dotty the Dalmatian's Spots",
    text: `Dotty was a dalmatian puppy with exactly one hundred spots.

She loved to count them every morning. One, two, three... all the way to one hundred!

One day at the park, Dotty met Patches the cow. Patches had big black patches all over.

"Your spots are so small and round!" said Patches.

Then Dotty met Stripes the zebra. He had lines going all over his body!

"Your spots are all different from my stripes!" said Stripes.

Dotty felt confused. Were spots better than patches? Were stripes better than spots?

Her mom licked her head gently. "Everyone is special in their own way," she said.

"Patches make Patches special. Stripes make Stripes special. And your beautiful spots make you special!"

Dotty wagged her tail happily. She loved being exactly who she was!

The end.`,
    category: 'Cute Animals',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },

  // SUPER HEROES
  {
    title: "Captain Kindness",
    text: `Maya was an ordinary girl who discovered something extraordinary - the power of kindness!

Every time Maya did something kind, her heart glowed with a golden light.

When she helped an old man carry his groceries, she could run super fast!

When she shared her lunch with a hungry friend, she grew super strong!

When she stood up for a kid being bullied, she could even fly!

The town's grumpy mayor, Mr. Crumble, tried to make everyone mean.

"Kindness makes you weak!" he shouted. But Maya knew better.

She flew to the town square and did the kindest thing of all - she gave Mr. Crumble a hug.

His grumpy heart melted. Tears fell from his eyes. "I forgot how good kindness feels," he whispered.

From that day on, Captain Kindness and the whole town spread kindness everywhere!

The end.`,
    category: 'Super Heroes',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Tiny Hero",
    text: `Leo was the smallest kid in his class. He wished he could be big and strong like a superhero.

One night, a shooting star landed in his backyard. Inside was a tiny golden cape!

When Leo put on the cape, something amazing happened. He stayed small, but now he could shrink even smaller!

"What kind of power is this?" Leo wondered.

The next day, a kitten got stuck inside a drainpipe at school. Everyone tried to help, but no one could reach it.

Leo knew what to do. He shrank down tiny and crawled into the pipe!

He found the scared kitten and gently guided it out to safety.

Everyone cheered! "You're a hero!" they shouted.

Leo learned that heroes come in all sizes. Sometimes being small is the biggest superpower of all!

The end.`,
    category: 'Super Heroes',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Homework Hero",
    text: `Zara had a secret identity. By day, she was a regular fourth grader. By night, she was... The Homework Hero!

Her superpower? She could make any subject fun and easy to understand!

When her friend Tom struggled with math, Zara showed him how to turn fractions into pizza slices.

"I get it now!" Tom exclaimed. Math wasn't scary anymore!

When her little brother couldn't read his book, Zara made silly voices for each character.

Soon he was reading all by himself, giggling at every page.

The evil villain Boredom tried to make kids hate learning. He zapped classrooms with his Snooze Ray!

But The Homework Hero fought back with games, songs, and stories that made learning an adventure.

"Learning is the greatest superpower," Zara told everyone. "Because knowledge can change the world!"

The end.`,
    category: 'Super Heroes',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },

  // DRAGONS & MAGIC
  {
    title: "The Dragon Who Couldn't Breathe Fire",
    text: `Ember was a young dragon who had a big problem. No matter how hard she tried, she couldn't breathe fire!

All the other dragons could breathe big, beautiful flames. But when Ember tried, only bubbles came out!

"You're not a real dragon," the other dragons teased.

Ember flew away to the Misty Mountains, feeling sad and alone.

There, she met an old, wise dragon named Ash. "What can you do?" Ash asked.

"Only bubbles," Ember sighed, blowing a stream of shimmering bubbles.

"Show me," said Ash. Ember blew bubbles that sparkled in every color of the rainbow!

One day, a forest fire threatened the village below. The fire-breathing dragons couldn't put it out!

But Ember's magical bubbles floated down and burst into rain, saving everyone!

"Three cheers for Ember!" everyone shouted. She learned that being different can be wonderful.

The end.`,
    category: 'Dragons & Magic',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Magic Paintbrush",
    text: `Young Lily found an old paintbrush in her grandmother's attic. It glowed with a soft purple light!

Whenever Lily painted something with it, her painting came to life!

She painted a butterfly - and it flew off the paper, fluttering around her room!

She painted a delicious cupcake - and she could actually eat it! It tasted like chocolate!

Lily got excited. She painted a huge castle with towers and flags.

WHOOSH! Suddenly she was standing inside a real castle. "Wow!" she gasped.

But then Lily felt lonely in the empty castle. She painted her family and friends.

POP! POP! POP! They all appeared, smiling and waving!

"The best magic," Lily realized, "is sharing wonderful things with people you love."

She painted them all flying home on a rainbow, laughing all the way.

The end.`,
    category: 'Dragons & Magic',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Wizard's Messy Room",
    text: `Wizard Wimbly had a problem. His magic room was SO messy!

Spell books everywhere! Potion bottles stacked in wobbly towers! And his wand? Completely lost!

"I'll just use magic to clean it!" said Wimbly. But where was his wand?

He tried to remember a cleaning spell. "CLEANICUS ROOMICUS!" he shouted.

Nothing happened. He forgot you need a wand for that spell!

So Wizard Wimbly did something he hadn't done in years. He cleaned by hand!

He picked up each book. He organized each potion. He swept the dusty floors.

Under a pile of socks, he finally found his wand!

"I did it!" cheered Wimbly. His room sparkled and shined.

He learned that sometimes the best magic is simply doing things yourself.

The end.`,
    category: 'Dragons & Magic',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },

  // FAIRY TALES
  {
    title: "The Princess Who Said Please",
    text: `Princess Penny lived in a beautiful golden castle. She had fancy dresses and sparkling jewels.

But Princess Penny had something even more special - magical manners!

Every time she said "Please," flowers bloomed around her.

Every time she said "Thank you," birds sang sweet songs.

And every time she was kind to someone, her crown glowed bright!

One day, a grumpy giant came to the kingdom. "Give me all your gold!" he roared.

The king and queen were scared. But Princess Penny walked right up to the giant.

"Please, Mr. Giant, why are you so sad?" she asked kindly.

The giant began to cry. "No one is ever nice to me," he sobbed.

Princess Penny hugged his big toe. "Would you like to be my friend?"

The giant smiled for the first time in years. Penny's kindness had saved the kingdom!

The end.`,
    category: 'Fairy Tales',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Brave Little Knight",
    text: `Sir Oliver was the smallest knight in the kingdom. His armor was too big. His shield was too heavy.

"You're too little to be a knight," laughed the other knights.

But Sir Oliver had the bravest heart in all the land!

One day, the kingdom's kitten climbed up the tallest tower and couldn't get down.

The big knights tried to climb up, but they were too heavy! The tower shook and wobbled.

"I'll do it!" said Sir Oliver. He was light enough to climb all the way up!

At the top, the scared kitten meowed. Sir Oliver gently picked her up.

He climbed down carefully, one step at a time, with the kitten safe in his arms.

The king gave Sir Oliver a medal. "True bravery isn't about being big," said the king.

"It's about having a big heart!" And Sir Oliver's heart was the biggest of all.

The end.`,
    category: 'Fairy Tales',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Enchanted Garden",
    text: `Once upon a time, there was a garden that nobody could find. It was hidden behind a secret door.

A curious girl named Rose discovered the door one day, covered in vines and flowers.

When she stepped through, she gasped! The garden was filled with talking flowers!

"Welcome, Rose!" said a cheerful sunflower. "We've been waiting for someone kind to find us."

A shy violet whispered, "Will you be our friend?"

Rose spent the whole day in the garden. The daisies told jokes. The roses sang songs.

But as the sun set, Rose knew she had to go home.

"Will you come back?" the flowers asked sadly.

"I promise," said Rose. "A good friend always keeps her promises."

And she did come back, every single day, bringing water and sunshine and love.

The garden grew more beautiful than ever, all because of one kind girl named Rose.

The end.`,
    category: 'Fairy Tales',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },

  // DINOSAURS
  {
    title: "Tiny Rex's Big Day",
    text: `Tiny Rex was the smallest T-Rex in the whole dinosaur valley.

His arms were too short to reach things. His legs were stubby. And his roar? More like a squeak!

"I wish I was big like the others," Tiny Rex sighed.

One day, a baby Triceratops fell into a narrow canyon. "Help!" she cried.

The big dinosaurs tried to help, but they were too large to fit through the rocks!

"I can do it!" said Tiny Rex. He squeezed through the narrow opening.

He found the scared baby and gently guided her back out to safety.

"You saved me!" the baby Triceratops cheered.

All the dinosaurs stomped their feet in celebration. BOOM! BOOM! BOOM!

"Being small isn't so bad," Tiny Rex realized. "I can do things no one else can!"

He held his tiny head high and let out his mightiest squeak.

The end.`,
    category: 'Dinosaurs',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Dinosaur School Bus",
    text: `Every morning in Dino Valley, a big yellow Brachiosaurus named Bumper gave rides to school.

Small dinosaurs would climb on his long neck and slide down to his back!

Stella the Stegosaurus sat in front. Her plates made a great shade from the sun!

Terry the Pterodactyl flew alongside, making sure no one fell off.

And little Vicky the Velociraptor always sat in the very back, because she liked the bumpy ride!

One rainy day, the path to school was flooded. "Oh no!" everyone cried.

But Bumper was so tall, he could wade right through the water!

"Hang on tight!" he called. All the little dinos cheered as they splashed through.

They arrived at school safe and sound, a little wet but very happy.

"Thanks, Bumper!" everyone shouted. He was the best school bus in the world!

The end.`,
    category: 'Dinosaurs',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Egg Mystery",
    text: `Professor Diplodocus found a mysterious egg in the valley. It was blue with purple spots!

"What kind of dinosaur is this?" he wondered. No one had ever seen an egg like it.

All the dinosaurs gathered around to guess.

"It's a T-Rex egg!" said Tommy T-Rex. But the egg was way too small.

"It's a Triceratops egg!" said Trina Triceratops. But the color was all wrong.

Days passed. Everyone waited to see what would hatch.

CRACK! CRACK! CRACK! The egg began to break!

Out popped... a tiny purple dinosaur that no one had ever seen before!

"What are you?" asked Professor Diplodocus gently.

The baby dinosaur smiled. "I'm ME!" it chirped happily.

Everyone laughed and cheered. They named the new friend Puzzle, because some mysteries are wonderful just the way they are!

The end.`,
    category: 'Dinosaurs',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },

  // OCEAN ADVENTURES
  {
    title: "Sammy the Shy Seahorse",
    text: `Sammy was a little seahorse who was very, very shy.

Whenever other fish swam by, he would hide in the coral.

"Come play with us!" called the friendly clownfish. But Sammy was too scared.

One day, a tiny baby fish got lost in the big ocean. She was crying little bubble tears.

All the big fish swam past, too busy to notice.

But Sammy saw her. He floated over slowly.

"Don't be scared," Sammy whispered. "I'll help you find your family."

He led the baby fish through the coral, showing her all the colorful sights.

When they found her family, they were so happy! "Thank you, brave seahorse!"

Sammy realized something important. He wasn't shy - he was gentle. And gentle is wonderful!

From that day on, Sammy had lots of friends who loved his quiet, kind ways.

The end.`,
    category: 'Ocean Adventures',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Whale's Wonderful Song",
    text: `Deep in the blue ocean lived a young whale named Walter.

Walter loved to sing! His songs traveled for miles through the water.

But the other ocean animals would swim away when he started singing.

"Your songs are too loud!" said the dolphins.

"Your songs make bubbles everywhere!" complained the crabs.

Walter felt sad. He stopped singing altogether.

The ocean became quiet. Too quiet! Fish forgot which way to swim. Jellyfish bumped into rocks.

Everyone realized something was missing. They missed Walter's songs!

"Please sing again!" they asked. "Your songs help us know where we are!"

Walter smiled a big whale smile and began to sing the most beautiful song ever.

All the creatures of the ocean danced and swirled to his wonderful music.

"Your voice is special," they told him. "Never stop being you!"

The end.`,
    category: 'Ocean Adventures',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "Pearl's Treasure Hunt",
    text: `Pearl was an adventurous young octopus with eight curious arms.

One day, she found an old map tucked inside a sunken bottle.

"X marks the spot!" Pearl read. "There's treasure in the Kelp Forest!"

Pearl set off on her adventure. She swam through sparkly caves and over sandy hills.

In the Kelp Forest, she met a grumpy old crab guarding a treasure chest.

"This is MY treasure!" the crab snapped.

"What's inside?" Pearl asked kindly.

The crab looked sad. "I don't know. I can't open it. My claws are too big!"

Pearl used her clever arms to open the rusty lock. CLICK!

Inside was... a beautiful painting of the ocean! And a note that said: "The real treasure is friendship."

Pearl and the crab looked at each other and smiled. They hung the painting in Mr. Crab's home and had tea together every day after that.

The end.`,
    category: 'Ocean Adventures',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },

  // MYSTERY & PUZZLES
  {
    title: "The Case of the Missing Cookie",
    text: `Detective Daisy was only seven years old, but she was the best detective on Maple Street!

One afternoon, her brother Danny came crying. "Someone ate my cookie!"

Daisy grabbed her magnifying glass. "Don't worry! I'm on the case!"

She looked for clues. First, she found crumbs leading to the kitchen.

Then she found chocolate smudges on the refrigerator handle.

Finally, she found a suspicious brown pawprint on the floor!

Daisy followed the pawprints to... Biscuit the dog's bed!

There was Biscuit, licking chocolate off his whiskers, looking very guilty.

"Case closed!" announced Daisy. "The cookie thief is Biscuit!"

Everyone laughed, even Danny. Mom gave Danny a new cookie.

And Biscuit got a tummy rub and a promise to keep cookies up high from now on!

The end.`,
    category: 'Mystery & Puzzles',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Riddle of Rainbow Bridge",
    text: `To cross Rainbow Bridge, you had to solve a riddle.

A clever troll named Trenton lived under the bridge. He loved riddles more than anything!

One day, three friends arrived: Maya, Leo, and tiny Pip.

"Answer my riddle and you may cross!" Trenton said with a grin.

"I have hands but cannot clap. I have a face but cannot smile. What am I?"

Maya thought hard. "A clock!" she shouted.

"Correct!" laughed Trenton. "But wait - here's a harder one!"

"I get wetter the more I dry. What am I?"

Leo scratched his head. Then he snapped his fingers. "A towel!"

"Amazing!" Trenton cheered. "One last riddle!"

"What belongs to you but others use it more than you do?"

They all thought and thought. Finally, tiny Pip spoke up: "Your name!"

Trenton did a happy dance. "You three are the cleverest friends I've ever met!"

He invited them for tea under the bridge, and they stayed friends forever.

The end.`,
    category: 'Mystery & Puzzles',
    ageBand: '8-10',
    readingLevel: 'Advanced',
    author: 'ToggleTail Stories',
  },
  {
    title: "Where's Whiskers?",
    text: `Grandma's cat Whiskers was missing! Mia and Max needed to find him.

They searched the living room. Under the couch? No Whiskers!

They checked the kitchen. Behind the fridge? No Whiskers!

They looked in the laundry basket. In the warm towels? No Whiskers!

Mia noticed something fuzzy sticking out from the closet.

They peeked inside and found... Grandma's fur coat! But no Whiskers.

Max heard a soft sound. "Meow..." Where was it coming from?

They listened carefully. It came from UP HIGH!

They looked at the tall bookshelf. There, on the very top, sat Whiskers!

"How did you get up there?" they giggled.

Grandpa got the ladder and helped Whiskers down safely.

"Sometimes," Mia said, "you have to look up to find what you're looking for!"

The end.`,
    category: 'Mystery & Puzzles',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },

  // SPACE & ROBOTS
  {
    title: "Beep the Friendly Robot",
    text: `Beep was a small robot with a big heart. Well, a big battery, but it felt like a heart!

Every morning, Beep beeped happily: "BEEP BEEP! Good morning!"

Beep helped everyone in the house. He made toast. He found lost socks. He never forgot anything!

But sometimes Beep felt different from the humans he loved.

"I don't have a nose to smell flowers," Beep said sadly. "Or fingers that feel soft things."

Little Emma gave Beep a big hug. "But Beep, you have something special!"

"What's that?" Beep asked, his lights blinking with curiosity.

"You always know when someone needs a friend. That's better than any sensor!"

Beep's screen showed a happy smile. "BEEP BEEP! I love being me!"

From that day on, Beep knew that what made him different also made him wonderful.

The end.`,
    category: 'Space & Robots',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
  {
    title: "Luna's Trip to the Moon",
    text: `Luna had always dreamed of visiting the moon. It was named after her, after all!

On her eighth birthday, she drew a rocket ship with silver crayons.

That night, something magical happened. Her drawing started to GLOW!

The rocket floated off the paper and grew to full size! "All aboard!" said a friendly voice.

Luna climbed in and WHOOOOSH! Off she went into space!

She passed twinkling stars and colorful planets. Everything was so beautiful!

She landed softly on the moon. The ground was dusty and gray, but it sparkled in the sunlight!

Luna took a moon rock to bring home. It was light as a feather!

As she flew back to Earth, she waved goodbye to the stars.

She woke up in her bed, but guess what was under her pillow?

A real moon rock, gray and sparkly, with a note: "Dream big, Luna!"

The end.`,
    category: 'Space & Robots',
    ageBand: '6-8',
    readingLevel: 'Intermediate',
    author: 'ToggleTail Stories',
  },
  {
    title: "The Helpful Space Friends",
    text: `In a space station far above Earth, three robots lived together.

There was Spark, who loved to build things.

There was Glow, who could light up any dark room.

And there was Zip, who could zoom super fast!

One day, the space station's engine broke down. Oh no!

Spark tried to fix it, but couldn't see in the dark engine room.

Glow lit up the room, but didn't know what parts to use.

Zip brought the parts fast, but didn't know how to put them together.

"Let's work as a team!" said Spark.

Glow lit the way. Zip brought the parts. Spark built and fixed.

VROOOOM! The engine came back to life!

The three robots high-fived with their robot hands.

"We're better together!" they cheered. And they absolutely were.

The end.`,
    category: 'Space & Robots',
    ageBand: '4-6',
    readingLevel: 'Beginner',
    author: 'ToggleTail Stories',
  },
];

// Map reading level to estimated reading time
function mapReadingLevel(level) {
  switch(level) {
    case 'Beginner': return 'Beginner';
    case 'Intermediate': return 'Intermediate';
    case 'Advanced': return 'Advanced';
    default: return 'Beginner';
  }
}

// Main seeding function
async function seedLibrary() {
  console.log('📚 ToggleTail Story Library Seeder\n');
  console.log('Connecting to MongoDB...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    console.error('\nTip: Check your MONGODB_URI in backend/.env');
    process.exit(1);
  }

  let added = 0;
  let skipped = 0;

  console.log('Seeding stories...\n');

  for (const storyData of LIBRARY_STORIES) {
    try {
      // Check if story already exists
      const existing = await Story.findOne({ 
        title: storyData.title,
        sourceType: 'library'
      });

      if (existing) {
        console.log(`  ○ Skipped: "${storyData.title}" (already exists)`);
        skipped++;
        continue;
      }

      // Create story
      const story = new Story({
        title: storyData.title,
        text: storyData.text,
        category: storyData.category,
        ageBand: storyData.ageBand,
        readingLevel: storyData.readingLevel,
        language: 'en',
        sourceType: 'library',
        provider: 'internal',
        author: storyData.author,
        license: 'Proprietary',
      });

      await story.save();
      console.log(`  ✓ Added: "${storyData.title}" (${storyData.category})`);
      added++;
    } catch (error) {
      console.error(`  ✗ Error adding "${storyData.title}":`, error.message);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SEEDING COMPLETE');
  console.log('═'.repeat(50));
  console.log(`✓ Stories added: ${added}`);
  console.log(`○ Stories skipped: ${skipped}`);
  console.log(`Total library stories: ${added + skipped}`);

  // Show stats by category
  const stats = await Story.aggregate([
    { $match: { sourceType: 'library' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  console.log('\n📖 Stories by Category:');
  for (const stat of stats) {
    console.log(`   ${stat._id}: ${stat.count}`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done! Library is ready.');
}

// Run
seedLibrary().catch(console.error);
