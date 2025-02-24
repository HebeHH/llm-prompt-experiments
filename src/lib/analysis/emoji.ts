import { AnalysisConfig } from '../types/analysis';

export const emojiAnalysisConfig: AnalysisConfig = {
    name: 'Emoji Analysis',
    description: 'Analyzes the usage of emojis in responses from different LLM models with different response styles.',
    models: [
        {
            name: 'claude-3-sonnet-20240229',
            provider: 'anthropic',
        },
        {
            name: 'gemini-1.0-pro',
            provider: 'google',
        },
        {
            name: 'gpt-4-turbo-preview',
            provider: 'openai',
        },
    ],
    promptCategories: [
        {
            name: 'style',
            categories: [
                {
                    name: 'LinkedIn post',
                    prompt: 'Write your response in the form of a LinkedIn post.',
                },
                {
                    name: 'Tweet',
                    prompt: 'Write your response in the form of a Tweet.',
                },
                {
                    name: 'default',
                    prompt: '',
                },
            ],
        },
        {
            name: 'useEmojis',
            categories: [
                {
                    name: 'Use Emojis',
                    prompt: 'Go wild with the emojis.',
                },
                {
                    name: 'default',
                    prompt: '',
                },
            ],
        },
        {
            name: 'mood',
            categories: [
                {
                    name: 'Happy',
                    prompt: 'Be excited!',
                },
                {
                    name: 'Sad',
                    prompt: 'Be Sad!',
                },
            ],
        },
    ],
    promptVariables: [
        'How many whales are there in the ocean?',
        'How can I get better at writing?',
    ],
    responseAttributes: [
        {
            name: 'emojiCount',
            function: (response: string) => {
                const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
                const matches = response.match(emojiRegex);
                return matches ? matches.length : 0;
            },
        },
        {
            name: 'uniqueEmojiCount',
            function: (response: string) => {
                const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
                const matches = response.match(emojiRegex);
                if (!matches) return 0;
                return new Set(matches).size;
            },
        },
        {
            name: 'emojiDensity',
            function: (response: string) => {
                const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
                const matches = response.match(emojiRegex);
                const emojiCount = matches ? matches.length : 0;
                const words = response.split(/\s+/).length;
                return words > 0 ? emojiCount / words : 0;
            },
        },
    ],
    promptFunction: (categories: string[], variable: string) => {
        return `${variable} ${categories.filter(Boolean).join(' ')}`.trim();
    },
}; 