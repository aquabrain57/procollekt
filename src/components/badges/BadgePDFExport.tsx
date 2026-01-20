import { useState } from 'react';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';
import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';

interface BadgePDFExportProps {
  badge: SurveyorBadge;
}

export function BadgePDFExport({ badge }: BadgePDFExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportAsPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85.6, 54], // Credit card size
      });

      // Background
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 85.6, 15, 'F');

      // Header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('BADGE ENQUÊTEUR', 42.8, 8, { align: 'center' });
      doc.setFontSize(6);
      doc.text('YouCollect', 42.8, 12, { align: 'center' });

      // Name
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${badge.first_name} ${badge.last_name}`, 42.8, 24, { align: 'center' });

      // ID
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`ID: ${badge.surveyor_id}`, 42.8, 30, { align: 'center' });

      // Role
      if (badge.role) {
        doc.text(badge.role, 42.8, 35, { align: 'center' });
      }

      // Organization
      if (badge.organization) {
        doc.setFontSize(7);
        doc.text(badge.organization, 42.8, 40, { align: 'center' });
      }

      // Status
      const statusColors: Record<string, [number, number, number]> = {
        active: [34, 197, 94],
        suspended: [239, 68, 68],
        expired: [156, 163, 175],
      };
      const statusColor = statusColors[badge.status] || statusColors.active;
      doc.setFillColor(...statusColor);
      doc.roundedRect(35, 43, 16, 4, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5);
      const statusLabel = badge.status === 'active' ? 'ACTIF' : badge.status === 'suspended' ? 'SUSPENDU' : 'EXPIRÉ';
      doc.text(statusLabel, 43, 46, { align: 'center' });

      // Footer
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(5);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 42.8, 52, { align: 'center' });

      doc.save(`badge_${badge.surveyor_id}.pdf`);
      toast.success('Badge exporté en PDF');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsImage = async () => {
    setIsExporting(true);
    try {
      // Create a canvas for the badge
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const width = 400;
      const height = 250;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Header
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, width, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BADGE ENQUÊTEUR', width / 2, 28);
      ctx.font = '10px Arial';
      ctx.fillText('YouCollect', width / 2, 42);

      // Name
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`${badge.first_name} ${badge.last_name}`, width / 2, 85);

      // ID
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`ID: ${badge.surveyor_id}`, width / 2, 110);

      // Role
      if (badge.role) {
        ctx.font = '12px Arial';
        ctx.fillText(badge.role, width / 2, 130);
      }

      // Organization
      if (badge.organization) {
        ctx.font = '11px Arial';
        ctx.fillText(badge.organization, width / 2, 150);
      }

      // Status badge
      const statusColors: Record<string, string> = {
        active: '#22c55e',
        suspended: '#ef4444',
        expired: '#9ca3af',
      };
      ctx.fillStyle = statusColors[badge.status] || statusColors.active;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 40, 165, 80, 25, 5);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      const statusLabel = badge.status === 'active' ? 'ACTIF' : badge.status === 'suspended' ? 'SUSPENDU' : 'EXPIRÉ';
      ctx.fillText(statusLabel, width / 2, 182);

      // Border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);

      // Download
      const link = document.createElement('a');
      link.download = `badge_${badge.surveyor_id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Badge exporté en image');
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error("Erreur lors de l'export image");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exporter le badge
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportAsPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Exporter en PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsImage}>
          <FileImage className="w-4 h-4 mr-2" />
          Exporter en Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
