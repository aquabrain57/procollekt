import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Plus, ArrowRight, LayoutTemplate, Sparkles, Globe, Briefcase, Upload, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { DbSurvey } from '@/hooks/useSurveys';
import { TemplateSelector } from '@/components/TemplateSelector';
import { AIQuestionGenerator } from '@/components/AIQuestionGenerator';
import { SurveyTemplate } from '@/data/surveyTemplates';
import { SURVEY_SECTORS, COUNTRIES } from '@/data/surveyConfig';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

const surveySchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(100),
  description: z.string().max(500).optional(),
  sector: z.string().min(1, 'Sélectionnez un secteur'),
  country: z.string().min(1, 'Sélectionnez un pays'),
});

interface CreateSurveyDialogProps {
  onSubmit: (title: string, description: string) => Promise<DbSurvey | null>;
  onSurveyCreated?: (survey: DbSurvey, fieldsToAdd?: any[]) => void;
}

export const CreateSurveyDialog = ({ onSubmit, onSurveyCreated }: CreateSurveyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string; sector?: string; country?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SurveyTemplate | null>(null);
  const [pendingAIFields, setPendingAIFields] = useState<any[] | null>(null);
  const [xlsUrl, setXlsUrl] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  const [canSubmit, setCanSubmit] = useState(false);
  
  // Use refs for fast input without re-renders
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (titleRef.current) titleRef.current.value = '';
      if (descriptionRef.current) descriptionRef.current.value = '';
      setSector('');
      setCountry('');
      setErrors({});
      setPendingTemplate(null);
      setPendingAIFields(null);
      setXlsUrl('');
      setActiveTab('manual');
      setCanSubmit(false);
    }
  }, [open]);

  const checkCanSubmit = () => {
    const title = titleRef.current?.value.trim() || '';
    setCanSubmit(title.length >= 3 && sector !== '' && country !== '');
  };

  const handleSubmit = async () => {
    const title = titleRef.current?.value.trim() || '';
    const description = descriptionRef.current?.value.trim() || '';
    
    setErrors({});
    
    const result = surveySchema.safeParse({ title, description, sector, country });
    if (!result.success) {
      const fieldErrors: { title?: string; description?: string; sector?: string; country?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'title') fieldErrors.title = err.message;
        if (err.path[0] === 'description') fieldErrors.description = err.message;
        if (err.path[0] === 'sector') fieldErrors.sector = err.message;
        if (err.path[0] === 'country') fieldErrors.country = err.message;
      });
      setErrors(fieldErrors);
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setIsSubmitting(true);
    
    // Build description with sector and country
    const sectorLabel = SURVEY_SECTORS.find(s => s.value === sector)?.label;
    const countryLabel = COUNTRIES.find(c => c.value === country)?.label;
    const meta = [sectorLabel, countryLabel].filter(Boolean).join(' - ');
    const fullDescription = meta + (description ? `\n${description}` : '');
    
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

      setOpen(false);
      
      if (onSurveyCreated) {
        onSurveyCreated(survey, fieldsToAdd);
      }
    }
  };

  const handleTemplateSelect = (template: SurveyTemplate) => {
    if (titleRef.current && !titleRef.current.value) {
      titleRef.current.value = template.name;
    }
    if (descriptionRef.current && !descriptionRef.current.value) {
      descriptionRef.current.value = template.description;
    }
    setPendingTemplate(template);
    setPendingAIFields(null);
    checkCanSubmit();
    toast.success(`Modèle "${template.name}" sélectionné`);
  };

  const handleAIGenerate = (fields: any[]) => {
    setPendingAIFields(fields);
    setPendingTemplate(null);
    if (titleRef.current && !titleRef.current.value) {
      titleRef.current.value = 'Enquête générée par IA';
    }
    checkCanSubmit();
    toast.success(`${fields.length} questions générées par l'IA`);
  };

  const handleImportXLS = () => {
    if (!xlsUrl.trim()) {
      toast.error('Veuillez entrer une URL valide');
      return;
    }
    toast.info('Import XLSForm en cours de développement');
  };

  const handleSectorChange = (value: string) => {
    setSector(value);
    setTimeout(checkCanSubmit, 0);
  };

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setTimeout(checkCanSubmit, 0);
  };

  // Render project info fields inline (no nested component to avoid re-renders)
  const renderProjectInfoFields = () => (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
        📋 Informations du projet
      </h4>
      
      <div className="space-y-2">
        <Label htmlFor="survey-title">Nom du projet *</Label>
        <input
          id="survey-title"
          ref={titleRef}
          type="text"
          defaultValue=""
          onInput={checkCanSubmit}
          placeholder="Ex: Étude de marché Libreville"
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="survey-description">Description</Label>
        <textarea
          id="survey-description"
          ref={descriptionRef}
          defaultValue=""
          placeholder="Décrivez l'objectif de cette enquête..."
          rows={2}
          maxLength={500}
          autoComplete="off"
          spellCheck={false}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Secteur *
          </Label>
          <Select value={sector} onValueChange={handleSectorChange}>
            <SelectTrigger className={errors.sector ? 'border-destructive' : ''}>
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
          {errors.sector && (
            <p className="text-sm text-destructive">{errors.sector}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Pays *
          </Label>
          <Select value={country} onValueChange={handleCountryChange}>
            <SelectTrigger className={errors.country ? 'border-destructive' : ''}>
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
          {errors.country && (
            <p className="text-sm text-destructive">{errors.country}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Créer une enquête
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle enquête</DialogTitle>
          <DialogDescription>
            Créez votre enquête manuellement, utilisez un modèle ou générez avec l'IA.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            {renderProjectInfoFields()}
          </TabsContent>

          <TabsContent value="template" className="space-y-4 py-4">
            <TemplateSelector onSelect={handleTemplateSelect} />
            
            {pendingTemplate && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  ✓ Modèle: {pendingTemplate.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingTemplate.fields.length} questions seront ajoutées
                </p>
              </div>
            )}
            
            <Separator />
            {renderProjectInfoFields()}
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 py-4">
            <AIQuestionGenerator onGenerate={handleAIGenerate} />
            
            {pendingAIFields && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  ✓ {pendingAIFields.length} questions générées
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Remplissez les informations ci-dessous pour créer l'enquête
                </p>
              </div>
            )}
            
            <Separator />
            {renderProjectInfoFields()}
          </TabsContent>

          <TabsContent value="import" className="space-y-4 py-4">
            <div className="space-y-4">
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
            </div>
            
            <Separator />
            {renderProjectInfoFields()}
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
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !canSubmit}
          >
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