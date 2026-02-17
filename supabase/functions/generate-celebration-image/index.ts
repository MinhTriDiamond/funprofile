import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CelebrationRequest {
  sender_username: string;
  recipient_username: string;
  amount: string;
  token_symbol: string;
  tx_hash: string;
  type: "gift" | "claim";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify service role key (internal call only)
    const authHeader = req.headers.get("Authorization");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader || !authHeader.includes(supabaseServiceKey)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - internal only" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CelebrationRequest = await req.json();
    const { sender_username, recipient_username, amount, token_symbol, tx_hash, type } = body;

    if (!sender_username || !recipient_username || !amount || !token_symbol || !tx_hash) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate celebration image via AI
    const formattedAmount = Number(amount).toLocaleString();
    const dateStr = new Date().toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const isGift = type === "gift";
    const actionText = isGift
      ? `${sender_username} đã tặng ${formattedAmount} ${token_symbol} cho ${recipient_username}`
      : `${recipient_username} đã nhận thưởng ${formattedAmount} ${token_symbol} từ FUN Profile Treasury`;

    const prompt = `Create a beautiful, professional celebration card image (landscape 16:9 ratio). 
Design requirements:
- Background: Rich green gradient (#10b981 to #047857) with subtle golden sparkle effects and cosmic/galaxy texture
- Top center: Place the attached FUN Profile logo (the round green galaxy logo with "FUN Profile" text) prominently at the top center of the card
- Center: "${actionText}" in large bold white text with golden accent on the amount
- Bottom: "TX: ${tx_hash.slice(0, 12)}..." and "${dateStr}" in small white text
- Decorative elements: Golden stars, confetti particles, gift box icons
- Style: Modern, festive, professional fintech celebration card
- No photographs of people, only text and decorative graphics
- The text must be clearly readable against the background
- The logo should be clearly visible and recognizable

CRITICAL TEXT RENDERING RULES:
- The text is in Vietnamese and MUST include all correct diacritical marks (dấu sắc, huyền, hỏi, ngã, nặng, mũ, móc)
- Render the Vietnamese text EXACTLY as provided, character by character: "${actionText}"
- Do NOT remove, change, or omit any Vietnamese diacritics
- Examples of correct rendering: "đã" (not "da"), "tặng" (not "tang"), "cho" (not "cho"), "nhận" (not "nhan"), "thưởng" (not "thuong")
- Double-check every character has the correct accent marks before finalizing`;

    console.log("Generating celebration image with logo...");

    // Logo URL for the AI to reference
    const logoUrl = "https://funprofile.lovable.app/fun-profile-logo-full.jpg";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: logoUrl } }
          ]
        }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData || !imageData.startsWith("data:image/")) {
      throw new Error("No image generated from AI");
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid base64 image format");
    }

    const imageFormat = base64Match[1]; // png, jpeg, etc.
    const base64Content = base64Match[2];

    // Decode base64 to bytes
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log(`Image generated: ${bytes.length} bytes, format: ${imageFormat}`);

    // Upload to Cloudflare R2
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const CLOUDFLARE_ACCESS_KEY_ID = Deno.env.get("CLOUDFLARE_ACCESS_KEY_ID");
    const CLOUDFLARE_SECRET_ACCESS_KEY = Deno.env.get("CLOUDFLARE_SECRET_ACCESS_KEY");
    const CLOUDFLARE_R2_BUCKET_NAME = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME");
    const CLOUDFLARE_R2_PUBLIC_URL = Deno.env.get("CLOUDFLARE_R2_PUBLIC_URL");

    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_ACCESS_KEY_ID || !CLOUDFLARE_SECRET_ACCESS_KEY || !CLOUDFLARE_R2_BUCKET_NAME || !CLOUDFLARE_R2_PUBLIC_URL) {
      throw new Error("Missing Cloudflare R2 configuration");
    }

    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const key = `celebrations/${timestamp}-${randomId}.${imageFormat}`;
    const contentType = `image/${imageFormat}`;

    // AWS Signature V4 for R2
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const region = "auto";
    const service = "s3";
    const host = `${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

    const payloadHashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const payloadHash = Array.from(new Uint8Array(payloadHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const canonicalHeaders = [
      `content-type:${contentType}`,
      `host:${host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join("\n") + "\n";

    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      "PUT",
      `/${CLOUDFLARE_R2_BUCKET_NAME}/${key}`,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const canonicalRequestHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonicalRequest)
    );
    const canonicalRequestHash = Array.from(new Uint8Array(canonicalRequestHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join("\n");

    const signingKey = await getSignatureKey(CLOUDFLARE_SECRET_ACCESS_KEY, dateStamp, region, service);
    const signatureBuffer = await hmacSha256(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const authorizationHeader = `${algorithm} Credential=${CLOUDFLARE_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const endpoint = `https://${host}/${CLOUDFLARE_R2_BUCKET_NAME}/${key}`;

    const uploadResponse = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        Host: host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorizationHeader,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`R2 upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const imageUrl = `${CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
    console.log(`Celebration image uploaded: ${imageUrl}`);

    return new Response(
      JSON.stringify({ image_url: imageUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-celebration-image:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function getSignatureKey(
  key: string, dateStamp: string, regionName: string, serviceName: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode("AWS4" + key).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  return await hmacSha256(kService, "aws4_request");
}
