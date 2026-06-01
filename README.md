# openai-mcp

MCP server for OpenAI image generation and ChatGPT critique. Install once in Claude Desktop — no other setup.

## Tools

| Tool | What it does |
|------|-------------|
| `generate_image` | Generate an image from a text prompt using gpt-image-1 |
| `edit_image` | Edit an existing image — paste an image into chat and ask Claude to modify it |
| `poll_image_job` | Check job status; returns the image inline + saves to ~/Downloads when done |
| `chatgpt_critique` | Send reasoning to GPT-4o for adversarial critique |
| `chatgpt_critique_batch` | Critique multiple pieces of reasoning in parallel |

## Install (Claude Desktop)

1. Download `openai-mcp.mcpb`
2. Double-click it — Claude Desktop opens an install prompt
3. Paste your OpenAI API key ([get one here](https://platform.openai.com/api-keys))
4. Done

> **Note:** Image generation requires your OpenAI organisation to have access to `gpt-image-1`. Verify at [platform.openai.com/settings/organization/general](https://platform.openai.com/settings/organization/general).

## Usage

**Generating an image:**
> "Generate an image of a corgi in a spacesuit, square format"

Claude calls `generate_image`, gets a `job_id`, then polls `poll_image_job` until done. The image appears inline in the conversation and is saved to `~/Downloads`.

**Editing a pasted image:**
> Paste an image into the chat, then: "Make the background a sunset"

Claude calls `edit_image` with the file path it received for the attachment.

**Critiquing reasoning:**
> "Use chatgpt_critique on this plan: [your reasoning]"

Or Claude uses it automatically during QA passes on hard problems.

## Image generation notes

- `gpt-image-1` at `medium` quality typically takes 15–60 seconds
- `high` quality can take up to 90 seconds — the async-with-polling pattern handles this
- Images are saved as `openai-{timestamp}-{jobId}.png` in `~/Downloads`
- Completed jobs are kept in memory for 24 hours; server restart clears them

## Building the .mcpb yourself

Requires [just](https://github.com/casey/just) and Node ≥ 18.

```bash
just bundle
```

Output: `openai-mcp.mcpb` — double-click to install.

## Development

```bash
just install    # install dependencies
just build      # compile TypeScript
just run        # run in dev mode (reads OPENAI_API_KEY from shell env)
```
