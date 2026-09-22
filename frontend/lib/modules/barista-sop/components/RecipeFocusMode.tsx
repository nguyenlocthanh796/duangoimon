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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { AppText } from '../../../components/ui';
import { playTapSound, playBrewAlarmSound, playSuccessSound } from '../../../utils/sound';
import { RecipeBookItem, RecipeStep, RecipeSizeVariant } from '../types';

interface RecipeFocusModeProps {
  recipe: RecipeBookItem;
  selectedVariant?: RecipeSizeVariant;
  onExit: () => void;
  onComplete: () => void;
}

export function RecipeFocusMode({
  recipe,
  selectedVariant,
  onExit,
  onComplete,
}: RecipeFocusModeProps) {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showIngredientsMobile, setShowIngredientsMobile] = useState(false);

  const steps = recipe.steps || [];
  const currentStep: RecipeStep | undefined = steps[currentStepIndex];
  const nextStep: RecipeStep | undefined = steps[currentStepIndex + 1];

  const currentVariant = selectedVariant || recipe.variants?.[0];
  const ingredients = currentVariant?.ingredients || [];

  // Reset/set timer when step changes
  useEffect(() => {
    if (currentStep?.durationSeconds) {
      setTimerSeconds(currentStep.durationSeconds);
      setIsTimerRunning(false);
    } else {
      setTimerSeconds(null);
      setIsTimerRunning(false);
    }
  }, [currentStepIndex, currentStep?.durationSeconds]);

  // Countdown timer ticker
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            playBrewAlarmSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleNextStep = () => {
    playTapSound();
    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps([...completedSteps, currentStepIndex]);
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      playSuccessSound();
      onComplete();
    }
  };

  const handlePrevStep = () => {
    playTapSound();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const toggleTimer = () => {
    playTapSound();
    if (timerSeconds === 0 && currentStep?.durationSeconds) {
      setTimerSeconds(currentStep.durationSeconds);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const resetTimer = () => {
    playTapSound();
    setIsTimerRunning(false);
    if (currentStep?.durationSeconds) {
      setTimerSeconds(currentStep.durationSeconds);
    }
  };

  const toggleIngredientCheck = (ingId: string) => {
    playTapSound();
    if (checkedIngredients.includes(ingId)) {
      setCheckedIngredients(checkedIngredients.filter((id) => id !== ingId));
    } else {
      setCheckedIngredients([...checkedIngredients, ingId]);
    }
  };

  const safeBottom = (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 8;

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: theme.surface.app,
          paddingTop: insets.top > 0 ? insets.top : 12,
          paddingBottom: safeBottom,
        },
      ]}
    >
      {/* 1. TOP HEADER BAR */}
      <View
        style={[
          s.topBar,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            onExit();
          }}
          style={[
            s.exitBtn,
            {
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Icon name="close" size={20} color={theme.text.primary} />
          <AppText variant="sm" weight="bold" color={theme.text.primary}>
            Thoát
          </AppText>
        </TouchableOpacity>

        <View style={s.topCenter}>
          <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
            {recipe.productName}
          </AppText>
          {currentVariant && (
            <View
              style={[
                s.sizeSubBadge,
                {
                  backgroundColor: theme.status.warningBg,
                  borderColor: theme.brand.accent,
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <AppText variant="xxs" weight="bold" color={theme.brand.accent}>
                {currentVariant.sizeName}
              </AppText>
            </View>
          )}
        </View>

        {/* Mobile toggle ingredient sheet */}
        {!isWide && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setShowIngredientsMobile(!showIngredientsMobile);
            }}
            style={[
              s.ingToggleBtn,
              {
                backgroundColor: showIngredientsMobile ? theme.brand.accent : theme.surface.header,
                borderColor: theme.border.subtle,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Icon
              name="format-list-checks"
              size={20}
              color={showIngredientsMobile ? '#FFFFFF' : theme.text.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. STEP PROGRESS DOTS */}
      <View style={[s.progressRow, { backgroundColor: theme.surface.card }]}>
        {steps.map((st, idx) => {
          const isDone = completedSteps.includes(idx);
          const isCurrent = idx === currentStepIndex;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setCurrentStepIndex(idx);
              }}
              style={[
                s.progressDot,
                {
                  backgroundColor: isDone
                    ? theme.brand.success
                    : isCurrent
                    ? theme.brand.accent
                    : theme.surface.header,
                  flex: 1,
                },
              ]}
            />
          );
        })}
      </View>

      {/* 3. MAIN BODY (SPLIT VIEW ON IPAD / TABLET, 1-COL ON IPHONE) */}
      <View style={[s.mainBody, { flexDirection: isWide ? 'row' : 'column' }]}>
        {/* LEFT COLUMN: INGREDIENTS CHECKLIST (Always visible on iPad, toggle on iPhone) */}
        {(isWide || showIngredientsMobile) && (
          <View
            style={[
              s.ingredientsPane,
              {
                width: isWide ? '36%' : '100%',
                borderRightWidth: isWide ? StyleSheet.hairlineWidth : 0,
                borderRightColor: theme.border.subtle,
                backgroundColor: theme.surface.card,
              },
            ]}
          >
            <View style={s.ingHeaderRow}>
              <Icon name="flask-outline" size={20} color={theme.brand.accent} />
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Định Lượng {currentVariant?.sizeName || 'Món'}
              </AppText>
            </View>
            <AppText variant="xxs" color={theme.text.muted} style={{ marginBottom: 12 }}>
              Chạm vào nguyên liệu để đánh dấu đã đong vào ly
            </AppText>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {ingredients.map((ing, idx) => {
                const isChecked = checkedIngredients.includes(ing.ingredientId || `ing_${idx}`);
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() =>
                      toggleIngredientCheck(ing.ingredientId || `ing_${idx}`)
                    }
                    style={[
                      s.ingItemCard,
                      {
                        backgroundColor: isChecked
                          ? isDark
                            ? 'rgba(34, 197, 94, 0.12)'
                            : 'rgba(21, 128, 61, 0.08)'
                          : theme.surface.card,
                        borderColor: isChecked ? theme.brand.success : theme.border.subtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.appleCircleCheck,
                        {
                          borderColor: isChecked ? theme.brand.success : theme.border.default,
                          backgroundColor: isChecked ? theme.brand.success : 'transparent',
                        },
                      ]}
                    >
                      {isChecked && <Icon name="check" size={14} color="#FFFFFF" />}
                    </View>

                    <AppText
                      variant="sm"
                      color={isChecked ? theme.text.muted : theme.text.primary}
                      style={[s.ingNameText, isChecked && { textDecorationLine: 'line-through' }]}
                    >
                      {ing.ingredientName}
                    </AppText>

                    <AppText
                      variant="md"
                      weight="bold"
                      color={isChecked ? theme.brand.success : theme.brand.accent}
                      tabularNums
                    >
                      {ing.quantity} {ing.unit}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* RIGHT COLUMN: CURRENT ACTIVE STEP + LIVE TIMER + NEXT STEP PREVIEW */}
        {(!showIngredientsMobile || isWide) && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.stepContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Step Badge & Temperature */}
            <View style={s.stepBadgeRow}>
              <View style={[s.stepNumBadge, { backgroundColor: theme.brand.accent }]}>
                <AppText variant="sm" weight="bold" color="#FFFFFF">
                  Bước {currentStepIndex + 1}/{steps.length}
                </AppText>
              </View>

              {currentStep?.temperature && (
                <View
                  style={[
                    s.tempBadge,
                    {
                      backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : '#EFF6FF',
                      borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : '#BFDBFE',
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Icon name="thermometer" size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                  <AppText
                    variant="xs"
                    weight="medium"
                    color={isDark ? '#60A5FA' : '#2563EB'}
                  >
                    {currentStep.temperature}
                  </AppText>
                </View>
              )}
            </View>

            {/* Current Step Title */}
            <AppText variant="lg" weight="bold" color={theme.text.primary} style={s.stepTitle}>
              {currentStep?.title || `Bước ${currentStepIndex + 1}`}
            </AppText>

            {/* Current Step Description (Large Typography for Barista distance) */}
            <AppText variant="md" color={theme.text.primary} style={s.stepDescription}>
              {currentStep?.description}
            </AppText>

            {/* Pro Tip Card */}
            {currentStep?.tip && (
              <View
                style={[
                  s.tipCard,
                  {
                    backgroundColor: theme.status.warningBg,
                    borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : '#FDE68A',
                  },
                ]}
              >
                <Icon name="lightbulb-on-outline" size={22} color={theme.brand.accent} />
                <View style={{ flex: 1 }}>
                  <AppText variant="xs" weight="bold" color={theme.brand.accent} style={{ marginBottom: 2 }}>
                    MẸO QUẦY BAR
                  </AppText>
                  <AppText variant="sm" color={theme.text.primary}>
                    {currentStep.tip}
                  </AppText>
                </View>
              </View>
            )}

            {/* Step Countdown Timer with Big Digits */}
            {timerSeconds !== null && (
              <View
                style={[
                  s.timerContainer,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <View style={s.timerDisplayRow}>
                  <Icon
                    name={isTimerRunning ? 'timer-sand' : 'timer-outline'}
                    size={36}
                    color={timerSeconds === 0 ? theme.brand.success : theme.brand.accent}
                  />
                  <AppText
                    variant="display"
                    weight="bold"
                    color={timerSeconds === 0 ? theme.brand.success : theme.text.primary}
                    tabularNums
                    style={{ marginLeft: 10 }}
                  >
                    {Math.floor(timerSeconds / 60)}:
                    {(timerSeconds % 60).toString().padStart(2, '0')}
                  </AppText>
                </View>

                <View style={s.timerActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={toggleTimer}
                    style={[
                      s.timerBtn,
                      {
                        backgroundColor: isTimerRunning
                          ? theme.brand.danger
                          : timerSeconds === 0
                          ? theme.brand.success
                          : theme.brand.accent,
                      },
                    ]}
                  >
                    <Icon
                      name={
                        isTimerRunning
                          ? 'pause'
                          : timerSeconds === 0
                          ? 'restart'
                          : 'play'
                      }
                      size={20}
                      color="#FFFFFF"
                    />
                    <AppText variant="sm" weight="bold" color="#FFFFFF">
                      {isTimerRunning
                        ? 'Tạm Dừng'
                        : timerSeconds === 0
                        ? 'Hết Giờ'
                        : 'Bắt Đầu Đếm'}
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={resetTimer}
                    style={[
                      s.timerResetBtn,
                      {
                        backgroundColor: theme.surface.header,
                        borderColor: theme.border.subtle,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Icon name="refresh" size={18} color={theme.text.muted} />
                    <AppText variant="xs" color={theme.text.muted}>
                      Đặt Lại
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 4. NEXT STEP PREVIEW CARD (BƯỚC TIẾP THEO) */}
            {nextStep && (
              <View
                style={[
                  s.nextStepCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="arrow-right-circle-outline" size={16} color={theme.text.muted} />
                  <AppText variant="xxs" weight="bold" color={theme.text.muted}>
                    BƯỚC TIẾP THEO ({currentStepIndex + 2}/{steps.length})
                  </AppText>
                </View>
                <AppText variant="sm" weight="bold" color={theme.text.primary}>
                  {nextStep.title}
                </AppText>
                <AppText variant="xs" color={theme.text.muted} numberOfLines={1} style={{ marginTop: 2 }}>
                  {nextStep.description}
                </AppText>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* 5. BOTTOM STEP NAVIGATION DOCK (54pt Tactile Touch Targets) */}
      <View
        style={[
          s.bottomDock,
          {
            backgroundColor: theme.surface.card,
            borderTopColor: theme.border.subtle,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={currentStepIndex === 0}
          onPress={handlePrevStep}
          style={[
            s.navBtn,
            s.navBtnPrev,
            {
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
            },
            currentStepIndex === 0 && { opacity: 0.3 },
          ]}
        >
          <Icon name="chevron-left" size={24} color={theme.text.primary} />
          <AppText variant="sm" weight="bold" color={theme.text.primary}>
            Bước Trước
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleNextStep}
          style={[
            s.navBtn,
            s.navBtnNext,
            {
              backgroundColor:
                currentStepIndex === steps.length - 1
                  ? theme.brand.success
                  : theme.brand.accent,
            },
          ]}
        >
          <AppText variant="md" weight="bold" color="#FFFFFF">
            {currentStepIndex === steps.length - 1
              ? '✓ Hoàn Tất Pha Chế'
              : `Bước Kế Tiếp (${currentStepIndex + 2}/${steps.length})`}
          </AppText>
          <Icon
            name={
              currentStepIndex === steps.length - 1 ? 'check-all' : 'chevron-right'
            }
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  topCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  sizeSubBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  ingToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  mainBody: {
    flex: 1,
  },
  ingredientsPane: {
    padding: 16,
  },
  ingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ingItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  appleCircleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ingNameText: {
    flex: 1,
  },
  stepContentContainer: {
    padding: 20,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepNumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tempBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepTitle: {
    marginBottom: 12,
    lineHeight: 30,
  },
  stepDescription: {
    lineHeight: 28,
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  timerContainer: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  timerDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  timerResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextStepCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  bottomDock: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    height: 52,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navBtnPrev: {
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  navBtnNext: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
