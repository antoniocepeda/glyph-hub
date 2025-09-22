export type CuratedCategory = 'Language Models' | 'Image Generation' | 'Video Generation' | 'Specialized Models'

export type CuratedModelMeta = {
  slug: string
  owner: string
  name: string
  displayName: string
  description: string
  category: CuratedCategory
}

export const CURATED_MODEL_GROUPS: { category: CuratedCategory; models: CuratedModelMeta[] } = [
  {
    category: 'Language Models',
    models: [
      {
        slug: 'openai/gpt-5',
        owner: 'openai',
        name: 'gpt-5',
        displayName: 'OpenAI GPT-5',
        description: 'Advanced reasoning model with configurable thinking modes.',
        category: 'Language Models',
      },
      {
        slug: 'openai/gpt-5-structured',
        owner: 'openai',
        name: 'gpt-5-structured',
        displayName: 'OpenAI GPT-5 Structured',
        description: 'Structured output variant tuned for JSON and tool use.',
        category: 'Language Models',
      },
      {
        slug: 'deepseek-ai/deepseek-v3.1',
        owner: 'deepseek-ai',
        name: 'deepseek-v3.1',
        displayName: 'DeepSeek V3.1',
        description: 'Hybrid reasoning model with thinking and non-thinking modes.',
        category: 'Language Models',
      },
      {
        slug: 'anthropic/claude-4-sonnet',
        owner: 'anthropic',
        name: 'claude-4-sonnet',
        displayName: 'Claude 4 Sonnet',
        description: "Anthropic's latest coding and reasoning assistant.",
        category: 'Language Models',
      },
      {
        slug: 'ibm-granite/granite-3.3-8b-instruct',
        owner: 'ibm-granite',
        name: 'granite-3.3-8b-instruct',
        displayName: 'Granite 3.3 8B Instruct',
        description: 'Efficient 8B enterprise model with 128K context.',
        category: 'Language Models',
      },
    ],
  },
  {
    category: 'Image Generation',
    models: [
      {
        slug: 'stability-ai/stable-diffusion-3.5-large-turbo',
        owner: 'stability-ai',
        name: 'stable-diffusion-3.5-large-turbo',
        displayName: 'Stable Diffusion 3.5 Large Turbo',
        description: 'Turbo image generation in four steps with high fidelity.',
        category: 'Image Generation',
      },
      {
        slug: 'google/gemini-2.5-flash-image',
        owner: 'google',
        name: 'gemini-2.5-flash-image',
        displayName: 'Gemini 2.5 Flash Image',
        description: "Google's fast multimodal image generator for Workspace.",
        category: 'Image Generation',
      },
      {
        slug: 'black-forest-labs/flux.1-dev',
        owner: 'black-forest-labs',
        name: 'flux.1-dev',
        displayName: 'FLUX.1 Dev',
        description: 'Open-weight 12B image model for customization.',
        category: 'Image Generation',
      },
    ],
  },
  {
    category: 'Video Generation',
    models: [
      {
        slug: 'google/veo-3',
        owner: 'google',
        name: 'veo-3',
        displayName: 'Google Veo 3',
        description: 'Premium video generation with audio and complex scenes.',
        category: 'Video Generation',
      },
      {
        slug: 'pixverse/pixverse-v4.5',
        owner: 'pixverse',
        name: 'pixverse-v4.5',
        displayName: 'Pixverse V4.5',
        description: 'Fast 1080p video model optimized for social content.',
        category: 'Video Generation',
      },
      {
        slug: 'minimax/hailuo-02',
        owner: 'minimax',
        name: 'hailuo-02',
        displayName: 'Minimax Hailuo 02',
        description: 'Physics-aware video generator with natural motion.',
        category: 'Video Generation',
      },
      {
        slug: 'luma/ray-2',
        owner: 'luma',
        name: 'ray-2',
        displayName: 'Luma Ray 2',
        description: 'Professional text-to-video with quick turnaround.',
        category: 'Video Generation',
      },
    ],
  },
  {
    category: 'Specialized Models',
    models: [
      {
        slug: 'openai/gpt-image-1',
        owner: 'openai',
        name: 'gpt-image-1',
        displayName: 'OpenAI GPT Image-1',
        description: 'Multimodal image generation and vision model.',
        category: 'Specialized Models',
      },
      {
        slug: 'qwen/qwen-image-edit',
        owner: 'qwen',
        name: 'qwen-image-edit',
        displayName: 'Qwen Image Edit',
        description: 'Multilingual text editing for images with precise control.',
        category: 'Specialized Models',
      },
      {
        slug: 'google/lyria-2',
        owner: 'google',
        name: 'lyria-2',
        displayName: 'Google Lyria 2',
        description: 'High-quality music and vocal generation at 48kHz.',
        category: 'Specialized Models',
      },
    ],
  },
]

export const CURATED_MODELS: CuratedModelMeta[] = CURATED_MODEL_GROUPS.flatMap(group => group.models)

export const CURATED_MODEL_BY_SLUG = new Map(CURATED_MODELS.map(model => [model.slug, model]))

export const CURATED_MODEL_ORDER = new Map(CURATED_MODELS.map((model, index) => [model.slug, index]))
