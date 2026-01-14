import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, FileSpreadsheet, FileText, File, Presentation } from 'lucide-react';
import { DbSurvey, DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, PageBreak } from 'docx';
import { toast } from 'sonner';

interface FieldOption {
  value: string;
  label: string;
}

interface ExportPanelProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
  globalStats: {
    total: number;
    completionRate: number;
    locationRate: number;
    avgPerDay?: number;
    peakHour?: number | string;
    daysActive?: number;
  };
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Helper to get option label from field options
const getOptionLabel = (field: DbSurveyField, value: any): string => {
  if (!field.options || !Array.isArray(field.options)) return String(value);
  
  const options = field.options as FieldOption[];
  const found = options.find(opt => {
    if (typeof opt === 'string') return opt === value;
    return opt.value === value || opt.label === value;
  });
  
  if (found) {
    return typeof found === 'string' ? found : (found.label || found.value || String(value));
  }
  return String(value);
};

// Compute field analytics for exports
const computeFieldAnalytics = (field: DbSurveyField, responses: DbSurveyResponse[]) => {
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
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
    
    return { type: 'categorical' as const, data, total };
  }
  
  if (field.field_type === 'number' || field.field_type === 'rating') {
    const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
    const avg = numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
    const min = numbers.length > 0 ? Math.min(...numbers) : 0;
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return { type: 'numeric' as const, stats: { avg, min, max, count: numbers.length } };
  }
  
  return { type: 'text' as const, count: values.length };
};

// Compute geographic distribution
const computeGeoDistribution = (responses: DbSurveyResponse[]) => {
  const geoResponses = responses.filter(r => r.location && r.location.latitude && r.location.longitude);
  
  // Group by approximate zones (rounded coordinates)
  const zones: Record<string, number> = {};
  geoResponses.forEach(r => {
    const lat = Math.round(r.location!.latitude * 10) / 10;
    const lng = Math.round(r.location!.longitude * 10) / 10;
    const key = `${lat},${lng}`;
    zones[key] = (zones[key] || 0) + 1;
  });
  
  return {
    total: geoResponses.length,
    rate: responses.length > 0 ? Math.round((geoResponses.length / responses.length) * 100) : 0,
    zonesCount: Object.keys(zones).length,
    topZones: Object.entries(zones)
      .map(([coords, count]) => ({ coords, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
};

// Compute temporal distribution
const computeTemporalDistribution = (responses: DbSurveyResponse[]) => {
  const byDay: Record<string, number> = {};
  const byHour: Record<number, number> = {};
  const byWeekday: Record<string, number> = {};
  
  const weekdays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  
  responses.forEach(r => {
    const date = new Date(r.created_at);
    const dayKey = format(date, 'yyyy-MM-dd');
    const hour = date.getHours();
    const weekday = weekdays[date.getDay()];
    
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;
    byHour[hour] = (byHour[hour] || 0) + 1;
    byWeekday[weekday] = (byWeekday[weekday] || 0) + 1;
  });
  
  const dates = Object.keys(byDay).sort();
  const peakHour = Object.entries(byHour).sort(([,a], [,b]) => b - a)[0];
  const peakDay = Object.entries(byWeekday).sort(([,a], [,b]) => b - a)[0];
  
  return {
    startDate: dates[0] || 'N/A',
    endDate: dates[dates.length - 1] || 'N/A',
    daysActive: dates.length,
    avgPerDay: dates.length > 0 ? Math.round(responses.length / dates.length * 10) / 10 : 0,
    peakHour: peakHour ? `${peakHour[0]}h (${peakHour[1]} rép.)` : 'N/A',
    peakDay: peakDay ? `${peakDay[0]} (${peakDay[1]} rép.)` : 'N/A',
    byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

export const ExportPanel = ({ survey, responses, fields, globalStats }: ExportPanelProps) => {
  const fieldAnalytics = fields.map(f => ({ field: f, ...computeFieldAnalytics(f, responses) }));
  const geoDistribution = computeGeoDistribution(responses);
  const temporalDistribution = computeTemporalDistribution(responses);

  // Get display value for a response field
  const getDisplayValue = (field: DbSurveyField, value: any): string => {
    if (value === undefined || value === null || value === '') return '';
    if (Array.isArray(value)) {
      return value.map(v => getOptionLabel(field, v)).join('; ');
    }
    return getOptionLabel(field, value);
  };

  const exportToCSV = () => {
    const headers = ['#', 'Date', 'Heure', 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    const rows = responses.map((r, idx) => [
      idx + 1,
      format(new Date(r.created_at), 'dd/MM/yyyy'),
      format(new Date(r.created_at), 'HH:mm'),
      r.location?.latitude || '',
      r.location?.longitude || '',
      ...fields.map(f => getDisplayValue(f, r.data[f.id])),
    ]);

    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${survey.title}_export.csv`);
    toast.success('Export CSV généré');
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Summary sheet
    const summaryData = [
      ['RAPPORT D\'ANALYSE DÉTAILLÉ'],
      [''],
      ['Enquête', survey.title],
      ['Description', survey.description || 'N/A'],
      ['Date de génération', format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })],
      [''],
      ['STATISTIQUES GLOBALES'],
      ['Nombre total de réponses', globalStats.total],
      ['Taux de complétion', `${globalStats.completionRate}%`],
      ['Couverture géographique', `${globalStats.locationRate}%`],
      ['Nombre de questions', fields.length],
      [''],
      ['ANALYSE GÉOGRAPHIQUE'],
      ['Réponses géolocalisées', geoDistribution.total],
      ['Taux GPS', `${geoDistribution.rate}%`],
      ['Zones couvertes', geoDistribution.zonesCount],
      [''],
      ['ANALYSE TEMPORELLE'],
      ['Période', `${temporalDistribution.startDate} → ${temporalDistribution.endDate}`],
      ['Jours actifs', temporalDistribution.daysActive],
      ['Moyenne par jour', temporalDistribution.avgPerDay],
      ['Heure de pointe', temporalDistribution.peakHour],
      ['Jour de pointe', temporalDistribution.peakDay],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé exécutif');

    // 2. Per-question analysis sheets
    fieldAnalytics.forEach((fa, index) => {
      const sheetName = `Q${index + 1}`.substring(0, 31);
      
      if (fa.type === 'categorical' && fa.data) {
        const sheetData = [
          [`Question ${index + 1}: ${fa.field.label}`],
          [''],
          ['Type de question', 'Question à choix'],
          ['Total des réponses', fa.total],
          [''],
          ['DÉTAIL DES RÉPONSES'],
          ['Option', 'Fréquence', 'Pourcentage', 'Observation'],
          ...fa.data.map((d, i) => [
            d.name,
            d.value,
            `${d.percentage}%`,
            d.percentage >= 50 ? '★ Dominant' : d.percentage >= 25 ? '○ Significatif' : ''
          ]),
          [''],
          ['INSIGHT'],
          [fa.data.length > 0 && fa.data[0].percentage > 40 
            ? `"${fa.data[0].name}" domine avec ${fa.data[0].percentage}% des réponses`
            : 'Répartition équilibrée entre les options'],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else if (fa.type === 'numeric' && fa.stats) {
        const sheetData = [
          [`Question ${index + 1}: ${fa.field.label}`],
          [''],
          ['Type de question', 'Question numérique'],
          [''],
          ['STATISTIQUES'],
          ['Moyenne', fa.stats.avg.toFixed(2)],
          ['Minimum', fa.stats.min],
          ['Maximum', fa.stats.max],
          ['Nombre de réponses', fa.stats.count],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else {
        const sheetData = [
          [`Question ${index + 1}: ${fa.field.label}`],
          [''],
          ['Type de question', 'Question ouverte'],
          ['Nombre de réponses', fa.count || 0],
        ];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    // 3. Geographic sheet
    const geoData = [
      ['ANALYSE GÉOGRAPHIQUE DÉTAILLÉE'],
      [''],
      ['Statistiques'],
      ['Réponses géolocalisées', geoDistribution.total],
      ['Taux de couverture GPS', `${geoDistribution.rate}%`],
      ['Nombre de zones', geoDistribution.zonesCount],
      [''],
      ['Top 5 des zones (par coordonnées)'],
      ['Coordonnées', 'Nombre de réponses'],
      ...geoDistribution.topZones.map(z => [z.coords, z.count]),
    ];
    const wsGeo = XLSX.utils.aoa_to_sheet(geoData);
    XLSX.utils.book_append_sheet(wb, wsGeo, 'Géographie');

    // 4. Temporal sheet
    const tempData = [
      ['ANALYSE TEMPORELLE DÉTAILLÉE'],
      [''],
      ['Statistiques'],
      ['Période d\'enquête', `${temporalDistribution.startDate} → ${temporalDistribution.endDate}`],
      ['Jours actifs', temporalDistribution.daysActive],
      ['Moyenne par jour', temporalDistribution.avgPerDay],
      ['Heure de pointe', temporalDistribution.peakHour],
      ['Jour de pointe', temporalDistribution.peakDay],
      [''],
      ['Évolution quotidienne'],
      ['Date', 'Nombre de réponses'],
      ...temporalDistribution.byDay.map(d => [d.date, d.count]),
    ];
    const wsTemp = XLSX.utils.aoa_to_sheet(tempData);
    XLSX.utils.book_append_sheet(wb, wsTemp, 'Temporel');

    // 5. Raw data sheet with proper labels
    const headers = ['#', 'Date', 'Heure', 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    const rows = responses.map((r, idx) => [
      idx + 1,
      format(new Date(r.created_at), 'dd/MM/yyyy'),
      format(new Date(r.created_at), 'HH:mm:ss'),
      r.location?.latitude || '',
      r.location?.longitude || '',
      ...fields.map(f => getDisplayValue(f, r.data[f.id])),
    ]);
    const wsData = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    wsData['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, ...fields.map(() => ({ wch: 25 }))];
    XLSX.utils.book_append_sheet(wb, wsData, 'Données brutes');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout]), `${survey.title}_analyse_complete.xlsx`);
    toast.success('Export Excel détaillé généré');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Cover page
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('RAPPORT D\'ANALYSE', pageWidth / 2, 30, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(survey.title, pageWidth / 2, 70, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, pageWidth / 2, 85, { align: 'center' });

    // Global stats
    let yPos = 100;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RÉSUMÉ EXÉCUTIF', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Indicateur', 'Valeur', 'Évaluation']],
      body: [
        ['Échantillon total', `${globalStats.total} réponses`, globalStats.total >= 100 ? '✓ Représentatif' : '○ À compléter'],
        ['Taux de complétion', `${globalStats.completionRate}%`, globalStats.completionRate >= 80 ? '✓ Excellent' : '○ À améliorer'],
        ['Couverture GPS', `${globalStats.locationRate}%`, globalStats.locationRate >= 70 ? '✓ Bonne' : '○ Limitée'],
        ['Questions analysées', `${fields.length}`, '—'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Geographic section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('ANALYSE GÉOGRAPHIQUE', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 8;

    doc.setFontSize(9);
    doc.text(`• ${geoDistribution.total} réponses géolocalisées (${geoDistribution.rate}%)`, 18, yPos);
    yPos += 6;
    doc.text(`• ${geoDistribution.zonesCount} zones géographiques couvertes`, 18, yPos);
    yPos += 12;

    // Temporal section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('ANALYSE TEMPORELLE', 14, yPos);
    doc.setFont(undefined, 'normal');
    yPos += 8;

    doc.setFontSize(9);
    doc.text(`• Période: ${temporalDistribution.startDate} → ${temporalDistribution.endDate}`, 18, yPos);
    yPos += 6;
    doc.text(`• ${temporalDistribution.daysActive} jours actifs, ${temporalDistribution.avgPerDay} rép/jour en moyenne`, 18, yPos);
    yPos += 6;
    doc.text(`• Pic d'activité: ${temporalDistribution.peakHour}`, 18, yPos);
    yPos += 15;

    // Question analysis
    doc.addPage();
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('ANALYSE DÉTAILLÉE PAR QUESTION', pageWidth / 2, 17, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    yPos = 40;

    fieldAnalytics.forEach((fa, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Q${index + 1}. ${fa.field.label}`, 14, yPos);
      doc.setFont(undefined, 'normal');
      yPos += 7;

      if (fa.type === 'categorical' && fa.data && fa.data.length > 0) {
        const tableData = fa.data.slice(0, 8).map((d, i) => [
          `${i + 1}`,
          d.name.substring(0, 35),
          `${d.value}`,
          `${d.percentage}%`,
          d.percentage >= 50 ? '★ Dominant' : d.percentage >= 25 ? '○ Significatif' : ''
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Option (texte réel)', 'Fréq.', '%', 'Observation']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 70 },
            4: { fontStyle: 'italic', textColor: [100, 100, 100] }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else if (fa.type === 'numeric' && fa.stats) {
        autoTable(doc, {
          startY: yPos,
          head: [['Moyenne', 'Min', 'Max', 'Répondants']],
          body: [[fa.stats.avg.toFixed(2), fa.stats.min, fa.stats.max, fa.stats.count]],
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
          bodyStyles: { fontSize: 9, halign: 'center' },
          tableWidth: 100,
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(9);
        doc.text(`${fa.count || 0} réponses textuelles collectées`, 18, yPos);
        yPos += 10;
      }
    });

    doc.save(`${survey.title}_rapport_analyse.pdf`);
    toast.success('Rapport PDF détaillé généré');
  };

  const exportToWord = async () => {
    const children: any[] = [];

    // Title
    children.push(
      new Paragraph({
        text: 'RAPPORT D\'ANALYSE DÉTAILLÉ',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: survey.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: `Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Executive Summary
    children.push(
      new Paragraph({
        text: 'RÉSUMÉ EXÉCUTIF',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Échantillon total: ', bold: true }),
          new TextRun({ text: `${globalStats.total} réponses` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Taux de complétion: ', bold: true }),
          new TextRun({ text: `${globalStats.completionRate}%` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Couverture géographique: ', bold: true }),
          new TextRun({ text: `${globalStats.locationRate}%` }),
        ],
        spacing: { after: 200 },
      })
    );

    // Geographic Analysis
    children.push(
      new Paragraph({
        text: 'ANALYSE GÉOGRAPHIQUE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• ${geoDistribution.total} réponses géolocalisées (${geoDistribution.rate}% du total)` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• ${geoDistribution.zonesCount} zones géographiques couvertes` }),
        ],
        spacing: { after: 200 },
      })
    );

    // Temporal Analysis
    children.push(
      new Paragraph({
        text: 'ANALYSE TEMPORELLE',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• Période d'enquête: ${temporalDistribution.startDate} → ${temporalDistribution.endDate}` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• ${temporalDistribution.daysActive} jours actifs de collecte` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• Moyenne: ${temporalDistribution.avgPerDay} réponses par jour` }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `• Pic d'activité: ${temporalDistribution.peakHour}` }),
        ],
        spacing: { after: 200 },
      })
    );

    // Question Analysis
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
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
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${i + 1}. ${d.name}: ` }),
                new TextRun({ text: `${d.value} réponses (${d.percentage}%)`, bold: true }),
                new TextRun({ text: d.percentage >= 50 ? ' ★ Dominant' : '', italics: true }),
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

    const docx = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(docx);
    saveAs(blob, `${survey.title}_rapport_analyse.docx`);
    toast.success('Rapport Word détaillé généré');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="text-xs sm:text-sm">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2" />
          CSV simple (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Excel détaillé (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToPDF}>
          <File className="h-4 w-4 mr-2 text-red-600" />
          PDF rapport complet (.pdf)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToWord}>
          <Presentation className="h-4 w-4 mr-2 text-blue-600" />
          Word rapport (.docx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
