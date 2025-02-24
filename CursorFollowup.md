## Initial Feedback

## Claude and OpenAI
Claude and OpenAI are not showing up in the network tab. THey're throwing the errors:
```
Failed to initialize anthropic provider: AnthropicError: It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the `dangerouslyAllowBrowser` option to `true`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

factory.ts:25 Failed to initialize openai provider: OpenAIError: It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the `dangerouslyAllowBrowser` option to `true`, e.g.,

new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
```

## Prompt Categories

This doesn't seem to be handling prompt categories in the display correctly. It seems that it's correctly generating the prompts, but the display is only using the emoji analysis categories (style and length) even when I update that file to have other categories (eg: useEmojis and mood). When I've given an analysis with other categories, the results graph and raw results sections should update to use the new categories. This is very important.

## Raw Results

The raw results section is a very smart idea! Add a button in each row to show the actual response from the LLM. Additionally, make the raw results section collapsible.

## Prompts and Progress
Show the user how many prompts will run for each model. Also show the user the progress of the prompts as they run (how many are done/waiting for each model).

