import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

import authBg from '@/assets/auth-data-collection.jpg';
import logo from '@/assets/youcollect-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { ACTIVITY_SECTORS, getDefaultNameForCountry } from '@/data/accountConfig';

// Country codes mapping
const COUNTRY_CODES: Record<string, string> = {
  TG: '+228', // Togo
  FR: '+33',  // France
  CI: '+225', // Côte d'Ivoire
  SN: '+221', // Sénégal
  BJ: '+229', // Bénin
  BF: '+226', // Burkina Faso
  ML: '+223', // Mali
  NE: '+227', // Niger
  GN: '+224', // Guinée
  CM: '+237', // Cameroun
  CD: '+243', // RD Congo
  CG: '+242', // Congo
  GA: '+241', // Gabon
  MG: '+261', // Madagascar
  MA: '+212', // Maroc
  DZ: '+213', // Algérie
  TN: '+216', // Tunisie
  BE: '+32',  // Belgique
  CH: '+41',  // Suisse
  CA: '+1',   // Canada
  US: '+1',   // USA
  GB: '+44',  // UK
};

const emailSchema = z.object({
  email: z.string().trim().email({ message: 'Email invalide' }),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' }),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }),
  organization: z
    .string()
    .trim()
    .min(2, { message: "L'organisation est requise" })
    .max(120, { message: "L'organisation est trop longue" }),
  sector: z.string().min(1, { message: 'Le secteur est requis' }),
  phone: z
    .string()
    .trim()
    .min(6, { message: 'Téléphone invalide' })
    .max(32, { message: 'Téléphone trop long' }),
});

type LoginForm = z.infer<typeof loginSchema>;

type SignupForm = z.infer<typeof signupSchema>;

type FormData = LoginForm & Partial<SignupForm>;

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, resetPassword, loading } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryDetected, setCountryDetected] = useState<string | null>(null);
  const [defaultName, setDefaultName] = useState('Jean Dupont');

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    fullName: '',
    organization: '',
    sector: '',
    phone: '+228', // Default Togo country code
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeSchema = useMemo(() => (isLogin ? loginSchema : signupSchema), [isLogin]);

  // Auto-detect country code via IP geolocation
  const detectCountryCode = useCallback(async () => {
    if (countryDetected) return;
    
    try {
      const response = await fetch('https://ipapi.co/json/', { 
        signal: AbortSignal.timeout(5000) 
      });
      
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code;
        
        if (countryCode) {
          setCountryDetected(countryCode);
          setDefaultName(getDefaultNameForCountry(countryCode));
          
          if (COUNTRY_CODES[countryCode]) {
            setFormData(prev => ({ 
              ...prev, 
              phone: COUNTRY_CODES[countryCode] 
            }));
          }
        }
      }
    } catch {
      // Silently fail - keep default +228
      console.log('Could not detect country, using default +228');
    }
  }, [countryDetected]);

  useEffect(() => {
    detectCountryCode();
  }, [detectCountryCode]);

  useEffect(() => {
    if (user && !loading) navigate('/');
  }, [user, loading, navigate]);

  const validateForm = () => {
    const result = activeSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) newErrors[String(err.path[0])] = err.message;
    });
    setErrors(newErrors);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          const msg = String(error.message || '');
          if (msg.includes('Invalid login credentials')) {
            toast.error('Email ou mot de passe incorrect');
          } else if (msg.toLowerCase().includes('email not confirmed')) {
            toast.error("Email non confirmé. Ouvrez votre email ou utilisez 'Mot de passe oublié ?'.");
          } else {
            toast.error(msg || 'Erreur de connexion');
          }
          return;
        }
        toast.success('Connexion réussie !');
      } else {
        const sectorLabel = ACTIVITY_SECTORS.find(s => s.value === formData.sector)?.label || formData.sector;
        
        const { error } = await signUp(formData.email, formData.password, {
          fullName: String(formData.fullName || '').trim(),
          organization: `${String(formData.organization || '').trim()} (${sectorLabel})`,
          phone: String(formData.phone || '').trim(),
        });

        if (error) {
          if (String(error.message || '').includes('already registered')) {
            toast.error('Cet email est déjà utilisé');
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success('Compte créé avec succès !');
      }
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const result = emailSchema.safeParse({ email: formData.email });
    if (!result.success) {
      toast.error("Entrez d'abord un email valide");
      return;
    }

    const { error } = await resetPassword(result.data.email);
    if (error) toast.error(error.message);
    else toast.success('Lien de réinitialisation envoyé par email');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${authBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="min-h-screen bg-background/70 backdrop-blur-md flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2 mb-6 slide-up">
            <img 
              src={logo} 
              alt="Youcollect" 
              className="h-16 sm:h-24 w-auto drop-shadow-lg"
            />
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Collecte de données intelligente
            </p>
          </div>

          {/* Form Card */}
          <div
            className="w-full max-w-sm bg-card/95 backdrop-blur rounded-2xl border border-border p-4 sm:p-6 shadow-lg slide-up"
            style={{ animationDelay: '100ms' }}
          >
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1 sm:mb-2 text-center">
              {isLogin ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 text-center">
              {isLogin
                ? 'Connectez-vous pour accéder à vos enquêtes'
                : 'Inscrivez-vous pour commencer à collecter des données'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {!isLogin && (
                <>
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-foreground">Nom complet</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder={defaultName}
                        value={formData.fullName || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                        className="input-field pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                  </div>

                  {/* Organization */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-foreground">Organisation</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Ministère / ONG / Entreprise"
                        value={formData.organization || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, organization: e.target.value }))}
                        className="input-field pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                      />
                    </div>
                    {errors.organization && (
                      <p className="text-xs text-destructive">{errors.organization}</p>
                    )}
                  </div>

                  {/* Sector */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-foreground">Secteur d'activité</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground pointer-events-none z-10" />
                      <select
                        value={formData.sector || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, sector: e.target.value }))}
                        className="input-field pl-9 sm:pl-10 h-9 sm:h-10 text-sm appearance-none cursor-pointer pr-8"
                      >
                        <option value="">Sélectionner un secteur...</option>
                        {ACTIVITY_SECTORS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.sector && <p className="text-xs text-destructive">{errors.sector}</p>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-foreground">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <input
                        type="tel"
                        placeholder="+243..."
                        value={formData.phone || ''}
                        onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                        className="input-field pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="vous@exemple.com"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    className="input-field pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium text-foreground">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    className="input-field pl-9 sm:pl-10 pr-10 h-9 sm:h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : isLogin ? (
                  'Se connecter'
                ) : (
                  'Créer un compte'
                )}
              </button>

              {isLogin && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin((v) => !v);
                  setErrors({});
                }}
                className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin ? (
                  <>
                    Pas encore de compte ? <span className="text-primary font-medium">Inscrivez-vous</span>
                  </>
                ) : (
                  <>
                    Déjà un compte ? <span className="text-primary font-medium">Connectez-vous</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Youcollect - Collecte de données intelligente</p>
          <p>Mode hors ligne compatible</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
