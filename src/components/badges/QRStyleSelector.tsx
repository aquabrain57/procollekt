import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';

export type QRStyle = 'classic' | 'rounded' | 'dots' | 'elegant' | 'minimal';

// New additional styles
export type QRStyleExtended = QRStyle | 'gradient' | 'diamond' | 'modern' | 'corporate' | 'tech';

interface QRStyleSelectorProps {
  badge: SurveyorBadge;
  selectedStyle: QRStyleExtended;
  onStyleChange: (style: QRStyleExtended) => void;
}

const qrStyles: { id: QRStyleExtended; label: string; description: string }[] = [
  { id: 'classic', label: 'Classique', description: 'Style standard professionnel' },
  { id: 'rounded', label: 'Arrondi', description: 'Coins arrondis modernes' },
  { id: 'dots', label: 'Points', description: 'Style pointillé élégant' },
  { id: 'elegant', label: 'Élégant', description: 'Cadre décoratif premium' },
  { id: 'minimal', label: 'Minimal', description: 'Design épuré' },
  { id: 'gradient', label: 'Dégradé', description: 'Gradient moderne et dynamique' },
  { id: 'diamond', label: 'Diamant', description: 'Forme losange luxueuse' },
  { id: 'modern', label: 'Moderne', description: 'Design contemporain raffiné' },
  { id: 'corporate', label: 'Corporate', description: 'Style professionnel entreprise' },
  { id: 'tech', label: 'Tech', description: 'Futuriste haute technologie' },
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

export function QRCodePreview({ badge, style, size = 160 }: { badge: SurveyorBadge; style: QRStyleExtended; size?: number }) {
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
      case 'gradient':
        return { fg: '#ec4899', bg: '#fdf2f8' };
      case 'diamond':
        return { fg: '#8b5cf6', bg: '#faf5ff' };
      case 'modern':
        return { fg: '#0891b2', bg: '#ecfeff' };
      case 'corporate':
        return { fg: '#0f172a', bg: '#f8fafc' };
      case 'tech':
        return { fg: '#6366f1', bg: '#eef2ff' };
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
      case 'gradient':
        return 'bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-5 rounded-2xl border-2 border-pink-300 shadow-xl';
      case 'diamond':
        return 'bg-white p-5 rounded-lg border-4 border-violet-400 shadow-2xl transform rotate-0';
      case 'modern':
        return 'bg-gradient-to-br from-cyan-50 to-white p-4 rounded-xl border-l-4 border-cyan-500 shadow-lg';
      case 'corporate':
        return 'bg-slate-50 p-4 rounded-sm border-2 border-slate-300 shadow-md';
      case 'tech':
        return 'bg-gradient-to-br from-indigo-100 via-blue-50 to-white p-5 rounded-2xl border border-indigo-300 shadow-xl ring-2 ring-indigo-200';
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
        marginSize={2}
        includeMargin
      />
      {style === 'elegant' && (
        <div className="mt-2 text-center">
          <p className="text-xs font-bold text-violet-600 tracking-[0.25em] uppercase">YOUCOLLECT</p>
        </div>
      )}
      {style === 'gradient' && (
        <div className="mt-2 text-center">
          <p className="text-xs font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent tracking-wide uppercase">YOUCOLLECT</p>
        </div>
      )}
      {style === 'tech' && (
        <div className="mt-2 text-center">
          <p className="text-xs font-bold text-indigo-600 tracking-[0.3em] uppercase font-mono">YOUCOLLECT</p>
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
        onValueChange={(value) => onStyleChange(value as QRStyleExtended)}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto"
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
      
      {/* Large Preview - Optimized for distance scanning */}
      <Card className="mt-4">
        <CardContent className="p-6 flex flex-col items-center">
          <p className="text-sm font-medium mb-3">Aperçu du QR Code (Haute résolution)</p>
          <QRCodePreview badge={badge} style={selectedStyle} size={280} />
          <p className="text-xs text-muted-foreground mt-3 text-center max-w-xs">
            QR code haute résolution optimisé pour le scan à distance. Contient toutes les informations de l'enquêteur.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
