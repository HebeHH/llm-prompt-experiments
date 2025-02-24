# AI Response Analysis Dashboard

A Next.js application for analyzing responses from various AI language models. The initial implementation focuses on analyzing emoji usage patterns across different response styles, but the architecture is designed to be extensible for other types of analysis.

## Features

- Support for multiple LLM providers (Anthropic, Google, OpenAI)
- Configurable analysis parameters
- Interactive data visualization
- Extensible architecture for different types of analysis
- Real-time response processing and analysis

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn
- API keys for the LLM providers you want to use

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd emoji-testing
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your API keys:
   ```
   NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key
   NEXT_PUBLIC_GOOGLE_API_KEY=your_google_key
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app directory
├── components/            
│   ├── analysis/          # Analysis-specific components
│   └── dashboard/         # Dashboard components
├── lib/
│   ├── analysis/          # Analysis implementations
│   ├── llm/               # LLM provider implementations
│   └── types/             # TypeScript type definitions
```

## Adding New Analyses

To add a new type of analysis:

1. Define your analysis configuration in `src/lib/analysis/`:
   ```typescript
   export const myAnalysisConfig: AnalysisConfig = {
     name: 'My Analysis',
     description: 'Description of what this analysis does',
     models: [...],
     promptCategories: [...],
     promptVariables: [...],
     responseAttributes: [...],
     promptFunction: (categories, variable) => {...},
   };
   ```

2. Update the dashboard components to support your new analysis type.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
