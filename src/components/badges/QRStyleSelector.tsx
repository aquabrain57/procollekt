import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';

export type QRStyle = 'classic' | 'rounded' | 'dots' | 'elegant' | 'minimal';

interface QRStyleSelectorProps {
  badge: SurveyorBadge;
  selectedStyle: QRStyle;
  onStyleChange: (style: QRStyle) => void;
}

const qrStyles: { id: QRStyle; label: string; description: string }[] = [
  { id: 'classic', label: 'Classique', description: 'Style standard professionnel' },
  { id: 'rounded', label: 'Arrondi', description: 'Coins arrondis modernes' },
  { id: 'dots', label: 'Points', description: 'Style pointillé élégant' },
  { id: 'elegant', label: 'Élégant', description: 'Cadre décoratif premium' },
  { id: 'minimal', label: 'Minimal', description: 'Design épuré' },
];

// Generate complete badge data for QR code
export const generateBadgeQRData = (badge: SurveyorBadge): string => {
  const data = {
    type: 'YOUCOLLECT_BADGE',
    version: '2.0',
    surveyor: {
      id: badge.surveyor_id,
      firstName: badge.first_name,
      lastName: badge.last_name,
      role: badge.role,
      email: badge.email,
      phone: badge.phone,
    },
    organization: {
      name: badge.organization,
      email: badge.organization_email,
      phone: badge.organization_phone,
      address: badge.organization_address,
    },
    location: {
      city: badge.city,
      country: badge.country,
      zone: badge.covered_zone,
      address: badge.address,
    },
    supervisor: {
      id: badge.supervisor_id,
      name: badge.supervisor_name,
    },
    stats: {
      formsSubmitted: badge.forms_submitted,
    },
    status: badge.status,
    issuedAt: badge.created_at,
    badgeId: badge.id,
  };
  
  return JSON.stringify(data);
};

export function QRCodePreview({ badge, style, size = 120 }: { badge: SurveyorBadge; style: QRStyle; size?: number }) {
  const qrData = generateBadgeQRData(badge);
  
  const getQRColors = () => {
    switch (style) {
      case 'classic':
        return { fg: '#1a1a2e', bg: '#ffffff' };
      case 'rounded':
        return { fg: '#2563eb', bg: '#ffffff' };
      case 'dots':
        return { fg: '#059669', bg: '#f0fdf4' };
      case 'elegant':
        return { fg: '#7c3aed', bg: '#faf5ff' };
      case 'minimal':
        return { fg: '#374151', bg: '#ffffff' };
      default:
        return { fg: '#1a1a2e', bg: '#ffffff' };
    }
  };
  
  const colors = getQRColors();
  
  const getContainerStyle = () => {
    switch (style) {
      case 'classic':
        return 'bg-white p-4 rounded-lg border-2 border-primary/30 shadow-md';
      case 'rounded':
        return 'bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-lg';
      case 'dots':
        return 'bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border border-emerald-200 shadow-md';
      case 'elegant':
        return 'bg-gradient-to-br from-violet-50 to-white p-5 rounded-xl border-2 border-violet-200 shadow-xl ring-4 ring-violet-100/50';
      case 'minimal':
        return 'bg-white p-3 rounded-md border border-gray-100';
      default:
        return 'bg-white p-4 rounded-lg border border-gray-200';
    }
  };
  
  return (
    <div className={getContainerStyle()}>
      <QRCodeSVG 
        value={qrData}
        size={size}
        level="H"
        bgColor={colors.bg}
        fgColor={colors.fg}
        marginSize={1}
      />
      {style === 'elegant' && (
        <div className="mt-2 text-center">
          <p className="text-xs font-bold text-violet-600 tracking-[0.25em] uppercase">YOUCOLLECT</p>
        </div>
      )}
    </div>
  );
}

export function QRStyleSelector({ badge, selectedStyle, onStyleChange }: QRStyleSelectorProps) {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Style du QR Code</Label>
      
      <RadioGroup 
        value={selectedStyle} 
        onValueChange={(value) => onStyleChange(value as QRStyle)}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {qrStyles.map((style) => (
          <div key={style.id}>
            <RadioGroupItem 
              value={style.id} 
              id={`qr-${style.id}`} 
              className="peer sr-only" 
            />
            <Label
              htmlFor={`qr-${style.id}`}
              className="flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all
                peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="mb-2 scale-75">
                <QRCodePreview badge={badge} style={style.id} size={60} />
              </div>
              <span className="text-xs font-medium text-center">{style.label}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
      
      {/* Large Preview */}
      <Card className="mt-4">
        <CardContent className="p-4 flex flex-col items-center">
          <p className="text-sm font-medium mb-3">Aperçu du QR Code</p>
          <QRCodePreview badge={badge} style={selectedStyle} size={150} />
          <p className="text-xs text-muted-foreground mt-3 text-center max-w-xs">
            Ce QR code contient toutes les informations de l'enquêteur : identité, organisation, superviseur et statistiques.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
