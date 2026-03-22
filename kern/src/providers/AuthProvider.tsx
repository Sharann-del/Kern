import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { EMAIL_ALREADY_REGISTERED_MESSAGE } from '@/lib/authMessages';
import { supabase } from '@/lib/supabase';
import type { KernProfile } from '@/types/kern';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function mapPreferences(raw: unknown): KernProfile['preferences'] {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const theme = o.theme === 'dark' ? 'dark' : 'light';
  const sidebar_collapsed = Boolean(o.sidebar_collapsed);
  return { theme, sidebar_collapsed };
}

function mapProfile(row: ProfileRow): KernProfile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    preferences: mapPreferences(row.preferences),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

type AuthContextValue = {
  user: User | null;
  profile: KernProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (
    data: Partial<Pick<KernProfile, 'full_name' | 'avatar_url' | 'preferences'>>
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Supabase may return a fake user (no identities) when re-signing up with a confirmed email while email+phone confirm are both on. */
function isObfuscatedDuplicateSignupUser(user: User | null): boolean {
  if (!user) return false;
  return Array.isArray(user.identities) && user.identities.length === 0;
}

function isDuplicateRegistrationError(error: { message: string; code?: string }): boolean {
  const code = error.code ?? '';
  if (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    code === 'identity_already_exists'
  ) {
    return true;
  }
  const msg = error.message.toLowerCase();
  return (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists') ||
    msg.includes('email address is already') ||
    msg.includes('email already')
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<KernProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (data) setProfile(mapProfile(data));
    else setProfile(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (sessionUser: User | null) => {
      if (cancelled) return;
      setUser(sessionUser);
      if (sessionUser) {
        try {
          await loadProfile(sessionUser.id);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const redirectTo = `${window.location.origin}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName ?? undefined,
        },
      },
    });
    if (error) {
      if (isDuplicateRegistrationError(error)) {
        throw new Error(EMAIL_ALREADY_REGISTERED_MESSAGE);
      }
      throw error;
    }

    if (data.session) {
      return { needsEmailConfirmation: false };
    }

    if (isObfuscatedDuplicateSignupUser(data.user)) {
      throw new Error(EMAIL_ALREADY_REGISTERED_MESSAGE);
    }

    return { needsEmailConfirmation: true };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(
    async (data: Partial<Pick<KernProfile, 'full_name' | 'avatar_url' | 'preferences'>>) => {
      if (!user) throw new Error('Not authenticated');
      const patch: Record<string, unknown> = {};
      if (data.full_name !== undefined) patch.full_name = data.full_name;
      if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
      if (data.preferences !== undefined) {
        const base = profile?.preferences ?? {
          theme: 'light' as const,
          sidebar_collapsed: false,
        };
        patch.preferences = {
          ...base,
          ...data.preferences,
        };
      }
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (error) throw error;
      await loadProfile(user.id);
    },
    [user, profile, loadProfile]
  );

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
