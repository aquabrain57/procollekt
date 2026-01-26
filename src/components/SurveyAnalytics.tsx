import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MapPin, Download, FileSpreadsheet, FileText, File, 
  BarChart3, PieChart, TrendingUp, Users, Calendar, CheckCircle, Map
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, DbSurveyField, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, BorderStyle } from 'docx';
import { downloadXlsx } from '@/lib/excel';

interface SurveyAnalyticsProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const HEX_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

export const SurveyAnalytics = ({ survey, responses }: SurveyAnalyticsProps) => {
  const { fields } = useSurveyFields(survey.id);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalResponses = responses.length;
    const responsesWithLocation = responses.filter(r => r.location).length;
    
    // Group responses by date
    const responsesByDate = responses.reduce((acc, r) => {
      const date = format(new Date(r.created_at), 'dd/MM', { locale: fr });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timelineData = Object.entries(responsesByDate)
      .slice(-7)
      .map(([date, count]) => ({ date, responses: count }));

    // Calculate completion rate (responses with all required fields filled)
    const requiredFields = fields.filter(f => f.required);
    const completeResponses = responses.filter(r => {
      return requiredFields.every(field => {
        const value = r.data[field.id];
        return value !== undefined && value !== null && value !== '';
      });
    }).length;
    const completionRate = totalResponses > 0 ? Math.round((completeResponses / totalResponses) * 100) : 0;

    // Average response time (mock - would need actual timestamps)
    const avgResponseTime = '~5 min';

    return {
      totalResponses,
      responsesWithLocation,
      locationRate: totalResponses > 0 ? Math.round((responsesWithLocation / totalResponses) * 100) : 0,
      completionRate,
      avgResponseTime,
      timelineData,
    };
  }, [responses, fields]);

  // Generate field-specific analytics
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
        
        const chartData = Object.entries(optionCounts).map(([name, value]) => ({
          name: name.length > 20 ? name.slice(0, 20) + '...' : name,
          fullName: name,
          value,
          percentage: Math.round((value / values.length) * 100),
        }));

        return { field, type: 'categorical', data: chartData, total: values.length };
      }

      if (field.field_type === 'number' || field.field_type === 'rating') {
        const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
        const avg = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
        const min = numbers.length > 0 ? Math.min(...numbers) : 0;
        const max = numbers.length > 0 ? Math.max(...numbers) : 0;
        
        // Distribution for histogram
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
          stats: { avg: avg.toFixed(1), min, max, count: numbers.length }
        };
      }

      // Text fields - show response count
      return { field, type: 'text', count: values.length };
    });
  }, [fields, responses]);

  // Export functions
  const exportToExcel = async () => {
    
    // Responses sheet
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

    // Summary sheet
    const summaryData = [
      ['Rapport d\'analyse - ' + survey.title],
      [],
      ['Statistiques générales'],
      ['Total des réponses', stats.totalResponses],
      ['Taux de complétion', stats.completionRate + '%'],
      ['Réponses géolocalisées', stats.responsesWithLocation],
      [],
      ['Analyse par question'],
    ];

    fieldAnalytics.forEach(fa => {
      summaryData.push([fa.field.label]);
      if (fa.type === 'categorical' && 'data' in fa) {
        fa.data.forEach((d: any) => {
          summaryData.push(['  ' + d.fullName, d.value, d.percentage + '%']);
        });
      } else if (fa.type === 'numeric' && 'stats' in fa) {
        summaryData.push(['  Moyenne', fa.stats.avg]);
        summaryData.push(['  Min', fa.stats.min]);
        summaryData.push(['  Max', fa.stats.max]);
      }
      summaryData.push([]);
    });

    await downloadXlsx(`${survey.title.replace(/\s+/g, '_')}_rapport.xlsx`, [
      { name: 'Réponses', rows: [headers, ...rows] as any },
      { name: 'Résumé', rows: summaryData as any },
    ]);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(18);
    doc.text(survey.title, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Rapport d\'analyse détaillé', pageWidth / 2, 28, { align: 'center' });
    doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, pageWidth / 2, 35, { align: 'center' });

    // Stats summary
    doc.setFontSize(14);
    doc.text('Statistiques générales', 14, 50);
    
    autoTable(doc, {
      startY: 55,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Total des réponses', stats.totalResponses.toString()],
        ['Taux de complétion', stats.completionRate + '%'],
        ['Réponses géolocalisées', `${stats.responsesWithLocation} (${stats.locationRate}%)`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
    });

    // Field analytics
    let yPos = (doc as any).lastAutoTable.finalY + 15;

    fieldAnalytics.forEach(fa => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.text(fa.field.label, 14, yPos);
      yPos += 5;

      if (fa.type === 'categorical' && 'data' in fa) {
        autoTable(doc, {
          startY: yPos,
          head: [['Option', 'Réponses', 'Pourcentage']],
          body: fa.data.map((d: any) => [d.fullName, d.value.toString(), d.percentage + '%']),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else if (fa.type === 'numeric' && 'stats' in fa) {
        autoTable(doc, {
          startY: yPos,
          head: [['Statistique', 'Valeur']],
          body: [
            ['Moyenne', fa.stats.avg],
            ['Minimum', fa.stats.min.toString()],
            ['Maximum', fa.stats.max.toString()],
            ['Nombre de réponses', fa.stats.count.toString()],
          ],
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.text(`${(fa as any).count || 0} réponses collectées`, 20, yPos);
        yPos += 10;
      }
    });

    // Responses table
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Détail des réponses', 14, 20);

    const headers = ['Date', ...fields.slice(0, 4).map(f => f.label.slice(0, 15))];
    const body = responses.map(r => [
      format(new Date(r.created_at), 'dd/MM HH:mm'),
      ...fields.slice(0, 4).map(f => {
        const v = r.data[f.id];
        const str = Array.isArray(v) ? v.join(', ') : v?.toString() || '';
        return str.slice(0, 20);
      }),
    ]);

    autoTable(doc, {
      startY: 25,
      head: [headers],
      body,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
    });

    doc.save(`${survey.title.replace(/\s+/g, '_')}_rapport.pdf`);
  };

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: survey.title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Rapport d\'analyse détaillé', italics: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}` }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Statistiques générales',
            heading: HeadingLevel.HEADING_1,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Indicateur')], width: { size: 50, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph('Valeur')], width: { size: 50, type: WidthType.PERCENTAGE } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Total des réponses')] }),
                  new TableCell({ children: [new Paragraph(stats.totalResponses.toString())] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Taux de complétion')] }),
                  new TableCell({ children: [new Paragraph(stats.completionRate + '%')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Réponses géolocalisées')] }),
                  new TableCell({ children: [new Paragraph(`${stats.responsesWithLocation} (${stats.locationRate}%)`)] }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'Analyse par question',
            heading: HeadingLevel.HEADING_1,
          }),
          ...fieldAnalytics.flatMap(fa => {
            const paragraphs: Paragraph[] = [
              new Paragraph({
                text: fa.field.label,
                heading: HeadingLevel.HEADING_2,
              }),
            ];
            
            if (fa.type === 'categorical' && 'data' in fa) {
              paragraphs.push(
                new Paragraph({
                  children: fa.data.map((d: any) => 
                    new TextRun({ text: `• ${d.fullName}: ${d.value} (${d.percentage}%)\n` })
                  ),
                })
              );
            } else if (fa.type === 'numeric' && 'stats' in fa) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({ text: `Moyenne: ${fa.stats.avg}\n` }),
                    new TextRun({ text: `Minimum: ${fa.stats.min}\n` }),
                    new TextRun({ text: `Maximum: ${fa.stats.max}\n` }),
                  ],
                })
              );
            }
            
            return paragraphs;
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${survey.title.replace(/\s+/g, '_')}_rapport.docx`);
  };

  const exportToCSV = () => {
    if (responses.length === 0 || fields.length === 0) return;

    const headers = ['Date', 'Localisation', ...fields.map(f => f.label)];
    const rows = responses.map(response => {
      const location = response.location 
        ? `${response.location.latitude}, ${response.location.longitude}`
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

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${survey.title.replace(/\s+/g, '_')}_reponses.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
          <p className="text-sm text-muted-foreground">
            Rapport d'analyse détaillé • {responses.length} réponse{responses.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF}>
              <File className="h-4 w-4 mr-2 text-red-600" />
              PDF (.pdf)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToWord}>
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              Word (.docx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-gray-600" />
              CSV (.csv)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Aucune donnée à analyser</p>
          <p className="text-sm">Les analyses apparaîtront une fois les réponses collectées</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.totalResponses}</p>
                      <p className="text-xs text-muted-foreground">Réponses totales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.completionRate}%</p>
                      <p className="text-xs text-muted-foreground">Taux complétion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <MapPin className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.locationRate}%</p>
                      <p className="text-xs text-muted-foreground">Géolocalisées</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.avgResponseTime}</p>
                      <p className="text-xs text-muted-foreground">Temps moyen</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline Chart */}
            {stats.timelineData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Évolution des réponses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stats.timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="responses" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Interactive Map */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Carte des réponses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsesMap responses={responses} fields={fields} />
              </CardContent>
            </Card>

            {/* Field Analytics */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analyse par question
              </h3>

              {fieldAnalytics.map((fa, index) => {
                if (fa.type === 'categorical' && 'data' in fa && fa.data.length > 0) {
                  return (
                    <Card key={fa.field.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{fa.field.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{fa.total} réponses</p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={fa.data} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis type="number" className="text-xs" />
                              <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                                formatter={(value: number, name: string, props: any) => [value, props.payload.fullName]}
                              />
                              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>

                          <ResponsiveContainer width="100%" height={200}>
                            <RechartsPieChart>
                              <Pie
                                data={fa.data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ percentage }) => `${percentage}%`}
                                outerRadius={70}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {fa.data.map((entry: any, i: number) => (
                                  <Cell key={`cell-${i}`} fill={HEX_COLORS[i % HEX_COLORS.length]} />
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
                      </CardContent>
                    </Card>
                  );
                }

                if (fa.type === 'numeric' && 'stats' in fa && fa.data.length > 0) {
                  return (
                    <Card key={fa.field.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{fa.field.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{fa.stats.count} réponses</p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <p className="text-lg font-bold text-foreground">{fa.stats.avg}</p>
                            <p className="text-xs text-muted-foreground">Moyenne</p>
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
                        
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={fa.data}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="value" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }} 
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  );
                }

                if (fa.type === 'text') {
                  return (
                    <Card key={fa.field.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{fa.field.label}</p>
                            <p className="text-sm text-muted-foreground">Champ texte libre</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">{(fa as any).count || 0}</p>
                            <p className="text-xs text-muted-foreground">réponses</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return null;
              })}
            </div>

            {/* Recent Responses Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dernières réponses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {responses.slice(0, 5).map((response) => (
                    <div
                      key={response.id}
                      className="bg-muted/50 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {format(new Date(response.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </span>
                        {response.location && (
                          <span className="inline-flex items-center text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            GPS
                          </span>
                        )}
                      </div>
                      <div className="grid gap-1">
                        {fields.slice(0, 3).map((field) => {
                          const value = response.data[field.id];
                          if (value === undefined || value === null || value === '') return null;
                          return (
                            <div key={field.id} className="text-xs">
                              <span className="text-muted-foreground">{field.label}:</span>{' '}
                              <span className="text-foreground">
                                {Array.isArray(value) ? value.join(', ') : value.toString().slice(0, 50)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
