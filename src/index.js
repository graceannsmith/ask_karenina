import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/styles.css';

import { bookText } from './text.js';

// ─────────────────────────────────────────────────────────────
// 1. Build a better sentence list (keep periods & quotes)
// ─────────────────────────────────────────────────────────────

// Split on: “period + whitespace”, keeping the period on the left side
const rawSentences = bookText
  .split(/(?<=\.)\s+/)   // e.g. `"Well." She` → ["\"Well.", "She ..."]
  .map(s => s.trim())
  .filter(Boolean);

// For each sentence, track whether it starts/ends inside an open quote
const sentenceData = [];
let insideQuote = 0; // 0 = outside, 1 = inside

for (const text of rawSentences) {
  const startInside = insideQuote === 1;

  for (const ch of text) {
    if (ch === '"') {
      // toggle on every double quote
      insideQuote ^= 1;
    }
  }

  const endInside = insideQuote === 1;

  sentenceData.push({ text, startInside, endInside });
}

// ─────────────────────────────────────────────────────────────
// 2. State for the current quote block
// ─────────────────────────────────────────────────────────────

let quoteArray = [];
let originalIndex = null;
let currentStartIndex = null;
let currentEndIndex = null;

// ─────────────────────────────────────────────────────────────
// 3. Helper: expand a picked sentence to the full quote
// ─────────────────────────────────────────────────────────────

function expandToFullQuote(index) {
  const s = sentenceData[index];

  // Completely outside any surrounding quote and no " inside → just that sentence
  if (!s.startInside && !s.endInside && !s.text.includes('"')) {
    return [index, index];
  }

  let start = index;
  let end = index;

  // If we’re inside a quote at the start of this sentence,
  // walk backwards to the sentence where that quote began.
  if (s.startInside) {
    while (start > 0 && sentenceData[start].startInside) {
      start--;
    }

    // We stopped on the first sentence that *doesn't* start inside a quote.
    // If that sentence ends inside a quote, it's the one where the quote started.
    if (!sentenceData[start].endInside) {
      // That sentence is fully outside; move forward one.
      start++;
    }
  }

  // If we’re still inside the quote at the end of this sentence,
  // walk forwards to the sentence where the quote closes.
  if (s.endInside) {
    while (end < sentenceData.length - 1 && sentenceData[end].endInside) {
      end++;
    }
  }

  // Safety clamps
  if (start < 0) start = 0;
  if (end >= sentenceData.length) end = sentenceData.length - 1;

  return [start, end];
}

function buildQuoteArray(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) {
    const sentence = sentenceData[i].text;
    if (i === originalIndex) {
      result.push(`<b>${sentence}</b>`);
    } else {
      result.push(sentence);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// 4. Core quote functions
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// 4. Core quote functions
// ─────────────────────────────────────────────────────────────

function getRandomQuote() {
  originalIndex = Math.floor(Math.random() * sentenceData.length);

  const [start, end] = expandToFullQuote(originalIndex);

  currentStartIndex = start;
  currentEndIndex = end;

  quoteArray = buildQuoteArray(start, end);
  updateQuoteDisplay();

  // Announce the entire new quotation without HTML tags
  const fullQuote = sentenceData
    .slice(start, end + 1)
    .map(sentence => sentence.text)
    .join(' ');

  announceQuote(fullQuote);
}

function addNextQuote() {
  // Make sure a quotation has already been generated
  if (currentEndIndex === null) {
    announceQuote('Select Ask Anna to begin.');
    return;
  }

  const nextIndex = currentEndIndex + 1;

  if (nextIndex < sentenceData.length) {
    const nextSentence = sentenceData[nextIndex].text;

    quoteArray.push(nextSentence);
    currentEndIndex = nextIndex;

    updateQuoteDisplay();
    announceQuote(`Later passage added. ${nextSentence}`);
  } else {
    announceQuote('You have reached the end of the text.');
  }
}

function addPreviousQuote() {
  // Make sure a quotation has already been generated
  if (currentStartIndex === null) {
    announceQuote('Select Ask Anna to begin.');
    return;
  }

  const prevIndex = currentStartIndex - 1;

  if (prevIndex >= 0) {
    const previousSentence = sentenceData[prevIndex].text;

    quoteArray.unshift(previousSentence);
    currentStartIndex = prevIndex;

    updateQuoteDisplay();
    announceQuote(`Earlier passage added. ${previousSentence}`);
  } else {
    announceQuote('You have reached the beginning of the text.');
  }
}

function updateQuoteDisplay() {
  document.getElementById('quote-display').innerHTML =
    quoteArray.join(' ');
}

function announceQuote(message) {
  document.getElementById('quote-announcement').textContent =
    message;
}


// ─────────────────────────────────────────────────────────────
// 5. Wire up the buttons (single DOMContentLoaded handler)
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const submit = document.querySelector('input[type="submit"]');

  submit.addEventListener('click', (event) => {
    event.preventDefault();
    getRandomQuote(); // Generate a new quote
  });

  document.getElementById('incrementButton').addEventListener('click', addNextQuote);
  document.getElementById('decrementButton').addEventListener('click', addPreviousQuote);
});
