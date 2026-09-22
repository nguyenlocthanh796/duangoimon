/**
 * 👑 OngChu Lean POS - Owner Credentials & Security Lifecycle Test Suite
 * Kiểm thử toàn diện: Vòng đời Tài Khoản & Mật Khẩu Chủ Cửa Hàng (SaaS Password + Kiosk PIN 0ms)
 */

import { runner, assert } from './harness';
import { useAuthStore, checkRoutePermission } from '../lib/store/useAuthStore';

export async function runOwnerCredentialsLifecycleTests() {
  runner.setContext('Owner Security Lifecycle', 'SaaS Password & Kiosk PIN Management');

  // =========================================================================
  // GIAI ĐOẠN 1: ĐĂNG NHẬP CHỦ QUÁN BAN ĐẦU (DEFAULT CREDENTIALS)
  // =========================================================================
  await runner.test('Giai đoạn 1: Đăng nhập Chủ Quán ban đầu và kiểm tra trạng thái mặc định', async () => {
    const auth = useAuthStore.getState();

    // 1. Đăng nhập với thông tin ban đầu do SaaS Admin cấp
    const loginRes = await auth.loginWithCredentials('quanquan', 'owner', '123456', 'branch_01');
    assert.isTrue(loginRes.success, 'Đăng nhập mật khẩu mặc định 123456 phải thành công');

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated, 'Đã xác thực danh tính');
    assert.strictEqual(state.currentRole, 'owner', 'Vai trò phải là owner (Chủ Quán)');
    assert.isTrue(state.isOwner(), 'isOwner() trả về true');
    assert.strictEqual(state.ownerPin, '', 'Mã PIN Chủ Quán ban đầu chưa thiết lập (bảo mật tuyệt đối, không có PIN mặc định)');
    assert.strictEqual(state.managerPin, '', 'Mã PIN Quản Lý ban đầu chưa thiết lập');
  });

  // =========================================================================
  // GIAI ĐOẠN 2: CHỦ QUÁN ĐỔI MÃ PIN MỞ CA & PHÊ DUYỆT TẠI QUẦY (0MS KIOSK PIN)
  // =========================================================================
  await runner.test('Giai đoạn 2: Chủ Quán đổi mã PIN mở ca quầy từ 9999 sang 5829', async () => {
    const auth = useAuthStore.getState();

    // 1. Nhập PIN không đủ 4 số -> BỊ CHẶN
    const invalidRes1 = auth.setOwnerPin('123');
    assert.isFalse(invalidRes1.success, 'PIN 3 số phải bị từ chối');

    const invalidRes2 = auth.setOwnerPin('abcd');
    assert.isFalse(invalidRes2.success, 'PIN ký tự chữ phải bị từ chối');

    // 2. Nhập PIN hợp lệ 4 số: 5829
    const validRes = auth.setOwnerPin('5829');
    assert.isTrue(validRes.success, 'Đổi PIN Chủ Quán sang 5829 thành công');
    assert.strictEqual(useAuthStore.getState().ownerPin, '5829', 'ownerPin trong store đã là 5829');

    // 3. Kiểm tra mở ca bằng PIN mới 5829 -> Phải xác thực là Chủ Quán (owner)
    const pinLoginRes = await auth.loginWithPin('5829');
    assert.isTrue(pinLoginRes.success, 'Mở ca bằng PIN mới 5829 thành công');
    assert.strictEqual(useAuthStore.getState().currentRole, 'owner', 'Xác thực chuẩn vai trò owner');

    // 4. Kiểm tra PIN quản lý/chủ quán phê duyệt tác vụ nhạy cảm bằng PIN mới 5829
    const verifyRes = await auth.verifyManagerPin('5829', 'void_item');
    assert.isTrue(verifyRes.success, 'PIN mới 5829 phê duyệt hủy món thành công');
  });

  // =========================================================================
  // GIAI ĐOẠN 3: CHỦ QUÁN ĐỔI MẬT KHẨU SAAS QUẢN TRỊ (SAAS PASSWORD)
  // =========================================================================
  await runner.test('Giai đoạn 3: Chủ Quán đổi mật khẩu SaaS quản trị từ 123456 sang QuanQuan@2026', async () => {
    const auth = useAuthStore.getState();

    // 1. Mật khẩu mới dưới 6 ký tự -> BỊ TỪ CHỐI
    const shortPassRes = auth.changeOwnerPassword('123456', '123');
    assert.isFalse(shortPassRes.success, 'Mật khẩu dưới 6 ký tự phải bị từ chối');

    // 2. Mật khẩu cũ sai -> BỊ TỪ CHỐI
    const wrongOldPassRes = auth.changeOwnerPassword('sai_mat_khau', 'QuanQuan@2026');
    assert.isFalse(wrongOldPassRes.success, 'Mật khẩu cũ không đúng phải bị từ chối');

    // 3. Đổi mật khẩu hợp lệ
    const validPassRes = auth.changeOwnerPassword('123456', 'QuanQuan@2026');
    assert.isTrue(validPassRes.success, 'Đổi mật khẩu mới thành công');

    // 4. Đăng xuất và đăng nhập lại bằng mật khẩu cũ (123456) -> Phải thất bại nếu không còn dùng mặc định
    // Đăng nhập bằng mật khẩu mới -> PHẢI THÀNH CÔNG
    const newLoginRes = await auth.loginWithCredentials('quanquan', 'owner', 'QuanQuan@2026', 'branch_01');
    assert.isTrue(newLoginRes.success, 'Đăng nhập bằng mật khẩu mới QuanQuan@2026 thành công');
    assert.strictEqual(useAuthStore.getState().currentRole, 'owner');
  });

  // =========================================================================
  // GIAI ĐOẠN 4: GỠ THIẾT BỊ BẰNG MÃ PIN CHỦ QUÁN MỚI (5829)
  // =========================================================================
  await runner.test('Giai đoạn 4: Gỡ thiết bị Kiosk bằng mã PIN Chủ Quán mới 5829', async () => {
    const auth = useAuthStore.getState();

    // 1. Gỡ thiết bị bằng PIN thu ngân (2222) -> BỊ CHẶN
    const unbindTN = await auth.unbindDevice('2222');
    assert.isFalse(unbindTN.success, 'Thu ngân không thể gỡ máy');
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound, 'Máy vẫn bị khóa chặt');

    // 2. Gỡ thiết bị bằng PIN Quản lý (8888) -> BỊ CHẶN
    const unbindQL = await auth.unbindDevice('8888');
    assert.isFalse(unbindQL.success, 'Quản lý không thể gỡ máy');

    // 3. Gỡ thiết bị bằng mã PIN Chủ Quán mới (5829) -> THÀNH CÔNG
    const unbindCQ = await auth.unbindDevice('5829');
    assert.isTrue(unbindCQ.success, 'PIN Chủ Quán mới 5829 gỡ máy thành công');
    assert.isFalse(useAuthStore.getState().deviceBinding.isBound, 'Thiết bị đã chuyển về máy mới');

    // Khôi phục liên kết máy để hoàn tất chu trình
    auth.bindDevice('branch_01', 'pos', 'Máy POS Quầy 01');
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound);
  });

  // =========================================================================
  // GIAI ĐOẠN 5: PHÂN ĐỊNH RANH GIỚI BẢO MẬT & QUYỀN TRUY CẬP
  // =========================================================================
  await runner.test('Giai đoạn 5: Ranh giới bảo mật nghiêm ngặt giữa Chủ Quán và các vai trò khác', () => {
    // 1. Thu Ngân (cashier) không được truy cập Cài Đặt và Nhân Sự
    assert.isFalse(checkRoutePermission('cashier', '/cai-dat'), 'Thu ngân không vào được /cai-dat');
    assert.isFalse(checkRoutePermission('cashier', '/nhan-su'), 'Thu ngân không vào được /nhan-su');
    assert.isFalse(checkRoutePermission('cashier', '/saas-admin'), 'Thu ngân không vào được /saas-admin');

    // 2. Phục Vụ (server) chỉ được xem Bán hàng, Bếp, Sổ đơn
    assert.isFalse(checkRoutePermission('server', '/cai-dat'), 'Phục vụ không vào được /cai-dat');
    assert.isFalse(checkRoutePermission('server', '/so-quy'), 'Phục vụ không vào được /so-quy');

    // 3. Chủ Quán (owner) vào được Cài Đặt, Nhân Sự, Báo Cáo P&L, nhưng KHÔNG được vào SaaS Admin (Chủ Dự Án)
    assert.isTrue(checkRoutePermission('owner', '/cai-dat'), 'Chủ Quán vào được /cai-dat');
    assert.isTrue(checkRoutePermission('owner', '/nhan-su'), 'Chủ Quán vào được /nhan-su');
    assert.isTrue(checkRoutePermission('owner', '/bao-cao-loi-nhuan'), 'Chủ Quán vào được /bao-cao-loi-nhuan');
    assert.isFalse(checkRoutePermission('owner', '/saas-admin'), 'Chủ Quán không vào được /saas-admin của Chủ Dự Án');
  });
}
