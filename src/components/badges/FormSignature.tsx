import { useMemo, useState, useEffect } from 'react';
import { Lock, MapPin, Smartphone, Clock, User, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SurveyorBadge } from '@/hooks/useSurveyorBadges';

interface FormSignatureProps {
  badge: SurveyorBadge;
  surveyId: string;
  location?: { latitude: number; longitude: number } | null;
}

// Generate SHA-256 hash using Web Crypto API
async function generateSHA256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function FormSignature({ badge, surveyId, location }: FormSignatureProps) {
  const [hash, setHash] = useState<string>('');
  
  const signatureData = useMemo(() => {
    const timestamp = new Date().toISOString();
    const deviceId = getDeviceId();

    return {
      surveyorId: badge.surveyor_id,
      badgeId: badge.id,
      surveyId,
      timestamp,
      latitude: location?.latitude,
      longitude: location?.longitude,
      deviceId,
    };
  }, [badge, surveyId, location]);

  // Generate hash asynchronously
  useEffect(() => {
    const dataString = `${signatureData.surveyorId}:${signatureData.badgeId}:${signatureData.surveyId}:${signatureData.timestamp}:${signatureData.latitude ?? 'null'}:${signatureData.longitude ?? 'null'}:${signatureData.deviceId}`;
    generateSHA256Hash(dataString).then(h => setHash(h.slice(0, 32)));
  }, [signatureData]);

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Empreinte Numérique
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3 h-3" />
            <span>ID Enquêteur:</span>
          </div>
          <span className="font-mono">{signatureData.surveyorId}</span>

          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck className="w-3 h-3" />
            <span>Badge ID:</span>
          </div>
          <span className="font-mono truncate">{signatureData.badgeId.slice(0, 8)}...</span>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Horodatage:</span>
          </div>
          <span className="font-mono">
            {new Date(signatureData.timestamp).toLocaleString('fr-FR')}
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
          <span className="font-mono truncate">{signatureData.deviceId.slice(0, 8)}...</span>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Lock className="w-3 h-3" />
            <span>Empreinte (SHA-256):</span>
          </div>
          <span className="font-mono text-[10px] break-all bg-muted p-1 rounded block">
            {hash || 'Calcul...'}
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

export async function generateSignatureData(
  badge: SurveyorBadge,
  surveyId: string,
  location?: { latitude: number; longitude: number } | null
) {
  const timestamp = new Date().toISOString();
  const deviceId = getDeviceId();
  const gpsLatitude = location?.latitude ?? null;
  const gpsLongitude = location?.longitude ?? null;

  // Create canonical string for hashing
  const dataString = `${badge.surveyor_id}:${badge.id}:${surveyId}:${timestamp}:${gpsLatitude ?? 'null'}:${gpsLongitude ?? 'null'}:${deviceId}`;
  
  // Generate SHA-256 hash (cryptographic, not reversible)
  const signatureHash = await generateSHA256Hash(dataString);

  const signatureData = {
    surveyor_id: badge.surveyor_id,
    badge_id: badge.id,
    survey_id: surveyId,
    timestamp,
    gps_latitude: gpsLatitude,
    gps_longitude: gpsLongitude,
    device_id: deviceId,
    signature_hash: signatureHash.slice(0, 64),
  };

  return signatureData;
}
