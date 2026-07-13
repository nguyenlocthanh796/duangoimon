#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// POSA Mock Database Engine — JSON-file based, zero dependencies
// Dữ liệu được lưu vào mock-server/data/*.json, persist qua các lần
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// ─── Tiny DB engine ───────────────────────────────────────────
class Table {
  constructor(name, seedFn) {
    this.name = name;
    this.file = path.join(DATA_DIR, `${name}.json`);
    this.rows = [];
    this.seedFn = seedFn;
    this.dirty = false;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        this.rows = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        return;
      }
    } catch { /* corrupt file, reseed */ }
    this.rows = this.seedFn ? this.seedFn() : [];
    this.dirty = true;
    this.save();
  }

  save() {
    if (!this.dirty) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.rows, null, 2), 'utf8');
    this.dirty = false;
  }

  all() { return this.rows; }
  by(field, value) { return this.rows.filter(r => r[field] === value); }
  find(id) { return this.rows.find(r => r.id === id); }

  insert(row) {
    this.rows.push(row);
    this.dirty = true;
    this.save();
    return row;
  }

  update(id, data) {
    const idx = this.rows.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.rows[idx] = { ...this.rows[idx], ...data };
    this.dirty = true;
    this.save();
    return this.rows[idx];
  }

  remove(id) {
    const idx = this.rows.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.rows.splice(idx, 1);
    this.dirty = true;
    this.save();
    return true;
  }

  count() { return this.rows.length; }
  reset() { this.rows = this.seedFn ? this.seedFn() : []; this.dirty = true; this.save(); }
}

// ─── ID Generator ───────────────────────────────────────────
let _counters = {};
function nextId(prefix) {
  if (!_counters[prefix]) _counters[prefix] = 0;
  _counters[prefix]++;
  return `${prefix}_${String(_counters[prefix]).padStart(3, '0')}`;
}

// ─── Helpers ────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pastDate = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString(); };
const futureDate = (d) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString(); };

// ─── ==========================================================
// SEED DATA
// ─── ==========================================================

const VN_FIRST = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'];
const VN_MID = ['Văn','Thị','Minh','Quốc','Hữu','Đức','Công','Thanh','Ngọc','Anh','Kim','Mỹ','Xuân','Thu','Đông'];
const VN_LAST = ['Tuấn','Hùng','Dũng','Mạnh','Tài','Lộc','Phước','An','Bình','Hòa','Hạnh','Phúc','Thịnh','Phương','Linh','Hiền','Hương','Lan','Mai','Đào','Sơn','Nam','Nữ'];
const STREETS = ['Nguyễn Huệ','Lê Lợi','Trần Hưng Đạo','Hai Bà Trưng','Phạm Ngũ Lão','Nguyễn Trãi','Cách Mạng Tháng 8','Lý Tự Trọng','Nguyễn Đình Chiểu','Bùi Thị Xuân','Võ Văn Tần','Nguyễn Thị Minh Khai'];
const DISTRICTS = ['Quận 1','Quận 2','Quận 3','Quận 5','Quận 7','Tân Bình','Bình Thạnh','Phú Nhuận','Gò Vấp','Thủ Đức'];
const PRODS = [
  { n: 'Phở Bò Đặc Biệt', c: 'Món chính', p: 55000, cp: 22000, u: 'tô' },
  { n: 'Bún Chả Hà Nội', c: 'Món chính', p: 45000, cp: 18000, u: 'tô' },
  { n: 'Cà Phê Sữa Đá', c: 'Đồ uống', p: 25000, cp: 6000, u: 'ly' },
  { n: 'Nước Ép Cam', c: 'Đồ uống', p: 30000, cp: 8000, u: 'ly' },
  { n: 'Bánh Mì Ốp La', c: 'Món phụ', p: 15000, cp: 5000, u: 'cái' },
  { n: 'Chả Giò (4 cái)', c: 'Khai vị', p: 28000, cp: 10000, u: 'dĩa' },
  { n: 'Lẩu Thái Hải Sản', c: 'Lẩu', p: 180000, cp: 75000, u: 'bếp' },
  { n: 'Cơm Chiên Dương Châu', c: 'Món chính', p: 35000, cp: 12000, u: 'dĩa' },
  { n: 'Rau Muống Xào Tỏi', c: 'Món phụ', p: 18000, cp: 6000, u: 'dĩa' },
  { n: 'Trà Đào Cam Sả', c: 'Đồ uống', p: 22000, cp: 5000, u: 'ly' },
];
const MATS = [
  { n: 'Thịt bò Mỹ', c: 'Thịt', u: 'kg', dc: 180000 },
  { n: 'Phở gạo', c: 'Mì-Phở', u: 'kg', dc: 25000 },
  { n: 'Tôm sú size 16', c: 'Hải sản', u: 'kg', dc: 220000 },
  { n: 'Cà phê nhân Robusta', c: 'Đồ uống', u: 'kg', dc: 95000 },
  { n: 'Sữa đặc Ông Thọ', c: 'Đồ uống', u: 'lon', dc: 15000 },
  { n: 'Bánh mì ổ', c: 'Bánh', u: 'cái', dc: 5000 },
  { n: 'Thịt heo xay', c: 'Thịt', u: 'kg', dc: 85000 },
  { n: 'Rau muống', c: 'Rau', u: 'kg', dc: 8000 },
  { n: 'Cam sành', c: 'Trái cây', u: 'kg', dc: 20000 },
  { n: 'Dầu ăn Tường An', c: 'Gia vị', u: 'lít', dc: 35000 },
  { n: 'Nước mắm Nam Ngư', c: 'Gia vị', u: 'chai', dc: 22000 },
  { n: 'Tỏi Lý Sơn', c: 'Gia vị', u: 'kg', dc: 25000 },
  { n: 'Trứng gà', c: 'Thịt', u: 'chục', dc: 18000 },
  { n: 'Bia Tiger', c: 'Đồ uống', u: 'lon', dc: 10000 },
];
const CATEGORIES = ['Món chính','Đồ uống','Món phụ','Khai vị','Lẩu'];

// ─── Seed functions ─────────────────────────────────────────
function seedBranches() { return [
  { id:'br_01', name:'Chi nhánh Trung Tâm', code:'CN001', address:'123 Nguyễn Huệ, Quận 1', phone:'0901234567', is_active:true, created_at:pastDate(365) },
  { id:'br_02', name:'Chi nhánh Sân Bay', code:'CN002', address:'Sân bay Tân Sơn Nhất, Tân Bình', phone:'0901234568', is_active:true, created_at:pastDate(300) },
  { id:'br_03', name:'Chi nhánh Phú Mỹ Hưng', code:'CN003', address:'456 Nguyễn Lương Bằng, Quận 7', phone:'0901234569', is_active:true, created_at:pastDate(200) },
];}

function seedStations() { return [
  { id:'st_01', branch_id:'br_01', name:'Bếp Chính', code:'BP01', categories:['Món chính','Khai vị'], printer_name:'EPSON TM-T88', is_active:true, created_at:pastDate(300) },
  { id:'st_02', branch_id:'br_01', name:'Bếp Lẩu & Nướng', code:'BP02', categories:['Lẩu','Nướng'], printer_name:'EPSON TM-U220', is_active:true, created_at:pastDate(290) },
  { id:'st_03', branch_id:'br_01', name:'Pha Chế', code:'BP03', categories:['Đồ uống','Sinh tố','Trà sữa'], printer_name:'STAR TSP143', is_active:true, created_at:pastDate(280) },
  { id:'st_04', branch_id:'br_02', name:'Bếp Sân Bay', code:'BP04', categories:['Món chính','Đồ uống'], printer_name:'EPSON TM-m30', is_active:true, created_at:pastDate(250) },
];}

function seedSuppliers() {
  const data = [
    { n:'Công ty TNHH Thực Phẩm Xanh', cp:'Nguyễn Văn Tuấn', p:'0912345671', e:'tp.xanh@gmail.com', a:'12 Lý Tự Trọng, Quận 1', tc:'0123456789', pt:'net30' },
    { n:'Trang Trại Sạch Farm', cp:'Trần Thị Hương', p:'0912345672', e:'sach.farm@gmail.com', a:'45 Xa lộ Hà Nội, Thủ Đức', tc:'0987654321', pt:'cod' },
    { n:'Công ty CP Đồ Uống Việt', cp:'Lê Minh Tài', p:'0912345673', e:'douongviet@gmail.com', a:'78 Nguyễn Trãi, Quận 5', tc:'0112233445', pt:'net15' },
    { n:'Hải Sản Biển Đông', cp:'Hoàng Thị Lan', p:'0912345674', e:'biendong.hs@gmail.com', a:'90 Bùi Thị Xuân, Quận 1', tc:'0556677889', pt:'cod' },
  ];
  return data.map((d,i) => ({ id:`sp_${String(i+1).padStart(2,'0')}`, branch_id:'br_01', code:`NCC${String(i+1).padStart(3,'0')}`, name:d.n, contact_person:d.cp, phone:d.p, email:d.e, address:d.a, tax_code:d.tc, payment_terms:d.pt, is_active:true, created_at:pastDate(200-i*20) }));
}

function seedMaterials() {
  return MATS.map((m,i) => ({ id:`rm_${String(i+1).padStart(2,'0')}`, branch_id:'br_01', code:`NL${String(i+1).padStart(3,'0')}`, name:m.n, category:m.c, unit:m.u, default_cost:m.dc, current_stock:Math.round(20+Math.random()*100), min_stock:Math.round(5+Math.random()*30), image_url:null, is_active:true, created_at:pastDate(200-i*10) }));
}

function seedProducts() {
  return PRODS.map((p,i) => ({ id:`pr_${String(i+1).padStart(2,'0')}`, name:p.n, category:p.c, price:p.p, cost_price:p.cp, unit:p.u, is_active:true }));
}

function seedRecipes() {
  const recipes = [
    { id:'rc_01', product_id:'pr_01', name:'Phở Bò Đặc Biệt', yield_qty:1, yield_unit:'tô', cost_price:22000, instructions:'Luộc bánh phở, xếp thịt bò tái, chan nước dùng nóng', wastage_percent:3, items:[ { rm:'rm_01', qty:0.2, u:'kg', cost:36000 }, { rm:'rm_02', qty:0.3, u:'kg', cost:7500 } ]},
    { id:'rc_02', product_id:'pr_02', name:'Bún Chả Hà Nội', yield_qty:1, yield_unit:'tô', cost_price:18000, instructions:'Nướng thịt heo trên than hoa, pha nước mắm chua ngọt', wastage_percent:5, items:[ { rm:'rm_07', qty:0.15, u:'kg', cost:12750 } ]},
    { id:'rc_03', product_id:'pr_03', name:'Cà Phê Sữa Đá', yield_qty:1, yield_unit:'ly', cost_price:6000, instructions:'Pha cà phê phin 5 phút, thêm sữa đặc và đá', wastage_percent:2, items:[ { rm:'rm_04', qty:0.03, u:'kg', cost:2850 }, { rm:'rm_05', qty:0.5, u:'lon', cost:7500 } ]},
    { id:'rc_04', product_id:'pr_04', name:'Nước Ép Cam', yield_qty:1, yield_unit:'ly', cost_price:8000, instructions:'Ép cam tươi, thêm đường và đá', wastage_percent:10, items:[ { rm:'rm_09', qty:0.4, u:'kg', cost:8000 } ]},
    { id:'rc_05', product_id:'pr_05', name:'Bánh Mì Ốp La', yield_qty:1, yield_unit:'cái', cost_price:5000, instructions:'Nướng bánh mì, ốp la trứng, thêm pate, rau thơm', wastage_percent:2, items:[ { rm:'rm_06', qty:1, u:'cái', cost:5000 } ]},
    { id:'rc_06', product_id:'pr_07', name:'Lẩu Thái Hải Sản', yield_qty:1, yield_unit:'bếp', cost_price:75000, instructions:'Nấu nước lẩu Thái, cho hải sản và rau vào', wastage_percent:8, items:[ { rm:'rm_03', qty:0.5, u:'kg', cost:110000 }, { rm:'rm_10', qty:0.1, u:'lít', cost:3500 }, { rm:'rm_11', qty:0.05, u:'chai', cost:1100 } ]},
  ];
  return recipes.map(r => {
    let rii = 0;
    return { ...r, branch_id:'br_01', is_active:true, created_at:pastDate(200-parseInt(r.id.slice(-2))*5), items: r.items.map(it => { rii++; return { id:`ri_${r.id.slice(-2)}_${rii}`, recipe_id:r.id, raw_material_id:it.rm, quantity:it.qty, unit:it.u, cost:it.cost, note:null }; }) };
  });
}

function seedCustomers() { return [
  { id:'cs_01', branch_id:'br_01', name:'Nguyễn Văn Tuấn', phone:'0901122331', email:'tuan.nguyen@gmail.com', address:'12 Nguyễn Huệ, Quận 1', total_spent:28500000, visit_count:47, last_visit:pastDate(3), tags:{vip:true,birthday:'15/05'}, is_active:true, created_at:pastDate(300) },
  { id:'cs_02', branch_id:'br_01', name:'Trần Thị Hương', phone:'0901122332', email:'huong.tran@yahoo.com', address:'34 Lê Lợi, Quận 1', total_spent:15600000, visit_count:23, last_visit:pastDate(7), tags:{}, is_active:true, created_at:pastDate(250) },
  { id:'cs_03', branch_id:'br_01', name:'Lê Minh Anh', phone:'0901122333', email:'anh.le@gmail.com', address:'56 Phạm Ngũ Lão, Quận 1', total_spent:8900000, visit_count:15, last_visit:pastDate(14), tags:{birthday:'20/08'}, is_active:true, created_at:pastDate(200) },
  { id:'cs_04', branch_id:'br_01', name:'Phạm Hoàng Nam', phone:'0901122334', email:'nam.pham@outlook.com', address:'78 Nguyễn Trãi, Quận 5', total_spent:45000000, visit_count:62, last_visit:pastDate(1), tags:{vip:true,birthday:'02/02'}, is_active:true, created_at:pastDate(350) },
  { id:'cs_05', branch_id:'br_01', name:'Hoàng Thị Lan', phone:'0901122335', email:'lan.hoang@gmail.com', address:'90 Cách Mạng Tháng 8, Quận 3', total_spent:3200000, visit_count:5, last_visit:pastDate(30), tags:{}, is_active:true, created_at:pastDate(100) },
  { id:'cs_06', branch_id:'br_01', name:'Đặng Văn Phúc', phone:'0901122336', email:'phuc.dang@gmail.com', address:'12 Lý Tự Trọng, Quận 1', total_spent:12000000, visit_count:18, last_visit:pastDate(10), tags:{birthday:'10/10'}, is_active:true, created_at:pastDate(180) },
  { id:'cs_07', branch_id:'br_01', name:'Bùi Thị Mai', phone:'0901122337', email:'mai.bui@yahoo.com', address:'78 Phạm Ngũ Lão, Quận 1', total_spent:6000000, visit_count:9, last_visit:pastDate(21), tags:{}, is_active:true, created_at:pastDate(120) },
];}

function seedBookings() { return [
  { id:'bk_01', branch_id:'br_01', customer_id:'cs_01', customer_name:'Nguyễn Văn Tuấn', phone:'0901122331', email:'tuan.nguyen@gmail.com', guest_count:4, table_id:'tb_01', note:'Bàn gần cửa sổ, có trẻ em', status:'confirmed', booked_at:futureDate(1), created_at:pastDate(2) },
  { id:'bk_02', branch_id:'br_01', customer_id:null, customer_name:'Nguyễn Thị Mai', phone:'0909988776', email:null, guest_count:2, table_id:null, note:null, status:'pending', booked_at:futureDate(2), created_at:pastDate(1) },
  { id:'bk_03', branch_id:'br_01', customer_id:'cs_04', customer_name:'Phạm Hoàng Nam', phone:'0901122334', email:'nam.pham@outlook.com', guest_count:6, table_id:'tb_06', note:'Sinh nhật vợ, trang trí bánh kem', status:'confirmed', booked_at:futureDate(3), created_at:pastDate(1) },
  { id:'bk_04', branch_id:'br_01', customer_id:null, customer_name:'Trần Văn Long', phone:'0908877665', email:null, guest_count:3, table_id:null, note:'Không ăn cay', status:'arrived', booked_at:pastDate(0), created_at:pastDate(1) },
  { id:'bk_05', branch_id:'br_01', customer_id:'cs_02', customer_name:'Trần Thị Hương', phone:'0901122332', email:'huong.tran@yahoo.com', guest_count:8, table_id:null, note:'Tiệc nhẹ cuối tuần, 19h', status:'cancelled', booked_at:pastDate(5), created_at:pastDate(7) },
  { id:'bk_06', branch_id:'br_01', customer_id:null, customer_name:'Lê Văn Sơn', phone:'0907766554', email:null, guest_count:5, table_id:null, note:'Đặt bàn ngoài trời', status:'confirmed', booked_at:futureDate(0), created_at:pastDate(0) },
  { id:'bk_07', branch_id:'br_01', customer_id:'cs_06', customer_name:'Đặng Văn Phúc', phone:'0901122336', email:'phuc.dang@gmail.com', guest_count:3, table_id:null, note:null, status:'pending', booked_at:futureDate(5), created_at:pastDate(2) },
];}

function seedTiers() { return [
  { id:'mb_01', name:'Thành Viên Đồng', min_spent:0, discount_rate:0, multiplier:1, is_active:true, member_count:230, color:'#CD7F32', created_at:pastDate(365) },
  { id:'mb_02', name:'Thành Viên Bạc', min_spent:5000000, discount_rate:5, multiplier:1.2, is_active:true, member_count:85, color:'#C0C0C0', created_at:pastDate(300) },
  { id:'mb_03', name:'Thành Viên Vàng', min_spent:15000000, discount_rate:10, multiplier:1.5, is_active:true, member_count:32, color:'#FFD700', created_at:pastDate(250) },
  { id:'mb_04', name:'Thành Viên Kim Cương', min_spent:40000000, discount_rate:15, multiplier:2, is_active:true, member_count:8, color:'#B9F2FF', created_at:pastDate(200) },
];}

function seedCampaigns() { return [
  { id:'cm_01', branch_id:'br_01', name:'Khuyến Mãi Tết Nguyên Đán 2026', type:'email', trigger:'scheduled', segment_filters:{min_spent:500000}, template:{subject:'Ưu đãi Tết đặc biệt từ POSA', body:'Chào bạn, Tết này hãy đến POSA để nhận ưu đãi...'}, scheduled_at:futureDate(30), sent_count:1500, is_active:true, created_at:pastDate(60) },
  { id:'cm_02', branch_id:'br_01', name:'Sinh Nhật Khách Hàng Thân Thiết', type:'sms', trigger:'birthday', segment_filters:{vip:true}, template:{body:'Chúc mừng sinh nhật! Nhận ngay ưu đãi 20% khi đến POSA...'}, scheduled_at:null, sent_count:230, is_active:true, created_at:pastDate(90) },
  { id:'cm_03', branch_id:'br_01', name:'Giảm Giá Món Mới — Lẩu Thái', type:'both', trigger:'promo', segment_filters:{}, template:{subject:'Món lẩu mới đã có mặt', body:'Lẩu Thái Hải Sản đã có mặt tại POSA với giá ưu đãi...'}, scheduled_at:futureDate(7), sent_count:5000, is_active:true, created_at:pastDate(30) },
  { id:'cm_04', branch_id:'br_01', name:'Tái Kích Hoạt Khách Hàng', type:'email', trigger:'scheduled', segment_filters:{last_visit_days:60}, template:{subject:'POSA nhớ bạn!', body:'Đã lâu bạn chưa ghé POSA...'}, scheduled_at:futureDate(14), sent_count:800, is_active:false, created_at:pastDate(45) },
];}

function seedVouchers() { return [
  { id:'v_01', branch_id:'br_01', code:'TET25', name:'Giảm Tết 25%', type:'percent', value:15, min_order:200000, max_discount:100000, usage_limit:500, used_count:342, valid_from:pastDate(10), valid_until:futureDate(50), is_active:true, created_at:pastDate(60) },
  { id:'v_02', branch_id:'br_01', code:'50K', name:'Giảm 50K đơn đầu tiên', type:'fixed', value:50000, min_order:150000, max_discount:null, usage_limit:100, used_count:78, valid_from:pastDate(5), valid_until:futureDate(90), is_active:true, created_at:pastDate(30) },
  { id:'v_03', branch_id:'br_01', code:'SINHNHAT', name:'Quà Sinh Nhật 20%', type:'percent', value:20, min_order:0, max_discount:50000, usage_limit:1000, used_count:156, valid_from:null, valid_until:null, is_active:true, created_at:pastDate(200) },
  { id:'v_04', branch_id:'br_01', code:'COMBO25', name:'Combo Tiết Kiệm', type:'percent', value:25, min_order:300000, max_discount:150000, usage_limit:200, used_count:45, valid_from:pastDate(3), valid_until:futureDate(30), is_active:true, created_at:pastDate(20) },
];}

function seedPromoRules() { return [
  { id:'pr_01', branch_id:'br_01', name:'Mua 2 tặng 1 đồ uống', type:'buy_x_get_y', conditions:{product_category:'Đồ uống', buy_qty:2}, benefits:{free_qty:1, max_free:1}, is_active:true, created_at:pastDate(100) },
  { id:'pr_02', branch_id:'br_01', name:'Combo Phở + Nước 45K', type:'combo', conditions:{product_ids:['pr_01','pr_03']}, benefits:{combo_price:45000}, is_active:true, created_at:pastDate(90) },
  { id:'pr_03', branch_id:'br_01', name:'Giảm 10% giờ vàng 17h-19h', type:'time_discount', conditions:{start_hour:17, end_hour:19, min_order:100000}, benefits:{discount_pct:10}, is_active:true, created_at:pastDate(80) },
];}

function seedShifts() { return [
  { id:'sh_01', branch_id:'br_01', shift_code:'CA-2601', cashier_id:'us_03', opening_balance:2000000, cash_end:8450000, expense_total:350000, total_revenue:6800000, difference:0, note:null, status:'da_ket_thuc', start_at:pastDate(1)+'T07:00:00Z', end_at:pastDate(1)+'T14:30:00Z', created_at:pastDate(1) },
  { id:'sh_02', branch_id:'br_01', shift_code:'CA-2602', cashier_id:'us_04', opening_balance:2000000, cash_end:7620000, expense_total:200000, total_revenue:5820000, difference:0, note:'Bàn 5 làm vỡ chén', status:'da_ket_thuc', start_at:pastDate(1)+'T14:00:00Z', end_at:pastDate(1)+'T22:30:00Z', created_at:pastDate(1) },
  { id:'sh_03', branch_id:'br_01', shift_code:'CA-2701', cashier_id:'us_03', opening_balance:2000000, cash_end:null, expense_total:null, total_revenue:null, difference:null, note:null, status:'dang_lam', start_at:pastDate(0)+'T07:00:00Z', end_at:null, created_at:pastDate(0) },
  { id:'sh_04', branch_id:'br_01', shift_code:'CA-2501', cashier_id:'us_04', opening_balance:2000000, cash_end:9250000, expense_total:450000, total_revenue:7700000, difference:0, note:'Sự cố máy in, đã khắc phục', status:'da_ket_thuc', start_at:pastDate(2)+'T07:00:00Z', end_at:pastDate(2)+'T14:00:00Z', created_at:pastDate(2) },
];}

function seedUsers() { return [
  { id:'us_01', name:'Admin', username:'admin', email:'admin@posa.vn', role:'admin', is_active:true },
  { id:'us_02', name:'Anh Tuấn', username:'manager', email:'manager@posa.vn', role:'manager', is_active:true },
  { id:'us_03', name:'Chị Mai', username:'cashier1', email:'cashier1@posa.vn', role:'cashier', is_active:true },
  { id:'us_04', name:'Chị Lan', username:'cashier2', email:'cashier2@posa.vn', role:'cashier', is_active:true },
  { id:'us_05', name:'Anh Hùng', username:'chef', email:'chef@posa.vn', role:'chef', is_active:true },
  { id:'us_06', name:'Nhân Viên Kho', username:'stock', email:'stock@posa.vn', role:'stock', is_active:false },
  { id:'us_07', name:'Phục Vụ Trưởng', username:'server', email:'server@posa.vn', role:'server', is_active:true },
];}

function seedTables() { return [
  { id:'tb_01', branch_id:'br_01', name:'Bàn 1', capacity:4, area:'Trong nhà', status:'trong', is_active:true },
  { id:'tb_02', branch_id:'br_01', name:'Bàn 2', capacity:4, area:'Trong nhà', status:'có khách', is_active:true },
  { id:'tb_03', branch_id:'br_01', name:'Bàn 3', capacity:6, area:'Trong nhà', status:'trong', is_active:true },
  { id:'tb_04', branch_id:'br_01', name:'Bàn 4', capacity:8, area:'Ngoài trời', status:'trong', is_active:true },
  { id:'tb_05', branch_id:'br_01', name:'Bàn 5', capacity:4, area:'Ngoài trời', status:'đã đặt', is_active:true },
  { id:'tb_06', branch_id:'br_01', name:'Bàn VIP', capacity:10, area:'Phòng VIP', status:'có khách', is_active:true },
  { id:'tb_07', branch_id:'br_01', name:'Bàn 7', capacity:2, area:'Trong nhà', status:'trong', is_active:true },
  { id:'tb_08', branch_id:'br_01', name:'Bàn 8', capacity:4, area:'Trong nhà', status:'có khách', is_active:true },
  { id:'tb_09', branch_id:'br_01', name:'Bàn 9', capacity:4, area:'Trong nhà', status:'trong', is_active:false },
  { id:'tb_10', branch_id:'br_01', name:'Bàn 10', capacity:6, area:'Sân vườn', status:'trong', is_active:true },
];}

function seedPurchaseOrders() { return [
  { id:'po_01', branch_id:'br_01', po_number:'PO-2026-001', supplier_id:'sp_01', status:'received', total_amount:8500000, note:'Đơn hàng định kỳ tháng 3', expected_date:pastDate(10), received_date:pastDate(8), created_at:pastDate(12), items:[
    { id:'poi_01', po_id:'po_01', raw_material_id:'rm_01', raw_material_name:'Thịt bò Mỹ', quantity:30, unit_price:175000, received_quantity:30, total:5250000 },
    { id:'poi_02', po_id:'po_01', raw_material_id:'rm_02', raw_material_name:'Phở gạo', quantity:50, unit_price:24000, received_quantity:50, total:1200000 },
  ], supplier:{ id:'sp_01', code:'NCC001', name:'Công ty TNHH Thực Phẩm Xanh', phone:'0912345671' } },
  { id:'po_02', branch_id:'br_01', po_number:'PO-2026-002', supplier_id:'sp_02', status:'pending', total_amount:3200000, note:'Giao giờ hành chính', expected_date:futureDate(3), received_date:null, created_at:pastDate(2), items:[
    { id:'poi_03', po_id:'po_02', raw_material_id:'rm_06', raw_material_name:'Bánh mì ổ', quantity:200, unit_price:4800, received_quantity:0, total:960000 },
    { id:'poi_04', po_id:'po_02', raw_material_id:'rm_08', raw_material_name:'Rau muống', quantity:40, unit_price:7500, received_quantity:0, total:300000 },
  ]},
  { id:'po_03', branch_id:'br_01', po_number:'PO-2026-003', supplier_id:'sp_03', status:'draft', total_amount:0, note:null, expected_date:null, received_date:null, created_at:pastDate(0), items:[], supplier:{ id:'sp_03', code:'NCC003', name:'Công ty CP Đồ Uống Việt', phone:'0912345673' } },
  { id:'po_04', branch_id:'br_01', po_number:'PO-2026-004', supplier_id:'sp_01', status:'received', total_amount:12500000, note:'Bổ sung thịt bò và tôm', expected_date:pastDate(5), received_date:pastDate(3), created_at:pastDate(7), items:[
    { id:'poi_05', po_id:'po_04', raw_material_id:'rm_01', raw_material_name:'Thịt bò Mỹ', quantity:50, unit_price:178000, received_quantity:50, total:8900000 },
    { id:'poi_06', po_id:'po_04', raw_material_id:'rm_03', raw_material_name:'Tôm sú', quantity:15, unit_price:210000, received_quantity:15, total:3150000 },
  ]},
];}

function seedAuditLogs() {
  const actions = ['Thêm mới','Cập nhật','Xóa','Đăng nhập','Xuất báo cáo','Cập nhật giá','Cập nhật tồn kho'];
  const entities = ['user','customer','product','supplier','order','recipe','booking','voucher','branch','raw_material'];
  return Array.from({length:50}, (_, i) => ({
    id:`log_${String(i+1).padStart(3,'0')}`, user_id:`us_${String(Math.floor(Math.random()*6)+1).padStart(2,'0')}`,
    username:pick(['Admin','Quản Lý','Thu Ngân 1','Thu Ngân 2','Bếp Trưởng',null]),
    action:pick(actions), entity_type:pick(entities), entity_id:Math.random()>0.3?'id_'+Math.random().toString(36).slice(2,8):null,
    changes:Math.random()>0.5?{before:{},after:{}}:null, ip_address:`192.168.1.${Math.floor(Math.random()*255)}`,
    created_at:pastDate(Math.floor(Math.random()*30)),
  }));
}

function seedTransactions() {
  const types = ['thu','chi'];
  const cats = ['Bán hàng','Nhập hàng','Lương','Điện nước','Thuế','Khác','Thu khác'];
  const notes = ['Thanh toán hóa đơn điện tháng 3','Mua nguyên liệu đợt 1','Trả lương nhân viên tháng 3','Nộp thuế GTGT','Tiền bán hàng trong ngày','Rút tiền ngân hàng','Chi phí bảo trì thiết bị',null];
  return Array.from({length:30}, (_, i) => ({
    id:`tx_${String(i+1).padStart(3,'0')}`,branch_id:'br_01',type:pick(types),category:pick(cats),
    amount:Math.round(100000+Math.random()*10000000), note:pick(notes),
    invoice_id:Math.random()>0.7?`inv_${String(Math.floor(Math.random()*20)+1).padStart(3,'0')}`:null,
    created_at:pastDate(Math.floor(Math.random()*30)),
  }));
}

function seedInvoices() {
  return Array.from({length:20}, (_, i) => ({
    id:`inv_${String(i+1).padStart(3,'0')}`,branch_id:'br_01',invoice_number:`HD-2026-${String(i+1).padStart(4,'0')}`,
    customer_name:Math.random()>0.5?`${pick(VN_FIRST)} ${pick(VN_MID)} ${pick(VN_LAST)}`:null,
    total_amount:Math.round(200000+Math.random()*5000000), status:pick(['issued','paid','cancelled']),
    issued_at:pastDate(Math.floor(Math.random()*60)), paid_at:Math.random()>0.4?pastDate(Math.floor(Math.random()*30)):null,
    created_at:pastDate(Math.floor(Math.random()*60)),
  }));
}

function seedTaxProfiles() { return [
  { id:'tp_01', branch_id:'br_01', tax_code:'1234567890', legal_name:'Hộ Kinh Doanh POSA Trung Tâm', registration_status:'registered', tax_method:'khoan', revenue_ytd:850000000, fiscal_year:2026, opened_in_first_half:true, threshold_alert_sent:false },
];}

function seedBankAccounts() { return [
  { id:'ba_01', branch_id:'br_01', tax_code:'1234567890', bank_name:'Vietcombank Chi nhánh TPHCM', account_number:'1234567890', wallet_type:'main', form_status:'submitted' },
  { id:'ba_02', branch_id:'br_01', tax_code:'1234567890', bank_name:'MB Bank Chi nhánh Quận 1', account_number:'0987654321', wallet_type:'business', form_status:'draft' },
];}

function seedDeadlines() { return [
  { id:'dl_01', branch_id:'br_01', form:'01/CNKD', period_type:'year', due_date:'2026-03-31', reminded_14:true, reminded_7:true, reminded_3:false, reminded_1:false, submitted:true },
  { id:'dl_02', branch_id:'br_01', form:'01/KHCN', period_type:'year', due_date:'2026-04-30', reminded_14:true, reminded_7:false, reminded_3:false, reminded_1:false, submitted:false },
  { id:'dl_03', branch_id:'br_01', form:'04/CNKD', period_type:'month', due_date:'2026-02-20', reminded_14:true, reminded_7:true, reminded_3:true, reminded_1:true, submitted:true },
  { id:'dl_04', branch_id:'br_01', form:'04/CNKD', period_type:'month', due_date:'2026-03-20', reminded_14:true, reminded_7:false, reminded_3:false, reminded_1:false, submitted:false },
  { id:'dl_05', branch_id:'br_01', form:'01/KHCN', period_type:'year', due_date:'2026-07-31', reminded_14:false, reminded_7:false, reminded_3:false, reminded_1:false, submitted:false },
];}

module.exports = { Table, nextId, DATA_DIR,
  seedBranches, seedStations, seedSuppliers, seedMaterials, seedProducts, seedRecipes,
  seedCustomers, seedBookings, seedTiers, seedCampaigns, seedVouchers, seedPromoRules,
  seedShifts, seedUsers, seedTables, seedPurchaseOrders, seedAuditLogs,
  seedTransactions, seedInvoices, seedTaxProfiles, seedBankAccounts, seedDeadlines,
  pastDate, futureDate, pick, VN_FIRST, VN_MID, VN_LAST, PRODS, CATEGORIES };
