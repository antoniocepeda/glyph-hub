# Replicate Top 15 AI Models - Complete Guide

**Last Updated:** September 22, 2025  
**Version:** 1.0  

A comprehensive guide to the top 15 AI models available on Replicate, covering language models, image generation, video creation, and specialized multimodal capabilities.

---

## Table of Contents

1. [Language Models](#language-models)
2. [Image Generation](#image-generation)
3. [Video Generation](#video-generation)
4. [Specialized Models](#specialized-models)
5. [Quick Reference](#quick-reference)
6. [Cost Analysis](#cost-analysis)
7. [Implementation Examples](#implementation-examples)

---

## Language Models

### 1. OpenAI GPT-5
**Model ID:** `openai/gpt-5`  
**Category:** Premium Language Model  
**Pricing:** $1.25 input / $10.00 output per 1M tokens  

#### Overview
OpenAI's most capable model to date, designed for advanced reasoning, code generation, instruction following, and tool use. Features configurable reasoning modes and verbosity control.

#### Key Features
- **Reasoning Modes:**
  - `minimal`: Fastest; good for coding and clear instructions
  - `medium`: Balanced (default)
  - `high`: Most thorough reasoning
- **Verbosity Control:** Low, medium, high output detail
- **Custom Tools:** Define tools with freeform text input (code, SQL, etc.)
- **Reasoning Tokens:** Retains and reuses reasoning across turns

#### Best Use Cases
- Complex reasoning and analysis
- Enterprise applications
- Advanced coding tasks
- Multi-step problem solving

#### API Parameters
```json
{
  "model": "gpt-5",
  "reasoning_effort": "medium",
  "verbosity": "medium",
  "custom_tools": [],
  "allowed_tools": [],
  "preambles": true
}
```

---

### 2. OpenAI GPT-5 Structured
**Model ID:** `openai/gpt-5-structured`  
**Category:** Structured Output Language Model  
**Pricing:** $1.25 input / $10.00 output per 1M tokens  

#### Overview
Specialized variant of GPT-5 optimized for structured outputs, web search, and tool integration. Supports JSON schemas and custom grammars.

#### Key Features
- **JSON Schema Support:** Strict structured output validation
- **Web Search Integration:** Built-in search capabilities
- **Custom Grammars:** CFG constraints for specific output formats
- **Tool Calling:** Advanced tool integration with preambles

#### Schema Requirements
Every JSON schema must include:
- `"additionalProperties": false` on all objects
- `required` array listing ALL properties
- No optional fields (use null unions instead)

#### Example Usage
```json
{
  "json_schema": {
    "format": {
      "type": "json_schema",
      "name": "product_review",
      "schema": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "rating": {"type": "number"},
          "is_recommended": {"type": "boolean"}
        },
        "required": ["title", "rating", "is_recommended"],
        "additionalProperties": false
      }
    }
  }
}
```

---

### 3. DeepSeek V3.1
**Model ID:** `deepseek-ai/deepseek-v3.1`  
**Category:** Hybrid Reasoning Model  
**Pricing:** Cost-effective (varies by usage)  

#### Overview
Hybrid model supporting both thinking and non-thinking modes. Significant improvements in tool calling and reasoning efficiency over previous versions.

#### Key Features
- **Hybrid Thinking Mode:** Switch between thinking and non-thinking via chat template
- **Extended Context:** 128K context window with 630B token training
- **Tool Calling:** Enhanced accuracy and agent task performance
- **FP8 Training:** UE8M0 FP8 scale data format compatibility

#### Chat Templates
**Non-Thinking Mode:**
```
<｜begin▁of▁sentence｜>{system prompt}<｜User｜>{query}<｜Assistant｜></think>
```

**Thinking Mode:**
```
<｜begin▁of▁sentence｜>{system prompt}<｜User｜>{query}<｜Assistant｜><think>
```

#### Performance Benchmarks
- MMLU-Redux: 91.8% (Non-Thinking) / 93.7% (Thinking)
- LiveCodeBench: 56.4% (Non-Thinking) / 74.8% (Thinking)
- SWE Verified: 66.0% (Agent mode)

---

### 4. Anthropic Claude 4 Sonnet
**Model ID:** `anthropic/claude-4-sonnet`  
**Category:** Advanced Language Model  
**Pricing:** $3.00 input / $15.00 output per 1M tokens  

#### Overview
Significant upgrade from Claude 3.7, delivering superior coding and reasoning capabilities with hybrid reasoning support and 200K context window.

#### Key Features
- **Hybrid Reasoning:** Both instant and extended thinking modes
- **200K Context Window:** (1M available for specific use cases)
- **Superior Coding:** 72.7% SWE-bench performance
- **Tool Integration:** Enhanced tool use and API integrations

#### Pricing Tiers
- **Standard:** $3/$15 per 1M tokens
- **Cached Input:** 90% cost savings with prompt caching
- **Batch Processing:** 50% cost savings
- **Extended Context (>200K):** $6/$22.50 per 1M tokens

#### Best Use Cases
- Professional coding assistance
- Business applications
- Complex reasoning tasks
- High-volume production deployments

---

### 5. IBM Granite 3.3 8B Instruct
**Model ID:** `ibm-granite/granite-3.3-8b-instruct`  
**Category:** Efficient Enterprise Model  
**Pricing:** Very affordable (specific pricing varies)  

#### Overview
Lightweight, efficient model with 128K context window, designed for enterprise deployments requiring cost-conscious scaling.

#### Key Features
- **128K Context Window:** Extended context for complex tasks
- **8B Parameters:** Efficient resource usage
- **Enterprise Focus:** Instruction following and business tasks
- **Open License:** MIT license for commercial use

#### Best Use Cases
- High-volume deployments
- Cost-conscious applications
- Enterprise task automation
- Instruction following at scale

---

## Image Generation

### 6. Stability AI SD 3.5 Large Turbo
**Model ID:** `stability-ai/stable-diffusion-3.5-large-turbo`  
**Category:** Premium Image Generation  
**Pricing:** $0.04 per image  

#### Overview
Distilled version of Stable Diffusion 3.5 Large, generating high-quality images in just 4 steps with exceptional prompt adherence.

#### Key Features
- **4-Step Generation:** Significantly faster inference
- **High Quality:** Near-SD 3.5 Large quality at turbo speed
- **Prompt Adherence:** Superior understanding of complex prompts
- **Artistic Styles:** Supports diverse styles (watercolor, pixel art, 3D renders)

#### Parameters
- **Resolution:** Up to 1 megapixel (1024x1024 recommended)
- **Steps:** 4 (optimized)
- **Guidance Scale:** 3.5-7.0
- **Aspect Ratios:** Multiple supported ratios

#### Example Usage
```python
import replicate

output = replicate.run(
    "stability-ai/stable-diffusion-3.5-large-turbo",
    input={
        "prompt": "A watercolor painting of a futuristic city skyline at dawn",
        "aspect_ratio": "16:9",
        "output_format": "png"
    }
)
```

---

### 7. Google Gemini 2.5 Flash Image
**Model ID:** `google/gemini-2.5-flash-image`  
**Category:** Google Ecosystem Image Generation  
**Pricing:** Mid-range (varies by usage)  

#### Overview
Latest Google image generation model integrated with Gemini 2.5 ecosystem, optimized for Google Workspace and Cloud integrations.

#### Key Features
- **Gemini 2.5 Integration:** Seamless ecosystem compatibility
- **Flash Architecture:** Optimized for speed and efficiency
- **Multi-modal Support:** Text and image inputs
- **Enterprise Ready:** Google Cloud integration

---

### 8. Black Forest Labs FLUX.1 Dev
**Model ID:** `black-forest-labs/flux.1-dev`  
**Category:** Open-Weight Image Generation  
**Pricing:** Affordable (varies by usage)  

#### Overview
Open-weight text-to-image model with 12 billion parameters, offering excellent prompt adherence and customization capabilities.

#### Key Features
- **12B Parameters:** Large-scale model architecture
- **Open Weight:** Available for fine-tuning and customization
- **Excellent Prompt Adherence:** High-quality text understanding
- **Commercial License:** Available for commercial use

#### Best Use Cases
- Open-source projects
- Model customization and fine-tuning
- Research and development
- Custom workflow integration

---

## Video Generation

### 9. Google Veo 3
**Model ID:** `google/veo-3`  
**Category:** Premium Video Generation  
**Pricing:** $6.00 per video  

#### Overview
Google's flagship video generation model with audio support, capable of creating 8-second, high-quality videos with complex scene understanding.

#### Key Features
- **Audio Support:** Synchronized sound generation
- **8-Second Duration:** Extended video generation
- **Complex Scenes:** Advanced scene understanding and coherence
- **High Resolution:** Professional-quality output

#### Best Use Cases
- Premium video content creation
- Marketing and advertising
- Professional video production
- Complex scene generation

---

### 10. Pixverse V4.5
**Model ID:** `pixverse/pixverse-v4.5`  
**Category:** Fast Video Generation  
**Pricing:** $0.30-$0.80 per video  

#### Overview
Fast video generation model with enhanced character movement and 1080p support, optimized for social media content creation.

#### Key Features
- **Enhanced Movement:** Improved character and object motion
- **1080p Support:** High-definition output
- **8-Second Videos:** Extended duration capability
- **Fast Generation:** Optimized for quick turnaround

#### Best Use Cases
- Social media content
- Quick video prototyping
- Character animation
- Marketing videos

---

### 11. Minimax Hailuo 02
**Model ID:** `minimax/hailuo-02`  
**Category:** Physics-Based Video Generation  
**Pricing:** $0.10-$0.50 per video  

#### Overview
Specialized in realistic physics simulation for video generation, excelling at real-world physics accuracy and natural motion.

#### Key Features
- **Physics Simulation:** Realistic physical interactions
- **Natural Motion:** Accurate movement and dynamics
- **Cost Effective:** Affordable pricing structure
- **Versatile Scenes:** Various scenario support

#### Best Use Cases
- Realistic video scenarios
- Physics demonstrations
- Educational content
- Natural motion sequences

---

### 12. Luma Ray 2
**Model ID:** `luma/ray-2`  
**Category:** Professional Video Generation  
**Pricing:** $0.50-$1.62 per video  

#### Overview
High-quality text/image-to-video generation model optimized for professional video production with fast processing.

#### Key Features
- **Professional Quality:** High-end video output
- **Text/Image Input:** Multiple input modalities
- **Fast Processing:** Optimized generation speed
- **Consistent Quality:** Reliable output standards

#### Best Use Cases
- Professional video production
- Commercial content creation
- High-quality marketing videos
- Consistent brand content

---

## Specialized Models

### 13. OpenAI GPT Image-1
**Model ID:** `openai/gpt-image-1`  
**Category:** Multimodal Vision/Generation  
**Pricing:** Requires OpenAI API key  

#### Overview
Multimodal model combining high-quality image generation with vision understanding capabilities, requiring separate OpenAI API access.

#### Key Features
- **Multimodal Capabilities:** Vision and generation combined
- **High Quality Output:** Professional-grade image creation
- **Vision Understanding:** Advanced image analysis
- **OpenAI Integration:** Requires OpenAI API key

#### Best Use Cases
- Multimodal applications
- Vision + generation workflows
- Advanced image analysis
- Integrated AI systems

---

### 14. Qwen Image Edit
**Model ID:** `qwen/qwen-image-edit`  
**Category:** Advanced Image Editing  
**Pricing:** Moderate (varies by usage)  

#### Overview
Specialized model for precise text editing in images with unique multilingual text rendering capabilities.

#### Key Features
- **Text Editing:** Precise in-image text modification
- **Multilingual Support:** International text rendering
- **Advanced Editing:** Complex image modifications
- **Text Rendering:** High-quality typography

#### Best Use Cases
- Text-heavy image editing
- Multilingual content creation
- Document image processing
- Typography and design work

---

### 15. Google Lyria 2
**Model ID:** `google/lyria-2`  
**Category:** Music and Audio Generation  
**Pricing:** Audio generation pricing (varies)  

#### Overview
Advanced music generation model producing 48kHz stereo audio with vocals through text-based prompts.

#### Key Features
- **48kHz Stereo:** High-quality audio output
- **Vocal Support:** Text-to-singing capabilities
- **Music Generation:** Full composition creation
- **Text Prompts:** Natural language music description

#### Best Use Cases
- Music production
- Audio content creation
- Vocal generation
- Sound design

---

## Quick Reference

### Model Categories Summary

| Category | Count | Price Range | Best For |
|----------|-------|-------------|----------|
| Language Models | 5 | $0.10 - $10.00/1M tokens | Chat, coding, reasoning |
| Image Generation | 3 | $0.04 - $0.065/image | Creative content, marketing |
| Video Generation | 4 | $0.10 - $6.00/video | Video content, social media |
| Specialized | 3 | Varies | Multimodal, editing, audio |

### Provider Distribution

| Provider | Model Count | Strengths |
|----------|-------------|-----------|
| OpenAI | 3 | Language, multimodal, structured output |
| Google | 3 | Ecosystem integration, enterprise features |
| Anthropic | 1 | Advanced reasoning, coding |
| Others | 8 | Specialized capabilities, cost efficiency |

---

## Cost Analysis

### Budget-Friendly Options
- **Llama 3 8B:** $0.10/$0.10 per 1M tokens - High-volume basic tasks
- **Minimax Hailuo 02:** $0.10-$0.50 per video - Affordable video generation
- **IBM Granite 3.3:** Very affordable - Enterprise cost-conscious deployments

### Mid-Range Options
- **DeepSeek V3.1:** Cost-effective - Hybrid reasoning capabilities
- **FLUX.1 Dev:** Affordable - Open-source image generation
- **Pixverse V4.5:** $0.30-$0.80 per video - Social media content

### Premium Options
- **GPT-5:** $1.25/$10.00 per 1M tokens - Advanced reasoning
- **Claude 4 Sonnet:** $3.00/$15.00 per 1M tokens - Professional coding
- **Google Veo 3:** $6.00 per video - Premium video content

---

## Implementation Examples

### Language Model Integration

```python
import replicate

# GPT-5 with reasoning control
output = replicate.run(
    "openai/gpt-5",
    input={
        "prompt": "Explain quantum computing",
        "reasoning_effort": "high",
        "verbosity": "medium"
    }
)

# DeepSeek V3.1 thinking mode
output = replicate.run(
    "deepseek-ai/deepseek-v3.1",
    input={
        "prompt": "Solve this complex problem step by step",
        "thinking": True,
        "temperature": 0.3
    }
)
```

### Image Generation

```python
# Stable Diffusion 3.5 Large Turbo
image = replicate.run(
    "stability-ai/stable-diffusion-3.5-large-turbo",
    input={
        "prompt": "A futuristic cityscape at sunset",
        "aspect_ratio": "16:9",
        "num_inference_steps": 4
    }
)

# FLUX.1 Dev for customization
image = replicate.run(
    "black-forest-labs/flux.1-dev",
    input={
        "prompt": "Portrait of a cyberpunk character",
        "width": 1024,
        "height": 1024
    }
)
```

### Video Generation

```python
# Google Veo 3 with audio
video = replicate.run(
    "google/veo-3",
    input={
        "prompt": "A cat playing piano in a jazz club",
        "duration": 8,
        "include_audio": True
    }
)

# Minimax Hailuo 02 for physics
video = replicate.run(
    "minimax/hailuo-02",
    input={
        "prompt": "Water droplets falling into a pond",
        "physics_accuracy": "high"
    }
)
```

### Structured Output

```python
# GPT-5 Structured with JSON schema
output = replicate.run(
    "openai/gpt-5-structured",
    input={
        "prompt": "Generate a product review",
        "json_schema": {
            "format": {
                "type": "json_schema",
                "name": "review",
                "schema": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "rating": {"type": "number"},
                        "pros": {"type": "array", "items": {"type": "string"}},
                        "cons": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["title", "rating", "pros", "cons"],
                    "additionalProperties": False
                }
            }
        }
    }
)
```

---

## Rate Limits and Best Practices

### API Limits
- **Rate Limit:** 600 predictions per minute
- **Burst Limit:** Up to 600 predictions/minute in bursts
- **General API:** 3000 requests per minute
- **Single API Key:** Works across all models

### Optimization Strategies
1. **Model Routing:** Use cheaper models for simple tasks, premium for complex ones
2. **Caching:** Implement response caching to reduce API calls
3. **Batch Processing:** Use batch APIs where available for cost savings
4. **Context Management:** Optimize prompt length and context usage

### Cost Management
1. **Tiered Usage:** Route based on complexity and budget
2. **Monitor Usage:** Track token consumption and video generation
3. **Set Limits:** Implement usage caps and alerts
4. **Optimize Prompts:** Reduce unnecessary tokens and improve efficiency

---

**Note:** Prices and availability are subject to change. Always check the official Replicate documentation for the most current information and pricing.

**API Documentation:** https://replicate.com/docs  
**Pricing Information:** https://replicate.com/pricing  
**Model Explorer:** https://replicate.com/explore