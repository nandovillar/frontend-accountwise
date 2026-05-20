import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { createElement, useCallback, useEffect, useMemo, useState } from "react";
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
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";
import { confirmAction } from "@/src/utils/confirmAction";
import { applySpaceFilter, getSpacePayload } from "@/src/utils/spaceQueries";

const listColorOptions = [
  "#3B82F6",
  "#22C55E",
  "#7C3AED",
  "#E11D48",
  "#F97316",
  "#A16207",
  "#4338CA",
];

type ListOption = {
  id: string;
  text: string;
  hidden: boolean;
};

type QuickList = {
  id: string;
  title: string;
  color: string;
  options: ListOption[];
};

type ListOptionRow = {
  id: string;
  text: string;
  hidden: boolean;
  position: number | null;
  created_at?: string | null;
};

type ListRow = {
  id: string;
  title: string;
  color?: string | null;
  created_at?: string | null;
  user_list_options?: ListOptionRow[] | null;
};

const normalizeListColor = (value?: string | null) => {
  const raw = (value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toUpperCase() : listColorOptions[0];
};

const getSoftColor = (value: string) => {
  return value.startsWith("#") && value.length === 7
    ? `${value}1F`
    : colors.primarySoft;
};

const mapListRows = (rows: ListRow[] | null): QuickList[] => {
  return (rows || []).map((list) => ({
    id: list.id,
    title: list.title,
    color: normalizeListColor(list.color),
    options: [...(list.user_list_options || [])]
      .sort((a, b) => {
        const positionDiff = (a.position || 0) - (b.position || 0);
        if (positionDiff !== 0) return positionDiff;
        return (a.created_at || "").localeCompare(b.created_at || "");
      })
      .map((option) => ({
        id: option.id,
        text: option.text,
        hidden: option.hidden,
      })),
  }));
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
  const [showListColorPalette, setShowListColorPalette] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const selectedList = lists.find((item) => item.id === selectedListId) || null;
  const visibleOptions =
    selectedList?.options.filter((item) => !item.hidden) || [];
  const hiddenOptions =
    selectedList?.options.filter((item) => item.hidden) || [];

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => setActionMessage(""), 2600);
  };

  const loadLists = useCallback(async () => {
    const user = await getCurrentUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const query = supabase
      .from("user_lists")
      .select(
        "id,title,color,created_at,user_list_options(id,text,hidden,position,created_at)",
      )
      .order("created_at", { ascending: false });

    const { data, error } = await applySpaceFilter(
      query,
      user.id,
      activeSpaceId,
    );

    if (error) {
      Alert.alert(
        "No se pudieron cargar las listas",
        "Revisa que las tablas de listas estén creadas en Supabase.",
      );
      return;
    }

    const nextLists = mapListRows(data as ListRow[] | null);

    setLists(nextLists);
    setSelectedListId((current) =>
      nextLists.some((item) => item.id === current) ? current : null,
    );
    setShowListColorPalette(false);
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

    const user = await getCurrentUser();
    if (!user) return;

    const listColor = listColorOptions[0];
    const { data, error } = await supabase
      .from("user_lists")
      .insert({
        user_id: user.id,
        title: cleanTitle,
        color: listColor,
        ...getSpacePayload(activeSpaceId),
      })
      .select("id,title,color,created_at")
      .single();

    if (error || !data) {
      Alert.alert("No se pudo guardar", "La lista no se ha guardado.");
      return;
    }

    const nextList = {
      id: data.id,
      title: data.title,
      color: normalizeListColor(data.color),
      options: [],
    };
    setLists((current) => [nextList, ...current]);
    setSelectedListId(null);
    setListTitle("");
    showActionMessage("Lista guardada.");
  };

  const updateListColor = async (listId: string, nextColor: string) => {
    const confirmed = await confirmAction("¿Guardar este color para la lista?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("user_lists")
      .update({ color: nextColor })
      .eq("id", listId);

    if (error) {
      Alert.alert("No se pudo guardar", "El color no se ha guardado.");
      return;
    }

    setLists((current) =>
      current.map((list) =>
        list.id === listId ? { ...list, color: nextColor } : list,
      ),
    );
    setShowListColorPalette(false);
    showActionMessage("Color guardado.");
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

    const { data, error } = await supabase
      .from("user_list_options")
      .insert({
        list_id: selectedList.id,
        text: cleanText,
        hidden: false,
        position: selectedList.options.length,
      })
      .select("id,text,hidden,position")
      .single();

    if (error || !data) {
      Alert.alert("No se pudo guardar", "La opción no se ha guardado.");
      return;
    }

    setLists((current) =>
      current.map((list) =>
        list.id === selectedList.id
          ? {
              ...list,
              options: [
                ...list.options,
                { id: data.id, text: data.text, hidden: data.hidden },
              ],
            }
          : list,
      ),
    );
    setOptionText("");
    showActionMessage("Opción guardada.");
  };

  const toggleOption = async (optionId: string) => {
    if (!selectedList) return;

    const option = selectedList.options.find((item) => item.id === optionId);
    if (!option) return;

    const nextHidden = !option.hidden;
    const { error } = await supabase
      .from("user_list_options")
      .update({ hidden: nextHidden })
      .eq("id", optionId);

    if (error) {
      Alert.alert("No se pudo actualizar", "La opción no se ha actualizado.");
      return;
    }

    setLists((current) =>
      current.map((list) =>
        list.id === selectedList.id
          ? {
              ...list,
              options: list.options.map((item) =>
                item.id === optionId ? { ...item, hidden: nextHidden } : item,
              ),
            }
          : list,
      ),
    );
  };

  const deleteOption = async (optionId: string) => {
    if (!selectedList) return;

    const { error } = await supabase
      .from("user_list_options")
      .delete()
      .eq("id", optionId);

    if (error) {
      Alert.alert("No se pudo eliminar", "La opción no se ha eliminado.");
      return;
    }

    setLists((current) =>
      current.map((list) =>
        list.id === selectedList.id
          ? {
              ...list,
              options: list.options.filter((option) => option.id !== optionId),
            }
          : list,
      ),
    );
  };

  const deleteList = async (listId: string) => {
    const executeDelete = async () => {
      const { error } = await supabase
        .from("user_lists")
        .delete()
        .eq("id", listId);

      if (error) {
        Alert.alert("No se pudo eliminar", "La lista no se ha eliminado.");
        return;
      }

      const nextLists = lists.filter((list) => list.id !== listId);
      setLists(nextLists);
      setSelectedListId((current) => (current === listId ? null : current));
      setShowListColorPalette(false);
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
                const listColor = normalizeListColor(list.color);

                return (
                  <Pressable
                    key={list.id}
                    style={[
                      styles.listTab,
                      {
                        backgroundColor: active
                          ? listColor
                          : getSoftColor(listColor),
                        borderColor: listColor,
                      },
                    ]}
                    onPress={() => {
                      setSelectedListId(active ? null : list.id);
                      setShowListColorPalette(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.listTabText,
                        { color: active ? colors.white : listColor },
                      ]}
                      numberOfLines={1}
                    >
                      {list.title}
                    </Text>
                    <Text
                      style={[
                        styles.listTabCount,
                        { color: active ? colors.white : listColor },
                      ]}
                    >
                      {pendingCount}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {lists.length === 0 ? (
            <EmptyState
              title="No hay listas"
              text="Crea una lista y añade opciones que desaparecerán al pulsarlas."
              actionLabel="Crear lista"
              icon="list-outline"
              onAction={addList}
            />
          ) : !selectedList ? (
            <EmptyState
              title="Listas ocultas"
              text="Pulsa una lista para abrirla."
              icon="chevron-down-circle-outline"
            />
          ) : (
            <View
              style={[
                commonStyles.card,
                styles.selectedListCard,
                { borderColor: normalizeListColor(selectedList.color) },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleBlock}>
                  <View
                    style={[
                      styles.listTitleBadge,
                      {
                        backgroundColor: getSoftColor(selectedList.color),
                        borderColor: selectedList.color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.listTitleBadgeText,
                        { color: selectedList.color },
                      ]}
                    >
                      {selectedList.title}
                    </Text>
                  </View>
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

              <View style={styles.colorBlock}>
                <Pressable
                  style={styles.changeColorButton}
                  onPress={() => setShowListColorPalette(!showListColorPalette)}
                >
                  <View
                    style={[
                      styles.changeColorSwatch,
                      { backgroundColor: selectedList.color },
                    ]}
                  />
                  <Text style={styles.changeColorText}>Cambiar color</Text>
                  <Ionicons
                    name={showListColorPalette ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.primaryDark}
                  />
                </Pressable>

                {showListColorPalette && (
                  <View style={styles.colorSwatchRow}>
                    {listColorOptions.map((option) => (
                      <Pressable
                        key={option}
                        style={[
                          styles.colorSwatchButton,
                          { backgroundColor: option },
                          selectedList.color === option &&
                            styles.colorSwatchButtonActive,
                        ]}
                        onPress={() => updateListColor(selectedList.id, option)}
                      />
                    ))}
                    {Platform.OS === "web" &&
                      createElement("input", {
                        type: "color",
                        value: normalizeListColor(selectedList.color),
                        title: "Color personalizado",
                        "aria-label": "Color personalizado",
                        onChange: (event: any) =>
                          updateListColor(selectedList.id, event.target.value),
                        style: {
                          width: isDesktop ? 88 : 54,
                          height: isDesktop ? 30 : 28,
                          border: "0",
                          borderRadius: 999,
                          padding: 0,
                          background: "transparent",
                          cursor: "pointer",
                        },
                      })}
                  </View>
                )}
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
                      color={selectedList.color}
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
                    color={selectedList.color}
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
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },

    listTabText: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: isDesktop ? 13 : 11,
      fontWeight: "900",
    },

    listTabCount: {
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    selectedListCard: {
      borderWidth: 2,
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
      gap: 8,
    },

    listTitleBadge: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },

    listTitleBadgeText: {
      fontSize: isDesktop ? 16 : 13,
      fontWeight: "900",
    },

    iconButtonDanger: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
    },

    colorBlock: {
      gap: 10,
      marginTop: 12,
    },

    changeColorButton: {
      alignSelf: "flex-start",
      minHeight: 38,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },

    changeColorSwatch: {
      width: 16,
      height: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },

    changeColorText: {
      color: colors.primaryDark,
      fontSize: isDesktop ? 12 : 10,
      fontWeight: "900",
    },

    colorSwatchRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    colorSwatchButton: {
      width: isDesktop ? 30 : 28,
      height: isDesktop ? 30 : 28,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.surface,
    },

    colorSwatchButtonActive: {
      borderColor: colors.text,
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
