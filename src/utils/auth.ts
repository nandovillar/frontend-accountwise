import { supabase } from "@/src/lib/supabase";

export const getCurrentUser = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
};
