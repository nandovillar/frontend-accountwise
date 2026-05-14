import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";

export type AppSpace = {
  id: string | null;
  name: string;
  type: "personal" | "shared";
  role?: "owner" | "member";
};

export type SpaceActivity = {
  id: string;
  message: string;
  created_at: string;
  actor_user_id?: string;
  type?: string;
};

type SpaceContextType = {
  activeSpace: AppSpace;
  activeSpaceId: string | null;
  recentActivity: SpaceActivity[];
  spaces: AppSpace[];
  sharedAvailable: boolean;
  unreadCount: number;
  createSharedSpace: (name: string) => Promise<string | null>;
  inviteMemberByEmail: (email: string) => Promise<string | null>;
  refreshActivity: () => Promise<void>;
  refreshSpaces: () => Promise<void>;
  recordActivity: (
    type: string,
    entityType: string,
    entityId: string | null,
    message: string,
  ) => Promise<void>;
  selectSpace: (spaceId: string | null) => Promise<void>;
  markActiveSpaceSeen: () => Promise<void>;
};

const personalSpace: AppSpace = {
  id: null,
  name: "Personal",
  type: "personal",
  role: "owner",
};

const SpaceContext = createContext<SpaceContextType>({
  activeSpace: personalSpace,
  activeSpaceId: null,
  recentActivity: [],
  spaces: [personalSpace],
  sharedAvailable: false,
  unreadCount: 0,
  createSharedSpace: async () => null,
  inviteMemberByEmail: async () => null,
  refreshActivity: async () => {},
  refreshSpaces: async () => {},
  recordActivity: async () => {},
  selectSpace: async () => {},
  markActiveSpaceSeen: async () => {},
});

const getActiveSpaceStorageKey = (userId: string) => {
  return `accountwise:active-space:${userId}`;
};

export function SpaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<AppSpace[]>([personalSpace]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<SpaceActivity[]>([]);
  const [sharedAvailable, setSharedAvailable] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const activeSpace = useMemo(() => {
    return spaces.find((space) => space.id === activeSpaceId) || personalSpace;
  }, [activeSpaceId, spaces]);

  const loadUnreadCount = useCallback(async (spaceId: string | null) => {
    if (!user || !spaceId) {
      setUnreadCount(0);
      return;
    }

    const { data: readState } = await supabase
      .from("space_member_reads")
      .select("last_seen_at")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    let query = supabase
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("space_id", spaceId)
      .neq("actor_user_id", user.id);

    if (readState?.last_seen_at) {
      query = query.gt("created_at", readState.last_seen_at);
    }

    const { count } = await query;
    setUnreadCount(count || 0);
  }, [user]);

  const loadActivityForSpace = useCallback(async (spaceId: string | null) => {
    if (!user || !spaceId) {
      setRecentActivity([]);
      return;
    }

    const { data } = await supabase
      .from("activity_events")
      .select("id, message, created_at, actor_user_id, type")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentActivity(data || []);
  }, [user]);

  const refreshActivity = useCallback(async () => {
    await loadActivityForSpace(activeSpaceId);
  }, [activeSpaceId, loadActivityForSpace]);

  const refreshSpaces = useCallback(async () => {
    if (!user) {
      setSpaces([personalSpace]);
      setActiveSpaceId(null);
      setRecentActivity([]);
      setSharedAvailable(false);
      setUnreadCount(0);
      return;
    }

    const { data, error } = await supabase
      .from("space_members")
      .select("role, spaces(id, name, type)")
      .eq("user_id", user.id);

    if (error) {
      setSpaces([personalSpace]);
      setActiveSpaceId(null);
      setRecentActivity([]);
      setSharedAvailable(false);
      return;
    }

    const sharedSpaces =
      data
        ?.map((item: any) => item.spaces && { ...item.spaces, role: item.role })
        .filter(Boolean)
        .filter((space: AppSpace) => space.type === "shared") || [];

    const nextSpaces = [personalSpace, ...sharedSpaces];
    setSpaces(nextSpaces);
    setSharedAvailable(true);

    const storedSpaceId = await AsyncStorage.getItem(
      getActiveSpaceStorageKey(user.id),
    );
    const nextActiveId = nextSpaces.some((space) => space.id === storedSpaceId)
      ? storedSpaceId
      : null;

    setActiveSpaceId(nextActiveId);
    await loadUnreadCount(nextActiveId);
  }, [loadUnreadCount, user]);

  const selectSpace = async (spaceId: string | null) => {
    if (!user) return;

    setActiveSpaceId(spaceId);

    if (spaceId) {
      await AsyncStorage.setItem(getActiveSpaceStorageKey(user.id), spaceId);
    } else {
      await AsyncStorage.removeItem(getActiveSpaceStorageKey(user.id));
    }

    await loadUnreadCount(spaceId);
    await loadActivityForSpace(spaceId);
  };

  const createSharedSpace = async (name: string) => {
    if (!user) return "No hay usuario activo.";

    const cleanName = name.trim();
    if (!cleanName) return "Pon un nombre para el espacio.";

    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .insert({
        name: cleanName,
        type: "shared",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (spaceError || !space) {
      return spaceError?.message || "No se pudo crear el espacio.";
    }

    const { error: memberError } = await supabase.from("space_members").insert({
      space_id: space.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) return memberError.message;

    await refreshSpaces();
    await selectSpace(space.id);
    return null;
  };

  const inviteMemberByEmail = async (email: string) => {
    if (!user || !activeSpaceId) return "Selecciona un espacio compartido.";

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return "Introduce un email.";

    const { error } = await supabase.rpc("add_space_member_by_email", {
      target_space_id: activeSpaceId,
      target_email: cleanEmail,
    });

    if (error) {
      const message = error.message.toLowerCase();

      if (
        message.includes("no existe") ||
        message.includes("not found") ||
        message.includes("no rows")
      ) {
        return "No existe ninguna cuenta con ese email. Primero debe crear una cuenta en AccountWise.";
      }

      if (message.includes("acceso") || message.includes("permission")) {
        return "No tienes permisos para invitar usuarios a este espacio.";
      }

      if (message.includes("schema cache") || message.includes("function")) {
        return "Supabase todavía no ha actualizado la función de invitación. Recarga el schema y prueba de nuevo.";
      }

      return `No se pudo añadir el usuario: ${error.message}`;
    }

    await recordActivity(
      "member_invited",
      "space",
      activeSpaceId,
      `Se invitó a ${cleanEmail} al espacio compartido.`,
    );
    return null;
  };

  const recordActivity = async (
    type: string,
    entityType: string,
    entityId: string | null,
    message: string,
  ) => {
    if (!user || !activeSpaceId) return;

    await supabase.from("activity_events").insert({
      space_id: activeSpaceId,
      actor_user_id: user.id,
      type,
      entity_type: entityType,
      entity_id: entityId,
      message,
    });

    await loadUnreadCount(activeSpaceId);
    await refreshActivity();
  };

  const markActiveSpaceSeen = async () => {
    if (!user || !activeSpaceId) return;

    await supabase.from("space_member_reads").upsert({
      space_id: activeSpaceId,
      user_id: user.id,
      last_seen_at: new Date().toISOString(),
    });

    setUnreadCount(0);
    await refreshActivity();
  };

  useEffect(() => {
    refreshSpaces();
  }, [refreshSpaces]);

  useEffect(() => {
    loadUnreadCount(activeSpaceId);
    loadActivityForSpace(activeSpaceId);
  }, [activeSpaceId, loadActivityForSpace, loadUnreadCount]);

  return (
    <SpaceContext.Provider
      value={{
        activeSpace,
        activeSpaceId,
        recentActivity,
        spaces,
        sharedAvailable,
        unreadCount,
        createSharedSpace,
        inviteMemberByEmail,
        refreshActivity,
        refreshSpaces,
        recordActivity,
        selectSpace,
        markActiveSpaceSeen,
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpaces() {
  return useContext(SpaceContext);
}
