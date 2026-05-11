import { supabase } from "@/src/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { router } from "expo-router";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  refreshSession: async () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    const { data } = await supabase.auth.getSession();

    setSession(data.session ?? null);
    setUser(data.session?.user ?? null);
  };

  useEffect(() => {
    const initSession = async () => {
      setLoading(true);

      const { data } = await supabase.auth.getSession();

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);

      setLoading(false);
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (!newSession) {
          router.replace("/login");
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
