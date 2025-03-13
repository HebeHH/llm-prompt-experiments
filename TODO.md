# TODO List

## Generate Report

We're going to add a new page for generating reports. This will be accessible from the `/results` page, with a button "Create Report" at the top which will navigate to the report page. This will pass the AnalysisData and the StatResult objects to the report page.

The purpose of this page is to use LLM to generate a report from the AnalysisData and StatResult objects. The report should be a markdown document with embedded graph images. We'll start off with Manual mode, which will get info from the user about what they want in the report before generating it.

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

Once the user's provided the information we need, we generate an outline for the report. We use the `ReportBackgroundData` to generate an outline. We go to the LLM and ask it to generate an outline in a structured format, and to return it as a JSON object. This should include sections, sub-sections, and a description for each. Make sure the response from the LLM is in the correct format.

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


### Image creation

Create the images based on the toolcalls. This will require some wrapper functions; both the graph generation wrapper functions that are geared towards what data we want to provide to the LLM, and a function that takes the toolcall response and actually uses that to call the selected tools specified by the LLM.

We'll need to keep these images handy to use in the report generation step.


### Section generation


### Report compilation






## Smol Remaining tasks

- Fix 'save Results' naming popup so the text input doesn't lose focus on keypress
- Add tooltips for configuration options
- Add confirmation dialog for resetting configuration
- Add ability to share configurations
- Add ability to import results
- Hitting 'enter' when typing in a new prompt category or variable should automatically add it
- Automatically select word count and character count as the default result attributes
- Add more hardcoded result attributes to the resultAttributes.ts file
- Add additional graph types:
  - Heatmap
  - Scatter plot
  - Line plot
  - Pie chart
- Add markdown report generation with embedded graph images
- Use more interesting colors in the UI
- Add comprehensive validation messages for all input fields
- add prices to the model cards in the Model tab of /create
- add total price to the pricing predictor component
- model tab of /create should always sort the unavailable models/providers to the bottom
- Clicking "New Experiment" is loading the experiment with the last saved configuration; it should load with default/no configuration instead.


## Recent improvement ideas

- Make the UI more responsive for different screen sizes
- Add a dark mode option
- Improve accessibility features
- Add ability to filter results in the data table
- Add the ability to annotate or add notes to specific results
- Add custom chart configurations (colors, labels, etc.)
- Add ability to save analysis results for later viewing

# Completed Tasks

- ✅ Automatically select all result attributes in 'Create Experiment' card
- ✅ Improve View Response popup (create new component for it)
- ✅ Sort Raw Results by each of the columns
- ✅ Clicking 'Run Analysis' doesn't always hide the experiment panel
- ✅ Fix API key handling in ExperimentCreator component
- ✅ Make "Raw Results" section collapsible
- ✅ Add download buttons for raw results (CSV, JSON)
- ✅ Add prompt variable tracking and display (Prompt ID column in results table)
- ✅ Update configuration modal to show numbered prompt variables
- ✅ Update analysis service to track prompt variable indices
- ✅ Add progress tracking for analysis runs
- ✅ Add retry mechanism for failed responses
- ✅ Add error handling for API key validation
- ✅ Add loading states for API calls
- ✅ Created ExperimentCreator component with all necessary sections
- ✅ Created ModelSelector component with filtering and sorting capabilities
- ✅ Created PromptCategoryEditor component with full CRUD functionality
- ✅ Created PromptVariableEditor component with default questions support
- ✅ Created ResultAttributeSelector component
- ✅ Created PricingPredictor component with token estimation
- ✅ Added result attributes from emoji analysis to constants
- ✅ Created defaultQuestions with diverse topics
- ✅ Implemented default prompt formation function
- ✅ Made all components look nice with proper styling and UX
- ✅ Integrated ExperimentCreator into main page
- ✅ Removed emoji analysis code completely
- ✅ Added multiple graph types:
  - ✅ Bar chart
  - ✅ Stacked bar chart
  - ✅ Grouped bar chart
  - ✅ Radar chart
  - ✅ Box plot
  - ✅ Histogram
- ✅ Allow users to add and remove graphs
- ✅ Allow users to customize graph axes (select different metrics for X/Y axes)
- ✅ Added graph image export functionality
- ✅ Fixed radar graph visualization issues
- ✅ Add ability to export results (CSV, JSON)
- Add ability to save experiment configurations:
  - Save to local storage with named configurations
  - List saved configurations in a dropdown
  - Allow loading saved configurations in experiment creator
  - Add ability to load configurations from homepage (which should navigate to experiment creator with config loaded)