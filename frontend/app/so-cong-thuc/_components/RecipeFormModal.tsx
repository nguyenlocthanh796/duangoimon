import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';
import {
  RecipeBookItem,
  RecipeStep,
  RecipeSizeVariant,
  RecipeIngredientItem,
} from '../../../lib/store/useRecipeBookStore';
import { RECIPE_TEMPLATES } from '../../../lib/constants/sampleRecipes';

interface RecipeFormModalProps {
  initialRecipe?: RecipeBookItem | null;
  onSave: (data: Omit<RecipeBookItem, 'id'>) => void;
  onClose: () => void;
}

export function RecipeFormModal({
  initialRecipe,
  onSave,
  onClose,
}: RecipeFormModalProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [productName, setProductName] = useState(initialRecipe?.productName || '');
  const [category, setCategory] = useState(initialRecipe?.category || 'Trà Trái Cây');
  const [sellingPriceStr, setSellingPriceStr] = useState(
    initialRecipe ? String(initialRecipe.sellingPrice) : '25000'
  );
  const [prepTimeMinutesStr, setPrepTimeMinutesStr] = useState(
    initialRecipe ? String(initialRecipe.prepTimeMinutes) : '2'
  );
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    initialRecipe?.difficulty || 'easy'
  );
  const [description, setDescription] = useState(initialRecipe?.description || '');

  // Variants and ingredients
  const [variants, setVariants] = useState<RecipeSizeVariant[]>(
    initialRecipe?.variants && initialRecipe.variants.length > 0
      ? initialRecipe.variants
      : [
          {
            sizeName: 'Size Vừa (M)',
            ingredients: [
              {
                ingredientId: 'ing_1',
                ingredientName: 'Cốt Trà Lài',
                quantity: 150,
                unit: 'ml',
                costPrice: 12,
              },
              {
                ingredientId: 'ing_2',
                ingredientName: 'Nước Đường Vàng',
                quantity: 25,
                unit: 'ml',
                costPrice: 20,
              },
              {
                ingredientId: 'ing_3',
                ingredientName: 'Chanh Tươi',
                quantity: 15,
                unit: 'ml',
                costPrice: 60,
              },
            ],
          },
        ]
  );

  // SOP Steps
  const [steps, setSteps] = useState<RecipeStep[]>(
    initialRecipe?.steps && initialRecipe.steps.length > 0
      ? initialRecipe.steps
      : [
          {
            stepNumber: 1,
            title: 'Đong cốt trà & nước đường',
            description: 'Đong đúng định lượng vào bình shaker.',
            durationSeconds: 15,
          },
          {
            stepNumber: 2,
            title: 'Thêm đá & Lắc đều (Shake)',
            description: 'Lắc đều tay 12 lần tạo bọt mịn.',
            durationSeconds: 15,
          },
        ]
  );

  const applyTemplate = (tmpl: (typeof RECIPE_TEMPLATES)[0]) => {
    playTapSound();
    setProductName(tmpl.templateName);
    setCategory(tmpl.category);
    setSellingPriceStr(String(tmpl.sellingPrice));
    setPrepTimeMinutesStr(String(tmpl.prepTimeMinutes));
    setDifficulty(tmpl.difficulty);
    setDescription(tmpl.description);
    setVariants(JSON.parse(JSON.stringify(tmpl.variants)));
    setSteps(JSON.parse(JSON.stringify(tmpl.steps)));
  };

  const handleAddIngredient = (varIdx: number) => {
    playTapSound();
    const updated = [...variants];
    updated[varIdx].ingredients.push({
      ingredientId: 'ing_' + Date.now(),
      ingredientName: '',
      quantity: 10,
      unit: 'ml',
      costPrice: 0,
    });
    setVariants(updated);
  };

  const handleRemoveIngredient = (varIdx: number, ingIdx: number) => {
    playTapSound();
    const updated = [...variants];
    updated[varIdx].ingredients.splice(ingIdx, 1);
    setVariants(updated);
  };

  const handleUpdateIngredient = (
    varIdx: number,
    ingIdx: number,
    field: keyof RecipeIngredientItem,
    val: any
  ) => {
    const updated = [...variants];
    updated[varIdx].ingredients[ingIdx] = {
      ...updated[varIdx].ingredients[ingIdx],
      [field]: val,
    };
    setVariants(updated);
  };

  const handleAddStep = () => {
    playTapSound();
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        title: `Bước ${steps.length + 1}`,
        description: '',
        durationSeconds: 15,
      },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    playTapSound();
    const updated = steps.filter((_, i) => i !== idx).map((st, i) => ({
      ...st,
      stepNumber: i + 1,
    }));
    setSteps(updated);
  };

  const handleUpdateStep = (idx: number, field: keyof RecipeStep, val: any) => {
    const updated = [...steps];
    updated[idx] = {
      ...updated[idx],
      [field]: val,
    };
    setSteps(updated);
  };

  const handleSubmit = () => {
    playTapSound();
    if (!productName.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Nhập tên món');
      } else {
        Alert.alert('Thiếu Tên Món', 'Nhập tên món ăn hoặc đồ uống');
      }
      return;
    }

    const price = parseInt(sellingPriceStr, 10) || 0;
    const prep = parseInt(prepTimeMinutesStr, 10) || 1;

    // Filter valid ingredients
    const cleanedVariants = variants.map((v) => ({
      ...v,
      ingredients: v.ingredients.filter((i) => i.ingredientName.trim() !== ''),
    }));

    onSave({
      productId: initialRecipe?.productId || 'p_' + Date.now(),
      productName: productName.trim(),
      category: category.trim() || 'Khác',
      sellingPrice: price,
      prepTimeMinutes: prep,
      difficulty,
      description: description.trim(),
      variants: cleanedVariants,
      steps: steps.filter((s) => s.title.trim() !== ''),
      batchFormulas: initialRecipe?.batchFormulas || [],
      tags: initialRecipe?.tags || ['Mới'],
    });
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* Top Header */}
      <View
        style={[
          s.headerBar,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
            paddingTop: insets.top > 0 ? insets.top : 8,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            onClose();
          }}
          style={s.headerBtn}
        >
          <Icon name="close" size={24} color={theme.text.primary} />
        </TouchableOpacity>

        <AppText variant="md" weight="bold" color={theme.text.primary}>
          {initialRecipe ? 'Sửa Công Thức' : 'Thêm Công Thức Mới'}
        </AppText>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          style={[s.saveHeaderBtn, { backgroundColor: theme.brand.accent }]}
        >
          <AppText variant="sm" weight="bold" color="#FFFFFF">
            Lưu
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. QUICK TEMPLATES SELECTOR */}
        {!initialRecipe && (
          <View
            style={[
              s.templateSection,
              { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon name="flash-outline" size={18} color={theme.brand.accent} />
              <AppText variant="sm" weight="bold" color={theme.brand.accent}>
                Chọn Từ Mẫu Dựng Sẵn (Điền Nhanh 80%)
              </AppText>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {RECIPE_TEMPLATES.map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => applyTemplate(tmpl)}
                  style={[s.templateChip, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
                >
                  <AppText variant="xs" weight="bold" color={theme.text.primary}>
                    + {tmpl.templateName}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 2. Basic Info Section */}
        <View
          style={[
            s.formSection,
            { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
          ]}
        >
          <AppText variant="sm" weight="bold" color={theme.text.primary} style={{ marginBottom: 12 }}>
            THÔNG TIN MÓN
          </AppText>

          {/* Name */}
          <View style={s.fieldGroup}>
            <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Tên Món Ăn / Đồ Uống *
            </AppText>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="VD: Trà Chanh Hoa Nhài"
              placeholderTextColor={theme.text.muted}
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
            />
          </View>

          {/* Category & Selling Price */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 4 }}>
                Danh Mục
              </AppText>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="VD: Trà Trái Cây"
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  {
                    backgroundColor: theme.surface.header,
                    color: theme.text.primary,
                    borderColor: theme.border.subtle,
                  },
                ]}
              />
            </View>

            <View style={[s.fieldGroup, { flex: 1 }]}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 4 }}>
                Giá Bán Niêm Yết (VND)
              </AppText>
              <TextInput
                value={sellingPriceStr}
                onChangeText={setSellingPriceStr}
                keyboardType="numeric"
                placeholder="25000"
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  {
                    backgroundColor: theme.surface.header,
                    color: theme.text.primary,
                    borderColor: theme.border.subtle,
                  },
                ]}
              />
            </View>
          </View>

          {/* Prep Time & Difficulty */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 4 }}>
                Thời Gian Làm (Phút)
              </AppText>
              <TextInput
                value={prepTimeMinutesStr}
                onChangeText={setPrepTimeMinutesStr}
                keyboardType="numeric"
                placeholder="2"
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  {
                    backgroundColor: theme.surface.header,
                    color: theme.text.primary,
                    borderColor: theme.border.subtle,
                  },
                ]}
              />
            </View>

            <View style={[s.fieldGroup, { flex: 1 }]}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 4 }}>
                Độ Khó
              </AppText>
              <View style={s.difficultyPills}>
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      setDifficulty(d);
                    }}
                    style={[
                      s.diffPill,
                      {
                        backgroundColor:
                          difficulty === d ? theme.brand.primary : theme.surface.header,
                      },
                    ]}
                  >
                    <AppText
                      variant="xxs"
                      weight="bold"
                      color={difficulty === d ? theme.text.onBrand : theme.text.primary}
                    >
                      {d === 'easy' ? 'Dễ' : d === 'medium' ? 'Vừa' : 'Khó'}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={s.fieldGroup}>
            <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 4 }}>
              Mô Tả Hương Vị & Đặc Trưng
            </AppText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              placeholder="Hương thơm thanh mát tươi mới..."
              placeholderTextColor={theme.text.muted}
              style={[
                s.input,
                s.multilineInput,
                {
                  backgroundColor: theme.surface.header,
                  color: theme.text.primary,
                  borderColor: theme.border.subtle,
                },
              ]}
            />
          </View>
        </View>

        {/* 3. Ingredients & BOM Section */}
        <View
          style={[
            s.formSection,
            { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <AppText variant="sm" weight="bold" color={theme.text.primary}>
              ĐỊNH LƯỢNG NGUYÊN LIỆU (BOM)
            </AppText>
          </View>

          {variants.map((v, vIdx) => (
            <View key={vIdx} style={{ marginBottom: 16 }}>
              <AppText variant="xs" weight="bold" color={theme.brand.accent} style={{ marginBottom: 8 }}>
                {v.sizeName}
              </AppText>

              {v.ingredients.map((ing, iIdx) => (
                <View key={iIdx} style={s.ingEditRow}>
                  <TextInput
                    value={ing.ingredientName}
                    onChangeText={(val) => handleUpdateIngredient(vIdx, iIdx, 'ingredientName', val)}
                    placeholder="Tên nguyên liệu"
                    placeholderTextColor={theme.text.muted}
                    style={[
                      s.input,
                      { flex: 2, backgroundColor: theme.surface.header, color: theme.text.primary },
                    ]}
                  />

                  <TextInput
                    value={String(ing.quantity || '')}
                    onChangeText={(val) =>
                      handleUpdateIngredient(vIdx, iIdx, 'quantity', parseFloat(val) || 0)
                    }
                    placeholder="Đ.Lượng"
                    keyboardType="numeric"
                    placeholderTextColor={theme.text.muted}
                    style={[
                      s.input,
                      { flex: 1, backgroundColor: theme.surface.header, color: theme.text.primary },
                    ]}
                  />

                  <TextInput
                    value={ing.unit}
                    onChangeText={(val) => handleUpdateIngredient(vIdx, iIdx, 'unit', val)}
                    placeholder="ĐVT"
                    placeholderTextColor={theme.text.muted}
                    style={[
                      s.input,
                      { width: 50, backgroundColor: theme.surface.header, color: theme.text.primary },
                    ]}
                  />

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleRemoveIngredient(vIdx, iIdx)}
                    style={s.delIngBtn}
                  >
                    <Icon name="close-circle-outline" size={20} color={theme.brand.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleAddIngredient(vIdx)}
                style={[s.addIngBtn, { borderColor: theme.brand.accent }]}
              >
                <Icon name="plus" size={16} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                  Thêm Nguyên Liệu
                </AppText>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 4. SOP Steps Section */}
        <View
          style={[
            s.formSection,
            { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <AppText variant="sm" weight="bold" color={theme.text.primary}>
              CÁC BƯỚC PHA CHẾ (SOP)
            </AppText>
          </View>

          {steps.map((st, sIdx) => (
            <View key={sIdx} style={[s.stepEditCard, { borderColor: theme.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[s.stepIdxBadge, { backgroundColor: theme.brand.accent }]}>
                    <AppText variant="xxs" weight="bold" color="#FFFFFF">
                      {sIdx + 1}
                    </AppText>
                  </View>
                  <AppText variant="xs" weight="bold" color={theme.text.primary}>
                    Bước {sIdx + 1}
                  </AppText>
                </View>

                {steps.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleRemoveStep(sIdx)}
                  >
                    <Icon name="trash-can-outline" size={18} color={theme.brand.danger} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                value={st.title}
                onChangeText={(val) => handleUpdateStep(sIdx, 'title', val)}
                placeholder="Tiêu đề bước (VD: Đong cốt trà)"
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  { backgroundColor: theme.surface.header, color: theme.text.primary, marginBottom: 8 },
                ]}
              />

              <TextInput
                value={st.description}
                onChangeText={(val) => handleUpdateStep(sIdx, 'description', val)}
                multiline
                numberOfLines={2}
                placeholder="Mô tả chi tiết cách làm..."
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  s.multilineInput,
                  { backgroundColor: theme.surface.header, color: theme.text.primary, marginBottom: 8 },
                ]}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={st.tip || ''}
                  onChangeText={(val) => handleUpdateStep(sIdx, 'tip', val)}
                  placeholder="Mẹo quầy bar (tùy chọn)"
                  placeholderTextColor={theme.text.muted}
                  style={[
                    s.input,
                    { flex: 2, backgroundColor: theme.surface.header, color: theme.text.primary },
                  ]}
                />

                <TextInput
                  value={st.durationSeconds ? String(st.durationSeconds) : ''}
                  onChangeText={(val) =>
                    handleUpdateStep(sIdx, 'durationSeconds', parseInt(val, 10) || undefined)
                  }
                  placeholder="Giây (s)"
                  keyboardType="numeric"
                  placeholderTextColor={theme.text.muted}
                  style={[
                    s.input,
                    { width: 70, backgroundColor: theme.surface.header, color: theme.text.primary },
                  ]}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddStep}
            style={[s.addIngBtn, { borderColor: theme.brand.accent, marginTop: 8 }]}
          >
            <Icon name="plus" size={16} color={theme.brand.accent} />
            <AppText variant="xs" weight="bold" color={theme.brand.accent}>
              Thêm Bước Pha Chế
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 6,
  },
  saveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  templateSection: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 70,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  difficultyPills: {
    flexDirection: 'row',
    height: 44,
    gap: 4,
    alignItems: 'center',
  },
  diffPill: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  delIngBtn: {
    padding: 4,
  },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  stepEditCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  stepIdxBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
