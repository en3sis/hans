const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/merged-training-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let hasError = false;

for (const [intent, intentData] of Object.entries(data)) {
  if (!intentData.intents) continue;
  intentData.intents.forEach((item, idx) => {
    const utterance = item.utterance;
    if (!item.entities) return;
    item.entities.forEach((entity) => {
      const { start, end, sourceText } = entity;
      const extracted = utterance.slice(start, end);
      if (extracted !== sourceText) {
        hasError = true;
        console.log(
          `Intent: ${intent}\nUtterance #${idx}: "${utterance}"\n  Entity: ${JSON.stringify(entity)}\n  extracted: "${extracted}"\n  expected: "${sourceText}"\n  ---`
        );
      }
    });
  });
}

if (!hasError) {
  console.log('All entity indices are correct!');
} else {
  process.exit(1);
} 