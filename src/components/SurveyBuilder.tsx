import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, GripVertical, Trash2, Eye, Send, Copy, ChevronDown, ChevronUp, Type, Hash, ListChecks, CheckSquare, Calendar, MapPin, Camera, Star } from 'lucide-react';
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
  { value: 'text', label: 'Texte court', icon: Type, description: 'Réponse libre sur une ligne' },
  { value: 'textarea', label: 'Texte long', icon: Type, description: 'Réponse détaillée multi-lignes' },
  { value: 'number', label: 'Nombre', icon: Hash, description: 'Valeur numérique' },
  { value: 'email', label: 'Email', icon: Type, description: 'Adresse email valide' },
  { value: 'phone', label: 'Téléphone', icon: Type, description: 'Numéro de téléphone' },
  { value: 'select', label: 'Choix unique', icon: ListChecks, description: 'Une seule option parmi plusieurs' },
  { value: 'multiselect', label: 'Choix multiple', icon: CheckSquare, description: 'Plusieurs options possibles' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Sélection de date' },
  { value: 'time', label: 'Heure', icon: Calendar, description: 'Sélection d\'heure' },
  { value: 'location', label: 'Localisation GPS', icon: MapPin, description: 'Position avec nom de ville' },
  { value: 'photo', label: 'Photo', icon: Camera, description: 'Capture d\'image' },
  { value: 'rating', label: 'Échelle de notation', icon: Star, description: 'Note de 1 à 5 étoiles' },
  { value: 'range', label: 'Échelle linéaire', icon: Hash, description: 'Valeur sur une échelle (1-10)' },
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
            {(field.field_type === 'text' || field.field_type === 'number') && (
              <div className="space-y-2">
                <Label>Texte d'aide (placeholder)</Label>
                <Input
                  value={localPlaceholder}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLocalPlaceholder(next);
                    debouncedUpdate({ placeholder: next });
                  }}
                  placeholder="Ex: Entrez votre réponse ici..."
                />
              </div>
            )}

            {/* Options for select/multiselect */}
            {(field.field_type === 'select' || field.field_type === 'multiselect') && (
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
                    : 'Les répondants devront choisir une seule option'}
                </p>
              </div>
            )}

            {/* Min/Max for number and rating */}
            {(field.field_type === 'number' || field.field_type === 'rating') && (
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

  const handleAddField = async (type: string) => {
    const fieldType = FIELD_TYPES.find(t => t.value === type);
    const newField = await addField({
      field_type: type as DbSurveyField['field_type'],
      label: `Nouvelle question ${fieldType?.label || ''}`,
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'multiselect' 
        ? [{ value: 'option1', label: 'Option 1' }, { value: 'option2', label: 'Option 2' }] 
        : null,
      min_value: type === 'rating' ? 1 : null,
      max_value: type === 'rating' ? 5 : null,
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
          {survey.status === 'active' && (
            <ShareSurveyDialog surveyId={survey.id} surveyTitle={survey.title} />
          )}
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4 mr-1" />
            Aperçu
          </Button>
          <Button size="sm" onClick={onPublish}>
            <Send className="h-4 w-4 mr-1" />
            {survey.status === 'active' ? 'Dépublier' : 'Publier'}
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

      {/* Add Question Panel */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Ajouter une question</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FIELD_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleAddField(type.value)}
              className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-muted hover:border-primary/50 transition-all text-center group"
            >
              <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <type.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{type.label}</span>
              <span className="text-xs text-muted-foreground hidden md:block">
                {type.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
