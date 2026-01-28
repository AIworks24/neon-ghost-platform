import OpenAI from 'openai';
import type { AITextGenerationRequest, AIImageGenerationRequest } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}

export async function generateTextContent(request: AITextGenerationRequest): Promise<string> {
  const { platform, prompt, tone = 'professional', length = 'medium', include_hashtags = true, include_cta = true } = request;

  const lengthInstructions = {
    short: '50-100 words',
    medium: '100-200 words',
    long: '200-300 words',
  };

  const platformGuidelines = {
    facebook: 'Facebook posts should be engaging and conversational. Ideal length is 100-250 characters for best engagement.',
    instagram: 'Instagram captions should be visually descriptive and use emojis. Include line breaks for readability.',
    linkedin: 'LinkedIn posts should be professional and provide value. Use a business tone and include insights.',
    tiktok: 'TikTok captions should be short, catchy, and trend-aware. Use popular sounds/hashtags.',
  };

  const systemPrompt = `You are an expert social media copywriter creating content for ${platform}. 
${platformGuidelines[platform]}
Tone: ${tone}
Length: ${lengthInstructions[length]}
${include_hashtags ? 'Include 3-5 relevant hashtags.' : 'Do not include hashtags.'}
${include_cta ? 'Include a clear call-to-action.' : ''}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  return completion.choices[0].message.content || '';
}

export async function generateImage(request: AIImageGenerationRequest): Promise<string> {
  const { prompt, style = 'natural', aspect_ratio = '1:1' } = request;

  const sizeMap = {
    '1:1': '1024x1024' as const,
    '4:5': '1024x1792' as const,
    '16:9': '1792x1024' as const,
  };

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `${style} style: ${prompt}`,
    size: sizeMap[aspect_ratio],
    quality: 'hd',
    n: 1,
  });

  return response.data[0].url || '';
}

export async function generateBrandedContent(
  request: AITextGenerationRequest,
  brandGuidelines?: string,
  creativeParameters?: Record<string, any>
): Promise<string> {
  const additionalContext = brandGuidelines 
    ? `\n\nBrand Guidelines:\n${brandGuidelines}`
    : '';

  const styleContext = creativeParameters
    ? `\n\nBrand Style:\n${JSON.stringify(creativeParameters, null, 2)}`
    : '';

  const enhancedPrompt = `${request.prompt}${additionalContext}${styleContext}`;

  return generateTextContent({
    ...request,
    prompt: enhancedPrompt,
  });
}