const fs = require('node:fs');
const path = require('node:path');

// 1. Locate the source file

const sourcePath = path.join(
  __dirname,
  '../data/anna-karenina.txt'
);

// 2. Read the original text

const rawText = fs.readFileSync(sourcePath, 'utf8');

// 3. Identify the boundaries of the novel

const startIndex = rawText.search(/^PART ONE\r?$/m);

const endIndex = rawText.search(
  /^End of The Project Gutenberg Etext of Anna Karenina/m
);

// 4. Validate the boundaries

if (
  startIndex === -1 ||
  endIndex === -1 ||
  endIndex <= startIndex
) {
  throw new Error('Could not identify the novel boundaries.');
}

// 5. Extract the literary content

const novelText = rawText
  .slice(startIndex, endIndex)
  .trim();




// 6. Identify part boundaries

const partPattern =
  /^PART (ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT)\r?$/gm;

const partMatches = [...novelText.matchAll(partPattern)];

// 7. Validate the number of parts

if (partMatches.length !== 8) {
  throw new Error(
    `Expected 8 parts, found ${partMatches.length}.`
  );
}

// 8. Extract each part

const parts = partMatches.map((match, index) => {
  const start = match.index + match[0].length;

  const end = index < partMatches.length - 1
    ? partMatches[index + 1].index
    : novelText.length;

  const text = novelText.slice(start, end).trim();

  return {
    number: index + 1,
    title: match[0].trim(),
    text: text
  };
});


// 9. Parse chapters within each part

function parseChapters(partText) {
  const chapterPattern = /^Chapter ([0-9]+)\r?$/gm;

  const chapterMatches = [
    ...partText.matchAll(chapterPattern)
  ];

  if (chapterMatches.length === 0) {
    throw new Error('No chapter headings found.');
  }

  if (partText.slice(0, chapterMatches[0].index).trim()) {
    throw new Error('Unexpected text before first chapter.');
  }

  return chapterMatches.map((match, index) => {
    const start = match.index + match[0].length;

    const end = index < chapterMatches.length - 1
      ? chapterMatches[index + 1].index
      : partText.length;

    const text = partText.slice(start, end).trim();

    const number = Number(match[1]);

    if (number !== index + 1 || !text) {
      throw new Error(`Invalid chapter: ${number}`);
    }

    return {
      number: number,
      text: text
    };
  });
}

// 10. Build the hierarchical structure

const structuredParts = parts.map(part => ({
  number: part.number,
  title: part.title,
  chapters: parseChapters(part.text)
}));

// 11. Count and validate chapters

const totalChapters = structuredParts.reduce(
  (total, part) => total + part.chapters.length,
  0
);

if (totalChapters !== 239) {
  throw new Error(
    `Expected 239 chapters, found ${totalChapters}.`
  );
}



// 12. Identify and normalize paragraphs

function normalizeParagraph(text) {
  return text
    .replace(/\r?\n/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function parseParagraphs(chapterText) {
  return chapterText
    .split(/\r?\n(?:[ \t]*\r?\n)+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      number: index + 1,
      text: paragraph,
      normalizedText: normalizeParagraph(paragraph)
    }));
}


// 13. Extend our hierarchical structure

const paragraphParts = structuredParts.map(part => ({
  number: part.number,
  title: part.title,
  chapters: part.chapters.map(chapter => ({
    number: chapter.number,
    paragraphs: parseParagraphs(chapter.text)
  }))
}));

// 14. Count paragraphs within each part

const paragraphStats = paragraphParts.map(part => ({
  part: part.number,
  chapters: part.chapters.length,
  paragraphs: part.chapters.reduce(
    (total, chapter) =>
      total + chapter.paragraphs.length,
    0
  )
}));

const totalParagraphs = paragraphStats.reduce(
  (total, part) => total + part.paragraphs,
  0
);




// 15. Inspect the results

if (require.main === module) {
  console.table(paragraphStats);

  console.log('Total paragraphs:', totalParagraphs);

  console.log('\nFirst five paragraphs:\n');

  console.dir(
    paragraphParts[0].chapters[0].paragraphs.slice(0, 5),
    { depth: null }
  );

  console.log('\nFinal three paragraphs:\n');

  console.dir(
    paragraphParts[7].chapters[18].paragraphs.slice(-3),
    { depth: null }
  );
}

// 16. Export structured corpus

module.exports = paragraphParts;
