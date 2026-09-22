/* eslint-disable */
// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Params = { token: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { token } = await params;

    // Only apply rate limiting if Redis is configured
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
      });

      const ratelimit = new Ratelimit({
        redis,
        // Allow 10 submissions per day per IP (multi-use links)
        limiter: Ratelimit.slidingWindow(10, "1 d"),
        analytics: true,
      });

      const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
      const { success } = await ratelimit.limit(`review_submit_${ip}`);

      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again tomorrow." },
          { status: 429 },
        );
      }
    }

    const body = await req.json();
    const {
      website,
      rating,
      title,
      body: reviewBody,
      customerName,
      customerEmail,
      imageUrls,
    } = body;

    // Honeypot check
    if (website) {
      return NextResponse.json({
        success: true,
        message: "Testimonial submitted successfully",
      });
    }

    if (!rating || !reviewBody) {
      return NextResponse.json(
        { error: "Rating and testimonial body are required" },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    // Validate the token
    const { data: link, error: linkError } = await supabase
      .from("review_links")
      .select(
        "id, order_type, order_id, expires_at, customer_name, customer_email, customer_phone",
      )
      .eq("token", token)
      .maybeSingle();

    if (linkError || !link) {
      return NextResponse.json(
        { error: "Invalid testimonial link" },
        { status: 400 },
      );
    }

    // Check expiry
    if (new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This testimonial link has expired" },
        { status: 400 },
      );
    }

    // Insert the testimonial with 'pending' status (multi-use: do NOT mark link as used)
    const { error: reviewError } = await supabase.from("reviews").insert({
      order_type: link.order_type,
      order_id: link.order_id,
      rating: Number(rating),
      title:
        title ||
        `Testimonial from ${customerName || link.customer_name || "Customer"}`,
      body: reviewBody,
      customer_name: customerName || link.customer_name || null,
      customer_email: customerEmail || link.customer_email || null,
      customer_phone: link.customer_phone || null,
      image_urls: imageUrls || [],
      status: "pending",
      is_verified_purchase: true,
    });

    if (reviewError) throw reviewError;

    return NextResponse.json({
      success: true,
      message: "Testimonial submitted successfully",
    });
  } catch (err: any) {
    console.error("Submit testimonial error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
