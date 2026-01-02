import { useState } from 'react';
import { LayoutTemplate, TrendingUp, Star, Users, ArrowRight, Check, Leaf, Store, Heart, GraduationCap, Coins, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SURVEY_TEMPLATES, TEMPLATE_CATEGORIES, SurveyTemplate } from '@/data/surveyTemplates';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  onSelect: (template: SurveyTemplate) => void;
}

const categoryIcons: Record<string, any> = {
  market: TrendingUp,
  satisfaction: Star,
  census: Users,
  agriculture: Leaf,
  commerce: Store,
  health: Heart,
  education: GraduationCap,
  finance: Coins,
  other: LayoutTemplate,
};

export const TemplateSelector = ({ onSelect }: TemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      setOpen(false);
      setSelectedTemplate(null);
      setSelectedCategory(null);
      setSearchQuery('');
    }
  };

  const filteredTemplates = SURVEY_TEMPLATES.filter(template => {
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <LayoutTemplate className="h-4 w-4 mr-2" />
          Utiliser un modèle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Modèles d'enquêtes
          </DialogTitle>
          <DialogDescription>
            Choisissez un modèle adapté à votre secteur d'activité
          </DialogDescription>
        </DialogHeader>

        {/* Search and filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              Tous
            </Badge>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <Badge
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat.value)}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-3 py-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LayoutTemplate className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun modèle trouvé</p>
              </div>
            ) : (
              filteredTemplates.map((template) => {
                const CategoryIcon = categoryIcons[template.category] || LayoutTemplate;
                const isSelected = selectedTemplate?.id === template.id;
                const categoryInfo = TEMPLATE_CATEGORIES.find(c => c.value === template.category);
                
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
                              {categoryInfo?.label || template.category}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {template.fields.length} questions
                        </Badge>
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
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
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
