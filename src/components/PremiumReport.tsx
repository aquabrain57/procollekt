import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, FileSpreadsheet, FileText, File, Crown, Sparkles,
  TrendingUp, Users, MapPin, Target, BarChart3, PieChart,
  Lightbulb, AlertTriangle, CheckCircle, HelpCircle, Edit3,
  Presentation, FileImage, Table as TableIcon, Brain, Loader2,
  RefreshCw, Zap, ArrowRight
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DropdownMenuSeparator,
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
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, PageBreak } from 'docx';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PremiumReportProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

interface AIAnalysis {
  summary: string;
  trends: string[];
  anomalies: string[];
  recommendations: string[];
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export const PremiumReport = ({ survey, responses }: PremiumReportProps) => {
  const { fields } = useSurveyFields(survey.id);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [reportTitle, setReportTitle] = useState(survey.title);
  const [reportSubtitle, setReportSubtitle] = useState('Étude de marché et analyse des données');
  const [companyName, setCompanyName] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [activeExportTab, setActiveExportTab] = useState('pdf');
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Helper to get option label from field options
  const getOptionLabel = (field: any, value: any): string => {
    if (!field.options || !Array.isArray(field.options)) return String(value);
    
    const valueStr = String(value);
    const options = field.options as any[];
    
    // Try to find matching option
    const found = options.find(opt => {
      if (typeof opt === 'string') return opt === valueStr;
      return opt.value === valueStr || opt.label === valueStr;
    });
    
    if (found) {
      return typeof found === 'string' ? found : (found.label || found.value || valueStr);
    }
    
    // Handle "Option XX" pattern
    if (valueStr.match(/^Option\s*\d+$/i) && options.length > 0) {
      const match = valueStr.match(/\d+/);
      if (match) {
        const idx = parseInt(match[0], 10) - 1;
        if (idx >= 0 && idx < options.length) {
          const opt = options[idx];
          return typeof opt === 'string' ? opt : (opt.label || opt.value || valueStr);
        }
      }
    }
    
    return valueStr;
  };

  // Compute analytics per field with proper labels
  const fieldAnalytics = useMemo(() => {
    return fields.map(field => {
      const values = responses.map(r => r.data[field.id]).filter(v => v !== undefined && v !== null && v !== '');
      
      if (field.field_type === 'select' || field.field_type === 'multiselect') {
        const optionCounts: Record<string, number> = {};
        
        // Initialize with form options
        if (field.options && Array.isArray(field.options)) {
          (field.options as any[]).forEach(opt => {
            const label = typeof opt === 'string' ? opt : (opt.label || opt.value || opt);
            optionCounts[label] = 0;
          });
        }
        
        values.forEach(v => {
          if (Array.isArray(v)) {
            v.forEach(item => {
              const label = getOptionLabel(field, item);
              optionCounts[label] = (optionCounts[label] || 0) + 1;
            });
          } else {
            const label = getOptionLabel(field, v);
            optionCounts[label] = (optionCounts[label] || 0) + 1;
          }
        });
        
        const total = Object.values(optionCounts).reduce((a, b) => a + b, 0);
        const data = Object.entries(optionCounts)
          .filter(([_, value]) => value > 0)
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

    // Time-based analysis
    const dateGroups: Record<string, number> = {};
    responses.forEach(r => {
      const date = format(new Date(r.created_at), 'yyyy-MM-dd');
      dateGroups[date] = (dateGroups[date] || 0) + 1;
    });

    const timelineData = Object.entries(dateGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total,
      withLocation,
      locationRate: total > 0 ? Math.round((withLocation / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
      timelineData,
    };
  }, [responses, fields]);

  // Generate key insights
  const insights = useMemo(() => {
    const result: { type: 'success' | 'warning' | 'info'; text: string }[] = [];

    if (globalStats.total >= 100) {
      result.push({ type: 'success', text: `Échantillon statistiquement significatif (${globalStats.total} répondants)` });
    } else if (globalStats.total >= 30) {
      result.push({ type: 'info', text: `Échantillon acceptable mais pourrait être élargi (${globalStats.total} répondants)` });
    } else if (globalStats.total > 0) {
      result.push({ type: 'warning', text: `Échantillon insuffisant pour des conclusions fiables (${globalStats.total} répondants)` });
    }

    if (globalStats.completionRate >= 90) {
      result.push({ type: 'success', text: `Excellent taux de complétion (${globalStats.completionRate}%)` });
    } else if (globalStats.completionRate < 70) {
      result.push({ type: 'warning', text: `Taux de complétion à améliorer (${globalStats.completionRate}%)` });
    }

    // Dominant responses
    fieldAnalytics.forEach(fa => {
      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        const top = fa.data[0];
        if (top.percentage >= 60) {
          result.push({ type: 'info', text: `"${top.name}" domine pour "${fa.field.label}" (${top.percentage}%)` });
        }
      }
    });

    return result.slice(0, 6);
  }, [globalStats, fieldAnalytics]);

  // Calculate additional stats for AI analysis
  const analysisStats = useMemo(() => {
    const dateGroups: Record<string, number> = {};
    const hourGroups: Record<number, number> = {};
    
    responses.forEach(r => {
      const date = format(new Date(r.created_at), 'yyyy-MM-dd');
      const hour = new Date(r.created_at).getHours();
      dateGroups[date] = (dateGroups[date] || 0) + 1;
      hourGroups[hour] = (hourGroups[hour] || 0) + 1;
    });
    
    const dates = Object.keys(dateGroups).sort();
    const peakHourEntry = Object.entries(hourGroups).sort(([,a], [,b]) => b - a)[0];
    
    return {
      avgPerDay: dates.length > 0 ? Math.round(responses.length / dates.length * 10) / 10 : 0,
      daysActive: dates.length,
      peakHour: peakHourEntry ? `${peakHourEntry[0]}h` : 'N/A',
    };
  }, [responses]);

  // AI Analysis function
  const runAIAnalysis = async () => {
    if (responses.length < 3) {
      toast.error('Minimum 3 réponses nécessaires pour l\'analyse IA');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Prepare field analytics for API
      const apiFieldAnalytics = fieldAnalytics.map(fa => ({
        field: fa.field.label,
        type: fa.type,
        data: fa.type === 'categorical' && fa.data 
          ? fa.data.slice(0, 10).map(d => ({
              option: d.name,
              count: d.value,
              percentage: d.percentage,
            }))
          : [],
        stats: fa.type === 'numeric' && fa.stats ? {
          avg: fa.stats.avg,
          min: fa.stats.min,
          max: fa.stats.max,
          median: fa.stats.avg, // Approximation
        } : undefined,
      }));

      const { data, error } = await supabase.functions.invoke('analyze-survey', {
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
            avgPerDay: analysisStats.avgPerDay,
            daysActive: analysisStats.daysActive,
            peakHour: analysisStats.peakHour,
          },
          fieldAnalytics: apiFieldAnalytics,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'analyse');
      }

      if (data?.analysis?.sections) {
        setAiAnalysis(data.analysis.sections);
        toast.success('Analyse IA générée avec succès');
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setAnalysisError(message);
      toast.error(`Erreur d'analyse: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Export to Premium PDF with full analysis
  const exportPremiumPDF = (mode: 'standard' | 'presentation' = 'standard') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Cover page
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(companyName || 'RAPPORT D\'ANALYSE', pageWidth / 2, 50, { align: 'center' });
    
    doc.setFontSize(28);
    doc.text(reportTitle, pageWidth / 2, 90, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(reportSubtitle, pageWidth / 2, 110, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`${globalStats.total} répondants analysés`, pageWidth / 2, 140, { align: 'center' });
    doc.text(`Taux de complétion: ${globalStats.completionRate}%`, pageWidth / 2, 155, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(format(new Date(), 'MMMM yyyy', { locale: fr }), pageWidth / 2, 200, { align: 'center' });
    if (authorName) {
      doc.text(`Préparé par: ${authorName}`, pageWidth / 2, 215, { align: 'center' });
    }

    // Page 2: Executive Summary
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('RÉSUMÉ EXÉCUTIF', pageWidth / 2, 22, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 50;

    // Key metrics table
    autoTable(doc, {
      startY: yPos,
      head: [['Indicateur clé', 'Valeur', 'Évaluation']],
      body: [
        ['Échantillon total', `${globalStats.total} répondants`, globalStats.total >= 100 ? '✓ Représentatif' : globalStats.total >= 30 ? '○ Significatif' : '✗ À compléter'],
        ['Taux de complétion', `${globalStats.completionRate}%`, globalStats.completionRate >= 80 ? '✓ Excellent' : '○ À améliorer'],
        ['Couverture GPS', `${globalStats.locationRate}%`, globalStats.locationRate >= 70 ? '✓ Bonne' : '○ Limitée'],
        ['Questions analysées', `${fields.length}`, '—'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'center' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Key insights
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Points clés à retenir', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 10;

    insights.forEach((insight, idx) => {
      const icon = insight.type === 'success' ? '✓' : insight.type === 'warning' ? '!' : '•';
      doc.setFontSize(9);
      doc.text(`${icon} ${insight.text}`, 18, yPos);
      yPos += 7;
    });

    // Page 3+: Detailed Analysis
    doc.addPage();
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('ANALYSE DÉTAILLÉE PAR QUESTION', pageWidth / 2, 22, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 50;

    fieldAnalytics.forEach((fa, index) => {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Q${index + 1}. ${fa.field.label}`, 14, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 8;

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        const tableData = fa.data.slice(0, 10).map((d, i) => [
          `${i + 1}`,
          d.name.substring(0, 40),
          `${d.value}`,
          `${d.percentage}%`,
          d.percentage >= 50 ? '★ Dominant' : d.percentage >= 25 ? '○ Significatif' : ''
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Option', 'Réponses', '%', 'Observation']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          margin: { left: 18 },
          tableWidth: pageWidth - 36,
          columnStyles: {
            0: { cellWidth: 10 },
            4: { fontStyle: 'italic', textColor: [100, 100, 100] }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;

        // Insight for this question
        const topOption = fa.data[0];
        if (topOption.percentage > 40) {
          doc.setFontSize(8);
          doc.setTextColor(99, 102, 241);
          doc.text(`→ Insight: "${topOption.name}" représente la majorité des réponses (${topOption.percentage}%)`, 18, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 10;
        }
      } else if (fa.type === 'numeric' && fa.stats) {
        autoTable(doc, {
          startY: yPos,
          head: [['Moyenne', 'Min', 'Max', 'Répondants']],
          body: [[fa.stats.avg.toFixed(2), fa.stats.min, fa.stats.max, fa.stats.count]],
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
          bodyStyles: { fontSize: 9, halign: 'center' },
          margin: { left: 18 },
          tableWidth: 100,
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
      } else {
        doc.setFontSize(9);
        doc.text(`${fa.count || 0} réponses textuelles collectées`, 18, yPos);
        yPos += 12;
      }
    });

    // Recommendations page
    if (customNotes) {
      doc.addPage();
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('RECOMMANDATIONS & OBSERVATIONS', pageWidth / 2, 22, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(customNotes, pageWidth - 28);
      doc.text(lines, 14, 50);
    }

    doc.save(`${reportTitle.replace(/\s+/g, '_')}_Premium_${mode === 'presentation' ? 'Slides' : 'Report'}.pdf`);
    toast.success('Rapport PDF généré avec succès');
  };

  // Export to PowerPoint-style PDF (one question per page)
  const exportPresentationPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Title slide
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(companyName || 'PRÉSENTATION ANALYTIQUE', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(36);
    doc.text(reportTitle, pageWidth / 2, 70, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text(reportSubtitle, pageWidth / 2, 95, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`${globalStats.total} répondants | ${globalStats.completionRate}% complétion`, pageWidth / 2, 130, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(format(new Date(), 'dd MMMM yyyy', { locale: fr }), pageWidth / 2, 180, { align: 'center' });

    // Summary slide
    doc.addPage('landscape');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.text('Résumé exécutif', 20, 30);
    
    doc.setFontSize(12);
    let y = 50;
    
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(20, y, 80, 40, 5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(`${globalStats.total}`, 60, y + 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Répondants', 60, y + 32, { align: 'center' });

    doc.setFillColor(34, 197, 94);
    doc.roundedRect(110, y, 80, 40, 5, 5, 'F');
    doc.setFontSize(24);
    doc.text(`${globalStats.completionRate}%`, 150, y + 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Complétion', 150, y + 32, { align: 'center' });

    doc.setFillColor(245, 158, 11);
    doc.roundedRect(200, y, 80, 40, 5, 5, 'F');
    doc.setFontSize(24);
    doc.text(`${globalStats.locationRate}%`, 240, y + 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Géolocalisés', 240, y + 32, { align: 'center' });

    // One slide per question
    fieldAnalytics.forEach((fa, index) => {
      doc.addPage('landscape');
      
      // Header bar
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`Question ${index + 1} / ${fieldAnalytics.length}`, 20, 16);
      doc.text(reportTitle, pageWidth - 20, 16, { align: 'right' });

      // Question title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.text(fa.field.label, 20, 45);

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        // Draw horizontal bar chart style
        let barY = 60;
        const maxWidth = 180;
        
        fa.data.slice(0, 8).forEach((d, i) => {
          const barWidth = (d.percentage / 100) * maxWidth;
          
          doc.setFillColor(...(CHART_COLORS[i % CHART_COLORS.length].match(/\w\w/g)?.map(x => parseInt(x, 16)) as [number, number, number] || [99, 102, 241]));
          doc.roundedRect(20, barY, barWidth, 12, 2, 2, 'F');
          
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.text(d.name.substring(0, 30), 210, barY + 9);
          doc.text(`${d.percentage}% (${d.value})`, 260, barY + 9);
          
          barY += 18;
        });

        // Top insight
        const top = fa.data[0];
        if (top.percentage >= 40) {
          doc.setFillColor(240, 240, 255);
          doc.roundedRect(20, 180, pageWidth - 40, 20, 3, 3, 'F');
          doc.setTextColor(99, 102, 241);
          doc.setFontSize(11);
          doc.text(`💡 "${top.name}" représente ${top.percentage}% des réponses`, 30, 193);
        }
      } else if (fa.type === 'numeric' && fa.stats) {
        // Big number display
        doc.setFillColor(240, 240, 255);
        doc.roundedRect(20, 60, 70, 60, 5, 5, 'F');
        doc.setTextColor(99, 102, 241);
        doc.setFontSize(32);
        doc.text(fa.stats.avg.toFixed(1), 55, 95, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Moyenne', 55, 110, { align: 'center' });

        doc.setFillColor(245, 245, 245);
        doc.roundedRect(100, 60, 50, 60, 5, 5, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(20);
        doc.text(`${fa.stats.min}`, 125, 90, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Min', 125, 110, { align: 'center' });

        doc.roundedRect(160, 60, 50, 60, 5, 5, 'F');
        doc.setFontSize(20);
        doc.text(`${fa.stats.max}`, 185, 90, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Max', 185, 110, { align: 'center' });

        doc.roundedRect(220, 60, 50, 60, 5, 5, 'F');
        doc.setFontSize(20);
        doc.text(`${fa.stats.count}`, 245, 90, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Réponses', 245, 110, { align: 'center' });
      } else {
        doc.setFontSize(14);
        doc.text(`${fa.count || 0} réponses textuelles collectées`, 20, 80);
      }
    });

    // Thank you slide
    doc.addPage('landscape');
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.text('Merci !', pageWidth / 2, 80, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Pour toute question, contactez-nous', pageWidth / 2, 110, { align: 'center' });
    if (authorName) {
      doc.setFontSize(12);
      doc.text(authorName, pageWidth / 2, 140, { align: 'center' });
    }

    doc.save(`${reportTitle.replace(/\s+/g, '_')}_Presentation.pdf`);
    toast.success('Présentation PDF générée avec succès');
  };

  // Export to Word
  const exportToWord = async () => {
    const children: any[] = [];

    // Title page content
    children.push(
      new Paragraph({
        text: companyName || 'RAPPORT D\'ANALYSE',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: reportTitle,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: reportSubtitle,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `${globalStats.total} répondants | ${globalStats.completionRate}% complétion | ${globalStats.locationRate}% géolocalisés`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    // Executive Summary
    children.push(
      new Paragraph({
        text: 'RÉSUMÉ EXÉCUTIF',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Stats
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• Échantillon total: ', bold: true }),
          new TextRun({ text: `${globalStats.total} répondants` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Taux de complétion: ', bold: true }),
          new TextRun({ text: `${globalStats.completionRate}%` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Couverture géographique: ', bold: true }),
          new TextRun({ text: `${globalStats.locationRate}%` }),
        ],
        spacing: { after: 200 },
      })
    );

    // Key insights
    children.push(
      new Paragraph({
        text: 'Points clés',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    insights.forEach(insight => {
      children.push(
        new Paragraph({
          text: `• ${insight.text}`,
          spacing: { after: 50 },
        })
      );
    });

    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    // Detailed Analysis
    children.push(
      new Paragraph({
        text: 'ANALYSE DÉTAILLÉE PAR QUESTION',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    fieldAnalytics.forEach((fa, index) => {
      children.push(
        new Paragraph({
          text: `Q${index + 1}. ${fa.field.label}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        fa.data.slice(0, 8).forEach((d, i) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${i + 1}. ${d.name}: ` }),
                new TextRun({ text: `${d.value} réponses (${d.percentage}%)`, bold: true }),
              ],
              spacing: { after: 50 },
            })
          );
        });
      } else if (fa.type === 'numeric' && fa.stats) {
        children.push(
          new Paragraph({
            text: `Moyenne: ${fa.stats.avg.toFixed(2)} | Min: ${fa.stats.min} | Max: ${fa.stats.max} | ${fa.stats.count} réponses`,
            spacing: { after: 100 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            text: `${fa.count || 0} réponses textuelles`,
            spacing: { after: 100 },
          })
        );
      }
    });

    // Custom notes
    if (customNotes) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        }),
        new Paragraph({
          text: 'RECOMMANDATIONS & OBSERVATIONS',
          heading: HeadingLevel.HEADING_1,
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
    toast.success('Rapport Word généré avec succès');
  };

  // Export to Excel with multiple sheets
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['RAPPORT D\'ANALYSE', reportTitle],
      ['Date de génération', format(new Date(), 'dd/MM/yyyy HH:mm')],
      ['', ''],
      ['STATISTIQUES GLOBALES', ''],
      ['Nombre total de répondants', globalStats.total],
      ['Taux de complétion', `${globalStats.completionRate}%`],
      ['Couverture géographique', `${globalStats.locationRate}%`],
      ['Nombre de questions', fields.length],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

    // Per question analysis
    fieldAnalytics.forEach((fa, index) => {
      if (fa.type === 'categorical' && fa.data) {
        const sheetData = [
          [`Q${index + 1}: ${fa.field.label}`],
          ['Option', 'Réponses', 'Pourcentage'],
          ...fa.data.map(d => [d.name, d.value, `${d.percentage}%`])
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, `Q${index + 1}`.substring(0, 31));
      } else if (fa.type === 'numeric' && fa.stats) {
        const sheetData = [
          [`Q${index + 1}: ${fa.field.label}`],
          ['Métrique', 'Valeur'],
          ['Moyenne', fa.stats.avg.toFixed(2)],
          ['Minimum', fa.stats.min],
          ['Maximum', fa.stats.max],
          ['Nombre de réponses', fa.stats.count],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, `Q${index + 1}`.substring(0, 31));
      }
    });

    // Raw data sheet
    const headers = ['#', 'Date', 'Heure', 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    const rows = responses.map((response, idx) => {
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        return value?.toString() || '';
      });

      return [
        idx + 1,
        format(new Date(response.created_at), 'dd/MM/yyyy'),
        format(new Date(response.created_at), 'HH:mm:ss'),
        response.location?.latitude || '',
        response.location?.longitude || '',
        ...fieldValues,
      ];
    });

    const wsData = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, wsData, 'Données brutes');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout]), `${reportTitle.replace(/\s+/g, '_')}_Premium.xlsx`);
    toast.success('Rapport Excel généré avec succès');
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
                Rapport Premium Avancé
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => exportPremiumPDF('standard')}>
                <File className="h-4 w-4 mr-2 text-red-600" />
                PDF Rapport détaillé
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPresentationPDF}>
                <Presentation className="h-4 w-4 mr-2 text-orange-600" />
                PDF Présentation (slides)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportToWord}>
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel multi-feuilles (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Key Insights */}
        {insights.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Points clés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  {insight.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />}
                  {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
                  {insight.type === 'info' && <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                  <span className="text-foreground">{insight.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* AI Executive Summary - Premium Feature */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-purple-600">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Résumé Exécutif IA
                    <Badge variant="secondary" className="text-[10px] bg-gradient-to-r from-primary/20 to-purple-600/20">
                      Premium
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Analyse automatique par intelligence artificielle
                  </CardDescription>
                </div>
              </div>
              <Button 
                onClick={runAIAnalysis}
                disabled={isAnalyzing || responses.length < 3}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isAnalyzing ? (
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
                    <Zap className="h-4 w-4" />
                    Générer
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!aiAnalysis && !isAnalyzing && !analysisError && (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Analyse IA non générée</p>
                <p className="text-sm mt-1">
                  Cliquez sur "Générer" pour obtenir un résumé exécutif, 
                  les tendances clés et des recommandations stratégiques.
                </p>
                {responses.length < 3 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Minimum 3 réponses nécessaires (actuellement: {responses.length})
                  </p>
                )}
              </div>
            )}

            {isAnalyzing && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="font-medium text-primary">Analyse en cours...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  L'IA analyse vos {responses.length} réponses et génère des insights.
                </p>
              </div>
            )}

            {analysisError && !isAnalyzing && (
              <div className="text-center py-8 text-destructive">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Erreur d'analyse</p>
                <p className="text-sm mt-1">{analysisError}</p>
                <Button 
                  onClick={runAIAnalysis} 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            )}

            {aiAnalysis && !isAnalyzing && (
              <div className="space-y-6">
                {/* Executive Summary */}
                {aiAnalysis.summary && (
                  <div className="p-4 bg-card rounded-xl border shadow-sm">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Résumé
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {aiAnalysis.summary}
                    </p>
                  </div>
                )}

                {/* Trends */}
                {aiAnalysis.trends && aiAnalysis.trends.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Tendances clés identifiées
                    </h4>
                    <div className="grid gap-2">
                      {aiAnalysis.trends.map((trend, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-3 bg-green-500/5 rounded-lg border border-green-500/20"
                        >
                          <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomalies */}
                {aiAnalysis.anomalies && aiAnalysis.anomalies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Points d'attention
                    </h4>
                    <div className="grid gap-2">
                      {aiAnalysis.anomalies.map((anomaly, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20"
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{anomaly}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Recommandations stratégiques
                    </h4>
                    <div className="grid gap-2">
                      {aiAnalysis.recommendations.map((rec, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20"
                        >
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Chart */}
        {globalStats.timelineData.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Évolution des réponses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={globalStats.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

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
                <label className="text-sm font-medium">Auteur / Responsable</label>
                <Input 
                  placeholder="Ex: Jean Dupont, Équipe Data..."
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes et recommandations</label>
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