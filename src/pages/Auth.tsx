import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' }),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse(formData);
      } else {
        signupSchema.parse(formData);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou mot de passe incorrect');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Connexion réussie !');
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Cet email est déjà utilisé');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Compte créé avec succès !');
        }
      }
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 slide-up">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <ClipboardList className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">WooCollekt IA</h1>
            <p className="text-sm text-muted-foreground">Collecte de données intelligente</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 shadow-lg slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
            {isLogin ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            {isLogin
              ? 'Connectez-vous pour accéder à vos enquêtes'
              : 'Inscrivez-vous pour commencer à collecter des données'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Signup only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Jean Dupont"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="input-field pl-10"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLogin ? (
                'Se connecter'
              ) : (
                'Créer un compte'
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>
                  Pas encore de compte ?{' '}
                  <span className="text-primary font-medium">Inscrivez-vous</span>
                </>
              ) : (
                <>
                  Déjà un compte ?{' '}
                  <span className="text-primary font-medium">Connectez-vous</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-sm text-muted-foreground">
        <p>WooCollekt IA - Collecte de données intelligente</p>
        <p>Mode hors ligne compatible</p>
      </div>
    </div>
  );
};

export default Auth;
