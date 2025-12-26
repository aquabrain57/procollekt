import { useState } from 'react';
import { Plus, ArrowRight, LayoutTemplate, Sparkles } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import { DbSurvey } from '@/hooks/useSurveys';
import { TemplateSelector } from '@/components/TemplateSelector';
import { AIQuestionGenerator } from '@/components/AIQuestionGenerator';
import { SurveyTemplate } from '@/data/surveyTemplates';

const surveySchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(100),
  description: z.string().max(500).optional(),
});

interface CreateSurveyDialogProps {
  onSubmit: (title: string, description: string) => Promise<DbSurvey | null>;
  onSurveyCreated?: (survey: DbSurvey) => void;
}

export const CreateSurveyDialog = ({ onSubmit, onSurveyCreated }: CreateSurveyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SurveyTemplate | null>(null);
  const [pendingAIFields, setPendingAIFields] = useState<any[] | null>(null);

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
    const survey = await onSubmit(title, description);
    setIsSubmitting(false);

    if (survey) {
      setTitle('');
      setDescription('');
      setOpen(false);
      setPendingTemplate(null);
      setPendingAIFields(null);
      
      if (onSurveyCreated) {
        onSurveyCreated(survey);
      }
    }
  };

  const handleTemplateSelect = (template: SurveyTemplate) => {
    setTitle(template.name);
    setDescription(template.description);
    setPendingTemplate(template);
  };

  const handleAIGenerate = (fields: any[]) => {
    setPendingAIFields(fields);
  };

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
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'enquête *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Étude de marché agricole"
                maxLength={100}
                className="text-base"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez l'objectif de cette enquête..."
                rows={3}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="template" className="py-4">
            <TemplateSelector onSelect={handleTemplateSelect} />
            {pendingTemplate && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  Modèle sélectionné: {pendingTemplate.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingTemplate.fields.length} questions seront ajoutées
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="py-4">
            <AIQuestionGenerator onGenerate={handleAIGenerate} />
            {pendingAIFields && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  {pendingAIFields.length} questions générées par l'IA
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Créez l'enquête pour ajouter ces questions
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-medium text-foreground mb-1">Étape suivante</p>
          <p className="text-muted-foreground">
            Après avoir créé l'enquête, vous pourrez ajouter ou modifier les questions.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Création...' : (
              <>
                Créer l'enquête
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
