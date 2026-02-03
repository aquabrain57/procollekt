import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get API key from header
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key required. Include x-api-key header or Authorization: Bearer <key>" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role for API operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*, user_id")
      .eq("user_id", apiKey)
      .eq("plan", "pro")
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid API key or insufficient plan. Pro subscription required for API access." 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = subscription.user_id;
    const url = new URL(req.url);
    const surveyId = url.searchParams.get("survey_id");
    const responseId = url.searchParams.get("response_id");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // GET /api-responses?survey_id=xxx - List responses
    if (req.method === "GET") {
      // First verify user owns the survey
      if (surveyId) {
        const { data: survey, error: surveyError } = await supabase
          .from("surveys")
          .select("id")
          .eq("id", surveyId)
          .eq("user_id", userId)
          .single();

        if (surveyError || !survey) {
          return new Response(
            JSON.stringify({ error: "Survey not found or access denied" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      let query = supabase
        .from("survey_responses")
        .select("*, surveys!inner(user_id)")
        .eq("surveys.user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (surveyId) {
        query = query.eq("survey_id", surveyId);
      }

      if (responseId) {
        query = query.eq("id", responseId);
      }

      const { data: responses, error, count } = await query;

      if (error) throw error;

      // Clean up response to remove join data
      const cleanResponses = responses?.map(r => {
        const { surveys, ...rest } = r;
        return rest;
      }) || [];

      return new Response(
        JSON.stringify({ 
          responses: cleanResponses, 
          count: cleanResponses.length,
          limit,
          offset
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /api-responses - Create new response
    if (req.method === "POST") {
      const body = await req.json();
      
      if (!body.survey_id || !body.data) {
        return new Response(
          JSON.stringify({ error: "survey_id and data are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify survey exists and is active
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select("id, status, user_id")
        .eq("id", body.survey_id)
        .single();

      if (surveyError || !survey) {
        return new Response(
          JSON.stringify({ error: "Survey not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (survey.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Survey is not active" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: response, error } = await supabase
        .from("survey_responses")
        .insert({
          survey_id: body.survey_id,
          user_id: userId,
          data: body.data,
          location: body.location || null,
          sync_status: "synced",
          surveyor_id: body.surveyor_id || null,
          badge_id: body.badge_id || null,
          surveyor_validated: body.surveyor_validated || false,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ response, message: "Response created successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /api-responses?response_id=xxx - Delete response
    if (req.method === "DELETE" && responseId) {
      // Verify ownership through survey
      const { data: response, error: respError } = await supabase
        .from("survey_responses")
        .select("*, surveys!inner(user_id)")
        .eq("id", responseId)
        .eq("surveys.user_id", userId)
        .single();

      if (respError || !response) {
        return new Response(
          JSON.stringify({ error: "Response not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("survey_responses")
        .delete()
        .eq("id", responseId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: "Response deleted successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
