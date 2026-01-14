import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, BarChart3, PieChart, Hash, MessageSquare, Star, Calendar, MapPin, Phone, Mail, User } from 'lucide-react';
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
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

interface FieldAnalysisCardProps {
  field: DbSurveyField;
  responses: DbSurveyResponse[];
  index?: number;
  compact?: boolean;
}

interface FieldOption {
  value: string;
  label: string;
}

export const FieldAnalysisCard = ({ field, responses, index, compact = false }: FieldAnalysisCardProps) => {
  const [expanded, setExpanded] = useState(!compact);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // Get field options from the form definition
  const getFieldOptions = (): FieldOption[] => {
    if (!field.options) return [];
    if (Array.isArray(field.options)) {
      return field.options.map((opt: any) => {
        if (typeof opt === 'string') {
          return { value: opt, label: opt };
        }
        return { value: opt.value || opt, label: opt.label || opt.value || opt };
      });
    }
    return [];
  };

  const analysis = useMemo(() => {
    const allValues = responses.map(r => r.data[field.id]);
    const values = allValues.filter(v => v !== undefined && v !== null && v !== '');
    const responseRate = responses.length > 0 ? Math.round((values.length / responses.length) * 100) : 0;

    // CATEGORICAL FIELDS (select, multiselect)
    if (field.field_type === 'select' || field.field_type === 'multiselect') {
      const fieldOptions = getFieldOptions();
      const optionCounts: Record<string, number> = {};
      
      // Initialize all options from the form with 0
      fieldOptions.forEach(opt => {
        optionCounts[opt.label] = 0;
      });

      // Count actual responses - use option labels
      values.forEach(v => {
        if (Array.isArray(v)) {
          v.forEach(item => {
            const itemStr = String(item);
            // Find matching option label
            const option = fieldOptions.find(opt => opt.value === itemStr || opt.label === itemStr);
            const label = option ? option.label : itemStr;
            optionCounts[label] = (optionCounts[label] || 0) + 1;
          });
        } else {
          const vStr = String(v);
          const option = fieldOptions.find(opt => opt.value === vStr || opt.label === vStr);
          const label = option ? option.label : vStr;
          optionCounts[label] = (optionCounts[label] || 0) + 1;
        }
      });

      // Filter out zero counts if there are actual responses for unlisted options
      const totalResponses = values.length;
      const chartData = Object.entries(optionCounts)
        .filter(([_, value]) => value > 0 || fieldOptions.some(opt => opt.label === _))
        .map(([name, value]) => ({
          name: name.length > 25 ? name.slice(0, 25) + '...' : name,
          fullName: name,
          value,
          percentage: totalResponses > 0 ? Math.round((value / totalResponses) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);

      const top = chartData.find(d => d.value > 0);
      const hasConcentration = top && top.percentage > 50;

      return {
        type: 'categorical' as const,
        data: chartData,
        total: totalResponses,
        responseRate,
        responseCount: values.length,
        insight: hasConcentration 
          ? `"${top.fullName}" domine avec ${top.percentage}% (${top.value}/${totalResponses})` 
          : chartData.filter(d => d.value > 0).length > 1 
            ? `Répartition entre ${chartData.filter(d => d.value > 0).length} options` 
            : chartData.length > 0 && chartData[0].value > 0 
              ? `${chartData[0].fullName}: ${chartData[0].percentage}% (${chartData[0].value})`
              : 'Aucune réponse',
        sentiment: hasConcentration ? 'highlight' : 'neutral',
      };
    }

    // DATE FIELDS
    if (field.field_type === 'date' || field.field_type === 'datetime') {
      const validDates = values
        .map(v => {
          try {
            const d = typeof v === 'string' ? parseISO(v) : new Date(v);
            return isValid(d) ? d : null;
          } catch {
            return null;
          }
        })
        .filter((d): d is Date => d !== null);

      // Group by month
      const byMonth: Record<string, number> = {};
      validDates.forEach(d => {
        const month = format(d, 'MMM yyyy', { locale: fr });
        byMonth[month] = (byMonth[month] || 0) + 1;
      });

      const chartData = Object.entries(byMonth)
        .map(([name, value]) => ({
          name,
          fullName: name,
          value,
          percentage: validDates.length > 0 ? Math.round((value / validDates.length) * 100) : 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const earliest = validDates.length > 0 ? format(new Date(Math.min(...validDates.map(d => d.getTime()))), 'dd/MM/yyyy') : 'N/A';
      const latest = validDates.length > 0 ? format(new Date(Math.max(...validDates.map(d => d.getTime()))), 'dd/MM/yyyy') : 'N/A';

      return {
        type: 'date' as const,
        data: chartData,
        responseRate,
        responseCount: values.length,
        stats: { earliest, latest, count: validDates.length },
        insight: validDates.length > 0 
          ? `Du ${earliest} au ${latest} (${validDates.length} dates)` 
          : 'Aucune date valide',
        sentiment: 'neutral',
      };
    }

    // LOCATION FIELDS
    if (field.field_type === 'location') {
      const locations = values.filter(v => v && typeof v === 'object');
      
      // Count by location text or coordinates
      const locationCounts: Record<string, number> = {};
      locations.forEach(loc => {
        const key = typeof loc === 'string' ? loc : (loc.address || loc.name || `${loc.lat || loc.latitude},${loc.lng || loc.longitude}`);
        locationCounts[key] = (locationCounts[key] || 0) + 1;
      });

      const chartData = Object.entries(locationCounts)
        .map(([name, value]) => ({
          name: name.length > 30 ? name.slice(0, 30) + '...' : name,
          fullName: name,
          value,
          percentage: locations.length > 0 ? Math.round((value / locations.length) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        type: 'location' as const,
        data: chartData.slice(0, 10),
        responseRate,
        responseCount: values.length,
        total: locations.length,
        insight: locations.length > 0 
          ? `${locations.length} localisations sur ${chartData.length} lieux` 
          : 'Aucune localisation',
        sentiment: 'neutral',
      };
    }

    // CONTACT FIELDS (phone, email)
    if (field.field_type === 'phone' || field.field_type === 'email') {
      const uniqueValues = new Set(values.map(v => String(v).toLowerCase().trim()));
      const sampleValues = values.slice(0, 10).map(v => String(v));

      return {
        type: 'contact' as const,
        data: sampleValues.map(v => ({ name: v, fullName: v, value: 1, percentage: 0 })),
        responseRate,
        responseCount: values.length,
        uniqueCount: uniqueValues.size,
        insight: `${values.length} contacts collectés (${uniqueValues.size} uniques)`,
        sentiment: 'neutral',
      };
    }

    // NUMERIC FIELDS
    if (field.field_type === 'number' || field.field_type === 'rating' || field.field_type === 'decimal' || field.field_type === 'range') {
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
        insight = avgPercent >= 80 ? `Excellent: ${avg.toFixed(1)}/${maxRating}` 
          : avgPercent >= 60 ? `Bon: ${avg.toFixed(1)}/${maxRating}` 
          : `Score: ${avg.toFixed(1)}/${maxRating}`;
      } else {
        insight = numbers.length > 0 
          ? `Moy: ${avg.toFixed(1)} | Min: ${min} | Max: ${max}` 
          : 'Aucune valeur';
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

    // TEXT FIELDS (default)
    const uniqueValues = new Set(values.map(v => String(v).toLowerCase().trim()));
    const sampleValues = values.slice(0, 5).map(v => String(v).slice(0, 100));
    
    return {
      type: 'text' as const,
      responseCount: values.length,
      uniqueCount: uniqueValues.size,
      responseRate,
      sampleValues,
      insight: `${values.length} réponses (${uniqueValues.size} uniques)`,
      sentiment: 'neutral',
    };
  }, [field, responses]);

  const getFieldIcon = () => {
    switch (field.field_type) {
      case 'select':
      case 'multiselect':
        return <BarChart3 className="h-4 w-4" />;
      case 'number':
      case 'decimal':
      case 'range':
        return <Hash className="h-4 w-4" />;
      case 'rating':
        return <Star className="h-4 w-4" />;
      case 'date':
      case 'datetime':
      case 'time':
        return <Calendar className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-muted-foreground">
            {data.value} réponse{data.value > 1 ? 's' : ''} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
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
            {/* CATEGORICAL DISPLAY */}
            {analysis.type === 'categorical' && analysis.data && analysis.data.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Total: <span className="font-medium">{analysis.total} réponses</span>
                  </p>
                  <div className="flex gap-1">
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
                </div>

                {/* Chart */}
                <div className="h-[200px] sm:h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={analysis.data.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {analysis.data.slice(0, 10).map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <RechartsPieChart>
                        <Pie
                          data={analysis.data.filter(d => d.value > 0).slice(0, 8)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ percentage }) => `${percentage}%`}
                          labelLine={false}
                        >
                          {analysis.data.filter(d => d.value > 0).slice(0, 8).map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </RechartsPieChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Detailed table with frequencies and percentages */}
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Détail par option:</p>
                  {analysis.data.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded shrink-0" 
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="flex-1 truncate" title={item.fullName}>{item.fullName}</span>
                      <span className="font-medium text-primary">{item.value}</span>
                      <span className="text-muted-foreground w-14 text-right">({item.percentage}%)</span>
                      <Progress value={item.percentage} className="w-16 h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DATE DISPLAY */}
            {analysis.type === 'date' && 'stats' in analysis && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-bold text-primary">{analysis.stats?.earliest}</p>
                    <p className="text-[10px] text-muted-foreground">Plus ancienne</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-bold text-primary">{analysis.stats?.latest}</p>
                    <p className="text-[10px] text-muted-foreground">Plus récente</p>
                  </div>
                </div>

                {analysis.data && analysis.data.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">Répartition par mois:</p>
                    <div className="h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysis.data}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* LOCATION DISPLAY */}
            {analysis.type === 'location' && (
              <div className="space-y-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <MapPin className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{analysis.total}</p>
                  <p className="text-[10px] text-muted-foreground">Localisations collectées</p>
                </div>

                {analysis.data && analysis.data.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">Top lieux (répartition):</p>
                    <div className="space-y-2">
                      {analysis.data.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate" title={item.fullName}>{item.fullName}</span>
                          <span className="font-medium">{item.value}</span>
                          <span className="text-muted-foreground w-14 text-right">({item.percentage}%)</span>
                          <Progress value={item.percentage} className="w-16 h-1.5" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* CONTACT DISPLAY */}
            {analysis.type === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg font-bold text-primary">{analysis.responseCount}</p>
                    <p className="text-[10px] text-muted-foreground">Total collectés</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-lg font-bold">{analysis.uniqueCount}</p>
                    <p className="text-[10px] text-muted-foreground">Uniques</p>
                  </div>
                </div>

                {analysis.data && analysis.data.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">Échantillon (10 premiers):</p>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {analysis.data.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs p-1.5 bg-muted/20 rounded">
                          {field.field_type === 'phone' ? (
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                          ) : (
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">{item.fullName}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* NUMERIC DISPLAY */}
            {analysis.type === 'numeric' && 'stats' in analysis && analysis.stats && (
              <div className="space-y-4">
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

                {analysis.data && analysis.data.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">Distribution:</p>
                    <div className="h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysis.data}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TEXT DISPLAY */}
            {analysis.type === 'text' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <MessageSquare className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{analysis.responseCount}</p>
                    <p className="text-[10px] text-muted-foreground">Réponses</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <User className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold">{analysis.uniqueCount}</p>
                    <p className="text-[10px] text-muted-foreground">Uniques</p>
                  </div>
                </div>

                {'sampleValues' in analysis && analysis.sampleValues && analysis.sampleValues.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">Échantillon de réponses:</p>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {analysis.sampleValues.map((value, idx) => (
                        <div key={idx} className="text-xs p-2 bg-muted/20 rounded border-l-2 border-primary/30">
                          "{value}"
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
