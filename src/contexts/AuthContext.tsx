import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    profile: { fullName: string; organization?: string; phone?: string }
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>; 
  resetPassword: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = async (u: User) => {
    try {
      const meta = (u.user_metadata || {}) as Record<string, any>;
      const fullName = typeof meta.full_name === 'string' ? meta.full_name : null;
      const organization = typeof meta.organization === 'string' ? meta.organization : null;
      const phone = typeof meta.phone === 'string' ? meta.phone : null;

      // Upsert is safe; RLS requires auth.uid() = user_id, so only run when session exists.
      await supabase.from('profiles').upsert(
        {
          user_id: u.id,
          full_name: fullName,
          organization,
          phone,
        },
        { onConflict: 'user_id' }
      );
    } catch {
      // Do not block auth flows if profile write fails
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Defer profile creation/update to avoid auth deadlocks.
      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user);
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => {
          ensureProfile(session.user);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    profile: { fullName: string; organization?: string; phone?: string }
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: profile.fullName,
          organization: profile.organization,
          phone: profile.phone,
        },
      },
    });

    if (error) return { error };

    // IMPORTANT: Only write to profiles when a session exists.
    // Otherwise (email confirmation flows), auth.uid() is null and RLS will reject the upsert.
    if (data?.session?.user) {
      await ensureProfile(data.session.user);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    resetPassword,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
