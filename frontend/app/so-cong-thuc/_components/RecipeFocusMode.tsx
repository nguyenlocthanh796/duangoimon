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
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText } from '../../../lib/components/ui';
import { playTapSound, playBrewAlarmSound, playSuccessSound } from '../../../lib/utils/sound';
import {
  RecipeBookItem,
  RecipeStep,
  RecipeSizeVariant,
} from '../../../lib/store/useRecipeBookStore';

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
          backgroundColor: isDark ? '#0A0806' : '#14110E',
          paddingTop: insets.top > 0 ? insets.top : 12,
          paddingBottom: safeBottom,
        },
      ]}
    >
      {/* 1. TOP HEADER BAR */}
      <View style={s.topBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            onExit();
          }}
          style={s.exitBtn}
        >
          <Icon name="close" size={22} color="#F3EFEA" />
          <AppText variant="sm" weight="bold" color="#F3EFEA">
            Thoát
          </AppText>
        </TouchableOpacity>

        <View style={s.topCenter}>
          <AppText variant="md" weight="bold" color="#F3EFEA" numberOfLines={1}>
            {recipe.productName}
          </AppText>
          {currentVariant && (
            <View style={s.sizeSubBadge}>
              <AppText variant="xxs" weight="bold" color="#FBBF24">
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
              showIngredientsMobile && { backgroundColor: theme.brand.accent },
            ]}
          >
            <Icon
              name="format-list-checks"
              size={20}
              color={showIngredientsMobile ? '#FFFFFF' : '#A8A29E'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. STEP PROGRESS DOTS */}
      <View style={s.progressRow}>
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
                    : '#2D2824',
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
                borderRightWidth: isWide ? 1 : 0,
                borderRightColor: '#2D2824',
                backgroundColor: '#14110E',
              },
            ]}
          >
            <View style={s.ingHeaderRow}>
              <Icon name="flask-outline" size={20} color={theme.brand.accent} />
              <AppText variant="md" weight="bold" color="#F3EFEA">
                Định Lượng {currentVariant?.sizeName || 'Món'}
              </AppText>
            </View>
            <AppText variant="xxs" color="#A8A29E" style={{ marginBottom: 12 }}>
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
                      isChecked && { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: '#22C55E' },
                    ]}
                  >
                    <View
                      style={[
                        s.appleCircleCheck,
                        { borderColor: isChecked ? '#22C55E' : '#A8A29E' },
                        isChecked && { backgroundColor: '#22C55E' },
                      ]}
                    >
                      {isChecked && <Icon name="check" size={14} color="#FFFFFF" />}
                    </View>

                    <AppText
                      variant="sm"
                      color={isChecked ? '#A8A29E' : '#F3EFEA'}
                      style={[s.ingNameText, isChecked && { textDecorationLine: 'line-through' }]}
                    >
                      {ing.ingredientName}
                    </AppText>

                    <AppText
                      variant="md"
                      weight="bold"
                      color={isChecked ? '#22C55E' : theme.brand.accent}
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
                <View style={s.tempBadge}>
                  <Icon name="thermometer" size={16} color="#60A5FA" />
                  <AppText variant="xs" weight="medium" color="#60A5FA">
                    {currentStep.temperature}
                  </AppText>
                </View>
              )}
            </View>

            {/* Current Step Title */}
            <AppText variant="lg" weight="bold" color="#F3EFEA" style={s.stepTitle}>
              {currentStep?.title || `Bước ${currentStepIndex + 1}`}
            </AppText>

            {/* Current Step Description (Large Typography for Barista distance) */}
            <AppText variant="md" color="#E7E5E4" style={s.stepDescription}>
              {currentStep?.description}
            </AppText>

            {/* Pro Tip Card */}
            {currentStep?.tip && (
              <View style={s.tipCard}>
                <Icon name="lightbulb-on-outline" size={22} color="#FBBF24" />
                <View style={{ flex: 1 }}>
                  <AppText variant="xs" weight="bold" color="#FBBF24" style={{ marginBottom: 2 }}>
                    MẸO QUẦY BAR
                  </AppText>
                  <AppText variant="sm" color="#FEF3C7">
                    {currentStep.tip}
                  </AppText>
                </View>
              </View>
            )}

            {/* Step Countdown Timer with Big Digits */}
            {timerSeconds !== null && (
              <View style={s.timerContainer}>
                <View style={s.timerDisplayRow}>
                  <Icon
                    name={isTimerRunning ? 'timer-sand' : 'timer-outline'}
                    size={36}
                    color={timerSeconds === 0 ? theme.brand.success : theme.brand.accent}
                  />
                  <AppText
                    variant="display"
                    weight="bold"
                    color={timerSeconds === 0 ? theme.brand.success : '#F3EFEA'}
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
                          ? '#DC2626'
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
                    style={s.timerResetBtn}
                  >
                    <Icon name="refresh" size={18} color="#A8A29E" />
                    <AppText variant="xs" color="#A8A29E">
                      Đặt Lại
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 4. NEXT STEP PREVIEW CARD (BƯỚC TIẾP THEO) */}
            {nextStep && (
              <View style={s.nextStepCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="arrow-right-circle-outline" size={16} color="#A8A29E" />
                  <AppText variant="xxs" weight="bold" color="#A8A29E">
                    BƯỚC TIẾP THEO ({currentStepIndex + 2}/{steps.length})
                  </AppText>
                </View>
                <AppText variant="sm" weight="bold" color="#F3EFEA">
                  {nextStep.title}
                </AppText>
                <AppText variant="xs" color="#A8A29E" numberOfLines={1} style={{ marginTop: 2 }}>
                  {nextStep.description}
                </AppText>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* 5. BOTTOM STEP NAVIGATION DOCK (54pt Tactile Touch Targets) */}
      <View style={s.bottomDock}>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={currentStepIndex === 0}
          onPress={handlePrevStep}
          style={[
            s.navBtn,
            s.navBtnPrev,
            currentStepIndex === 0 && { opacity: 0.3 },
          ]}
        >
          <Icon name="chevron-left" size={24} color="#F3EFEA" />
          <AppText variant="sm" weight="bold" color="#F3EFEA">
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
    borderBottomColor: '#2D2824',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1E1813',
  },
  topCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  sizeSubBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  ingToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1E1813',
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
    borderColor: '#2D2824',
    backgroundColor: '#1E1813',
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
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
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
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  timerContainer: {
    backgroundColor: '#1E1813',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D2824',
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
    backgroundColor: '#2D2824',
  },
  nextStepCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1E1813',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2D2824',
    marginBottom: 20,
  },
  bottomDock: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
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
    backgroundColor: '#1E1813',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2D2824',
  },
  navBtnNext: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
