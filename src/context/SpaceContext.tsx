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

type SpaceContextType = {
  activeSpace: AppSpace;
  activeSpaceId: string | null;
  spaces: AppSpace[];
  sharedAvailable: boolean;
  unreadCount: number;
  createSharedSpace: (name: string) => Promise<string | null>;
  inviteMemberByEmail: (email: string) => Promise<string | null>;
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
  spaces: [personalSpace],
  sharedAvailable: false,
  unreadCount: 0,
  createSharedSpace: async () => null,
  inviteMemberByEmail: async () => null,
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

  const refreshSpaces = useCallback(async () => {
    if (!user) {
      setSpaces([personalSpace]);
      setActiveSpaceId(null);
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

    if (error) return error.message;

    await recordActivity(
      "member_invited",
      "space",
      activeSpaceId,
      `Se invito a ${cleanEmail} al espacio compartido.`,
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
  };

  const markActiveSpaceSeen = async () => {
    if (!user || !activeSpaceId) return;

    await supabase.from("space_member_reads").upsert({
      space_id: activeSpaceId,
      user_id: user.id,
      last_seen_at: new Date().toISOString(),
    });

    setUnreadCount(0);
  };

  useEffect(() => {
    refreshSpaces();
  }, [refreshSpaces]);

  useEffect(() => {
    loadUnreadCount(activeSpaceId);
  }, [activeSpaceId, loadUnreadCount]);

  return (
    <SpaceContext.Provider
      value={{
        activeSpace,
        activeSpaceId,
        spaces,
        sharedAvailable,
        unreadCount,
        createSharedSpace,
        inviteMemberByEmail,
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
