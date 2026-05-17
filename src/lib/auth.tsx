import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "admin" | "client";
export interface Profile {
  id: string;
  email: string;
  role: Role;
  client_id: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const profileQuery = supabase
        .from("profiles")
        .select("id,email,role,client_id")
        .eq("id", userId)
        .maybeSingle();

      const result = await Promise.race([
        profileQuery,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile request timed out")), 5000),
        ),
      ]);

      const { data, error } = result as Awaited<typeof profileQuery>;
      if (error) {
        console.error("Failed to load profile", error);
        setProfile(null);
        return;
      }

      setProfile((data as Profile) ?? null);
    } catch (error) {
      console.error("Failed to load profile", error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          if (mounted) void loadProfile(s.user.id);
        }, 0);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!mounted) return;
        setSession(s);
        setLoading(false);
        if (s?.user) void loadProfile(s.user.id);
        else {
          setProfile(null);
          setProfileLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to restore auth session", error);
        if (!mounted) return;
        setSession(null);
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
      });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshProfile = async () => { if (session?.user) await loadProfile(session.user.id); };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, loading, profileLoading, signIn, signOut, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
