import { useState } from 'react';
import { LayoutTemplate, TrendingUp, Star, Users, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SURVEY_TEMPLATES, SurveyTemplate } from '@/data/surveyTemplates';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  onSelect: (template: SurveyTemplate) => void;
}

const categoryIcons = {
  market: TrendingUp,
  satisfaction: Star,
  census: Users,
  other: LayoutTemplate,
};

const categoryLabels = {
  market: 'Études de marché',
  satisfaction: 'Satisfaction',
  census: 'Recensement',
  other: 'Autres',
};

export const TemplateSelector = ({ onSelect }: TemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      setOpen(false);
      setSelectedTemplate(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <LayoutTemplate className="h-4 w-4 mr-2" />
          Utiliser un modèle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Modèles prédéfinis
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un modèle pour démarrer rapidement votre enquête
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {SURVEY_TEMPLATES.map((template) => {
            const CategoryIcon = categoryIcons[template.category];
            const isSelected = selectedTemplate?.id === template.id;
            
            return (
              <Card
                key={template.id}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md',
                  isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                )}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{template.icon}</div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {template.name}
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-1">
                          <CategoryIcon className="h-3 w-3" />
                          {categoryLabels[template.category]}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {template.fields.slice(0, 4).map((field, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                      >
                        {field.label.length > 20 ? field.label.slice(0, 20) + '...' : field.label}
                      </span>
                    ))}
                    {template.fields.length > 4 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                        +{template.fields.length - 4} autres
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSelect} disabled={!selectedTemplate}>
            Utiliser ce modèle
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
