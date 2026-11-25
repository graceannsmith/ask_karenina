
const parts = require('./prepare-book.cjs');

// 1. Create our sentence segmenter

const segmenter = new Intl.Segmenter('en', {
  granularity: 'sentence'
});

// 2. Create a flat collection of paragraphs

const allParagraphs = parts.flatMap(part =>
  part.chapters.flatMap(chapter =>
    chapter.paragraphs.map(paragraph => ({
      part: part.number,
      chapter: chapter.number,
      paragraph: paragraph.number,
      text: paragraph.normalizedText
    }))
  )
);

// 3. Represent sentences as character spans

function segmentWithSpans(text) {
  return Array.from(
    segmenter.segment(text),
    item => ({
      start: item.index,
      end: item.index + item.segment.length
    })
  );
}

// 4. Retrieve the text associated with a span

function getSpanText(text, span) {
  return text.slice(span.start, span.end);
}

// 5. Segment the entire corpus

const spanParagraphs = allParagraphs.map(paragraph => ({
  ...paragraph,
  spans: segmentWithSpans(paragraph.text)
}));

// 6. Count the spans

const totalSpans = spanParagraphs.reduce(
  (total, paragraph) => total + paragraph.spans.length,
  0
);

// 7. Validate exact reconstruction

const reconstructionMismatches = spanParagraphs.filter(
  paragraph => {
    const reconstructed = paragraph.spans
      .map(span => getSpanText(paragraph.text, span))
      .join('');

    return reconstructed !== paragraph.text;
  }
);

// 8. Display corpus-wide results

console.log('Total paragraphs:', spanParagraphs.length);
console.log('Total spans:', totalSpans);

console.log(
  'Reconstruction mismatches:',
  reconstructionMismatches.length
);

// 9. Inspect our italicized example

const example = spanParagraphs.find(
  paragraph =>
    paragraph.part === 1 &&
    paragraph.chapter === 17 &&
    paragraph.paragraph === 13
);

console.log('\nOriginal paragraph:');
console.log(example.text);

console.log('\nSentence spans:');
console.dir(example.spans, { depth: null });

console.log('\nRetrieved text:');

console.dir(
  example.spans.map(span => ({
    ...span,
    text: getSpanText(example.text, span)
  })),
  { depth: null }
);
