import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, MapPin, Building2, Briefcase, User } from 'lucide-react';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';

interface BadgeCardProps {
  badge: SurveyorBadge;
  compact?: boolean;
}

export function BadgeCard({ badge, compact = false }: BadgeCardProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && badge.barcode_data) {
      try {
        JsBarcode(barcodeRef.current, badge.barcode_data, {
          format: 'CODE128',
          width: compact ? 1 : 1.5,
          height: compact ? 30 : 50,
          displayValue: true,
          fontSize: compact ? 10 : 12,
          margin: 5,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [badge.barcode_data, compact]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'suspended':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'expired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspended':
        return 'Suspendu';
      case 'expired':
        return 'Expiré';
      default:
        return status;
    }
  };

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={badge.photo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {badge.first_name[0]}{badge.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">
                  {badge.first_name} {badge.last_name}
                </p>
                <Badge variant="secondary" className={getStatusColor(badge.status)}>
                  {getStatusLabel(badge.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">ID: {badge.surveyor_id}</p>
            </div>
            {badge.qr_code_data && (
              <QRCodeSVG value={badge.qr_code_data} size={50} />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-primary/5">
      <div className="bg-primary text-primary-foreground p-4 text-center">
        <h3 className="text-lg font-bold">BADGE ENQUÊTEUR</h3>
        <p className="text-sm opacity-90">YouCollect</p>
      </div>
      
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Photo */}
          <Avatar className="h-24 w-24 border-4 border-primary/20">
            <AvatarImage src={badge.photo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {badge.first_name[0]}{badge.last_name[0]}
            </AvatarFallback>
          </Avatar>

          {/* Name and ID */}
          <div className="text-center">
            <h4 className="text-xl font-bold">
              {badge.first_name} {badge.last_name}
            </h4>
            <Badge variant="secondary" className={`mt-1 ${getStatusColor(badge.status)}`}>
              {getStatusLabel(badge.status)}
            </Badge>
          </div>

          {/* Details */}
          <div className="w-full space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>ID: <strong className="text-foreground">{badge.surveyor_id}</strong></span>
            </div>
            
            {badge.role && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>{badge.role}</span>
              </div>
            )}
            
            {badge.organization && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{badge.organization}</span>
              </div>
            )}
            
            {badge.covered_zone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{badge.covered_zone}</span>
              </div>
            )}
            
            {badge.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{badge.phone}</span>
              </div>
            )}
          </div>

          {/* QR Code and Barcode */}
          <div className="flex flex-col items-center gap-4 pt-4 border-t w-full">
            {badge.qr_code_data && (
              <div className="bg-white p-2 rounded-lg">
                <QRCodeSVG value={badge.qr_code_data} size={100} />
              </div>
            )}
            
            {badge.barcode_data && (
              <div className="bg-white p-1 rounded">
                <svg ref={barcodeRef} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
