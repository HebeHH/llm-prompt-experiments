

# TODOs

## First off
* I've updated the LLMModel typespec to include the pricing. I've also added the pricing to the models in the constants/models.ts file. Make sure to update any other files that depend on the LLMModel type.

## UI Notes
* Page is not scrollable when I want to see the Analysis progress
* The View Response popup should be displayed nicer. Make a new component for it.
* The "Raw Results" section should be collapsible.
* Ability to sort the Raw Results by each of the columns
* Use more interesting colors
* There's currently three panels incolved here: Experiment Creation panel, Analysis Progress panel, and Results panel. Once the results are generated, the Analysis progress and experiment creation panels should automatically go off to the side. The user should be able to summon them back though.

## Functionality Notes
* More models: I've added a page `src/lib/constants/models.ts` that contains more models, with pricing information. Use this to update which models are available in the UI. Additionally, just above the `run analysis` button, show for each model selected the number or prompts to be used and an approximate cost. Use the metric of `tokens = 4*words/3` to estimate the cost of the input tokens (summing across all prompts) and estimate that each response will be about 500 output tokens.
* Download: Add a download button to the "Raw Results" section that downloads the results as a CSV file or a JSON file. If JSON, include the response.
* API keys: Add a section to the UI where the user can add their own API keys. Use the .env for apikeys if it's available, but otherwise require them from the user. Model's aren't selectable unless there's an API key for them (either from the .env or from the user). Show an error message on hover
* Open results in new tab: Ability to open the Results panel in a new tab, without the experiment creation and analysis progress panels. This will let the user keep track of them if they want to run multiple experiments.

## Broader Analysis Experiment Creation
Let's rework the "Emoji Analysis" card to be a "Create Experiment" card. This will let the user create different experiments in the UI, without needing to edit the code of this repo. Componenterize this so we can update parts of it without needing to do the whole thing.

There will be 4 aspects to the experiment creation:
1. Model
2. Prompt category
3. Prompt variables
4. Result attributes
6. Pricing prediction

Each of these should be an Experiment ELement section/card, and collapsible/expandable

### Model
This is pretty basic. The models available have been expanded in the `src/lib/constants/models.ts` file. 
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

The pricing prediction from earlier also goes here. It should show, for each of the SELECTED models, the pricing prediction for the experiment. 


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

The user should be able to add and remove graphs, as well as change the data axes for each graph.

* Create new graph options 
* All graph options should have the ability to select which data axes to use, and will calculate the appropriate data statistics if needed
* Ability for user to add or remove graphs from the UI (should be able to add multiple instances of the same graph)


# Done