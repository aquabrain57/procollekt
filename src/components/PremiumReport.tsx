import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, FileSpreadsheet, FileText, File, Crown, Sparkles,
  TrendingUp, Users, MapPin, Target, BarChart3, PieChart,
  Lightbulb, AlertTriangle, CheckCircle, HelpCircle, Edit3,
  Presentation, Brain, Loader2, RefreshCw, Zap, ArrowRight,
  Globe, Calendar, Clock, Building2
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, PageBreak, Header, Footer, ImageRun } from 'docx';
import pptxgen from 'pptxgenjs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { downloadXlsx } from '@/lib/excel';

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

interface FieldAnalytics {
  field: any;
  type: 'categorical' | 'numeric' | 'text';
  data?: { name: string; value: number; percentage: number }[];
  stats?: { avg: number; min: number; max: number; count: number };
  total?: number;
  count?: number;
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const PPTX_COLORS = ['6366F1', '22C55E', 'F59E0B', 'EF4444', '8B5CF6', '06B6D4', 'EC4899', '14B8A6'];

export const PremiumReport = ({ survey, responses }: PremiumReportProps) => {
  const { fields } = useSurveyFields(survey.id);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [reportTitle, setReportTitle] = useState(survey.title);
  const [reportSubtitle, setReportSubtitle] = useState('Étude de marché et analyse des données');
  const [companyName, setCompanyName] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [studyZones, setStudyZones] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Helper to get option label from field options
  const getOptionLabel = (field: any, value: any): string => {
    if (!field.options || !Array.isArray(field.options)) return String(value);
    
    const valueStr = String(value);
    const options = field.options as any[];
    
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
  const fieldAnalytics: FieldAnalytics[] = useMemo(() => {
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
    const hourGroups: Record<number, number> = {};
    const weekdayGroups: Record<string, number> = {};
    const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    responses.forEach(r => {
      const date = format(new Date(r.created_at), 'yyyy-MM-dd');
      const hour = new Date(r.created_at).getHours();
      const weekday = weekdays[new Date(r.created_at).getDay()];
      
      dateGroups[date] = (dateGroups[date] || 0) + 1;
      hourGroups[hour] = (hourGroups[hour] || 0) + 1;
      weekdayGroups[weekday] = (weekdayGroups[weekday] || 0) + 1;
    });

    const timelineData = Object.entries(dateGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dates = Object.keys(dateGroups).sort();
    const peakHourEntry = Object.entries(hourGroups).sort(([,a], [,b]) => b - a)[0];
    const peakDayEntry = Object.entries(weekdayGroups).sort(([,a], [,b]) => b - a)[0];

    return {
      total,
      withLocation,
      locationRate: total > 0 ? Math.round((withLocation / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((complete / total) * 100) : 0,
      timelineData,
      startDate: dates[0] || 'N/A',
      endDate: dates[dates.length - 1] || 'N/A',
      daysActive: dates.length,
      avgPerDay: dates.length > 0 ? Math.round(total / dates.length * 10) / 10 : 0,
      peakHour: peakHourEntry ? `${peakHourEntry[0]}h` : 'N/A',
      peakDay: peakDayEntry ? peakDayEntry[0] : 'N/A',
    };
  }, [responses, fields]);

  // Geographic analysis
  const geoAnalysis = useMemo(() => {
    const geoResponses = responses.filter(r => r.location);
    if (geoResponses.length === 0) return null;

    const zones: Record<string, number> = {};
    geoResponses.forEach(r => {
      const lat = Math.round(r.location!.latitude * 10) / 10;
      const lng = Math.round(r.location!.longitude * 10) / 10;
      const key = `${lat},${lng}`;
      zones[key] = (zones[key] || 0) + 1;
    });

    return {
      total: geoResponses.length,
      rate: Math.round((geoResponses.length / responses.length) * 100),
      zonesCount: Object.keys(zones).length,
      topZones: Object.entries(zones)
        .map(([coords, count]) => ({ coords, count, percentage: Math.round((count / geoResponses.length) * 100) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }, [responses]);

  // Generate key insights
  const insights = useMemo(() => {
    const result: { type: 'success' | 'warning' | 'info'; text: string; detail?: string }[] = [];

    if (globalStats.total >= 100) {
      result.push({ 
        type: 'success', 
        text: `Échantillon statistiquement significatif (${globalStats.total} répondants)`,
        detail: 'L\'échantillon permet des conclusions fiables avec une marge d\'erreur réduite.'
      });
    } else if (globalStats.total >= 30) {
      result.push({ 
        type: 'info', 
        text: `Échantillon acceptable (${globalStats.total} répondants)`,
        detail: 'Recommandation: élargir l\'échantillon pour plus de représentativité.'
      });
    } else if (globalStats.total > 0) {
      result.push({ 
        type: 'warning', 
        text: `Échantillon insuffisant (${globalStats.total} répondants)`,
        detail: 'Les conclusions doivent être considérées avec prudence.'
      });
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
          result.push({ 
            type: 'info', 
            text: `"${top.name}" domine pour "${fa.field.label}" (${top.percentage}%)`,
            detail: 'Tendance forte à exploiter dans la stratégie.'
          });
        }
      }
    });

    return result.slice(0, 8);
  }, [globalStats, fieldAnalytics]);

  // AI Analysis function
  const runAIAnalysis = async () => {
    if (responses.length < 3) {
      toast.error('Minimum 3 réponses nécessaires pour l\'analyse IA');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
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
        stats: fa.type === 'numeric' && fa.stats ? fa.stats : undefined,
      }));

      const { data, error } = await supabase.functions.invoke('analyze-survey', {
        body: {
          survey: { title: survey.title, description: survey.description || '' },
          fields: fields.map(f => ({ id: f.id, label: f.label, type: f.field_type, options: f.options })),
          statistics: {
            total: globalStats.total,
            completionRate: globalStats.completionRate,
            locationRate: globalStats.locationRate,
            avgPerDay: globalStats.avgPerDay,
            daysActive: globalStats.daysActive,
            peakHour: globalStats.peakHour,
          },
          fieldAnalytics: apiFieldAnalytics,
        },
      });

      if (error) throw new Error(error.message || 'Erreur lors de l\'analyse');
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

  // ========== EXPORT FUNCTIONS ==========

  // Export to Premium PDF
  const exportPremiumPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // ===== COVER PAGE =====
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    if (companyName) {
      doc.text(companyName.toUpperCase(), pageWidth / 2, 35, { align: 'center' });
    }
    
    // Main title
    doc.setFontSize(28);
    const titleLines = doc.splitTextToSize(reportTitle.toUpperCase(), pageWidth - 40);
    doc.text(titleLines, pageWidth / 2, 70, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(14);
    doc.text(reportSubtitle, pageWidth / 2, 100, { align: 'center' });
    
    // Stats summary
    doc.setFontSize(12);
    doc.text(`${globalStats.total} répondants analysés`, pageWidth / 2, 130, { align: 'center' });
    doc.text(`Taux de complétion: ${globalStats.completionRate}%`, pageWidth / 2, 145, { align: 'center' });
    if (geoAnalysis) {
      doc.text(`Couverture GPS: ${geoAnalysis.rate}%`, pageWidth / 2, 160, { align: 'center' });
    }
    
    // Study zones
    if (studyZones) {
      doc.setFontSize(10);
      doc.text('ZONES D\'ÉTUDE', pageWidth / 2, 185, { align: 'center' });
      doc.setFontSize(9);
      const zones = studyZones.split(',').map(z => z.trim()).join(' • ');
      doc.text(zones, pageWidth / 2, 195, { align: 'center' });
    }
    
    // Date and contact
    doc.setFontSize(10);
    doc.text(format(new Date(), 'MMMM yyyy', { locale: fr }).toUpperCase(), pageWidth / 2, 230, { align: 'center' });
    if (contactInfo) {
      doc.setFontSize(9);
      doc.text(contactInfo, pageWidth / 2, 245, { align: 'center' });
    }
    if (authorName) {
      doc.text(`Préparé par: ${authorName}`, pageWidth / 2, 260, { align: 'center' });
    }

    // ===== PAGE 2: INTRODUCTION =====
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('INTRODUCTION', pageWidth / 2, 22, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 50;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Contexte et Objectifs de l\'étude', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 15;
    
    doc.setFontSize(10);
    const introText = survey.description || 
      `Cette étude a été menée pour analyser les données collectées via le formulaire "${survey.title}". ` +
      `L'enquête a permis de recueillir ${globalStats.total} réponses sur une période de ${globalStats.daysActive} jours.`;
    const introLines = doc.splitTextToSize(introText, pageWidth - 28);
    doc.text(introLines, 14, yPos);
    yPos += introLines.length * 5 + 15;
    
    // Objectives
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Objectifs de l\'Étude', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 10;
    
    const objectives = [
      'Analyser les habitudes et préférences des répondants',
      'Identifier les tendances dominantes dans les réponses',
      'Évaluer la représentativité géographique de l\'échantillon',
      'Formuler des recommandations stratégiques basées sur les données',
    ];
    
    doc.setFontSize(9);
    objectives.forEach(obj => {
      doc.text(`• ${obj}`, 18, yPos);
      yPos += 7;
    });

    // ===== PAGE 3: MÉTHODOLOGIE =====
    doc.addPage();
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('MÉTHODOLOGIE', pageWidth / 2, 22, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 50;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Paramètre', 'Valeur', 'Observation']],
      body: [
        ['Période d\'enquête', `${globalStats.startDate} → ${globalStats.endDate}`, `${globalStats.daysActive} jours actifs`],
        ['Échantillon total', `${globalStats.total} répondants`, globalStats.total >= 100 ? '✓ Représentatif' : '○ À compléter'],
        ['Taux de complétion', `${globalStats.completionRate}%`, globalStats.completionRate >= 80 ? '✓ Excellent' : '○ À améliorer'],
        ['Couverture GPS', `${globalStats.locationRate}%`, globalStats.locationRate >= 70 ? '✓ Bonne' : '○ Limitée'],
        ['Questions analysées', `${fields.length}`, '—'],
        ['Moyenne quotidienne', `${globalStats.avgPerDay} rép./jour`, '—'],
        ['Pic d\'activité', globalStats.peakHour, `Jour: ${globalStats.peakDay}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold' }, 2: { halign: 'center' } }
    });

    // ===== PAGE 4+: ANALYSE PAR QUESTION =====
    doc.addPage();
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('ANALYSE DÉTAILLÉE', pageWidth / 2, 22, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 50;

    fieldAnalytics.forEach((fa, index) => {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      // Question header
      doc.setFillColor(240, 240, 255);
      doc.roundedRect(12, yPos - 5, pageWidth - 24, 12, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text(`Q${index + 1}. ${fa.field.label}`, 14, yPos + 3);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      yPos += 15;

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
          head: [['#', 'Option', 'Fréq.', '%', 'Observation']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14 },
          tableWidth: pageWidth - 28,
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 70 },
            4: { fontStyle: 'italic', textColor: [100, 100, 100] }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;

        // Insight
        const topOption = fa.data[0];
        if (topOption.percentage > 40) {
          doc.setFontSize(8);
          doc.setTextColor(99, 102, 241);
          doc.text(`💡 Insight: "${topOption.name}" représente la majorité (${topOption.percentage}%)`, 16, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 10;
        }
      } else if (fa.type === 'numeric' && fa.stats) {
        autoTable(doc, {
          startY: yPos,
          head: [['Moyenne', 'Minimum', 'Maximum', 'Réponses']],
          body: [[fa.stats.avg.toFixed(2), fa.stats.min, fa.stats.max, fa.stats.count]],
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
          bodyStyles: { fontSize: 9, halign: 'center' },
          margin: { left: 14 },
          tableWidth: 120,
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(9);
        doc.text(`${fa.count || 0} réponses textuelles collectées`, 16, yPos);
        yPos += 10;
      }
    });

    // ===== GEOGRAPHIC ANALYSIS =====
    if (geoAnalysis) {
      doc.addPage();
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('ANALYSE GÉOGRAPHIQUE', pageWidth / 2, 22, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      yPos = 50;
      
      doc.setFontSize(10);
      doc.text(`• ${geoAnalysis.total} réponses géolocalisées sur ${globalStats.total} (${geoAnalysis.rate}%)`, 14, yPos);
      yPos += 8;
      doc.text(`• ${geoAnalysis.zonesCount} zones géographiques distinctes identifiées`, 14, yPos);
      yPos += 15;
      
      if (geoAnalysis.topZones.length > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Top zones par concentration', 14, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 10;
        
        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Coordonnées', 'Réponses', '%']],
          body: geoAnalysis.topZones.map((z, i) => [
            `${i + 1}`,
            z.coords,
            z.count,
            `${z.percentage}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
        });
      }
    }

    // ===== RECOMMENDATIONS =====
    doc.addPage();
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('RECOMMANDATIONS', pageWidth / 2, 22, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // Add insights
    insights.forEach((insight, idx) => {
      const icon = insight.type === 'success' ? '✓' : insight.type === 'warning' ? '!' : '•';
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`${icon} ${insight.text}`, 14, yPos);
      doc.setFont(undefined, 'normal');
      if (insight.detail) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`   ${insight.detail}`, 14, yPos + 5);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
      }
      yPos += 12;
    });

    // AI Recommendations
    if (aiAnalysis?.recommendations && aiAnalysis.recommendations.length > 0) {
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Recommandations stratégiques (IA)', 14, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 10;
      
      aiAnalysis.recommendations.forEach((rec, idx) => {
        doc.setFontSize(9);
        doc.text(`${idx + 1}. ${rec}`, 18, yPos);
        yPos += 8;
      });
    }

    // Custom notes
    if (customNotes) {
      yPos += 15;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Notes personnalisées', 14, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 10;
      
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(customNotes, pageWidth - 28);
      doc.text(noteLines, 14, yPos);
    }

    doc.save(`${reportTitle.replace(/\s+/g, '_')}_Rapport_Premium.pdf`);
    toast.success('Rapport PDF Premium généré avec succès');
  };

  // Export to PowerPoint
  const exportToPowerPoint = async () => {
    const pres = new pptxgen();
    pres.author = authorName || 'YouCollect';
    pres.title = reportTitle;
    pres.subject = reportSubtitle;
    pres.company = companyName;

    // ===== SLIDE 1: COVER =====
    let slide = pres.addSlide();
    slide.background = { color: '6366F1' };
    
    if (companyName) {
      slide.addText(companyName.toUpperCase(), {
        x: 0, y: 0.3, w: '100%', h: 0.5,
        fontSize: 12, color: 'FFFFFF', align: 'center', bold: true
      });
    }
    
    slide.addText(reportTitle.toUpperCase(), {
      x: 0.5, y: 1.5, w: 9, h: 1.5,
      fontSize: 36, color: 'FFFFFF', align: 'center', bold: true
    });
    
    slide.addText(reportSubtitle, {
      x: 0, y: 3, w: '100%', h: 0.5,
      fontSize: 18, color: 'FFFFFF', align: 'center'
    });
    
    slide.addText(`${globalStats.total} répondants | ${globalStats.completionRate}% complétion`, {
      x: 0, y: 4, w: '100%', h: 0.4,
      fontSize: 14, color: 'FFFFFF', align: 'center'
    });
    
    slide.addText(format(new Date(), 'MMMM yyyy', { locale: fr }), {
      x: 0, y: 5, w: '100%', h: 0.4,
      fontSize: 12, color: 'FFFFFF', align: 'center'
    });

    // ===== SLIDE 2: EXECUTIVE SUMMARY =====
    slide = pres.addSlide();
    slide.addText('RÉSUMÉ EXÉCUTIF', {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 24, color: '6366F1', bold: true
    });

    // KPI boxes
    const kpis = [
      { label: 'Répondants', value: `${globalStats.total}`, color: '6366F1' },
      { label: 'Complétion', value: `${globalStats.completionRate}%`, color: '22C55E' },
      { label: 'Géolocalisés', value: `${globalStats.locationRate}%`, color: 'F59E0B' },
      { label: 'Questions', value: `${fields.length}`, color: '8B5CF6' },
    ];

    kpis.forEach((kpi, idx) => {
      const x = 0.5 + idx * 2.3;
      slide.addShape('rect', { x, y: 1.2, w: 2, h: 1.2, fill: { color: kpi.color } });
      slide.addText(kpi.value, { x, y: 1.3, w: 2, h: 0.6, fontSize: 28, color: 'FFFFFF', align: 'center', bold: true });
      slide.addText(kpi.label, { x, y: 1.9, w: 2, h: 0.4, fontSize: 11, color: 'FFFFFF', align: 'center' });
    });

    // Insights
    let yPos = 2.8;
    slide.addText('Points clés', { x: 0.5, y: yPos, w: 9, h: 0.4, fontSize: 14, bold: true, color: '374151' });
    yPos += 0.5;
    
    insights.slice(0, 5).forEach(insight => {
      const icon = insight.type === 'success' ? '✓' : insight.type === 'warning' ? '⚠' : '•';
      slide.addText(`${icon} ${insight.text}`, { x: 0.7, y: yPos, w: 8.5, h: 0.35, fontSize: 11, color: '4B5563' });
      yPos += 0.4;
    });

    // ===== SLIDE 3: TEMPORAL ANALYSIS =====
    slide = pres.addSlide();
    slide.addText('ANALYSE TEMPORELLE', {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 24, color: '6366F1', bold: true
    });

    slide.addText(`Période: ${globalStats.startDate} → ${globalStats.endDate}`, {
      x: 0.5, y: 1, w: 9, h: 0.4, fontSize: 12, color: '6B7280'
    });

    const temporalStats = [
      { label: 'Jours actifs', value: `${globalStats.daysActive}` },
      { label: 'Moyenne/jour', value: `${globalStats.avgPerDay}` },
      { label: 'Pic horaire', value: globalStats.peakHour },
      { label: 'Jour optimal', value: globalStats.peakDay },
    ];

    temporalStats.forEach((stat, idx) => {
      const x = 0.5 + idx * 2.3;
      slide.addShape('rect', { x, y: 1.5, w: 2, h: 0.9, fill: { color: 'F3F4F6' } });
      slide.addText(stat.value, { x, y: 1.55, w: 2, h: 0.5, fontSize: 20, color: '6366F1', align: 'center', bold: true });
      slide.addText(stat.label, { x, y: 2.05, w: 2, h: 0.3, fontSize: 10, color: '6B7280', align: 'center' });
    });

    // ===== SLIDES 4+: QUESTION ANALYSIS =====
    fieldAnalytics.forEach((fa, index) => {
      slide = pres.addSlide();
      
      // Header
      slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.7, fill: { color: '6366F1' } });
      slide.addText(`Question ${index + 1} / ${fieldAnalytics.length}`, {
        x: 0.3, y: 0.2, w: 3, h: 0.4, fontSize: 10, color: 'FFFFFF'
      });
      slide.addText(reportTitle, {
        x: 6, y: 0.2, w: 3.5, h: 0.4, fontSize: 10, color: 'FFFFFF', align: 'right'
      });

      // Question title
      slide.addText(fa.field.label, {
        x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 20, color: '111827', bold: true
      });

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        // Bar chart data
        const chartData = fa.data.slice(0, 8).map((d, i) => ({
          name: d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name,
          labels: [{ name: d.name, value: d.percentage }],
          values: [d.percentage]
        }));

        slide.addChart('bar', chartData.map(d => ({
          name: d.name,
          labels: [d.name],
          values: d.values
        })), {
          x: 0.5, y: 1.8, w: 5.5, h: 3,
          chartColors: [PPTX_COLORS[0]],
          barDir: 'bar',
          showValue: true,
          dataLabelPosition: 'outEnd',
          dataLabelFontSize: 9,
          catAxisLabelFontSize: 9,
        });

        // Stats on the right
        yPos = 2;
        fa.data.slice(0, 6).forEach((d, i) => {
          slide.addText(`${i + 1}. ${d.name}`, { x: 6.2, y: yPos, w: 3, h: 0.3, fontSize: 10, color: '374151' });
          slide.addText(`${d.value} (${d.percentage}%)`, { x: 6.2, y: yPos + 0.25, w: 3, h: 0.25, fontSize: 9, color: '6B7280' });
          yPos += 0.6;
        });

        // Insight box
        const top = fa.data[0];
        if (top.percentage >= 40) {
          slide.addShape('rect', { x: 0.5, y: 5, w: 9, h: 0.5, fill: { color: 'EEF2FF' } });
          slide.addText(`💡 "${top.name}" représente ${top.percentage}% des réponses`, {
            x: 0.7, y: 5.1, w: 8.5, h: 0.4, fontSize: 11, color: '6366F1'
          });
        }
      } else if (fa.type === 'numeric' && fa.stats) {
        const numStats = [
          { label: 'Moyenne', value: fa.stats.avg.toFixed(1), color: '6366F1' },
          { label: 'Minimum', value: `${fa.stats.min}`, color: '22C55E' },
          { label: 'Maximum', value: `${fa.stats.max}`, color: 'F59E0B' },
          { label: 'Réponses', value: `${fa.stats.count}`, color: '8B5CF6' },
        ];

        numStats.forEach((stat, idx) => {
          const x = 0.5 + idx * 2.3;
          slide.addShape('rect', { x, y: 2, w: 2, h: 1.5, fill: { color: stat.color } });
          slide.addText(stat.value, { x, y: 2.2, w: 2, h: 0.8, fontSize: 32, color: 'FFFFFF', align: 'center', bold: true });
          slide.addText(stat.label, { x, y: 3, w: 2, h: 0.4, fontSize: 12, color: 'FFFFFF', align: 'center' });
        });
      } else {
        slide.addText(`${fa.count || 0} réponses textuelles collectées`, {
          x: 0.5, y: 2, w: 9, h: 0.5, fontSize: 14, color: '6B7280'
        });
      }
    });

    // ===== GEOGRAPHIC SLIDE =====
    if (geoAnalysis) {
      slide = pres.addSlide();
      slide.addText('ANALYSE GÉOGRAPHIQUE', {
        x: 0.5, y: 0.3, w: 9, h: 0.6,
        fontSize: 24, color: '6366F1', bold: true
      });

      const geoStats = [
        { label: 'Géolocalisés', value: `${geoAnalysis.total}`, color: '6366F1' },
        { label: 'Taux GPS', value: `${geoAnalysis.rate}%`, color: '22C55E' },
        { label: 'Zones', value: `${geoAnalysis.zonesCount}`, color: 'F59E0B' },
      ];

      geoStats.forEach((stat, idx) => {
        const x = 0.5 + idx * 3;
        slide.addShape('rect', { x, y: 1.2, w: 2.5, h: 1, fill: { color: stat.color } });
        slide.addText(stat.value, { x, y: 1.3, w: 2.5, h: 0.5, fontSize: 24, color: 'FFFFFF', align: 'center', bold: true });
        slide.addText(stat.label, { x, y: 1.8, w: 2.5, h: 0.3, fontSize: 11, color: 'FFFFFF', align: 'center' });
      });

      // Top zones table
      if (geoAnalysis.topZones.length > 0) {
        slide.addText('Top zones par concentration:', { x: 0.5, y: 2.5, w: 9, h: 0.4, fontSize: 12, bold: true, color: '374151' });
        
        const tableData = [
          [{ text: '#', options: { bold: true } }, { text: 'Coordonnées', options: { bold: true } }, { text: 'Réponses', options: { bold: true } }, { text: '%', options: { bold: true } }],
          ...geoAnalysis.topZones.map((z, i) => [
            { text: `${i + 1}` },
            { text: z.coords },
            { text: `${z.count}` },
            { text: `${z.percentage}%` }
          ])
        ];

        slide.addTable(tableData, {
          x: 0.5, y: 3, w: 8,
          colW: [0.5, 3, 2, 1.5],
          fontSize: 10,
          border: { pt: 0.5, color: 'CCCCCC' },
          fill: { color: 'FFFFFF' }
        });
      }
    }

    // ===== RECOMMENDATIONS SLIDE =====
    slide = pres.addSlide();
    slide.addText('RECOMMANDATIONS', {
      x: 0.5, y: 0.3, w: 9, h: 0.6,
      fontSize: 24, color: '6366F1', bold: true
    });

    yPos = 1;
    insights.forEach((insight, idx) => {
      const color = insight.type === 'success' ? '22C55E' : insight.type === 'warning' ? 'F59E0B' : '6366F1';
      slide.addShape('rect', { x: 0.5, y: yPos, w: 0.15, h: 0.4, fill: { color } });
      slide.addText(insight.text, { x: 0.8, y: yPos, w: 8.5, h: 0.4, fontSize: 11, color: '374151' });
      if (insight.detail) {
        slide.addText(insight.detail, { x: 0.8, y: yPos + 0.35, w: 8.5, h: 0.3, fontSize: 9, color: '6B7280' });
        yPos += 0.7;
      } else {
        yPos += 0.5;
      }
    });

    // ===== THANK YOU SLIDE =====
    slide = pres.addSlide();
    slide.background = { color: '6366F1' };
    slide.addText('Merci !', {
      x: 0, y: 2, w: '100%', h: 1,
      fontSize: 48, color: 'FFFFFF', align: 'center', bold: true
    });
    slide.addText('Pour toute question, contactez-nous', {
      x: 0, y: 3.2, w: '100%', h: 0.5,
      fontSize: 14, color: 'FFFFFF', align: 'center'
    });
    if (contactInfo) {
      slide.addText(contactInfo, {
        x: 0, y: 3.7, w: '100%', h: 0.4,
        fontSize: 12, color: 'FFFFFF', align: 'center'
      });
    }
    if (authorName) {
      slide.addText(authorName, {
        x: 0, y: 4.2, w: '100%', h: 0.4,
        fontSize: 12, color: 'FFFFFF', align: 'center'
      });
    }

    await pres.writeFile({ fileName: `${reportTitle.replace(/\s+/g, '_')}_Presentation.pptx` });
    toast.success('Présentation PowerPoint générée avec succès');
  };

  // Export to Word
  const exportToWord = async () => {
    const children: any[] = [];

    // Title page
    children.push(
      new Paragraph({
        text: companyName || 'RAPPORT D\'ANALYSE PREMIUM',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: reportTitle,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: reportSubtitle,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: `${globalStats.total} répondants | ${globalStats.completionRate}% complétion | ${globalStats.locationRate}% géolocalisés`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({ children: [new PageBreak()] })
    );

    // Introduction
    children.push(
      new Paragraph({
        text: 'INTRODUCTION',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: survey.description || `Cette étude analyse les ${globalStats.total} réponses collectées via le formulaire "${survey.title}" sur une période de ${globalStats.daysActive} jours.`,
        spacing: { after: 200 },
      })
    );

    // Methodology
    children.push(
      new Paragraph({
        text: 'MÉTHODOLOGIE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Période d\'enquête: ', bold: true }),
          new TextRun({ text: `${globalStats.startDate} → ${globalStats.endDate} (${globalStats.daysActive} jours)` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Échantillon: ', bold: true }),
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
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Moyenne quotidienne: ', bold: true }),
          new TextRun({ text: `${globalStats.avgPerDay} réponses/jour` }),
        ],
        spacing: { after: 200 },
      })
    );

    // Question Analysis
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        text: 'ANALYSE DÉTAILLÉE PAR QUESTION',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
      })
    );

    fieldAnalytics.forEach((fa, index) => {
      children.push(
        new Paragraph({
          text: `Q${index + 1}. ${fa.field.label}`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        children.push(
          new Paragraph({
            text: `Type: Question à choix | Total: ${fa.total} réponses`,
            spacing: { after: 100 },
          })
        );
        
        fa.data.slice(0, 10).forEach((d, i) => {
          const observation = d.percentage >= 50 ? ' ★ Dominant' : d.percentage >= 25 ? ' ○ Significatif' : '';
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${i + 1}. ${d.name}: ` }),
                new TextRun({ text: `${d.value} réponses (${d.percentage}%)`, bold: true }),
                new TextRun({ text: observation, italics: true }),
              ],
              spacing: { after: 50 },
            })
          );
        });
      } else if (fa.type === 'numeric' && fa.stats) {
        children.push(
          new Paragraph({
            text: `Type: Question numérique`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Moyenne: ${fa.stats.avg.toFixed(2)} | Min: ${fa.stats.min} | Max: ${fa.stats.max} | ${fa.stats.count} réponses`,
            spacing: { after: 100 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            text: `Type: Question ouverte | ${fa.count || 0} réponses textuelles`,
            spacing: { after: 100 },
          })
        );
      }
    });

    // Geographic Analysis
    if (geoAnalysis) {
      children.push(
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          text: 'ANALYSE GÉOGRAPHIQUE',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: `• ${geoAnalysis.total} réponses géolocalisées (${geoAnalysis.rate}% du total)`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `• ${geoAnalysis.zonesCount} zones géographiques distinctes`,
          spacing: { after: 200 },
        })
      );
    }

    // Recommendations
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        text: 'RECOMMANDATIONS',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    insights.forEach(insight => {
      const icon = insight.type === 'success' ? '✓' : insight.type === 'warning' ? '!' : '•';
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${icon} `, bold: true }),
            new TextRun({ text: insight.text }),
          ],
          spacing: { after: 50 },
        })
      );
      if (insight.detail) {
        children.push(
          new Paragraph({
            text: `   ${insight.detail}`,
            spacing: { after: 100 },
          })
        );
      }
    });

    // AI Recommendations
    if (aiAnalysis?.recommendations && aiAnalysis.recommendations.length > 0) {
      children.push(
        new Paragraph({
          text: 'Recommandations stratégiques (IA)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );
      
      aiAnalysis.recommendations.forEach((rec, idx) => {
        children.push(
          new Paragraph({
            text: `${idx + 1}. ${rec}`,
            spacing: { after: 80 },
          })
        );
      });
    }

    // Custom notes
    if (customNotes) {
      children.push(
        new Paragraph({
          text: 'Notes personnalisées',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }),
        new Paragraph({
          text: customNotes,
          spacing: { after: 200 },
        })
      );
    }

    const docx = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(docx);
    saveAs(blob, `${reportTitle.replace(/\s+/g, '_')}_Rapport_Premium.docx`);
    toast.success('Rapport Word généré avec succès');
  };

  // Export to Excel
  const exportToExcel = async () => {
    const sheets: { name: string; rows: any[][] }[] = [];
    
    // Summary sheet
    const summaryData = [
      ['RAPPORT D\'ANALYSE PREMIUM', reportTitle],
      ['Sous-titre', reportSubtitle],
      ['Organisation', companyName || 'N/A'],
      ['Date de génération', format(new Date(), 'dd/MM/yyyy HH:mm')],
      ['', ''],
      ['STATISTIQUES GLOBALES', ''],
      ['Nombre total de répondants', globalStats.total],
      ['Taux de complétion', `${globalStats.completionRate}%`],
      ['Couverture géographique', `${globalStats.locationRate}%`],
      ['Nombre de questions', fields.length],
      ['', ''],
      ['ANALYSE TEMPORELLE', ''],
      ['Période d\'enquête', `${globalStats.startDate} → ${globalStats.endDate}`],
      ['Jours actifs', globalStats.daysActive],
      ['Moyenne par jour', globalStats.avgPerDay],
      ['Pic horaire', globalStats.peakHour],
      ['Jour de pointe', globalStats.peakDay],
    ];
    
    if (geoAnalysis) {
      summaryData.push(
        ['', ''],
        ['ANALYSE GÉOGRAPHIQUE', ''],
        ['Réponses géolocalisées', geoAnalysis.total],
        ['Taux GPS', `${geoAnalysis.rate}%`],
        ['Zones couvertes', geoAnalysis.zonesCount],
      );
    }
    
    sheets.push({ name: 'Résumé', rows: summaryData as any });

    // Per question analysis
    fieldAnalytics.forEach((fa, index) => {
      const sheetName = `Q${index + 1}`.substring(0, 31);
      
      if (fa.type === 'categorical' && fa.data) {
        const sheetData = [
          [`Q${index + 1}: ${fa.field.label}`],
          [''],
          ['Type', 'Question à choix'],
          ['Total réponses', fa.total],
          [''],
          ['DÉTAIL DES RÉPONSES'],
          ['#', 'Option', 'Fréquence', 'Pourcentage', 'Observation'],
          ...fa.data.map((d, i) => [
            i + 1,
            d.name,
            d.value,
            `${d.percentage}%`,
            d.percentage >= 50 ? '★ Dominant' : d.percentage >= 25 ? '○ Significatif' : ''
          ])
        ];
        sheets.push({ name: sheetName, rows: sheetData as any });
      } else if (fa.type === 'numeric' && fa.stats) {
        const sheetData = [
          [`Q${index + 1}: ${fa.field.label}`],
          [''],
          ['Type', 'Question numérique'],
          [''],
          ['STATISTIQUES'],
          ['Moyenne', fa.stats.avg.toFixed(2)],
          ['Minimum', fa.stats.min],
          ['Maximum', fa.stats.max],
          ['Nombre de réponses', fa.stats.count],
        ];
        sheets.push({ name: sheetName, rows: sheetData as any });
      }
    });

    // Raw data sheet
    const headers = ['#', 'Date', 'Heure', 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    const rows = responses.map((response, idx) => {
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) {
          return value.map(v => getOptionLabel(field, v)).join('; ');
        }
        return getOptionLabel(field, value);
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

    sheets.push({ name: 'Données brutes', rows: [headers, ...rows] as any });

    await downloadXlsx(`${reportTitle.replace(/\s+/g, '_')}_Rapport_Premium.xlsx`, sheets as any);
    toast.success('Rapport Excel généré avec succès');
  };

  // ========== RENDER ==========

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
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{globalStats.daysActive} jours</span>
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
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={exportToPowerPoint}>
                <Presentation className="h-4 w-4 mr-2 text-orange-600" />
                PowerPoint (.pptx)
                <Badge variant="secondary" className="ml-auto text-[10px]">Pro</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPremiumPDF}>
                <File className="h-4 w-4 mr-2 text-red-600" />
                PDF Rapport détaillé
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

        {/* AI Executive Summary */}
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
                <Button onClick={runAIAnalysis} variant="outline" size="sm" className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            )}

            {aiAnalysis && !isAnalyzing && (
              <div className="space-y-6">
                {aiAnalysis.summary && (
                  <div className="p-4 bg-card rounded-xl border shadow-sm">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Résumé
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiAnalysis.summary}</p>
                  </div>
                )}

                {aiAnalysis.trends && aiAnalysis.trends.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Tendances clés
                    </h4>
                    <div className="grid gap-2">
                      {aiAnalysis.trends.map((trend, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                          <ArrowRight className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.anomalies && aiAnalysis.anomalies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Points d'attention
                    </h4>
                    <div className="grid gap-2">
                      {aiAnalysis.anomalies.map((anomaly, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-sm">{anomaly}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Recommandations stratégiques
                    </h4>
                    <div className="grid gap-2">
                      {aiAnalysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
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
                              label={({ percentage }) => `${percentage}%`}
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <label className="text-sm font-medium">Zones d'étude (séparées par virgule)</label>
                <Input 
                  placeholder="Ex: Kévé, Tsévié, Atakpamé, Kpalimé"
                  value={studyZones}
                  onChange={(e) => setStudyZones(e.target.value)}
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
                <label className="text-sm font-medium">Contact</label>
                <Input 
                  placeholder="Ex: info@entreprise.tg"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes et recommandations personnalisées</label>
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
