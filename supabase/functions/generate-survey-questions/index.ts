import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize log strings to prevent log injection
const sanitizeLog = (str: string, maxLength = 100) => 
  str.replace(/[\n\r\t]/g, ' ').substring(0, maxLength);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Auth: missing header");
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Config: missing env vars");
      return new Response(
        JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth: verification failed");
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: "Le prompt est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Config: API key missing");
      return new Response(
        JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu es un expert en création d'enquêtes et de questionnaires. Tu dois générer des questions de sondage basées sur la demande de l'utilisateur.

Tu dois retourner un tableau JSON de questions avec la structure suivante:
{
  "questions": [
    {
      "field_type": "text" | "number" | "select" | "multiselect" | "date" | "location" | "photo" | "rating",
      "label": "La question à poser",
      "placeholder": "Texte d'aide optionnel",
      "required": true ou false,
      "options": [{"value": "id", "label": "Libellé"}] (seulement pour select/multiselect),
      "min_value": nombre (seulement pour rating, généralement 1),
      "max_value": nombre (seulement pour rating, généralement 5)
    }
  ]
}

Règles importantes:
- Génère entre 5 et 15 questions pertinentes
- Utilise des types de champs variés et appropriés
- Les questions doivent être claires et concises
- Inclus des questions obligatoires (required: true) pour les informations essentielles
- Pour les questions à choix, fournis des options réalistes et complètes
- Si pertinent, inclus une question de localisation GPS et/ou photo
- Les questions doivent être en français
- Retourne UNIQUEMENT le JSON, sans texte additionnel`;

    // Log request metadata only (no sensitive content)
    console.log("AI request:", { userId: user.id, promptLength: prompt.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Génère un questionnaire pour: ${prompt}` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("AI Gateway:", { status: response.status });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("AI: empty response");
      return new Response(
        JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the response
    let questions;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions || parsed;
      } else {
        // Try parsing the content directly as an array
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          questions = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error("Invalid response format");
        }
      }
    } catch (parseError) {
      console.error("AI: parse error");
      return new Response(
        JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(questions)) {
      console.error("AI: invalid format");
      return new Response(
        JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI success:", { questionCount: questions.length });

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Function error:", { type: error instanceof Error ? error.constructor.name : "unknown" });
    return new Response(
      JSON.stringify({ error: "Une erreur est survenue. Veuillez réessayer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
