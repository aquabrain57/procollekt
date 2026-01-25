import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, MapPin, Building2, Briefcase, User, Mail, Users, Globe } from 'lucide-react';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';
import { QRCodePreview, QRStyleExtended, generateBadgeQRData } from './QRStyleSelector';

interface BadgeCardProps {
  badge: SurveyorBadge;
  compact?: boolean;
  qrStyle?: QRStyleExtended;
}

export function BadgeCard({ badge, compact = false, qrStyle = 'classic' }: BadgeCardProps) {
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

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      surveyor: 'Enquêteur',
      supervisor: 'Superviseur',
      team_lead: "Chef d'équipe",
      coordinator: 'Coordinateur',
      data_collector: 'Collecteur de données',
      field_agent: 'Agent de terrain',
    };
    return roles[role] || role;
  };

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
              <AvatarImage src={badge.photo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {badge.first_name[0]}{badge.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold truncate text-sm sm:text-base">
                  {badge.first_name} {badge.last_name}
                </p>
                <Badge variant="secondary" className={`${getStatusColor(badge.status)} text-[10px] sm:text-xs`}>
                  {getStatusLabel(badge.status)}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">ID: {badge.surveyor_id}</p>
            </div>
            {badge.qr_code_data && (
              <div className="flex-shrink-0 hidden sm:block">
                <QRCodePreview badge={badge} style="minimal" size={45} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-primary/5 w-full max-w-sm sm:max-w-md mx-auto">
      <div className="bg-primary text-primary-foreground p-3 sm:p-4 text-center">
        <h3 className="text-base sm:text-lg font-bold">BADGE ENQUÊTEUR</h3>
        <p className="text-xs sm:text-sm opacity-90">YouCollect</p>
      </div>
      
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          {/* Photo */}
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-primary/20">
            <AvatarImage src={badge.photo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl sm:text-2xl">
              {badge.first_name[0]}{badge.last_name[0]}
            </AvatarFallback>
          </Avatar>

          {/* Name and Status */}
          <div className="text-center">
            <h4 className="text-lg sm:text-xl font-bold truncate max-w-full px-2">
              {badge.first_name} {badge.last_name}
            </h4>
            <Badge variant="secondary" className={`mt-1 ${getStatusColor(badge.status)}`}>
              {getStatusLabel(badge.status)}
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="w-full space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">ID: <strong className="text-foreground">{badge.surveyor_id}</strong></span>
            </div>
            
            {badge.role && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{getRoleLabel(badge.role)}</span>
              </div>
            )}

            {badge.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate text-xs">{badge.email}</span>
              </div>
            )}
            
            {badge.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{badge.phone}</span>
              </div>
            )}
            
            {badge.organization && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{badge.organization}</span>
              </div>
            )}
            
            {(badge.city || badge.country) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{[badge.city, badge.country].filter(Boolean).join(', ')}</span>
              </div>
            )}

            {badge.covered_zone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{badge.covered_zone}</span>
              </div>
            )}

            {badge.supervisor_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Superviseur: {badge.supervisor_name}</span>
              </div>
            )}
          </div>

          {/* Organization Info */}
          {(badge.organization_email || badge.organization_phone) && (
            <div className="w-full p-2 sm:p-3 bg-muted/50 rounded-lg text-[10px] sm:text-xs">
              <p className="font-medium mb-1">Contact Organisation:</p>
              {badge.organization_email && <p className="truncate">{badge.organization_email}</p>}
              {badge.organization_phone && <p>{badge.organization_phone}</p>}
              {badge.organization_address && <p className="text-muted-foreground truncate">{badge.organization_address}</p>}
            </div>
          )}

          {/* Stats */}
          {badge.forms_submitted > 0 && (
            <div className="w-full p-2 sm:p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">{badge.forms_submitted}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Formulaires soumis</p>
            </div>
          )}

          {/* QR Code with Selected Style */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 pt-3 sm:pt-4 border-t w-full">
            {badge.qr_code_data && (
              <div id={`qr-${badge.id}`}>
                <QRCodePreview badge={badge} style={qrStyle} size={120} />
              </div>
            )}
            
            {badge.barcode_data && (
              <div className="bg-white p-1 rounded w-full max-w-[200px] overflow-hidden" id={`barcode-${badge.id}`}>
                <svg ref={barcodeRef} className="w-full" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
