import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { StaffProfile } from '../lib/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: StaffProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string, currentUser?: User | null) {
    const u = currentUser ?? user;
    const isAshen = u?.email ? u.email.toLowerCase().includes('ashen') : false;

    // Immediately pre-seed Ashen's profile so the user enters immediately
    if (isAshen) {
      setProfile({
        id: userId,
        full_name: u?.user_metadata?.full_name || 'Ashen',
        email: u?.email || 'ashenperera550@gmail.com',
        role: 'super_admin',
        status: 'approved',
        created_at: new Date().toISOString(),
      });
    }

    const fetchTask = async () => {
      let { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // If not found by ID, try finding by email
      if (!data && u?.email) {
        try {
          const byEmail = await supabase
            .from('staff_profiles')
            .select('*')
            .eq('email', u.email)
            .maybeSingle();

          if (byEmail?.data) {
            data = byEmail.data;
          }
        } catch {
          // ignore
        }
      }

      if (data) {
        if (isAshen && (data.role !== 'super_admin' || data.status !== 'approved')) {
          data = { ...data, role: 'super_admin', status: 'approved', email: u?.email || data.email };
          try {
            await supabase.from('staff_profiles').update({ role: 'super_admin', status: 'approved', email: u?.email }).eq('id', data.id);
          } catch {
            await supabase.from('staff_profiles').update({ role: 'super_admin', status: 'approved' }).eq('id', data.id);
          }
        } else if (u?.email && !data.email) {
          try {
            await supabase.from('staff_profiles').update({ email: u.email }).eq('id', data.id);
            data.email = u.email;
          } catch {
            // column may not exist yet
          }
        }
        setProfile(data);
        return;
      }

      if (error) {
        console.warn('loadProfile query error:', error.message);
      }

      // Fallback: If no profile found in database table, attempt creation
      let isFirst = isAshen;
      if (!isFirst) {
        try {
          const { count } = await supabase
            .from('staff_profiles')
            .select('*', { count: 'exact', head: true });
          isFirst = (count === 0);
        } catch {
          // ignore
        }
      }

      const role = (isFirst || isAshen) ? 'super_admin' : 'consultant';
      const status = (isFirst || isAshen) ? 'approved' : 'pending';
      const fullName = u?.user_metadata?.full_name || (isAshen ? 'Ashen' : u?.email?.split('@')[0] || 'Staff Member');

      const fallback: StaffProfile = {
        id: userId,
        full_name: fullName,
        email: u?.email,
        role,
        status,
        created_at: new Date().toISOString(),
      };

      try {
        await supabase.from('staff_profiles').upsert(fallback);
      } catch (upsertErr) {
        console.warn('Upsert fallback with email failed, retrying without email:', upsertErr);
        const { email: _, ...withoutEmail } = fallback;
        await supabase.from('staff_profiles').upsert(withoutEmail);
      }
      setProfile(fallback);
    };

    try {
      await Promise.race([
        fetchTask(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 2500))
      ]);
    } catch (err) {
      console.warn('loadProfile completed with fallback:', err);
    }
  }

  async function refreshProfile() {
    if (user?.id) {
      await loadProfile(user.id, user);
    } else {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        await loadProfile(data.session.user.id, data.session.user);
      }
    }
  }

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Never stay stuck in loading for more than 2 seconds
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2000);

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id, session.user);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (isMounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await loadProfile(newSession.user.id, newSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await loadProfile(data.user.id, data.user);
    }
    return { error: null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) return { error: error.message };

    if (data.user) {
      // Let PostgreSQL trigger assign role and status, then fetch
      await loadProfile(data.user.id, data.user);
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, refreshProfile, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
