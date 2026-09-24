import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, useAppToast, AppHeader, AppModal } from '../../../lib/components/ui';
import {
  useCategories,
  useToppings,
  usePOSActions,
  MenuItemWithModifiers,
  ModifierOption,
} from '../../../lib/store/usePOSStore';
import { playTapSound } from '../../../lib/utils/sound';
import { formatCurrency } from '../../../lib/utils/format';
import { compressImageFile, SAMPLE_FOOD_IMAGES } from '../../../lib/utils/imageCompressor';

interface ProductFormModalProps {
  visible: boolean;
  itemToEdit: MenuItemWithModifiers | null;
  onClose: () => void;
  onSave: (product: MenuItemWithModifiers) => void;
  onDelete?: (item: MenuItemWithModifiers) => void;
}

const COMMON_UNITS = ['Ly', 'Đĩa', 'Phần', 'Set', 'Chai', 'Lon', 'Cái', 'Tô', 'Kg', 'Gói'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  itemToEdit,
  onClose,
  onSave,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const categories = useCategories();
  const storeToppings = useToppings();
  const { addCategory } = usePOSActions();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [costPriceStr, setCostPriceStr] = useState('');
  const [unit, setUnit] = useState('Ly');
  const [station, setStation] = useState<'bar' | 'kitchen' | 'snack'>('bar');
  const [selectedToppings, setSelectedToppings] = useState<ModifierOption[]>([]);

  // Image state & extreme compression info
  const [image, setImage] = useState<string>('');
  const [imageCompressionInfo, setImageCompressionInfo] = useState<string>('');
  const [showSampleImagesModal, setShowSampleImagesModal] = useState(false);

  // Sizes management state
  const [sizes, setSizes] = useState<ModifierOption[]>([]);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizePriceDeltaStr, setNewSizePriceDeltaStr] = useState('');
  const [showAddSizeForm, setShowAddSizeForm] = useState(false);

  // Quick category creation state
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [newCatNameInput, setNewCatNameInput] = useState('');

  // Quick unit picker modal state
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [customUnitInput, setCustomUnitInput] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setCode(itemToEdit.code || '');
      setCategory(itemToEdit.category || (categories[0]?.name ?? ''));
      setPriceStr(itemToEdit.price ? String(itemToEdit.price) : '');
      setCostPriceStr(itemToEdit.costPrice ? String(itemToEdit.costPrice) : '');
      setUnit(itemToEdit.unit || 'Ly');
      setStation(itemToEdit.station || 'bar');
      setSelectedToppings(itemToEdit.toppings || []);
      setImage(itemToEdit.image || '');
      setImageCompressionInfo(itemToEdit.image ? 'Đã có ảnh' : '');
      setSizes(itemToEdit.sizes ? [...itemToEdit.sizes] : []);
    } else {
      setName('');
      setCode('');
      setCategory(categories[0]?.name ?? '');
      setPriceStr('');
      setCostPriceStr('');
      setUnit('Ly');
      setStation('bar');
      setSelectedToppings([...storeToppings]);
      setImage('');
      setImageCompressionInfo('');
      setSizes([]);
    }
    setShowQuickAddCat(false);
    setNewCatNameInput('');
    setUnitPickerVisible(false);
    setCustomUnitInput('');
    setShowAddSizeForm(false);
    setNewSizeName('');
    setNewSizePriceDeltaStr('');
  }, [itemToEdit, visible, categories, storeToppings]);

  // Extreme Image File Selection & Compression (Web & Mobile HTML5)
  const handleSelectFile = () => {
    playTapSound();
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        try {
          const res = await compressImageFile(file, 400, 0.65);
          setImage(res.dataUrl);
          setImageCompressionInfo(`Đã nén: ${res.sizeKb} KB (giảm ${res.reductionPercent}%)`);
          showToast({
            title: 'Nén thành công',
            message: `Ảnh còn ${res.sizeKb} KB (-${res.reductionPercent}%)`,
            type: 'success',
          });
        } catch (err: any) {
          showToast({ title: 'Lỗi ảnh', message: err.message || 'Lỗi nén ảnh', type: 'danger' });
        }
      };
      input.click();
    } else {
      setShowSampleImagesModal(true);
    }
  };

  const handleSelectSampleImage = (imgUrl: string) => {
    playTapSound();
    setImage(imgUrl);
    setImageCompressionInfo('Ảnh mẫu tối ưu (1:1)');
    setShowSampleImagesModal(false);
    showToast({ title: 'Đã chọn ảnh', message: 'Đã cập nhật ảnh món ăn', type: 'info' });
  };

  const handleClearImage = () => {
    playTapSound();
    setImage('');
    setImageCompressionInfo('');
  };

  const handleApplyDefaultSizes = () => {
    playTapSound();
    setSizes([
      { id: `sz_m_${Date.now()}`, name: 'M', priceDelta: 0 },
      { id: `sz_l_${Date.now() + 1}`, name: 'L', priceDelta: 6000 },
      { id: `sz_xl_${Date.now() + 2}`, name: 'XL', priceDelta: 12000 },
    ]);
    showToast({ title: 'Đã thêm size', message: 'Đã áp dụng mẫu M, L, XL', type: 'success' });
  };

  const handleAddPresetSize = (name: string, delta: number) => {
    playTapSound();
    const cleanName = name.trim().toUpperCase();
    if (sizes.some(s => s.name.toUpperCase() === cleanName)) {
      showToast({ title: 'Đã có', message: `Size ${cleanName} đã tồn tại!`, type: 'warning' });
      return;
    }
    setSizes(prev => [...prev, { id: `sz_${Date.now()}_${Math.floor(Math.random() * 100)}`, name: cleanName, priceDelta: delta }]);
    showToast({ title: 'Đã thêm', message: `Đã thêm Size ${cleanName}`, type: 'success' });
  };

  const handleAddCustomSize = () => {
    const trimmed = newSizeName.trim().toUpperCase();
    if (!trimmed) {
      showToast({ title: 'Thiếu tên size', message: 'Nhập tên size (VD: L, XL)', type: 'danger' });
      return;
    }
    const delta = parseInt(newSizePriceDeltaStr.replace(/\D/g, ''), 10) || 0;
    playTapSound();
    setSizes(prev => [...prev, { id: `sz_${Date.now()}`, name: trimmed, priceDelta: delta }]);
    setNewSizeName('');
    setNewSizePriceDeltaStr('');
    setShowAddSizeForm(false);
    showToast({ title: 'Đã thêm', message: `Đã thêm Size ${trimmed}`, type: 'success' });
  };

  const handleRemoveSize = (id: string) => {
    playTapSound();
    setSizes(prev => prev.filter(s => s.id !== id));
  };

  const handleAutoGenerateSku = () => {
    playTapSound();
    const prefix = category ? category.substring(0, 2).toUpperCase() : 'SK';
    const rand = Math.floor(100 + Math.random() * 900);
    setCode(`${prefix}${rand}`);
  };

  const handleCreateNewCategory = () => {
    const trimmed = newCatNameInput.trim();
    if (!trimmed) {
      showToast({ title: 'Thiếu tên', message: 'Nhập tên danh mục!', type: 'danger' });
      return;
    }
    playTapSound();
    addCategory(trimmed);
    setCategory(trimmed);
    setNewCatNameInput('');
    setShowQuickAddCat(false);
    showToast({ title: 'Đã tạo', message: `Đã thêm danh mục "${trimmed}"`, type: 'success' });
  };

  const toggleTopping = (t: ModifierOption) => {
    playTapSound();
    setSelectedToppings(prev => {
      const exists = prev.some(item => item.id === t.id);
      if (exists) {
        return prev.filter(item => item.id !== t.id);
      } else {
        return [...prev, t];
      }
    });
  };

  const handleSave = () => {
    playTapSound();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast({ title: 'Thiếu tên', message: 'Nhập tên món!', type: 'danger' });
      return;
    }

    const price = parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
    if (price <= 0) {
      showToast({ title: 'Giá sai', message: 'Giá bán phải > 0!', type: 'danger' });
      return;
    }

    // Tự động tạo danh mục nếu người dùng đang gõ dở hoặc chưa có danh mục nào
    let finalCategory = category;
    if (!finalCategory && newCatNameInput.trim()) {
      const trimmedCat = newCatNameInput.trim();
      addCategory(trimmedCat);
      finalCategory = trimmedCat;
    } else if (!finalCategory && categories.length > 0) {
      finalCategory = categories[0].name;
    } else if (!finalCategory) {
      finalCategory = 'Món Khác';
      addCategory('Món Khác');
    }

    const costPrice = parseInt(costPriceStr.replace(/\D/g, ''), 10) || 0;
    const finalCode = code.trim() || `SKU${Math.floor(100 + Math.random() * 900)}`;

    const savedProduct: MenuItemWithModifiers = {
      id: itemToEdit ? itemToEdit.id : `p_${Date.now()}`,
      name: trimmedName,
      code: finalCode,
      category: finalCategory,
      price,
      costPrice,
      unit,
      station,
      sizes: sizes.length > 0 ? sizes : undefined,
      toppings: selectedToppings.length > 0 ? selectedToppings : undefined,
      image: image.trim() || undefined,
      isOutOfStock: itemToEdit?.isOutOfStock || false,
    };

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    onSave(savedProduct);
    onClose();
  };

  const parsedPrice = parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
  const parsedCost = parseInt(costPriceStr.replace(/\D/g, ''), 10) || 0;
  const profitMargin = parsedPrice > 0 ? Math.round(((parsedPrice - parsedCost) / parsedPrice) * 100) : 0;
  const isProfitNegative = parsedPrice > 0 && parsedPrice < parsedCost;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle={isWide ? 'overFullScreen' : 'fullScreen'}
      transparent={isWide}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View
        style={
          isWide
            ? [s.desktopModalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.55)' }]
            : [s.fullScreenContainer, { backgroundColor: theme.surface.app }]
        }
      >
        <View
          style={
            isWide
              ? [
                  s.desktopModalContainer,
                  {
                    backgroundColor: theme.surface.app,
                    borderColor: theme.border.default,
                  },
                ]
              : { flex: 1 }
          }
        >
          {/* Top Header Toàn Màn Hình Thống Nhất AppHeader (Liền Mạch Đệm Status Bar) */}
          <AppHeader
            showBack
            onBack={onClose}
            title={itemToEdit ? 'Chỉnh Sửa Món' : 'Thêm Món Mới'}
            subtitle={itemToEdit ? `Mã: ${itemToEdit.code || 'N/A'}` : 'Nhập thông tin món ăn'}
            rightCustom={
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSave}
                style={[
                  s.btnSaveHeader,
                  {
                    backgroundColor: theme.brand.primary,
                  },
                ]}
              >
                <Icon name="check" size={16} color={theme.text.onBrand} />
                <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                  Lưu
                </AppText>
              </TouchableOpacity>
            }
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: isWide ? 24 : 16,
              paddingTop: isWide ? 16 : 12,
              paddingBottom: Math.max(insets.bottom, 16) + 40,
              maxWidth: isWide ? 760 : undefined,
              alignSelf: isWide ? 'center' : undefined,
              width: '100%',
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* PHÂN ĐOẠN 0: HÌNH ẢNH MÓN ĂN */}
            <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={s.sectionHeader}
          >
            HÌNH ẢNH MÓN ĂN (TỰ ĐỘNG NÉN TỐI ĐA ~30KB)
          </AppText>

          <View
            style={[
              s.imageUploadContainer,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.default,
              },
            ]}
          >
            <View style={[s.imagePreviewBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
              {image ? (
                <Image source={{ uri: image }} style={s.imagePreview} resizeMode="cover" />
              ) : (
                <Icon name="camera-plus-outline" size={30} color={theme.text.muted} />
              )}
            </View>

            <View style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSelectFile}
                  style={[s.btnImageAction, { backgroundColor: theme.brand.primary }]}
                >
                  <Icon name="upload" size={13} color={theme.text.onBrand} />
                  <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                    Tải Ảnh (Nén)
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    setShowSampleImagesModal(true);
                  }}
                  style={[
                    s.btnImageAction,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.default,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Icon name="image-multiple-outline" size={13} color={theme.text.primary} />
                  <AppText variant="xs" weight="medium" color={theme.text.primary}>
                    Ảnh Mẫu F&B
                  </AppText>
                </TouchableOpacity>

                {image ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleClearImage}
                    style={[
                      s.btnImageAction,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                      },
                    ]}
                  >
                    <Icon name="close" size={13} color={theme.brand.danger} />
                    <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                      Bỏ Ảnh
                    </AppText>
                  </TouchableOpacity>
                ) : null}
              </View>

              {imageCompressionInfo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="check-decagram" size={13} color={theme.brand.primary} />
                  <AppText variant="xxs" color={theme.brand.primary} tabularNums weight="medium">
                    {imageCompressionInfo}
                  </AppText>
                </View>
              ) : (
                <AppText variant="xxs" color={theme.text.muted}>
                  Ảnh 3-8MB tự nén còn ~30KB (chuẩn 400x400)
                </AppText>
              )}
            </View>
          </View>

          {/* ĐƯỜNG KẺ HAIRLINE */}
          <View style={[s.sectionDivider, { backgroundColor: theme.border.subtle }]} />

          {/* PHÂN ĐOẠN 1: THÔNG TIN MÓN ĂN */}
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={s.sectionHeader}
          >
            THÔNG TIN MÓN ĂN
          </AppText>

          {/* Hàng Ghép: Tên Món (72%) + Đơn Vị Tính (28% - Nút Chọn [ Ly ▾ ]) */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {/* Tên Món */}
            <View style={{ flex: 1 }}>
              <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
                Tên Món Ăn / Đồ Uống *
              </AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="VD: Cà Phê Muối Cố Đô"
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.default,
                    color: theme.text.primary,
                    fontSize: 16,
                    height: 48,
                  },
                ]}
              />
            </View>

            {/* Đơn Vị Tính (Nút [ Ly ▾ ]) */}
            <View style={{ width: 100 }}>
              <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
                Đơn Vị
              </AppText>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setUnitPickerVisible(true);
                }}
                style={[
                  s.unitPickerBtn,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.default,
                    height: 48,
                  },
                ]}
              >
                <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                  {unit || 'Ly'}
                </AppText>
                <Icon name="menu-down" size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Nhóm Danh Mục */}
          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
              Nhóm Danh Mục *
            </AppText>

            {/* Form tạo nhanh danh mục nếu mở */}
            {showQuickAddCat && (
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <TextInput
                  value={newCatNameInput}
                  onChangeText={setNewCatNameInput}
                  placeholder="Nhập tên danh mục mới..."
                  placeholderTextColor={theme.text.muted}
                  autoFocus
                  style={[
                    s.input,
                    {
                      flex: 1,
                      backgroundColor: theme.surface.card,
                      borderColor: theme.brand.primary,
                      color: theme.text.primary,
                      height: 40,
                    },
                  ]}
                />
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleCreateNewCategory}
                  style={{
                    backgroundColor: theme.brand.primary,
                    paddingHorizontal: 14,
                    height: 40,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                    + Tạo
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {/* Chip [+ Thêm nhóm] ở đầu */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setShowQuickAddCat(!showQuickAddCat);
                }}
                style={[
                  s.chipOption,
                  {
                    backgroundColor: showQuickAddCat ? theme.brand.primaryBg : theme.surface.card,
                    borderColor: theme.brand.primary,
                  },
                ]}
              >
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  {showQuickAddCat ? 'Đóng' : '+ Thêm nhóm'}
                </AppText>
              </TouchableOpacity>

              {categories.map((c) => {
                const isSel = category === c.name;
                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setCategory(c.name);
                    }}
                    style={[
                      s.chipOption,
                      {
                        backgroundColor: isSel ? theme.brand.primary : theme.surface.card,
                        borderColor: isSel ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={isSel ? 'medium' : 'normal'}
                      color={isSel ? theme.text.onBrand : theme.text.primary}
                    >
                      {c.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ĐƯỜNG KẺ HAIRLINE PHÂN TÁCH PHÂN ĐOẠN */}
          <View style={[s.sectionDivider, { backgroundColor: theme.border.subtle }]} />

          {/* PHÂN ĐOẠN 2: TÀI CHÍNH & LỢI NHUẬN (CỤM LIÊN HOÀN) */}
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={s.sectionHeader}
          >
            TÀI CHÍNH & LỢI NHUẬN
          </AppText>

          {/* Giá Bán - Hero Input 22px Jade */}
          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
              Giá Bán (VND) *
            </AppText>
            <View
              style={[
                s.heroPriceContainer,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <TextInput
                value={priceStr}
                onChangeText={setPriceStr}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={theme.text.muted}
                style={[
                  s.heroPriceInput,
                  {
                    color: theme.brand.primary,
                  },
                ]}
              />
              <AppText variant="md" weight="medium" color={theme.brand.primary} style={{ marginLeft: 6 }}>
                đ
              </AppText>
            </View>
          </View>

          {/* Hàng 2 Cột Cân Đối: Giá Vốn COGS bên trái <──> Thẻ Lãi Gộp Dự Kiến bên phải */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {/* Cột trái: Giá vốn COGS */}
            <View style={{ flex: 1 }}>
              <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
                Giá Vốn (VND)
              </AppText>
              <View
                style={[
                  s.costInputContainer,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.default,
                  },
                ]}
              >
                <TextInput
                  value={costPriceStr}
                  onChangeText={setCostPriceStr}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={theme.text.muted}
                  style={[
                    s.costInputInner,
                    {
                      color: theme.text.primary,
                    },
                  ]}
                />
                <AppText variant="xs" color={theme.text.muted}>
                  đ
                </AppText>
              </View>
            </View>

            {/* Cột phải: Thẻ Lãi Gộp & Biên % Tự Động */}
            <View style={{ flex: 1 }}>
              <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
                Lãi Gộp Dự Kiến
              </AppText>
              <View
                style={[
                  s.profitCard,
                  {
                    backgroundColor: isProfitNegative
                      ? theme.status.dangerBg
                      : theme.status.readyBg,
                    borderColor: isProfitNegative ? theme.brand.danger : theme.brand.success,
                  },
                ]}
              >
                <AppText
                  variant="sm"
                  weight="medium"
                  color={isProfitNegative ? theme.brand.danger : theme.brand.success}
                  tabularNums
                  numberOfLines={1}
                >
                  {formatCurrency(parsedPrice - parsedCost)} đ
                </AppText>
                <AppText
                  variant="xs"
                  weight="bold"
                  color={isProfitNegative ? theme.brand.danger : theme.brand.success}
                  tabularNums
                >
                  ({profitMargin}%)
                </AppText>
              </View>
            </View>
          </View>

          {/* ĐƯỜNG KẺ HAIRLINE PHÂN TÁCH PHÂN ĐOẠN */}
          <View style={[s.sectionDivider, { backgroundColor: theme.border.subtle }]} />

          {/* PHÂN ĐOẠN 3: TÙY CHỌN KÍCH CỠ (SIZES) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <AppText
              variant="xs"
              weight="medium"
              color={theme.text.muted}
              style={[s.sectionHeader, { marginTop: 0, marginBottom: 0 }]}
            >
              TÙY CHỌN KÍCH CỠ (SIZES{sizes.length > 0 ? ` · ${sizes.length}` : ''})
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {sizes.length === 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleApplyDefaultSizes}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: theme.brand.primaryBg,
                  }}
                >
                  <AppText variant="xs" color={theme.brand.primary} weight="medium">
                    + Mẫu M, L, XL
                  </AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setShowAddSizeForm(!showAddSizeForm);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: showAddSizeForm ? theme.surface.card : theme.brand.primaryBg,
                  borderWidth: showAddSizeForm ? StyleSheet.hairlineWidth : 0,
                  borderColor: theme.border.default,
                }}
              >
                <AppText variant="xs" color={theme.brand.primary} weight="medium">
                  {showAddSizeForm ? 'Thu gọn' : '+ Thêm size'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form thêm size nhanh & Gợi ý 1-chạm */}
          {showAddSizeForm && (
            <View
              style={[
                s.addSizeBox,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.subtle,
                  borderRadius: 12,
                  padding: 12,
                  gap: 10,
                  marginBottom: 12,
                },
              ]}
            >
              {/* Gợi ý 1-chạm thêm nhanh */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <AppText variant="xxs" color={theme.text.muted}>
                  Gợi ý 1-chạm:
                </AppText>
                {[
                  { name: 'M', delta: 0, label: 'M (+0đ)' },
                  { name: 'L', delta: 5000, label: 'L (+5k)' },
                  { name: 'L', delta: 6000, label: 'L (+6k)' },
                  { name: 'XL', delta: 10000, label: 'XL (+10k)' },
                  { name: 'XL', delta: 12000, label: 'XL (+12k)' },
                ].map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => handleAddPresetSize(preset.name, preset.delta)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: theme.surface.card,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: theme.border.default,
                    }}
                  >
                    <AppText variant="xs" color={theme.brand.primary} weight="medium">
                      + {preset.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ô nhập tùy chỉnh: Tên Size + Giá cộng thêm + Nút Thêm */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={{ width: 100 }}>
                  <TextInput
                    value={newSizeName}
                    onChangeText={setNewSizeName}
                    placeholder="Tên (VD: L)"
                    placeholderTextColor={theme.text.muted}
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.default,
                        color: theme.text.primary,
                        height: 42,
                        fontSize: 15,
                      },
                    ]}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={newSizePriceDeltaStr}
                    onChangeText={setNewSizePriceDeltaStr}
                    placeholder="Giá thêm (+đ)"
                    keyboardType="numeric"
                    placeholderTextColor={theme.text.muted}
                    style={[
                      s.input,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.default,
                        color: theme.text.primary,
                        height: 42,
                        fontSize: 15,
                      },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAddCustomSize}
                  style={{
                    backgroundColor: theme.brand.primary,
                    paddingHorizontal: 14,
                    height: 42,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                    Thêm
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Danh sách Size hiện có */}
          {sizes.length > 0 ? (
            <View style={{ gap: 6, marginBottom: 14 }}>
              {sizes.map((sz, idx) => (
                <View
                  key={sz.id || idx}
                  style={[
                    s.sizeItemRow,
                    {
                      backgroundColor: theme.surface.card,
                      borderColor: theme.border.default,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      minHeight: 44,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[s.sizeBadge, { backgroundColor: theme.brand.primaryBg }]}>
                      <AppText variant="xs" weight="bold" color={theme.brand.primary}>
                        {sz.name}
                      </AppText>
                    </View>
                    <AppText variant="sm" weight="medium" color={theme.text.primary}>
                      Size {sz.name}
                    </AppText>
                    <AppText variant="sm" color={theme.brand.primary} tabularNums>
                      {sz.priceDelta > 0 ? `+${formatCurrency(sz.priceDelta)} đ` : 'Mặc định (0đ)'}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleRemoveSize(sz.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close-circle-outline" size={20} color={theme.text.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: theme.surface.header,
                padding: 10,
                borderRadius: 8,
                marginBottom: 14,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.subtle,
              }}
            >
              <AppText variant="xs" color={theme.text.muted}>
                Chưa có kích cỡ riêng (Món áp dụng 1 kích cỡ niêm yết chuẩn).
              </AppText>
            </View>
          )}

          {/* ĐƯỜNG KẺ HAIRLINE PHÂN TÁCH PHÂN ĐOẠN */}
          <View style={[s.sectionDivider, { backgroundColor: theme.border.subtle }]} />

          {/* PHÂN ĐOẠN 4: CẤU HÌNH VẬN HÀNH & KDS */}
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={s.sectionHeader}
          >
            VẬN HÀNH & KDS
          </AppText>

          {/* Mã SKU */}
          <View style={s.formField}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <AppText variant="xs" color={theme.text.muted}>
                Mã SKU
              </AppText>
              <TouchableOpacity
                onPress={handleAutoGenerateSku}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  Tự sinh mã
                </AppText>
              </TouchableOpacity>
            </View>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="VD: CF01"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="characters"
              style={[
                s.input,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.default,
                  color: theme.text.primary,
                  height: 44,
                },
              ]}
            />
          </View>

          {/* Trạm Chế Biến KDS (Xuất Order) */}
          <View style={s.formField}>
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 6 }}>
              Trạm Chế Biến KDS (Xuất Order)
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { id: 'bar' as const, label: 'Quầy Bar', icon: 'cup-water' },
                { id: 'kitchen' as const, label: 'Bếp Nóng', icon: 'pot-steam' },
                { id: 'snack' as const, label: 'Ăn Vặt', icon: 'food' },
              ].map((st) => {
                const isSel = station === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setStation(st.id);
                    }}
                    style={[
                      s.stationOption,
                      {
                        backgroundColor: isSel ? theme.brand.primaryBg : theme.surface.card,
                        borderColor: isSel ? theme.brand.primary : theme.border.default,
                      },
                    ]}
                  >
                    <Icon
                      name={st.icon as any}
                      size={16}
                      color={isSel ? theme.brand.primary : theme.text.muted}
                    />
                    <AppText
                      variant="xs"
                      weight={isSel ? 'medium' : 'normal'}
                      color={isSel ? theme.brand.primary : theme.text.primary}
                    >
                      {st.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Phân đoạn 4: Topping Đi Kèm */}
          {storeToppings.length > 0 && (
            <View style={s.formField}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Topping đi kèm ({selectedToppings.length}/{storeToppings.length})
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    if (selectedToppings.length === storeToppings.length) {
                      setSelectedToppings([]);
                    } else {
                      setSelectedToppings([...storeToppings]);
                    }
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AppText variant="xs" color={theme.brand.primary} weight="medium">
                    {selectedToppings.length === storeToppings.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                  </AppText>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {storeToppings.map(t => {
                  const isChecked = selectedToppings.some(item => item.id === t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      onPress={() => toggleTopping(t)}
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          minHeight: 44,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          borderWidth: 1,
                          backgroundColor: isChecked ? theme.brand.primaryBg : theme.surface.card,
                          borderColor: isChecked ? theme.brand.primary : theme.border.default,
                          gap: 6,
                        },
                      ]}
                    >
                      <Icon
                        name={isChecked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                        size={16}
                        color={isChecked ? theme.brand.primary : theme.text.muted}
                      />
                      <AppText
                        variant="xs"
                        weight={isChecked ? 'medium' : 'normal'}
                        color={isChecked ? theme.brand.primary : theme.text.primary}
                      >
                        {t.name}
                      </AppText>
                      {t.priceDelta > 0 && (
                        <AppText
                          variant="xs"
                          tabularNums
                          color={isChecked ? theme.brand.primary : theme.text.muted}
                        >
                          +{t.priceDelta / 1000}k
                        </AppText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Nút Xóa Món Khỏi Thực Đơn */}
          {itemToEdit && onDelete && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                onClose();
                onDelete(itemToEdit);
              }}
              style={[
                s.btnDeleteBottom,
                {
                  borderColor: theme.brand.danger,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)',
                },
              ]}
            >
              <Icon name="trash-can-outline" size={18} color={theme.brand.danger} />
              <AppText variant="sm" weight="medium" color={theme.brand.danger}>
                Xóa Món Này
              </AppText>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Modal Chọn Đơn Vị Tính */}
        <AppModal
          visible={unitPickerVisible}
          onClose={() => setUnitPickerVisible(false)}
          title="Chọn Đơn Vị Tính"
          width={380}
        >
          <View style={{ gap: 14, paddingVertical: 4 }}>
            <View style={s.unitGrid}>
              {COMMON_UNITS.map((u) => {
                const isSel = unit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setUnit(u);
                      setUnitPickerVisible(false);
                    }}
                    style={[
                      s.unitGridItem,
                      {
                        backgroundColor: isSel ? theme.brand.primaryBg : theme.surface.header,
                        borderColor: isSel ? theme.brand.primary : 'transparent',
                      },
                    ]}
                  >
                    <AppText
                      variant="sm"
                      weight={isSel ? 'medium' : 'normal'}
                      color={isSel ? theme.brand.primary : theme.text.primary}
                    >
                      {u}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ô Tự Gõ Đơn Vị Khác */}
            <View style={s.customUnitRow}>
              <TextInput
                value={customUnitInput}
                onChangeText={setCustomUnitInput}
                placeholder="Hoặc gõ đơn vị khác..."
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  {
                    flex: 1,
                    height: 42,
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.default,
                    color: theme.text.primary,
                    fontSize: 16,
                  },
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const trimmed = customUnitInput.trim();
                  if (trimmed) {
                    playTapSound();
                    setUnit(trimmed);
                    setCustomUnitInput('');
                    setUnitPickerVisible(false);
                  }
                }}
                style={[
                  s.btnApplyCustomUnit,
                  {
                    backgroundColor: theme.brand.primary,
                  },
                ]}
              >
                <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                  Áp Dụng
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </AppModal>

        {/* Modal Chọn Nhanh Ảnh Món Mẫu F&B */}
        {showSampleImagesModal && (
          <AppModal
            visible={showSampleImagesModal}
            onClose={() => setShowSampleImagesModal(false)}
            title="Thư Viện Ảnh Món F&B Mẫu"
            subtitle="Ảnh vuông 1:1 chuẩn đẹp, tải siêu nhẹ"
            width={480}
          >
            <View style={s.sampleImageGrid}>
              {SAMPLE_FOOD_IMAGES.map((item, idx) => {
                const isPicked = image === item.url;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => handleSelectSampleImage(item.url)}
                    style={[
                      s.sampleImageCard,
                      {
                        backgroundColor: theme.surface.header,
                        borderColor: isPicked ? theme.brand.primary : theme.border.default,
                        borderWidth: isPicked ? 2 : 1,
                      },
                    ]}
                  >
                    <Image source={{ uri: item.url }} style={s.sampleImageThumb} resizeMode="cover" />
                    <View style={{ padding: 6 }}>
                      <AppText variant="xs" weight={isPicked ? 'medium' : 'normal'} color={isPicked ? theme.brand.primary : theme.text.primary} numberOfLines={1}>
                        {item.name}
                      </AppText>
                      <AppText variant="xxs" color={theme.text.muted} numberOfLines={1}>
                        {item.category}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </AppModal>
        )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  desktopModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  desktopModalContainer: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '92%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  imageUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  imagePreviewBox: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  btnImageAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  sampleImagePickerSheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    flexShrink: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    elevation: 10,
  },
  sampleImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  sampleImageCard: {
    width: '31.5%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sampleImageThumb: {
    width: '100%',
    height: 80,
  },
  addSizeBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  sizeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  heroPriceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  btnDeleteBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
    marginBottom: 12,
  },
  formField: {
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  chipOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  costInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  costInputInner: {
    flex: 1,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  profitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  stationOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 44,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  unitPickerSheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    elevation: 10,
  },
  unitPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  unitGridItem: {
    width: '31%',
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUnitRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnApplyCustomUnit: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProductFormModal;
