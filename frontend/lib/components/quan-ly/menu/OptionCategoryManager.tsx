'use client';
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, formatVND, ss } from '../../../theme';
import { shape } from '../../../theme/shape';
import AppText from '../../ui/AppText';
import FormModal from '../../ui/FormModal';
import { useResponsive } from '../../../hooks/useResponsive';
import {
  useCategoryOptionSettings,
  CategoryItem,
  OptionGroup,
} from '../../../hooks/useCategoryOptionSettings';

const POPULAR_ICONS = [
  'food',
  'cup-water',
  'ice-cream',
  'candy',
  'coffee',
  'glass-cocktail',
  'cake',
  'snowflake',
  'silverware-variant',
  'fruit-cherries',
  'pizza',
  'hamburger',
  'noodle',
  'dots-horizontal',
];

const PRESET_COLORS = [
  { color: '#D97706', bg: '#FEF3C7' },
  { color: '#2563EB', bg: '#EFF6FF' },
  { color: '#DB2777', bg: '#FCE7F3' },
  { color: '#16A34A', bg: '#ECFDF5' },
  { color: '#9333EA', bg: '#F3E8FF' },
  { color: '#EA580C', bg: '#FFEDD5' },
  { color: '#0284C7', bg: '#E0F2FE' },
  { color: '#737373', bg: '#F1F5F9' },
];

export default function OptionCategoryManager({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const {
    categories,
    optionGroups,
    addCategory,
    updateCategory,
    deleteCategory,
    addOptionGroup,
    deleteOptionGroup,
    addChoiceToGroup,
    deleteChoiceFromGroup,
  } = useCategoryOptionSettings();

  const [activeSection, setActiveSection] = useState<'categories' | 'options'>('categories');
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const selectedCat = categories.find((c) => c.id === selectedCatId) || null;

  // Modals for adding
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('food');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  // New Option Group State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'size' | 'topping' | 'single' | 'multiple'>('topping');

  // Choice Inline Form State
  const [choiceInputGroup, setChoiceInputGroup] = useState<string | null>(null);
  const [newChoiceName, setNewChoiceName] = useState('');
  const [newChoicePrice, setNewChoicePrice] = useState('');

  // Filtered categories
  const filteredCategories = categories.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  // Filtered option groups
  const filteredOptionGroups = optionGroups.filter((g) =>
    !search.trim() || g.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const editCategory = (cat: any) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setSelectedIcon(cat.icon || 'food');
    setShowAddCatModal(true);
  };

  // Handle Add Category
  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng nhập tên danh mục món ăn');
      return;
    }
    const preset = PRESET_COLORS[selectedColorIdx];
    if (editingCategory) {
      updateCategory(editingCategory.id, { name: newCatName, icon: selectedIcon, color: preset.color, bgColor: preset.bg });
      setEditingCategory(null);
    } else {
      addCategory(newCatName, selectedIcon, preset.color, preset.bg);
    }
    setNewCatName('');
    setShowAddCatModal(false);
  };

  // Handle Add Option Group
  const handleAddOptionGroup = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng nhập tên nhóm tùy chọn');
      return;
    }
    addOptionGroup(newGroupName, newGroupType, []);
    setNewGroupName('');
    setShowAddGroupModal(false);
  };

  // Handle Add Choice to Group
  const handleAddChoice = (groupId: string) => {
    if (!newChoiceName.trim()) {
      Alert.alert('Cảnh báo', 'Vui lòng nhập tên tùy chọn (Ví dụ: Size L hoặc Trân Châu)');
      return;
    }
    const priceNum = parseInt(newChoicePrice.replace(/[^0-9]/g, ''), 10) || 0;
    addChoiceToGroup(groupId, newChoiceName, priceNum);
    setNewChoiceName('');
    setNewChoicePrice('');
    setChoiceInputGroup(null);
  };

  const totalChoicesCount = optionGroups.reduce((acc, g) => acc + g.choices.length, 0);

  return (
    <View style={styles.container}>
      {/* Top Header with Search & Add Button (Unified for Desktop & Mobile) */}
      <View style={{ paddingHorizontal: 6, paddingTop: 6 }}>
        <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput
            style={ss.searchTextInput}
            placeholder={
              activeSection === 'categories'
                ? 'Tìm danh mục món...'
                : 'Tìm nhóm size & topping...'
            }
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => {
            if (activeSection === 'categories') {
              setNewCatName('');
              setShowAddCatModal(true);
            } else {
              setNewGroupName('');
              setShowAddGroupModal(true);
            }
          }}
          style={ss.addBtn}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={18} color={colors.text.inverse} />
          <AppText variant="md" color={colors.text.inverse}>
            {activeSection === 'categories' ? 'Thêm DM' : 'Thêm nhóm'}
          </AppText>
        </TouchableOpacity>
      </View>
      </View>

      {/* ── Top Overview Summary Badges (Desktop/Tablet Wide Screen Only) ────────────────────────── */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="shape-outline" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#050505">
                {categories.length} danh mục
              </AppText>
              <AppText variant="md" color="#65676B">
                Tổng nhóm món ăn
              </AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="tune-variant" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#2563EB">
                {optionGroups.length} nhóm tùy chọn
              </AppText>
              <AppText variant="md" color="#65676B">
                Size & Topping
              </AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="format-list-checks" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#16A34A">
                {totalChoicesCount} món kèm & size
              </AppText>
              <AppText variant="md" color="#65676B">
                Tùy chọn chi tiết
              </AppText>
            </View>
          </View>
        </View>
      )}

      {/* ── Sub Navigation Floating Pill Chips (36px) ────────────────────────── */}
      <View style={styles.filterToolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, height: 46 }}
          contentContainerStyle={{ alignItems: 'center', backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 6, paddingHorizontal: 6 }}
        >
          <TouchableOpacity
            onPress={() => setActiveSection('categories')}
            style={[styles.pillChip, activeSection === 'categories' && styles.pillChipActive]}
          >
            <AppText
              variant="md"
             
              color={activeSection === 'categories' ? '#F97316' : '#334155'}
            >
              Danh Mục Món ({categories.length})
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSection('options')}
            style={[styles.pillChip, activeSection === 'options' && styles.pillChipActive]}
          >
            <AppText
              variant="md"
             
              color={activeSection === 'options' ? '#F97316' : '#334155'}
            >
              Size & Toppings ({optionGroups.length})
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── MAIN BODY CONTENT (Split Layout on Wide Screens) ────────────────────────── */}
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {activeSection === 'categories' ? (
                /* ── CATEGORIES LIST ── */
                filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => {
                    const isSelected = selectedCatId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setSelectedCatId(isSelected ? null : cat.id)}
                        style={[styles.itemCard, isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg }]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.catBadgeCircle, { backgroundColor: cat.bgColor || '#EFF6FF' }]}>
                          <Icon name={(cat.icon || 'food') as any} size={20} color={cat.color || colors.brand.primary} />
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="md" color="#050505">
                            {cat.name}
                          </AppText>
                          <AppText variant="md" color="#65676B">
                            Mã slug: {cat.id}
                          </AppText>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <AppText variant="md" color="#65676B">
                              {cat.isActive ? 'Bật' : 'Ẩn'}
                            </AppText>
                            <Switch
                              value={cat.isActive}
                              onValueChange={(val) => updateCategory(cat.id, { isActive: val })}
                              trackColor={{ false: '#CBD5E1', true: colors.brand.primary + '80' }}
                              thumbColor={cat.isActive ? colors.brand.primary : '#F1F5F9'}
                            />
                          </View>

                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert('Xóa danh mục', `Bạn có chắc muốn xóa danh mục "${cat.name}"?`, [
                                { text: 'Hủy', style: 'cancel' },
                                {
                                  text: 'Xóa',
                                  style: 'destructive',
                                  onPress: () => {
                                    deleteCategory(cat.id);
                                    if (selectedCatId === cat.id) setSelectedCatId(null);
                                  },
                                },
                              ]);
                            }}
                            style={styles.deleteIconBtn}
                          >
                            <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyCard}>
                    <Icon name="magnify-remove-outline" size={40} color={colors.text.muted} />
                    <AppText variant="md" color={colors.text.muted}>Không tìm thấy danh mục nào phù hợp</AppText>
                  </View>
                )
              ) : (
                /* ── OPTION GROUPS LIST ── */
                filteredOptionGroups.length > 0 ? (
                  filteredOptionGroups.map((grp) => (
                    <View key={grp.id} style={styles.groupCard}>
                      {/* Group Header */}
                      <View style={styles.groupHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.codeTag, { backgroundColor: '#EFF6FF' }]}>
                            <Icon
                              name={grp.type === 'size' ? 'resize' : grp.type === 'topping' ? 'food-apple' : 'tune'}
                              size={16}
                              color={colors.brand.primary}
                            />
                          </View>
                          <AppText variant="md" color="#050505">
                            {grp.name}
                          </AppText>
                          <View style={styles.typeBadge}>
                            <AppText variant="md" color={colors.brand.primary}>
                              {grp.type === 'size' ? 'Size Kích Cỡ' : grp.type === 'topping' ? 'Topping Kèm' : 'Khẩu vị'}
                            </AppText>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert('Xóa nhóm', `Bạn có chắc muốn xóa nhóm "${grp.name}"?`, [
                              { text: 'Hủy', style: 'cancel' },
                              { text: 'Xóa', style: 'destructive', onPress: () => deleteOptionGroup(grp.id) },
                            ]);
                          }}
                          style={styles.deleteIconBtn}
                        >
                          <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
                        </TouchableOpacity>
                      </View>

                      {/* Choices List */}
                      <View style={{ gap: 6, marginTop: 4 }}>
                        {grp.choices.map((ch) => (
                          <View key={ch.id} style={styles.choiceRow}>
                            <AppText variant="md" color="#050505">
                              {ch.name}
                            </AppText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <AppText variant="md" color={colors.status.success}>
                                {ch.price > 0 ? `+${formatVND(ch.price)}` : 'Miễn phí'}
                              </AppText>
                              <TouchableOpacity onPress={() => deleteChoiceFromGroup(grp.id, ch.id)}>
                                <Icon name="close-circle-outline" size={18} color="#94A3B8" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* Inline Choice Input */}
                      {choiceInputGroup === grp.id ? (
                        <View style={styles.addChoiceBox}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <TextInput
                              style={styles.smallInput}
                              placeholder="Tên tùy chọn (VD: Size L hoặc Trân Châu Đen)"
                              placeholderTextColor="#94A3B8"
                              value={newChoiceName}
                              onChangeText={setNewChoiceName}
                            />
                            <TextInput
                              style={styles.smallInput}
                              placeholder="Giá cộng thêm (VD: 5000 hoặc 0)"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={newChoicePrice}
                              onChangeText={setNewChoicePrice}
                            />
                          </View>
                          <View style={{ gap: 4 }}>
                            <TouchableOpacity
                              onPress={() => handleAddChoice(grp.id)}
                              style={styles.smallSaveBtn}
                            >
                              <AppText variant="md" color="#FFF">Lưu</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setChoiceInputGroup(null)}
                              style={styles.smallCancelBtn}
                            >
                              <AppText variant="md" color="#65676B">Hủy</AppText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setChoiceInputGroup(grp.id);
                            setNewChoiceName('');
                            setNewChoicePrice('');
                          }}
                          style={styles.addChoiceTriggerBtn}
                        >
                          <Icon name="plus" size={16} color={colors.brand.primary} />
                          <AppText variant="md" color={colors.brand.primary}>
                            Thêm giá tùy chọn vào nhóm này
                          </AppText>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Icon name="magnify-remove-outline" size={40} color={colors.text.muted} />
                    <AppText variant="md" color={colors.text.muted}>Không tìm thấy nhóm tùy chọn nào phù hợp</AppText>
                  </View>
                )
              )}
            </ScrollView>
          </View>

          <View style={{ flex: 0.45 }}>
            {selectedCat ? (
              <View style={styles.panelBox}>
                <View style={styles.panelHeader}>
                  <View style={[styles.catBadgeCircle, { backgroundColor: selectedCat.bgColor || '#EFF6FF' }]}>
                    <Icon name={(selectedCat.icon || 'food') as any} size={20} color={selectedCat.color || colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" color="#050505">
                      {selectedCat.name}
                    </AppText>
                    <AppText variant="md" color={colors.text.secondary}>
                      Mã slug: {selectedCat.id}
                    </AppText>
                  </View>
                </View>

                <View style={styles.panelStatRow}>
                  <AppText variant="md" color="#65676B">Trạng thái hiển thị</AppText>
                  <AppText variant="md" color={selectedCat.isActive ? colors.status.success : '#65676B'}>
                    {selectedCat.isActive ? 'Đang bật' : 'Tạm ẩn'}
                  </AppText>
                </View>

                <View style={styles.panelDivider} />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    style={ss.panelBtnSecondary}
                    onPress={() => {
                      updateCategory(selectedCat.id, { isActive: !selectedCat.isActive });
                    }}
                  >
                    <Icon name={selectedCat.isActive ? "eye-off-outline" : "eye-outline"} size={16} color={colors.brand.primary} />
                    <AppText variant="md" color={colors.brand.primary}>
                      {selectedCat.isActive ? 'Ẩn danh mục' : 'Hiện danh mục'}
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={ss.panelBtnDanger}
                    onPress={() => {
                      Alert.alert('Xóa danh mục', `Bạn có chắc muốn xóa "${selectedCat.name}"?`, [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Xóa',
                          style: 'destructive',
                          onPress: () => {
                            deleteCategory(selectedCat.id);
                            setSelectedCatId(null);
                          },
                        },
                      ]);
                    }}
                  >
                    <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
                    <AppText variant="md" color={colors.status.danger}>Xóa</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={ss.detailPanelEmpty}>
                <Icon name="shape-outline" size={48} color={colors.text.muted} />
                <AppText variant="md" color="#050505">
                  Chi Tiết Danh Mục Món
                </AppText>
                <AppText variant="md" color="#65676B" style={{ textAlign: 'center' }}>
                  Chọn một danh mục từ danh sách bên trái để xem chi tiết & điều chỉnh
                </AppText>
                <TouchableOpacity
                  style={ss.panelCta}
                  onPress={() => {
                    setNewCatName('');
                    setShowAddCatModal(true);
                  }}
                >
                  <Icon name="plus" size={18} color="#FFF" />
                  <AppText variant="md" color="#FFF">
                    Thêm danh mục món mới
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            {activeSection === 'categories' ? (
              filteredCategories.length > 0 ? (
                <View style={ss.sectionWrap}>
                  <View style={ss.sectionHeader}>
                    <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
                      <Icon name="shape-outline" size={14} color={colors.brand.primary} />
                    </View>
                    <AppText variant="md" color="#1E293B" style={{ flex: 1 }}>
                      Danh mục món ăn ({filteredCategories.length})
                    </AppText>
                  </View>

                  <View style={ss.sectionItems}>
                    {filteredCategories.map((cat) => {
                      return (
                        <View key={cat.id} style={ss.listRow}>
                          <View style={[styles.posAvatarMiniCircle, { backgroundColor: cat.bgColor || '#EFF6FF' }]}>
                            <Icon name={(cat.icon || 'food') as any} size={14} color={cat.color || colors.brand.primary} />
                          </View>

                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}>
                            <AppText variant="md" color="#0F172A" numberOfLines={1}>
                              {cat.name}
                            </AppText>
                            <View style={styles.posCodeBadge}>
                              <AppText variant="md" color="#64748B" numberOfLines={1}>
                                {cat.id}
                              </AppText>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
                            <Switch
                              value={cat.isActive}
                              onValueChange={(val) => updateCategory(cat.id, { isActive: val })}
                              trackColor={{ false: '#CBD5E1', true: colors.brand.primary + '80' }}
                              thumbColor={cat.isActive ? colors.brand.primary : '#F1F5F9'}
                            />
                          </View>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity style={ss.miniActionBtn} onPress={() => editCategory(cat)}>
                              <Icon name="pencil" size={16} color={colors.brand.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[ss.miniActionBtn, { backgroundColor: '#FEE2E2' }]}
                              onPress={() => {
                                Alert.alert('Xóa danh mục', `Bạn có chắc muốn xóa danh mục "${cat.name}"?`, [
                                  { text: 'Hủy', style: 'cancel' },
                                  {
                                    text: 'Xóa',
                                    style: 'destructive',
                                    onPress: () => {
                                      deleteCategory(cat.id);
                                      if (selectedCatId === cat.id) setSelectedCatId(null);
                                    },
                                  },
                                ]);
                              }}
                            >
                              <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Icon name="magnify-remove-outline" size={40} color={colors.text.muted} />
                  <AppText variant="md" color={colors.text.muted}>Không tìm thấy danh mục nào phù hợp</AppText>
                </View>
              )
            ) : (
              filteredOptionGroups.length > 0 ? (
                filteredOptionGroups.map((grp) => (
                  <View key={grp.id} style={ss.sectionWrap}>
                    <View style={ss.sectionHeader}>
                      <View style={[ss.iconCircleSm, { backgroundColor: '#EFF6FF' }]}>
                        <Icon
                          name={grp.type === 'size' ? 'resize' : grp.type === 'topping' ? 'food-apple' : 'tune'}
                          size={14}
                          color={colors.brand.primary}
                        />
                      </View>
                      <AppText variant="md" color="#1E293B" style={{ flex: 1 }}>
                        {grp.name} ({grp.choices.length})
                      </AppText>
                      <View style={[styles.typeBadge, { marginRight: 8, backgroundColor: '#F1F5F9' }]}>
                        <AppText variant="md" color="#64748B" weight="normal">
                          {grp.type === 'size' ? 'Size Kích Cỡ' : grp.type === 'topping' ? 'Topping Kèm' : 'Khẩu vị'}
                        </AppText>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Xóa nhóm', `Bạn có chắc muốn xóa nhóm "${grp.name}"?`, [
                            { text: 'Hủy', style: 'cancel' },
                            { text: 'Xóa', style: 'destructive', onPress: () => deleteOptionGroup(grp.id) },
                          ]);
                        }}
                        style={[ss.miniActionBtn, { backgroundColor: '#FEE2E2' }]}
                      >
                        <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={ss.sectionItems}>
                      {grp.choices.map((ch) => (
                        <View key={ch.id} style={ss.listRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <AppText variant="md" weight="normal" color="#0F172A">
                              {ch.name}
                            </AppText>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <AppText variant="md" color={colors.status.success}>
                              {ch.price > 0 ? `+${formatVND(ch.price)}` : 'Miễn phí'}
                            </AppText>
                            <TouchableOpacity style={ss.miniActionBtn} onPress={() => deleteChoiceFromGroup(grp.id, ch.id)}>
                              <Icon name="close-circle-outline" size={16} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}

                      {choiceInputGroup === grp.id ? (
                        <View style={styles.addChoiceBox}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <TextInput
                              style={styles.smallInput}
                              placeholder="Tên tùy chọn (VD: Size L hoặc Trân Châu Đen)"
                              placeholderTextColor="#94A3B8"
                              value={newChoiceName}
                              onChangeText={setNewChoiceName}
                            />
                            <TextInput
                              style={styles.smallInput}
                              placeholder="Giá cộng thêm (VD: 5000 hoặc 0)"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={newChoicePrice}
                              onChangeText={setNewChoicePrice}
                            />
                          </View>
                          <View style={{ gap: 4 }}>
                            <TouchableOpacity
                              onPress={() => handleAddChoice(grp.id)}
                              style={styles.smallSaveBtn}
                            >
                              <AppText variant="md" color="#FFF">Lưu</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setChoiceInputGroup(null)}
                              style={styles.smallCancelBtn}
                            >
                              <AppText variant="md" color="#65676B">Hủy</AppText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setChoiceInputGroup(grp.id);
                            setNewChoiceName('');
                            setNewChoicePrice('');
                          }}
                          style={styles.addChoiceTriggerBtn}
                        >
                          <Icon name="plus" size={16} color={colors.brand.primary} />
                          <AppText variant="md" color={colors.brand.primary}>
                            Thêm giá tùy chọn vào nhóm này
                          </AppText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Icon name="magnify-remove-outline" size={40} color={colors.text.muted} />
                  <AppText variant="md" color={colors.text.muted}>Không tìm thấy nhóm tùy chọn nào phù hợp</AppText>
                </View>
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* ── MODAL: THÊM DANH MỤC MÓN ĂN MỚI ────────────────────────── */}
      <FormModal
        visible={showAddCatModal}
        title="Thêm Danh Mục Món Ăn Mới"
        onClose={() => setShowAddCatModal(false)}
        onSave={handleAddCategory}
        saveLabel="Lưu danh mục"
      >
        <View style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <AppText variant="md" color="#050505">
              Tên danh mục món ăn *
            </AppText>
            <TextInput
              style={styles.inputModal}
              placeholder="VD: Sinh tố, Bánh ngọt, Trà hoa quả..."
              placeholderTextColor="#94A3B8"
              value={newCatName}
              onChangeText={setNewCatName}
            />
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="md" color="#050505">
              Biểu tượng (Icon đại diện):
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {POPULAR_ICONS.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <TouchableOpacity
                    key={iconName}
                    onPress={() => setSelectedIcon(iconName)}
                    style={[
                      styles.iconChipModal,
                      isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg },
                    ]}
                  >
                    <Icon
                      name={iconName as any}
                      size={20}
                      color={isSelected ? colors.brand.primary : colors.text.secondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="md" color="#050505">
              Tông màu nhận diện:
            </AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {PRESET_COLORS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedColorIdx(idx)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: item.color,
                    borderWidth: selectedColorIdx === idx ? 3 : 0,
                    borderColor: '#000',
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </FormModal>

      {/* ── MODAL: THÊM NHÓM TÙY CHỌN MỚI ────────────────────────── */}
      <FormModal
        visible={showAddGroupModal}
        title="Thêm Nhóm Tùy Chọn / Topping Mới"
        onClose={() => setShowAddGroupModal(false)}
        onSave={handleAddOptionGroup}
        saveLabel="Tạo nhóm"
      >
        <View style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <AppText variant="md" color="#050505">
              Tên nhóm tùy chọn *
            </AppText>
            <TextInput
              style={styles.inputModal}
              placeholder="VD: Nhóm Size Cốc, Nhóm Topping Trà Sữa, Mức Cay..."
              placeholderTextColor="#94A3B8"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="md" color="#050505">
              Loại nhóm:
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                { type: 'size', label: 'Size Kích Cỡ' },
                { type: 'topping', label: 'Topping Kèm' },
                { type: 'single', label: 'Khẩu vị (Chọn 1)' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.type}
                  onPress={() => setNewGroupType(t.type as any)}
                  style={[
                    styles.typeChipModal,
                    newGroupType === t.type && { backgroundColor: colors.brand.primaryBg, borderColor: colors.brand.primary },
                  ]}
                >
                  <AppText
                    variant="md"
                    weight={newGroupType === t.type ? 'bold' : 'normal'}
                    color={newGroupType === t.type ? colors.brand.primary : colors.text.secondary}
                  >
                    {t.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flex: 1,
    minWidth: 220,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    ...font.sm,
    color: '#050505',
  },
  pillChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  pillChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },
  bodyWrap: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catBadgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  codeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadge: {
    backgroundColor: colors.brand.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addChoiceTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brand.primary,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginVertical: 8,
  },
  addChoiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  smallInput: {
    height: 34,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    backgroundColor: '#FFF',
    color: '#050505',
  },
  smallSaveBtn: {
    height: 32,
    backgroundColor: colors.brand.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCancelBtn: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 10,
  },
  btnOrangePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },
  btnRedPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  panelBox: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
    alignSelf: 'flex-start',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  panelStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  panelDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  detailEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  panelBtnSecondary: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  panelBtnDanger: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  panelCta: {
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  emptyCard: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputModal: {
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#050505',
    backgroundColor: '#F8FAFC',
  },
  iconChipModal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  typeChipModal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: '#FFFFFF',
  },
  posCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posAvatarMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
