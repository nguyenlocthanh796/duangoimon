import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';

import { api } from '../../../lib/api';
import { colors, formatVND } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { useAuth } from '../../../lib/context/AuthContext';
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import PillTabs from '../../../lib/components/ui/PillTabs';
import SummaryRow from '../../../lib/components/layout/SummaryRow';
import { downloadText, toCsv } from '../../../lib/api/csvExport';

export type BookKey = 'S1a' | 'S2a' | 'S2b' | 'S2c' | 'S2d' | 'S2e' | 'S3a';

export interface BookMeta {
  key: BookKey;
  officialCode: string;
  title: string;
  shortLabel: string;
  subtitle: string;
  color: string;
}

export const BOOKS: BookMeta[] = [
  {
    key: 'S1a',
    officialCode: 'Mẫu S1a-HKD',
    title: 'Sổ Chi Tiết Doanh Thu Bán Hàng Hóa, Dịch Vụ',
    shortLabel: 'S1a — Doanh Thu',
    subtitle: 'Theo dõi chi tiết DT hàng hóa & dịch vụ (TT 88/2021/TT-BTC)',
    color: colors.brand.primary,
  },
  {
    key: 'S2a',
    officialCode: 'Mẫu S2a-HKD',
    title: 'Sổ Chi Phí Sản Xuất, Kinh Doanh',
    shortLabel: 'S2a — Chi Phí SXKD',
    subtitle: 'Chi phí nhân công, điện nước, vật tư, quản lý',
    color: colors.status.warning,
  },
  {
    key: 'S2b',
    officialCode: 'Mẫu S2b-HKD',
    title: 'Sổ Theo Dõi Nghĩa Vụ Thuế Với Ngân Sách Nhà Nước',
    shortLabel: 'S2b — Nghĩa Vụ Thuế',
    subtitle: 'Thuế GTGT (1%), Thuế TNCN (0.5%), số đã nộp & nợ thuế',
    color: colors.status.success,
  },
  {
    key: 'S2c',
    officialCode: 'Mẫu S2c-HKD',
    title: 'Sổ Vật Tư, Hàng Hóa, Thành Phẩm, Dụng Cụ',
    shortLabel: 'S2c — Tồn Kho Vật Tư',
    subtitle: 'Theo dõi Nhập - Xuất - Tồn kho và giá trị tồn kho',
    color: '#0284C7',
  },
  {
    key: 'S2d',
    officialCode: 'Mẫu S2d-HKD',
    title: 'Sổ Chi Tiết Tiền Lương & Các Khoản Nộp Theo Lương',
    shortLabel: 'S2d — Bảng Lương',
    subtitle: 'Lương hợp đồng, phụ cấp, trích nộp BHXH & khấu trừ thuế TNCN',
    color: '#7C3AED',
  },
  {
    key: 'S2e',
    officialCode: 'Mẫu S2e-HKD',
    title: 'Sổ Tiền Gửi Ngân Hàng',
    shortLabel: 'S2e — TK Ngân Hàng',
    subtitle: 'Nhật ký dòng tiền vào/ra tài khoản ngân hàng kinh doanh',
    color: '#2563EB',
  },
  {
    key: 'S3a',
    officialCode: 'Mẫu S3a-HKD',
    title: 'Sổ Quỹ Tiền Mặt',
    shortLabel: 'S3a — Quỹ Tiền Mặt',
    subtitle: 'Thu - Chi tiền mặt & đối soát tồn quỹ tại cửa hàng',
    color: colors.status.danger,
  },
];

const PERIODS = [
  { id: '2026', label: 'Cả Năm 2026' },
  { id: 'Q1-2026', label: 'Quý 1/2026' },
  { id: 'Q2-2026', label: 'Quý 2/2026' },
  { id: 'Q3-2026', label: 'Quý 3/2026' },
  { id: 'Q4-2026', label: 'Quý 4/2026' },
  { id: 'M07-2026', label: 'Tháng 7/2026' },
];

function formatDateShort(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

function generateBookData(bookKey: BookKey) {
  switch (bookKey) {
    case 'S1a':
      return [
        { id: '1', date: '2026-07-01', doc_no: 'POS-0701-01', customer: 'Khách lẻ ca sáng', goods_rev: 12500000, service_rev: 2000000, total_rev: 14500000, note: 'Bán lẻ nước & món' },
        { id: '2', date: '2026-07-05', doc_no: 'POS-0705-02', customer: 'Công Ty ABC (Đặt tiệc)', goods_rev: 35000000, service_rev: 5000000, total_rev: 40000000, note: 'Hóa đơn VAT #0012' },
        { id: '3', date: '2026-07-10', doc_no: 'POS-0710-03', customer: 'Khách hàng sự kiện', goods_rev: 28000000, service_rev: 4000000, total_rev: 32000000, note: 'Thanh toán chuyển khoản' },
        { id: '4', date: '2026-07-15', doc_no: 'POS-0715-04', customer: 'Khách lẻ ca tối', goods_rev: 18500000, service_rev: 1500000, total_rev: 20000000, note: 'Tiền mặt & Momo' },
        { id: '5', date: '2026-07-20', doc_no: 'POS-0720-05', customer: 'Tập Đoàn F&B SG', goods_rev: 55000000, service_rev: 10000000, total_rev: 65000000, note: 'Hóa đơn VAT #0018' },
      ];
    case 'S2a':
      return [
        { id: '1', date: '2026-07-02', doc_no: 'PC-0702-01', labor_cost: 15000000, utility_cost: 4500000, material_cost: 25000000, other_cost: 2000000, total_cost: 46500000 },
        { id: '2', date: '2026-07-12', doc_no: 'PC-0712-02', labor_cost: 18000000, utility_cost: 3800000, material_cost: 32000000, other_cost: 1500000, total_cost: 55300000 },
        { id: '3', date: '2026-07-22', doc_no: 'PC-0722-03', labor_cost: 16500000, utility_cost: 5200000, material_cost: 28000000, other_cost: 3000000, total_cost: 52700000 },
      ];
    case 'S2b':
      return [
        { id: '1', period: 'Quý 1/2026', rev: 145000000, vat_due: 1450000, pit_due: 725000, tax_paid: 2175000, balance: 0, status: 'da_nop' },
        { id: '2', period: 'Quý 2/2026', rev: 180000000, vat_due: 1800000, pit_due: 900000, tax_paid: 2700000, balance: 0, status: 'da_nop' },
        { id: '3', period: 'Quý 3/2026', rev: 171500000, vat_due: 1715000, pit_due: 857500, tax_paid: 0, balance: 2572500, status: 'cho_nop' },
      ];
    case 'S2c':
      return [
        { id: '1', code: 'VT-001', name: 'Cà phê hạt Robusta Buôn Ma Thuột', unit: 'Kg', opening: 50, in_qty: 200, out_qty: 180, closing: 70, value: 14000000 },
        { id: '2', code: 'VT-002', name: 'Sữa tươi thanh trùng Barista 1L', unit: 'Hộp', opening: 100, in_qty: 500, out_qty: 480, closing: 120, value: 4200000 },
        { id: '3', code: 'VT-003', name: 'Siro Trái cây Monin Đào 700ml', unit: 'Chai', opening: 20, in_qty: 50, out_qty: 45, closing: 25, value: 6250000 },
        { id: '4', code: 'VT-004', name: 'Ly giấy 16oz in logo thương hiệu', unit: 'Cái', opening: 2000, in_qty: 10000, out_qty: 8500, closing: 3500, value: 5250000 },
      ];
    case 'S2d':
      return [
        { id: '1', name: 'Nguyễn Văn Hùng', pos: 'Quản lý cửa hàng', base: 12000000, allow: 2000000, ins: 1260000, net: 12740000 },
        { id: '2', name: 'Trần Thị Mai', pos: 'Thu ngân ca chính', base: 7500000, allow: 1000000, ins: 787500, net: 7712500 },
        { id: '3', name: 'Lê Hoàng Nam', pos: 'Pha chế Barista', base: 8000000, allow: 1200000, ins: 840000, net: 8360000 },
        { id: '4', name: 'Phạm Minh Trí', pos: 'Nhân viên phục vụ', base: 6000000, allow: 800000, ins: 630000, net: 6170000 },
      ];
    case 'S2e':
      return [
        { id: '1', date: '2026-07-03', code: 'FT2618491', bank: 'Vietcombank - 1019283746', desc: 'Khách hàng chuyển khoản tiền đặt tiệc', in_amt: 15000000, out_amt: 0, balance: 145000000 },
        { id: '2', date: '2026-07-08', code: 'FT2619204', bank: 'Vietcombank - 1019283746', desc: 'Thanh toán tiền nguyên liệu nhà cung cấp', in_amt: 0, out_amt: 25000000, balance: 120000000 },
        { id: '3', date: '2026-07-18', code: 'FT2620193', bank: 'Vietcombank - 1019283746', desc: 'Chuyển nộp thuế GTGT & TNCN Quý 2', in_amt: 0, out_amt: 2700000, balance: 117300000 },
      ];
    case 'S3a':
      return [
        { id: '1', date: '2026-07-01', doc_no: 'PT-001', desc: 'Thu tiền mặt bán hàng ca sáng', in_amt: 8500000, out_amt: 0, balance: 18500000 },
        { id: '2', date: '2026-07-04', doc_no: 'PC-001', desc: 'Chi tiền mặt mua đá viên & đồ vặt', in_amt: 0, out_amt: 450000, balance: 18050000 },
        { id: '3', date: '2026-07-15', doc_no: 'PT-002', desc: 'Thu tiền mặt bán hàng lẻ ca tối', in_amt: 12000000, out_amt: 0, balance: 30050000 },
        { id: '4', date: '2026-07-20', doc_no: 'PC-002', desc: 'Tạm ứng lương nhân viên bằng tiền mặt', in_amt: 0, out_amt: 5000000, balance: 25050000 },
      ];
    default:
      return [];
  }
}

export default function SoSachScreen() {
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  
  const [selectedBookKey, setSelectedBookKey] = useState<BookKey>('S1a');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [printModalVisible, setPrintModalVisible] = useState(false);

  const meta = useMemo(() => BOOKS.find((b) => b.key === selectedBookKey) || BOOKS[0], [selectedBookKey]);
  const rows = useMemo(() => generateBookData(selectedBookKey), [selectedBookKey]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 300);
  }, []);

  useEffect(() => { load(); }, [load]);

  const summaryData = useMemo(() => {
    switch (selectedBookKey) {
      case 'S1a': {
        const total = rows.reduce((s: number, r: any) => s + r.total_rev, 0);
        const goods = rows.reduce((s: number, r: any) => s + r.goods_rev, 0);
        return [
          { label: 'Tổng doanh thu', value: formatVND(total), color: colors.brand.primary, bg: '#F0FDF4' },
          { label: 'Doanh thu hàng hóa', value: formatVND(goods), color: '#0284C7', bg: '#F0F9FF' },
        ];
      }
      case 'S2a': {
        const total = rows.reduce((s: number, r: any) => s + r.total_cost, 0);
        const labor = rows.reduce((s: number, r: any) => s + r.labor_cost, 0);
        return [
          { label: 'Tổng chi phí SXKD', value: formatVND(total), color: colors.status.warning, bg: '#FFFBEB' },
          { label: 'Chi phí nhân công', value: formatVND(labor), color: '#7C3AED', bg: '#F5F3FF' },
        ];
      }
      case 'S2b': {
        const vat = rows.reduce((s: number, r: any) => s + r.vat_due, 0);
        const pit = rows.reduce((s: number, r: any) => s + r.pit_due, 0);
        return [
          { label: 'Thuế GTGT phát sinh (1%)', value: formatVND(vat), color: colors.brand.primary, bg: '#FFF7ED' },
          { label: 'Thuế TNCN phát sinh (0.5%)', value: formatVND(pit), color: colors.status.danger, bg: '#FFF1F2' },
        ];
      }
      case 'S2c': {
        const totalVal = rows.reduce((s: number, r: any) => s + r.value, 0);
        return [
          { label: 'Tổng giá trị tồn kho', value: formatVND(totalVal), color: '#0284C7', bg: '#F0F9FF' },
          { label: 'Số mặt hàng tồn', value: `${rows.length} mặt hàng`, color: colors.brand.primary, bg: '#F0FDF4' },
        ];
      }
      case 'S2d': {
        const totalSalary = rows.reduce((s: number, r: any) => s + r.net, 0);
        return [
          { label: 'Tổng quỹ lương thực lĩnh', value: formatVND(totalSalary), color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Tổng nhân sự', value: `${rows.length} nhân viên`, color: colors.status.success, bg: '#F0FDF4' },
        ];
      }
      case 'S2e': {
        const lastBal = (rows as any[])[rows.length - 1]?.balance || 0;
        return [
          { label: 'Số dư TK Ngân hàng', value: formatVND(lastBal), color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Tổng số giao dịch', value: `${rows.length} giao dịch`, color: colors.brand.primary, bg: '#F0FDF4' },
        ];
      }
      case 'S3a': {
        const lastCash = (rows as any[])[rows.length - 1]?.balance || 0;
        return [
          { label: 'Tồn quỹ tiền mặt', value: formatVND(lastCash), color: colors.status.danger, bg: '#FFF1F2' },
          { label: 'Số phiếu thu chi', value: `${rows.length} phiếu`, color: colors.brand.primary, bg: '#F0FDF4' },
        ];
      }
    }
  }, [selectedBookKey, rows]);

  // iPad Columns definition (Fix date width 115px so it NEVER wraps)
  const columns: Column<any>[] = useMemo(() => {
    switch (selectedBookKey) {
      case 'S1a':
        return [
          { key: 'date', title: 'Ngày CT', width: 115, render: (r) => <AppText variant="sm" color="#65676B" numberOfLines={1}>{formatDateShort(r.date)}</AppText> },
          { key: 'doc_no', title: 'Số chứng từ', width: 130, render: (r) => <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{r.doc_no}</AppText> },
          { key: 'customer', title: 'Diễn giải / Khách hàng', flex: 1.5, render: (r) => <AppText variant="md" color="#050505" numberOfLines={1}>{r.customer}</AppText> },
          { key: 'goods_rev', title: 'DT Hàng hóa', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.goods_rev)}</AppText> },
          { key: 'service_rev', title: 'DT Dịch vụ', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.service_rev)}</AppText> },
          { key: 'total_rev', title: 'Tổng Doanh Thu', flex: 1.2, align: 'right', render: (r) => <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.total_rev)}</AppText> },
        ];
      case 'S2a':
        return [
          { key: 'date', title: 'Ngày CT', width: 115, render: (r) => <AppText variant="sm" color="#65676B" numberOfLines={1}>{formatDateShort(r.date)}</AppText> },
          { key: 'doc_no', title: 'Số chứng từ', width: 130, render: (r) => <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{r.doc_no}</AppText> },
          { key: 'labor_cost', title: 'CP Nhân công', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.labor_cost)}</AppText> },
          { key: 'material_cost', title: 'CP Nguyên vật liệu', flex: 1.2, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.material_cost)}</AppText> },
          { key: 'utility_cost', title: 'CP Điện nước/Thuê', flex: 1.1, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.utility_cost)}</AppText> },
          { key: 'total_cost', title: 'Tổng Chi Phí', flex: 1.2, align: 'right', render: (r) => <AppText variant="md" weight="bold" color={colors.status.warning}>{formatVND(r.total_cost)}</AppText> },
        ];
      case 'S2b':
        return [
          { key: 'period', title: 'Kỳ tính thuế', width: 120, render: (r) => <AppText variant="md" weight="bold" color="#050505">{r.period}</AppText> },
          { key: 'rev', title: 'Doanh số tính thuế', flex: 1.2, align: 'right', render: (r) => <AppText variant="md" color="#050505">{formatVND(r.rev)}</AppText> },
          { key: 'vat_due', title: 'Thuế GTGT (1%)', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.brand.primary}>{formatVND(r.vat_due)}</AppText> },
          { key: 'pit_due', title: 'Thuế TNCN (0.5%)', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.danger}>{formatVND(r.pit_due)}</AppText> },
          { key: 'tax_paid', title: 'Số đã nộp', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.success}>{formatVND(r.tax_paid)}</AppText> },
          { key: 'balance', title: 'Còn phải nộp', flex: 1, align: 'right', render: (r) => <AppText variant="md" weight="bold" color={r.balance > 0 ? colors.status.danger : colors.status.success}>{formatVND(r.balance)}</AppText> },
        ];
      case 'S2c':
        return [
          { key: 'code', title: 'Mã VT', width: 90, render: (r) => <AppText variant="sm" color="#65676B">{r.code}</AppText> },
          { key: 'name', title: 'Tên vật tư / Hàng hóa', flex: 1.8, render: (r) => <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{r.name}</AppText> },
          { key: 'unit', title: 'ĐVT', width: 70, align: 'center', render: (r) => <AppText variant="sm" color="#65676B">{r.unit}</AppText> },
          { key: 'opening', title: 'Tồn đầu', width: 80, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{r.opening}</AppText> },
          { key: 'in_qty', title: 'Nhập', width: 80, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.success}>+{r.in_qty}</AppText> },
          { key: 'out_qty', title: 'Xuất', width: 80, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.danger}>-{r.out_qty}</AppText> },
          { key: 'closing', title: 'Tồn cuối', width: 85, align: 'right', render: (r) => <AppText variant="md" weight="bold" color="#0284C7">{r.closing}</AppText> },
          { key: 'value', title: 'Giá trị tồn kho', flex: 1.2, align: 'right', render: (r) => <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.value)}</AppText> },
        ];
      case 'S2d':
        return [
          { key: 'name', title: 'Họ và tên người lao động', flex: 1.5, render: (r) => <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{r.name}</AppText> },
          { key: 'pos', title: 'Chức danh', flex: 1.2, render: (r) => <AppText variant="sm" color="#65676B" numberOfLines={1}>{r.pos}</AppText> },
          { key: 'base', title: 'Lương hợp đồng', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.base)}</AppText> },
          { key: 'allow', title: 'Phụ cấp', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.allow)}</AppText> },
          { key: 'ins', title: 'Khấu trừ BHXH', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.danger}>-{formatVND(r.ins)}</AppText> },
          { key: 'net', title: 'Thực lĩnh', flex: 1.2, align: 'right', render: (r) => <AppText variant="md" weight="bold" color="#7C3AED">{formatVND(r.net)}</AppText> },
        ];
      case 'S2e':
        return [
          { key: 'date', title: 'Ngày GD', width: 115, render: (r) => <AppText variant="sm" color="#65676B" numberOfLines={1}>{formatDateShort(r.date)}</AppText> },
          { key: 'code', title: 'Mã GD', width: 110, render: (r) => <AppText variant="sm" color="#65676B">{r.code}</AppText> },
          { key: 'desc', title: 'Diễn giải nội dung', flex: 1.6, render: (r) => <AppText variant="md" color="#050505" numberOfLines={1}>{r.desc}</AppText> },
          { key: 'in_amt', title: 'Tiền gửi (Thu)', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.success}>{r.in_amt > 0 ? `+${formatVND(r.in_amt)}` : '—'}</AppText> },
          { key: 'out_amt', title: 'Tiền rút (Chi)', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.danger}>{r.out_amt > 0 ? `-${formatVND(r.out_amt)}` : '—'}</AppText> },
          { key: 'balance', title: 'Số dư TK', flex: 1.2, align: 'right', render: (r) => <AppText variant="md" weight="bold" color="#2563EB">{formatVND(r.balance)}</AppText> },
        ];
      case 'S3a':
        return [
          { key: 'date', title: 'Ngày CT', width: 115, render: (r) => <AppText variant="sm" color="#65676B" numberOfLines={1}>{formatDateShort(r.date)}</AppText> },
          { key: 'doc_no', title: 'Số phiếu', width: 100, render: (r) => <AppText variant="md" weight="bold" color="#050505">{r.doc_no}</AppText> },
          { key: 'desc', title: 'Diễn giải', flex: 1.6, render: (r) => <AppText variant="md" color="#050505" numberOfLines={1}>{r.desc}</AppText> },
          { key: 'cash_in', title: 'Thu tiền mặt', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.success}>{r.cash_in > 0 ? `+${formatVND(r.cash_in)}` : '—'}</AppText> },
          { key: 'cash_out', title: 'Chi tiền mặt', flex: 1, align: 'right', render: (r) => <AppText variant="sm" color={colors.status.danger}>{r.cash_out > 0 ? `-${formatVND(r.cash_out)}` : '—'}</AppText> },
          { key: 'balance', title: 'Tồn quỹ tiền mặt', flex: 1.2, align: 'right', render: (r) => <AppText variant="md" weight="bold" color={colors.status.danger}>{formatVND(r.balance)}</AppText> },
        ];
    }
  }, [selectedBookKey]);

  // Mobile Card Feed View (renders clean mobile cards for iPhone 414px)
  const renderMobileCard = useCallback((r: any) => {
    switch (selectedBookKey) {
      case 'S1a':
        return (
          <View style={styles.mCard}>
            <View style={styles.mCardHeader}>
              <AppText variant="md" weight="bold" color="#050505">{r.doc_no}</AppText>
              <AppText variant="sm" color="#65676B">{formatDateShort(r.date)}</AppText>
            </View>
            <AppText variant="sm" color="#334155" style={{ marginVertical: 4 }}>{r.customer}</AppText>
            <View style={styles.mCardFooter}>
              <AppText variant="sm" color="#65676B">Hàng: {formatVND(r.goods_rev)} · Dịch vụ: {formatVND(r.service_rev)}</AppText>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.total_rev)}</AppText>
            </View>
          </View>
        );
      case 'S2a':
        return (
          <View style={styles.mCard}>
            <View style={styles.mCardHeader}>
              <AppText variant="md" weight="bold" color="#050505">{r.doc_no}</AppText>
              <AppText variant="sm" color="#65676B">{formatDateShort(r.date)}</AppText>
            </View>
            <AppText variant="sm" color="#334155" style={{ marginVertical: 4 }}>
              Nhân công: {formatVND(r.labor_cost)} · Vật tư: {formatVND(r.material_cost)}
            </AppText>
            <View style={styles.mCardFooter}>
              <AppText variant="sm" color="#65676B">Điện nước: {formatVND(r.utility_cost)}</AppText>
              <AppText variant="md" weight="bold" color={colors.status.warning}>{formatVND(r.total_cost)}</AppText>
            </View>
          </View>
        );
      case 'S2b':
        return (
          <View style={styles.mCard}>
            <View style={styles.mCardHeader}>
              <AppText variant="md" weight="bold" color="#050505">{r.period}</AppText>
              <View style={[styles.mBadge, { backgroundColor: r.status === 'da_nop' ? '#ECFDF5' : '#FEF3C7' }]}>
                <AppText variant="sm" weight="bold" color={r.status === 'da_nop' ? colors.status.success : colors.status.warning}>
                  {r.status === 'da_nop' ? 'Đã nộp' : 'Chờ nộp'}
                </AppText>
              </View>
            </View>
            <AppText variant="sm" color="#334155" style={{ marginVertical: 4 }}>
              Doanh số tính thuế: {formatVND(r.rev)}
            </AppText>
            <View style={styles.mCardFooter}>
              <AppText variant="sm" color="#65676B">GTGT: {formatVND(r.vat_due)} | TNCN: {formatVND(r.pit_due)}</AppText>
              <AppText variant="md" weight="bold" color={r.balance > 0 ? colors.status.danger : colors.status.success}>
                {r.balance > 0 ? `Nợ: ${formatVND(r.balance)}` : 'Đã nộp đủ'}
              </AppText>
            </View>
          </View>
        );
      case 'S2c':
        return (
          <View style={styles.mCard}>
            <View style={styles.mCardHeader}>
              <AppText variant="md" weight="bold" color="#050505">{r.name}</AppText>
              <AppText variant="sm" weight="bold" color="#0284C7">{r.code}</AppText>
            </View>
            <AppText variant="sm" color="#65676B" style={{ marginVertical: 4 }}>
              Tồn đầu: {r.opening} {r.unit} · Nhập: +{r.in_qty} · Xuất: -{r.out_qty}
            </AppText>
            <View style={styles.mCardFooter}>
              <AppText variant="sm" color="#050505">Tồn cuối: {r.closing} {r.unit}</AppText>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.value)}</AppText>
            </View>
          </View>
        );
      case 'S2d':
        return (
          <View style={styles.mCard}>
            <View style={styles.mCardHeader}>
              <AppText variant="md" weight="bold" color="#050505">{r.name}</AppText>
              <AppText variant="sm" color="#65676B">{r.pos}</AppText>
            </View>
            <AppText variant="sm" color="#65676B" style={{ marginVertical: 4 }}>
              HĐ: {formatVND(r.base)} · Phụ cấp: {formatVND(r.allow)} · BHXH: -{formatVND(r.ins)}
            </AppText>
            <View style={styles.mCardFooter}>
              <AppText variant="sm" color="#65676B">Thực lĩnh</AppText>
              <AppText variant="md" weight="bold" color="#7C3AED">{formatVND(r.net)}</AppText>
            </View>
          </View>
        );
      case 'S2e':
        return (
          <View style={styles.mCard}>
            <View style={styles.mCardHeader}>
              <AppText variant="md" weight="bold" color="#050505">{r.code}</AppText>
              <AppText variant="sm" color="#65676B">{formatDateShort(r.date)}</AppText>
            </View>
            <AppText variant="sm" color="#334155" style={{ marginVertical: 4 }}>{r.desc}</AppText>
            <View style={styles.mCardFooter}>
              <AppText variant="sm" color={r.in_amt > 0 ? colors.status.success : colors.status.danger}>
                {r.in_amt > 0 ? `+${formatVND(r.in_amt)}` : `-${formatVND(r.out_amt)}`}
              </AppText>
              <AppText variant="md" weight="bold" color="#2563EB">Số dư: {formatVND(r.balance)}</AppText>
            </View>
          </View>
        );
      case 'S3a':
        return (
          <View style={styles.mCard}>
            <View style={styles.mCardHeader}>
              <AppText variant="md" weight="bold" color="#050505">{r.doc_no}</AppText>
              <AppText variant="sm" color="#65676B">{formatDateShort(r.date)}</AppText>
            </View>
            <AppText variant="sm" color="#334155" style={{ marginVertical: 4 }}>{r.desc}</AppText>
            <View style={styles.mCardFooter}>
              <AppText variant="sm" color={r.cash_in > 0 ? colors.status.success : colors.status.danger}>
                {r.cash_in > 0 ? `Thu: +${formatVND(r.cash_in)}` : `Chi: -${formatVND(r.cash_out)}`}
              </AppText>
              <AppText variant="md" weight="bold" color={colors.status.danger}>Tồn: {formatVND(r.balance)}</AppText>
            </View>
          </View>
        );
      default:
        return null;
    }
  }, [selectedBookKey]);

  // Export CSV Action
  const handleExportCsv = () => {
    if (rows.length === 0) {
      Alert.alert('Không có dữ liệu', 'Không có bản ghi nào để xuất.');
      return;
    }
    const headers = columns.map((c) => c.title);
    const csvRows = rows.map((r: any) =>
      columns.map((c) => {
        const val = r[c.key];
        return typeof val === 'number' ? val : val || '';
      })
    );
    downloadText(`${meta.key}_HKD_${selectedPeriod}.csv`, toCsv(headers, csvRows));
  };

  // Open Print Modal
  const handleOpenPrintModal = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setPrintModalVisible(true);
    } else {
      Alert.alert('Bản in sổ kế toán', `Đã chuẩn bị bản in ${meta.officialCode} (${meta.title}) theo chuẩn Thông tư 88/2021/TT-BTC!`);
    }
  };

  const bookTabItems = useMemo(
    () => BOOKS.map((b) => ({ id: b.key, label: b.shortLabel })),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingTop: 6, paddingBottom: 10 }}>
      <PillTabs
        items={bookTabItems}
        activeId={selectedBookKey}
        onSelect={(id) => setSelectedBookKey(id as BookKey)}
        containerStyle={{ borderBottomWidth: 0, paddingHorizontal: 0, paddingVertical: 0, marginBottom: 6 }}
      />

      {/* 📜 Book Header & Period Filter Toolbar */}
      <View style={styles.toolbarBox}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.codeTag, { backgroundColor: meta.color + '15' }]}>
              <AppText variant="sm" weight="bold" color={meta.color}>{meta.officialCode}</AppText>
            </View>
            <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{meta.title}</AppText>
          </View>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }} numberOfLines={isWide ? 1 : 2}>
            {meta.subtitle}
          </AppText>
        </View>

        <View style={[styles.actionGroup, !isWide && { width: '100%', marginTop: 8 }]}>
          <TouchableOpacity style={[styles.toolbarBtn, !isWide && { flex: 1, justifyContent: 'center' }]} onPress={handleExportCsv} activeOpacity={0.7}>
            <AppText variant="sm" weight="bold" color={colors.status.success}>Xuất CSV</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolbarBtnPrimary, !isWide && { flex: 1, justifyContent: 'center' }]} onPress={handleOpenPrintModal} activeOpacity={0.7}>
            <AppText variant="sm" weight="bold" color="#fff">In Sổ / Bản in</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <SummaryRow items={summaryData} />

      {/* 📑 Dynamic Data Table / Mobile Card Feed */}
      <View style={{ flex: 1, marginTop: 4 }}>
        <DataTable<any>
          columns={columns}
          data={rows}
          getRowId={(r) => r.id || r.code || r.period || String(Math.random())}
          loading={loading}
          compact
          refreshing={refreshing}
          onRefresh={() => load(true)}
          renderMobileCard={renderMobileCard}
          emptyTitle={`Chưa có dữ liệu cho ${meta.officialCode}`}
          emptySubtitle="Dữ liệu sổ kế toán sẽ tự động được tổng hợp từ nhật ký bán hàng & giao dịch."
        />
      </View>

      {/* 🖨 Printable Official Modal (Thông tư 88/2021/TT-BTC) */}
      {printModalVisible && (
        <Modal visible={printModalVisible} transparent animationType="fade" onRequestClose={() => setPrintModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.printContainer}>
              {/* Header Toolbar */}
              <View style={styles.printHeader}>
                <AppText variant="md" weight="bold" color="#050505">Xem Bản In Chuẩn Bộ Tài Chính (TT 88/2021/TT-BTC)</AppText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.toolbarBtnPrimary}
                    onPress={() => {
                      if (typeof window !== 'undefined') window.print();
                    }}
                  >
                    <AppText variant="sm" weight="bold" color="#fff">In Trực Tiếp</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setPrintModalVisible(false)}>
                    <AppText variant="md" weight="bold" color="#65676B">✕</AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Printable Document Body */}
              <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View>
                    <AppText variant="sm" weight="bold" color="#050505">HỘ KINH DOANH F&B SÀI GÒN</AppText>
                    <AppText variant="sm" color="#65676B">Mã số thuế: 0101234567</AppText>
                    <AppText variant="sm" color="#65676B">Địa chỉ: 123 Nguyễn Thị Minh Khai, Q.1, TP.HCM</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="sm" weight="bold" color="#050505">{meta.officialCode}</AppText>
                    <AppText variant="sm" color="#65676B" style={{ fontStyle: 'italic' }}>Ban hành theo TT 88/2021/TT-BTC</AppText>
                  </View>
                </View>

                <View style={{ alignItems: 'center', marginVertical: 14 }}>
                  <AppText variant="md" weight="bold" color="#050505" style={{ textTransform: 'uppercase' }}>
                    {meta.title}
                  </AppText>
                  <AppText variant="sm" color="#65676B" style={{ fontStyle: 'italic', marginTop: 4 }}>
                    Kỳ kế toán: {PERIODS.find((p) => p.id === selectedPeriod)?.label}
                  </AppText>
                </View>

                {/* Print Simple Table */}
                <View style={styles.printTable}>
                  <View style={styles.printTableRowHeader}>
                    {columns.map((c) => (
                      <AppText key={c.key} variant="sm" weight="bold" style={{ flex: c.flex || 1, textAlign: c.align || 'left' }}>
                        {c.title}
                      </AppText>
                    ))}
                  </View>
                  {rows.map((r: any, idx: number) => (
                    <View key={idx} style={styles.printTableRow}>
                      {columns.map((c) => (
                        <View key={c.key} style={{ flex: c.flex || 1, alignItems: c.align === 'right' ? 'flex-end' : 'flex-start' }}>
                          {c.render(r)}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>

                {/* Signature Block */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, paddingHorizontal: 20 }}>
                  <View style={{ alignItems: 'center' }}>
                    <AppText variant="sm" weight="bold" color="#050505">NGƯỜI LẬP SỔ</AppText>
                    <AppText variant="sm" color="#65676B" style={{ fontStyle: 'italic' }}>(Ký, họ tên)</AppText>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <AppText variant="sm" color="#65676B" style={{ fontStyle: 'italic' }}>Ngày 25 tháng 07 năm 2026</AppText>
                    <AppText variant="sm" weight="bold" color="#050505" style={{ marginTop: 2 }}>CHỦ HỘ KINH DOANH</AppText>
                    <AppText variant="sm" color="#65676B" style={{ fontStyle: 'italic' }}>(Ký, họ tên, đóng dấu)</AppText>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  bookPillActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  toolbarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  codeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  toolbarBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F97316',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginBottom: 6,
  },
  // Mobile Card Styling
  mCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    marginBottom: 6,
  },
  mCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  mBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  // Print Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  printContainer: {
    width: '100%',
    maxWidth: 900,
    height: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  printHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printTable: {
    borderWidth: 1,
    borderColor: '#050505',
    marginVertical: 10,
  },
  printTableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#050505',
  },
  printTableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
});
