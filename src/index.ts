import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { generateImageSchema, generateImage } from './tools/generate';
import { editImageSchema, editImage } from './tools/edit';
import { pollImageJobSchema, pollImageJob } from './tools/poll';
import { critiqueSchema, chatgptCritique } from './tools/critique';
import { critiqueBatchSchema, chatgptCritiqueBatch } from './tools/critiqueBatch';
import { evictOldJobs } from './lib/imageRunner';

const server = new Server(
  { name: 'openai-mcp', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_image',
      description:
        'Generate an image from a text description using OpenAI\'s gpt-image-2 model. Describe what you want — style, subject, mood, composition — and this tool produces it. The image appears inline in the conversation and is saved to ~/Downloads. Generation typically takes 15–90 seconds; complex prompts may take up to 2 minutes. The tool returns a job_id immediately and you poll for the result.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'What to generate. Be descriptive: include subject, style, lighting, mood, and composition. Example: "A photorealistic corgi in a spacesuit floating above Earth, dramatic lighting, high detail"' },
          size: {
            type: 'string',
            enum: ['auto', '1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '3840x2160', '2160x3840'],
            default: 'auto',
            description: 'auto = model chooses the best size (default), 1024x1024 = square, 1024x1536 = portrait (tall), 1536x1024 = landscape (wide), 2048x2048 = large square, 2048x1152 = wide landscape, 3840x2160 = 4K landscape, 2160x3840 = 4K portrait',
          },
          quality: {
            type: 'string',
            enum: ['auto', 'low', 'medium', 'high'],
            default: 'auto',
            description: 'auto = model chooses best quality (default), low = fast and cheap, medium = balanced, high = best quality, slower and costs more',
          },
        },
        required: ['prompt'],
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    {
      name: 'edit_image',
      description:
        'Edit or modify an existing image using OpenAI\'s gpt-image-2 model, which processes image inputs at high fidelity automatically. The user pastes or attaches an image to the conversation — use the file path Claude received for that attachment. Describe what to change: swap backgrounds, change colours, add or remove elements, restyle, etc. The result appears inline and is saved to ~/Downloads. Complex edits may take up to 2 minutes.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'What to change about the image. Example: "Replace the background with a sunset over the ocean" or "Make it look like a watercolour painting"' },
          image_path: {
            type: 'string',
            description: 'Absolute path to the source image. Use the file path from the user\'s attachment — Claude receives this automatically when an image is pasted into the chat.',
          },
          size: {
            type: 'string',
            enum: ['auto', '1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '3840x2160', '2160x3840'],
            default: 'auto',
            description: 'auto = model chooses the best size (default), 1024x1024 = square, 1024x1536 = portrait (tall), 1536x1024 = landscape (wide), 2048x2048 = large square, 2048x1152 = wide landscape, 3840x2160 = 4K landscape, 2160x3840 = 4K portrait',
          },
          quality: {
            type: 'string',
            enum: ['auto', 'low', 'medium', 'high'],
            default: 'auto',
            description: 'auto = model chooses best quality (default), low = fast and cheap, medium = balanced, high = best quality, slower and costs more',
          },
        },
        required: ['prompt', 'image_path'],
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    {
      name: 'poll_image_job',
      description:
        'Check whether an image generation or edit job has finished. Call this every few seconds after generate_image or edit_image returns a job_id. Returns "pending" while still running, "complete" with the image shown inline and saved to ~/Downloads, or "failed" with an error message.',
      inputSchema: {
        type: 'object',
        properties: {
          job_id: {
            type: 'string',
            description: 'Job ID returned by generate_image or edit_image',
          },
        },
        required: ['job_id'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    {
      name: 'chatgpt_critique',
      description:
        'Get a second opinion from ChatGPT on any reasoning, plan, or decision. Useful when you want an independent perspective — especially on hard calls, strategies, or arguments where Claude might have blind spots. ChatGPT responds with a structured adversarial critique: Flaws, Blind spots, Alternative approaches, Counterarguments, Strengths, and an Overall assessment. Use this proactively on important work before finalising.',
      inputSchema: {
        type: 'object',
        properties: {
          thinking: {
            type: 'string',
            minLength: 50,
            description: 'The reasoning, plan, recommendation, or argument to critique. Write it out fully — the more detail, the more useful the critique.',
          },
          context: {
            type: 'string',
            description: 'Background the critic needs: what domain is this, what constraints apply, what is the goal. Example: "This is a pricing strategy for a B2B SaaS product targeting enterprise security teams."',
          },
          model: {
            type: 'string',
            default: 'gpt-4o',
            description: 'Which GPT model to use. gpt-4o (default) is fast and capable. Use o1 or o3 for harder reasoning tasks.',
          },
        },
        required: ['thinking'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    {
      name: 'chatgpt_critique_batch',
      description:
        'Critique several options or proposals at once. Pass an array of named items — each gets its own independent critique from ChatGPT in parallel. Useful when comparing approaches (Option A vs B vs C), reviewing multiple candidates, or stress-testing several arguments simultaneously. Returns one structured critique per item.',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Label for this item in results' },
                thinking: { type: 'string', minLength: 50 },
                context: { type: 'string' },
              },
              required: ['name', 'thinking'],
            },
            minItems: 1,
          },
          model: { type: 'string', default: 'gpt-4o' },
        },
        required: ['items'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_image': {
        const input = generateImageSchema.parse(args);
        const text = generateImage(input);
        return { content: [{ type: 'text', text }] };
      }

      case 'edit_image': {
        const input = editImageSchema.parse(args);
        const text = editImage(input);
        return { content: [{ type: 'text', text }] };
      }

      case 'poll_image_job': {
        const input = pollImageJobSchema.parse(args);
        const result = pollImageJob(input);
        if (result.imageBase64) {
          return {
            content: [
              { type: 'text', text: result.text },
              { type: 'image', data: result.imageBase64, mimeType: 'image/png' },
            ],
          };
        }
        return { content: [{ type: 'text', text: result.text }] };
      }

      case 'chatgpt_critique': {
        const input = critiqueSchema.parse(args);
        const text = await chatgptCritique(input);
        return { content: [{ type: 'text', text }] };
      }

      case 'chatgpt_critique_batch': {
        const input = critiqueBatchSchema.parse(args);
        const text = await chatgptCritiqueBatch(input);
        return { content: [{ type: 'text', text }] };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
});

setInterval(evictOldJobs, 60 * 60 * 1000);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('openai-mcp v1.1.0 started\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
