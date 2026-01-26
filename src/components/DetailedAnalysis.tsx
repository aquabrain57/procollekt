import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MapPin, Download, FileSpreadsheet, FileText, File, 
  BarChart3, PieChart, TrendingUp, Users, Calendar, CheckCircle, 
  Target, DollarSign, Building2, Lightbulb, AlertTriangle, Map
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResponsesMap } from '@/components/ResponsesMap';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { downloadXlsx } from '@/lib/excel';

interface DetailedAnalysisProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export const DetailedAnalysis = ({ survey, responses }: DetailedAnalysisProps) => {
  const { fields } = useSurveyFields(survey.id);

  // Advanced statistics
  const stats = useMemo(() => {
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

    // Location clusters
    const locationClusters = responses
      .filter(r => r.location)
      .reduce((acc, r) => {
        const lat = Math.round((r.location?.latitude || 0) * 10) / 10;
        const lng = Math.round((r.location?.longitude || 0) * 10) / 10;
        const key = `${lat},${lng}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topZones = Object.entries(locationClusters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([coords, count]) => ({ coords, count }));

    return {
      total,
      withLocation,
      locationRate: total > 0 ? Math.round((withLocation / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
      avgPerDay: timelineData.length > 0 ? Math.round(total / timelineData.length) : 0,
      timelineData,
      topZones,
    };
  }, [responses, fields]);

  // Field-specific analytics with enhanced insights
  const fieldAnalytics = useMemo(() => {
    return fields.map(field => {
      const values = responses.map(r => r.data[field.id]).filter(v => v !== undefined && v !== null && v !== '');
      
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
        
        const total = Object.values(optionCounts).reduce((a, b) => a + b, 0);
        const chartData = Object.entries(optionCounts)
          .map(([name, value]) => ({
            name: name.length > 25 ? name.slice(0, 25) + '...' : name,
            fullName: name,
            value,
            percentage: Math.round((value / total) * 100),
          }))
          .sort((a, b) => b.value - a.value);

        const topOption = chartData[0];
        const bottomOption = chartData[chartData.length - 1];

        return { 
          field, 
          type: 'categorical', 
          data: chartData, 
          total: values.length,
          insights: {
            dominant: topOption ? `"${topOption.fullName}" représente ${topOption.percentage}% des réponses` : null,
            minority: bottomOption && chartData.length > 1 ? `"${bottomOption.fullName}" est le moins représenté (${bottomOption.percentage}%)` : null,
          }
        };
      }

      if (field.field_type === 'number' || field.field_type === 'rating') {
        const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
        const avg = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
        const min = numbers.length > 0 ? Math.min(...numbers) : 0;
        const max = numbers.length > 0 ? Math.max(...numbers) : 0;
        const median = numbers.length > 0 ? numbers.sort((a, b) => a - b)[Math.floor(numbers.length / 2)] : 0;
        
        const distribution: Record<number, number> = {};
        numbers.forEach(n => {
          distribution[n] = (distribution[n] || 0) + 1;
        });
        
        const chartData = Object.entries(distribution)
          .map(([value, count]) => ({ value: Number(value), count }))
          .sort((a, b) => a.value - b.value);

        return { 
          field, 
          type: 'numeric', 
          data: chartData,
          stats: { avg: avg.toFixed(1), min, max, median, count: numbers.length },
          insights: {
            average: `Moyenne: ${avg.toFixed(1)} / ${max}`,
            spread: `Écart: ${min} - ${max}`,
          }
        };
      }

      return { field, type: 'text', count: values.length };
    });
  }, [fields, responses]);

  // Generate recommendations based on data
  const recommendations = useMemo(() => {
    const recs: string[] = [];
    
    if (stats.completionRate < 80) {
      recs.push("Le taux de complétion est faible. Simplifiez le questionnaire ou rendez les questions optionnelles.");
    }
    
    if (stats.locationRate < 50) {
      recs.push("Peu de réponses géolocalisées. Encouragez les enquêteurs à activer le GPS.");
    }

    if (stats.avgPerDay < 5) {
      recs.push("Rythme de collecte lent. Envisagez d'ajouter plus d'enquêteurs.");
    }

    fieldAnalytics.forEach(fa => {
      if (fa.type === 'categorical' && 'data' in fa && fa.data.length > 0) {
        const firstItem = fa.data[0];
        if ('percentage' in firstItem && firstItem.percentage > 70) {
          recs.push(`Pour "${fa.field.label}": forte concentration sur une option. Vérifiez la diversité de l'échantillon.`);
        }
      }
    });

    if (recs.length === 0) {
      recs.push("Excellente qualité de données ! Continuez ainsi.");
    }

    return recs;
  }, [stats, fieldAnalytics]);

  // Export functions
  const exportToExcel = async () => {
    // Summary sheet
    const summary = [
      ['RAPPORT D\'ANALYSE DÉTAILLÉ'],
      [survey.title],
      [],
      ['INDICATEURS CLÉS'],
      ['Total réponses', stats.total],
      ['Taux de complétion', stats.completionRate + '%'],
      ['Réponses géolocalisées', stats.withLocation],
      ['Moyenne par jour', stats.avgPerDay],
      [],
      ['RECOMMANDATIONS'],
      ...recommendations.map(r => [r]),
    ];

    // Detailed data
    const headers = ['Date', 'Localisation', ...fields.map(f => f.label)];
    const rows = responses.map(response => {
      const location = response.location 
        ? `${response.location.latitude.toFixed(4)}, ${response.location.longitude.toFixed(4)}`
        : '';
      
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        return value?.toString() || '';
      });

      return [
        format(new Date(response.created_at), 'dd/MM/yyyy HH:mm'),
        location,
        ...fieldValues,
      ];
    });

    await downloadXlsx(`${survey.title}_analyse_complete.xlsx`, [
      { name: 'Résumé', rows: summary as any },
      { name: 'Données', rows: [headers, ...rows] as any },
    ]);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(survey.title, doc.internal.pageSize.width / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Rapport d\'analyse approfondie', doc.internal.pageSize.width / 2, 28, { align: 'center' });
    doc.text(`${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, doc.internal.pageSize.width / 2, 35, { align: 'center' });

    autoTable(doc, {
      startY: 45,
      head: [['Indicateur', 'Valeur', 'Interprétation']],
      body: [
        ['Total réponses', stats.total.toString(), stats.total > 100 ? 'Excellent échantillon' : 'Échantillon en cours'],
        ['Taux de complétion', stats.completionRate + '%', stats.completionRate > 80 ? 'Très bon' : 'À améliorer'],
        ['Géolocalisation', stats.locationRate + '%', stats.locationRate > 70 ? 'Bon suivi terrain' : 'Améliorer le GPS'],
        ['Moyenne/jour', stats.avgPerDay.toString(), stats.avgPerDay > 10 ? 'Rythme soutenu' : 'Rythme modéré'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
    });

    let yPos = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.text('Recommandations', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    recommendations.forEach(rec => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text('• ' + rec, 14, yPos, { maxWidth: 180 });
      yPos += 10;
    });

    doc.save(`${survey.title}_analyse.pdf`);
  };

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: survey.title, heading: HeadingLevel.TITLE }),
          new Paragraph({ children: [new TextRun({ text: 'Rapport d\'analyse approfondie', italics: true })] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Indicateurs clés', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [
            new TextRun({ text: `• Total réponses: ${stats.total}\n` }),
            new TextRun({ text: `• Taux de complétion: ${stats.completionRate}%\n` }),
            new TextRun({ text: `• Réponses géolocalisées: ${stats.withLocation} (${stats.locationRate}%)\n` }),
            new TextRun({ text: `• Moyenne par jour: ${stats.avgPerDay}\n` }),
          ]}),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Recommandations', heading: HeadingLevel.HEADING_1 }),
          ...recommendations.map(r => new Paragraph({ children: [new TextRun({ text: '• ' + r })] })),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${survey.title}_analyse.docx`);
  };

  if (responses.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="font-medium text-foreground">Aucune donnée à analyser</p>
        <p className="text-sm text-muted-foreground">Collectez des réponses pour voir l'analyse</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-250px)]">
      <div className="space-y-6 pr-4">
        {/* Export & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
            <p className="text-sm text-muted-foreground">
              Analyse approfondie • {responses.length} réponse{responses.length !== 1 ? 's' : ''}
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
                PDF rapport
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToWord}>
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Word rapport
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* KPI Cards - Enhanced */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.completionRate}%</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.locationRate}%</p>
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
                  <p className="text-2xl font-bold text-foreground">{stats.avgPerDay}</p>
                  <p className="text-xs text-muted-foreground">Moy./jour</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Chart */}
        {stats.timelineData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Évolution des réponses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
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

        {/* Zones Map */}
        {stats.withLocation > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Map className="h-4 w-4" />
                Zones potentielles (Carte)
              </CardTitle>
              <CardDescription>
                Visualisation des zones de collecte et concentrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsesMap responses={responses} fields={fields} />
              
              {stats.topZones.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                  {stats.topZones.map((zone, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-foreground">{zone.count}</p>
                      <p className="text-xs text-muted-foreground truncate">Zone {idx + 1}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Field Analytics with Charts */}
        {fieldAnalytics.map((fa, idx) => {
          if (fa.type === 'text') return null;

          return (
            <Card key={fa.field.id}>
              <CardHeader>
                <CardTitle className="text-base">{fa.field.label}</CardTitle>
                {fa.type === 'categorical' && 'insights' in fa && fa.insights.dominant && (
                  <CardDescription className="flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    {fa.insights.dominant}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {fa.type === 'categorical' && 'data' in fa && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={fa.data}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${Math.round((value / (fa.total || 1)) * 100)}%`}
                          >
                            {fa.data.map((entry, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fa.data} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis type="number" fontSize={12} />
                          <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {fa.type === 'numeric' && 'stats' in fa && 'data' in fa && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xl font-bold text-primary">{fa.stats.avg}</p>
                        <p className="text-xs text-muted-foreground">Moyenne</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xl font-bold text-foreground">{fa.stats.median}</p>
                        <p className="text-xs text-muted-foreground">Médiane</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xl font-bold text-foreground">{fa.stats.min}</p>
                        <p className="text-xs text-muted-foreground">Min</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xl font-bold text-foreground">{fa.stats.max}</p>
                        <p className="text-xs text-muted-foreground">Max</p>
                      </div>
                    </div>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fa.data}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="value" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Recommendations */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-primary" />
              Recommandations stratégiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
