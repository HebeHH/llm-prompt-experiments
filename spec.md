## Overall Purpose

Run queries agains various AI models, analyze the responses, and display the results in a dashboard.

First analysis will be focused on the following: ask questions that request the response in different styles, then analyze how many emojis are in the responses.

However we want this to be generalizable going forward, with the ability to use other prompts and analyze other attributes of the responses.


## Tech Stack

- Node
- Next.js
- Tailwind CSS
- TypeScript

We'll need two main components to this project:
1. A component that will request responses from an LLM provider.
2. A component that will analyze the responses and display the results in a dashboard.

These should possibly share metadata, such as the prompts used, the responses, and the analysis.

Will need support to request responses from various LLM providers:
- OpenAI
- Anthropic
- Gemini


## Prompts and data to analyze

### A specific example: Initial Emoji Analysis

The prompts for the emoji analysis will have two parts:
1. A question
2. Request for a response in a specific style

For example:
```typescript
const question = "What is the weather in Tokyo?";
const responseStyle = "Provide a response in the form of a LinkedIn post";
const responseLength = "Be Brief.";

const prompt = `${question} ${responseStyle} ${responseLength}`;
```

This will then be used to generate a response from the LLM.

Here we've got a couple of data elements:
1. The LLM model used: this is a major axis of data
2. The "question" part of the prompt
3. The "style" part of the prompt
4. The response from the LLM

Of these, the LLM model, the "style" and the "length" prompt parts are the two major input variables. The LLM response is the output variable. The "question" part of the prompt is used as a mechanism that allows us to generate additional data points from the same combination of inputs, to get greater certainty in the analysis - but it's not itself a data point that we're interested in. 

The LLM response output variable can be broken down into specific attributes that we can analyze. In this case, we're interested in:
1. The total number of emojis in each response.
2. The number of unique emojis in each response.
3. The rate/proportion of emojis in each response (Eg: the total number of emojis divided by the total number of words in the response)

We might have further attributes that we can analyze, but this will do for now.

### Generalizing data analysis

This gives us a model of what our data considerations will be for anything we want to analyze.

In general, there's a couple of data elements that are available:
1. The LLM model used: this is always a major axis of data
2. Prompt categories: these are major axes of data. The style/emoji analysis only has two (style and length). Other analyses may have more or less.
3. Response: The response from the LLM, which can be broken down into different attributes depending on the analysis.
4. Prompt variables: This is variable data that is used to generate enough prompts/responses to get a good sample size for the analysis, but is not itself a data point that we're interested in.

The LLM models will be constant, but the prompt categories, response attributes, and prompt variables will vary depending on the analysis. We should create a structure that's able to take in multiple layers of prompt categories, as well as a list of prompt variables, as well as a function for how prompt categories and variables are combined to generate prompts. Then for each new analysis, we can create new prompt categories, response attributes, and prompt variable list, as well as a function for how prompt categories and variables are combined to generate prompts.

From here, our program should take the prompt categories, prompt variables, and the function for how prompt categories and variables are combined to generate prompts, and use this to generate a list of prompts. It should then take the list of prompts, and use the LLM providers to generate a list of responses. For each response, it should know which LLM model and which prompt categories where used. 

After we have a list of responses, we can then analyze them using the response attributes. We should be able to take in an array of response attribute generating functions and apply them to each response to generate a list of response attributes. 

For each response, we'd then have:
1. LLM model
2. Prompt categories
3. Response attributes

We can then use this data to analyze the responses and display the results in a dashboard.


### Initial Emoji Analysis Inputs

So for instance, the initial emoji analysis inputs would be:

```typescript
const llmModels = [
    {
        name: "sonnet-3.5-latest",
        provider: "anthropic",
    },
    {
        name: "gemini-1.5-flash",
        provider: "google",
    },
]

const promptCategories = [
    {
        name: "style",
        categories: [
            {
                name: "LinkedIn post",
                prompt: "Write your response in the form of a LinkedIn post.",
            },
            {
                name: "Tweet",
                prompt: "Write your response in the form of a Tweet.",
            },
            {
                name: "default",
                prompt: "",
            }
        ],
    },
    {
        name: "length",
        categories: [
            {
                name: "short",
                prompt: "Be brief.",
            },
            {
                name: "long",
                prompt: "Be long.",
            },
            {
                name: "default",
                prompt: "",
            }
        ],
    },
]

const promptVariables = [
    "How many whales are there in the ocean?",
    "How can I get better at writing?",
]

const promptFunction = (cat1, cat2, var) => {
    return `${cat1} ${cat2} ${var}`;
}

const responseAttributes = [
    {
        name: "emojiCount",
        function: (response) => response.match(/[^\p{L}\p{N}\s]/gu).length,
    },
    {
        name: "uniqueEmojiCount",
        function: (response) => [...new Set(response.match(/[^\p{L}\p{N}\s]/gu))].length,
    },
    {
        name: "emojiProportion",
        function: (response) => response.match(/[^\p{L}\p{N}\s]/gu).length / response.length,
    },
]
```

Our program should then:
1. Generate a list of prompts by combining the prompt categories and prompt variables using the prompt function. This should be done for each combination of prompt categories and prompt variables. In this case, we'd have 3 * 3 * 2 = 18 prompts.
2. Use the LLM providers to generate a list of responses for each prompt. Use each LLM for each prompt. In this case, we'd have 2 * 18 = 36 responses.
3. Analyze the responses using the response attributes.
4. For each response, store the LLM model, prompt categories, and response attributes.
5. Display the results in a dashboard.


## Dashboard

The dashboard will be a bit tricky, because we could have a varying amount of data axes (depending on how many prompt categories and response attributes we have). The dashboard will have knowledge of what all the models are, what all the prompt categories are, and what all the response attributes are. It should then let users be able to add in different graphs and display different combinations of data axes on the different graphs. Let's start with the ability to have a couple of basic graphs, with the user able to select which specific data axes they want to display.

Most graphs will need to calculate summary statistics from the data axes. With the demo emoji example, if we have a box plot graph with LLM model on the x-axis and emojiCount on the y-axis, we need to calculate the quartiles, max, min and mean of the emojiCount for each LLM model. If we have a heatmap graph with LLM model on the x-axis, style on the y-axis, and emojiCount on the z-axis, we need to calculate the mean of the emojiCount for each combination of LLM model and style.

Remember that we'll be doing other analyses in the future, so we need to design the dashboard in a way that's flexible enough to handle new analyses than just the demo emoji analysis.

We can start relatively simple, with the ability to display a single graph, with the ability to select which specific data axes they want to display. We can expand this later.

The graphing library you use is up to you, but it should be able to give us good looking graphs, and have a wide range of graph types.

## LLM Calling

Make a library that can be used to call the LLM providers with the correct parameters. Multiple LLM providers will be supported, and the library should be able to be extended to support new LLM providers. 

The library should be able to call the LLM providers with the correct parameters. It should also be able to handle the LLM providers' rate limits. Try only calling one time per model. However multiple models can be called in parallel.

The library should be able to handle the LLM providers' authentication.

If there's an error, wait 5 seconds, retry, and if there's another error then skip to the next prompt. If there's an error, log the error to the console. If there's multiple errors on different prompts, stop for that model (but continue with other models).

