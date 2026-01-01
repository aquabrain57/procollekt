import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, BarChart3, PieChart, TrendingUp, Users, 
  CheckCircle, MapPin, Calendar, Lightbulb, AlertTriangle,
  FileSpreadsheet, FileText, File, MessageSquare, Target,
  ThumbsUp, ThumbsDown, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResponsesMap } from '@/components/ResponsesMap';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdvancedReportsProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

interface FieldAnalysis {
  field: {
    id: string;
    label: string;
    field_type: string;
    required: boolean;
    options?: any;
    max_value?: number | null;
  };
  type: 'categorical' | 'numeric' | 'text';
  data?: { name: string; fullName: string; value: number; percentage: number }[];
  stats?: { avg: string; min: number; max: number; median: number; count: number };
  count?: number;
  total?: number;
  insights: {
    comment: string;
    sentiment: 'positive' | 'neutral' | 'warning';
    recommendation?: string;
  };
}

export const AdvancedReports = ({ survey, responses }: AdvancedReportsProps) => {
  const { fields } = useSurveyFields(survey.id);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleField = (fieldId: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  // Global statistics
  const globalStats = useMemo(() => {
    const total = responses.length;
    const withLocation = responses.filter(r => r.location).length;
    
    // Timeline data
    const byDate = responses.reduce((acc, r) => {
      const date = format(new Date(r.created_at), 'dd/MM', { locale: fr });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timelineData = Object.entries(byDate)
      .slice(-14)
      .map(([date, count]) => ({ date, responses: count }));

    // Completion rate
    const requiredFields = fields.filter(f => f.required);
    const complete = responses.filter(r => {
      return requiredFields.every(field => {
        const value = r.data[field.id];
        return value !== undefined && value !== null && value !== '';
      });
    }).length;

    // By hour distribution
    const byHour = responses.reduce((acc, r) => {
      const hour = new Date(r.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      withLocation,
      locationRate: total > 0 ? Math.round((withLocation / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
      avgPerDay: timelineData.length > 0 ? Math.round(total / timelineData.length) : 0,
      timelineData,
      peakHour: peakHour ? `${peakHour[0]}h` : 'N/A',
    };
  }, [responses, fields]);

  // Field-by-field analysis with insights
  const fieldAnalytics: FieldAnalysis[] = useMemo(() => {
    return fields.map(field => {
      const values = responses.map(r => r.data[field.id]).filter(v => v !== undefined && v !== null && v !== '');
      const responseRate = responses.length > 0 ? Math.round((values.length / responses.length) * 100) : 0;
      
      if (field.field_type === 'select' || field.field_type === 'multiselect') {
        const optionCounts: Record<string, number> = {};
        values.forEach(v => {
          if (Array.isArray(v)) {
            v.forEach(item => {
              optionCounts[item] = (optionCounts[item] || 0) + 1;
            });
          } else {
            optionCounts[v] = (optionCounts[v] || 0) + 1;
          }
        });
        
        const totalOptions = Object.values(optionCounts).reduce((a, b) => a + b, 0);
        const chartData = Object.entries(optionCounts)
          .map(([name, value]) => ({
            name: name.length > 20 ? name.slice(0, 20) + '...' : name,
            fullName: name,
            value,
            percentage: Math.round((value / totalOptions) * 100),
          }))
          .sort((a, b) => b.value - a.value);

        const topOption = chartData[0];
        const hasConcentration = topOption && topOption.percentage > 60;
        const isBalanced = chartData.length > 1 && 
          Math.abs(chartData[0].percentage - chartData[chartData.length - 1].percentage) < 20;

        let comment = '';
        let sentiment: 'positive' | 'neutral' | 'warning' = 'neutral';
        let recommendation: string | undefined;

        if (hasConcentration) {
          comment = `Forte concentration: "${topOption.fullName}" domine avec ${topOption.percentage}% des réponses.`;
          sentiment = 'warning';
          recommendation = "Vérifiez si l'échantillon est représentatif ou si cette tendance reflète une réalité du marché.";
        } else if (isBalanced) {
          comment = `Distribution équilibrée entre les options. Pas de préférence marquée.`;
          sentiment = 'neutral';
        } else if (chartData.length > 0) {
          comment = `"${topOption.fullName}" est en tête (${topOption.percentage}%), suivi par les autres options.`;
          sentiment = 'positive';
        }

        return { 
          field, 
          type: 'categorical' as const, 
          data: chartData, 
          total: values.length,
          insights: { comment, sentiment, recommendation }
        };
      }

      if (field.field_type === 'number' || field.field_type === 'rating') {
        const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
        const avg = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
        const min = numbers.length > 0 ? Math.min(...numbers) : 0;
        const max = numbers.length > 0 ? Math.max(...numbers) : 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
        
        const distribution: Record<number, number> = {};
        numbers.forEach(n => {
          distribution[n] = (distribution[n] || 0) + 1;
        });
        
        const chartData = Object.entries(distribution)
          .map(([value, count]) => ({ 
            name: String(value),
            fullName: String(value),
            value: count,
            percentage: Math.round((count / numbers.length) * 100)
          }))
          .sort((a, b) => Number(a.name) - Number(b.name));

        let comment = '';
        let sentiment: 'positive' | 'neutral' | 'warning' = 'neutral';
        let recommendation: string | undefined;

        if (field.field_type === 'rating') {
          const maxRating = field.max_value || 5;
          const avgPercentage = (avg / maxRating) * 100;
          if (avgPercentage >= 80) {
            comment = `Excellent score moyen de ${avg.toFixed(1)}/${maxRating} (${avgPercentage.toFixed(0)}%).`;
            sentiment = 'positive';
          } else if (avgPercentage >= 60) {
            comment = `Score satisfaisant de ${avg.toFixed(1)}/${maxRating}. Marge d'amélioration possible.`;
            sentiment = 'neutral';
          } else {
            comment = `Score faible de ${avg.toFixed(1)}/${maxRating}. Attention requise.`;
            sentiment = 'warning';
            recommendation = "Analysez les causes de ce score bas et identifiez les axes d'amélioration.";
          }
        } else {
          comment = `Moyenne: ${avg.toFixed(1)}, Médiane: ${median}, Écart: ${min}-${max}`;
        }

        return { 
          field, 
          type: 'numeric' as const, 
          data: chartData,
          stats: { avg: avg.toFixed(1), min, max, median, count: numbers.length },
          insights: { comment, sentiment, recommendation }
        };
      }

      // Text field
      const uniqueValues = new Set(values.map(v => String(v).toLowerCase().trim()));
      const comment = `${values.length} réponses textuelles collectées (${uniqueValues.size} réponses uniques).`;
      
      return { 
        field, 
        type: 'text' as const, 
        count: values.length,
        insights: { 
          comment, 
          sentiment: 'neutral' as const,
          recommendation: values.length > 10 ? "Analysez les réponses pour identifier les thèmes récurrents." : undefined
        }
      };
    });
  }, [fields, responses]);

  // Global recommendations
  const globalRecommendations = useMemo(() => {
    const recs: { text: string; type: 'success' | 'warning' | 'info' }[] = [];
    
    if (globalStats.total < 30) {
      recs.push({ text: "Échantillon insuffisant (< 30 réponses). Continuez la collecte pour des résultats statistiquement significatifs.", type: 'warning' });
    } else if (globalStats.total >= 100) {
      recs.push({ text: "Excellent volume de données ! L'échantillon est représentatif.", type: 'success' });
    }
    
    if (globalStats.completionRate < 70) {
      recs.push({ text: "Taux de complétion faible. Simplifiez le questionnaire ou formez les enquêteurs.", type: 'warning' });
    }
    
    if (globalStats.locationRate < 50) {
      recs.push({ text: "Peu de réponses géolocalisées. Encouragez l'activation du GPS.", type: 'info' });
    }

    if (globalStats.avgPerDay < 3) {
      recs.push({ text: "Rythme de collecte lent. Envisagez d'augmenter le nombre d'enquêteurs.", type: 'info' });
    }

    if (recs.length === 0) {
      recs.push({ text: "Excellente qualité de données ! Continuez sur cette lancée.", type: 'success' });
    }

    return recs;
  }, [globalStats]);

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summary = [
      ['RAPPORT D\'ANALYSE AVANCÉ'],
      [survey.title],
      [`Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`],
      [],
      ['INDICATEURS CLÉS'],
      ['Métrique', 'Valeur', 'Interprétation'],
      ['Total réponses', globalStats.total, globalStats.total >= 100 ? 'Excellent' : globalStats.total >= 30 ? 'Bon' : 'Insuffisant'],
      ['Taux de complétion', globalStats.completionRate + '%', globalStats.completionRate >= 80 ? 'Excellent' : 'À améliorer'],
      ['Géolocalisation', globalStats.locationRate + '%', globalStats.locationRate >= 70 ? 'Bon' : 'Faible'],
      ['Moyenne/jour', globalStats.avgPerDay, ''],
      [],
      ['RECOMMANDATIONS'],
      ...globalRecommendations.map(r => [r.text]),
      [],
      ['ANALYSE PAR QUESTION'],
    ];

    fieldAnalytics.forEach(fa => {
      summary.push([fa.field.label]);
      summary.push(['Commentaire:', fa.insights.comment]);
      if (fa.insights.recommendation) {
        summary.push(['Recommandation:', fa.insights.recommendation]);
      }
      if (fa.type === 'categorical' && fa.data) {
        fa.data.forEach(d => {
          summary.push(['  ' + d.fullName, d.value.toString(), d.percentage + '%']);
        });
      } else if (fa.type === 'numeric' && fa.stats) {
        summary.push(['  Moyenne', fa.stats.avg]);
        summary.push(['  Min-Max', `${fa.stats.min} - ${fa.stats.max}`]);
      }
      summary.push([]);
    });
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Rapport');

    // Raw data
    const headers = ['#', 'Date', 'GPS Lat', 'GPS Lng', ...fields.map(f => f.label)];
    const rows = responses.map((response, index) => {
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        return value?.toString() || '';
      });

      return [
        index + 1,
        format(new Date(response.created_at), 'dd/MM/yyyy HH:mm'),
        response.location?.latitude || '',
        response.location?.longitude || '',
        ...fieldValues,
      ];
    });

    const dataWs = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, dataWs, 'Données brutes');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout]), `${survey.title}_rapport_analyse.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(survey.title, doc.internal.pageSize.width / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Rapport d\'analyse avancé', doc.internal.pageSize.width / 2, 27, { align: 'center' });
    doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, doc.internal.pageSize.width / 2, 33, { align: 'center' });

    // KPIs table
    autoTable(doc, {
      startY: 40,
      head: [['Indicateur', 'Valeur', 'Évaluation']],
      body: [
        ['Total réponses', globalStats.total.toString(), globalStats.total >= 100 ? '✓ Excellent' : globalStats.total >= 30 ? '○ Bon' : '! Insuffisant'],
        ['Taux de complétion', globalStats.completionRate + '%', globalStats.completionRate >= 80 ? '✓ Excellent' : '! À améliorer'],
        ['Géolocalisation', globalStats.locationRate + '%', globalStats.locationRate >= 70 ? '✓ Bon' : '○ Faible'],
        ['Moyenne par jour', globalStats.avgPerDay.toString(), ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
    });

    let yPos = (doc as any).lastAutoTable.finalY + 10;

    // Recommendations
    doc.setFontSize(12);
    doc.text('Recommandations', 14, yPos);
    yPos += 6;
    doc.setFontSize(9);
    globalRecommendations.forEach(rec => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      const icon = rec.type === 'success' ? '✓' : rec.type === 'warning' ? '!' : '○';
      doc.text(`${icon} ${rec.text}`, 14, yPos, { maxWidth: 180 });
      yPos += 8;
    });

    // Field analysis
    yPos += 5;
    doc.setFontSize(12);
    doc.text('Analyse par question', 14, yPos);
    yPos += 8;

    fieldAnalytics.forEach(fa => {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      
      doc.setFontSize(10);
      doc.text(fa.field.label, 14, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.text(fa.insights.comment, 18, yPos, { maxWidth: 175 });
      yPos += 10;

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Option', 'Réponses', '%']],
          body: fa.data.slice(0, 5).map(d => [d.fullName, d.value.toString(), d.percentage + '%']),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          margin: { left: 18 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 8;
      } else {
        yPos += 5;
      }
    });

    doc.save(`${survey.title}_rapport.pdf`);
  };

  if (responses.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="font-medium text-foreground">Aucune donnée à analyser</p>
        <p className="text-sm text-muted-foreground">Les rapports apparaîtront une fois les réponses collectées</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-250px)]">
      <div className="space-y-6 pr-4">
        {/* Header with export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
            <p className="text-sm text-muted-foreground">
              Rapport d'analyse avancé • {responses.length} réponse{responses.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter le rapport
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel complet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <File className="h-4 w-4 mr-2 text-red-600" />
                PDF résumé
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{globalStats.total}</p>
                  <p className="text-xs text-muted-foreground">Réponses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{globalStats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Complétion</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{globalStats.locationRate}%</p>
                  <p className="text-xs text-muted-foreground">Géolocalisées</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{globalStats.avgPerDay}</p>
                  <p className="text-xs text-muted-foreground">Moy./jour</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {globalRecommendations.map((rec, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  rec.type === 'success' ? 'bg-green-500/10' :
                  rec.type === 'warning' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                }`}
              >
                {rec.type === 'success' ? (
                  <ThumbsUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : rec.type === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                )}
                <span className="text-sm text-foreground">{rec.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timeline Chart */}
        {globalStats.timelineData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Évolution des réponses
              </CardTitle>
              <CardDescription>Collecte sur les {globalStats.timelineData.length} derniers jours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={globalStats.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="responses" 
                      stroke="#6366f1" 
                      fill="#6366f1" 
                      fillOpacity={0.3}
                      name="Réponses"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map */}
        {globalStats.withLocation > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Carte des réponses
              </CardTitle>
              <CardDescription>{globalStats.withLocation} réponses géolocalisées</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsesMap responses={responses} fields={fields} />
            </CardContent>
          </Card>
        )}

        {/* Field-by-field Analysis */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analyse par question
          </h3>

          {fieldAnalytics.map((fa) => {
            const isExpanded = expandedFields.has(fa.field.id);
            const SentimentIcon = fa.insights.sentiment === 'positive' ? ThumbsUp :
              fa.insights.sentiment === 'warning' ? AlertTriangle : Info;
            const sentimentColor = fa.insights.sentiment === 'positive' ? 'text-green-600' :
              fa.insights.sentiment === 'warning' ? 'text-orange-600' : 'text-blue-600';

            return (
              <Card key={fa.field.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleField(fa.field.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium">{fa.field.label}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {fa.type === 'categorical' ? 'Choix' : fa.type === 'numeric' ? 'Numérique' : 'Texte'}
                            </Badge>
                            {fa.field.required && (
                              <Badge variant="secondary" className="text-xs">Requis</Badge>
                            )}
                          </div>
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <SentimentIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${sentimentColor}`} />
                            <span>{fa.insights.comment}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {fa.total || fa.count || fa.stats?.count || 0} rép.
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />

                      {/* Recommendation */}
                      {fa.insights.recommendation && (
                        <div className="mb-4 p-3 bg-orange-500/10 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-orange-600 mt-0.5" />
                            <span className="text-sm text-foreground">{fa.insights.recommendation}</span>
                          </div>
                        </div>
                      )}

                      {/* Categorical field */}
                      {fa.type === 'categorical' && fa.data && fa.data.length > 0 && (
                        <div className="space-y-4">
                          {/* Progress bars */}
                          <div className="space-y-3">
                            {fa.data.map((item, index) => (
                              <div key={item.fullName} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-foreground">{item.fullName}</span>
                                  <span className="text-muted-foreground">{item.value} ({item.percentage}%)</span>
                                </div>
                                <Progress 
                                  value={item.percentage} 
                                  className="h-2"
                                  style={{ 
                                    ['--progress-foreground' as any]: CHART_COLORS[index % CHART_COLORS.length] 
                                  }}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Charts */}
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="h-[200px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={fa.data} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis type="number" fontSize={10} />
                                  <YAxis dataKey="name" type="category" width={100} fontSize={10} />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'hsl(var(--card))', 
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '8px'
                                    }}
                                    formatter={(value: number) => [value, 'Réponses']}
                                  />
                                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {fa.data.map((_, index) => (
                                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="h-[200px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                  <Pie
                                    data={fa.data}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ percentage }) => `${percentage}%`}
                                    outerRadius={70}
                                    dataKey="value"
                                  >
                                    {fa.data.map((_, index) => (
                                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'hsl(var(--card))', 
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '8px'
                                    }}
                                  />
                                  <Legend />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Numeric field */}
                      {fa.type === 'numeric' && fa.stats && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className="text-lg font-bold text-foreground">{fa.stats.avg}</p>
                              <p className="text-xs text-muted-foreground">Moyenne</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className="text-lg font-bold text-foreground">{fa.stats.median}</p>
                              <p className="text-xs text-muted-foreground">Médiane</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className="text-lg font-bold text-foreground">{fa.stats.min}</p>
                              <p className="text-xs text-muted-foreground">Minimum</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className="text-lg font-bold text-foreground">{fa.stats.max}</p>
                              <p className="text-xs text-muted-foreground">Maximum</p>
                            </div>
                          </div>

                          {fa.data && fa.data.length > 0 && (
                            <div className="h-[150px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={fa.data}>
                                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                  <XAxis dataKey="name" fontSize={10} />
                                  <YAxis fontSize={10} />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'hsl(var(--card))', 
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '8px'
                                    }}
                                    formatter={(value: number) => [value, 'Réponses']}
                                  />
                                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Text field */}
                      {fa.type === 'text' && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">Champ texte libre</span>
                            </div>
                            <Badge variant="secondary">{fa.count} réponses</Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};
