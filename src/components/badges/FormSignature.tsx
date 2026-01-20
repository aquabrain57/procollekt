import { useMemo } from 'react';
import { Lock, MapPin, Smartphone, Clock, User, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';

interface FormSignatureProps {
  badge: SurveyorBadge;
  surveyId: string;
  location?: { latitude: number; longitude: number } | null;
}

export function FormSignature({ badge, surveyId, location }: FormSignatureProps) {
  const signature = useMemo(() => {
    const timestamp = new Date().toISOString();
    const deviceId = getDeviceId();

    // Create signature hash
    const signatureData = {
      surveyorId: badge.surveyor_id,
      badgeId: badge.id,
      surveyId,
      timestamp,
      latitude: location?.latitude,
      longitude: location?.longitude,
      deviceId,
    };

    // Simple hash for display (in production, use crypto)
    const hash = btoa(JSON.stringify(signatureData)).slice(0, 32);

    return {
      ...signatureData,
      hash,
    };
  }, [badge, surveyId, location]);

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Signature Numérique
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3 h-3" />
            <span>ID Enquêteur:</span>
          </div>
          <span className="font-mono">{signature.surveyorId}</span>

          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck className="w-3 h-3" />
            <span>Badge ID:</span>
          </div>
          <span className="font-mono truncate">{signature.badgeId.slice(0, 8)}...</span>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Horodatage:</span>
          </div>
          <span className="font-mono">
            {new Date(signature.timestamp).toLocaleString('fr-FR')}
          </span>

          {location && (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>GPS:</span>
              </div>
              <span className="font-mono">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </span>
            </>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Smartphone className="w-3 h-3" />
            <span>Appareil:</span>
          </div>
          <span className="font-mono truncate">{signature.deviceId.slice(0, 8)}...</span>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Lock className="w-3 h-3" />
            <span>Hash:</span>
          </div>
          <span className="font-mono text-[10px] break-all bg-muted p-1 rounded block">
            {signature.hash}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Generate or retrieve device ID
function getDeviceId(): string {
  const storageKey = 'yc_device_id';
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = `DEV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

export function generateSignatureData(
  badge: SurveyorBadge,
  surveyId: string,
  location?: { latitude: number; longitude: number } | null
) {
  const timestamp = new Date().toISOString();
  const deviceId = getDeviceId();

  const signatureData = {
    surveyor_id: badge.surveyor_id,
    badge_id: badge.id,
    survey_id: surveyId,
    timestamp,
    gps_latitude: location?.latitude || null,
    gps_longitude: location?.longitude || null,
    device_id: deviceId,
    signature_hash: btoa(JSON.stringify({
      s: badge.surveyor_id,
      b: badge.id,
      t: timestamp,
      l: location,
      d: deviceId,
    })).slice(0, 64),
  };

  return signatureData;
}
