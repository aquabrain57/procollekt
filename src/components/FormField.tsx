import { useState, useEffect, useRef } from 'react';
import { 
  Camera, MapPin, Star, Check, Loader2, Clock, Mic, Video, 
  FileUp, Minus, Square, QrCode, Pen, CheckSquare, StickyNote,
  Calculator, EyeOff, Table, GripVertical, Upload, Play, Pause,
  StopCircle, Trash2, X
} from 'lucide-react';
import { FormField as FormFieldType } from '@/types/survey';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PublicSurveyorIdField } from './PublicSurveyorIdField';
import { supabase } from '@/integrations/supabase/client';

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

// Component for displaying location with city name
const LocationFieldDisplay = ({ 
  value, 
  onCapture, 
  hasValue 
}: { 
  value: any; 
  onCapture: () => void; 
  hasValue: boolean;
}) => {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (value?.latitude && value?.longitude) {
      setIsLoadingName(true);
      
      // Use edge function proxy for geocoding (keeps user location data private)
      supabase.functions.invoke('reverse-geocode', {
        body: { latitude: value.latitude, longitude: value.longitude, language: 'fr' }
      })
        .then(({ data, error }) => {
          if (error) throw error;
          
          const parts = [];
          if (data.city) parts.push(data.city);
          if (data.region) parts.push(data.region);
          if (data.country) parts.push(data.country);
          
          setLocationName(parts.length > 0 ? parts.join(', ') : null);
        })
        .catch(() => setLocationName(null))
        .finally(() => setIsLoadingName(false));
    }
  }, [value?.latitude, value?.longitude]);

  const handleCapture = async () => {
    setIsCapturing(true);
    onCapture();
    setTimeout(() => setIsCapturing(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleCapture}
      disabled={isCapturing}
      className={cn(
        'w-full px-4 py-4 rounded-lg border text-left transition-all duration-200 touch-target flex items-center gap-3',
        hasValue
          ? 'border-success bg-success/5 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
      )}
    >
      {isCapturing ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <MapPin className={cn('h-5 w-5', hasValue ? 'text-success' : 'text-muted-foreground')} />
      )}
      {hasValue ? (
        <div className="flex flex-col">
          {isLoadingName ? (
            <span className="text-sm text-muted-foreground">Chargement...</span>
          ) : locationName ? (
            <>
              <span className="text-sm font-medium">{locationName}</span>
              <span className="text-xs text-muted-foreground">
                {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
              </span>
            </>
          ) : (
            <span className="text-sm">
              {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            </span>
          )}
        </div>
      ) : (
        <span>{isCapturing ? 'Capture en cours...' : 'Capturer la position GPS'}</span>
      )}
    </button>
  );
};

// Audio Recording Component
const AudioRecorder = ({ value, onChange }: { value: any; onChange: (val: any) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(value || null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        const reader = new FileReader();
        reader.onloadend = () => onChange(reader.result);
        reader.readAsDataURL(blob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      {audioUrl ? (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <button
            type="button"
            onClick={deleteRecording}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            'w-full px-4 py-4 rounded-lg border flex items-center justify-center gap-3 transition-all',
            isRecording
              ? 'border-destructive bg-destructive/10 text-destructive animate-pulse'
              : 'border-border hover:border-primary/50'
          )}
        >
          {isRecording ? (
            <>
              <StopCircle className="h-5 w-5" />
              <span>Arrêter l'enregistrement</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span>Enregistrer audio</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Video Recording Component
const VideoRecorder = ({ value, onChange }: { value: any; onChange: (val: any) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(value || null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        
        const reader = new FileReader();
        reader.onloadend = () => onChange(reader.result);
        reader.readAsDataURL(blob);
        
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Impossible d\'accéder à la caméra');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setVideoUrl(null);
    onChange(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="space-y-3">
      {isRecording && (
        <video ref={videoRef} className="w-full rounded-lg" muted />
      )}
      {videoUrl && !isRecording ? (
        <div className="space-y-2">
          <video src={videoUrl} controls className="w-full rounded-lg" />
          <button
            type="button"
            onClick={deleteRecording}
            className="w-full p-2 text-destructive hover:bg-destructive/10 rounded-lg flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Supprimer</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            'w-full px-4 py-4 rounded-lg border flex items-center justify-center gap-3 transition-all',
            isRecording
              ? 'border-destructive bg-destructive/10 text-destructive'
              : 'border-border hover:border-primary/50'
          )}
        >
          {isRecording ? (
            <>
              <StopCircle className="h-5 w-5" />
              <span>Arrêter</span>
            </>
          ) : (
            <>
              <Video className="h-5 w-5" />
              <span>Enregistrer vidéo</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Signature Pad Component
const SignaturePad = ({ value, onChange }: { value: any; onChange: (val: any) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full border border-border rounded-lg bg-white touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button
        type="button"
        onClick={clearSignature}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <X className="h-3 w-3" /> Effacer
      </button>
    </div>
  );
};

// Ranking Component
const RankingField = ({ 
  options, 
  value, 
  onChange 
}: { 
  options: { label: string; value: string }[]; 
  value: string[] | null; 
  onChange: (val: string[]) => void;
}) => {
  const [items, setItems] = useState<string[]>(
    value || options.map(o => o.value)
  );

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setItems(newItems);
    onChange(newItems);
  };

  const getLabel = (val: string) => options.find(o => o.value === val)?.label || val;

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item}
          className="flex items-center gap-2 p-3 bg-muted rounded-lg"
        >
          <span className="font-medium text-primary w-6">{index + 1}.</span>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{getLabel(item)}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => moveItem(index, 'up')}
              disabled={index === 0}
              className="p-1 hover:bg-background rounded disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => moveItem(index, 'down')}
              disabled={index === items.length - 1}
              className="p-1 hover:bg-background rounded disabled:opacity-30"
            >
              ▼
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const FormFieldComponent = ({ field, value, onChange, error }: FormFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const baseInputClass = cn(
    'input-field touch-target',
    error && 'border-destructive focus:ring-destructive/20',
    isFocused && 'form-field-focus'
  );

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className={baseInputClass}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'textarea':
        return (
          <textarea
            className={cn(baseInputClass, 'min-h-[120px] resize-y')}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={4}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            className={baseInputClass}
            placeholder={field.placeholder || 'exemple@email.com'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            className={baseInputClass}
            placeholder={field.placeholder || '+241 XX XX XX XX'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={baseInputClass}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            min={field.min}
            max={field.max}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'decimal':
        return (
          <input
            type="number"
            step="0.01"
            className={baseInputClass}
            placeholder={field.placeholder || '0.00'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className={baseInputClass}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'time':
        return (
          <div className="relative">
            <input
              type="time"
              className={baseInputClass}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            className={baseInputClass}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case 'select':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border text-left transition-all duration-200 touch-target flex items-center justify-between',
                  value === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                )}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v: string) => v !== option.value));
                    } else {
                      onChange([...selectedValues, option.value]);
                    }
                  }}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border text-left transition-all duration-200 touch-target flex items-center justify-between',
                    isSelected
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        );

      case 'ranking':
        return (
          <RankingField
            options={field.options || []}
            value={value}
            onChange={onChange}
          />
        );

      case 'rating':
        const maxRating = field.max || 5;
        return (
          <div className="flex gap-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={cn(
                  'p-3 rounded-lg border transition-all duration-200 touch-target',
                  (value || 0) >= rating
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-border bg-background text-muted-foreground hover:border-warning/50'
                )}
              >
                <Star
                  className={cn(
                    'h-6 w-6',
                    (value || 0) >= rating && 'fill-current'
                  )}
                />
              </button>
            ))}
          </div>
        );

      case 'range':
        const min = field.min || 1;
        const max = field.max || 10;
        return (
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{min}</span>
              <span className="font-medium text-foreground">{value || min}</span>
              <span>{max}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={value || min}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        );

      case 'location':
      case 'point':
        return (
          <LocationFieldDisplay
            value={value}
            hasValue={!!value}
            onCapture={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    onChange({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                    });
                  },
                  (error) => {
                    console.error('Error getting location:', error);
                    toast.error('Impossible d\'obtenir la position');
                  }
                );
              }
            }}
          />
        );

      case 'line':
      case 'area':
        return (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const newPoint = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                      };
                      const currentPoints = Array.isArray(value) ? value : [];
                      onChange([...currentPoints, newPoint]);
                      toast.success('Point ajouté');
                    },
                    () => toast.error('Impossible d\'obtenir la position')
                  );
                }
              }}
              className="w-full px-4 py-3 rounded-lg border border-border hover:border-primary/50 flex items-center justify-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              <span>Ajouter un point ({field.type === 'line' ? 'Ligne' : 'Zone'})</span>
            </button>
            {Array.isArray(value) && value.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {value.length} point(s) capturé(s)
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="ml-2 text-destructive hover:underline"
                >
                  Effacer
                </button>
              </div>
            )}
          </div>
        );

      case 'photo':
        return (
          <div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              className="hidden"
              id={`photo-${field.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                  if (!allowedTypes.includes(file.type)) {
                    toast.error('Format non supporté. Utilisez JPEG, PNG ou WebP');
                    e.target.value = '';
                    return;
                  }
                  
                  const maxSize = 5 * 1024 * 1024;
                  if (file.size > maxSize) {
                    toast.error('Image trop volumineuse. Maximum 5MB');
                    e.target.value = '';
                    return;
                  }
                  
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    onChange(e.target?.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor={`photo-${field.id}`}
              className={cn(
                'block w-full rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
                value
                  ? 'border-success bg-success/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {value ? (
                <img
                  src={value}
                  alt="Captured"
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Camera className="h-8 w-8 mb-2" />
                  <span className="text-sm">Prendre une photo</span>
                  <span className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP (max 5MB)</span>
                </div>
              )}
            </label>
          </div>
        );

      case 'audio':
        return <AudioRecorder value={value} onChange={onChange} />;

      case 'video':
        return <VideoRecorder value={value} onChange={onChange} />;

      case 'file':
        return (
          <div>
            <input
              type="file"
              className="hidden"
              id={`file-${field.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error('Fichier trop volumineux. Maximum 10MB');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onChange({ name: file.name, data: ev.target?.result, type: file.type });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label
              htmlFor={`file-${field.id}`}
              className={cn(
                'block w-full px-4 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-all',
                value ? 'border-success bg-success/5' : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex flex-col items-center text-center">
                <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
                {value ? (
                  <span className="text-sm font-medium">{value.name}</span>
                ) : (
                  <>
                    <span className="text-sm">Téléverser un fichier</span>
                    <span className="text-xs text-muted-foreground">Max 10MB</span>
                  </>
                )}
              </div>
            </label>
          </div>
        );

      case 'barcode':
        return (
          <div className="space-y-3">
            <input
              type="text"
              className={baseInputClass}
              placeholder="Entrez ou scannez le code-barres"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>Utilisez un lecteur externe ou entrez manuellement</span>
            </div>
          </div>
        );

      case 'surveyor_id':
        return <PublicSurveyorIdField value={value} onChange={onChange} fieldMode={true} />;

      case 'signature':
        return <SignaturePad value={value} onChange={onChange} />;

      case 'consent':
        return (
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={cn(
              'w-full px-4 py-4 rounded-lg border flex items-center gap-3 transition-all',
              value
                ? 'border-success bg-success/5 text-foreground'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className={cn(
              'w-6 h-6 rounded border-2 flex items-center justify-center transition-all',
              value ? 'border-success bg-success text-white' : 'border-muted-foreground'
            )}>
              {value && <Check className="h-4 w-4" />}
            </div>
            <span>{field.placeholder || 'J\'accepte les conditions'}</span>
          </button>
        );

      case 'note':
        return (
          <div className="p-4 bg-muted rounded-lg border border-border">
            <div className="flex items-start gap-2">
              <StickyNote className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm text-muted-foreground">{field.placeholder || 'Note informative'}</p>
            </div>
          </div>
        );

      case 'calculate':
        return (
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                Résultat: {value !== undefined ? value : 'En attente de calcul...'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ce champ est calculé automatiquement</p>
          </div>
        );

      case 'hidden':
        return (
          <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <EyeOff className="h-4 w-4" />
              <span className="text-xs">Champ masqué (non visible par l'utilisateur)</span>
            </div>
          </div>
        );

      case 'matrix':
        const rows = field.options?.filter(o => o.value.startsWith('row_')) || [];
        const cols = field.options?.filter(o => o.value.startsWith('col_')) || [];
        const matrixValue = value || {};

        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left"></th>
                  {cols.map(col => (
                    <th key={col.value} className="p-2 text-center text-sm font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.value} className="border-t border-border">
                    <td className="p-2 text-sm">{row.label}</td>
                    {cols.map(col => (
                      <td key={col.value} className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onChange({
                              ...matrixValue,
                              [row.value]: col.value
                            });
                          }}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 transition-all',
                            matrixValue[row.value] === col.value
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground hover:border-primary'
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
            Type de champ non pris en charge: {field.type}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2 slide-up">
      <label className="block font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};