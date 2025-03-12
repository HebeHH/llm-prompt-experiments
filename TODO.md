# TODO List

## Remaining tasks

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
- Add ability to save experiment configurations:
  - Save to local storage with named configurations
  - List saved configurations in a dropdown
  - Allow loading saved configurations in experiment creator
  - Add ability to load configurations from homepage (which should navigate to experiment creator with config loaded)

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