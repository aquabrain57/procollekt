import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, BarChart3, PieChart, TrendingUp, Users, 
  CheckCircle, MapPin, Calendar, Lightbulb, AlertTriangle,
  FileSpreadsheet, FileText, File, MessageSquare, Target,
  ThumbsUp, ThumbsDown, Info, ChevronDown, ChevronUp, Zap,
  Globe, TrendingDown
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResponsesMap } from '@/components/ResponsesMap';
import { reverseGeocodeBatch } from '@/hooks/useReverseGeocode';
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
  data?: { name: string; fullName: string; value: number; percentage: number; frequency: string }[];
  stats?: { avg: string; min: number; max: number; median: number; count: number; stdDev: string };
  count?: number;
  total?: number;
  insights: {
    comment: string;
    sentiment: 'positive' | 'neutral' | 'warning';
    recommendation?: string;
    marketInsight?: string;
  };
}

interface GeoAnalysis {
  byCity: { name: string; count: number; percentage: number }[];
  byRegion: { name: string; count: number; percentage: number }[];
  hotspots: { name: string; description: string; type: 'high' | 'medium' | 'low' }[];
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
          .map(([name, value]) => {
            const percentage = Math.round((value / totalOptions) * 100);
            return {
              name: name.length > 20 ? name.slice(0, 20) + '...' : name,
              fullName: name,
              value,
              percentage,
              frequency: `${value}/${totalOptions} (${percentage}%)`,
            };
          })
          .sort((a, b) => b.value - a.value);

        const topOption = chartData[0];
        const secondOption = chartData[1];
        const hasConcentration = topOption && topOption.percentage > 60;
        const isBalanced = chartData.length > 1 && 
          Math.abs(chartData[0].percentage - chartData[chartData.length - 1].percentage) < 20;

        let comment = '';
        let sentiment: 'positive' | 'neutral' | 'warning' = 'neutral';
        let recommendation: string | undefined;
        let marketInsight: string | undefined;

        if (hasConcentration) {
          comment = `🔥 Forte concentration: "${topOption.fullName}" domine avec ${topOption.percentage}% des réponses (${topOption.value} sur ${totalOptions}).`;
          sentiment = 'warning';
          recommendation = "Cette concentration indique une opportunité de marché. Ciblez cette préférence dans votre stratégie.";
          marketInsight = `Zone à fort potentiel: ${topOption.percentage}% de la demande se concentre sur "${topOption.fullName}". Priorisez ce segment.`;
        } else if (isBalanced) {
          comment = `Distribution équilibrée entre ${chartData.length} options. Pas de préférence marquée.`;
          sentiment = 'neutral';
          marketInsight = "Marché fragmenté: diversifiez votre offre pour couvrir plusieurs segments.";
        } else if (chartData.length > 0 && topOption) {
          comment = `"${topOption.fullName}" en tête avec ${topOption.percentage}% (${topOption.value}), suivi de "${secondOption?.fullName || 'autres'}" (${secondOption?.percentage || 0}%).`;
          sentiment = 'positive';
          marketInsight = `Tendance claire: concentrez vos efforts sur les 2-3 options dominantes qui représentent ${chartData.slice(0, 3).reduce((sum, d) => sum + d.percentage, 0)}% du marché.`;
        }

        return { 
          field, 
          type: 'categorical' as const, 
          data: chartData, 
          total: values.length,
          insights: { comment, sentiment, recommendation, marketInsight }
        };
      }

      if (field.field_type === 'number' || field.field_type === 'rating') {
        const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
        const avg = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
        const min = numbers.length > 0 ? Math.min(...numbers) : 0;
        const max = numbers.length > 0 ? Math.max(...numbers) : 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
        
        // Calculate standard deviation
        const variance = numbers.length > 0 
          ? numbers.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / numbers.length 
          : 0;
        const stdDev = Math.sqrt(variance);
        
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
            frequency: `${count}/${numbers.length} (${Math.round((count / numbers.length) * 100)}%)`,
          }))
          .sort((a, b) => Number(a.name) - Number(b.name));

        let comment = '';
        let sentiment: 'positive' | 'neutral' | 'warning' = 'neutral';
        let recommendation: string | undefined;
        let marketInsight: string | undefined;

        if (field.field_type === 'rating') {
          const maxRating = field.max_value || 5;
          const avgPercentage = (avg / maxRating) * 100;
          if (avgPercentage >= 80) {
            comment = `✅ Excellent score: ${avg.toFixed(1)}/${maxRating} (${avgPercentage.toFixed(0)}%). Écart-type: ${stdDev.toFixed(2)}.`;
            sentiment = 'positive';
            marketInsight = "Score élevé = forte satisfaction. Utilisez ces témoignages positifs dans votre communication.";
          } else if (avgPercentage >= 60) {
            comment = `Score satisfaisant: ${avg.toFixed(1)}/${maxRating} (${avgPercentage.toFixed(0)}%). Marge d'amélioration.`;
            sentiment = 'neutral';
            recommendation = "Identifiez les facteurs qui freinent la satisfaction pour atteindre l'excellence.";
          } else {
            comment = `⚠️ Score faible: ${avg.toFixed(1)}/${maxRating} (${avgPercentage.toFixed(0)}%). Attention requise.`;
            sentiment = 'warning';
            recommendation = "Analysez les causes de ce score bas. Priorisez les améliorations.";
            marketInsight = "Risque de perte de clients. Action corrective urgente recommandée.";
          }
        } else {
          comment = `Moyenne: ${avg.toFixed(1)} | Médiane: ${median} | Écart: ${min}-${max} | σ: ${stdDev.toFixed(2)}`;
          marketInsight = stdDev > avg * 0.5 
            ? "Forte dispersion des valeurs: le marché est hétérogène. Segmentez votre approche."
            : "Faible dispersion: le marché est homogène. Une stratégie uniforme peut fonctionner.";
        }

        return { 
          field, 
          type: 'numeric' as const, 
          data: chartData,
          stats: { avg: avg.toFixed(1), min, max, median, count: numbers.length, stdDev: stdDev.toFixed(2) },
          insights: { comment, sentiment, recommendation, marketInsight }
        };
      }

      // Text field
      const uniqueValues = new Set(values.map(v => String(v).toLowerCase().trim()));
      const comment = `${values.length} réponses textuelles (${uniqueValues.size} uniques).`;
      
      return { 
        field, 
        type: 'text' as const, 
        count: values.length,
        insights: { 
          comment, 
          sentiment: 'neutral' as const,
          recommendation: values.length > 10 ? "Analysez les réponses pour identifier les thèmes récurrents et les insights qualitatifs." : undefined,
          marketInsight: values.length > 5 ? "Les réponses ouvertes révèlent souvent des besoins non couverts par les options prédéfinies." : undefined
        }
      };
    });
  }, [fields, responses]);

  // Geographic analysis
  const [geoAnalysis, setGeoAnalysis] = useState<GeoAnalysis | null>(null);
  
  useEffect(() => {
    const analyzeGeography = async () => {
      const geoResponses = responses.filter(r => r.location);
      if (geoResponses.length < 3) return;

      // Batch geocode locations
      const locations = geoResponses.map(r => ({
        id: r.id,
        latitude: r.location!.latitude,
        longitude: r.location!.longitude,
      }));

      try {
        const geocoded = await reverseGeocodeBatch(locations.slice(0, 20)); // Limit to avoid rate limits
        
        const byCityMap: Record<string, number> = {};
        const byRegionMap: Record<string, number> = {};

        geocoded.forEach((loc) => {
          if (loc.city) {
            byCityMap[loc.city] = (byCityMap[loc.city] || 0) + 1;
          }
          if (loc.region) {
            byRegionMap[loc.region] = (byRegionMap[loc.region] || 0) + 1;
          }
        });

        const total = geocoded.size;
        const byCity = Object.entries(byCityMap)
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const byRegion = Object.entries(byRegionMap)
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Generate hotspots
        const hotspots: GeoAnalysis['hotspots'] = [];
        if (byCity.length > 0 && byCity[0].percentage > 40) {
          hotspots.push({
            name: byCity[0].name,
            description: `Zone à très fort potentiel: ${byCity[0].percentage}% des répondants. Forte concentration de consommateurs.`,
            type: 'high',
          });
        }
        byCity.slice(0, 3).forEach(city => {
          if (city.percentage >= 20 && city.percentage <= 40) {
            hotspots.push({
              name: city.name,
              description: `Zone prometteuse: ${city.percentage}% du marché. Potentiel de croissance.`,
              type: 'medium',
            });
          }
        });

        setGeoAnalysis({ byCity, byRegion, hotspots });
      } catch (error) {
        console.error('Geographic analysis error:', error);
      }
    };

    analyzeGeography();
  }, [responses]);

  // Global recommendations with market insights
  const globalRecommendations = useMemo(() => {
    const recs: { text: string; type: 'success' | 'warning' | 'info' }[] = [];
    
    if (globalStats.total < 30) {
      recs.push({ text: "📊 Échantillon insuffisant (< 30 réponses). Continuez la collecte pour des résultats statistiquement significatifs.", type: 'warning' });
    } else if (globalStats.total >= 100) {
      recs.push({ text: "✅ Excellent volume de données ! L'échantillon est représentatif et fiable.", type: 'success' });
    } else if (globalStats.total >= 50) {
      recs.push({ text: "📈 Bon échantillon (50+ réponses). Les tendances sont significatives.", type: 'success' });
    }
    
    if (globalStats.completionRate < 70) {
      recs.push({ text: "⚠️ Taux de complétion faible. Simplifiez le questionnaire ou formez les enquêteurs.", type: 'warning' });
    } else if (globalStats.completionRate >= 90) {
      recs.push({ text: "✅ Excellent taux de complétion ! Qualité des données optimale.", type: 'success' });
    }
    
    if (globalStats.locationRate < 50) {
      recs.push({ text: "📍 Peu de réponses géolocalisées. L'analyse géographique sera limitée.", type: 'info' });
    } else if (globalStats.locationRate >= 80) {
      recs.push({ text: "🗺️ Excellente couverture géographique. Analyse territoriale fiable.", type: 'success' });
    }

    if (globalStats.avgPerDay < 3 && globalStats.total < 50) {
      recs.push({ text: "⏱️ Rythme de collecte lent. Augmentez le nombre d'enquêteurs.", type: 'info' });
    }

    // Add field-specific insights
    const highConcentrationFields = fieldAnalytics.filter(fa => 
      fa.type === 'categorical' && fa.data?.[0]?.percentage && fa.data[0].percentage > 60
    );
    if (highConcentrationFields.length > 0) {
      recs.push({ 
        text: `🎯 ${highConcentrationFields.length} question(s) avec forte concentration de réponses. Opportunités de marché identifiées.`, 
        type: 'success' 
      });
    }

    if (recs.length === 0) {
      recs.push({ text: "✅ Excellente qualité de données ! Continuez sur cette lancée.", type: 'success' });
    }

    return recs;
  }, [globalStats, fieldAnalytics]);

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
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4 pb-8">
        {/* Header with export */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
          <div>
            <h2 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {survey.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              Rapport d'analyse avancé • {responses.length} réponse{responses.length !== 1 ? 's' : ''} • {format(new Date(), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg">
                <Download className="h-4 w-4 mr-2" />
                Exporter le rapport
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel complet (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                <File className="h-4 w-4 mr-2 text-red-600" />
                PDF résumé (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Executive Summary Card */}
        <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Résumé Exécutif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/20 rounded-xl">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{globalStats.total}</p>
                    <p className="text-xs text-muted-foreground font-medium">Réponses totales</p>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-primary/5" />
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 p-4 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-500/20 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{globalStats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground font-medium">Taux complétion</p>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-green-500/5" />
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 p-4 border border-orange-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/20 rounded-xl">
                    <MapPin className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{globalStats.locationRate}%</p>
                    <p className="text-xs text-muted-foreground font-medium">Géolocalisées</p>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-orange-500/5" />
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-4 border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{globalStats.avgPerDay}</p>
                    <p className="text-xs text-muted-foreground font-medium">Moyenne/jour</p>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-purple-500/5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Recommendations */}
        <Card className="border-l-4 border-l-primary shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              Recommandations Stratégiques
            </CardTitle>
            <CardDescription>Points d'action basés sur l'analyse des données</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {globalRecommendations.map((rec, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
                  rec.type === 'success' ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40' :
                  rec.type === 'warning' ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/40' : 
                  'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  rec.type === 'success' ? 'bg-green-500/20' :
                  rec.type === 'warning' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                }`}>
                  {rec.type === 'success' ? (
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                  ) : rec.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <span className="text-sm text-foreground leading-relaxed flex-1">{rec.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Geographic Analysis - Zones à fort potentiel */}
        {geoAnalysis && (geoAnalysis.byCity.length > 0 || geoAnalysis.hotspots.length > 0) && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-primary" />
                Analyse géographique - Zones à fort potentiel
              </CardTitle>
              <CardDescription>Répartition géographique et zones de consommation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hotspots */}
              {geoAnalysis.hotspots.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Zones identifiées
                  </h4>
                  {geoAnalysis.hotspots.map((hotspot, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg ${
                        hotspot.type === 'high' ? 'bg-green-500/10 border border-green-500/30' :
                        hotspot.type === 'medium' ? 'bg-blue-500/10 border border-blue-500/30' :
                        'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-4 w-4 ${
                          hotspot.type === 'high' ? 'text-green-600' : 'text-blue-600'
                        }`} />
                        <span className="font-medium text-foreground">{hotspot.name}</span>
                        <Badge variant={hotspot.type === 'high' ? 'default' : 'secondary'} className="text-xs">
                          {hotspot.type === 'high' ? 'Fort potentiel' : 'Potentiel moyen'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 ml-6">{hotspot.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cities distribution */}
              {geoAnalysis.byCity.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Répartition par ville</h4>
                  <div className="space-y-2">
                    {geoAnalysis.byCity.slice(0, 5).map((city, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{city.name}</span>
                          <span className="text-muted-foreground">{city.count} ({city.percentage}%)</span>
                        </div>
                        <Progress value={city.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regions distribution */}
              {geoAnalysis.byRegion.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={geoAnalysis.byRegion}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="count"
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                        >
                          {geoAnalysis.byRegion.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="font-medium text-sm mb-2">Par région</h4>
                    {geoAnalysis.byRegion.map((region, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm py-1">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="text-foreground">{region.name}</span>
                        <span className="text-muted-foreground ml-auto">{region.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

                      {/* Market Insight */}
                      {fa.insights.marketInsight && (
                        <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <span className="text-xs font-medium text-primary">Insight marché</span>
                              <p className="text-sm text-foreground mt-1">{fa.insights.marketInsight}</p>
                            </div>
                          </div>
                        </div>
                      )}

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
                          {/* Frequency table header */}
                          <div className="text-xs text-muted-foreground font-medium mb-2">
                            Fréquences et pourcentages
                          </div>
                          
                          {/* Progress bars with frequencies */}
                          <div className="space-y-3">
                            {fa.data.map((item, index) => (
                              <div key={item.fullName} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-foreground font-medium">{item.fullName}</span>
                                  <span className="text-muted-foreground font-mono text-xs">{item.frequency}</span>
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
