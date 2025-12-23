import { useState } from 'react';
import { Plus, GripVertical, Trash2, Settings, Save, Eye, Send } from 'lucide-react';
import { DbSurvey, DbSurveyField, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

const FIELD_TYPES = [
  { value: 'text', label: 'Texte', icon: '📝' },
  { value: 'number', label: 'Nombre', icon: '🔢' },
  { value: 'select', label: 'Choix unique', icon: '☑️' },
  { value: 'multiselect', label: 'Choix multiple', icon: '✅' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'location', label: 'Localisation GPS', icon: '📍' },
  { value: 'photo', label: 'Photo', icon: '📷' },
  { value: 'rating', label: 'Note (1-5)', icon: '⭐' },
];

interface SurveyBuilderProps {
  survey: DbSurvey;
  onPublish: () => void;
  onPreview: () => void;
}

export const SurveyBuilder = ({ survey, onPublish, onPreview }: SurveyBuilderProps) => {
  const { fields, loading, addField, updateField, deleteField } = useSurveyFields(survey.id);
  const [editingField, setEditingField] = useState<DbSurveyField | null>(null);
  const [optionsText, setOptionsText] = useState('');

  const handleAddField = async (type: string) => {
    const newField = await addField({
      field_type: type as DbSurveyField['field_type'],
      label: `Nouveau champ ${FIELD_TYPES.find(t => t.value === type)?.label}`,
      placeholder: '',
      required: false,
      options: type === 'select' || type === 'multiselect' 
        ? [{ value: 'option1', label: 'Option 1' }] 
        : null,
      min_value: type === 'rating' ? 1 : null,
      max_value: type === 'rating' ? 5 : null,
      conditional_on: null,
      field_order: fields.length,
    });

    if (newField) {
      setEditingField(newField);
      if (newField.options) {
        setOptionsText(newField.options.map(o => o.label).join('\n'));
      }
    }
  };

  const handleSaveField = async () => {
    if (!editingField) return;

    let options = editingField.options;
    if (editingField.field_type === 'select' || editingField.field_type === 'multiselect') {
      options = optionsText
        .split('\n')
        .filter(line => line.trim())
        .map((line, i) => ({
          value: `option_${i}`,
          label: line.trim(),
        }));
    }

    await updateField(editingField.id, {
      ...editingField,
      options,
    });

    setEditingField(null);
    setOptionsText('');
    toast.success('Champ enregistré');
  };

  const handleDeleteField = async (id: string) => {
    await deleteField(id);
  };

  const getFieldIcon = (type: string) => {
    return FIELD_TYPES.find(t => t.value === type)?.icon || '📝';
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
          <p className="text-sm text-muted-foreground">{survey.description}</p>
        </div>
        <div className="flex gap-2">
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

      {/* Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        survey.status === 'active' 
          ? 'bg-success/10 text-success' 
          : 'bg-muted text-muted-foreground'
      }`}>
        {survey.status === 'active' ? '🟢 Publié' : '⚪ Brouillon'}
      </div>

      {/* Fields List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Champs du formulaire</h3>
        
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <p>Aucun champ ajouté</p>
            <p className="text-sm">Ajoutez des champs pour créer votre formulaire</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                <span className="text-xl">{getFieldIcon(field.field_type)}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{field.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                    {field.required && ' • Obligatoire'}
                  </p>
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingField(field);
                        if (field.options) {
                          setOptionsText(field.options.map(o => o.label).join('\n'));
                        }
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Modifier le champ</SheetTitle>
                      <SheetDescription>
                        Configurez les propriétés de ce champ
                      </SheetDescription>
                    </SheetHeader>
                    
                    {editingField && (
                      <div className="space-y-4 mt-6">
                        <div className="space-y-2">
                          <Label>Libellé</Label>
                          <Input
                            value={editingField.label}
                            onChange={(e) => setEditingField({
                              ...editingField,
                              label: e.target.value,
                            })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Placeholder</Label>
                          <Input
                            value={editingField.placeholder || ''}
                            onChange={(e) => setEditingField({
                              ...editingField,
                              placeholder: e.target.value,
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label>Obligatoire</Label>
                          <Switch
                            checked={editingField.required}
                            onCheckedChange={(checked) => setEditingField({
                              ...editingField,
                              required: checked,
                            })}
                          />
                        </div>

                        {(editingField.field_type === 'select' || editingField.field_type === 'multiselect') && (
                          <div className="space-y-2">
                            <Label>Options (une par ligne)</Label>
                            <Textarea
                              value={optionsText}
                              onChange={(e) => setOptionsText(e.target.value)}
                              rows={5}
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                            />
                          </div>
                        )}

                        {(editingField.field_type === 'number' || editingField.field_type === 'rating') && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Min</Label>
                              <Input
                                type="number"
                                value={editingField.min_value || ''}
                                onChange={(e) => setEditingField({
                                  ...editingField,
                                  min_value: e.target.value ? parseInt(e.target.value) : null,
                                })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max</Label>
                              <Input
                                type="number"
                                value={editingField.max_value || ''}
                                onChange={(e) => setEditingField({
                                  ...editingField,
                                  max_value: e.target.value ? parseInt(e.target.value) : null,
                                })}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleSaveField} className="flex-1">
                            <Save className="h-4 w-4 mr-1" />
                            Enregistrer
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleDeleteField(editingField.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </SheetContent>
                </Sheet>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Field Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Ajouter un champ</h3>
        <div className="grid grid-cols-2 gap-2">
          {FIELD_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleAddField(type.value)}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
            >
              <span className="text-xl">{type.icon}</span>
              <span className="text-sm font-medium text-foreground">{type.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
