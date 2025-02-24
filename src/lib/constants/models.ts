import { LLMModel } from "../types/llm"

export const models : LLMModel[] = [
        {
          "provider": "anthropic",
          "name": "claude-3-7-sonnet-20250219",
          "pricing": {
            "perMillionTokensInput": 3.00,
            "perMillionTokensOutput": 15.00
          }
        },
        {
          "provider": "anthropic",
          "name": "claude-3-5-haiku-20241022",
          "pricing": {
            "perMillionTokensInput": 0.80,
            "perMillionTokensOutput": 4.00
          }
        },
        {
          "provider": "anthropic",
          "name": "claude-3-opus-20240229",
          "pricing": {
            "perMillionTokensInput": 15.00,
            "perMillionTokensOutput": 75.00
          }
        },
        {
          "provider": "anthropic",
          "name": "claude-3-haiku-20240307",
          "pricing": {
            "perMillionTokensInput": 0.25,
            "perMillionTokensOutput": 1.25
          }
        },
        {
          "provider": "openai",
          "name": "gpt-4o",
          "pricing": {
            "perMillionTokensInput": 2.50,
            "perMillionTokensOutput": 10.00
          }
        },
        {
          "provider": "openai",
          "name": "gpt-4o-realtime-preview",
          "pricing": {
            "perMillionTokensInput": 5.00,
            "perMillionTokensOutput": 20.00
          }
        },
        {
          "provider": "openai",
          "name": "gpt-4o-mini",
          "pricing": {
            "perMillionTokensInput": 0.15,
            "perMillionTokensOutput": 0.60
          }
        },
        {
          "provider": "openai",
          "name": "gpt-4o-mini-realtime-preview",
          "pricing": {
            "perMillionTokensInput": 0.60,
            "perMillionTokensOutput": 2.40
          }
        },
        {
          "provider": "openai",
          "name": "o1",
          "pricing": {
            "perMillionTokensInput": 15.00,
            "perMillionTokensOutput": 60.00
          }
        },
        {
          "provider": "openai",
          "name": "o3-mini",
          "pricing": {
            "perMillionTokensInput": 1.10,
            "perMillionTokensOutput": 4.40
          }
        },
        {
          "provider": "openai",
          "name": "o1-mini",
          "pricing": {
            "perMillionTokensInput": 1.10,
            "perMillionTokensOutput": 4.40
          }
        },
        {
          "provider": "google",
          "name": "gemini-2.0-flash",
          "pricing": {
            "perMillionTokensInput": 0.10,
            "perMillionTokensOutput": 0.40
          }
        },
        {
          "provider": "google",
          "name": "gemini-2.0-flash-lite",
          "pricing": {
            "perMillionTokensInput": 0.075,
            "perMillionTokensOutput": 0.30
          }
        },
        {
          "provider": "google",
          "name": "gemini-1.5-flash",
          "pricing": {
            "perMillionTokensInput": 0.075,
            "perMillionTokensOutput": 0.30
          }
        },
        {
          "provider": "google",
          "name": "gemini-1.5-pro",
          "pricing": {
            "perMillionTokensInput": 1.25,
            "perMillionTokensOutput": 5.00
          }
        }
      ]