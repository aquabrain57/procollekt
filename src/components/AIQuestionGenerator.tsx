import { useState } from 'react';
import { Sparkles, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedField {
  field_type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  min_value?: number;
  max_value?: number;
}

interface AIQuestionGeneratorProps {
  onGenerate: (fields: GeneratedField[]) => void;
}

export const AIQuestionGenerator = ({ onGenerate }: AIQuestionGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Veuillez décrire votre enquête');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-survey-questions', {
        body: { prompt: prompt.trim() },
      });

      if (error) {
        throw error;
      }

      if (data?.questions && Array.isArray(data.questions)) {
        onGenerate(data.questions);
        setOpen(false);
        setPrompt('');
        toast.success(`${data.questions.length} questions générées avec succès !`);
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err: any) {
      console.error('Error generating questions:', err);
      if (err.message?.includes('429')) {
        setError('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
      } else if (err.message?.includes('402')) {
        setError('Crédits insuffisants. Veuillez recharger votre compte.');
      } else {
        setError('Erreur lors de la génération. Veuillez réessayer.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const examplePrompts = [
    "Une enquête pour évaluer la satisfaction des clients d'un restaurant",
    "Un questionnaire pour une étude de marché sur les produits agricoles",
    "Un formulaire de recensement pour un village",
    "Une enquête sur les habitudes de consommation alimentaire",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 hover:border-primary/40">
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          Générer avec l'IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Génération IA
          </DialogTitle>
          <DialogDescription>
            Décrivez le type d'enquête que vous souhaitez créer et l'IA générera les questions automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Je veux créer une enquête de satisfaction pour un service de livraison. Je veux mesurer la qualité du service, les délais, et recueillir des suggestions d'amélioration..."
            rows={5}
            className="resize-none"
            disabled={isGenerating}
          />

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Exemples de demandes :</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(example)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isGenerating}
                >
                  {example.slice(0, 40)}...
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer les questions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
