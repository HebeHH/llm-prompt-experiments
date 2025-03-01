declare module 'groq-sdk' {
    export interface GroqConfig {
        apiKey: string;
        dangerouslyAllowBrowser?: boolean;
    }

    export interface ChatMessage {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }

    export interface ChatCompletionResponse {
        choices: Array<{
            message: {
                content: string;
            };
        }>;
    }

    export default class Groq {
        constructor(config: GroqConfig);
        chat: {
            completions: {
                create(params: {
                    model: string;
                    messages: ChatMessage[];
                }): Promise<ChatCompletionResponse>;
            };
        };
    }
} 