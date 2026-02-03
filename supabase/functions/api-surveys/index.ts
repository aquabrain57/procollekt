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

    // Validate API key - check if user exists with this subscription
    // For now, we'll use the API key as user_id (simplified - in production, use proper API key management)
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*, user_id")
      .eq("user_id", apiKey)
      .eq("plan", "pro") // Only Pro plan has API access
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid API key or insufficient plan. Pro subscription required for API access.",
          hint: "Use your user_id as API key with an active Pro subscription"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = subscription.user_id;
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const surveyId = pathParts[pathParts.length - 1] !== "api-surveys" ? pathParts[pathParts.length - 1] : null;

    // GET /api-surveys - List all surveys for user
    if (req.method === "GET" && !surveyId) {
      const { data: surveys, error } = await supabase
        .from("surveys")
        .select("id, title, description, status, created_at, updated_at, cover_image_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ surveys, count: surveys.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /api-surveys/:id - Get single survey with fields and responses
    if (req.method === "GET" && surveyId) {
      const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .eq("user_id", userId)
        .single();

      if (surveyError || !survey) {
        return new Response(
          JSON.stringify({ error: "Survey not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: fields } = await supabase
        .from("survey_fields")
        .select("*")
        .eq("survey_id", surveyId)
        .order("field_order", { ascending: true });

      const { data: responses } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({ 
          survey, 
          fields: fields || [], 
          responses: responses || [],
          response_count: responses?.length || 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /api-surveys - Create new survey
    if (req.method === "POST" && !surveyId) {
      const body = await req.json();
      
      if (!body.title) {
        return new Response(
          JSON.stringify({ error: "Title is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: survey, error } = await supabase
        .from("surveys")
        .insert({
          user_id: userId,
          title: body.title,
          description: body.description || null,
          status: body.status || "draft",
          cover_image_url: body.cover_image_url || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add fields if provided
      if (body.fields && Array.isArray(body.fields)) {
        const fieldsToInsert = body.fields.map((field: any, index: number) => ({
          survey_id: survey.id,
          field_type: field.field_type || "text",
          label: field.label,
          placeholder: field.placeholder || null,
          required: field.required || false,
          options: field.options || null,
          min_value: field.min_value || null,
          max_value: field.max_value || null,
          field_order: index,
        }));

        await supabase.from("survey_fields").insert(fieldsToInsert);
      }

      return new Response(
        JSON.stringify({ survey, message: "Survey created successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /api-surveys/:id - Update survey
    if (req.method === "PUT" && surveyId) {
      const body = await req.json();

      const { data: survey, error } = await supabase
        .from("surveys")
        .update({
          title: body.title,
          description: body.description,
          status: body.status,
          cover_image_url: body.cover_image_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", surveyId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ survey, message: "Survey updated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /api-surveys/:id - Delete survey
    if (req.method === "DELETE" && surveyId) {
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", surveyId)
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: "Survey deleted successfully" }),
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
