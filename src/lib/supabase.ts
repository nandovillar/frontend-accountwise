import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = "https://zarozbzicgteiouvkiwy.supabase.co";
const supabaseKey = "sb_publishable_XEJm4I6n8Fn5PoiYsGh4xw_SIVOfYE4";

const memoryStorage = new Map<string, string>();

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      return memoryStorage.get(key) ?? null;
    }

    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      memoryStorage.set(key, value);
      return;
    }

    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined" || !window.localStorage) {
      memoryStorage.delete(key);
      return;
    }

    window.localStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: Platform.OS === "web" ? webStorage : AsyncStorage,
  },
});
