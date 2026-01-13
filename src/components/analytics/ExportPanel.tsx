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
import { toast } from 'sonner';

interface ExportPanelProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
  globalStats: {
    total: number;
    completionRate: number;
    locationRate: number;
  };
}

export const ExportPanel = ({ survey, responses, fields, globalStats }: ExportPanelProps) => {
  const exportToCSV = () => {
    const headers = ['Date', 'Heure', 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    const rows = responses.map(r => [
      format(new Date(r.created_at), 'dd/MM/yyyy'),
      format(new Date(r.created_at), 'HH:mm'),
      r.location?.latitude || '',
      r.location?.longitude || '',
      ...fields.map(f => {
        const v = r.data[f.id];
        return Array.isArray(v) ? v.join('; ') : v?.toString() || '';
      }),
    ]);

    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${survey.title}_export.csv`);
    toast.success('Export CSV généré');
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Date', 'Heure', 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    const rows = responses.map(r => [
      format(new Date(r.created_at), 'dd/MM/yyyy'),
      format(new Date(r.created_at), 'HH:mm'),
      r.location?.latitude || '',
      r.location?.longitude || '',
      ...fields.map(f => {
        const v = r.data[f.id];
        return Array.isArray(v) ? v.join('; ') : v?.toString() || '';
      }),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout]), `${survey.title}_export.xlsx`);
    toast.success('Export Excel généré');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(survey.title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Rapport généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 14, 28);
    doc.text(`${responses.length} réponses | Complétion: ${globalStats.completionRate}%`, 14, 35);

    const headers = ['Date', ...fields.slice(0, 4).map(f => f.label.slice(0, 15))];
    const body = responses.slice(0, 50).map(r => [
      format(new Date(r.created_at), 'dd/MM HH:mm'),
      ...fields.slice(0, 4).map(f => {
        const v = r.data[f.id];
        const s = Array.isArray(v) ? v.join(', ') : v?.toString() || '';
        return s.slice(0, 20);
      }),
    ]);

    autoTable(doc, { startY: 45, head: [headers], body, theme: 'striped', headStyles: { fillColor: [99, 102, 241], fontSize: 8 }, bodyStyles: { fontSize: 7 } });
    doc.save(`${survey.title}_rapport.pdf`);
    toast.success('Export PDF généré');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="text-xs sm:text-sm">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToPDF}>
          <File className="h-4 w-4 mr-2 text-red-600" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
