# TODOs


### Minor notes
* Hitting 'enter' when typing in a new prompt category or variable should automatically add it.
* Automatically select word count and character count as the default result attributes.


## UI Notes
* Page is not scrollable when I want to see the Analysis progress
* The View Response popup should be displayed nicer. Make a new component for it.
* The "Raw Results" section should be collapsible.
* Ability to sort the Raw Results by each of the columns
* Use more interesting colors
* There's currently three panels incolved here: Experiment Creation panel, Analysis Progress panel, and Results panel. Once the results are generated, the Analysis progress and experiment creation panels should automatically go off to the side. The user should be able to summon them back though.

## Functionality Notes
* Download: Add a download button to the "Raw Results" section that downloads the results as a CSV file or a JSON file. If JSON, include the response.
* API keys: Add a section to the UI where the user can add their own API keys. Use the .env for apikeys if it's available, but otherwise require them from the user. Model's aren't selectable unless there's an API key for them (either from the .env or from the user). Show an error message on hover
* Open results in new tab: Ability to open the Results panel in a new tab, without the experiment creation and analysis progress panels. This will let the user keep track of them if they want to run multiple experiments.

## Broader Analysis Experiment Creation
Let's rework the "Emoji Analysis" card to be a "Create Experiment" card. This will let the user create different experiments in the UI, without needing to edit the code of this repo. Componenterize this so we can update parts of it without needing to do the whole thing.

There will be the following sections in the experiment creation UI card:
1. Model
2. Prompt category
3. Prompt variables
4. Result attributes
6. Pricing prediction

Each of these should be an Experiment ELement section/card, and collapsible/expandable

We are COMPLETELY REPLACING the Emoji Analysis experiment. After we're done here, we should be able to delete the Emoji Analysis src/lib/analysis/emoji.ts file entirely. There shouldn't be any legacy of that left; all the experiment creation should be in the new components.

### Model
I've added a page `src/lib/constants/models.ts` that contains more models, with pricing information. Use this to update which models are available in the UI. The user should be able to select multiple models to use for the experiment.

* User should be able to select multiple models.
* Improve the UI for this section
* Show the pricing for each model.
* Group by provider.
* Filter by provider and cost

### Prompt category

This is the more complex part. Users will need to be able to create new prompt categories, name them, then add the category options (name and prompt).
* Ability to add and name new prompt categories
* Ability to add new options to existing prompt categories (name and prompt)
* Ability to delete options from existing prompt categories
* Ability to delete prompt categories
* Make the UI look nice

### Prompt variables
Here the user will have the option to use the default questions, or add their own.
* Ability to use default questions from src/lib/constants/defaultQuestions.ts. 
* Ability to select specific default questions and/or just set the number of questions to use (eg: 3)
* Ability to add new prompt variables
* Ability to delete prompt variables
* Make the UI look nice

### Default Prompt Formation Function

The experiment will no longer take in a function for how to stitch together the prompts. Instead, we'll have a default prompt formation function that just appends the prompt elements together, with a new line between each element.

Eg:

```typescript
function createPrompt( promptCategoryOptions: string[], promptVariable: string,) {
    return `${promptCategoryOptions.join("\n")}\n${promptVariable}`
}

// Example usage
const promptElements = {
    promptCategoryOptions: ["Write in the style of a LinkedIn post", "Be brief."],
    promptVariable: "How many whales are there?"
}
const prompt = createPrompt(promptElements.promptCategoryOptions, promptElements.promptVariable)
// prompt = "Write in the style of a LinkedIn post\nBe brief.\nHow many whales are there?"
```

### Result attributes
Users can't create new result attributes from the UI. This means we'll need to create an array of result attributes, each with the following properties:
* Name
* Description
* Function

To get this started, we'll just use the existing result attributes from the Emoji Analysis src/lib/analysis/emoji.ts file.
1. Add the result attributes to the src/lib/constants/resultAttributes.ts file.
2. Add the result attributes to the UI.
3. Allow the user to select which result attributes to use in the analysis.
4. (eventual) Add more hardcoded result attributes
5. Make the UI look nice

### Pricing prediction
Additionally, just above the `run analysis` button, show for each model selected the number or prompts to be used and an approximate cost. It should show, for each of the SELECTED models, the pricing prediction for the experiment.  Use the metric of `tokens = 4*words/3` to estimate the cost of the input tokens (summing across all prompts) and estimate that each response will be about 500 output tokens.



## Expand Result Attributes

Once the Result Attributes section is added in properly, we can add more to the src/lib/constants/resultAttributes.ts file. Let's leave this until after everything else is working, because it'll be the biggest ongoing part. It's not urgent for now.


## Additional Graphs

Another big one! More graphs! We want there to be a wide range of graphs for the userto choose from, eg:
* Box plot
* Heatmap
* Scatter plot
* Line plot
* Bar chart
* Pie chart

Wherever possible, we want to be able to have multiple axis of data for the same graph. Eg: stacked bar chart with color grouping, side-by-side bar chart with color grouping, etc, heatmap, scatterplot that allows to show two result attributes on the axes and color by an input attribute, etc.

The user should be able to add and remove graphs, as well as change the data axes for each graph. They should have a lot of flexibility in which data axes to use for which graphs

* Create new graph options 
* All graph options should have the ability to select which data axes to use, and will calculate the appropriate data statistics if needed
* Ability for user to add or remove graphs from the UI (should be able to add multiple instances of the same graph)


# Done
* Created ExperimentCreator component with all necessary sections
* Created ModelSelector component with filtering and sorting capabilities
* Created PromptCategoryEditor component with full CRUD functionality
* Created PromptVariableEditor component with default questions support
* Created ResultAttributeSelector component
* Created PricingPredictor component with token estimation
* Added result attributes from emoji analysis to constants
* Created defaultQuestions with diverse topics
* Implemented default prompt formation function
* Made all components look nice with proper styling and UX
* Integrated ExperimentCreator into main page
* Removed emoji analysis code completely