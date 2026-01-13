import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Plus, GripVertical, Trash2, Eye, Send, Copy, ChevronDown, ChevronUp, 
  Type, Hash, ListChecks, CheckSquare, Calendar, MapPin, Camera, Star,
  AlignLeft, Mail, Phone, Clock, Image, Video, Mic, QrCode, FileText,
  ToggleLeft, Calculator, Layers, SlidersHorizontal, CheckCircle, File,
  PenTool, List, Eye as EyeIcon, Grid, Minus, Square, MessageSquare, Palette
} from 'lucide-react';
import { FormDesignSelector } from '@/components/FormDesignSelector';
import { FormDesignTemplate, FORM_DESIGN_TEMPLATES } from '@/data/formDesignTemplates';
import { DbSurvey, DbSurveyField, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ShareSurveyDialog } from '@/components/ShareSurveyDialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const useDebouncedPatch = <T extends object>(
  patchFn: (patch: Partial<T>) => void,
  delayMs: number
) => {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (patch: Partial<T>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => patchFn(patch), delayMs);
  };
};

const FIELD_TYPES = [
  // Types de base
  { value: 'text', label: 'Texte', icon: Type, description: 'Réponse courte', category: 'base' },
  { value: 'textarea', label: 'Texte long', icon: AlignLeft, description: 'Réponse détaillée', category: 'base' },
  { value: 'number', label: 'Chiffre', icon: Hash, description: 'Valeur numérique', category: 'base' },
  { value: 'decimal', label: 'Décimale', icon: Calculator, description: 'Nombre avec virgule', category: 'base' },
  
  // Choix
  { value: 'select', label: 'Choix unique', icon: CheckCircle, description: 'Une option', category: 'choice' },
  { value: 'multiselect', label: 'Multi-sélection', icon: CheckSquare, description: 'Plusieurs options', category: 'choice' },
  { value: 'ranking', label: 'Classement', icon: List, description: 'Ordonner options', category: 'choice' },
  
  // Contact
  { value: 'email', label: 'Email', icon: Mail, description: 'Adresse email', category: 'contact' },
  { value: 'phone', label: 'Téléphone', icon: Phone, description: 'Numéro téléphone', category: 'contact' },
  
  // Date et heure
  { value: 'date', label: 'Date', icon: Calendar, description: 'Sélection date', category: 'datetime' },
  { value: 'time', label: 'Heure', icon: Clock, description: 'Sélection heure', category: 'datetime' },
  { value: 'datetime', label: 'Date+Heure', icon: Calendar, description: 'Date + heure', category: 'datetime' },
  
  // Médias
  { value: 'photo', label: 'Photo', icon: Camera, description: 'Capture image', category: 'media' },
  { value: 'audio', label: 'Audio', icon: Mic, description: 'Enregistrement audio', category: 'media' },
  { value: 'video', label: 'Vidéo', icon: Video, description: 'Capture vidéo', category: 'media' },
  { value: 'file', label: 'Fichier', icon: File, description: 'Téléverser fichier', category: 'media' },
  
  // Localisation
  { value: 'location', label: 'Position GPS', icon: MapPin, description: 'GPS + nom ville', category: 'geo' },
  { value: 'line', label: 'Ligne', icon: Minus, description: 'Tracer ligne', category: 'geo' },
  { value: 'area', label: 'Zone', icon: Square, description: 'Délimiter zone', category: 'geo' },
  
  // Notation
  { value: 'rating', label: 'Notation', icon: Star, description: 'Étoiles 1-5', category: 'scale' },
  { value: 'range', label: 'Intervalle', icon: SlidersHorizontal, description: 'Échelle linéaire', category: 'scale' },
  
  // Avancé
  { value: 'barcode', label: 'Code-barres', icon: QrCode, description: 'Scanner code', category: 'advanced' },
  { value: 'signature', label: 'Signature', icon: PenTool, description: 'Signature manuscrite', category: 'advanced' },
  { value: 'consent', label: 'Consentir', icon: ToggleLeft, description: 'Case consentement', category: 'advanced' },
  { value: 'note', label: 'Note', icon: MessageSquare, description: 'Texte informatif', category: 'advanced' },
  { value: 'calculate', label: 'Calcul', icon: Calculator, description: 'Valeur calculée', category: 'advanced' },
  { value: 'hidden', label: 'Caché', icon: EyeIcon, description: 'Champ masqué', category: 'advanced' },
  { value: 'matrix', label: 'Tableau', icon: Grid, description: 'Grille questions', category: 'advanced' },
];

interface SurveyBuilderProps {
  survey: DbSurvey;
  onPublish: () => void;
  onPreview: () => void;
}

interface FieldEditorProps {
  field: DbSurveyField;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<DbSurveyField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const FieldEditor = ({
  field,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: FieldEditorProps) => {
  // Local state for fast typing (avoid saving to backend on every keystroke)
  const [localLabel, setLocalLabel] = useState(field.label);
  const [localPlaceholder, setLocalPlaceholder] = useState(field.placeholder || '');
  const [optionsText, setOptionsText] = useState(field.options?.map((o) => o.label).join('\n') || '');

  useEffect(() => {
    setLocalLabel(field.label);
    setLocalPlaceholder(field.placeholder || '');
    setOptionsText(field.options?.map((o) => o.label).join('\n') || '');
  }, [field.id]);

  const fieldType = useMemo(() => FIELD_TYPES.find((t) => t.value === field.field_type), [field.field_type]);
  const Icon = fieldType?.icon || Type;

  const debouncedUpdate = useDebouncedPatch<DbSurveyField>((patch) => onUpdate(patch), 400);

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options = text
      .split('\n')
      .filter((line) => line.trim())
      .map((line, i) => ({
        value: `option_${i}`,
        label: line.trim(),
      }));

    debouncedUpdate({ options });
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isExpanded ? 'ring-2 ring-primary/20' : 'hover:shadow-md'
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />

            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <div className="flex-1">
                  <p className="font-medium text-foreground truncate">{field.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {fieldType?.label}
                    {field.required && ' • Obligatoire'}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-4 border-t">
            {/* Question Label */}
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={localLabel}
                onChange={(e) => {
                  const next = e.target.value;
                  setLocalLabel(next);
                  debouncedUpdate({ label: next });
                }}
                placeholder="Entrez votre question..."
                className="text-base"
              />
            </div>

            {/* Field Type */}
            <div className="space-y-2">
              <Label>Type de réponse</Label>
              <Select
                value={field.field_type}
                onValueChange={(value) =>
                  onUpdate({
                    field_type: value as DbSurveyField['field_type'],
                    options:
                      value === 'select' || value === 'multiselect'
                        ? [{ value: 'option1', label: 'Option 1' }]
                        : null,
                    min_value: value === 'rating' ? 1 : null,
                    max_value: value === 'rating' ? 5 : null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Placeholder for text fields */}
            {(field.field_type === 'text' || field.field_type === 'number' || field.field_type === 'textarea' || field.field_type === 'email' || field.field_type === 'phone' || field.field_type === 'decimal' || field.field_type === 'barcode') && (
              <div className="space-y-2">
                <Label>Texte d'aide (placeholder)</Label>
                <Input
                  value={localPlaceholder}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLocalPlaceholder(next);
                    debouncedUpdate({ placeholder: next });
                  }}
                  placeholder={
                    field.field_type === 'email' ? 'Ex: exemple@email.com' :
                    field.field_type === 'phone' ? 'Ex: +241 XX XX XX XX' :
                    field.field_type === 'barcode' ? 'Ex: Code-barres ou QR code' :
                    'Ex: Entrez votre réponse ici...'
                  }
                />
              </div>
            )}

            {/* Options for select/multiselect/ranking */}
            {(field.field_type === 'select' || field.field_type === 'multiselect' || field.field_type === 'ranking') && (
              <div className="space-y-2">
                <Label>Options (une par ligne)</Label>
                <Textarea
                  value={optionsText}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  rows={5}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {field.field_type === 'multiselect'
                    ? 'Les répondants pourront sélectionner plusieurs options'
                    : field.field_type === 'ranking'
                    ? 'Les répondants classeront ces options par ordre de préférence'
                    : 'Les répondants devront choisir une seule option'}
                </p>
              </div>
            )}

            {/* Placeholder for consent and note */}
            {(field.field_type === 'consent' || field.field_type === 'note') && (
              <div className="space-y-2">
                <Label>{field.field_type === 'consent' ? 'Texte de consentement' : 'Contenu de la note'}</Label>
                <Textarea
                  value={localPlaceholder}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLocalPlaceholder(next);
                    debouncedUpdate({ placeholder: next });
                  }}
                  placeholder={field.field_type === 'consent' 
                    ? "J'accepte les conditions générales..." 
                    : "Information importante à afficher..."}
                  rows={3}
                />
              </div>
            )}

            {/* Min/Max for number, rating, and range */}
            {(field.field_type === 'number' || field.field_type === 'rating' || field.field_type === 'range' || field.field_type === 'decimal') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valeur minimum</Label>
                  <Input
                    type="number"
                    value={field.min_value ?? ''}
                    onChange={(e) =>
                      onUpdate({ min_value: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valeur maximum</Label>
                  <Input
                    type="number"
                    value={field.max_value ?? ''}
                    onChange={(e) =>
                      onUpdate({ max_value: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
              </div>
            )}

            {/* Required toggle */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
              <div>
                <Label>Question obligatoire</Label>
                <p className="text-xs text-muted-foreground">Le répondant devra répondre à cette question</p>
              </div>
              <Switch checked={field.required} onCheckedChange={(checked) => onUpdate({ required: checked })} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1">
                <Copy className="h-4 w-4 mr-1" />
                Dupliquer
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const SurveyBuilder = ({ survey, onPublish, onPreview }: SurveyBuilderProps) => {
  const { fields, loading, addField, updateField, deleteField, reorderFields } = useSurveyFields(survey.id);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<string>('modern-blue');

  const handleDesignSelect = (template: FormDesignTemplate) => {
    setSelectedDesign(template.id);
  };

  const handleAddField = async (type: string) => {
    const fieldType = FIELD_TYPES.find(t => t.value === type);
    
    // Configuration par défaut selon le type
    let defaultOptions = null;
    let defaultMin = null;
    let defaultMax = null;
    
    if (type === 'select' || type === 'multiselect' || type === 'ranking') {
      defaultOptions = [
        { value: 'option1', label: 'Option 1' }, 
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
      ];
    } else if (type === 'matrix') {
      defaultOptions = [
        { value: 'row_1', label: 'Ligne 1' },
        { value: 'row_2', label: 'Ligne 2' },
        { value: 'col_1', label: 'Colonne 1' },
        { value: 'col_2', label: 'Colonne 2' },
        { value: 'col_3', label: 'Colonne 3' },
      ];
    }
    
    if (type === 'rating') {
      defaultMin = 1;
      defaultMax = 5;
    } else if (type === 'range') {
      defaultMin = 1;
      defaultMax = 10;
    }

    const newField = await addField({
      field_type: type as DbSurveyField['field_type'],
      label: `Nouvelle question ${fieldType?.label || ''}`,
      placeholder: type === 'consent' ? 'J\'accepte les conditions' : 
                   type === 'note' ? 'Information importante...' : '',
      required: false,
      options: defaultOptions,
      min_value: defaultMin,
      max_value: defaultMax,
      conditional_on: null,
      field_order: fields.length,
    });

    if (newField) {
      setExpandedFieldId(newField.id);
      toast.success('Question ajoutée');
    }
  };

  const handleUpdateField = async (id: string, updates: Partial<DbSurveyField>) => {
    await updateField(id, updates);
  };

  const handleDeleteField = async (id: string) => {
    await deleteField(id);
    if (expandedFieldId === id) {
      setExpandedFieldId(null);
    }
  };

  const handleDuplicateField = async (field: DbSurveyField) => {
    const newField = await addField({
      field_type: field.field_type,
      label: `${field.label} (copie)`,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options,
      min_value: field.min_value,
      max_value: field.max_value,
      conditional_on: field.conditional_on,
      field_order: fields.length,
    });

    if (newField) {
      setExpandedFieldId(newField.id);
      toast.success('Question dupliquée');
    }
  };

  const handleMoveField = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    
    await reorderFields(newFields.map((f, i) => ({ ...f, field_order: i })));
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
          {survey.description && (
            <p className="text-sm text-muted-foreground">{survey.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <FormDesignSelector 
            selectedTemplate={selectedDesign} 
            onSelect={handleDesignSelect} 
          />
          <ShareSurveyDialog surveyId={survey.id} surveyTitle={survey.title} surveyDescription={survey.description} coverImageUrl={survey.cover_image_url} />
          <Button variant="outline" size="sm" onClick={onPreview} className="text-xs sm:text-sm">
            <Eye className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Aperçu</span>
          </Button>
          <Button size="sm" onClick={onPublish} className="text-xs sm:text-sm">
            <Send className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{survey.status === 'active' ? 'Dépublier' : 'Déployer sur serveur'}</span>
            <span className="sm:hidden">{survey.status === 'active' ? 'Stop' : 'Déployer'}</span>
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
        survey.status === 'active' 
          ? 'bg-success/10 text-success' 
          : 'bg-muted text-muted-foreground'
      )}>
        {survey.status === 'active' ? '🟢 Enquête publiée' : '⚪ Brouillon'}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">
            Questions ({fields.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : fields.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="text-center py-12">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">Aucune question</p>
              <p className="text-sm text-muted-foreground mb-4">
                Commencez à créer votre formulaire en ajoutant des questions
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                field={field}
                index={index}
                isExpanded={expandedFieldId === field.id}
                onToggle={() => setExpandedFieldId(
                  expandedFieldId === field.id ? null : field.id
                )}
                onUpdate={(updates) => handleUpdateField(field.id, updates)}
                onDelete={() => handleDeleteField(field.id)}
                onDuplicate={() => handleDuplicateField(field)}
                onMoveUp={() => handleMoveField(index, 'up')}
                onMoveDown={() => handleMoveField(index, 'down')}
                isFirst={index === 0}
                isLast={index === fields.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Question Panel - KoboToolbox style */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Ajouter une question</h3>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {FIELD_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleAddField(type.value)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-primary/10 transition-all text-center group border border-transparent hover:border-primary/30"
                title={type.description}
              >
                <type.icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-foreground leading-tight">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
