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
import { ScrollArea } from '@/components/ui/scroll-area';

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
        <Button variant="outline" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm">
          <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
          {currentTemplate ? (
            <>
              <span className="text-base sm:text-lg">{currentTemplate.preview}</span>
              <span className="hidden sm:inline truncate max-w-[80px]">{currentTemplate.name}</span>
            </>
          ) : (
            <span className="hidden xs:inline">Design</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl mx-auto p-3 sm:p-4 max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Palette className="h-4 w-4 text-primary" />
            Choisir un template
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-3 px-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pb-2">
            {FORM_DESIGN_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className={cn(
                  'relative p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left group hover:shadow-md',
                  selectedTemplate === template.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {/* Preview */}
                <div 
                  className="h-14 sm:h-20 rounded-md mb-2 flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `hsl(${template.styles.backgroundColor})`,
                  }}
                >
                  <div 
                    className="w-10 h-6 sm:w-14 sm:h-8 rounded flex items-center justify-center shadow-sm"
                    style={{
                      backgroundColor: `hsl(${template.styles.cardBackground})`,
                      borderRadius: template.styles.borderRadius,
                    }}
                  >
                    <div 
                      className="w-6 h-2 sm:w-8 sm:h-3 rounded-sm"
                      style={{
                        backgroundColor: `hsl(${template.styles.primaryColor})`,
                        borderRadius: template.styles.borderRadius,
                      }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-sm sm:text-base">{template.preview}</span>
                    <h4 className="font-medium text-[10px] sm:text-xs text-foreground truncate">{template.name}</h4>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                </div>

                {/* Selected indicator */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};