import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/styles.css';

import { bookText } from './text.js';

/*
Obtain the text of the book in a format that can be easily processed by JavaScript.
 This could be a plain text file, a JSON file, or any other format that suits your needs. 
 If you're dealing with a physical book, you might need to use OCR (Optical Character Recognition) 
 software to convert the physical text into a digital format.
*/



/*
I want to add a button that when pushed displays the next sentence in the book without
    deleting the first sentence. I want this button to be able to pushed as many times 
    as the user wants.

I want another button the will reavel the previous sentnce if the user so desires 
    with out deleting the original text and that they can add another sentence each time 
    they push the buttion.

I want the original sentence to always be in bold

I want to be able to delete the quotation marks right after thesentence or to have
the quotation marks included in the previous sentence


*/
//const bookSentences = bookText.split('.'); // Split text into sentences (adjust as needed)



const bookSentences = bookText.split('.').map(sentence => sentence.trim());
let quoteArray = [];

function getCurrentQuoteIndex(currentIndex) {
  return currentIndex % bookSentences.length;
}

function getRandomQuote() {
  const currentIndex = Math.floor(Math.random() * bookSentences.length);
  return quoteArray.push(bookSentences[currentIndex]);
}

function addNextQuote(currentIndex) {
  const nextIndex = getCurrentQuoteIndex(currentIndex + 1);
  quoteArray.push(bookSentences[nextIndex]);
  return quoteArray;
}

function addPreviousQuote(currentIndex) {
  const prevIndex = getCurrentQuoteIndex(currentIndex - 1);
  quoteArray.unshift(bookSentences[prevIndex]);
  return quoteArray;
}

let currentIndex = 0;
quoteArray = [getRandomQuote()];

function updateQuoteDisplay() {
  const quoteDisplay = document.getElementById('quoteDisplay');
  quoteDisplay.innerText = quoteArray.join('. ');
}

document.addEventListener('DOMContentLoaded', () => {
  updateQuoteDisplay();
  document.getElementById('submit').addEventListener('click', ()=> {
    quoteArray = getRandomQuote();
  });

  document.getElementById('nextQuoteButton').addEventListener('click', () => {
    quoteArray = addNextQuote(currentIndex);
   
    updateQuoteDisplay();
  });
  document.getElementById('prevQuoteButton').addEventListener('click', () => {
    quoteArray = addPreviousQuote(currentIndex);
    
    updateQuoteDisplay();
  });
});