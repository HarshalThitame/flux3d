/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

type ParamsType = { token: string };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<ParamsType> }
) {
  try {
    const resolvedParams = await params;
    const { token } = resolvedParams;

    const body = await req.json();
    const { rating, customerInput } = body;

    if (!rating || !customerInput) {
      return NextResponse.json({ error: 'Rating and customerInput are required' }, { status: 400 });
    }

    // Strict system prompt for AI testimonial generation
    const systemPrompt = `You are a professional copywriting assistant helping a customer write a review for a 3D printing service called FLUX3D.
The customer has given a ${rating}-star rating and provided some rough notes. 
Your goal is to turn their notes into a cohesive, well-written paragraph. 
RULES:
1. Ensure the sentiment exactly matches the ${rating}-star rating.
2. DO NOT invent features, facts, or experiences not present in the customer's raw input.
3. Keep the tone authentic, conversational, and appreciative.
4. Output ONLY the drafted review text, no extra commentary.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or gpt-3.5-turbo if preferred
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Raw Notes: ${customerInput}` }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const draft = response.choices[0]?.message?.content?.trim();

    return NextResponse.json({ draft });

  } catch (err: any) {
    console.error('Generate review draft error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
