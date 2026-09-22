/* eslint-disable */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Params = { token: string };

// Rating-aware context descriptions
const ratingContext: Record<number, string> = {
  1: "very negative — they were severely disappointed",
  2: "negative — they had a poor experience",
  3: "neutral — it was okay but not exceptional",
  4: "positive — they had a good experience",
  5: "very positive — they absolutely loved it",
};

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

    const productContext =
      orderType === "shop" && productName
        ? `The customer ordered the product: "${productName}" from the FLUX3D 3D Shop.`
        : "The customer used FLUX3D custom 3D printing services.";

    const systemPrompt = `You are a professional copywriter helping a customer write a testimonial for FLUX3D, a premium 3D printing studio in India.

${productContext}
The customer's experience is ${context} (${ratingNum}/5 stars).
They have provided some rough notes. Turn them into a cohesive, well-written testimonial.

RULES:
1. Ensure the sentiment exactly matches the ${ratingNum}-star rating.
2. Do NOT invent features, facts, or experiences not present in the customer's notes.
3. Keep the tone authentic, conversational, and fitting to the rating sentiment.
4. Write 2–4 sentences. No bullet points. Plain paragraph.
5. Output ONLY the testimonial text — no preamble, no closing commentary.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Customer notes: ${customerInput}` },
      ],
      temperature: 0.75,
      max_tokens: 180,
    });

    const draft = response.choices[0]?.message?.content?.trim();
    return NextResponse.json({ draft });
  } catch (err: any) {
    console.error("Generate testimonial draft error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
