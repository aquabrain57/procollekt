import { useState, useCallback } from 'react';
import { Plus, ArrowRight, LayoutTemplate, Sparkles, Globe, Briefcase, Upload, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import { DbSurvey, useSurveyFields } from '@/hooks/useSurveys';
import { TemplateSelector } from '@/components/TemplateSelector';
import { AIQuestionGenerator } from '@/components/AIQuestionGenerator';
import { SurveyTemplate } from '@/data/surveyTemplates';
import { SURVEY_SECTORS, COUNTRIES } from '@/data/surveyConfig';
import { toast } from 'sonner';

const surveySchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(100),
  description: z.string().max(500).optional(),
});

interface CreateSurveyDialogProps {
  onSubmit: (title: string, description: string) => Promise<DbSurvey | null>;
  onSurveyCreated?: (survey: DbSurvey, fieldsToAdd?: any[]) => void;
}

interface PendingFields {
  fields: any[];
  source: 'template' | 'ai';
}

export const CreateSurveyDialog = ({ onSubmit, onSurveyCreated }: CreateSurveyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SurveyTemplate | null>(null);
  const [pendingAIFields, setPendingAIFields] = useState<any[] | null>(null);
  const [xlsUrl, setXlsUrl] = useState('');

  const handleSubmit = async () => {
    setErrors({});
    
    const result = surveySchema.safeParse({ title, description });
    if (!result.success) {
      const fieldErrors: { title?: string; description?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'title') fieldErrors.title = err.message;
        if (err.path[0] === 'description') fieldErrors.description = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    
    // Build description with sector and country
    let fullDescription = description || '';
    if (sector || country) {
      const sectorLabel = SURVEY_SECTORS.find(s => s.value === sector)?.label;
      const countryLabel = COUNTRIES.find(c => c.value === country)?.label;
      const meta = [sectorLabel, countryLabel].filter(Boolean).join(' - ');
      fullDescription = meta + (fullDescription ? `\n${fullDescription}` : '');
    }
    
    const survey = await onSubmit(title, fullDescription);
    setIsSubmitting(false);

    if (survey) {
      // Determine which fields to add
      let fieldsToAdd: any[] | undefined;
      if (pendingTemplate) {
        fieldsToAdd = pendingTemplate.fields;
      } else if (pendingAIFields) {
        fieldsToAdd = pendingAIFields;
      }

      // Reset form
      setTitle('');
      setDescription('');
      setSector('');
      setCountry('');
      setOpen(false);
      setPendingTemplate(null);
      setPendingAIFields(null);
      setXlsUrl('');
      
      if (onSurveyCreated) {
        onSurveyCreated(survey, fieldsToAdd);
      }
    }
  };

  const handleTemplateSelect = (template: SurveyTemplate) => {
    setTitle(template.name);
    setDescription(template.description);
    setPendingTemplate(template);
    setPendingAIFields(null);
    toast.success(`Modèle "${template.name}" sélectionné`);
  };

  const handleAIGenerate = (fields: any[]) => {
    setPendingAIFields(fields);
    setPendingTemplate(null);
    if (!title) {
      setTitle('Enquête générée par IA');
    }
  };

  const handleImportXLS = () => {
    if (!xlsUrl.trim()) {
      toast.error('Veuillez entrer une URL valide');
      return;
    }
    toast.info('Import XLSForm en cours de développement');
  };

  // Use useCallback to prevent unnecessary re-renders
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Créer une enquête
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle enquête</DialogTitle>
          <DialogDescription>
            Créez votre enquête manuellement, utilisez un modèle ou générez avec l'IA.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual" className="text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Manuel
            </TabsTrigger>
            <TabsTrigger value="template" className="text-xs">
              <LayoutTemplate className="h-3 w-3 mr-1" />
              Modèle
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </TabsTrigger>
            <TabsTrigger value="import" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Nom du projet (requis) *</Label>
              <Input
                id="title"
                value={title}
                onChange={handleTitleChange}
                placeholder="Ex: Marché Gabon"
                maxLength={100}
                className="text-base"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Décrivez l'objectif de cette enquête..."
                rows={2}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Secteur (requis)
                </Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {SURVEY_SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Pays (requis)
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="template" className="py-4">
            <TemplateSelector onSelect={handleTemplateSelect} />
            {pendingTemplate && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  ✓ Modèle sélectionné: {pendingTemplate.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingTemplate.fields.length} questions seront ajoutées automatiquement
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="py-4">
            <AIQuestionGenerator onGenerate={handleAIGenerate} />
            {pendingAIFields && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  ✓ {pendingAIFields.length} questions générées par l'IA
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Créez l'enquête pour ajouter ces questions automatiquement
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5" />
                URL XLSForm ou fichier
              </Label>
              <Input
                value={xlsUrl}
                onChange={(e) => setXlsUrl(e.target.value)}
                placeholder="https://exemple.com/formulaire.xlsx"
              />
              <p className="text-xs text-muted-foreground">
                Importez un questionnaire au format XLSForm depuis une URL
              </p>
            </div>
            
            <Button variant="outline" className="w-full" onClick={handleImportXLS}>
              <Upload className="h-4 w-4 mr-2" />
              Importer depuis XLSForm
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Téléverser un fichier</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Glissez un fichier .xlsx ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Format XLSForm supporté
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Info box */}
        {(pendingTemplate || pendingAIFields) && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">
              Formulaire prêt à être créé
            </p>
            <p className="text-green-600 dark:text-green-500 text-xs mt-1">
              Les questions seront ajoutées automatiquement après la création.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Retour
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Création...' : (
              <>
                Créer le projet
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
