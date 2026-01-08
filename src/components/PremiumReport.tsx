import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, FileSpreadsheet, FileText, File, Crown, Sparkles,
  TrendingUp, Users, MapPin, Target, BarChart3, PieChart,
  Lightbulb, AlertTriangle, CheckCircle, HelpCircle, Edit3
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

interface PremiumReportProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export const PremiumReport = ({ survey, responses }: PremiumReportProps) => {
  const { fields } = useSurveyFields(survey.id);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [reportTitle, setReportTitle] = useState(survey.title);
  const [reportSubtitle, setReportSubtitle] = useState('Étude de marché et analyse des données');
  const [companyName, setCompanyName] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Compute analytics per field
  const fieldAnalytics = useMemo(() => {
    return fields.map(field => {
      const values = responses.map(r => r.data[field.id]).filter(v => v !== undefined && v !== null && v !== '');
      
      if (field.field_type === 'select' || field.field_type === 'multiselect') {
        const optionCounts: Record<string, number> = {};
        
        values.forEach(v => {
          if (Array.isArray(v)) {
            v.forEach(item => {
              // Use the actual value as label
              const label = String(item);
              optionCounts[label] = (optionCounts[label] || 0) + 1;
            });
          } else {
            const label = String(v);
            optionCounts[label] = (optionCounts[label] || 0) + 1;
          }
        });
        
        const total = Object.values(optionCounts).reduce((a, b) => a + b, 0);
        const data = Object.entries(optionCounts)
          .map(([name, value]) => ({
            name,
            value,
            percentage: total > 0 ? Math.round((value / total) * 100) : 0,
          }))
          .sort((a, b) => b.value - a.value);

        return { field, type: 'categorical' as const, data, total };
      }

      if (field.field_type === 'number' || field.field_type === 'rating') {
        const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
        const avg = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
        const min = numbers.length > 0 ? Math.min(...numbers) : 0;
        const max = numbers.length > 0 ? Math.max(...numbers) : 0;

        const distribution: Record<number, number> = {};
        numbers.forEach(n => {
          distribution[n] = (distribution[n] || 0) + 1;
        });
        
        const data = Object.entries(distribution)
          .map(([value, count]) => ({ 
            name: String(value),
            value: count,
            percentage: Math.round((count / numbers.length) * 100),
          }))
          .sort((a, b) => Number(a.name) - Number(b.name));

        return { field, type: 'numeric' as const, data, stats: { avg, min, max, count: numbers.length } };
      }

      return { field, type: 'text' as const, count: values.length };
    });
  }, [fields, responses]);

  // Global stats
  const globalStats = useMemo(() => {
    const total = responses.length;
    const withLocation = responses.filter(r => r.location).length;
    const requiredFields = fields.filter(f => f.required);
    const complete = responses.filter(r => {
      return requiredFields.every(field => {
        const value = r.data[field.id];
        return value !== undefined && value !== null && value !== '';
      });
    }).length;

    return {
      total,
      withLocation,
      locationRate: total > 0 ? Math.round((withLocation / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
    };
  }, [responses, fields]);

  // Export to premium PDF
  const exportPremiumPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header with branding
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(companyName || 'RAPPORT PREMIUM', pageWidth / 2, 12, { align: 'center' });
    
    doc.setFontSize(20);
    doc.text(reportTitle, pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(reportSubtitle, pageWidth / 2, 33, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(`${format(new Date(), 'MMMM yyyy', { locale: fr })}`, pageWidth / 2, 41, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    let yPos = 55;

    // Executive Summary
    doc.setFontSize(14);
    doc.text('RÉSUMÉ EXÉCUTIF', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Indicateur', 'Valeur', 'Interprétation']],
      body: [
        ['Échantillon total', `${globalStats.total} répondants`, globalStats.total >= 100 ? 'Représentatif' : globalStats.total >= 30 ? 'Significatif' : 'À compléter'],
        ['Taux de complétion', `${globalStats.completionRate}%`, globalStats.completionRate >= 80 ? 'Excellent' : 'À améliorer'],
        ['Couverture géographique', `${globalStats.locationRate}%`, globalStats.locationRate >= 70 ? 'Bonne' : 'Limitée'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Analysis by question
    doc.setFontSize(14);
    doc.text('ANALYSE PAR QUESTION', 14, yPos);
    yPos += 10;

    fieldAnalytics.forEach((fa, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${fa.field.label}`, 14, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 6;

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        const tableData = fa.data.slice(0, 8).map(d => [
          d.name,
          `${d.value}`,
          `${d.percentage}%`
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Option', 'Réponses', 'Pourcentage']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 18 },
          tableWidth: pageWidth - 36,
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Add insight
        const topOption = fa.data[0];
        if (topOption && topOption.percentage > 50) {
          doc.setFontSize(8);
          doc.setTextColor(99, 102, 241);
          doc.text(`💡 Insight: "${topOption.name}" domine avec ${topOption.percentage}% des réponses.`, 18, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 8;
        }
      } else if (fa.type === 'numeric' && fa.stats) {
        doc.setFontSize(9);
        doc.text(`Moyenne: ${fa.stats.avg.toFixed(1)} | Min: ${fa.stats.min} | Max: ${fa.stats.max} | Répondants: ${fa.stats.count}`, 18, yPos);
        yPos += 10;
      } else {
        doc.setFontSize(9);
        doc.text(`${fa.count || 0} réponses textuelles`, 18, yPos);
        yPos += 10;
      }
    });

    // Custom notes
    if (customNotes) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.text('NOTES ET OBSERVATIONS', 14, yPos);
      yPos += 8;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(customNotes, pageWidth - 28);
      doc.text(lines, 14, yPos);
    }

    doc.save(`${reportTitle.replace(/\s+/g, '_')}_Premium.pdf`);
  };

  // Export to Word
  const exportToWord = async () => {
    const children: any[] = [];

    // Title
    children.push(
      new Paragraph({
        text: companyName || 'RAPPORT D\'ÉTUDE',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: reportTitle,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: reportSubtitle,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`,
        spacing: { after: 400 },
      })
    );

    // Summary
    children.push(
      new Paragraph({
        text: 'RÉSUMÉ EXÉCUTIF',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• Échantillon total: `, bold: true }),
          new TextRun({ text: `${globalStats.total} répondants` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• Taux de complétion: `, bold: true }),
          new TextRun({ text: `${globalStats.completionRate}%` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• Couverture géographique: `, bold: true }),
          new TextRun({ text: `${globalStats.locationRate}%` }),
        ],
        spacing: { after: 400 },
      })
    );

    // Analysis per field
    children.push(
      new Paragraph({
        text: 'ANALYSE PAR QUESTION',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    fieldAnalytics.forEach((fa, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${fa.field.label}`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 100 },
        })
      );

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        fa.data.slice(0, 5).forEach(d => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `• ${d.name}: ` }),
                new TextRun({ text: `${d.value} réponses (${d.percentage}%)`, bold: true }),
              ],
              spacing: { after: 50 },
            })
          );
        });
      } else if (fa.type === 'numeric' && fa.stats) {
        children.push(
          new Paragraph({
            text: `Moyenne: ${fa.stats.avg.toFixed(1)} | Min: ${fa.stats.min} | Max: ${fa.stats.max}`,
            spacing: { after: 100 },
          })
        );
      }
    });

    // Custom notes
    if (customNotes) {
      children.push(
        new Paragraph({
          text: 'NOTES ET OBSERVATIONS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: customNotes,
          spacing: { after: 200 },
        })
      );
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${reportTitle.replace(/\s+/g, '_')}_Premium.docx`);
  };

  if (responses.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl">
        <Crown className="h-12 w-12 mx-auto mb-4 opacity-50 text-primary" />
        <p className="font-medium text-foreground">Aucune donnée disponible</p>
        <p className="text-sm text-muted-foreground">Les rapports premium apparaîtront une fois les réponses collectées</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4 pb-8">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-purple-600 p-6 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5" />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Rapport Premium
              </Badge>
            </div>
            
            <h1 className="text-2xl font-bold mb-1">{reportTitle}</h1>
            <p className="text-white/80 text-sm mb-4">{reportSubtitle}</p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{globalStats.total} répondants</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                <span>{globalStats.completionRate}% complétion</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{globalStats.locationRate}% géolocalisés</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setShowCustomizeDialog(true)} variant="outline">
            <Edit3 className="h-4 w-4 mr-2" />
            Personnaliser
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-purple-600">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPremiumPDF}>
                <File className="h-4 w-4 mr-2 text-red-600" />
                PDF Premium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToWord}>
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Field Analysis */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analyse détaillée par question
          </h2>

          {fieldAnalytics.map((fa, index) => (
            <Card key={fa.field.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{fa.field.label}</CardTitle>
                    <CardDescription className="text-xs">
                      {fa.type === 'categorical' ? 'Question à choix' : fa.type === 'numeric' ? 'Question numérique' : 'Question ouverte'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {fa.total || fa.count || fa.stats?.count || 0} rép.
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {fa.type === 'categorical' && fa.data && fa.data.length > 0 && (
                  <div className="space-y-4">
                    {/* Frequency table */}
                    <div className="space-y-2">
                      {fa.data.map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="truncate font-medium">{item.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {item.value} ({item.percentage}%)
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${item.percentage}%`,
                                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pie chart */}
                    {fa.data.length <= 8 && (
                      <div className="h-[200px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={fa.data}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${percentage}%`}
                              outerRadius={70}
                              dataKey="value"
                            >
                              {fa.data.map((_, idx) => (
                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {fa.type === 'numeric' && fa.stats && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{fa.stats.avg.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Moyenne</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{fa.stats.min}</p>
                      <p className="text-xs text-muted-foreground">Min</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{fa.stats.max}</p>
                      <p className="text-xs text-muted-foreground">Max</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{fa.stats.count}</p>
                      <p className="text-xs text-muted-foreground">Réponses</p>
                    </div>
                  </div>
                )}

                {fa.type === 'text' && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">{fa.count || 0} réponses textuelles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Customize Dialog */}
        <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Personnaliser le rapport
              </DialogTitle>
              <DialogDescription>
                Ajoutez vos informations pour un rapport professionnel
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom de l'entreprise / Organisation</label>
                <Input 
                  placeholder="Ex: AQUABRAIN, ONG XYZ..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Titre du rapport</label>
                <Input 
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sous-titre</label>
                <Input 
                  value={reportSubtitle}
                  onChange={(e) => setReportSubtitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes et observations</label>
                <Textarea 
                  placeholder="Ajoutez vos observations, conclusions ou recommandations..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCustomizeDialog(false)}>
                Annuler
              </Button>
              <Button onClick={() => setShowCustomizeDialog(false)}>
                Appliquer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
};
