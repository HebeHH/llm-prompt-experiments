# TODO List

✓ Automatically select all result attributes in 'Create Experiment' card
✓ Improve View Response popup (create new component for it)
✓ Sort Raw Results by each of the columns
✓ Clicking 'Run Analysis' doesn't always hide the experiment panel
✓ Fix API key handling in ExperimentCreator component

Remaining tasks:
- Make "Raw Results" section collapsible
- Add download buttons for raw results (CSV, JSON)
- Add prompt variable tracking and display (Prompt ID column in results table)
- Update configuration modal to show numbered prompt variables
- Update analysis service to track prompt variable indices
- Add progress tracking for analysis runs
- Add retry mechanism for failed responses
- Add error handling for API key validation
- Add loading states for API calls
- Add tooltips for configuration options
- Add validation messages for all input fields
- Add confirmation dialog for resetting configuration
- Add ability to save and load configurations
- Add ability to share configurations
- Add ability to export results
- Add ability to import results

# TODOs


### Next steps
* ✅ Automatically select all result attributes in the 'Create Experiment' card.
* ✅ The View Response popup should be displayed nicer. Make a new component for it.
* ✅ Ability to sort the Raw Results by each of the columns
* ✅ Clicking "Run Analysis" doesn't always hide the experiment panel
* ✅ The "Raw Results" section should be collapsible.
* ✅ Download: Add download buttons to the raw results section. We want a download CSV button which will download a CSV of just the results without the response data and then we also want a download experiment JSON button which will give a result a JSON download that contains the experiment parameters so that's the models, the prompt categories and options, the prompt variables and with the prompt categories both the category name as well as the actual prompt itself and then the full results JSON including the actual response.
* ✅ API keys: Add a section to the UI where the user can add their own API keys. Use the .env for apikeys if it's available, but otherwise require them from the user. Model's aren't selectable unless there's an API key for them (either from the .env or from the user) - they're greyed out otherwise. Please make sure to use the API keys in the .env file if they're available. 
* ✅ Let's keep track of the prompt variables better. So prompt variables is an array and then for each prompt we send off as well as keeping track of the prompt category, lLm etc. We also want to keep track of the index of the prompt variable. And this should also be displayed in the raw results table as 'Prompt ID'. Also update the "Show configuration" modal to number the prompt variables.



### Recent notes
* Hitting 'enter' when typing in a new prompt category or variable should automatically add it.
* Automatically select word count and character count as the default result attributes.
* Seeing several instances where a LLM call is failing with a status of 503, and the results are treating this like a successful request that came back with an empty response. We need a better way of handling this: retry mechanism, better error handling, etc. DON'T just treat a 503 (or any error) as a successful request. Don't add it to the results table. If we can't get a response back, that's fine - but it's not a real result.


## UI Notes


* Use more interesting colors



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

Start off by understanding the purpose of this repository; spec.md is a good place to start. However, we've then done a lot of work to make the experimental inputs configurable, so that we can use this repository for other analyses. That means we need to display data that we don't necessarily know the full structure of.

However we know the general shape:

* Models: The models are a data input axes. This is always a categorical axis.
* Prompt categories: there can be multiple different user-defined prompt category groups, each with multiple category options. These are data input. These are always categorical.
* Prompt variables: These can be ignored for data analysis.
* Result attributes: There will always be at least one response attribute, but usually more. The result attributes are data output axes. These are typically numerical axes.

So we want a graph library that can handle this: categorical input axes, numerical output axes, preferably multiple. We also want to be able to display multiple graphs at once, change the graphs around, and change what data the graphs display. Of course, within this, we need to make sure that the data type always matches the graph axes type (eg: numerical data for numerical axes, categorical data for categorical axes). We also want graphs to load in with sensible default axes, while those axis can be changed.

It's probably best to add a field `dataType: 'numerical' | 'categorical'` to the result attribute right now. Currently, the result attributes are all numerical, but we may add categorical ones eventually. 

### Previous graph discussion

The dashboard will be a bit tricky, because we could have a varying amount of data axes (depending on how many prompt categories and response attributes we have). The dashboard will have knowledge of what all the models are, what all the prompt categories are, and what all the response attributes are. It should then let users be able to add in different graphs and display different combinations of data axes on the different graphs. Let's start with the ability to have a couple of basic graphs, with the user able to select which specific data axes they want to display.

Most graphs will need to calculate summary statistics from the data axes. With the demo emoji example, if we have a box plot graph with LLM model on the x-axis and emojiCount on the y-axis, we need to calculate the quartiles, max, min and mean of the emojiCount for each LLM model. If we have a heatmap graph with LLM model on the x-axis, style on the y-axis, and emojiCount on the z-axis, we need to calculate the mean of the emojiCount for each combination of LLM model and style.

Remember that we'll be doing other analyses in the future, so we need to design the dashboard in a way that's flexible enough to handle new analyses than just the demo emoji analysis.

We can start relatively simple, with the ability to display a single graph, with the ability to select which specific data axes they want to display. We can expand this later.

The graphing library you use is up to you, but it should be able to give us good looking graphs, and have a wide range of graph types.


### General thoughts on types of graph

Another big one! More graphs! We want there to be a wide range of graphs for the userto choose from, eg:
* Box plot
* Heatmap
* Scatter plot
* Line plot
* Bar chart
* Pie chart

Wherever possible, we want to be able to have multiple axis of data for the same graph. Eg: stacked bar chart with color grouping, side-by-side bar chart with color grouping, etc, heatmap, scatterplot that allows to show two result attributes on the axes and color by an input attribute, etc.

The user should be able to add and remove graphs, as well as change the data axes for each graph. They should have a lot of flexibility in which data axes to use for which graphs

### Considerations

There's a lot of complexity with the graphs. They need to be able to be added and removed. When they're added in, they should come with sensible default axes, and we'll define what those are when the graph is added. When the data axes are changed, the graph should be updated to reflect the new data axes. this may involve calculating new summary statistics to display.

For each graph, the axes and type of axes (categorical or numerical) should be defined in the typespec. We then know what type of data to expect for each graph. We can prefill each graph with default axes according to the data type, and allow the user to change the axes depending on the data type. 

```typescript
categoricalDataAxes = ['model', 'promptCategory1', 'promptCategory2', ..., 'resultAttribute2', ...]
numericalDataAxes = ['resultAttribute1', 'resultAttribute3', ...]
```

Then when a graph is added, we can prefill the axes according to the data type. If it's got two categorical data axes and a numerical data axis, it would be prefilled with 'model', 'promptCategory1' and 'resultAttribute1'. The user can then change the axes to whatever they want, within the correct data type.

Each time a new graph is added or the data axes are changed, we may need to calculate new summary statistics to display. The top results analysis component only knows the raw data, so we'll need to make sure graph components can calculate the summary statistics they needs.

### Next steps

Our first step is going to be to take the bar chart currently displayed on the dashboard and move it into a graph component, that can be added and removed from the dashboard. We'll also create a component for a stacked bar chart, with the same functionality.

Default Bar chart Axes:
- X axes (input): model
- Y axes (output): first result attribute

Default Stacked bar chart Axes:
- X axes (input): model
- Y axes (output): first result attribute
- Color axis: first prompt category group.

Preferably the data axes should just be pulled from the top of the relevant data axes type arrays (categorical or numerical) and then be switched within that.

The user should be able to add and remove these two graphs. Let's start with just these two types of graph for now, but be aware that we'll add more types of graphs later. We may even add one with 2 numerical axes, for scatter plots, so be able to handle that (it would just use the first two result attributes).

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