import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: "Le prompt est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Configuration API manquante" }),
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

    console.log("Calling Lovable AI Gateway with prompt:", prompt.substring(0, 100) + "...");

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
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
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
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response content:", content.substring(0, 200) + "...");

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
          throw new Error("No valid JSON found in response");
        }
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      throw new Error("Failed to parse AI response");
    }

    if (!Array.isArray(questions)) {
      throw new Error("Questions is not an array");
    }

    console.log(`Successfully generated ${questions.length} questions`);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in generate-survey-questions:", error);
    const message = error instanceof Error ? error.message : "Erreur interne du serveur";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
