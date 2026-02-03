import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANGEL_AI_ENDPOINT = "https://ssjoetiitctqzapymtzl.supabase.co/functions/v1/angel-chat";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ANGEL_AI_API_KEY = Deno.env.get("ANGEL_AI_API_KEY");

    if (!ANGEL_AI_API_KEY) {
      console.error("ANGEL_AI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "ANGEL_AI_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { message, messages } = await req.json();

    // ANGEL AI expects both message and messages array
    let requestBody: any;
    let messageContent: string;
    
    if (message) {
      messageContent = message;
    } else if (messages && Array.isArray(messages) && messages.length > 0) {
      // Get latest user message from array
      const latestUserMessage = messages
        .filter((m: any) => m.role === "user")
        .pop();
      messageContent = latestUserMessage?.content || "";
    } else {
      messageContent = "";
    }
    
    if (!messageContent) {
      return new Response(
        JSON.stringify({ error: "Missing message or messages in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send both message and messages array to ANGEL AI API
    requestBody = { 
      message: messageContent,
      messages: [{ role: "user", content: messageContent }]
    };

    console.log("Calling ANGEL AI with request:", JSON.stringify(requestBody));

    // Call ANGEL AI API
    const response = await fetch(ANGEL_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": ANGEL_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("ANGEL AI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ANGEL AI error:", response.status, errorText);

      // Handle specific error codes
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please check your ANGEL AI subscription." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your ANGEL_AI_API_KEY." }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: `ANGEL AI error: ${response.status}` }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response back to the client
    // Check content type to determine if it's SSE or JSON
    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("text/event-stream")) {
      // SSE streaming response - pass through directly
      console.log("Streaming SSE response from ANGEL AI");
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // JSON response - convert to SSE format for consistency
      console.log("Converting JSON response to SSE format");
      const jsonResponse = await response.json();
      
      // Create a simple SSE stream from the JSON response
      const encoder = new TextEncoder();
      const content = jsonResponse.response || jsonResponse.content || jsonResponse.message || JSON.stringify(jsonResponse);
      
      const stream = new ReadableStream({
        start(controller) {
          // Send content as single SSE event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }
  } catch (error) {
    console.error("angel-chat edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
