import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, useAppToast } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';
import { formatCurrency } from '../../../lib/utils/format';
import { sendBatchBrewLabelToPrinter } from '../../../lib/utils/labelPrinter';
import {
  RecipeBookItem,
  RecipeSizeVariant,
  BatchFormula,
  useRecipeBookStore,
} from '../../../lib/store/useRecipeBookStore';

interface RecipeDetailViewProps {
  recipe: RecipeBookItem;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onLaunchFocusMode: (variant: RecipeSizeVariant) => void;
  onStartBrewTimer?: (batch: BatchFormula) => void;
}

export function RecipeDetailView({
  recipe,
  onBack,
  onEdit,
  onDelete,
  onDuplicate,
  onLaunchFocusMode,
  onStartBrewTimer,
}: RecipeDetailViewProps) {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const { calculateVariantCost, calculateProfitMargin, scaleIngredientsForBatch, startBrewTimer } =
    useRecipeBookStore();

  const [activeTab, setActiveTab] = useState<'sop' | 'bom' | 'batch'>('sop');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const variants = recipe.variants || [];
  const currentVariant: RecipeSizeVariant | undefined = variants[selectedVariantIndex] || variants[0];

  // Financial calculations
  const singleCost = useMemo(() => {
    return currentVariant ? calculateVariantCost(currentVariant) : 0;
  }, [currentVariant, calculateVariantCost]);

  const marginPercent = useMemo(() => {
    return calculateProfitMargin(recipe.sellingPrice, singleCost);
  }, [recipe.sellingPrice, singleCost, calculateProfitMargin]);

  const scaledIngredients = useMemo(() => {
    if (!currentVariant) return [];
    return scaleIngredientsForBatch(currentVariant.ingredients, batchMultiplier);
  }, [currentVariant, batchMultiplier, scaleIngredientsForBatch]);

  const toggleStepDone = (idx: number) => {
    playTapSound();
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter((i) => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const confirmDelete = () => {
    playTapSound();
    if (Platform.OS === 'web') {
      if (window.confirm(`Xóa công thức "${recipe.productName}" khỏi sổ?`)) {
        onDelete();
      }
    } else {
      Alert.alert(
        'Xóa Công Thức',
        `Xác nhận xóa công thức "${recipe.productName}"?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: onDelete },
        ]
      );
    }
  };

  const handlePrintBatchLabel = async (bf: BatchFormula) => {
    playTapSound();
    const now = new Date();
    const brewedAt =
      now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    const shelfHours = bf.shelfLifeHours || 4;
    const expDate = new Date(now.getTime() + shelfHours * 60 * 60 * 1000);
    const expiresAt =
      expDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      expDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    const res = await sendBatchBrewLabelToPrinter({
      batchName: bf.batchName,
      teaType: bf.teaType || recipe.productName,
      volumeOrYield: `~${bf.yieldServings} Ly`,
      brewedAt,
      expiresAt,
      shelfLifeHours: shelfHours,
      baristaName: 'Ca Trực Quầy',
    });

    showToast({
      title: 'In Tem Bình Ủ',
      message: res.message,
      type: 'success',
    });
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* Top Header Bar */}
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
        <View style={s.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              onBack();
            }}
            style={[s.backBtn, { backgroundColor: theme.surface.header }]}
          >
            <Icon name="arrow-left" size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                {recipe.productName}
              </AppText>
              <View
                style={[
                  s.catBadge,
                  { backgroundColor: theme.status.warningBg, borderColor: theme.brand.accent },
                ]}
              >
                <AppText variant="xxs" weight="bold" color={theme.brand.accent}>
                  {recipe.category}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <AppText variant="xs" color={theme.text.muted}>
                ⏱️ {recipe.prepTimeMinutes} phút
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                •
              </AppText>
              <AppText
                variant="xs"
                weight="bold"
                color={
                  recipe.difficulty === 'easy'
                    ? theme.brand.success
                    : recipe.difficulty === 'medium'
                    ? theme.brand.accent
                    : theme.brand.danger
                }
              >
                {recipe.difficulty === 'easy'
                  ? 'Độ khó: Dễ'
                  : recipe.difficulty === 'medium'
                  ? 'Độ khó: Vừa'
                  : 'Độ khó: Khó'}
              </AppText>
            </View>
          </View>
        </View>

        {/* Action Buttons: Duplicate, Edit, Delete */}
        <View style={s.headerActions}>
          {onDuplicate && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                onDuplicate();
              }}
              style={[s.iconActionBtn, { backgroundColor: theme.surface.header }]}
            >
              <Icon name="content-copy" size={18} color={theme.text.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              onEdit();
            }}
            style={[s.iconActionBtn, { backgroundColor: theme.surface.header }]}
          >
            <Icon name="pencil-outline" size={18} color={theme.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={confirmDelete}
            style={[s.iconActionBtn, { backgroundColor: theme.status.dangerBg }]}
          >
            <Icon name="trash-can-outline" size={18} color={theme.brand.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Financial Strip: Giá Bán - Giá Vốn - Lãi Gộp */}
      <View
        style={[
          s.financialStrip,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <View style={s.finMetricCol}>
          <AppText variant="xxs" weight="medium" color={theme.text.muted}>
            GIÁ BÁN
          </AppText>
          <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
            {formatCurrency(recipe.sellingPrice)}
          </AppText>
        </View>

        <View style={[s.finDivider, { backgroundColor: theme.border.subtle }]} />

        <View style={s.finMetricCol}>
          <AppText variant="xxs" weight="medium" color={theme.text.muted}>
            GIÁ VỐN (COGS)
          </AppText>
          <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
            {formatCurrency(singleCost)}
          </AppText>
        </View>

        <View style={[s.finDivider, { backgroundColor: theme.border.subtle }]} />

        <View style={s.finMetricCol}>
          <AppText variant="xxs" weight="medium" color={theme.text.muted}>
            LÃI GỘP MARGIN
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText
              variant="md"
              weight="bold"
              color={marginPercent >= 60 ? theme.brand.success : theme.brand.accent}
              tabularNums
            >
              {marginPercent}%
            </AppText>
            <Icon
              name={marginPercent >= 60 ? 'trending-up' : 'alert-circle-outline'}
              size={14}
              color={marginPercent >= 60 ? theme.brand.success : theme.brand.accent}
            />
          </View>
        </View>
      </View>

      {/* 3 Main Segment Tabs */}
      <View
        style={[
          s.segmentRow,
          { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            playTapSound();
            setActiveTab('sop');
          }}
          style={[
            s.segmentTab,
            activeTab === 'sop' && {
              borderBottomColor: theme.brand.accent,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Icon
            name="chef-hat"
            size={18}
            color={activeTab === 'sop' ? theme.brand.accent : theme.text.muted}
          />
          <AppText
            variant="sm"
            weight={activeTab === 'sop' ? 'bold' : 'medium'}
            color={activeTab === 'sop' ? theme.brand.accent : theme.text.muted}
          >
            Pha Chế (SOP)
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            playTapSound();
            setActiveTab('bom');
          }}
          style={[
            s.segmentTab,
            activeTab === 'bom' && {
              borderBottomColor: theme.brand.accent,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Icon
            name="scale"
            size={18}
            color={activeTab === 'bom' ? theme.brand.accent : theme.text.muted}
          />
          <AppText
            variant="sm"
            weight={activeTab === 'bom' ? 'bold' : 'medium'}
            color={activeTab === 'bom' ? theme.brand.accent : theme.text.muted}
          >
            Định Lượng & Giá Vốn
          </AppText>
        </TouchableOpacity>

        {recipe.batchFormulas && recipe.batchFormulas.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setActiveTab('batch');
            }}
            style={[
              s.segmentTab,
              activeTab === 'batch' && {
                borderBottomColor: theme.brand.accent,
                borderBottomWidth: 3,
              },
            ]}
          >
            <Icon
              name="pot-steam"
              size={18}
              color={activeTab === 'batch' ? theme.brand.accent : theme.text.muted}
            />
            <AppText
              variant="sm"
              weight={activeTab === 'batch' ? 'bold' : 'medium'}
              color={activeTab === 'batch' ? theme.brand.accent : theme.text.muted}
            >
              Ủ Mẻ Lớn ({recipe.batchFormulas.length})
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Body Content according to Tab */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: SOP PHA CHẾ */}
        {activeTab === 'sop' && (
          <View>
            {/* Quick Barista Focus Mode Launch Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                if (currentVariant) {
                  onLaunchFocusMode(currentVariant);
                }
              }}
              style={[s.focusModeBanner, { backgroundColor: theme.brand.primary }]}
            >
              <View style={s.focusModeIconWrap}>
                <Icon name="fullscreen" size={24} color={theme.text.onBrand} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                  Chế Độ Barista Quầy Bar
                </AppText>
                <AppText variant="xs" color="#A8A29E">
                  Chữ to cự ly xa · Đếm ngược hẹn giờ · Rảnh tay pha chế
                </AppText>
              </View>
              <Icon name="chevron-right" size={20} color={theme.text.onBrand} />
            </TouchableOpacity>

            {/* Description */}
            {recipe.description ? (
              <View
                style={[
                  s.descBox,
                  { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
                ]}
              >
                <AppText variant="sm" color={theme.text.muted} style={{ lineHeight: 22 }}>
                  {recipe.description}
                </AppText>
              </View>
            ) : null}

            {/* Step List */}
            <View style={{ marginTop: 12 }}>
              <AppText
                variant="sm"
                weight="bold"
                color={theme.text.primary}
                style={{ marginBottom: 12 }}
              >
                QUY TRÌNH PHA CHẾ ({recipe.steps?.length || 0} BƯỚC)
              </AppText>

              {(recipe.steps || []).map((step, idx) => {
                const isDone = completedSteps.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => toggleStepDone(idx)}
                    style={[
                      s.stepCard,
                      {
                        backgroundColor: isDone ? theme.surface.header : theme.surface.card,
                        borderColor: isDone ? theme.brand.success : theme.border.subtle,
                      },
                    ]}
                  >
                    <View style={s.stepCardHeader}>
                      <View
                        style={[
                          s.stepNumCircle,
                          {
                            backgroundColor: isDone ? theme.brand.success : theme.brand.accent,
                          },
                        ]}
                      >
                        {isDone ? (
                          <Icon name="check" size={16} color="#FFFFFF" />
                        ) : (
                          <AppText variant="xs" weight="bold" color="#FFFFFF">
                            {step.stepNumber || idx + 1}
                          </AppText>
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <AppText
                          variant="md"
                          weight="bold"
                          color={isDone ? theme.text.muted : theme.text.primary}
                          style={isDone ? { textDecorationLine: 'line-through' } : undefined}
                        >
                          {step.title}
                        </AppText>
                      </View>

                      {step.durationSeconds ? (
                        <View
                          style={[
                            s.timeTag,
                            { backgroundColor: theme.surface.header, borderColor: theme.border.subtle },
                          ]}
                        >
                          <Icon name="timer-outline" size={14} color={theme.brand.accent} />
                          <AppText variant="xxs" weight="bold" color={theme.brand.accent} tabularNums>
                            {step.durationSeconds}s
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <AppText
                      variant="sm"
                      color={isDone ? theme.text.muted : theme.text.primary}
                      style={[
                        s.stepDescText,
                        isDone && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {step.description}
                    </AppText>

                    {step.tip ? (
                      <View
                        style={[
                          s.stepTipBox,
                          { backgroundColor: theme.status.warningBg, borderColor: theme.brand.accent },
                        ]}
                      >
                        <Icon name="lightbulb-on-outline" size={16} color={theme.brand.accent} />
                        <AppText
                          variant="xs"
                          color={theme.brand.accent}
                          style={{ flex: 1, lineHeight: 18 }}
                        >
                          {step.tip}
                        </AppText>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bottom Fullscreen Focus Launcher */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                if (currentVariant) {
                  onLaunchFocusMode(currentVariant);
                }
              }}
              style={[
                s.launchFocusBottomBtn,
                { backgroundColor: theme.brand.accent, marginTop: 14 },
              ]}
            >
              <Icon name="play-circle" size={22} color="#FFFFFF" />
              <AppText variant="md" weight="bold" color="#FFFFFF">
                Bật Đồng Hồ & Pha Chế
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 2: ĐỊNH LƯỢNG & GIÁ VỐN (BOM & COGS) */}
        {activeTab === 'bom' && (
          <View>
            {/* Size Variant Selector */}
            {variants.length > 1 && (
              <View style={s.sizeSelectorContainer}>
                <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 6 }}>
                  CHỌN SIZE LY
                </AppText>
                <View style={s.sizePillRow}>
                  {variants.map((v, idx) => {
                    const isSel = idx === selectedVariantIndex;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          setSelectedVariantIndex(idx);
                        }}
                        style={[
                          s.sizePill,
                          {
                            backgroundColor: isSel ? theme.brand.primary : theme.surface.card,
                            borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="sm"
                          weight={isSel ? 'bold' : 'medium'}
                          color={isSel ? theme.text.onBrand : theme.text.primary}
                        >
                          {v.sizeName}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Batch Multiplier Bar */}
            <View
              style={[
                s.batchScalerBox,
                { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    Quy Đổi Số Ly Cần Pha
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted}>
                    Tự động nhân định lượng nguyên liệu
                  </AppText>
                </View>
                <View style={s.multiplierPills}>
                  {[1, 2, 5, 10].map((mul) => {
                    const isMulSel = batchMultiplier === mul;
                    return (
                      <TouchableOpacity
                        key={mul}
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          setBatchMultiplier(mul);
                        }}
                        style={[
                          s.mulPill,
                          {
                            backgroundColor: isMulSel ? theme.brand.accent : theme.surface.header,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight="bold"
                          color={isMulSel ? '#FFFFFF' : theme.text.primary}
                        >
                          {mul} Ly
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Scaled Ingredients Table */}
            <View
              style={[
                s.bomTableCard,
                { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
              ]}
            >
              <View
                style={[
                  s.bomTableHeader,
                  { borderBottomColor: theme.border.subtle, backgroundColor: theme.surface.header },
                ]}
              >
                <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ flex: 1.5 }}>
                  NGUYÊN LIỆU
                </AppText>
                <AppText
                  variant="xs"
                  weight="bold"
                  color={theme.text.muted}
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  ĐỊNH LƯỢNG
                </AppText>
                <AppText
                  variant="xs"
                  weight="bold"
                  color={theme.text.muted}
                  style={{ flex: 1, textAlign: 'right' }}
                >
                  GIÁ VỐN
                </AppText>
              </View>

              {scaledIngredients.map((ing, idx) => {
                const totalIngCost = (ing.quantity || 0) * (ing.costPrice || 0);
                return (
                  <View
                    key={idx}
                    style={[
                      s.bomTableRow,
                      {
                        borderBottomColor: theme.border.subtle,
                        backgroundColor: idx % 2 === 1 ? theme.surface.header + '30' : 'transparent',
                      },
                    ]}
                  >
                    <View style={{ flex: 1.5 }}>
                      <AppText variant="sm" weight="medium" color={theme.text.primary}>
                        {ing.ingredientName}
                      </AppText>
                      {ing.costPrice > 0 && (
                        <AppText variant="xxs" color={theme.text.muted} tabularNums>
                          {formatCurrency(ing.costPrice)} / {ing.unit}
                        </AppText>
                      )}
                    </View>

                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                        {ing.quantity} {ing.unit}
                      </AppText>
                    </View>

                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                        {formatCurrency(totalIngCost)}
                      </AppText>
                    </View>
                  </View>
                );
              })}

              {/* Total Summary Row */}
              <View
                style={[
                  s.bomTableFooter,
                  { backgroundColor: theme.surface.header, borderTopColor: theme.border.subtle },
                ]}
              >
                <AppText variant="sm" weight="bold" color={theme.text.primary} style={{ flex: 1.5 }}>
                  Tổng Giá Vốn ({batchMultiplier} Ly)
                </AppText>
                <AppText
                  variant="md"
                  weight="bold"
                  color={theme.brand.accent}
                  tabularNums
                  style={{ flex: 1.5, textAlign: 'right' }}
                >
                  {formatCurrency(singleCost * batchMultiplier)}
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: CÔNG THỨC MẺ LỚN (BATCH FORMULAS) */}
        {activeTab === 'batch' && (
          <View>
            {(recipe.batchFormulas || []).map((bf, idx) => (
              <View
                key={bf.id || idx}
                style={[
                  s.batchCard,
                  { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
                ]}
              >
                <View style={s.batchCardHeader}>
                  <Icon name="pot-steam" size={22} color={theme.brand.accent} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <AppText variant="md" weight="bold" color={theme.text.primary}>
                      {bf.batchName}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted}>
                      {bf.teaType || recipe.productName} • Sản lượng đạt: ~{bf.yieldServings} ly
                    </AppText>
                  </View>
                </View>

                {/* Golden Parameters if available */}
                {(bf.teaQuantityGrams || bf.waterVolumeMl || bf.brewTimeSeconds) && (
                  <View style={[s.goldenParamBox, { backgroundColor: theme.surface.header + '50' }]}>
                    {bf.teaQuantityGrams && (
                      <View style={s.paramCol}>
                        <AppText variant="xxs" color={theme.text.muted}>
                          LƯỢNG TRÀ
                        </AppText>
                        <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>
                          {bf.teaQuantityGrams}g
                        </AppText>
                      </View>
                    )}

                    {bf.waterVolumeMl && (
                      <View style={s.paramCol}>
                        <AppText variant="xxs" color={theme.text.muted}>
                          NƯỚC SÔI
                        </AppText>
                        <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                          {bf.waterVolumeMl}ml ({bf.waterTempCelsius || 95}°C)
                        </AppText>
                      </View>
                    )}

                    {bf.brewTimeSeconds && (
                      <View style={s.paramCol}>
                        <AppText variant="xxs" color={theme.text.muted}>
                          THỜI GIAN Ủ
                        </AppText>
                        <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>
                          ⏱️ {Math.round(bf.brewTimeSeconds / 60)} phút
                        </AppText>
                      </View>
                    )}

                    {bf.iceShockGrams && (
                      <View style={s.paramCol}>
                        <AppText variant="xxs" color={theme.text.muted}>
                          SỐC ĐÁ BI
                        </AppText>
                        <AppText variant="sm" weight="bold" color="#60A5FA" tabularNums>
                          ❄️ {bf.iceShockGrams}g
                        </AppText>
                      </View>
                    )}

                    {bf.shelfLifeHours && (
                      <View style={s.paramCol}>
                        <AppText variant="xxs" color={theme.text.muted}>
                          HẠN DÙNG
                        </AppText>
                        <AppText variant="sm" weight="bold" color={theme.brand.success} tabularNums>
                          ⏰ {bf.shelfLifeHours} tiếng
                        </AppText>
                      </View>
                    )}
                  </View>
                )}

                {/* Batch Ingredients */}
                <View style={s.batchIngSection}>
                  <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 6 }}>
                    ĐỊNH LƯỢNG NẤU MẺ
                  </AppText>
                  {bf.ingredients.map((bIng, bIdx) => (
                    <View key={bIdx} style={s.batchIngRow}>
                      <AppText variant="sm" color={theme.text.primary}>
                        • {bIng.ingredientName}
                      </AppText>
                      <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>
                        {bIng.quantity} {bIng.unit}
                      </AppText>
                    </View>
                  ))}
                </View>

                {/* Batch Instructions */}
                {bf.instructions && bf.instructions.length > 0 && (
                  <View style={s.batchInstructSection}>
                    <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 6 }}>
                      QUY TRÌNH NẤU / Ủ
                    </AppText>
                    {bf.instructions.map((inst, iIdx) => (
                      <View key={iIdx} style={s.batchInstructRow}>
                        <View style={[s.instBullet, { backgroundColor: theme.brand.accent }]}>
                          <AppText variant="xxs" weight="bold" color="#FFFFFF">
                            {iIdx + 1}
                          </AppText>
                        </View>
                        <AppText variant="sm" color={theme.text.primary} style={{ flex: 1, lineHeight: 20 }}>
                          {inst}
                        </AppText>
                      </View>
                    ))}
                  </View>
                )}

                {/* Batch Actions: Start Brew Timer & Print Label */}
                <View style={s.batchCardActions}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      startBrewTimer(bf, recipe);
                      showToast({
                        title: 'Bắt Đầu Đếm Giờ',
                        message: `Đã kích hoạt hẹn giờ ủ "${bf.batchName}"`,
                        type: 'success',
                      });
                    }}
                    style={[s.batchActionBtn, { backgroundColor: theme.brand.accent, flex: 1.3 }]}
                  >
                    <Icon name="timer-sand" size={18} color="#FFFFFF" />
                    <AppText variant="sm" weight="bold" color="#FFFFFF">
                      Bắt Đầu Ủ Mẻ
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handlePrintBatchLabel(bf)}
                    style={[
                      s.batchActionBtn,
                      {
                        backgroundColor: theme.surface.header,
                        borderColor: theme.border.subtle,
                        borderWidth: StyleSheet.hairlineWidth,
                        flex: 1,
                      },
                    ]}
                  >
                    <Icon name="printer-outline" size={16} color={theme.text.primary} />
                    <AppText variant="xs" weight="bold" color={theme.text.primary}>
                      In Tem Bình
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financialStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  finMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  finDivider: {
    width: 1,
    height: 24,
  },
  segmentRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  focusModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  focusModeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  descBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  stepCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  stepDescText: {
    lineHeight: 22,
    marginBottom: 8,
  },
  stepTipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  sizeSelectorContainer: {
    marginBottom: 16,
  },
  sizePillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sizePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  batchScalerBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  multiplierPills: {
    flexDirection: 'row',
    gap: 6,
  },
  mulPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bomTableCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bomTableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bomTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bomTableFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  batchCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  batchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  goldenParamBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  paramCol: {
    minWidth: 80,
  },
  batchIngSection: {
    marginBottom: 14,
  },
  batchIngRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  batchInstructSection: {
    marginTop: 4,
  },
  batchInstructRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  instBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  batchCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  batchActionBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  launchFocusBottomBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
