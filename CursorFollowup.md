# Generate Report

We're going to add a new page for generating reports. This will be accessible from the `/results` page, with a button "Create Report" at the top which will navigate to the report page. This will pass the AnalysisData and the StatResult objects to the report page.

The purpose of this page is to use LLM to generate a report from the AnalysisData and StatResult objects. The report should be a markdown document with embedded graph images. We'll start off with Manual mode, which will get info from the user about what they want in the report before generating it.

## Tech stack

For our LLM, let's design with OpenAI to start with. However, we'll want to support other LLMs in the future like ANthropic, so make sure it's designed in a modular and extensible way.

In general, prioritize extensibility and modularity over brevity in the code. If at any point you don't know how to do something, ask me.

Check for a valid apikey before allowing the user to generate anything. Provide a place for them to add their apikey if they haven't got an OpenAI one (again, make sure this is designed so that once we add Anthripic, they can add a key for that too and move forward without needing an OpenAI one). However there should generally already be apikeys provided, see @ApiKeyManager.tsx

## Steps

There's a few stages here:

1. Manual configuration: Get user info about what they want in the report
2. Data consolidation: Consolidate the user info, the AnalysisData, and the StatResult objects into a body of information for the LLM
3. Outline generation:Generate an outline for the report using an LLM
4. Confirmation: Confirm the outline with the user
4. Graph selection: For each section of the outline, ask the LLM what graphs it wants to include. Use toolcalls for this, so the LLM can select the exact graph (type and data axes) it wants to create images for.
5. Image creation: Create the graph images
6. Section generation: For each section, get the LLM to generate the markdown for the section (including [!graphId.png] tags to place the graphs)
7. Report compilation: Combine the markdown with the graph images into a final report

### Manual configuration

To get the info from the user, we'll use a wizard with a similar form to the ExperimentCreator component @ExperimentCreator.tsx. This should ask the user for the following info:

- Report title
- Author name
- Report style
- Motivation
- Data analysis focus
- Audience
- Key findings
- Recommendations
- Next steps

Report style should allow the user to select a style from a list of predefined styles or define from scratch. If they select a predefined style, it should show the style prompt to the user and let them edit it if they want. Our predefined styles, to start, should include 'Academic paper' and 'Blog post'.

Motivation gives the user a large text box to explain the motivation behind the analysis/report. Ask some guiding questions to help the user explain their motivation.

Data analysis focus should display the StatResult info, like in the 'All Results' Main Effects and Interactions sections @StatisticalInfo.tsx. The user can then select which specific ones they want to icnlude in the report. Significant effects and interactions should be automatically selected, but the user should be able to change what's selected. Should also provide a general "discuss insignificant results" option.

Audience, Key findings, recommendations, and next steps should all be text boxes where the user can explain their thoughts. User can leave these empty, but remind them that the report will be better if they provide some information.


### Data consolidation

Once we know what the user wants in the report, we consolidate all the info we have into something that's useful for the LLM, that we can reuse across the LLM call steps. This should include: 

* Inform model that we're trying to generate a report with `style`
* Description of the experiment process - describe how we structure experiments in general, that this is a factorial anova experiment, generally walk the model through how we've put together the experiment and the analysis that's available
* The specific experiment configuration: what the different models and factors are, what the level prompts are, sample of the prompt noise, etc.
* the motivation, audience, key findings, recommendations, and next steps from the user
* Data: get information from the StatResult objects based on the user's selections. Format this nicely for the LLM - we've already got the `naturalLanguageDescription` for each Stat Result to give it, but we should make sure the LLM gets ALL the useful information it could possibly have.

This gives us the `ReportBackgroundData`. It should probably be a string.



### Outline generation

Once the user's provided the information we need, we generate an outline for the report. We use the `ReportBackgroundData` to generate an outline. We go to the LLM and ask it to generate an outline in a structured format, and to return it as a JSON object. This should include report title, author name, sections, sub-sections, and a description for each. Make sure the response from the LLM is in the correct format.

Stream the outline to the UI as it's generated so the user has visual feedback on the progress. At the end, we should have a `ReportOutline` object that contains the outline.


### Confirmation

Once the outline is generated, we display it to the user for confirmation. Show the outline in a way that the user can delete sub/sections, add sub/sections, and edit the description for each. 

Once the user confirms the outline, we should have a `ReportOutline` object that contains the outline.

### Graph selection

For each section of the outline, ask the LLM what graphs it wants to include. Use toolcalls for this, so the LLM can select the exact graph (type and data axes) it wants to create images for. Provide the LLM with the `ReportBackgroundData` and the `ReportOutline`, while specifying what section of the outline it should be generating graphs for.

We've got a file @graphImageExport.tsx that has the graph-creation functions, so we can use that to define what toolcalls are available to the LLM. However, we might want to create a wrapper (or wrappers) so that the LLM only needs to specify the least amount of information possible. Make it very clear what data axes are actually available for each graph type; the LLM can't ask for data axes that aren't available. We should use an enum for this. 

It's also important that the LLM knows in the next step what graphs it's created, so we probably want the LLM to generate the filenames and graph titles. Remind the LLM that the graph titles should match the style of the report. We possibly also want to ask the LLM to generate the alt text/captions for the graphs.

For example, here's a possible definition for a bar graph toolcall:

```typescript
const generateBarGraphSpec = {
  name: "generate_bar_graph",
  description: "Generates a bar graph using specified x and y access data, with a title, file name, and caption.",
  parameters: {
    type: "object",
    properties: {
      xAccessData: {
        type: "string",
        enum: ["model", "my mood", "model mood"],
        description: "Data source for the x-axis."
      },
      yAccessData: {
        type: "string",
        enum: ["word count", "emoji rate"],
        description: "Data source for the y-axis."
      },
      graphTitle: {
        type: "string",
        description: "Title of the graph."
      },
      graphFileName: {
        type: "string",
        description: "File name to save the graph."
      },
      graphDescription: {
        type: "string",
        description: "Description of the graph."
      },
      graphCaption: {
        type: "string",
        description: "Caption to be included with the graph."
      }
    },
    required: ["xAccessData", "yAccessData", "graphTitle", "graphFileName", "graphCaption"]
  }
};
```

Note that we'd also need to create the wrapper function that this toolcall represents.

Remind the LLM that it doesn't need to generate any graphs if it doesn't think a section needs any graphs - but that it can include as many as it thinks are appropriate. It should be reasonable.

Have some UI feedback here to let the user know that the LLM is working on generating the graphs - feedback of when we're waiting for the LLM, and then feedback like "No graphs needed for Section: Introduction" or "Boxplot graph requested for Section: Analysis" or something.


### Image creation

Create the images based on the toolcalls. This will require some wrapper functions; both the graph generation wrapper functions that are geared towards what data we want to provide to the LLM, and a function that takes the toolcall response and actually uses that to call the selected tools specified by the LLM.

We'll need to keep these images handy to use in the report generation step. 


### Section generation

Now we'll go to the LLM and ask it to generate the markdown for each section. We'll provide the LLM with the `ReportBackgroundData`, the `ReportOutline`, and also let it know what graphs are available for that section. It should use the graph filenames to embed the graphs in the markdown. Make sure to let the LLM know what sub/section it's generating markdown for. If it's generating markdown for a section, it shouldn't generate the subsections - we'll do that separately. We also need to make sure that the LLM only outputs the markdown for the section, without any leading text or other commentary.

Stream the markdown to the UI as it's generated so the user has visual feedback on the progress.


### Report compilation

At this point we should have:

- Graph images
- Markdown for each section and subsection

Now we need to put this together to create the final report. We combine all the markdown in the correct order, and embed the graph images in the markdown. 

We'll also insert a section at the beginning of the report with the report title, author name, and a table of contents. We'll add 'shebecoding' and the LLM model as additional authors, and credit "Created with shebetesting.com" as the creator.


# Composer Response

## Potential Improvements and Questions

### API Key Management:
The current ApiKeyManager supports multiple providers, but you might want to consider a more dynamic approach where providers can be added/removed without changing the component structure.
Consider adding a way to test API keys before proceeding with report generation.
- good idea, quietly test the apikey and don't let the user try to generate anything until they provide a valid one

### Error Handling:
There's no explicit mention of error handling for LLM API calls. What happens if an API call fails during report generation?
Consider adding retry mechanisms and graceful fallbacks.
- exponential backoff, fail completely after 5 consecutive failures

### State Management:
How will you manage state across the different steps of the report generation process?
Consider using a state machine or a context provider to manage the complex state transitions.
- please work this out

### Performance Considerations:
For large reports with many graphs, generating all the images might be resource-intensive.
Consider implementing lazy loading or pagination for graph generation.
- eh we do need to generate all the images, but we can do it in parallel with the Section generation step

### Caching Strategy:
Will you cache LLM responses and generated graphs to avoid regenerating them if the user goes back and forth in the wizard?
This could save on API costs and improve user experience.
- User can't go back and forth in the wizard after the LLM's started generating. They go through the initial wizard, then they click 'generate outline', they can't edit any of the initial data. Once they've confirmed the outline, the user can't edit anything else.

### Toolcall Implementation:
The toolcall approach for graph selection is good, but ensure the LLM understands the available data axes clearly.
Consider providing a schema validation step to ensure the LLM's toolcall responses are valid.
- please see llm-documentation/openai-toolcall.md for OpenAi's documentation on toolcalls. Yes, you should provide schema validation and make sure the LLM is only given the available data axes.


### Report Export Options:
Consider adding options to export the report in different formats (PDF, HTML, etc.) beyond just markdown.
Allow users to save/load report configurations similar to experiment configurations.
- yes, export pdf. They can't download pure markdown - they can only download the folder with the markdown and images.

### Streaming Implementation:
How will you implement streaming for the LLM responses? Will you use server-sent events, websockets, or another approach?
Make sure the UI provides clear feedback during streaming.
- Please work this out based on what the LLM provider supports. Please see llm-documentation/openai-streaming.md for more information on how OpenAI does this.

### Unclear Aspects

### Graph Storage:
Where and how will the generated graph images be stored? Will they be stored in the browser, or will you use a server?
If browser-only, consider limitations on storage size and persistence.
- Please work this out. We don't realy have a server, so this will need to be done in the browser.

### Report Persistence:
Will reports be saved for later viewing? If so, where and in what format?
Consider adding a report history feature.
- We won't save the reports, but make sure that the user can download them. Keep track of a `ReportBuilder` object that contains the report outline, the sections, and the images references - the user should be able to download this as a json at any point.

### LLM Context Window Limitations:
For complex experiments with large datasets, you might hit context window limitations.
Consider strategies for chunking data or summarizing it before sending to the LLM.
- This is why we're using the outline structure.

### Markdown Rendering:
How will the final markdown with embedded images be rendered in the UI?
Consider using a markdown renderer that supports image embedding.
- I don't know. Please work this out. If you don't know of a way, then give me alternative suggestions that would work.

### Suggested Additions

### Report Templates:
Consider adding predefined report templates beyond just styles (e.g., executive summary, detailed analysis, etc.).
Allow users to save and reuse their own templates.
 - good idea, but let's skip this for now.

### Collaborative Features:
Add options for sharing reports or collaborating on report creation.
Consider adding comment/feedback functionality.
- we'll want the user to be able to download the report as a folder (markdown and images) or as a PDF

### Progressive Enhancement:
Start with a simpler version that generates the entire report in one go, then add the more complex staged approach.
This allows for faster initial implementation while still working toward the full vision.
- problem with this is that models have limited output length, so we want to use the outline structure to get around that

### Versioning:
Add versioning for reports so users can see how their reports have evolved.
Allow comparing different versions of the same report.
- nah, let's skip this

### Accessibility Considerations:
Ensure the generated reports are accessible (proper alt text for images, semantic HTML, etc.).
The LLM should be instructed to generate accessible content.
- nah, let's skip this

### Implementation Recommendations
Create a clear interface for the LLM service that abstracts away provider-specific details.
Implement a robust state management solution for the multi-step process.
Start with a simplified version of the report generation process to get feedback early.
Add comprehensive error handling and user feedback throughout the process.
Consider implementing a preview mode for each step so users can see what they're getting.
- all sounds good. The preview mode should be covered by the streaming implementation, and the ability to edit the report outline.