import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Eye, Loader2, ScanLine, Keyboard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SurveyorBadge, useSurveyorBadges } from '@/hooks/useSurveyorBadges';
import { BadgeCard } from './BadgeCard';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

interface SurveyorValidationProps {
  onValidated: (badge: SurveyorBadge) => void;
  onInvalid: () => void;
  validatedBadge?: SurveyorBadge | null;
  required?: boolean;
}

export function SurveyorValidation({ 
  onValidated, 
  onInvalid, 
  validatedBadge,
  required = true 
}: SurveyorValidationProps) {
  const { validateBadge } = useSurveyorBadges();
  const [surveyorId, setSurveyorId] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'suspended'>('idle');
  const [badge, setBadge] = useState<SurveyorBadge | null>(validatedBadge || null);
  const [showProfile, setShowProfile] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (validatedBadge) {
      setBadge(validatedBadge);
      setValidationStatus('valid');
      setSurveyorId(validatedBadge.surveyor_id);
    }
  }, [validatedBadge]);

  const handleValidate = async (id: string) => {
    if (!id.trim()) return;

    setIsValidating(true);
    setScanError(null);

    try {
      const result = await validateBadge(id.trim());

      if (result) {
        if (result.status === 'active') {
          setBadge(result);
          setValidationStatus('valid');
          onValidated(result);
          toast.success('Identité confirmée');
        } else {
          setValidationStatus('suspended');
          onInvalid();
          toast.error('Badge suspendu ou expiré');
        }
      } else {
        setValidationStatus('invalid');
        onInvalid();
        toast.error('ID enquêteur invalide');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationStatus('invalid');
      onInvalid();
    } finally {
      setIsValidating(false);
    }
  };

  const startScanning = async () => {
    try {
      setScanError(null);
      setIsScanning(true);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Stop scanner immediately
          await stopScanning();

          // Parse QR code data
          try {
            const data = JSON.parse(decodedText);
            if (data.type === 'YOUCOLLECT_BADGE' && data.id) {
              setSurveyorId(data.id);
              await handleValidate(data.id);
            } else {
              setScanError('QR code invalide');
            }
          } catch {
            // Try as barcode (plain text)
            if (decodedText.startsWith('YC-')) {
              const parts = decodedText.split('-');
              if (parts.length >= 2) {
                setSurveyorId(parts[1]);
                await handleValidate(parts[1]);
              }
            } else {
              // Try as plain surveyor ID
              setSurveyorId(decodedText);
              await handleValidate(decodedText);
            }
          }
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

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const resetValidation = () => {
    setSurveyorId('');
    setBadge(null);
    setValidationStatus('idle');
    onInvalid();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>Identification Enquêteur</span>
        {required && <span className="text-destructive">*</span>}
      </div>

      {validationStatus === 'valid' && badge ? (
        <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">{badge.first_name} {badge.last_name}</p>
                <p className="text-sm text-muted-foreground">ID: {badge.surveyor_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfile(true)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetValidation}
              >
                Changer
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <Keyboard className="w-4 h-4 mr-2" />
              Saisie manuelle
            </TabsTrigger>
            <TabsTrigger value="scan">
              <ScanLine className="w-4 h-4 mr-2" />
              Scanner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Entrez votre ID enquêteur"
                value={surveyorId}
                onChange={(e) => {
                  setSurveyorId(e.target.value);
                  setValidationStatus('idle');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleValidate(surveyorId);
                  }
                }}
                className={validationStatus === 'invalid' ? 'border-destructive' : ''}
              />
              <Button 
                onClick={() => handleValidate(surveyorId)}
                disabled={isValidating || !surveyorId.trim()}
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Valider'
                )}
              </Button>
            </div>

            {validationStatus === 'invalid' && (
              <Alert variant="destructive">
                <XCircle className="w-4 h-4" />
                <AlertDescription>
                  ID enquêteur invalide. Vérifiez et réessayez.
                </AlertDescription>
              </Alert>
            )}

            {validationStatus === 'suspended' && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Ce badge est suspendu. Contactez votre superviseur.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="scan" className="space-y-3">
            {!isScanning ? (
              <Button onClick={startScanning} className="w-full">
                <ScanLine className="w-4 h-4 mr-2" />
                Démarrer le scan
              </Button>
            ) : (
              <div className="space-y-3">
                <div id="qr-reader" className="rounded-lg overflow-hidden" />
                <Button variant="outline" onClick={stopScanning} className="w-full">
                  Arrêter le scan
                </Button>
              </div>
            )}

            {scanError && (
              <Alert variant="destructive">
                <XCircle className="w-4 h-4" />
                <AlertDescription>{scanError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profil Enquêteur</DialogTitle>
          </DialogHeader>
          {badge && <BadgeCard badge={badge} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
