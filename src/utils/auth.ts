import { supabase } from "@/src/lib/supabase";

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const withTimeout = async <T>(task: Promise<T>, milliseconds = 2500) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("No se pudo comprobar la sesión.")),
      milliseconds,
    );
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const getCurrentUser = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const {
        data: { session },
      } = await withTimeout(supabase.auth.getSession());

      if (session?.user) {
        return session.user;
      }
    } catch {
      return null;
    }

    await wait(120);
  }

  return null;
};
