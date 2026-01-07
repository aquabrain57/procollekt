import { useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FORM_DESIGN_TEMPLATES, FormDesignTemplate } from '@/data/formDesignTemplates';
import { cn } from '@/lib/utils';

interface FormDesignSelectorProps {
  selectedTemplate: string;
  onSelect: (template: FormDesignTemplate) => void;
}

export const FormDesignSelector = ({ selectedTemplate, onSelect }: FormDesignSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (template: FormDesignTemplate) => {
    onSelect(template);
    setOpen(false);
  };

  const currentTemplate = FORM_DESIGN_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          {currentTemplate ? (
            <>
              <span>{currentTemplate.preview}</span>
              <span className="hidden sm:inline">{currentTemplate.name}</span>
            </>
          ) : (
            'Choisir un design'
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Choisir un template de design
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FORM_DESIGN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-all duration-200 text-left group hover:shadow-lg',
                  selectedTemplate === template.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {/* Preview */}
                <div 
                  className="h-24 rounded-lg mb-3 flex items-center justify-center text-4xl transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `hsl(${template.styles.backgroundColor})`,
                  }}
                >
                  <div 
                    className="w-16 h-8 rounded flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: `hsl(${template.styles.cardBackground})`,
                      borderRadius: template.styles.borderRadius,
                    }}
                  >
                    <div 
                      className="w-8 h-3 rounded-sm"
                      style={{
                        backgroundColor: `hsl(${template.styles.primaryColor})`,
                        borderRadius: template.styles.borderRadius,
                      }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{template.preview}</span>
                    <h4 className="font-semibold text-foreground">{template.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>

                {/* Selected indicator */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}

                {/* Style badges */}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                    {template.styles.inputStyle}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                    {template.styles.buttonStyle}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
