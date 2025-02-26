import { ResponseAttribute } from '../types/analysis';

export const resultAttributes: ResponseAttribute[] = [
  {
    name: 'Word Count',
    description: 'Counts the number of words in the response',
    function: (response: string) => {
      const words = response.match(/\b\w+\b/g);
      return words ? words.length : 0;
    },
  },
  {
    name: 'Emoji Count',
    description: 'Counts the number of emojis in the response',
    function: (response: string) => {
      const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
      const matches = response.match(emojiRegex);
      return matches ? matches.length : 0;
    },
  },
  {
    name: 'Character Count',
    description: 'Counts the total number of characters in the response',
    function: (response: string) => response.length,
  },
  {
    name: 'Sentence Count',
    description: 'Counts the number of sentences in the response',
    function: (response: string) => {
      const sentences = response.split(/[.!?]+/).filter(Boolean);
      return sentences.length;
    },
  },
  {
    name: 'Average Word Length',
    description: 'Calculates the average length of words in the response',
    function: (response: string) => {
      const words = response.match(/\b\w+\b/g);
      if (!words || words.length === 0) return 0;
      const totalLength = words.reduce((sum, word) => sum + word.length, 0);
      return totalLength / words.length;
    },
  },
  {
    name: 'Unique Word Count',
    description: 'Counts the number of unique words in the response',
    function: (response: string) => {
      const words = response.match(/\b\w+\b/g);
      if (!words) return 0;
      return new Set(words.map(w => w.toLowerCase())).size;
    },
  },
]; 