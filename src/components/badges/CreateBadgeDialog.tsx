import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { CreateBadgeInput, useSurveyorBadges } from '@/hooks/useSurveyorBadges';

const formSchema = z.object({
  surveyor_id: z.string().min(2, 'ID minimum 2 caractères').max(20, 'ID maximum 20 caractères'),
  first_name: z.string().min(1, 'Prénom requis').max(50),
  last_name: z.string().min(1, 'Nom requis').max(50),
  role: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  covered_zone: z.string().optional(),
  phone: z.string().optional(),
});

interface CreateBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateBadgeDialog({ open, onOpenChange, onSuccess }: CreateBadgeDialogProps) {
  const { createBadge } = useSurveyorBadges();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      surveyor_id: '',
      first_name: '',
      last_name: '',
      role: 'surveyor',
      organization: '',
      project: '',
      covered_zone: '',
      phone: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await createBadge(values as CreateBadgeInput);
      if (result) {
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un badge enquêteur
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau badge avec QR code et code-barres.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="surveyor_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>ID Enquêteur *</FormLabel>
                    <FormControl>
                      <Input placeholder="EQ001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="surveyor">Enquêteur</SelectItem>
                        <SelectItem value="supervisor">Superviseur</SelectItem>
                        <SelectItem value="team_lead">Chef d'équipe</SelectItem>
                        <SelectItem value="coordinator">Coordinateur</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input placeholder="+33 6 12 34 56 78" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Organisation</FormLabel>
                    <FormControl>
                      <Input placeholder="ONG / Entreprise" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Projet</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du projet" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="covered_zone"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Zone couverte</FormLabel>
                    <FormControl>
                      <Input placeholder="Région / Ville" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le badge
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
