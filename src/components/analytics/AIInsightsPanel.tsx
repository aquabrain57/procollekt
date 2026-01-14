import { useState, useMemo } from 'react';
import { Brain, Lightbulb, TrendingUp, AlertTriangle, Loader2, Sparkles, Target, CheckCircle, RefreshCw } from 'lucide-react';
import { DbSurvey, DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIInsightsPanelProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
  globalStats: {
    total: number;
    completionRate: number;
    locationRate: number;
    avgPerDay?: number;
    daysActive?: number;
    peakHour?: string;
  };
}

interface AIAnalysis {
  raw: string;
  sections: {
    summary: string;
    trends: string[];
    anomalies: string[];
    recommendations: string[];
  };
}

export const AIInsightsPanel = ({ survey, responses, fields, globalStats }: AIInsightsPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate basic insights locally (no API needed)
  const localInsights = useMemo(() => {
    const result: { type: 'success' | 'warning' | 'info'; title: string; text: string }[] = [];

    // Sample size
    if (globalStats.total >= 100) {
      result.push({ type: 'success', title: 'Échantillon représentatif', text: `${globalStats.total} répondants - statistiquement significatif` });
    } else if (globalStats.total >= 30) {
      result.push({ type: 'info', title: 'Bon échantillon', text: `${globalStats.total} répondants - tendances fiables` });
    } else if (globalStats.total > 0) {
      result.push({ type: 'warning', title: 'Échantillon limité', text: `Seulement ${globalStats.total} répondants - continuer la collecte` });
    }

    // Completion
    if (globalStats.completionRate >= 90) {
      result.push({ type: 'success', title: 'Excellent taux de complétion', text: `${globalStats.completionRate}% - qualité optimale` });
    } else if (globalStats.completionRate < 70) {
      result.push({ type: 'warning', title: 'Complétion à améliorer', text: `${globalStats.completionRate}% - simplifier le questionnaire` });
    }

    // GPS
    if (globalStats.locationRate >= 80) {
      result.push({ type: 'success', title: 'Bonne couverture GPS', text: `${globalStats.locationRate}% des réponses géolocalisées` });
    } else if (globalStats.locationRate < 50 && globalStats.locationRate > 0) {
      result.push({ type: 'info', title: 'GPS limité', text: `Analyse géographique partielle (${globalStats.locationRate}%)` });
    }

    // Field-specific insights
    fields.forEach(field => {
      if (field.field_type === 'select' || field.field_type === 'multiselect') {
        const values = responses.map(r => r.data[field.id]).filter(v => v);
        const counts: Record<string, number> = {};
        values.forEach(v => {
          const val = Array.isArray(v) ? v[0] : v;
          if (val) counts[String(val)] = (counts[String(val)] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0 && values.length > 5) {
          const topPercent = Math.round((sorted[0][1] / values.length) * 100);
          if (topPercent > 60) {
            result.push({
              type: 'info',
              title: `Concentration sur "${field.label}"`,
              text: `"${sorted[0][0]}" représente ${topPercent}% - opportunité de marché`
            });
          }
        }
      }
    });

    return result.slice(0, 6);
  }, [responses, fields, globalStats]);

  // Prepare field analytics for AI
  const prepareFieldAnalytics = () => {
    return fields.map(field => {
      const values = responses.map(r => r.data[field.id]).filter(v => v !== undefined && v !== null && v !== '');
      
      if (field.field_type === 'select' || field.field_type === 'multiselect') {
        const counts: Record<string, number> = {};
        values.forEach(v => {
          const items = Array.isArray(v) ? v : [v];
          items.forEach(item => {
            const key = String(item);
            counts[key] = (counts[key] || 0) + 1;
          });
        });
        
        const total = values.length;
        const data = Object.entries(counts)
          .map(([option, count]) => ({
            option,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          field: field.label,
          type: 'categorical',
          data,
        };
      }

      if (field.field_type === 'number' || field.field_type === 'rating') {
        const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          const sorted = [...numbers].sort((a, b) => a - b);
          return {
            field: field.label,
            type: 'numeric',
            data: [],
            stats: {
              avg,
              min: Math.min(...numbers),
              max: Math.max(...numbers),
              median: sorted[Math.floor(sorted.length / 2)],
            },
          };
        }
      }

      return {
        field: field.label,
        type: 'text',
        data: [],
        count: values.length,
      };
    }).filter(fa => fa.data.length > 0 || fa.stats || fa.count);
  };

  const generateAIAnalysis = async () => {
    if (responses.length < 5) {
      toast.error('Minimum 5 réponses requises pour l\'analyse IA');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fieldAnalytics = prepareFieldAnalytics();
      
      const { data, error: fnError } = await supabase.functions.invoke('analyze-survey', {
        body: {
          survey: {
            title: survey.title,
            description: survey.description || '',
          },
          fields: fields.map(f => ({
            id: f.id,
            label: f.label,
            type: f.field_type,
            options: f.options,
          })),
          statistics: {
            total: globalStats.total,
            completionRate: globalStats.completionRate,
            locationRate: globalStats.locationRate,
            avgPerDay: globalStats.avgPerDay || 0,
            daysActive: globalStats.daysActive || 0,
            peakHour: globalStats.peakHour || 'N/A',
          },
          fieldAnalytics,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.analysis) {
        setAiAnalysis(data.analysis);
        toast.success('Analyse IA générée avec succès');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Analysis Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Analyse par IA</CardTitle>
                <CardDescription className="text-xs">
                  Résumé automatique, tendances et recommandations
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={generateAIAnalysis}
              disabled={loading || responses.length < 5}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse...
                </>
              ) : aiAnalysis ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Actualiser
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analyser
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}

          {responses.length < 5 && !aiAnalysis && (
            <div className="text-center py-6 text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Minimum 5 réponses requises</p>
              <p className="text-xs">Collectez plus de données pour l'analyse IA</p>
            </div>
          )}

          {aiAnalysis && (
            <div className="space-y-4">
              {/* Summary */}
              {aiAnalysis.sections.summary && (
                <div className="p-4 rounded-lg bg-card border">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-primary/10 mt-0.5">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Résumé Exécutif</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {aiAnalysis.sections.summary}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trends */}
              {aiAnalysis.sections.trends.length > 0 && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/50 mt-0.5">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                        Tendances Clés
                      </h4>
                      <ul className="space-y-1.5">
                        {aiAnalysis.sections.trends.slice(0, 5).map((trend, idx) => (
                          <li key={idx} className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2">
                            <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{trend}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {aiAnalysis.sections.anomalies.length > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-900/50 mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                        Points d'Attention
                      </h4>
                      <ul className="space-y-1.5">
                        {aiAnalysis.sections.anomalies.slice(0, 3).map((anomaly, idx) => (
                          <li key={idx} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                            <span className="shrink-0">⚠️</span>
                            <span>{anomaly}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {aiAnalysis.sections.recommendations.length > 0 && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/50 mt-0.5">
                      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                        Recommandations
                      </h4>
                      <ul className="space-y-1.5">
                        {aiAnalysis.sections.recommendations.slice(0, 5).map((rec, idx) => (
                          <li key={idx} className="text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                            <span className="shrink-0 font-semibold">{idx + 1}.</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!aiAnalysis && responses.length >= 5 && !loading && (
            <div className="text-center py-6 text-muted-foreground">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">Prêt pour l'analyse</p>
              <p className="text-xs">Cliquez sur "Analyser" pour générer les insights IA</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights automatiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          {localInsights.length > 0 ? (
            <div className="space-y-3">
              {localInsights.map((insight, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  insight.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                  insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' :
                  'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {insight.type === 'success' ? <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" /> :
                     insight.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" /> :
                     <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground">{insight.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Collectez plus de données pour générer des insights</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
