// Simple emoji shortcode to character mapping generator for Node.js
// Outputs JSON mapping to stdout

const https = require('https');

const EMOJI_URL = 'https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json';

async function getEmojiData() {
    const response = await fetch(EMOJI_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

async function generateMapping() {
  try {
    const emojiData = await getEmojiData();

    const mapping = {};
    emojiData.forEach(entry => {
      if (entry.aliases && entry.aliases.length > 0) {
        entry.aliases.forEach(alias => {
          mapping[`:${alias}:`] = entry.emoji;
        });
      }
    });

    return JSON.stringify(mapping, null, 2);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

(async () => {
  console.log(await generateMapping());
})();
