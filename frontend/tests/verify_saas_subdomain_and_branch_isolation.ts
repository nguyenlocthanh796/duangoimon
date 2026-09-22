import './setup_env';
import { useAuthStore, checkRoutePermission, isSaasAdminPortalAllowed } from '../lib/store/useAuthStore';

console.log('================================================================================');
console.log('👑 KIỂM THỬ AN NINH: CÔ LẬP PORTAL CHỦ DỰ ÁN & PHÂN QUYỀN CHI NHÁNH CHẶT CHẼ');
console.log('   Mục tiêu: Đảm bảo /saas-admin không bị lộ sang mobile app & Manager bị khóa chi nhánh');
console.log('================================================================================\n');

// 1. KIỂM TRA CHẶN TUYỆT ĐỐI CÁC VAI TRÒ THƯỜNG TRUY CẬP /saas-admin
console.log('--- 1. BẢO VỆ ROUTE /saas-admin KHỎI CÁC VAI TRÒ BÁN HÀNG ---');
const roles = ['owner', 'manager', 'cashier', 'server'] as const;

for (const r of roles) {
  const allowed = checkRoutePermission(r, '/saas-admin');
  console.log('• Vai trò [' + r + ']: Truy cập /saas-admin = ' + (allowed ? '❌ BỊ LỌT QUYỀN' : '✅ BỊ TỪ CHỐI TUYỆT ĐỐI'));
  if (allowed) {
    throw new Error('Bảo mật thất bại! Vai trò ' + r + ' vào được màn hình quản trị của Chủ Dự Án.');
  }
}
console.log('✅ 100% vai trò tại quán bị chặn tuyệt đối khỏi Portal Chủ Dự Án\n');

// 2. KIỂM TRA ĐIỀU KIỆN CHO PHÉP SUPER_ADMIN (SUBDOMAIN / ENVIRONMENT GUARD)
console.log('--- 2. KIỂM TRA ĐIỀU KIỆN MÔI TRƯỜNG CHẠY PORTAL CHỦ DỰ ÁN ---');
const isAllowedInTest = isSaasAdminPortalAllowed();
console.log('• Môi trường Test / Admin Hostname: isSaasAdminPortalAllowed = ' + isAllowedInTest);
if (!isAllowedInTest) {
  throw new Error('isSaasAdminPortalAllowed phải cho phép trong môi trường test/admin');
}

const superAdminAllowed = checkRoutePermission('super_admin', '/saas-admin');
console.log('• Chủ Dự Án (Super Admin) vào /saas-admin khi đúng cổng = ' + (superAdminAllowed ? '✅ Được phép' : '❌ Thất bại'));
if (!superAdminAllowed) {
  throw new Error('Chủ Dự Án phải truy cập được /saas-admin trên portal hợp lệ');
}

const superAdminInPos = checkRoutePermission('super_admin', '/thanh-toan');
console.log('• Chủ Dự Án vào màn hình bán hàng nội bộ quán (/thanh-toan) = ' + (superAdminInPos ? '❌ Lẫn lộn vai trò' : '✅ Bị từ chối (Độc lập 100%)'));
if (superAdminInPos) {
  throw new Error('Chủ Dự Án không được vào màn hình bán hàng của quán');
}
console.log('✅ Ranh giới giữa Chủ Dự Án và Quán ăn được phân định độc lập tuyệt đối\n');

// 3. KIỂM TRA CHẶN QUẢN LÝ (MANAGER) CHUYỂN CHI NHÁNH TÙY TIỆN (STRICT BRANCH ISOLATION)
console.log('--- 3. KIỂM TRA PHÂN VÙNG CHI NHÁNH NGHIÊM NGẶT (BRANCH ISOLATION) ---');
const auth = useAuthStore.getState();

// Thiết lập chi nhánh ban đầu là branch_01
auth.setRole('owner');
auth.switchBranch('branch_01');
console.log('• Chi nhánh ban đầu: ' + useAuthStore.getState().activeBranchId);

// Chuyển sang vai trò Manager của Chi Nhánh 1
auth.setRole('manager');
console.log('• Vai trò chuyển sang: ' + useAuthStore.getState().currentRole);

// Thử chuyển sang Chi Nhánh 2 (branch_02)
auth.switchBranch('branch_02');
const currentBranchAfterHack = useAuthStore.getState().activeBranchId;
console.log('• Thử chuyển sang branch_02: Chi nhánh hiện tại = ' + currentBranchAfterHack);
if (currentBranchAfterHack !== 'branch_01') {
  throw new Error('Lỗ hổng bảo mật! Quản Lý chi nhánh tự ý chuyển sang chi nhánh khác.');
}
console.log('✅ Quản Lý Chi Nhánh (Manager) bị khóa cứng vào chi nhánh được phân công (branch_01)\n');

// Chủ Quán chuyển đổi chi nhánh hợp lệ
auth.setRole('owner');
auth.switchBranch('branch_02');
console.log('• Chủ Quán (Owner) chuyển sang branch_02: Chi nhánh hiện tại = ' + useAuthStore.getState().activeBranchId);
if (useAuthStore.getState().activeBranchId !== 'branch_02') {
  throw new Error('Chủ Quán phải chuyển đổi được chi nhánh linh hoạt');
}
console.log('✅ Chủ Quán (Owner) bảo toàn quyền điều phối liên chi nhánh linh hoạt\n');

console.log('================================================================================');
console.log('🏁 KẾT LUẬN:');
console.log('✨ Kiến trúc phân tầng Chủ Dự Án vs Chủ Quán đã được gia cố hoàn hảo!');
console.log('================================================================================');
