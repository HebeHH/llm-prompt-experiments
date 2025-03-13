import { LLMProvider } from '@/lib/types/llm';
import { ReportOutline, GraphImageSpec } from '@/lib/types/report';

// Define the base LLM service interface
export interface LLMService {
  generateOutline(
    reportBackgroundData: string,
    onProgress?: (text: string) => void
  ): Promise<ReportOutline>;
  
  selectGraphs(
    reportBackgroundData: string,
    reportOutline: ReportOutline,
    sectionTitle: string,
    availableDataAxes: string[],
    onProgress?: (text: string) => void
  ): Promise<GraphImageSpec[]>;
  
  generateSectionContent(
    reportBackgroundData: string,
    reportOutline: ReportOutline,
    sectionTitle: string,
    availableGraphs: GraphImageSpec[],
    onProgress?: (text: string) => void
  ): Promise<string>;
  
  isApiKeyValid(): Promise<boolean>;
}

// Factory function to create the appropriate LLM service
export function createLLMService(
  provider: LLMProvider,
  apiKey: string
): LLMService {
  switch (provider) {
    case 'openai':
      return new OpenAIService(apiKey);
    case 'anthropic':
      // For future implementation
      throw new Error('Anthropic support is coming soon');
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// OpenAI implementation
class OpenAIService implements LLMService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private model = 'gpt-4o';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async isApiKeyValid(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }
  
  async generateOutline(
    reportBackgroundData: string,
    onProgress?: (text: string) => void
  ): Promise<ReportOutline> {
    const systemPrompt = `
You are an expert report writer tasked with creating an outline for a report based on experimental data.
The report should follow the style specified and include all relevant information from the data provided.
Your task is to generate a structured outline with sections and subsections.

The outline should be returned as a JSON object with the following structure:
{
  "title": "Report Title",
  "authorName": "Author Name",
  "sections": [
    {
      "title": "Section Title",
      "description": "Brief description of what this section will cover",
      "subsections": [
        {
          "title": "Subsection Title",
          "description": "Brief description of what this subsection will cover"
        }
      ]
    }
  ]
}

Make sure to include:
1. An introduction section
2. Sections covering the methodology
3. Sections covering the results, focusing on statistically significant findings
4. A discussion section interpreting the results
5. A conclusion section with recommendations and next steps

The outline should be comprehensive but focused on the most important aspects of the data.
    `.trim();
    
    const userPrompt = `
Please create an outline for my report based on the following information:

${reportBackgroundData}

Return the outline as a JSON object as specified.
    `.trim();
    
    let accumulatedText = '';
    let jsonStarted = false;
    let jsonText = '';
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                accumulatedText += content;
                
                // Check if we've started receiving JSON
                if (content.includes('{') && !jsonStarted) {
                  jsonStarted = true;
                  jsonText = content.substring(content.indexOf('{'));
                } else if (jsonStarted) {
                  jsonText += content;
                }
                
                if (onProgress) {
                  onProgress(accumulatedText);
                }
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
      
      // Extract the JSON object from the accumulated text
      const jsonMatch = accumulatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from response');
      }
      
      const jsonString = jsonMatch[0];
      return JSON.parse(jsonString) as ReportOutline;
      
    } catch (error) {
      console.error('Error generating outline:', error);
      throw error;
    }
  }
  
  async selectGraphs(
    reportBackgroundData: string,
    reportOutline: ReportOutline,
    sectionTitle: string,
    availableDataAxes: string[],
    onProgress?: (text: string) => void
  ): Promise<GraphImageSpec[]> {
    const systemPrompt = `
You are an expert data visualization assistant tasked with selecting appropriate graphs for a report section.
Based on the report background data and the outline, you will determine what graphs (if any) should be included in a specific section.

You can use the following graph types:
- bar: Bar chart for comparing categories
- stackedBar: Stacked bar chart for comparing parts of a whole across categories
- groupedBar: Grouped bar chart for comparing multiple variables across categories
- line: Line chart for showing trends over a continuous variable
- scatter: Scatter plot for showing relationships between two continuous variables
- boxplot: Box plot for showing distribution statistics
- radar: Radar chart for comparing multiple variables

For each graph, you must specify:
- graphType: The type of graph (from the list above)
- xAxis: The data to use for the x-axis (must be one of the available data axes)
- yAxis: The data to use for the y-axis (must be one of the available data axes)
- colorAxis: (Optional) The data to use for color grouping (must be one of the available data axes)
- title: A descriptive title for the graph
- fileName: A unique filename for the graph (e.g., "model-comparison-boxplot.png")
- caption: A detailed caption explaining what the graph shows
- description: (Optional) Additional description or analysis of the graph

Return your selections as a JSON array of graph specifications.
If no graphs are needed for this section, return an empty array.
    `.trim();
    
    const userPrompt = `
I need to select appropriate graphs for the "${sectionTitle}" section of my report.

Report Background Data:
${reportBackgroundData}

Report Outline:
${JSON.stringify(reportOutline, null, 2)}

Available Data Axes:
${availableDataAxes.join(', ')}

Please select appropriate graphs for this section. Return your selections as a JSON array of graph specifications.
If no graphs are needed for this section, return an empty array.
    `.trim();
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      let accumulatedText = '';
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                accumulatedText += content;
                
                if (onProgress) {
                  onProgress(accumulatedText);
                }
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
      
      // Extract the JSON array from the accumulated text
      const jsonMatch = accumulatedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // If no JSON array is found, it might mean no graphs are needed
        if (accumulatedText.includes('[]') || accumulatedText.includes('"graphs": []')) {
          return [];
        }
        throw new Error('Failed to extract JSON from response');
      }
      
      const jsonString = jsonMatch[0];
      return JSON.parse(jsonString) as GraphImageSpec[];
      
    } catch (error) {
      console.error('Error selecting graphs:', error);
      throw error;
    }
  }
  
  async generateSectionContent(
    reportBackgroundData: string,
    reportOutline: ReportOutline,
    sectionTitle: string,
    availableGraphs: GraphImageSpec[],
    onProgress?: (text: string) => void
  ): Promise<string> {
    // Find the section in the outline
    let section = reportOutline.sections.find(s => s.title === sectionTitle);
    
    // If not found, check if it's a subsection
    if (!section) {
      for (const mainSection of reportOutline.sections) {
        const subsection = mainSection.subsections.find(sub => sub.title === sectionTitle);
        if (subsection) {
          // Use the subsection as the section
          section = {
            title: subsection.title,
            description: subsection.description,
            subsections: []
          };
          break;
        }
      }
    }
    
    // If still not found, handle special cases
    if (!section) {
      if (sectionTitle === 'Background') {
        // Create a default Background section
        section = {
          title: 'Background',
          description: 'Provides background information about the experiment and its context.',
          subsections: []
        };
      } else {
        throw new Error(`Section "${sectionTitle}" not found in the outline`);
      }
    }
    
    const systemPrompt = `
You are an expert report writer tasked with generating content for a specific section of a report.
The report is based on experimental data and follows a specific style.

Your task is to generate the content for the "${sectionTitle}" section.
This section should cover: ${section.description}

If subsections are defined for this section, you should NOT generate content for those subsections - they will be handled separately.
Focus only on the main content for this section.

If graphs are available for this section, you can include them using the format [!filename.png] where filename.png is the filename of the graph.
For example, to include a graph with filename "model-comparison.png", you would write [!model-comparison.png] at the appropriate place in your text.

Your content should be in Markdown format. Use appropriate headings, lists, emphasis, etc.
Start the section with a level 2 heading (##) for the section title.

The content should be comprehensive, accurate, and follow the specified style.
    `.trim();
    
    const userPrompt = `
Please generate content for the "${sectionTitle}" section of my report.

Report Background Data:
${reportBackgroundData}

Section Description:
${section.description}

Available Graphs:
${JSON.stringify(availableGraphs, null, 2)}

Generate the content in Markdown format, starting with a level 2 heading for the section title.
    `.trim();
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      let accumulatedText = '';
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                accumulatedText += content;
                
                if (onProgress) {
                  onProgress(accumulatedText);
                }
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
      
      return accumulatedText;
      
    } catch (error) {
      console.error('Error generating section content:', error);
      throw error;
    }
  }
} 