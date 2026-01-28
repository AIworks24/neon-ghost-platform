import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateImage } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, platform, prompt, style, aspect_ratio } = body;

    if (!client_id || !platform || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get client info for context
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError) throw clientError;

    // Enhance prompt with brand context if available
    let enhancedPrompt = prompt;
    if (client.brand_guidelines_text) {
      enhancedPrompt = `${prompt}. Brand context: ${client.brand_guidelines_text.substring(0, 200)}`;
    }

    // Generate image with DALL-E
    const image_url = await generateImage({
      client_id,
      platform,
      prompt: enhancedPrompt,
      style,
      aspect_ratio,
    });

    return NextResponse.json({ image_url });
  } catch (error: any) {
    console.error('Error in generate-image API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
