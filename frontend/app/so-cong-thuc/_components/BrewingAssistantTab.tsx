import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText, useAppToast } from '../../../lib/components/ui';
import { playTapSound, playBrewAlarmSound } from '../../../lib/utils/sound';
import { sendBatchBrewLabelToPrinter } from '../../../lib/utils/labelPrinter';
import {
  useRecipeBookStore,
  BatchFormula,
  RecipeBookItem,
  ActiveBrewTimer,
} from '../../../lib/store/useRecipeBookStore';

export function BrewingAssistantTab() {
  const { theme, isDark } = useTheme();
  const { showToast } = useAppToast();
  const {
    recipes,
    activeTimers,
    startBrewTimer,
    pauseBrewTimer,
    resumeBrewTimer,
    resetBrewTimer,
    stopBrewTimer,
    tickTimers,
  } = useRecipeBookStore();

  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Multi-timer background/foreground tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimers();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimers]);

  // Check if any timer just reached 0 to trigger alarm
  useEffect(() => {
    const finishedTimers = activeTimers.filter((t) => t.remainingSeconds === 0 && t.stage === 'ready');
    if (finishedTimers.length > 0) {
      playBrewAlarmSound();
    }
  }, [activeTimers]);

  // Extract all batch formulas from all recipes
  const allBatches: { formula: BatchFormula; parentRecipe: RecipeBookItem }[] = [];
  recipes.forEach((r) => {
    if (r.batchFormulas) {
      r.batchFormulas.forEach((bf) => {
        allBatches.push({ formula: bf, parentRecipe: r });
      });
    }
  });

  const categories = ['Tất cả', 'Trà Trái Cây', 'Trà Sữa', 'Cà Phê', 'Topping'];

  const filteredBatches = allBatches.filter(({ parentRecipe }) => {
    if (selectedCategory === 'Tất cả') return true;
    return parentRecipe.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const handleStartTimer = (bf: BatchFormula, recipe: RecipeBookItem) => {
    playTapSound();
    const existing = activeTimers.find((t) => t.batchId === bf.id && t.isRunning);
    if (existing) {
      showToast({
        title: 'Đang Chạy',
        message: `Mẻ "${bf.batchName}" đang đếm giờ`,
        type: 'info',
      });
      return;
    }
    startBrewTimer(bf, recipe);
    showToast({
      title: 'Bắt Đầu Đếm Giờ',
      message: `Đã kích hoạt hẹn giờ ủ "${bf.batchName}"`,
      type: 'success',
    });
  };

  const handlePrintLabel = async (timer: ActiveBrewTimer | BatchFormula, teaTypeParam?: string) => {
    playTapSound();
    const now = new Date();
    const brewedAt = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    
    const shelfHours = (timer as any).shelfLifeHours || 4;
    const expDate = new Date(now.getTime() + shelfHours * 60 * 60 * 1000);
    const expiresAt = expDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + expDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

    const batchName = (timer as any).batchName;
    const teaType = (timer as any).teaType || teaTypeParam || 'Cốt Trà Chuẩn';
    const volumeOrYield = (timer as any).yieldServings ? `~${(timer as any).yieldServings} Ly` : '5 Lít';

    const res = await sendBatchBrewLabelToPrinter({
      batchName,
      teaType,
      volumeOrYield,
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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. ACTIVE TIMERS BANNER SECTION */}
      {activeTimers.length > 0 && (
        <View style={s.activeTimersSection}>
          <View style={s.sectionHeaderRow}>
            <Icon name="timer-sand" size={20} color={theme.brand.accent} />
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              ĐỒNG HỒ ĐANG Ủ ({activeTimers.length})
            </AppText>
          </View>

          {activeTimers.map((t) => {
            const isFinished = t.remainingSeconds <= 0;
            const progress = t.totalSeconds > 0 ? (t.totalSeconds - t.remainingSeconds) / t.totalSeconds : 1;
            const mins = Math.floor(t.remainingSeconds / 60);
            const secs = t.remainingSeconds % 60;

            return (
              <View
                key={t.id}
                style={[
                  s.activeTimerCard,
                  {
                    backgroundColor: isFinished ? theme.status.readyBg : theme.surface.card,
                    borderColor: isFinished ? theme.brand.success : theme.brand.accent,
                  },
                ]}
              >
                <View style={s.timerTopRow}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                      {t.batchName}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted}>
                      {t.teaType || t.recipeName}
                    </AppText>
                  </View>

                  {/* Countdown display */}
                  <View style={s.timeDigitsBox}>
                    <AppText
                      variant="lg"
                      weight="bold"
                      color={isFinished ? theme.brand.success : theme.brand.accent}
                      tabularNums
                    >
                      {isFinished ? '✓ HẾT GIỜ Ủ' : `${mins}:${secs.toString().padStart(2, '0')}`}
                    </AppText>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={[s.progressBarTrack, { backgroundColor: theme.surface.header }]}>
                  <View
                    style={[
                      s.progressBarFill,
                      {
                        backgroundColor: isFinished ? theme.brand.success : theme.brand.accent,
                        width: `${Math.min(100, Math.round(progress * 100))}%`,
                      },
                    ]}
                  />
                </View>

                {/* Status Guidance */}
                {isFinished ? (
                  <View style={[s.finishedGuidance, { backgroundColor: theme.status.readyBg }]}>
                    <Icon name="check-circle" size={18} color={theme.brand.success} />
                    <AppText variant="sm" weight="bold" color={theme.brand.success} style={{ flex: 1 }}>
                      VỚT BÃ TRÀ NGAY & SỐC NHIỆT ĐÁ BI (HÃM HƯƠNG)
                    </AppText>
                  </View>
                ) : null}

                {/* Timer Controls & Label Print */}
                <View style={s.timerActionRow}>
                  {!isFinished ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        playTapSound();
                        if (t.isRunning) pauseBrewTimer(t.id);
                        else resumeBrewTimer(t.id);
                      }}
                      style={[
                        s.timerCtrlBtn,
                        { backgroundColor: t.isRunning ? theme.status.warningBg : theme.brand.accent },
                      ]}
                    >
                      <Icon
                        name={t.isRunning ? 'pause' : 'play'}
                        size={16}
                        color={t.isRunning ? theme.brand.accent : '#FFFFFF'}
                      />
                      <AppText
                        variant="xs"
                        weight="bold"
                        color={t.isRunning ? theme.brand.accent : '#FFFFFF'}
                      >
                        {t.isRunning ? 'Tạm Dừng' : 'Tiếp Tục'}
                      </AppText>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handlePrintLabel(t)}
                    style={[s.timerCtrlBtn, { backgroundColor: theme.brand.primary }]}
                  >
                    <Icon name="printer-pos-outline" size={16} color={theme.text.onBrand} />
                    <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
                      In Tem Dán Bình
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      stopBrewTimer(t.id);
                    }}
                    style={[s.timerCtrlBtn, { backgroundColor: theme.surface.header }]}
                  >
                    <Icon name="close" size={16} color={theme.text.muted} />
                    <AppText variant="xs" color={theme.text.muted}>
                      Hủy
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 2. CATEGORY FILTER CHIPS */}
      <View style={{ marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categories.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setSelectedCategory(cat);
                }}
                style={[
                  s.catChip,
                  {
                    backgroundColor: isSel ? theme.brand.primary : theme.surface.card,
                    borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight={isSel ? 'bold' : 'medium'}
                  color={isSel ? theme.text.onBrand : theme.text.primary}
                >
                  {cat}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. BREWING RECIPES LIBRARY */}
      <View style={{ gap: 14 }}>
        {filteredBatches.map(({ formula, parentRecipe }) => {
          const isTimerActive = activeTimers.some((t) => t.batchId === formula.id);

          return (
            <View
              key={formula.id}
              style={[
                s.brewCard,
                { backgroundColor: theme.surface.card, borderColor: theme.border.subtle },
              ]}
            >
              {/* Card Header */}
              <View style={s.brewCardHeader}>
                <View style={[s.brewIconBadge, { backgroundColor: theme.status.warningBg }]}>
                  <Icon name="pot-steam-outline" size={22} color={theme.brand.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText variant="md" weight="bold" color={theme.text.primary}>
                    {formula.batchName}
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted}>
                    {formula.teaType || parentRecipe.productName} • Đạt ~{formula.yieldServings} ly
                  </AppText>
                </View>
              </View>

              {/* Golden Parameters Strip (Thông Số Vàng) */}
              <View style={[s.goldenParamBox, { backgroundColor: theme.surface.header + '50' }]}>
                {formula.teaQuantityGrams && (
                  <View style={s.paramCol}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      LƯỢNG TRÀ
                    </AppText>
                    <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>
                      {formula.teaQuantityGrams}g
                    </AppText>
                  </View>
                )}

                {formula.waterVolumeMl && (
                  <View style={s.paramCol}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      NƯỚC SÔI
                    </AppText>
                    <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                      {formula.waterVolumeMl}ml ({formula.waterTempCelsius || 95}°C)
                    </AppText>
                  </View>
                )}

                {formula.brewTimeSeconds && (
                  <View style={s.paramCol}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      THỜI GIAN Ủ
                    </AppText>
                    <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>
                      ⏱️ {Math.round(formula.brewTimeSeconds / 60)} phút
                    </AppText>
                  </View>
                )}

                {formula.iceShockGrams && (
                  <View style={s.paramCol}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      SỐC ĐÁ BI
                    </AppText>
                    <AppText variant="sm" weight="bold" color="#60A5FA" tabularNums>
                      ❄️ {formula.iceShockGrams}g
                    </AppText>
                  </View>
                )}

                {formula.shelfLifeHours && (
                  <View style={s.paramCol}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      HẠN DÙNG
                    </AppText>
                    <AppText variant="sm" weight="bold" color={theme.brand.success} tabularNums>
                      ⏰ {formula.shelfLifeHours} tiếng
                    </AppText>
                  </View>
                )}
              </View>

              {/* Ingredients List */}
              <View style={s.ingSection}>
                <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 6 }}>
                  ĐỊNH LƯỢNG NGUYÊN LIỆU MẺ
                </AppText>
                {formula.ingredients.map((ing, iIdx) => (
                  <View key={iIdx} style={s.ingRow}>
                    <AppText variant="sm" color={theme.text.primary}>
                      • {ing.ingredientName}
                    </AppText>
                    <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>
                      {ing.quantity} {ing.unit}
                    </AppText>
                  </View>
                ))}
              </View>

              {/* Instructions Steps */}
              {formula.instructions && formula.instructions.length > 0 && (
                <View style={s.instructSection}>
                  <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 6 }}>
                    QUY TRÌNH Ủ / NẤU CHUẨN XÁC
                  </AppText>
                  {formula.instructions.map((inst, iIdx) => (
                    <View key={iIdx} style={s.instructRow}>
                      <View style={[s.stepNumBullet, { backgroundColor: theme.brand.primary }]}>
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

              {/* Action Buttons */}
              <View style={s.brewCardActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isTimerActive}
                  onPress={() => handleStartTimer(formula, parentRecipe)}
                  style={[
                    s.actionBtn,
                    {
                      backgroundColor: isTimerActive ? theme.status.warningBg : theme.brand.accent,
                      flex: 1.4,
                    },
                  ]}
                >
                  <Icon
                    name={isTimerActive ? 'timer-sand' : 'play-circle-outline'}
                    size={20}
                    color={isTimerActive ? theme.brand.accent : '#FFFFFF'}
                  />
                  <AppText
                    variant="sm"
                    weight="bold"
                    color={isTimerActive ? theme.brand.accent : '#FFFFFF'}
                  >
                    {isTimerActive ? 'Đang Đếm Giờ' : 'Bắt Đầu Ủ Mẻ'}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePrintLabel(formula, formula.teaType)}
                  style={[
                    s.actionBtn,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.subtle,
                      borderWidth: StyleSheet.hairlineWidth,
                      flex: 1,
                    },
                  ]}
                >
                  <Icon name="printer-outline" size={18} color={theme.text.primary} />
                  <AppText variant="xs" weight="bold" color={theme.text.primary}>
                    In Tem Bình
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  activeTimersSection: {
    marginBottom: 20,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  activeTimerCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  timerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeDigitsBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  finishedGuidance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  timerActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timerCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brewCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brewIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  ingSection: {
    marginBottom: 12,
  },
  ingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  instructSection: {
    marginBottom: 14,
  },
  instructRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  stepNumBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  brewCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
