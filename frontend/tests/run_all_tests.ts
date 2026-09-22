/**
 * 👑 OngChu Lean POS - Master Test Suite Runner
 * Executes Tier 1, Tier 2, Tier 3, and Tier 4 Automated Test Suites.
 */

import './setup_env';
import { runner } from './harness';
import { runTier1Tests } from './tier1_feature_coverage.test';
import { runTier2Tests } from './tier2_boundary_corner.test';
import { runTier3Tests } from './tier3_cross_combinations.test';
import { runTier4Tests } from './tier4_real_workloads.test';
import { runTier5Tests } from './tier5_m4_integration.test';
import { runCardRefactoringTests } from './adversarial_card_refactoring.test';
import { runM3ExpressiveTests } from './adversarial_m3_expressive.test';
import { runTableCartSelectionFlowTests } from './table_cart_selection_flow.test';
import { runReportDateRangeMetricsTests } from './report_date_range_metrics.test';
import { runMenuAndTableManagementTests } from './menu_and_table_management.test';
import { runStaffTimekeepingAndPayrollTests } from './staff_timekeeping_and_payroll.test';
import { runStoreSettingsAndBillCustomizationTests } from './store_settings_and_bill_customization.test';
import { runBackendContractAlignmentTests } from './backend_contract_alignment.test';
import { runRealDataEngineTests } from './real_data_engine.test';
import { runReorderSizeModifierFlowTests } from './reorder_size_modifier_flow.test';
import { runSoloStaff5TablesFlowTests } from './solo_staff_5_tables_flow.test';
import { runSaaSAuthTests } from './saas_auth_login.test';
import { runKioskLoginScenarioTests } from './kiosk_login_scenarios.test';
import { runSidebarArchitectureTests } from './sidebar_architecture.test';
import { runMicrocopyComplianceTests } from './microcopy_compliance.test';
import { runSaaSAdminPlatformTests } from './saas_admin_platform.test';
import { runUnconfiguredRolesFlowTests } from './unconfigured_roles_flow.test';
import { runFiveDevicesConcurrentStoreTests } from './five_devices_concurrent_store.test';
import { runAuthBranchStaffPasscodeSecurityTests } from './auth_branch_staff_passcode_security.test';
import { runOwnerCredentialsLifecycleTests } from './owner_credentials_lifecycle.test';
import { runMultiTenantIsolationTests } from './multi_tenant_isolation.test';
import { runBranchManagementFlowTests } from './branch_management_flow.test';
import { runTaxAndSurchargeFlowTests } from './tax_and_surcharge_flow.test';
import { runCustomerDebtFlowTests } from './customer_debt_flow.test';
import { runHoldOrderAndCupStickerFlowTests } from './hold_order_and_cup_sticker_flow.test';
import { runThreePhaseAdvancedPOSTests } from './three_phase_advanced_pos.test';
import { runGuideAndDocumentationTests } from './guide_and_documentation.test';
import { runQuanQuanIPhoneBootstrapTests } from './quanquan_iphone_bootstrap.test';
import { runIosFlowPersistenceTests } from './ios_flow_persistence.test';
import { runAppleReviewComplianceTests } from './apple_review_compliance.test';
import { runCoreFlowsUXAuditTests } from './audit_core_flows_ux';
import { runSwe2ReviewerTests } from './adversarial_swe2_reviewer.test';
import { runSwe3SharedComponentsTests } from './adversarial_swe3_shared_components.test';
import { runSoloOwnerAndSingleStoreTests } from './solo_owner_and_single_store_workflow.test';
import { runVPSLiveDatabaseTests } from './test_vps_live_api';
import { runRecipeBookAndSOPTests } from './recipe_book_cogs_sop.test';

async function main() {
  console.log('🚀 Starting OngChu Lean POS Comprehensive 5-Tier Automated Test Suite...\n');
  const globalStart = performance.now();

  try {
    // Execute all test tiers
    await runTier1Tests();
    await runTier2Tests();
    await runTier3Tests();
    await runTier4Tests();
    await runTier5Tests();
    await runVPSLiveDatabaseTests();
    await runSaaSAuthTests();
    await runKioskLoginScenarioTests();
    await runUnconfiguredRolesFlowTests();
    await runSaaSAdminPlatformTests();
    await runCardRefactoringTests();
    await runM3ExpressiveTests();
    await runSidebarArchitectureTests();
    await runMicrocopyComplianceTests();
    await runTableCartSelectionFlowTests();
    await runReorderSizeModifierFlowTests();
    await runSoloStaff5TablesFlowTests();
    await runFiveDevicesConcurrentStoreTests();
    await runAuthBranchStaffPasscodeSecurityTests();
    await runOwnerCredentialsLifecycleTests();
    await runMultiTenantIsolationTests();
    await runBranchManagementFlowTests();
    await runTaxAndSurchargeFlowTests();
    await runCustomerDebtFlowTests();
    await runReportDateRangeMetricsTests();
    await runMenuAndTableManagementTests();
    await runStaffTimekeepingAndPayrollTests();
    await runStoreSettingsAndBillCustomizationTests();
    await runBackendContractAlignmentTests();
    await runRealDataEngineTests();
    await runHoldOrderAndCupStickerFlowTests();
    await runThreePhaseAdvancedPOSTests();
    await runGuideAndDocumentationTests();
    await runQuanQuanIPhoneBootstrapTests();
    await runIosFlowPersistenceTests();
    await runAppleReviewComplianceTests();
    await runCoreFlowsUXAuditTests();
    await runSwe2ReviewerTests();
    await runSwe3SharedComponentsTests();
    await runSoloOwnerAndSingleStoreTests();
    await runRecipeBookAndSOPTests();

    const globalDuration = Math.round(performance.now() - globalStart);
    const passed = runner.printSummary();

    console.log(`⏱️ Total Execution Time: ${globalDuration}ms`);

    if (!passed) {
      console.error('❌ Some tests failed.');
      process.exit(1);
    } else {
      console.log('✨ All tests passed successfully with 100% integrity!');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('💥 Fatal error in test suite runner:', err);
    process.exit(1);
  }
}

main();
