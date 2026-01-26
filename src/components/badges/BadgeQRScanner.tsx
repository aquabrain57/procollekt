import { useState, useEffect, useRef } from 'react';
import { ScanLine, Camera, CheckCircle2, XCircle, Loader2, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { SurveyorBadge, useSurveyorBadges } from '@/hooks/useSurveyorBadges';

interface BadgeQRScannerProps {
  onValidated?: (badge: SurveyorBadge) => void;
  onInvalid?: () => void;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
  showIcon?: boolean;
}

export function BadgeQRScanner({
  onValidated,
  onInvalid,
  buttonVariant = 'outline',
  buttonSize = 'default',
  buttonText = 'Scanner un badge',
  showIcon = true,
}: BadgeQRScannerProps) {
  const { validateBadge } = useSurveyorBadges();
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [scanResult, setScanResult] = useState<'idle' | 'valid' | 'invalid' | 'suspended'>('idle');
  const [validatedBadge, setValidatedBadge] = useState<SurveyorBadge | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanning = async () => {
    try {
      setScanError(null);
      setScanResult('idle');
      setValidatedBadge(null);
      setIsScanning(true);

      // Wait for DOM to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const scanner = new Html5Qrcode('badge-qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
        },
        async (decodedText) => {
          // Stop scanner immediately
          await stopScanning();
          
          // Process the scanned data
          await processQRData(decodedText);
        },
        () => {} // Ignore errors during scanning
      );
    } catch (error: any) {
      console.error('Scanner error:', error);
      setScanError(error.message || 'Impossible d\'accéder à la caméra');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const processQRData = async (decodedText: string) => {
    setIsValidating(true);
    
    try {
      let surveyorId: string | null = null;

      // Try to parse as JSON (YOUCOLLECT_BADGE format)
      try {
        const data = JSON.parse(decodedText);
        if (data.type === 'YOUCOLLECT_BADGE' && data.id) {
          surveyorId = data.id;
        }
      } catch {
        // Not JSON - try other formats
        
        // Try as barcode format (YC-XXXXX-...)
        if (decodedText.startsWith('YC-')) {
          const parts = decodedText.split('-');
          if (parts.length >= 2) {
            surveyorId = parts[1];
          }
        } else {
          // Assume it's a plain surveyor ID
          surveyorId = decodedText.trim();
        }
      }

      if (!surveyorId) {
        setScanResult('invalid');
        setScanError('QR code non reconnu');
        onInvalid?.();
        return;
      }

      // Validate the badge
      const badge = await validateBadge(surveyorId);
      
      if (badge) {
        if (badge.status === 'active') {
          setValidatedBadge(badge);
          setScanResult('valid');
          onValidated?.(badge);
          toast.success(`Badge validé: ${badge.first_name} ${badge.last_name}`);
        } else {
          setScanResult('suspended');
          setScanError('Ce badge est suspendu ou expiré');
          onInvalid?.();
          toast.error('Badge suspendu');
        }
      } else {
        setScanResult('invalid');
        setScanError('Badge non trouvé dans le système');
        onInvalid?.();
        toast.error('Badge invalide');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setScanResult('invalid');
      setScanError('Erreur lors de la validation');
      onInvalid?.();
    } finally {
      setIsValidating(false);
    }
  };

  const resetScanner = () => {
    setScanResult('idle');
    setValidatedBadge(null);
    setScanError(null);
  };

  const handleClose = () => {
    stopScanning();
    setIsOpen(false);
    resetScanner();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          {showIcon && <ScanLine className="h-4 w-4 mr-2" />}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Scanner un badge enquêteur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanning area */}
          {scanResult === 'idle' && (
            <>
              {!isScanning ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <ScanLine className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Positionnez le QR code du badge devant la caméra
                  </p>
                  <Button onClick={startScanning} className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Activer la caméra
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div 
                    id="badge-qr-reader" 
                    className="rounded-lg overflow-hidden border-2 border-primary/30"
                    style={{ minHeight: '300px' }}
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full" />
                    Scan en cours...
                  </div>
                  <Button variant="outline" onClick={stopScanning} className="w-full">
                    Arrêter le scan
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Validating state */}
          {isValidating && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validation du badge...</p>
            </div>
          )}

          {/* Valid result */}
          {scanResult === 'valid' && validatedBadge && (
            <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                    {validatedBadge.photo_url ? (
                      <img 
                        src={validatedBadge.photo_url} 
                        alt={`${validatedBadge.first_name} ${validatedBadge.last_name}`}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <CheckCircle2 className="h-7 w-7 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="bg-green-600">
                        Vérifié
                      </Badge>
                    </div>
                    <h3 className="font-bold text-lg">
                      {validatedBadge.first_name} {validatedBadge.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {validatedBadge.surveyor_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {validatedBadge.role} • {validatedBadge.organization || 'N/A'}
                    </p>
                    {validatedBadge.covered_zone && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Zone: {validatedBadge.covered_zone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={resetScanner} className="flex-1">
                    Scanner un autre
                  </Button>
                  <Button onClick={handleClose} className="flex-1">
                    Terminé
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invalid result */}
          {scanResult === 'invalid' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {scanError || 'Badge non valide ou non reconnu'}
              </AlertDescription>
            </Alert>
          )}

          {/* Suspended result */}
          {scanResult === 'suspended' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {scanError || 'Ce badge est suspendu. Contactez le superviseur.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Error display */}
          {scanError && scanResult === 'idle' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}

          {/* Retry button for failed scans */}
          {(scanResult === 'invalid' || scanResult === 'suspended') && (
            <Button variant="outline" onClick={resetScanner} className="w-full">
              Réessayer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
