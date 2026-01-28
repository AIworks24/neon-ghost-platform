import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateBrandedContent } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, platform, prompt, tone, length, include_hashtags, include_cta } = body;

    if (!client_id || !platform || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get client brand guidelines
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError) throw clientError;

    // Generate content with AI
    const content = await generateBrandedContent(
      {
        client_id,
        platform,
        prompt,
        tone,
        length,
        include_hashtags,
        include_cta,
      },
      client.brand_guidelines_text,
      client.creative_parameters
    );

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Error in generate-text API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate text' },
      { status: 500 }
    );
  }
}