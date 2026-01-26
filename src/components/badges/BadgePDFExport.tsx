import { useState } from 'react';
import { Download, FileImage, FileText, Loader2, QrCode, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface BadgePDFExportProps {
  badge: SurveyorBadge;
}

const getRoleLabel = (role: string) => {
  const roles: Record<string, string> = {
    surveyor: 'Enquêteur',
    supervisor: 'Superviseur',
    team_lead: "Chef d'équipe",
    coordinator: 'Coordinateur',
    data_collector: 'Collecteur',
    field_agent: 'Agent terrain',
  };
  return roles[role] || role;
};

// Helper to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export function BadgePDFExport({ badge }: BadgePDFExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportAsPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85.6, 140], // Extended badge size for photo
      });

      // Background gradient effect
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 85.6, 22, 'F');

      // Header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('BADGE ENQUÊTEUR', 42.8, 8, { align: 'center' });
      doc.setFontSize(7);
      doc.text('YouCollect', 42.8, 14, { align: 'center' });
      doc.setFontSize(6);
      doc.text(badge.organization || '', 42.8, 19, { align: 'center' });

      let yPos = 28;

      // Photo section - circular frame effect
      if (badge.photo_url) {
        try {
          const photoBase64 = await loadImageAsBase64(badge.photo_url);
          if (photoBase64) {
            // Draw circular border
            doc.setDrawColor(59, 130, 246);
            doc.setLineWidth(1);
            doc.circle(42.8, yPos + 15, 16, 'S');
            
            // Add photo (approximation of circle via clipping rectangle)
            doc.addImage(photoBase64, 'JPEG', 27.8, yPos, 30, 30);
            yPos += 35;
          }
        } catch (e) {
          console.error('Error loading photo:', e);
          yPos += 5;
        }
      } else {
        // Placeholder for no photo
        doc.setFillColor(240, 240, 240);
        doc.circle(42.8, yPos + 15, 15, 'F');
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text('Photo', 42.8, yPos + 17, { align: 'center' });
        yPos += 35;
      }

      // Name - Bold and prominent
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${badge.first_name} ${badge.last_name}`, 42.8, yPos, { align: 'center' });
      yPos += 6;

      // ID and Role
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(59, 130, 246);
      doc.text(`ID: ${badge.surveyor_id}`, 42.8, yPos, { align: 'center' });
      yPos += 5;
      
      if (badge.role) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(getRoleLabel(badge.role), 42.8, yPos, { align: 'center' });
        yPos += 5;
      }

      // Contact Info
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      if (badge.email) {
        doc.text(badge.email, 42.8, yPos, { align: 'center' });
        yPos += 4;
      }
      if (badge.phone) {
        doc.text(badge.phone, 42.8, yPos, { align: 'center' });
        yPos += 4;
      }

      // Location
      if (badge.covered_zone || badge.city) {
        yPos += 1;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        const location = [badge.covered_zone, badge.city, badge.country].filter(Boolean).join(', ');
        doc.text(location, 42.8, yPos, { align: 'center' });
        yPos += 4;
      }

      // Supervisor
      if (badge.supervisor_name) {
        doc.setFontSize(6);
        doc.text(`Superviseur: ${badge.supervisor_name}`, 42.8, yPos, { align: 'center' });
        yPos += 4;
      }

      // Organization Contact Box
      if (badge.organization_email || badge.organization_phone) {
        yPos += 2;
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(5, yPos - 2, 75.6, 12, 2, 2, 'F');
        doc.setFontSize(5);
        doc.setTextColor(100, 100, 100);
        doc.text('Contact Organisation:', 42.8, yPos + 1, { align: 'center' });
        yPos += 4;
        if (badge.organization_email) {
          doc.text(badge.organization_email, 42.8, yPos, { align: 'center' });
          yPos += 3;
        }
        if (badge.organization_phone) {
          doc.text(badge.organization_phone, 42.8, yPos, { align: 'center' });
          yPos += 3;
        }
      }

      // Status badge
      yPos = Math.max(yPos + 3, 118);
      const statusColors: Record<string, [number, number, number]> = {
        active: [34, 197, 94],
        suspended: [239, 68, 68],
        expired: [156, 163, 175],
      };
      const statusColor = statusColors[badge.status] || statusColors.active;
      doc.setFillColor(...statusColor);
      doc.roundedRect(30, yPos, 25.6, 6, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      const statusLabel = badge.status === 'active' ? 'ACTIF' : badge.status === 'suspended' ? 'SUSPENDU' : 'EXPIRÉ';
      doc.text(statusLabel, 42.8, yPos + 4.2, { align: 'center' });

      // Footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 42.8, 136, { align: 'center' });

      doc.save(`badge_${badge.surveyor_id}.pdf`);
      toast.success('Badge exporté en PDF avec photo');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsImage = async (format: 'png' | 'jpg' = 'png') => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const width = 450;
      const height = 650;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Header
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, width, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BADGE ENQUÊTEUR', width / 2, 30);
      ctx.font = '13px Arial';
      ctx.fillText('YouCollect', width / 2, 48);
      if (badge.organization) {
        ctx.font = '11px Arial';
        ctx.fillText(badge.organization, width / 2, 62);
      }

      let yPos = 90;

      // Photo - Draw circular placeholder or load actual photo
      if (badge.photo_url) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              // Draw circular clip for photo
              ctx.save();
              ctx.beginPath();
              ctx.arc(width / 2, yPos + 55, 55, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(img, width / 2 - 55, yPos, 110, 110);
              ctx.restore();
              
              // Draw border around photo
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(width / 2, yPos + 55, 56, 0, Math.PI * 2);
              ctx.stroke();
              
              resolve();
            };
            img.onerror = reject;
            img.src = badge.photo_url!;
          });
          yPos += 125;
        } catch {
          // Draw placeholder circle if photo fails
          ctx.fillStyle = '#f0f0f0';
          ctx.beginPath();
          ctx.arc(width / 2, yPos + 55, 55, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#999999';
          ctx.font = '14px Arial';
          ctx.fillText('Photo', width / 2, yPos + 60);
          yPos += 125;
        }
      } else {
        // Placeholder for no photo
        ctx.fillStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.arc(width / 2, yPos + 55, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#999999';
        ctx.font = '14px Arial';
        ctx.fillText('Photo', width / 2, yPos + 60);
        yPos += 125;
      }

      // Name
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${badge.first_name} ${badge.last_name}`, width / 2, yPos);
      yPos += 28;

      // ID
      ctx.font = '15px Arial';
      ctx.fillStyle = '#3b82f6';
      ctx.fillText(`ID: ${badge.surveyor_id}`, width / 2, yPos);
      yPos += 22;

      // Role
      if (badge.role) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(getRoleLabel(badge.role), width / 2, yPos);
        yPos += 20;
      }

      // Contact
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666666';
      if (badge.email) {
        ctx.fillText(badge.email, width / 2, yPos);
        yPos += 18;
      }
      if (badge.phone) {
        ctx.fillText(badge.phone, width / 2, yPos);
        yPos += 18;
      }

      // Location
      const location = [badge.covered_zone, badge.city, badge.country].filter(Boolean).join(', ');
      if (location) {
        yPos += 5;
        ctx.fillText(location, width / 2, yPos);
        yPos += 18;
      }

      // Supervisor
      if (badge.supervisor_name) {
        ctx.fillText(`Superviseur: ${badge.supervisor_name}`, width / 2, yPos);
        yPos += 22;
      }

      // Organization contact box
      if (badge.organization_email || badge.organization_phone) {
        yPos += 5;
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(25, yPos, width - 50, 50);
        ctx.fillStyle = '#666666';
        ctx.font = '10px Arial';
        ctx.fillText('Contact Organisation:', width / 2, yPos + 15);
        if (badge.organization_email) {
          ctx.fillText(badge.organization_email, width / 2, yPos + 28);
        }
        if (badge.organization_phone) {
          ctx.fillText(badge.organization_phone, width / 2, yPos + 41);
        }
        yPos += 60;
      }

      // Status badge
      yPos = Math.max(yPos + 10, 560);
      const statusColors: Record<string, string> = {
        active: '#22c55e',
        suspended: '#ef4444',
        expired: '#9ca3af',
      };
      ctx.fillStyle = statusColors[badge.status] || statusColors.active;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 55, yPos, 110, 35, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      const statusLabel = badge.status === 'active' ? 'ACTIF' : badge.status === 'suspended' ? 'SUSPENDU' : 'EXPIRÉ';
      ctx.fillText(statusLabel, width / 2, yPos + 23);

      // Border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, width, height);

      // Download
      const link = document.createElement('a');
      link.download = `badge_${badge.surveyor_id}.${format}`;
      link.href = canvas.toDataURL(`image/${format}`);
      link.click();

      toast.success(`Badge exporté en ${format.toUpperCase()} avec photo`);
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error("Erreur lors de l'export image");
    } finally {
      setIsExporting(false);
    }
  };

  const exportQRCode = async () => {
    setIsExporting(true);
    try {
      const qrElement = document.getElementById(`qr-${badge.id}`);
      if (!qrElement) {
        // Create QR manually
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        canvas.width = 300;
        canvas.height = 300;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 300);

        // Add text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`QR Code - ${badge.surveyor_id}`, 150, 280);

        const link = document.createElement('a');
        link.download = `qrcode_${badge.surveyor_id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        // Use html2canvas for the actual QR
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(qrElement);
        const link = document.createElement('a');
        link.download = `qrcode_${badge.surveyor_id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }

      toast.success('QR Code exporté');
    } catch (error) {
      console.error('Error exporting QR:', error);
      toast.error("Erreur lors de l'export QR");
    } finally {
      setIsExporting(false);
    }
  };

  const exportBarcode = async () => {
    setIsExporting(true);
    try {
      const barcodeElement = document.getElementById(`barcode-${badge.id}`);
      if (barcodeElement) {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(barcodeElement);
        const link = document.createElement('a');
        link.download = `barcode_${badge.surveyor_id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Code-barres exporté');
      }
    } catch (error) {
      console.error('Error exporting barcode:', error);
      toast.error("Erreur lors de l'export code-barres");
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
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem onClick={exportAsPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Badge PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsImage('png')}>
          <FileImage className="w-4 h-4 mr-2" />
          Badge PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsImage('jpg')}>
          <FileImage className="w-4 h-4 mr-2" />
          Badge JPG
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportQRCode}>
          <QrCode className="w-4 h-4 mr-2" />
          QR Code seul
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportBarcode}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Code-barres seul
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
