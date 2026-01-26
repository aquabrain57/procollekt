import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, User, Building2, MapPin, Users, Camera } from 'lucide-react';
import { CreateBadgeInput, useSurveyorBadges } from '@/hooks/useSurveyorBadges';
import { BadgePhotoUpload } from './BadgePhotoUpload';

const formSchema = z.object({
  surveyor_id: z.string().min(2, 'ID minimum 2 caractères').max(20, 'ID maximum 20 caractères'),
  first_name: z.string().min(1, 'Prénom requis').max(50),
  last_name: z.string().min(1, 'Nom requis').max(50),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  covered_zone: z.string().optional(),
  organization: z.string().optional(),
  organization_email: z.string().email('Email invalide').optional().or(z.literal('')),
  organization_phone: z.string().optional(),
  organization_address: z.string().optional(),
  project: z.string().optional(),
  supervisor_id: z.string().optional(),
  supervisor_name: z.string().optional(),
});

interface CreateBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateBadgeDialog({ open, onOpenChange, onSuccess }: CreateBadgeDialogProps) {
  const { createBadge, badges } = useSurveyorBadges();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Get supervisors from existing badges
  const supervisors = badges.filter(b => b.role === 'supervisor' || b.role === 'team_lead' || b.role === 'coordinator');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      surveyor_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'surveyor',
      address: '',
      city: '',
      country: '',
      covered_zone: '',
      organization: '',
      organization_email: '',
      organization_phone: '',
      organization_address: '',
      project: '',
      supervisor_id: '',
      supervisor_name: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await createBadge({
        ...values,
        photo_url: photoUrl,
      } as CreateBadgeInput);
      if (result) {
        form.reset();
        setPhotoUrl(null);
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupervisorChange = (supervisorId: string) => {
    const supervisor = badges.find(b => b.surveyor_id === supervisorId);
    if (supervisor) {
      form.setValue('supervisor_id', supervisor.surveyor_id);
      form.setValue('supervisor_name', `${supervisor.first_name} ${supervisor.last_name}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un badge enquêteur
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations complètes pour créer un badge avec QR code professionnel.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="photo" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="photo" className="text-xs">
                  <Camera className="w-3 h-3 mr-1" />
                  Photo
                </TabsTrigger>
                <TabsTrigger value="personal" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  Personnel
                </TabsTrigger>
                <TabsTrigger value="location" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  Localisation
                </TabsTrigger>
                <TabsTrigger value="organization" className="text-xs">
                  <Building2 className="w-3 h-3 mr-1" />
                  Organisation
                </TabsTrigger>
                <TabsTrigger value="hierarchy" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Hiérarchie
                </TabsTrigger>
              </TabsList>

              {/* Photo Tab */}
              <TabsContent value="photo" className="space-y-4 mt-4">
                <div className="flex flex-col items-center">
                  <BadgePhotoUpload
                    photoUrl={photoUrl}
                    onPhotoChange={setPhotoUrl}
                    firstName={form.watch('first_name')}
                    lastName={form.watch('last_name')}
                  />
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Ajoutez une photo de l'enquêteur pour le badge. 
                    Cette photo sera visible sur le badge imprimé et dans le profil.
                  </p>
                </div>
              </TabsContent>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="jean@example.com" {...field} />
                        </FormControl>
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
                    name="role"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Rôle dans l'enquête</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="surveyor">Enquêteur</SelectItem>
                            <SelectItem value="supervisor">Superviseur</SelectItem>
                            <SelectItem value="team_lead">Chef d'équipe</SelectItem>
                            <SelectItem value="coordinator">Coordinateur</SelectItem>
                            <SelectItem value="data_collector">Collecteur de données</SelectItem>
                            <SelectItem value="field_agent">Agent de terrain</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Location Tab */}
              <TabsContent value="location" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Adresse</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Rue Exemple" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input placeholder="Paris" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input placeholder="France" {...field} />
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
                          <Input placeholder="Région / District / Quartier" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Organization Tab */}
              <TabsContent value="organization" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nom de l'organisation</FormLabel>
                        <FormControl>
                          <Input placeholder="ONG / Entreprise / Institution" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organization_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email organisation</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@org.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organization_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone organisation</FormLabel>
                        <FormControl>
                          <Input placeholder="+33 1 23 45 67 89" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="organization_address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Adresse organisation</FormLabel>
                        <FormControl>
                          <Input placeholder="Siège social" {...field} />
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
                        <FormLabel>Projet / Enquête</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du projet ou de l'enquête" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Hierarchy Tab */}
              <TabsContent value="hierarchy" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {supervisors.length > 0 ? (
                    <FormField
                      control={form.control}
                      name="supervisor_id"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Superviseur</FormLabel>
                          <Select onValueChange={handleSupervisorChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un superviseur" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {supervisors.map((sup) => (
                                <SelectItem key={sup.id} value={sup.surveyor_id}>
                                  {sup.first_name} {sup.last_name} ({sup.surveyor_id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="supervisor_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID Superviseur</FormLabel>
                            <FormControl>
                              <Input placeholder="SUP001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="supervisor_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom du superviseur</FormLabel>
                            <FormControl>
                              <Input placeholder="Marie Martin" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="col-span-2 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 Conseil: Créez d'abord les badges des superviseurs pour pouvoir les lier aux enquêteurs.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
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
