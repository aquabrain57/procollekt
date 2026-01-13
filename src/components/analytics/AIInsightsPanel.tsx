import { useState } from 'react';
import { Brain, Lightbulb, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { DbSurvey, DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AIInsightsPanelProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
  globalStats: {
    total: number;
    completionRate: number;
    locationRate: number;
  };
}

export const AIInsightsPanel = ({ survey, responses, fields, globalStats }: AIInsightsPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);

  // Generate basic insights locally (no API needed)
  const localInsights = (() => {
    const result: { type: 'success' | 'warning' | 'info'; title: string; text: string }[] = [];

    // Sample size
    if (globalStats.total >= 100) {
      result.push({ type: 'success', title: 'Échantillon représentatif', text: `${globalStats.total} répondants - statistiquement significatif` });
    } else if (globalStats.total >= 30) {
      result.push({ type: 'info', title: 'Bon échantillon', text: `${globalStats.total} répondants - tendances fiables` });
    } else {
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
    } else if (globalStats.locationRate < 50) {
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
        if (sorted.length > 0) {
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
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Insights automatiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {localInsights.map((insight, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                insight.type === 'success' ? 'bg-green-50 border-green-200' :
                insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-2">
                  {insight.type === 'success' ? <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" /> :
                   insight.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" /> :
                   <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />}
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {localInsights.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Collectez plus de données pour générer des insights</p>
        </div>
      )}
    </div>
  );
};
