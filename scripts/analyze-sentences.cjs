
const parts = require('./prepare-book.cjs');

// 1. Create our sentence segmenter

const segmenter = new Intl.Segmenter('en', {
  granularity: 'sentence'
});

// 2. Define our original segmentation method

function segmentWithRegex(text) {
  return text
    .split(/(?<=\.)\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

// 3. Define our new segmentation method

function segmentWithIntl(text) {
  return Array.from(
    segmenter.segment(text),
    item => item.segment.trim()
  ).filter(Boolean);
}


// 4. Define our hybrid segmentation method

function segmentWithHybrid(text) {
  const sentences = segmentWithIntl(text);
  const correctedSentences = [];

  for (const sentence of sentences) {
    const previousSentence =
      correctedSentences[correctedSentences.length - 1];

    const followsQuotedPunctuation =
      previousSentence &&
      /[.!?…][”"]$/.test(previousSentence);

    const startsWithLowercase =
      /^\p{Ll}/u.test(sentence);

    if (followsQuotedPunctuation && startsWithLowercase) {
      correctedSentences[correctedSentences.length - 1] =
        previousSentence + ' ' + sentence;
    } else {
      correctedSentences.push(sentence);
    }
  }

  return correctedSentences;
}


// 4B. Define our broader hybrid segmentation method

function segmentWithHybridV2(text) {
  const sentences = segmentWithIntl(text);
  const correctedSentences = [];

  for (const sentence of sentences) {
    const previousSentence =
      correctedSentences[correctedSentences.length - 1];

    const followsTerminalPunctuation =
      previousSentence &&
      /[.!?…][”"]?$/.test(previousSentence);

    const startsWithLowercase =
      /^\p{Ll}/u.test(sentence);

    if (followsTerminalPunctuation && startsWithLowercase) {
      correctedSentences[correctedSentences.length - 1] =
        previousSentence + ' ' + sentence;
    } else {
      correctedSentences.push(sentence);
    }
  }

  return correctedSentences;
}


// 5. Create a flat collection of paragraphs

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

// 6. Compare all four segmentation methods

const comparisons = allParagraphs.map(paragraph => {
  const regexSentences = segmentWithRegex(paragraph.text);
  const intlSentences = segmentWithIntl(paragraph.text);
  const hybridV1 = segmentWithHybrid(paragraph.text);
  const hybridV2 = segmentWithHybridV2(paragraph.text);

  return {
    ...paragraph,
    regexSentences,
    intlSentences,
    hybridV1,
    hybridV2,
    regexCount: regexSentences.length,
    intlCount: intlSentences.length,
    hybridV1Count: hybridV1.length,
    hybridV2Count: hybridV2.length,
    additionalMerges: hybridV1.length - hybridV2.length
  };
});

// 7. Calculate corpus-wide statistics

const totals = comparisons.reduce(
  (total, paragraph) => ({
    regex: total.regex + paragraph.regexCount,
    intl: total.intl + paragraph.intlCount,
    hybridV1: total.hybridV1 + paragraph.hybridV1Count,
    hybridV2: total.hybridV2 + paragraph.hybridV2Count,
    additionalMerges:
      total.additionalMerges + paragraph.additionalMerges
  }),
  {
    regex: 0,
    intl: 0,
    hybridV1: 0,
    hybridV2: 0,
    additionalMerges: 0
  }
);

const affectedParagraphs = comparisons.filter(
  paragraph => paragraph.additionalMerges > 0
);

// 8. Display corpus-wide results

console.log('Total paragraphs:', comparisons.length);

console.table([
  { method: 'Original regex', segments: totals.regex },
  { method: 'Intl.Segmenter', segments: totals.intl },
  { method: 'Hybrid V1', segments: totals.hybridV1 },
  { method: 'Hybrid V2', segments: totals.hybridV2 }
]);

console.log(
  'Additional boundaries removed:',
  totals.additionalMerges
);

console.log(
  'Additional paragraphs affected:',
  affectedParagraphs.length
);

console.log(
  'Percentage of paragraphs affected:',
  (
    affectedParagraphs.length /
    comparisons.length * 100
  ).toFixed(2) + '%'
);

// 9. Inspect the first five additional cases

affectedParagraphs.slice(0, 5).forEach(paragraph => {
  console.log(
    `\nPart ${paragraph.part}, ` +
    `Chapter ${paragraph.chapter}, ` +
    `Paragraph ${paragraph.paragraph}`
  );

  console.log(
    'Additional boundaries removed:',
    paragraph.additionalMerges
  );

  console.log('\nHybrid V1:');
  console.dir(paragraph.hybridV1, { depth: null });

  console.log('\nHybrid V2:');
  console.dir(paragraph.hybridV2, { depth: null });

  console.log('\n--------------------');
});


// 10. Analyze punctuation at additional merge boundaries

const punctuationCounts = {
  '.': 0,
  '?': 0,
  '!': 0,
  '…': 0
};

const additionalBoundaries = [];

affectedParagraphs.forEach(paragraph => {
  const sentences = paragraph.hybridV1;

  for (let i = 1; i < sentences.length; i++) {
    const previous = sentences[i - 1];
    const current = sentences[i];

    const punctuation = previous.match(/[.!?…]$/);

    if (punctuation && /^\p{Ll}/u.test(current)) {
      punctuationCounts[punctuation[0]]++;

      additionalBoundaries.push({
        part: paragraph.part,
        chapter: paragraph.chapter,
        paragraph: paragraph.paragraph,
        punctuation: punctuation[0],
        previous,
        current
      });
    }
  }
});

console.log('\nAdditional boundaries by punctuation:\n');

console.table(
  Object.entries(punctuationCounts).map(
    ([punctuation, count]) => ({
      punctuation,
      count
    })
  )
);

console.log(
  'Additional boundaries identified:',
  additionalBoundaries.length
);

// 11. Inspect one additional boundary from each part

console.log('\nExamples distributed across the novel:');

for (let partNumber = 1; partNumber <= 8; partNumber++) {
  const example = additionalBoundaries.find(
    boundary => boundary.part === partNumber
  );

  if (!example) {
    console.log(`\nPart ${partNumber}: No examples`);
    continue;
  }

  console.log(
    `\nPart ${example.part}, ` +
    `Chapter ${example.chapter}, ` +
    `Paragraph ${example.paragraph}`
  );

  console.log('Previous:', example.previous);
  console.log('Current:', example.current);

  console.log('\n--------------------');
}


// 12. Discover potential abbreviation boundaries

const abbreviationCandidates = new Map();

comparisons.forEach(paragraph => {
  const sentences = paragraph.hybridV2;

  for (let i = 1; i < sentences.length; i++) {
    const previous = sentences[i - 1];
    const current = sentences[i];

    const match = previous.match(
      /\b(\p{L}{1,5})\.$/u
    );

    const startsWithUppercase =
      /^\p{Lu}/u.test(current);

    if (match && startsWithUppercase) {
      const word = match[1] + '.';

      if (!abbreviationCandidates.has(word)) {
        abbreviationCandidates.set(word, {
          word,
          count: 0,
          examples: []
        });
      }

      const candidate = abbreviationCandidates.get(word);

      candidate.count++;

      if (candidate.examples.length < 3) {
        candidate.examples.push({
          part: paragraph.part,
          chapter: paragraph.chapter,
          paragraph: paragraph.paragraph,
          previous,
          current
        });
      }
    }
  }
});

const rankedCandidates = [
  ...abbreviationCandidates.values()
].sort((a, b) => b.count - a.count);

console.log('\nPotential abbreviation boundaries:\n');

console.log(
  'Unique candidates:',
  rankedCandidates.length
);

console.table(
  rankedCandidates.slice(0, 40).map(candidate => ({
    word: candidate.word,
    count: candidate.count
  }))
);


// 13. Build a corpus-wide vocabulary inventory

const vocabulary = new Map();

allParagraphs.forEach(paragraph => {
  const matches = paragraph.text.matchAll(
    /(\p{L}+(?:[’'-]\p{L}+)*)(\.)?/gu
  );

  for (const match of matches) {
    const word = match[1];
    const followedByPeriod = Boolean(match[2]);

    if (!vocabulary.has(word)) {
      vocabulary.set(word, {
        word,
        totalOccurrences: 0,
        periodOccurrences: 0
      });
    }

    const entry = vocabulary.get(word);

    entry.totalOccurrences++;

    if (followedByPeriod) {
      entry.periodOccurrences++;
    }
  }
});

console.log('\nCorpus vocabulary statistics:');

console.log(
  'Unique word forms:',
  vocabulary.size
);

// 14. Rank abbreviation candidates by period frequency

const scoredCandidates = rankedCandidates.map(candidate => {
  const word = candidate.word.slice(0, -1);
  const entry = vocabulary.get(word);

  const totalOccurrences =
    entry?.totalOccurrences ?? 0;

  const periodOccurrences =
    entry?.periodOccurrences ?? 0;

  const periodRatio = totalOccurrences > 0
    ? periodOccurrences / totalOccurrences
    : 0;

  return {
    word: candidate.word,
    boundaryCount: candidate.count,
    totalOccurrences,
    periodOccurrences,
    periodRatio
  };
});

scoredCandidates.sort(
  (a, b) =>
    b.periodRatio - a.periodRatio ||
    b.boundaryCount - a.boundaryCount
);

console.log('\nCandidates ranked by period frequency:\n');

console.table(
  scoredCandidates.slice(0, 40).map(candidate => ({
    word: candidate.word,
    boundaries: candidate.boundaryCount,
    total: candidate.totalOccurrences,
    periods: candidate.periodOccurrences,
    percentage:
      (candidate.periodRatio * 100).toFixed(2) + '%'
  }))
);


// 15. Inspect high-confidence abbreviation candidates

const likelyAbbreviations = scoredCandidates.filter(
  candidate =>
    candidate.totalOccurrences >= 2 &&
    candidate.periodRatio === 1
);

// Include a recognized but infrequent abbreviation
const inspectionWords = new Set([
  ...likelyAbbreviations.map(candidate => candidate.word),
  'Mr.'
]);

console.log('\nAbbreviation candidates in context:');

comparisons.forEach(paragraph => {
  const sentences = paragraph.hybridV2;

  for (let i = 1; i < sentences.length; i++) {
    const previous = sentences[i - 1];
    const current = sentences[i];

    const match = previous.match(
      /\b(\p{L}{1,5})\.$/u
    );

    if (
      match &&
      inspectionWords.has(match[1] + '.') &&
      /^\p{Lu}/u.test(current)
    ) {
      console.log(
        `\nPart ${paragraph.part}, ` +
        `Chapter ${paragraph.chapter}, ` +
        `Paragraph ${paragraph.paragraph}`
      );

      console.log('Candidate:', match[1] + '.');
      console.log('Previous:', previous);
      console.log('Current:', current);
      console.log('\n--------------------');
    }
  }
});


// 16. Define abbreviation-aware segmentation

const nameAbbreviations = new Set([
  'St.',
  'Mlle.',
  'M.',
  'Mr.'
]);

function segmentWithHybridV3(text) {
  const sentences = segmentWithHybridV2(text);
  const correctedSentences = [];

  for (const sentence of sentences) {
    const previousSentence =
      correctedSentences[correctedSentences.length - 1];

    const match = previousSentence?.match(
      /\b(\p{L}{1,5})\.$/u
    );

    const endsWithNameAbbreviation =
      match && nameAbbreviations.has(match[1] + '.');

    const startsWithUppercase =
      /^\p{Lu}/u.test(sentence);

    if (endsWithNameAbbreviation && startsWithUppercase) {
      correctedSentences[correctedSentences.length - 1] =
        previousSentence + ' ' + sentence;
    } else {
      correctedSentences.push(sentence);
    }
  }

  return correctedSentences;
}


// 17. Evaluate abbreviation corrections

const abbreviationComparisons = comparisons.map(paragraph => {
  const hybridV3 = segmentWithHybridV3(paragraph.text);

  return {
    ...paragraph,
    hybridV3,
    abbreviationMerges:
      paragraph.hybridV2.length - hybridV3.length
  };
});

const abbreviationAffected = abbreviationComparisons.filter(
  paragraph => paragraph.abbreviationMerges > 0
);

const totalV3 = abbreviationComparisons.reduce(
  (total, paragraph) =>
    total + paragraph.hybridV3.length,
  0
);

const totalAbbreviationMerges = abbreviationComparisons.reduce(
  (total, paragraph) =>
    total + paragraph.abbreviationMerges,
  0
);

console.log('\nAbbreviation correction results:\n');

console.table([
  { method: 'Original regex', segments: totals.regex },
  { method: 'Intl.Segmenter', segments: totals.intl },
  { method: 'Hybrid V1', segments: totals.hybridV1 },
  { method: 'Hybrid V2', segments: totals.hybridV2 },
  { method: 'Hybrid V3', segments: totalV3 }
]);

console.log(
  'Abbreviation boundaries removed:',
  totalAbbreviationMerges
);

console.log(
  'Paragraphs affected:',
  abbreviationAffected.length
);


// 18. Validate content preservation

const segmentationMismatches = abbreviationComparisons.filter(
  paragraph =>
    paragraph.hybridV3.join(' ') !== paragraph.text
);

console.log('\nSegmentation validation:');

console.log(
  'Paragraphs with reconstruction mismatches:',
  segmentationMismatches.length
);

segmentationMismatches.slice(0, 3).forEach(paragraph => {
  console.log(
    `\nPart ${paragraph.part}, ` +
    `Chapter ${paragraph.chapter}, ` +
    `Paragraph ${paragraph.paragraph}`
  );

  console.log('Original:', paragraph.text);
  console.log('Reconstructed:', paragraph.hybridV3.join(' '));
});


// 19. Compare reconstruction accuracy across methods

const reconstructionMethods = [
  {
    name: 'Original regex',
    key: 'regexSentences'
  },
  {
    name: 'Intl.Segmenter',
    key: 'intlSentences'
  },
  {
    name: 'Hybrid V1',
    key: 'hybridV1'
  },
  {
    name: 'Hybrid V2',
    key: 'hybridV2'
  },
  {
    name: 'Hybrid V3',
    key: 'hybridV3'
  }
];

const reconstructionStats = reconstructionMethods.map(method => {
  let exactMismatches = 0;
  let nonWhitespaceMismatches = 0;

  abbreviationComparisons.forEach(paragraph => {
    const reconstructed = paragraph[method.key].join(' ');

    if (reconstructed !== paragraph.text) {
      exactMismatches++;
    }

    if (
      reconstructed.replace(/\s/g, '') !==
      paragraph.text.replace(/\s/g, '')
    ) {
      nonWhitespaceMismatches++;
    }
  });

  return {
    method: method.name,
    exactMismatches,
    nonWhitespaceMismatches
  };
});

console.log('\nReconstruction accuracy by method:\n');

console.table(reconstructionStats);


// 20. Inspect raw Intl.Segmenter output

const formattingExample = allParagraphs.find(
  paragraph =>
    paragraph.part === 1 &&
    paragraph.chapter === 17 &&
    paragraph.paragraph === 13
);

console.log('\nRaw segmentation of italicized text:\n');

console.log('Original:', formattingExample.text);

const rawSegments = Array.from(
  segmenter.segment(formattingExample.text),
  item => ({
    segment: item.segment,
    index: item.index,
    length: item.segment.length
  })
);

console.dir(rawSegments, { depth: null });

console.log(
  'Raw reconstruction matches:',
  rawSegments.map(item => item.segment).join('') ===
    formattingExample.text
);

console.log('\nAfter trimming:');

console.dir(
  segmentWithIntl(formattingExample.text),
  { depth: null }
);
