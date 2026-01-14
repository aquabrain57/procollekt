import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FieldData {
  id: string;
  label: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
}

interface AnalysisRequest {
  survey: {
    title: string;
    description: string;
  };
  fields: FieldData[];
  statistics: {
    total: number;
    completionRate: number;
    locationRate: number;
    avgPerDay: number;
    daysActive: number;
    peakHour: string;
  };
  fieldAnalytics: Array<{
    field: string;
    type: string;
    data: Array<{ option: string; count: number; percentage: number }>;
    stats?: { avg: number; min: number; max: number; median: number };
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { survey, fields, statistics, fieldAnalytics }: AnalysisRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a comprehensive analysis prompt
    const systemPrompt = `Tu es un analyste de données expert spécialisé dans l'analyse d'enquêtes terrain et la génération de rapports exploitables. Tu dois fournir:
1. Un résumé exécutif clair et concis
2. Les tendances clés identifiées dans les données
3. Les anomalies ou points d'attention
4. Des recommandations actionables pour la prise de décision

Réponds en français, de manière professionnelle et structurée. Utilise des puces et des sections claires.`;

    const analysisPrompt = `Analyse les données suivantes de l'enquête "${survey.title}":

STATISTIQUES GLOBALES:
- Total des réponses: ${statistics.total}
- Taux de complétion: ${statistics.completionRate}%
- Taux de géolocalisation: ${statistics.locationRate}%
- Moyenne par jour: ${statistics.avgPerDay} réponses
- Jours actifs: ${statistics.daysActive}
- Heure de pointe: ${statistics.peakHour}

ANALYSE PAR QUESTION:
${fieldAnalytics.map(fa => {
  let analysis = `\n• ${fa.field} (${fa.type}):`;
  if (fa.data && fa.data.length > 0) {
    analysis += fa.data.slice(0, 5).map(d => `\n  - ${d.option}: ${d.count} réponses (${d.percentage}%)`).join('');
  }
  if (fa.stats) {
    analysis += `\n  Statistiques: Moy=${fa.stats.avg.toFixed(1)}, Min=${fa.stats.min}, Max=${fa.stats.max}, Médiane=${fa.stats.median}`;
  }
  return analysis;
}).join('')}

Fournis:
1. RÉSUMÉ EXÉCUTIF (3-4 phrases max)
2. TENDANCES CLÉS (3-5 points)
3. ANOMALIES OU POINTS D'ATTENTION (si détectées)
4. RECOMMANDATIONS (3-5 actions concrètes)

Réponds de manière structurée avec des titres en majuscules.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: analysisPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, veuillez réessayer plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants, veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'analyse IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const analysisContent = data.choices?.[0]?.message?.content || "Analyse non disponible";

    // Parse the response into sections
    const sections = {
      summary: "",
      trends: [] as string[],
      anomalies: [] as string[],
      recommendations: [] as string[],
    };

    const lines = analysisContent.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes('RÉSUMÉ') || trimmed.includes('RESUME')) {
        currentSection = 'summary';
      } else if (trimmed.includes('TENDANCE')) {
        currentSection = 'trends';
      } else if (trimmed.includes('ANOMALIE') || trimmed.includes('ATTENTION') || trimmed.includes('POINT')) {
        currentSection = 'anomalies';
      } else if (trimmed.includes('RECOMMANDATION') || trimmed.includes('ACTION')) {
        currentSection = 'recommendations';
      } else {
        const cleanLine = trimmed.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '');
        if (cleanLine && cleanLine.length > 3) {
          if (currentSection === 'summary') {
            sections.summary += (sections.summary ? ' ' : '') + cleanLine;
          } else if (currentSection === 'trends') {
            sections.trends.push(cleanLine);
          } else if (currentSection === 'anomalies') {
            sections.anomalies.push(cleanLine);
          } else if (currentSection === 'recommendations') {
            sections.recommendations.push(cleanLine);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          raw: analysisContent,
          sections,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-survey:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
