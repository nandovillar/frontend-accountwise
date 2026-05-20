import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { ActionNotice } from "@/src/components/ActionNotice";
import { EmptyState } from "@/src/components/EmptyState";
import { SpaceMenuButton } from "@/src/components/SpaceSwitcher";
import { useSpaces } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";
import { confirmAction } from "@/src/utils/confirmAction";

type ListOption = {
  id: string;
  text: string;
  hidden: boolean;
};

type QuickList = {
  id: string;
  title: string;
  options: ListOption[];
};

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getListsStorageKey = (userId: string, spaceId: string | null) => {
  return `accountwise:lists:${userId}:${spaceId || "personal"}`;
};

const parseLists = (value: string | null): QuickList[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function ListsScreen() {
  const { activeSpaceId } = useSpaces();
  const { themeId } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const commonStyles = useMemo(() => {
    void themeId;
    return createCommonStyles(isDesktop);
  }, [isDesktop, themeId]);

  const styles = useMemo(() => {
    void themeId;
    return createStyles(isDesktop);
  }, [isDesktop, themeId]);

  const [lists, setLists] = useState<QuickList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [listTitle, setListTitle] = useState("");
  const [optionText, setOptionText] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const selectedList =
    lists.find((item) => item.id === selectedListId) || lists[0];
  const visibleOptions =
    selectedList?.options.filter((item) => !item.hidden) || [];
  const hiddenOptions =
    selectedList?.options.filter((item) => item.hidden) || [];

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(""), 2600);
  };

  const saveLists = useCallback(
    async (nextLists: QuickList[]) => {
      const user = await getCurrentUser();
      if (!user) return;

      await AsyncStorage.setItem(
        getListsStorageKey(user.id, activeSpaceId),
        JSON.stringify(nextLists),
      );
      setLists(nextLists);
    },
    [activeSpaceId],
  );

  const loadLists = useCallback(async () => {
    const user = await getCurrentUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const stored = await AsyncStorage.getItem(
      getListsStorageKey(user.id, activeSpaceId),
    );
    const nextLists = parseLists(stored);

    setLists(nextLists);
    setSelectedListId((current) =>
      nextLists.some((item) => item.id === current)
        ? current
        : nextLists[0]?.id || null,
    );
  }, [activeSpaceId]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [loadLists]),
  );

  const addList = async () => {
    const cleanTitle = listTitle.trim();

    if (!cleanTitle) {
      Alert.alert("Falta el nombre", "Pon un nombre para la lista.");
      return;
    }

    const confirmed = await confirmAction("¿Crear esta lista?");
    if (!confirmed) return;

    const nextList = {
      id: createId(),
      title: cleanTitle,
      options: [],
    };
    const nextLists = [nextList, ...lists];

    await saveLists(nextLists);
    setSelectedListId(nextList.id);
    setListTitle("");
    showActionMessage("Lista creada.");
  };

  const addOption = async () => {
    if (!selectedList) return;

    const cleanText = optionText.trim();

    if (!cleanText) {
      Alert.alert("Falta la opción", "Escribe una opción para añadirla.");
      return;
    }

    const confirmed = await confirmAction("¿Añadir esta opción?");
    if (!confirmed) return;

    const nextLists = lists.map((list) =>
      list.id === selectedList.id
        ? {
            ...list,
            options: [
              ...list.options,
              { id: createId(), text: cleanText, hidden: false },
            ],
          }
        : list,
    );

    await saveLists(nextLists);
    setOptionText("");
  };

  const toggleOption = async (optionId: string) => {
    if (!selectedList) return;

    const nextLists = lists.map((list) =>
      list.id === selectedList.id
        ? {
            ...list,
            options: list.options.map((option) =>
              option.id === optionId
                ? { ...option, hidden: !option.hidden }
                : option,
            ),
          }
        : list,
    );

    await saveLists(nextLists);
  };

  const deleteOption = async (optionId: string) => {
    if (!selectedList) return;

    const nextLists = lists.map((list) =>
      list.id === selectedList.id
        ? {
            ...list,
            options: list.options.filter((option) => option.id !== optionId),
          }
        : list,
    );

    await saveLists(nextLists);
  };

  const deleteList = async (listId: string) => {
    const executeDelete = async () => {
      const nextLists = lists.filter((list) => list.id !== listId);
      await saveLists(nextLists);
      setSelectedListId(nextLists[0]?.id || null);
      showActionMessage("Lista eliminada.");
    };

    if (Platform.OS === "web") {
      if (window.confirm("¿Eliminar esta lista?")) await executeDelete();
      return;
    }

    Alert.alert("Eliminar lista", "¿Eliminar esta lista?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: executeDelete },
    ]);
  };

  return (
    <View style={commonStyles.screen}>
      <Header
        title="Listas"
        headerStyle={{ backgroundColor: colors.surface }}
        headerTintColor={colors.text}
        headerTitleStyle={{ color: colors.text }}
      />

      <Pressable
        style={commonStyles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={commonStyles.settingsButtonText}>☰</Text>
      </Pressable>
      <SpaceMenuButton isDesktop={isDesktop} />

      <ScrollView
        contentContainerStyle={commonStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={commonStyles.content}>
          <ActionNotice message={actionMessage} />

          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Nueva lista</Text>
            <View style={styles.createRow}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la lista"
                value={listTitle}
                onChangeText={setListTitle}
              />
              <Pressable style={styles.addButton} onPress={addList}>
                <Ionicons name="add" size={22} color={colors.white} />
              </Pressable>
            </View>
          </View>

          {lists.length > 0 && (
            <View style={styles.listTabs}>
              {lists.map((list) => {
                const active = selectedList?.id === list.id;
                const pendingCount = list.options.filter(
                  (item) => !item.hidden,
                ).length;

                return (
                  <Pressable
                    key={list.id}
                    style={[styles.listTab, active && styles.listTabActive]}
                    onPress={() => setSelectedListId(list.id)}
                  >
                    <Text
                      style={[
                        styles.listTabText,
                        active && styles.listTabTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {list.title}
                    </Text>
                    <Text
                      style={[
                        styles.listTabCount,
                        active && styles.listTabTextActive,
                      ]}
                    >
                      {pendingCount}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!selectedList ? (
            <EmptyState
              title="No hay listas"
              text="Crea una lista y añade opciones que desaparecerán al pulsarlas."
              actionLabel="Crear lista"
              icon="list-outline"
              onAction={addList}
            />
          ) : (
            <View style={commonStyles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleBlock}>
                  <Text style={commonStyles.cardTitle}>
                    {selectedList.title}
                  </Text>
                  <Text style={commonStyles.subtitle}>
                    {visibleOptions.length} visibles · {hiddenOptions.length}{" "}
                    ocultas
                  </Text>
                </View>
                <Pressable
                  style={styles.iconButtonDanger}
                  onPress={() => deleteList(selectedList.id)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.danger}
                  />
                </Pressable>
              </View>

              <View style={styles.createRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Añadir opción"
                  value={optionText}
                  onChangeText={setOptionText}
                />
                <Pressable style={styles.addButton} onPress={addOption}>
                  <Ionicons name="add" size={22} color={colors.white} />
                </Pressable>
              </View>

              <View style={styles.optionsList}>
                {visibleOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    style={styles.optionRow}
                    onPress={() => toggleOption(option.id)}
                  >
                    <Ionicons
                      name="ellipse-outline"
                      size={20}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.optionText}>{option.text}</Text>
                    <Pressable
                      style={styles.optionDeleteButton}
                      onPress={() => deleteOption(option.id)}
                    >
                      <Ionicons
                        name="close"
                        size={16}
                        color={colors.mutedText}
                      />
                    </Pressable>
                  </Pressable>
                ))}
              </View>

              {visibleOptions.length === 0 && (
                <View style={styles.emptyInline}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.emptyInlineText}>
                    No hay opciones visibles.
                  </Text>
                </View>
              )}

              {hiddenOptions.length > 0 && (
                <View style={styles.hiddenBlock}>
                  <Pressable
                    style={styles.hiddenToggle}
                    onPress={() => setShowHidden(!showHidden)}
                  >
                    <Text style={styles.hiddenToggleText}>
                      {showHidden ? "Ocultar completadas" : "Ver completadas"}
                    </Text>
                    <Ionicons
                      name={showHidden ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.primaryDark}
                    />
                  </Pressable>

                  {showHidden &&
                    hiddenOptions.map((option) => (
                      <Pressable
                        key={option.id}
                        style={[styles.optionRow, styles.optionRowHidden]}
                        onPress={() => toggleOption(option.id)}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.success}
                        />
                        <Text
                          style={[styles.optionText, styles.optionTextHidden]}
                        >
                          {option.text}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
    createRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
    },

    input: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 11,
      paddingVertical: isDesktop ? 11 : 9,
      paddingHorizontal: 12,
      fontSize: Platform.OS === "web" ? 16 : isDesktop ? 14 : 12,
      color: colors.text,
    },

    addButton: {
      width: isDesktop ? 44 : 40,
      height: isDesktop ? 44 : 40,
      borderRadius: 12,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    listTabs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },

    listTab: {
      maxWidth: isDesktop ? 180 : 142,
      minHeight: 38,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },

    listTabActive: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },

    listTabText: {
      flexShrink: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
    },

    listTabCount: {
      color: colors.mutedText,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    listTabTextActive: {
      color: colors.white,
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 4,
    },

    titleBlock: {
      flex: 1,
      minWidth: 0,
    },

    iconButtonDanger: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
    },

    optionsList: {
      gap: 8,
      marginTop: 14,
    },

    optionRow: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 13,
      backgroundColor: colors.background,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },

    optionRowHidden: {
      backgroundColor: colors.surface,
      opacity: 0.78,
    },

    optionText: {
      flex: 1,
      minWidth: 0,
      color: colors.text,
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "800",
    },

    optionTextHidden: {
      color: colors.mutedText,
      textDecorationLine: "line-through",
    },

    optionDeleteButton: {
      width: 28,
      height: 28,
      borderRadius: 999,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyInline: {
      marginTop: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 13,
      paddingVertical: 18,
      paddingHorizontal: 12,
      alignItems: "center",
      gap: 7,
    },

    emptyInlineText: {
      color: colors.mutedText,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "800",
    },

    hiddenBlock: {
      marginTop: 14,
      gap: 8,
    },

    hiddenToggle: {
      minHeight: 38,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    hiddenToggleText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },
  });
