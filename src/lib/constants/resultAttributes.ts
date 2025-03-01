import { ResponseVariable } from '@/lib/types/analysis';

export const resultAttributes: ResponseVariable[] = [
  {
    name: 'Word Count',
    description: 'Counts the number of words in the response',
    type: 'simple',
    dataType: 'numerical',
    function: (response: string) => {
      const words = response.match(/\b\w+\b/g);
      return words ? words.length : 0;
    },
  },
  {
    name: 'Word Occurrence',
    description: 'Counts occurrences of a specific word or phrase in the response',
    type: 'word-occurrence',
    dataType: 'numerical',
    function: (response: string, config: { searchTerm: string }) => {
      const regex = new RegExp(config.searchTerm, 'gi');
      const matches = response.match(regex);
      return matches ? matches.length : 0;
    },
  },
  {
    name: 'Sentiment Analysis',
    description: 'Analyzes the sentiment of the response using Jigsaw API (max 2000 chars)',
    type: 'sentiment-api',
    dataType: 'categorical',
    requiresApiCall: true,
    function: async (response: string, config?: { apiKey: string }) => {
      try {
        if (!config?.apiKey) {
          throw new Error('Jigsaw API key not provided');
        }

        // Trim response to 2000 characters if longer
        const trimmedResponse = response.length > 2000 
          ? response.slice(0, 1997) + '...' 
          : response;

        const result = await fetch('https://api.jigsawstack.com/v1/ai/sentiment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
          },
          body: JSON.stringify({ text: trimmedResponse }),
        });

        if (!result.ok) {
          throw new Error(`API request failed with status ${result.status}`);
        }

        const data = await result.json();
        if (!data.success) {
          throw new Error('API request was not successful');
        }

        return data.sentiment.emotion;
      } catch (error) {
        console.error('Sentiment analysis failed:', error);
        return 'unknown';
      }
    },
  },
  {
    name: 'Emoji Count',
    description: 'Counts the number of emojis in the response',
    type: 'simple',
    dataType: 'numerical',
    function: (response: string) => {
      const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
      const matches = response.match(emojiRegex);
      return matches ? matches.length : 0;
    },
  },
  {
    name: 'Emoji Rate',
    description: 'Counts the number of emojis in the response',
    type: 'simple',
    dataType: 'numerical',
    function: (response: string) => {
      const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
      const matches = response.match(emojiRegex);
      return matches ? matches.length / response.length : 0;
    },
  },
  {
    name: 'Character Count',
    description: 'Counts the total number of characters in the response',
    type: 'simple',
    dataType: 'numerical',
    function: (response: string) => response.length,
  },
  {
    name: 'Sentence Count',
    description: 'Counts the number of sentences in the response',
    type: 'simple',
    dataType: 'numerical',
    function: (response: string) => {
      const sentences = response.split(/[.!?]+/).filter(Boolean);
      return sentences.length;
    },
  },
  {
    name: 'Average Word Length',
    description: 'Calculates the average length of words in the response',
    type: 'simple',
    dataType: 'numerical',
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
    type: 'simple',
    dataType: 'numerical',
    function: (response: string) => {
      const words = response.match(/\b\w+\b/g);
      if (!words) return 0;
      return new Set(words.map(w => w.toLowerCase())).size;
    },
  },
]; 