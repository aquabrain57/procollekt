import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, BarChart3, PieChart, Hash, MessageSquare, Star } from 'lucide-react';
import { DbSurveyField, DbSurveyResponse } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

interface FieldAnalysisCardProps {
  field: DbSurveyField;
  responses: DbSurveyResponse[];
  index?: number;
  compact?: boolean;
}

export const FieldAnalysisCard = ({ field, responses, index, compact = false }: FieldAnalysisCardProps) => {
  const [expanded, setExpanded] = useState(!compact);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const analysis = useMemo(() => {
    const values = responses.map(r => r.data[field.id]).filter(v => v !== undefined && v !== null && v !== '');
    const responseRate = responses.length > 0 ? Math.round((values.length / responses.length) * 100) : 0;

    if (field.field_type === 'select' || field.field_type === 'multiselect') {
      const optionCounts: Record<string, number> = {};
      values.forEach(v => {
        if (Array.isArray(v)) {
          v.forEach(item => {
            optionCounts[String(item)] = (optionCounts[String(item)] || 0) + 1;
          });
        } else {
          optionCounts[String(v)] = (optionCounts[String(v)] || 0) + 1;
        }
      });

      const total = Object.values(optionCounts).reduce((a, b) => a + b, 0);
      const chartData = Object.entries(optionCounts)
        .map(([name, value]) => ({
          name: name.length > 25 ? name.slice(0, 25) + '...' : name,
          fullName: name,
          value,
          percentage: total > 0 ? Math.round((value / total) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);

      const top = chartData[0];
      const hasConcentration = top && top.percentage > 50;

      return {
        type: 'categorical' as const,
        data: chartData,
        total,
        responseRate,
        responseCount: values.length,
        insight: hasConcentration 
          ? `"${top.fullName}" domine avec ${top.percentage}%` 
          : chartData.length > 1 
            ? `Répartition entre ${chartData.length} options` 
            : 'Données insuffisantes',
        sentiment: hasConcentration ? 'highlight' : 'neutral',
      };
    }

    if (field.field_type === 'number' || field.field_type === 'rating') {
      const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
      const avg = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
      const min = numbers.length > 0 ? Math.min(...numbers) : 0;
      const max = numbers.length > 0 ? Math.max(...numbers) : 0;
      const sorted = [...numbers].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

      // Distribution
      const distribution: Record<number, number> = {};
      numbers.forEach(n => {
        distribution[n] = (distribution[n] || 0) + 1;
      });

      const chartData = Object.entries(distribution)
        .map(([value, count]) => ({
          name: String(value),
          fullName: String(value),
          value: count,
          percentage: Math.round((count / numbers.length) * 100),
        }))
        .sort((a, b) => Number(a.name) - Number(b.name));

      let insight = '';
      if (field.field_type === 'rating') {
        const maxRating = field.max_value || 5;
        const avgPercent = (avg / maxRating) * 100;
        insight = avgPercent >= 80 ? `Excellent score: ${avg.toFixed(1)}/${maxRating}` 
          : avgPercent >= 60 ? `Bon score: ${avg.toFixed(1)}/${maxRating}` 
          : `Score faible: ${avg.toFixed(1)}/${maxRating}`;
      } else {
        insight = `Moyenne: ${avg.toFixed(1)} | Min: ${min} | Max: ${max}`;
      }

      return {
        type: 'numeric' as const,
        data: chartData,
        stats: { avg, min, max, median, count: numbers.length },
        responseRate,
        responseCount: values.length,
        insight,
        sentiment: field.field_type === 'rating' && (avg / (field.max_value || 5)) >= 0.8 ? 'positive' : 'neutral',
      };
    }

    // Text fields
    const uniqueValues = new Set(values.map(v => String(v).toLowerCase().trim()));
    return {
      type: 'text' as const,
      responseCount: values.length,
      uniqueCount: uniqueValues.size,
      responseRate,
      insight: `${values.length} réponses (${uniqueValues.size} uniques)`,
      sentiment: 'neutral',
    };
  }, [field, responses]);

  const getFieldIcon = () => {
    switch (field.field_type) {
      case 'select':
      case 'multiselect':
      case 'multiselect':
        return <BarChart3 className="h-4 w-4" />;
      case 'number':
        return <Hash className="h-4 w-4" />;
      case 'rating':
        return <Star className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className={analysis.sentiment === 'highlight' ? 'border-primary/30' : ''}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <div className="p-1.5 rounded bg-muted shrink-0 mt-0.5">
                  {getFieldIcon()}
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    {index !== undefined && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Q{index + 1}
                      </Badge>
                    )}
                    <span className="truncate">{field.label}</span>
                    {field.required && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        Requis
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{analysis.insight}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {analysis.responseRate}% répondu
                </Badge>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {analysis.type === 'categorical' && analysis.data && analysis.data.length > 0 && (
              <div className="space-y-4">
                {/* Chart type toggle */}
                <div className="flex justify-end gap-1">
                  <Button 
                    variant={chartType === 'bar' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setChartType('bar')}
                    className="h-7 px-2"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant={chartType === 'pie' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setChartType('pie')}
                    className="h-7 px-2"
                  >
                    <PieChart className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Chart */}
                <div className="h-[200px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={analysis.data.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Réponses']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {analysis.data.slice(0, 10).map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <RechartsPieChart>
                        <Pie
                          data={analysis.data.slice(0, 8)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ percentage }) => `${percentage}%`}
                          labelLine={false}
                        >
                          {analysis.data.slice(0, 8).map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [value, 'Réponses']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </RechartsPieChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Data table */}
                <div className="space-y-2">
                  {analysis.data.slice(0, 8).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded shrink-0" 
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="flex-1 truncate" title={item.fullName}>{item.fullName}</span>
                      <span className="font-medium">{item.value}</span>
                      <span className="text-muted-foreground w-12 text-right">{item.percentage}%</span>
                      <Progress value={item.percentage} className="w-16 h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.type === 'numeric' && 'stats' in analysis && analysis.stats && (
              <div className="space-y-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg sm:text-xl font-bold text-primary">{analysis.stats.avg.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">Moyenne</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg sm:text-xl font-bold">{analysis.stats.median}</p>
                    <p className="text-[10px] text-muted-foreground">Médiane</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg sm:text-xl font-bold">{analysis.stats.min}</p>
                    <p className="text-[10px] text-muted-foreground">Minimum</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg sm:text-xl font-bold">{analysis.stats.max}</p>
                    <p className="text-[10px] text-muted-foreground">Maximum</p>
                  </div>
                </div>

                {/* Distribution chart */}
                {analysis.data && analysis.data.length > 0 && (
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysis.data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Réponses']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {analysis.type === 'text' && (
              <div className="text-center py-6 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{analysis.responseCount} réponses textuelles</p>
                <p className="text-xs">{analysis.uniqueCount} réponses uniques</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
