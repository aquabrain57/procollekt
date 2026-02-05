 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Header } from '@/components/Header';
 import { BottomNav } from '@/components/BottomNav';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { Badge } from '@/components/ui/badge';
 import { Separator } from '@/components/ui/separator';
 import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
 } from '@/components/ui/accordion';
 import { useAuth } from '@/contexts/AuthContext';
 import { useOnlineStatus } from '@/hooks/useOnlineStatus';
 import { SyncStatus } from '@/types/survey';
 import { useTranslation } from 'react-i18next';
 import {
   HelpCircle,
   Mail,
   Phone,
   MessageCircle,
   Book,
   Video,
   FileText,
   ExternalLink,
   Send,
   Loader2,
   CheckCircle,
   Globe,
   Shield,
   Zap,
   MapPin,
 } from 'lucide-react';
 import { toast } from 'sonner';
 
 type Tab = 'home' | 'surveys' | 'data' | 'settings' | 'badges';
 
 const Help = () => {
   const navigate = useNavigate();
   const { user, loading: authLoading } = useAuth();
   const isOnline = useOnlineStatus();
   const { t } = useTranslation();
   const [activeTab, setActiveTab] = useState<Tab>('home');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [contactForm, setContactForm] = useState({
     subject: '',
     message: '',
   });
 
   const syncStatus: SyncStatus = {
     isOnline,
     pendingCount: 0,
     lastSyncAt: null,
     isSyncing: false,
   };
 
   const handleTabChange = (tab: Tab) => {
     navigate('/');
   };
 
   const handleSubmitContact = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!contactForm.subject || !contactForm.message) {
       toast.error('Veuillez remplir tous les champs');
       return;
     }
     
     setIsSubmitting(true);
     // Simulate sending
     await new Promise(resolve => setTimeout(resolve, 1500));
     setIsSubmitting(false);
     toast.success('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.');
     setContactForm({ subject: '', message: '' });
   };
 
   const faqs = [
     {
       question: 'Comment créer une nouvelle enquête ?',
       answer: 'Allez dans l\'onglet "Enquêtes", puis cliquez sur "Mes enquêtes". Utilisez le bouton "Nouvelle enquête" pour créer un formulaire. Vous pouvez ajouter des champs texte, choix multiples, dates, localisation GPS et plus encore.',
     },
     {
       question: 'Comment fonctionne le mode hors ligne ?',
       answer: 'L\'application fonctionne entièrement hors ligne. Les réponses sont sauvegardées localement et se synchronisent automatiquement dès que vous retrouvez une connexion internet. Un indicateur vous montre le nombre de réponses en attente.',
     },
     {
       question: 'Comment partager mon enquête avec des enquêteurs ?',
       answer: 'Une fois votre enquête publiée, utilisez le bouton de partage pour copier le lien ou générer un QR code. Les enquêteurs peuvent remplir le formulaire depuis n\'importe quel appareil sans avoir besoin de compte.',
     },
     {
       question: 'Comment exporter mes données collectées ?',
       answer: 'Dans l\'onglet "Données", sélectionnez votre enquête puis accédez à l\'onglet "Exports". Vous pouvez exporter en Excel, PDF, Word ou PowerPoint avec des graphiques et analyses automatiques.',
     },
     {
       question: 'Comment gérer les badges des enquêteurs ?',
       answer: 'L\'onglet "Badges" permet de créer des badges professionnels avec photo, QR code unique et suivi GPS en temps réel. Les superviseurs peuvent valider l\'identité des enquêteurs par scan.',
     },
     {
       question: 'Comment obtenir une analyse IA de mes données ?',
       answer: 'Dans la section analytique de vos données, cliquez sur "Générer un rapport IA". L\'intelligence artificielle analysera vos réponses et fournira des insights, tendances et recommandations.',
     },
   ];
 
   const features = [
     {
       icon: Globe,
       title: 'Mode hors ligne',
       description: 'Collectez des données sans connexion internet',
     },
     {
       icon: MapPin,
       title: 'Géolocalisation',
       description: 'Capturez automatiquement la position GPS',
     },
     {
       icon: Zap,
       title: 'Synchronisation rapide',
       description: 'Données synchronisées en temps réel',
     },
     {
       icon: Shield,
       title: 'Sécurité',
       description: 'Données cryptées et sécurisées',
     },
   ];
 
   if (authLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background">
       <Header
         title={t('help.title', 'Aide & Contact')}
         showBack={true}
         onBack={() => navigate('/')}
         syncStatus={syncStatus}
       />
 
       <main className="fade-in w-full max-w-none px-4 sm:px-6 lg:px-8 py-6 pb-24">
         <div className="max-w-4xl mx-auto space-y-8">
           {/* Hero Section */}
           <div className="text-center space-y-3">
             <div className="inline-flex p-4 bg-primary/10 rounded-2xl mb-2">
               <HelpCircle className="h-10 w-10 text-primary" />
             </div>
             <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
               Comment pouvons-nous vous aider ?
             </h1>
             <p className="text-muted-foreground max-w-lg mx-auto">
               Trouvez des réponses à vos questions ou contactez notre équipe de support
             </p>
           </div>
 
           {/* Quick Features */}
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {features.map((feature, idx) => {
               const Icon = feature.icon;
               return (
                 <Card key={idx} className="text-center">
                   <CardContent className="p-4">
                     <div className="inline-flex p-2 bg-primary/10 rounded-lg mb-2">
                       <Icon className="h-5 w-5 text-primary" />
                     </div>
                     <p className="font-medium text-sm text-foreground">{feature.title}</p>
                     <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                   </CardContent>
                 </Card>
               );
             })}
           </div>
 
           {/* FAQ Section */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Book className="h-5 w-5 text-primary" />
                 Questions fréquentes
               </CardTitle>
             </CardHeader>
             <CardContent>
               <Accordion type="single" collapsible className="w-full">
                 {faqs.map((faq, idx) => (
                   <AccordionItem key={idx} value={`faq-${idx}`}>
                     <AccordionTrigger className="text-left text-sm sm:text-base">
                       {faq.question}
                     </AccordionTrigger>
                     <AccordionContent className="text-muted-foreground text-sm">
                       {faq.answer}
                     </AccordionContent>
                   </AccordionItem>
                 ))}
               </Accordion>
             </CardContent>
           </Card>
 
           {/* Resources */}
           <div className="grid sm:grid-cols-3 gap-4">
             <Card className="hover:border-primary/50 transition-colors cursor-pointer">
               <CardContent className="p-5 flex items-start gap-4">
                 <div className="p-2 bg-blue-500/10 rounded-lg">
                   <FileText className="h-5 w-5 text-blue-500" />
                 </div>
                 <div>
                   <h3 className="font-medium text-foreground">Documentation</h3>
                   <p className="text-sm text-muted-foreground mt-1">
                     Guides complets et tutoriels
                   </p>
                   <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                     Consulter <ExternalLink className="h-3 w-3 ml-1" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
 
             <Card className="hover:border-primary/50 transition-colors cursor-pointer">
               <CardContent className="p-5 flex items-start gap-4">
                 <div className="p-2 bg-purple-500/10 rounded-lg">
                   <Video className="h-5 w-5 text-purple-500" />
                 </div>
                 <div>
                   <h3 className="font-medium text-foreground">Tutoriels vidéo</h3>
                   <p className="text-sm text-muted-foreground mt-1">
                     Apprenez visuellement
                   </p>
                   <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                     Regarder <ExternalLink className="h-3 w-3 ml-1" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
 
             <Card className="hover:border-primary/50 transition-colors cursor-pointer">
               <CardContent className="p-5 flex items-start gap-4">
                 <div className="p-2 bg-green-500/10 rounded-lg">
                   <MessageCircle className="h-5 w-5 text-green-500" />
                 </div>
                 <div>
                   <h3 className="font-medium text-foreground">Communauté</h3>
                   <p className="text-sm text-muted-foreground mt-1">
                     Échangez avec d'autres utilisateurs
                   </p>
                   <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                     Rejoindre <ExternalLink className="h-3 w-3 ml-1" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
           </div>
 
           <Separator />
 
           {/* Contact Form */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Mail className="h-5 w-5 text-primary" />
                 Nous contacter
               </CardTitle>
             </CardHeader>
             <CardContent>
               <form onSubmit={handleSubmitContact} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="subject">Sujet</Label>
                   <Input
                     id="subject"
                     placeholder="Ex: Question sur les exports..."
                     value={contactForm.subject}
                     onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                   />
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="message">Message</Label>
                   <Textarea
                     id="message"
                     placeholder="Décrivez votre question ou problème..."
                     rows={5}
                     value={contactForm.message}
                     onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                   />
                 </div>
 
                 <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                   {isSubmitting ? (
                     <>
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       Envoi en cours...
                     </>
                   ) : (
                     <>
                       <Send className="h-4 w-4 mr-2" />
                       Envoyer le message
                     </>
                   )}
                 </Button>
               </form>
             </CardContent>
           </Card>
 
           {/* Contact Info */}
           <div className="grid sm:grid-cols-2 gap-4">
             <Card>
               <CardContent className="p-5 flex items-center gap-4">
                 <div className="p-3 bg-primary/10 rounded-xl">
                   <Mail className="h-6 w-6 text-primary" />
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Email</p>
                   <p className="font-medium text-foreground">support@youcollect.app</p>
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardContent className="p-5 flex items-center gap-4">
                 <div className="p-3 bg-green-500/10 rounded-xl">
                   <Phone className="h-6 w-6 text-green-500" />
                 </div>
                 <div>
                   <p className="text-sm text-muted-foreground">Téléphone</p>
                   <p className="font-medium text-foreground">+33 1 23 45 67 89</p>
                 </div>
               </CardContent>
             </Card>
           </div>
 
           {/* Support Hours */}
           <Card className="bg-muted/30">
             <CardContent className="p-5 text-center">
               <Badge variant="secondary" className="mb-3">Support</Badge>
               <p className="text-sm text-muted-foreground">
                 Notre équipe est disponible du <span className="font-medium text-foreground">lundi au vendredi</span>, de <span className="font-medium text-foreground">9h à 18h</span> (heure de Paris).
                 <br />
                 Temps de réponse moyen : <span className="font-medium text-foreground">moins de 24h</span>
               </p>
             </CardContent>
           </Card>
         </div>
       </main>
 
       {user && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
     </div>
   );
 };
 
 export default Help;