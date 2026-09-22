import { StoreSettings } from './usePOSStore';

export function mapStoreSettingsToBackend(s: StoreSettings, tenantId?: string, branchId?: string) {
  return {
    tenant_id: tenantId || 'tenant-default',
    branch_id: branchId || 'branch-default',
    store_name: s.storeName,
    store_address: s.address,
    store_phone: s.phone,
    slogan: s.slogan,
    opening_hours: s.openingHours || '07:00 - 22:30',
    wifi_name: s.wifiName,
    wifi_password: s.wifiPassword,
    website: s.website,
    facebook_page: s.facebookPage,
    bank_code: s.bankCode,
    bank_name: s.bankName,
    bank_account_no: s.accountNumber,
    bank_account_name: s.accountHolder,
    bank_branch: s.bankBranch,
    transfer_syntax: s.transferSyntax || '[MA_DON]',
    qr_payment_template: s.qrPaymentTemplate || 'compact2',
    soundbox_provider: s.soundboxProvider || 'mbbank',
    mb_soundbox_enabled: s.mbSoundboxEnabled ?? true,
    mb_soundbox_id: s.mbSoundboxId,
    mb_merchant_id: s.mbMerchantId,
    mb_ref_prefix: s.mbRefPrefix,
    mb_raw_qr_string: s.mbRawQrString,
    receipt_title: s.receiptTitle || 'HÓA ĐƠN THANH TOÁN',
    receipt_footer: s.receiptFooterText || 'Cảm ơn Quý khách & Hẹn gặp lại!',
    printer_ip: s.printerIp,
    printer_port: s.printerPort || 9100,
    paper_size: s.paperSize || 'K80',
    print_copies: s.printCopies || 1,
    print_qr_on_bill: s.printQrOnBill ?? true,
    print_wifi_on_bill: s.printWifiOnBill ?? true,
    print_cashier_on_bill: s.printCashierOnBill ?? true,
    print_item_note_on_bill: s.printItemNoteOnBill ?? true,
    print_barcode_on_bill: s.printBarcodeOnBill ?? true,
    auto_cut: s.autoCut ?? true,
    kick_drawer: s.kickDrawer ?? true,
    vat_rate: s.vatRate || 0,
    service_fee_rate: s.serviceFeeRate || 0,
    flat_surcharge: s.flatSurcharge || 0,
    surcharge_label: s.surchargeLabel || '',
    default_order_channel: s.defaultOrderChannel || 'dine_in',
    auto_print_on_payment: s.autoPrintOnPayment ?? true,
    require_table_selection: s.requireTableSelection ?? true,
    allow_negative_stock: s.allowNegativeStock ?? true,
    require_pin_for_void: s.requirePinForVoid ?? true,
    high_discount_threshold: s.highDiscountThreshold || 20,
    enable_kds: s.enableKds ?? true,
    kds_auto_cleanup_minutes: s.kdsAutoCleanupMinutes || 30,
    enable_sugar_ice_modifier: s.enableSugarIceModifier ?? true,
    sugar_ice_categories: JSON.stringify(s.sugarIceCategories || []),
    quick_notes_list: JSON.stringify(s.quickNotesList || []),
    cfd_welcome_message: s.cfdWelcomeMessage || 'Kính Chào Quý Khách!',
    telegram_bot_token: s.telegramBotToken,
    telegram_chat_id: s.telegramChatId,
    enable_telegram_alerts: s.enableTelegramAlerts ?? false,
  };
}

export function mapBackendToStoreSettings(raw: any, existing: StoreSettings): StoreSettings {
  if (!raw) return existing;
  const d = raw.data || raw;

  let parsedSugarIceCats = existing.sugarIceCategories;
  if (d.sugar_ice_categories) {
    try {
      parsedSugarIceCats = typeof d.sugar_ice_categories === 'string' ? JSON.parse(d.sugar_ice_categories) : d.sugar_ice_categories;
    } catch (_) {}
  }

  let parsedQuickNotes = existing.quickNotesList;
  if (d.quick_notes_list) {
    try {
      parsedQuickNotes = typeof d.quick_notes_list === 'string' ? JSON.parse(d.quick_notes_list) : d.quick_notes_list;
    } catch (_) {}
  }

  return {
    ...existing,
    storeName: d.store_name || d.storeName || existing.storeName,
    address: d.store_address || d.address || existing.address,
    phone: d.store_phone || d.phone || existing.phone,
    slogan: d.slogan !== undefined ? d.slogan : existing.slogan,
    openingHours: d.opening_hours || d.openingHours || existing.openingHours,
    wifiName: d.wifi_name || d.wifiName || existing.wifiName,
    wifiPassword: d.wifi_password || d.wifiPassword || existing.wifiPassword,
    website: d.website !== undefined ? d.website : existing.website,
    facebookPage: d.facebook_page !== undefined ? d.facebookPage : existing.facebookPage,
    bankCode: d.bank_code || d.bankCode || existing.bankCode,
    bankName: d.bank_name || d.bankName || existing.bankName,
    accountNumber: d.bank_account_no || d.accountNumber || existing.accountNumber,
    accountHolder: d.bank_account_name || d.accountHolder || existing.accountHolder,
    bankBranch: d.bank_branch !== undefined ? d.bank_branch : existing.bankBranch,
    transferSyntax: d.transfer_syntax || d.transferSyntax || existing.transferSyntax,
    qrPaymentTemplate: d.qr_payment_template || d.qrPaymentTemplate || existing.qrPaymentTemplate,
    soundboxProvider: d.soundbox_provider || d.soundboxProvider || existing.soundboxProvider,
    mbSoundboxEnabled: d.mb_soundbox_enabled !== undefined ? d.mb_soundbox_enabled : existing.mbSoundboxEnabled,
    mbSoundboxId: d.mb_soundbox_id || d.mbSoundboxId || existing.mbSoundboxId,
    mbMerchantId: d.mb_merchant_id || d.mbMerchantId || existing.mbMerchantId,
    mbRefPrefix: d.mb_ref_prefix || d.mbRefPrefix || existing.mbRefPrefix,
    mbRawQrString: d.mb_raw_qr_string || d.mbRawQrString || existing.mbRawQrString,
    receiptTitle: d.receipt_title || d.receiptTitle || existing.receiptTitle,
    receiptFooterText: d.receipt_footer || d.receiptFooterText || existing.receiptFooterText,
    printerIp: d.printer_ip || d.printerIp || existing.printerIp,
    printerPort: d.printer_port !== undefined ? Number(d.printer_port) : existing.printerPort,
    paperSize: d.paper_size || d.paperSize || existing.paperSize,
    printCopies: d.print_copies !== undefined ? Number(d.print_copies) : existing.printCopies,
    printQrOnBill: d.print_qr_on_bill !== undefined ? d.print_qr_on_bill : existing.printQrOnBill,
    printWifiOnBill: d.print_wifi_on_bill !== undefined ? d.print_wifi_on_bill : existing.printWifiOnBill,
    printCashierOnBill: d.print_cashier_on_bill !== undefined ? d.print_cashier_on_bill : existing.printCashierOnBill,
    printItemNoteOnBill: d.print_item_note_on_bill !== undefined ? d.print_item_note_on_bill : existing.printItemNoteOnBill,
    printBarcodeOnBill: d.print_barcode_on_bill !== undefined ? d.print_barcode_on_bill : existing.printBarcodeOnBill,
    autoCut: d.auto_cut !== undefined ? d.auto_cut : existing.autoCut,
    kickDrawer: d.kick_drawer !== undefined ? d.kick_drawer : existing.kickDrawer,
    vatRate: d.vat_rate !== undefined ? Number(d.vat_rate) : existing.vatRate,
    serviceFeeRate: d.service_fee_rate !== undefined ? Number(d.service_fee_rate) : existing.serviceFeeRate,
    flatSurcharge: d.flat_surcharge !== undefined ? Number(d.flat_surcharge) : existing.flatSurcharge,
    surchargeLabel: d.surcharge_label !== undefined ? d.surcharge_label : existing.surchargeLabel,
    defaultOrderChannel: d.default_order_channel || d.defaultOrderChannel || existing.defaultOrderChannel,
    autoPrintOnPayment: d.auto_print_on_payment !== undefined ? d.auto_print_on_payment : existing.autoPrintOnPayment,
    requireTableSelection: d.require_table_selection !== undefined ? d.require_table_selection : existing.requireTableSelection,
    allowNegativeStock: d.allow_negative_stock !== undefined ? d.allow_negative_stock : existing.allowNegativeStock,
    requirePinForVoid: d.require_pin_for_void !== undefined ? d.require_pin_for_void : existing.requirePinForVoid,
    highDiscountThreshold: d.high_discount_threshold !== undefined ? Number(d.high_discount_threshold) : existing.highDiscountThreshold,
    enableKds: d.enable_kds !== undefined ? (d.enable_kds === true || d.enable_kds === 'true' || d.enable_kds === 1) : existing.enableKds,
    kdsAutoCleanupMinutes: d.kds_auto_cleanup_minutes !== undefined ? Number(d.kds_auto_cleanup_minutes) : existing.kdsAutoCleanupMinutes,
    enableSugarIceModifier: d.enable_sugar_ice_modifier !== undefined ? (d.enable_sugar_ice_modifier === true || d.enable_sugar_ice_modifier === 'true' || d.enable_sugar_ice_modifier === 1) : existing.enableSugarIceModifier,
    sugarIceCategories: parsedSugarIceCats || existing.sugarIceCategories,
    quickNotesList: parsedQuickNotes || existing.quickNotesList,
    cfdWelcomeMessage: d.cfd_welcome_message || d.cfdWelcomeMessage || existing.cfdWelcomeMessage,
    telegramBotToken: d.telegram_bot_token || d.telegramBotToken || existing.telegramBotToken,
    telegramChatId: d.telegram_chat_id || d.telegramChatId || existing.telegramChatId,
    enableTelegramAlerts: d.enable_telegram_alerts !== undefined ? d.enable_telegram_alerts : existing.enableTelegramAlerts,
  };
}
