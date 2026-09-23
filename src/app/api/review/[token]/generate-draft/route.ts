/* eslint-disable */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Params = { token: string };

// Tone steering — reframes low-star sentiment as constructive, not harsh
const ratingContext: Record<number, string> = {
  1: "constructive but concerned — they had real issues and hope the company improves; tone is honest and respectful, never aggressive or sarcastic",
  2: "disappointed but fair — acknowledges effort while pointing out specific shortcomings in a professional, measured way",
  3: "cautiously positive — decent experience with clear areas for growth; encouraging and balanced tone",
  4: "genuinely satisfied — specific about what they liked; would recommend and is likely to order again",
  5: "enthusiastic advocate — passionate about the quality and wants others to discover FLUX3D; authentic, not hyperbolic",
};

// 10 uniqueness seeds — different opening framing each call
const SEED_PHRASES = [
  "Start with a specific detail from the customer notes.",
  "Open with how you felt when the product arrived.",
  "Begin with what surprised you most about the experience.",
  "Start by mentioning what you were making and why it mattered.",
  "Open with a direct comparison to your original expectations.",
  "Lead with the outcome — what did you actually do with the product?",
  "Start with the moment you knew this was the right choice.",
  "Begin with the most memorable part of the entire experience.",
  "Open with a question you had before ordering, then answer it.",
  "Start with a sensory detail — what did you see or notice first?",
];

// 6 writing style variations
const STYLE_PHRASES = [
  "Write in a warm, conversational tone as if recommending to a close friend.",
  "Write in a professional tone, like a detailed product review on a B2B platform.",
  "Write with genuine excitement and enthusiasm.",
  "Write thoughtfully and reflectively, like someone who has had time to consider.",
  "Write concisely and directly — every single word must earn its place.",
  "Write with understated confidence — let the facts speak for themselves.",
];

// 5 structural variations — creates length and rhythm variety
const STRUCTURE_PHRASES = [
  "Write exactly 2 sentences.",
  "Write exactly 3 sentences.",
  "Write 2 short sentences followed by one longer closing sentence.",
  "Write an opening observation, then 2 supporting details. 3 sentences total.",
  "Write a punchy opener, a middle detail, and a forward-looking closing. 3 sentences.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_build",
    });

    const { token: _token } = await params;
    const body = await req.json();
    const { rating, customerInput, orderType, productName } = body;

    if (!rating || !customerInput) {
      return NextResponse.json(
        { error: "Rating and customerInput are required" },
        { status: 400 },
      );
    }

    const ratingNum = Number(rating);
    const context = ratingContext[ratingNum] ?? "neutral";

    // gpt-4o for 5-star (featured on landing page), gpt-4o-mini for 1–4 star
    const model = ratingNum === 5 ? "gpt-4o" : "gpt-4o-mini";

    const productContext =
      orderType === "shop" && productName
        ? `The customer ordered "${productName}" from the FLUX3D 3D Shop.`
        : orderType === "shop"
          ? "The customer ordered a product from the FLUX3D 3D Shop."
          : "The customer used FLUX3D custom 3D printing services.";

    // Pick randomly each call — 10 × 6 × 5 = 300 unique combinations
    const seed = pick(SEED_PHRASES);
    const style = pick(STYLE_PHRASES);
    const structure = pick(STRUCTURE_PHRASES);

    const systemPrompt = `You are a testimonial ghostwriter for FLUX3D — a premium 3D printing studio based in India, known for sharp print quality, fast turnaround, and excellent customer care.

${productContext}
The customer rated their experience ${ratingNum}/5 stars. Their sentiment: ${context}.

YOUR TASK: Transform the customer's rough notes into a natural, human-sounding testimonial.

BRAND VOICE: Authentic, warm, and specific. FLUX3D customers are engineers, designers, hobbyists, and entrepreneurs who care deeply about precision, quality, and reliability.

UNIQUENESS INSTRUCTION: ${seed}
WRITING STYLE: ${style}
SENTENCE STRUCTURE: ${structure}

ABSOLUTE RULES:
1. NEVER invent facts, features, or experiences not present in the customer notes.
2. Match the ${ratingNum}-star sentiment exactly — do not soften or amplify it.
3. For ratings 1–3: keep tone constructive and respectful — never aggressive, sarcastic, or hyperbolic.
4. For ratings 4–5: be specific about what impressed them — avoid vague generic praise like "great service" alone.
5. FORBIDDEN phrases: "I must say", "I have to say", "needless to say", "all in all", "to sum up", "overall", "in conclusion".
6. Plain paragraph only — no bullet points, no headers, no lists.
7. Output ONLY the testimonial text — no preamble, no commentary, nothing else.`;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Customer notes: ${customerInput}` },
      ],
      temperature: 0.92,
      presence_penalty: 0.6,
      frequency_penalty: 0.4,
      max_tokens: 200,
    });

    const draft = response.choices[0]?.message?.content?.trim();
    return NextResponse.json({ draft });
  } catch (err: any) {
    console.error("Generate testimonial draft error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
