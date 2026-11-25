

const parts = require('./prepare-book.cjs');

// 1. Create a flat collection of paragraphs

const allParagraphs = parts.flatMap(part =>
  part.chapters.flatMap(chapter =>
    chapter.paragraphs.map(paragraph => ({
      part: part.number,
      chapter: chapter.number,
      paragraph: paragraph.number,
      text: paragraph.text,
      normalizedText: paragraph.normalizedText
    }))
  )
);

// 2. Verify the paragraph count

console.log('Total paragraphs:', allParagraphs.length);

// 3. Validate content preservation

const contentMismatches = allParagraphs.filter(
  paragraph =>
    paragraph.text.replace(/\s/g, '') !==
    paragraph.normalizedText.replace(/\s/g, '')
);

// 4. Check for remaining line breaks

const remainingLineBreaks = allParagraphs.filter(
  paragraph => /[\r\n]/.test(paragraph.normalizedText)
);

// 5. Display validation results

console.log('Content mismatches:', contentMismatches.length);

console.log(
  'Paragraphs with remaining line breaks:',
  remainingLineBreaks.length
);

// 6. Compare original and normalized text

const sample = allParagraphs[0];

console.log('\nOriginal paragraph:\n');
console.log(sample.text);

console.log('\nNormalized paragraph:\n');
console.log(sample.normalizedText);
