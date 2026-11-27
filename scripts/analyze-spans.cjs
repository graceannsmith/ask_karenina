
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


// 10. Define span-based Hybrid V1

function segmentWithSpanV1(text) {
  const spans = segmentWithSpans(text);
  const correctedSpans = [];

  for (const span of spans) {
    const previousSpan =
      correctedSpans[correctedSpans.length - 1];

    const currentText =
      getSpanText(text, span).trim();

    const previousText = previousSpan
      ? getSpanText(text, previousSpan).trim()
      : '';

    const followsQuotedPunctuation =
      /[.!?…][”"]$/.test(previousText);

    const startsWithLowercase =
      /^\p{Ll}/u.test(currentText);

    if (
      previousSpan &&
      followsQuotedPunctuation &&
      startsWithLowercase
    ) {
      correctedSpans[correctedSpans.length - 1] = {
        start: previousSpan.start,
        end: span.end
      };
    } else {
      correctedSpans.push({ ...span });
    }
  }

  return correctedSpans;
}


// 11. Evaluate span-based Hybrid V1

const spanV1Paragraphs = spanParagraphs.map(paragraph => ({
  ...paragraph,
  spansV1: segmentWithSpanV1(paragraph.text)
}));

const totalSpansV1 = spanV1Paragraphs.reduce(
  (total, paragraph) =>
    total + paragraph.spansV1.length,
  0
);

const affectedV1Paragraphs = spanV1Paragraphs.filter(
  paragraph =>
    paragraph.spans.length !== paragraph.spansV1.length
);

const reconstructionMismatchesV1 =
  spanV1Paragraphs.filter(paragraph => {
    const reconstructed = paragraph.spansV1
      .map(span => getSpanText(paragraph.text, span))
      .join('');

    return reconstructed !== paragraph.text;
  });

console.log('\nSpan-based Hybrid V1 results:\n');

console.table([
  {
    method: 'Original spans',
    segments: totalSpans,
    mismatches: reconstructionMismatches.length
  },
  {
    method: 'Span Hybrid V1',
    segments: totalSpansV1,
    mismatches: reconstructionMismatchesV1.length
  }
]);

console.log(
  'Boundaries removed:',
  totalSpans - totalSpansV1
);

console.log(
  'Paragraphs affected:',
  affectedV1Paragraphs.length
);

// 12. Inspect the first span-based V1 correction

const firstV1Example = affectedV1Paragraphs[0];

if (firstV1Example) {
  console.log('\nFirst corrected paragraph:');

  console.log(
    `Part ${firstV1Example.part}, ` +
    `Chapter ${firstV1Example.chapter}, ` +
    `Paragraph ${firstV1Example.paragraph}`
  );

  console.log('\nOriginal spans:');

  console.dir(
    firstV1Example.spans.map(span => ({
      ...span,
      text: getSpanText(firstV1Example.text, span)
    })),
    { depth: null }
  );

  console.log('\nCorrected spans:');

  console.dir(
    firstV1Example.spansV1.map(span => ({
      ...span,
      text: getSpanText(firstV1Example.text, span)
    })),
    { depth: null }
  );
}


// 13. Create a reusable span correction function

function mergeLowercaseContinuations(
  text,
  punctuationPattern
) {
  const spans = segmentWithSpans(text);
  const correctedSpans = [];

  for (const span of spans) {
    const previousSpan =
      correctedSpans[correctedSpans.length - 1];

    const currentText =
      getSpanText(text, span).trim();

    const previousText = previousSpan
      ? getSpanText(text, previousSpan).trim()
      : '';

    const followsPunctuation =
      punctuationPattern.test(previousText);

    const startsWithLowercase =
      /^\p{Ll}/u.test(currentText);

    if (
      previousSpan &&
      followsPunctuation &&
      startsWithLowercase
    ) {
      correctedSpans[correctedSpans.length - 1] = {
        start: previousSpan.start,
        end: span.end
      };
    } else {
      correctedSpans.push({ ...span });
    }
  }

  return correctedSpans;
}


// 14. Define segmentation variants using shared logic

function segmentWithSpanV1Refactored(text) {
  return mergeLowercaseContinuations(
    text,
    /[.!?…][”"]$/
  );
}

function segmentWithSpanV2(text) {
  return mergeLowercaseContinuations(
    text,
    /[.!?…][”"]?$/
  );
}


// 15. Validate refactored Hybrid V1

const refactoringMismatches = spanV1Paragraphs.filter(
  paragraph => {
    const refactoredSpans =
      segmentWithSpanV1Refactored(paragraph.text);

    return (
      JSON.stringify(paragraph.spansV1) !==
      JSON.stringify(refactoredSpans)
    );
  }
);

console.log('\nV1 refactoring validation:');

console.log(
  'Paragraphs with different spans:',
  refactoringMismatches.length
);


// 16. Evaluate span-based Hybrid V2

const spanV2Paragraphs = spanV1Paragraphs.map(
  paragraph => ({
    ...paragraph,
    spansV2: segmentWithSpanV2(paragraph.text)
  })
);

const totalSpansV2 = spanV2Paragraphs.reduce(
  (total, paragraph) =>
    total + paragraph.spansV2.length,
  0
);

const affectedV2Paragraphs = spanV2Paragraphs.filter(
  paragraph =>
    paragraph.spansV1.length !==
    paragraph.spansV2.length
);

const reconstructionMismatchesV2 =
  spanV2Paragraphs.filter(paragraph => {
    const reconstructed = paragraph.spansV2
      .map(span => getSpanText(paragraph.text, span))
      .join('');

    return reconstructed !== paragraph.text;
  });

console.log('\nSpan-based Hybrid V2 results:\n');

console.table([
  {
    method: 'Original spans',
    segments: totalSpans,
    mismatches: reconstructionMismatches.length
  },
  {
    method: 'Span Hybrid V1',
    segments: totalSpansV1,
    mismatches: reconstructionMismatchesV1.length
  },
  {
    method: 'Span Hybrid V2',
    segments: totalSpansV2,
    mismatches: reconstructionMismatchesV2.length
  }
]);

console.log(
  'Additional boundaries removed:',
  totalSpansV1 - totalSpansV2
);

console.log(
  'Additional paragraphs affected:',
  affectedV2Paragraphs.length
);


// 17. Define span-based Hybrid V3

const nameAbbreviations = new Set([
  'St.',
  'Mlle.',
  'M.',
  'Mr.'
]);

function segmentWithSpanV3(text) {
  const spans = segmentWithSpanV2(text);
  const correctedSpans = [];

  for (const span of spans) {
    const previousSpan =
      correctedSpans[correctedSpans.length - 1];

    const currentText =
      getSpanText(text, span).trim();

    const previousText = previousSpan
      ? getSpanText(text, previousSpan).trim()
      : '';

    const match =
      previousText.match(/\b(\p{L}{1,5})\.$/u);

    const endsWithNameAbbreviation =
      match && nameAbbreviations.has(match[1] + '.');

    const startsWithUppercase =
      /^\p{Lu}/u.test(currentText);

    if (
      previousSpan &&
      endsWithNameAbbreviation &&
      startsWithUppercase
    ) {
      correctedSpans[correctedSpans.length - 1] = {
        start: previousSpan.start,
        end: span.end
      };
    } else {
      correctedSpans.push({ ...span });
    }
  }

  return correctedSpans;
}


// 18. Evaluate span-based Hybrid V3

const spanV3Paragraphs = spanV2Paragraphs.map(
  paragraph => ({
    ...paragraph,
    spansV3: segmentWithSpanV3(paragraph.text)
  })
);

const totalSpansV3 = spanV3Paragraphs.reduce(
  (total, paragraph) =>
    total + paragraph.spansV3.length,
  0
);

const affectedV3Paragraphs = spanV3Paragraphs.filter(
  paragraph =>
    paragraph.spansV2.length !==
    paragraph.spansV3.length
);

const reconstructionMismatchesV3 =
  spanV3Paragraphs.filter(paragraph => {
    const reconstructed = paragraph.spansV3
      .map(span => getSpanText(paragraph.text, span))
      .join('');

    return reconstructed !== paragraph.text;
  });

console.log('\nSpan-based Hybrid V3 results:\n');

console.table([
  {
    method: 'Original spans',
    segments: totalSpans,
    mismatches: reconstructionMismatches.length
  },
  {
    method: 'Span Hybrid V1',
    segments: totalSpansV1,
    mismatches: reconstructionMismatchesV1.length
  },
  {
    method: 'Span Hybrid V2',
    segments: totalSpansV2,
    mismatches: reconstructionMismatchesV2.length
  },
  {
    method: 'Span Hybrid V3',
    segments: totalSpansV3,
    mismatches: reconstructionMismatchesV3.length
  }
]);

console.log(
  'Abbreviation boundaries removed:',
  totalSpansV2 - totalSpansV3
);

console.log(
  'Paragraphs affected by abbreviations:',
  affectedV3Paragraphs.length
);


// 19. Inspect removed abbreviation boundaries

console.log('\nRemoved abbreviation boundaries:\n');

for (const paragraph of affectedV3Paragraphs) {
  const retainedBoundaries = new Set(
    paragraph.spansV3.map(span => span.end)
  );

  for (let i = 0; i < paragraph.spansV2.length - 1; i++) {
    const previousSpan = paragraph.spansV2[i];
    const currentSpan = paragraph.spansV2[i + 1];

    if (!retainedBoundaries.has(previousSpan.end)) {
      const previousText =
        getSpanText(paragraph.text, previousSpan);

      const currentText =
        getSpanText(paragraph.text, currentSpan);

      console.log(
        `Part ${paragraph.part}, ` +
        `Chapter ${paragraph.chapter}, ` +
        `Paragraph ${paragraph.paragraph}`
      );

      console.log(
        previousText.trimEnd().slice(-60) +
        ' | ' +
        currentText.trimStart().slice(0, 60)
      );

      console.log(
        'Removed boundary at offset:',
        previousSpan.end
      );

      console.log('');
    }
  }
}


// 20. Validate the structural integrity of spans

function validateSpans(text, spans) {
  if (spans.length === 0) {
    return text.length === 0;
  }

  if (spans[0].start !== 0) {
    return false;
  }

  if (spans[spans.length - 1].end !== text.length) {
    return false;
  }

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];

    if (
      !Number.isInteger(span.start) ||
      !Number.isInteger(span.end)
    ) {
      return false;
    }

    if (
      span.start < 0 ||
      span.end > text.length ||
      span.start >= span.end
    ) {
      return false;
    }

    if (
      i > 0 &&
      spans[i - 1].end !== span.start
    ) {
      return false;
    }
  }

  return true;
}


// 21. Validate every segmentation method

const spanMethods = [
  { name: 'Original spans', key: 'spans' },
  { name: 'Span Hybrid V1', key: 'spansV1' },
  { name: 'Span Hybrid V2', key: 'spansV2' },
  { name: 'Span Hybrid V3', key: 'spansV3' }
];

const structuralValidation = spanMethods.map(method => {
  const invalidParagraphs = spanV3Paragraphs.filter(
    paragraph =>
      !validateSpans(
        paragraph.text,
        paragraph[method.key]
      )
  );

  return {
    method: method.name,
    paragraphs: spanV3Paragraphs.length,
    invalid: invalidParagraphs.length
  };
});

console.log('\nStructural span validation:\n');
console.table(structuralValidation);


// 22. Investigate boundaries preceding underscores

const underscoreBoundaries = [];

for (const paragraph of spanV3Paragraphs) {
  for (let i = 1; i < paragraph.spansV3.length; i++) {
    const previousSpan = paragraph.spansV3[i - 1];
    const currentSpan = paragraph.spansV3[i];

    const previousText =
      getSpanText(paragraph.text, previousSpan);

    const currentText =
      getSpanText(paragraph.text, currentSpan);

    if (currentText.trimStart().startsWith('_')) {
      underscoreBoundaries.push({
        part: paragraph.part,
        chapter: paragraph.chapter,
        paragraph: paragraph.paragraph,
        offset: currentSpan.start,
        previous: previousText.trimEnd().slice(-80),
        current: currentText.trimStart().slice(0, 80)
      });
    }
  }
}

console.log('\nBoundaries preceding underscores:');

console.log(
  'Total candidates:',
  underscoreBoundaries.length
);

console.dir(
  underscoreBoundaries.slice(0, 20),
  { depth: null }
);


// 23. Investigate underscore pairing

const italicParagraphs = spanV3Paragraphs
  .map(paragraph => ({
    ...paragraph,
    underscoreCount:
      (paragraph.text.match(/_/g) || []).length
  }))
  .filter(paragraph => paragraph.underscoreCount > 0);

const unbalancedItalicParagraphs =
  italicParagraphs.filter(
    paragraph => paragraph.underscoreCount % 2 !== 0
  );

const totalUnderscores = italicParagraphs.reduce(
  (total, paragraph) =>
    total + paragraph.underscoreCount,
  0
);

console.log('\nItalic delimiter statistics:');

console.log(
  'Paragraphs containing underscores:',
  italicParagraphs.length
);

console.log(
  'Total underscores:',
  totalUnderscores
);

console.log(
  'Paragraphs with odd underscore counts:',
  unbalancedItalicParagraphs.length
);

console.dir(
  unbalancedItalicParagraphs.slice(0, 10).map(
    paragraph => ({
      part: paragraph.part,
      chapter: paragraph.chapter,
      paragraph: paragraph.paragraph,
      underscoreCount: paragraph.underscoreCount,
      text: paragraph.text
    })
  ),
  { depth: null }
);


// 24. Classify opening and closing italic delimiters

const classifiedUnderscoreBoundaries = [];

for (const paragraph of spanV3Paragraphs) {
  for (let i = 1; i < paragraph.spansV3.length; i++) {
    const previousSpan = paragraph.spansV3[i - 1];
    const currentSpan = paragraph.spansV3[i];

    const currentText =
      getSpanText(paragraph.text, currentSpan);

    if (!currentText.trimStart().startsWith('_')) {
      continue;
    }

    const underscoreOffset =
      currentSpan.start + currentText.indexOf('_');

    const precedingText =
      paragraph.text.slice(0, underscoreOffset);

    const precedingUnderscores =
      (precedingText.match(/_/g) || []).length;

    const classification =
      precedingUnderscores % 2 === 0
        ? 'opening'
        : 'closing';

    classifiedUnderscoreBoundaries.push({
      part: paragraph.part,
      chapter: paragraph.chapter,
      paragraph: paragraph.paragraph,
      boundaryOffset: currentSpan.start,
      underscoreOffset,
      precedingUnderscores,
      classification,
      previous: getSpanText(
        paragraph.text,
        previousSpan
      ).trimEnd().slice(-80),
      current: currentText.trimStart().slice(0, 80)
    });
  }
}

const openingCandidates =
  classifiedUnderscoreBoundaries.filter(
    candidate => candidate.classification === 'opening'
  );

const closingCandidates =
  classifiedUnderscoreBoundaries.filter(
    candidate => candidate.classification === 'closing'
  );

console.log('\nItalic boundary classification:');

console.table([
  {
    classification: 'Opening delimiter',
    candidates: openingCandidates.length
  },
  {
    classification: 'Closing delimiter',
    candidates: closingCandidates.length
  }
]);

console.log('\nOpening delimiter examples:');
console.dir(openingCandidates.slice(0, 5), {
  depth: null
});

console.log('\nClosing delimiter examples:');
console.dir(closingCandidates.slice(0, 10), {
  depth: null
});


// 25. Classify closing delimiter contexts

function classifyClosingContext(text) {
  const remainder = text
    .replace(/^_[”"’»]*/, '')
    .trimStart();

  if (remainder.length === 0) {
    return 'Closing delimiters only';
  }

  if (/^\p{Lu}/u.test(remainder)) {
    return 'Uppercase continuation';
  }

  if (/^\p{Ll}/u.test(remainder)) {
    return 'Lowercase continuation';
  }

  if (/^[—–-]/.test(remainder)) {
    return 'Dash continuation';
  }

  return 'Other continuation';
}

const closingContextCounts = new Map();
const closingContextExamples = new Map();

for (const candidate of closingCandidates) {
  const context =
    classifyClosingContext(candidate.current);

  closingContextCounts.set(
    context,
    (closingContextCounts.get(context) || 0) + 1
  );

  if (!closingContextExamples.has(context)) {
    closingContextExamples.set(context, []);
  }

  closingContextExamples.get(context).push(candidate);
}

console.log('\nClosing delimiter contexts:');

console.table(
  [...closingContextCounts.entries()].map(
    ([context, count]) => ({
      context,
      count
    })
  )
);

for (const [context, examples] of closingContextExamples) {
  console.log(`\n${context}:`);

  console.dir(
    examples.slice(0, 5),
    { depth: null }
  );
}
