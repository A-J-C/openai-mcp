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
  { name: 'openai-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_image',
      description:
        'Generate an image using OpenAI gpt-image-1. Returns a job_id immediately — use poll_image_job to retrieve the result once ready. Images are returned inline and saved to ~/Downloads.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description of the image to generate' },
          size: {
            type: 'string',
            enum: ['1024x1024', '1024x1536', '1536x1024'],
            default: '1024x1024',
            description: 'Image dimensions: square, portrait, or landscape',
          },
          quality: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            default: 'medium',
            description: 'Generation quality — higher is slower and costs more',
          },
        },
        required: ['prompt'],
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    {
      name: 'edit_image',
      description:
        'Edit an existing image using OpenAI gpt-image-1. Pass the absolute path to the source image — if the user pasted an image into the chat, use the file path Claude received. Returns a job_id — use poll_image_job to retrieve the result.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Description of the edit to make' },
          image_path: {
            type: 'string',
            description: 'Absolute path to the source image file',
          },
          size: {
            type: 'string',
            enum: ['1024x1024', '1024x1536', '1536x1024'],
            default: '1024x1024',
          },
          quality: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            default: 'medium',
          },
        },
        required: ['prompt', 'image_path'],
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    {
      name: 'poll_image_job',
      description:
        'Check the status of an image generation or edit job. Returns pending / complete / failed. When complete, the image is returned inline in the conversation and the file path in ~/Downloads is included.',
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
        'Send your reasoning to ChatGPT for adversarial critique. Returns a structured second opinion: Flaws, Blind spots, Alternative approaches, Counterarguments, Strengths, Overall assessment. Use this on hard decisions, plans, or analysis before committing.',
      inputSchema: {
        type: 'object',
        properties: {
          thinking: {
            type: 'string',
            minLength: 50,
            description: 'The reasoning, plan, or argument to critique',
          },
          context: {
            type: 'string',
            description: 'Optional background context (domain, constraints, goals)',
          },
          model: {
            type: 'string',
            default: 'gpt-4o',
            description: 'GPT model to use (default: gpt-4o)',
          },
        },
        required: ['thinking'],
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    {
      name: 'chatgpt_critique_batch',
      description:
        'Critique multiple pieces of reasoning in parallel — useful for comparing options or reviewing several proposals at once. Returns an array of { name, critique } objects.',
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
  process.stderr.write('openai-mcp v1.0.0 started\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
