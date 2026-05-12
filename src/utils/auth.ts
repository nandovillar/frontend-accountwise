import { supabase } from "@/src/lib/supabase";

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const getCurrentUser = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return session.user;
    }

    await wait(120);
  }

  return null;
};
