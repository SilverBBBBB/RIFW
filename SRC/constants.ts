
import { Routine, Report, CDMMapping, Attribute, OutputSheet, SheetDetail, UserInput, ActivityLog } from './types';

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    log_id: 'log_01',
    user_id: 'user123',
    activity_type: 'Create Routine',
    activity_timestamp: '2023-11-01T10:00:00Z',
    details: 'User user123 created a new routine: Existence and Value Testing'
  },
  {
    log_id: 'log_02',
    user_id: 'user456',
    activity_type: 'Update Routine',
    activity_timestamp: '2023-11-02T11:30:00Z',
    details: 'User user456 updated the routine: Derivatives Fair Value Rollforward'
  },
  {
    log_id: 'log_03',
    user_id: 'user123',
    activity_type: 'Update Routine',
    activity_timestamp: '2023-11-03T09:15:00Z',
    details: 'User user123 updated the routine: Investment Fair Value and Cost Rollforward'
  },
  {
    log_id: 'log_04',
    user_id: 'user789',
    activity_type: 'Create Routine',
    activity_timestamp: '2023-11-04T14:00:00Z',
    details: 'User user789 created a new routine: Foreign Currency Translation'
  }
];

export const VERSIONS = ['v1.0', 'v1.1', 'v1.2', 'prod v1.2', 'v2.0', 'v2.1', 'v3.0'];

export const ROUTINE_TYPES = ['Capital', 'Investment', 'Financial Reporting', 'Investments'];
export const FUND_TYPES = ['Equity', 'Fixed Income', 'Multi-Asset', 'Real Estate', 'Private Equity', 'Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'];
export const REGIONS = ['North America', 'EMEA', 'APAC', 'Global'];
export const CAPITAL_STRUCTURES = ['Open-Ended', 'Closed-Ended', 'Transfer Agent', 'N/A'];
export const DATA_TYPES = ['String', 'Integer', 'Decimal', 'Fixed Decimal', 'Date', 'Boolean'];

export const INPUT_LOCATIONS = ['Routine Selection', 'Excel QAB'];
export const TEXTBOX_TYPES = ['Dropdown - Single Select', 'Text Box', 'Non-Editable', 'Date Selection'];

export const PREDEFINED_REPORTS = [
  "Period-End Schedule of Investments",
  "Prior Period-End Schedule of Investments",
  "Purchases and Sales Report",
  "Period-End broker/custodian unsettled transactions",
  "Period-End broker/custodian holdings",
  "NPD Pricing Report",
  "NPD Options Pricing Report",
  "Vendor Bloomberg FX Rates Schedule",
  "NPD Futures Report",
  "NPD Reference Data Report",
  "Cash & Equivalent Accounts",
  "Period-End Trial Balance",
  "Monthly broker/custodian settled transactions",
  "Purchases and Sales MUS Samples",
  "Realized Gain/(Loss) Report",
  "Capital Activity Report",
  "Cash Contributions Sample",
  "Cash Distributions Sample",
  "Bank Statement",
  "Share Class Listing",
  "Transfer Agent Confirmation - Distributions",
  "Transfer Agent Confirmation - Payables & Receivables",
  "Transfer Agent Confirmation - Subscriptions & Redemptions",
  "Transfer Agent Confirmation - Reinvestments",
  "Transfer Agent Confirmation - Share Conversions",
  "Units Report",
  "Capital Transactions Report",
  "Entity's Outstanding Units Report",
  "3rd Party Units Confirmation",
  "Capital Allocation Report",
  "NPD Loans Report",
  "Prior Period Capital Allocation Report",
  "Purchases and Sales Samples",
  "ITD Capital Allocation Report",
  "ITD LP Capital Activity",
  "N/A",
  "CAS Auditor Verification Report",
  "Period-End RE Holdings",
  "Prior Period-End RE Holdings",
  "Additions and Adjustments (Cost)",
  "Loan Position Report",
  "ITD Capital Activity Report",
  "FX Rates Schedule",
  "Creations Sample",
  "Cancellations Sample",
  "Entity's Final Distribution Report",
  "Entity's Interim Distribution Report"
];

export const HELPER_ROUTINES_LIST = [
  "Cash Capital Activity Unmatched",
  "Bank Statement Unmatched",
  "Terms For SS Mapping",
  "Acquisitions and Disp Unmatched",
  "3rd Party Security Names",
  "Corporate Actions",
  "Duplicate Securities Report",
  "Security IDs",
  "Unmatched Holdings",
  "Unmatched 3rd Party Security IDs",
  "Unmatched Admin Security ID",
  "Unmatched Transactions",
  "ASC 820 Data Preparation"
];

// --- MOCK DATA ---

export const MOCK_ROUTINES: Routine[] = [
  {
    id: 'rt_exist_val',
    routine_name: 'Existence and Value Testing',
    routine_display_name: 'Existence and Value Testing',
    version: 'prod v1.2',
    last_edited_date: '2023-11-01T10:00:00Z',
    routine_group: 'Existence & Valuation',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: ['Security IDs', 'Unmatched Holdings'],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_deriv_fv',
    routine_name: 'Derivatives Fair Value Rollforward',
    routine_display_name: 'Derivatives Fair Value Rollforward',
    version: 'prod v1.2',
    last_edited_date: '2023-11-02T11:30:00Z',
    routine_group: 'Fair Value and Cost Rollforward',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_inv_fv',
    routine_name: 'Investment Fair Value and Cost Rollforward',
    routine_display_name: 'Investment Fair Value and Cost Rollforward',
    version: 'prod v1.2',
    last_edited_date: '2023-11-03T09:15:00Z',
    routine_group: 'Fair Value and Cost Rollforward',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_fx_trans',
    routine_name: 'Foreign Currency Translation',
    routine_display_name: 'Foreign Currency Translation',
    version: 'prod v1.2',
    last_edited_date: '2023-11-04T14:00:00Z',
    routine_group: 'Foreign Currency Translation',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_pns_100',
    routine_name: 'Purchases and Sales - 100%',
    routine_display_name: 'Purchases and Sales - 100%',
    version: 'prod v1.2',
    last_edited_date: '2023-11-05T16:45:00Z',
    routine_group: 'Purchase and Sales',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: ['Unmatched Transactions'],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_pns_samp',
    routine_name: 'Purchases and Sales - Sampling',
    routine_display_name: 'Purchases and Sales - Sampling',
    version: 'prod v1.2',
    last_edited_date: '2023-11-06T10:20:00Z',
    routine_group: 'Purchase and Sales',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'No'
  },
  {
    id: 'rt_inv_sec_qty',
    routine_name: 'Investment in Securities, Quantity Rollforward',
    routine_display_name: 'Investment in Securities, Quantity Rollforward',
    version: 'prod v1.2',
    last_edited_date: '2023-11-07T13:10:00Z',
    routine_group: 'Quantity Rollforward',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_real_spec',
    routine_name: 'Realized Testing - Specific ID',
    routine_display_name: 'Realized Testing - Specific ID',
    version: 'prod v1.2',
    last_edited_date: '2023-11-08T15:55:00Z',
    routine_group: 'Realized Gain/(Loss)',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_real_wavg',
    routine_name: 'Realized Testing - Weighted Average',
    routine_display_name: 'Realized Testing - Weighted Average',
    version: 'prod v1.2',
    last_edited_date: '2023-11-09T11:05:00Z',
    routine_group: 'Realized Gain/(Loss)',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  },
  {
    id: 'rt_rgl_prep',
    routine_name: 'RGL Data Preparation',
    routine_display_name: 'RGL Data Preparation',
    version: 'prod v1.2',
    last_edited_date: '2023-11-10T09:30:00Z',
    routine_group: 'Realized Gain/(Loss)',
    routine_type: 'Investments',
    fund_types: ['Hedge Fund', 'Mutual Fund', 'CIT', 'CAS'],
    capital_structure: 'N/A',
    region: ['All'],
    helper_routines: [],
    to_show: 'No',
    display_in_dropdown: 'No'
  }
];

export const MOCK_USER_INPUTS: UserInput[] = [
  {
    id: 'ui_01',
    routine_id: 'rt_exist_val',
    user_input_name: 'Net Assets',
    input_location: 'Excel QAB',
    textbox_type: 'Text Box',
    validations: 'Numerical',
    min_value: '0',
    max_value: '',
    is_mandatory: true
  },
  {
    id: 'ui_02',
    routine_id: 'rt_exist_val',
    user_input_name: 'Management Fee Calculation Frequency',
    input_location: 'Routine Selection',
    textbox_type: 'Dropdown - Single Select',
    validations: 'Dropdown("Monthly", "Quarterly", "Semiannually", "Annually")',
    min_value: '',
    max_value: '',
    is_mandatory: true
  }
];

// --- REPORTS & MAPPINGS for "Existence and Value Testing" (rt_exist_val) ---

export const MOCK_REPORTS: Report[] = [
  { id: 'rep_npd_opt', routine_id: 'rt_exist_val', report_name: 'NPD Options Pricing Report', is_optional: false },
  { id: 'rep_npd_price', routine_id: 'rt_exist_val', report_name: 'NPD Pricing Report', is_optional: false },
  { id: 'rep_per_end', routine_id: 'rt_exist_val', report_name: 'Period-End Schedule of Investments', is_optional: false },
  { id: 'rep_3rd_hold', routine_id: 'rt_exist_val', report_name: 'Period-End broker/custodian holdings', is_optional: false },
  { id: 'rep_3rd_pend', routine_id: 'rt_exist_val', report_name: 'Period-End broker/custodian unsettled transactions', is_optional: false },
  // Placeholder reports for other routines to avoid empty tabs
  { id: 'rep_deriv_1', routine_id: 'rt_deriv_fv', report_name: 'Derivatives Ledger', is_optional: false },
  { id: 'rep_pns_1', routine_id: 'rt_pns_100', report_name: 'Purchases and Sales Report', is_optional: false },
];

export const MOCK_CDM_MAPPINGS: CDMMapping[] = [
  // NPD Options Price Report
  { id: 'cm_01', report_id: 'rep_npd_opt', field_mapping_name: 'CallPutIDC', data_type: 'String', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_02', report_id: 'rep_npd_opt', field_mapping_name: 'ClientMarketValue', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_03', report_id: 'rep_npd_opt', field_mapping_name: 'ClientPrice(local)', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_04', report_id: 'rep_npd_opt', field_mapping_name: 'ClientQuantity', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_05', report_id: 'rep_npd_opt', field_mapping_name: 'ClientSource', data_type: 'String', is_required: true, blanks_allowed: 'Allowed' },
  { id: 'cm_06', report_id: 'rep_npd_opt', field_mapping_name: 'ExpirationDateBloomberg', data_type: 'Date', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_07', report_id: 'rep_npd_opt', field_mapping_name: 'TickerBloomberg', data_type: 'String', is_required: true, blanks_allowed: 'NotAllowed' },

  // NPD Pricing Report
  { id: 'cm_08', report_id: 'rep_npd_price', field_mapping_name: 'ClientFXRate', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_09', report_id: 'rep_npd_price', field_mapping_name: 'ClientMarketValue', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_10', report_id: 'rep_npd_price', field_mapping_name: 'CPDIdentifier', data_type: 'String', is_required: true, blanks_allowed: 'Allowed' },
  { id: 'cm_11', report_id: 'rep_npd_price', field_mapping_name: 'CUSIP', data_type: 'String', is_required: false, blanks_allowed: 'Allowed' },
  { id: 'cm_12', report_id: 'rep_npd_price', field_mapping_name: 'ISIN', data_type: 'String', is_required: false, blanks_allowed: 'Allowed' },
  { id: 'cm_13', report_id: 'rep_npd_price', field_mapping_name: 'NPDHighPrice(local)', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },

  // Period-end Schedule of Investments
  { id: 'cm_14', report_id: 'rep_per_end', field_mapping_name: 'SecurityType', data_type: 'String', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_15', report_id: 'rep_per_end', field_mapping_name: 'SecurityCurrency', data_type: 'String', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_16', report_id: 'rep_per_end', field_mapping_name: 'CUSIP', data_type: 'String', is_required: false, blanks_allowed: 'Allowed' },
  { id: 'cm_17', report_id: 'rep_per_end', field_mapping_name: 'SEDOL', data_type: 'String', is_required: false, blanks_allowed: 'Allowed' },
  { id: 'cm_18', report_id: 'rep_per_end', field_mapping_name: 'ISIN', data_type: 'String', is_required: false, blanks_allowed: 'Allowed' },
  { id: 'cm_19', report_id: 'rep_per_end', field_mapping_name: 'SecurityID', data_type: 'String', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_20', report_id: 'rep_per_end', field_mapping_name: 'Exposure', data_type: 'String', is_required: true, blanks_allowed: 'Allowed' },
  { id: 'cm_21', report_id: 'rep_per_end', field_mapping_name: 'Quantity', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_22', report_id: 'rep_per_end', field_mapping_name: 'NetCost(Base)', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_23', report_id: 'rep_per_end', field_mapping_name: 'MarketValue(Base)', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },

  // 3rd Party Holdings
  { id: 'cm_24', report_id: 'rep_3rd_hold', field_mapping_name: '3RD PARTY NAME', data_type: 'String', is_required: true, blanks_allowed: 'Allowed' },
  { id: 'cm_25', report_id: 'rep_3rd_hold', field_mapping_name: 'ACCOUNT', data_type: 'String', is_required: true, blanks_allowed: 'Allowed' },
  { id: 'cm_26', report_id: 'rep_3rd_hold', field_mapping_name: 'MARKET VALUE', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_27', report_id: 'rep_3rd_hold', field_mapping_name: 'QUANTITY', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_28', report_id: 'rep_3rd_hold', field_mapping_name: 'SECURITY DESCRIPTION', data_type: 'String', is_required: true, blanks_allowed: 'Allowed' },

  // 3rd party Pending Trades
  { id: 'cm_29', report_id: 'rep_3rd_pend', field_mapping_name: 'AMOUNT (BASE)', data_type: 'Fixed Decimal', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_30', report_id: 'rep_3rd_pend', field_mapping_name: 'SETTLE_DATE', data_type: 'Date', is_required: true, blanks_allowed: 'NotAllowed' },
  { id: 'cm_31', report_id: 'rep_3rd_pend', field_mapping_name: 'TRADE_DATE', data_type: 'Date', is_required: true, blanks_allowed: 'NotAllowed' },
];

export const MOCK_ATTRIBUTES: Attribute[] = [
  // Mapping Attributes 1:1 to CDM fields for display purposes
  { id: 'at_01', cdm_mapping_id: 'cm_01', attribute_name: 'Option Type' },
  { id: 'at_02', cdm_mapping_id: 'cm_02', attribute_name: 'Client MV' },
  { id: 'at_03', cdm_mapping_id: 'cm_03', attribute_name: 'Local Price' },
  { id: 'at_04', cdm_mapping_id: 'cm_06', attribute_name: 'Expiry Date' },
  { id: 'at_05', cdm_mapping_id: 'cm_08', attribute_name: 'FX Rate' },
  { id: 'at_06', cdm_mapping_id: 'cm_10', attribute_name: 'CPD ID' },
  { id: 'at_07', cdm_mapping_id: 'cm_14', attribute_name: 'Sec Type' },
  { id: 'at_08', cdm_mapping_id: 'cm_19', attribute_name: 'Security Identifier' },
  { id: 'at_09', cdm_mapping_id: 'cm_23', attribute_name: 'Base MV' },
  { id: 'at_10', cdm_mapping_id: 'cm_24', attribute_name: 'Counterparty Name' },
  { id: 'at_11', cdm_mapping_id: 'cm_30', attribute_name: 'Settlement Date' },
  { id: 'at_12', cdm_mapping_id: 'cm_31', attribute_name: 'Trade Date' },
];

export const MOCK_OUTPUT_SHEETS: OutputSheet[] = [
  { id: 'os_ev_1', routine_id: 'rt_exist_val', sheet_name: 'Validation_Summary', order_index: 1 },
  { id: 'os_ev_2', routine_id: 'rt_exist_val', sheet_name: 'Holdings_Rec', order_index: 2 },
  { id: 'os_ev_3', routine_id: 'rt_exist_val', sheet_name: 'Existence and Value Testing', order_index: 3 },
  { id: 'os_dfv_1', routine_id: 'rt_deriv_fv', sheet_name: 'Deriv_Rollforward', order_index: 4 },
];

export const MOCK_SHEET_DETAILS: SheetDetail[] = [
  { id: 'sd_ev_1', output_sheet_id: 'os_ev_1', field_name: 'Total Assets', fill_color_format: '#FFFFFF', data_format: 'Currency', column_order: 1 },
  { id: 'sd_ev_2', output_sheet_id: 'os_ev_1', field_name: 'Variance', fill_color_format: '#FFCCCC', data_format: 'Percentage', column_order: 2 },
  { id: 'sd_ev_3', output_sheet_id: 'os_ev_2', field_name: 'Security Name', fill_color_format: '#FFFFFF', data_format: 'String', column_order: 1 },

  // Existence and Value Testing RDEs with MOCK Verification Station Data
  {
    id: 'sd_ev_3_1',
    output_sheet_id: 'os_ev_3',
    field_name: 'SECURITY TYPE',
    fill_color_format: '#00338D',
    data_format: 'General',
    column_order: 1,
    // Mock Verification Data
    document_type: 'Broker Statement',
    verification_rde_name: 'Sec Type',
    verification_required_status: 'Required',
    field_description: 'Classification of the security asset.',
    verification_data_type: 'String',
    old_model_name: 'Legacy_Inv_Mod',
    old_model_mapping: 'sec_type_code',
    new_model_name: 'Invest_Alpha_V2',
    table_name: 'tbl_securities',
    new_model_mapping: 'security_type_id'
  },
  {
    id: 'sd_ev_3_2',
    output_sheet_id: 'os_ev_3',
    field_name: 'SECURITY CURRENCY',
    fill_color_format: '#00338D',
    data_format: 'Text',
    column_order: 2,
    document_type: 'Broker Statement',
    verification_rde_name: 'Currency',
    verification_required_status: 'Required',
    field_description: 'ISO Currency Code',
    verification_data_type: 'String',
    old_model_name: 'Legacy_Inv_Mod',
    old_model_mapping: 'curr_iso',
    new_model_name: 'Invest_Alpha_V2',
    table_name: 'tbl_currencies',
    new_model_mapping: 'iso_code'
  },
  { id: 'sd_ev_3_3', output_sheet_id: 'os_ev_3', field_name: 'SECURITY ID', fill_color_format: '#00338D', data_format: 'Text', column_order: 3 },
  { id: 'sd_ev_3_4', output_sheet_id: 'os_ev_3', field_name: 'SECURITY NAME', fill_color_format: '#00338D', data_format: 'General', column_order: 4 },
  { id: 'sd_ev_3_5', output_sheet_id: 'os_ev_3', field_name: 'EXPOSURE', fill_color_format: '#00338D', data_format: 'General', column_order: 5 },
  { id: 'sd_ev_3_6', output_sheet_id: 'os_ev_3', field_name: 'SECURITY TYPE MAPPED', fill_color_format: '#0091DA', data_format: 'General', column_order: 6 },
  { id: 'sd_ev_3_7', output_sheet_id: 'os_ev_3', field_name: 'EXPOSURE MAPPED', fill_color_format: '#0091DA', data_format: 'General', column_order: 7 },
  { id: 'sd_ev_3_8', output_sheet_id: 'os_ev_3', field_name: 'QUANTITY', fill_color_format: '#DE5C1F', data_format: 'Comma Non-Decimal', column_order: 8 },
  { id: 'sd_ev_3_9', output_sheet_id: 'os_ev_3', field_name: 'NET COST (LOCAL)', fill_color_format: '#DE5C1F', data_format: 'Comma Non-Decimal', column_order: 9 },
  { id: 'sd_ev_3_10', output_sheet_id: 'os_ev_3', field_name: 'NET COST (BASE)', fill_color_format: '#DE5C1F', data_format: 'Comma Non-Decimal', column_order: 10 },
  { id: 'sd_ev_3_11', output_sheet_id: 'os_ev_3', field_name: 'MARKET VALUE (LOCAL)', fill_color_format: '#DE5C1F', data_format: 'Comma Non-Decimal', column_order: 11 },
  { id: 'sd_ev_3_12', output_sheet_id: 'os_ev_3', field_name: 'MARKET VALUE (BASE)', fill_color_format: '#DE5C1F', data_format: 'Comma Non-Decimal', column_order: 12 },
  { id: 'sd_ev_3_13', output_sheet_id: 'os_ev_3', field_name: 'CLIENT FX RATE', fill_color_format: '#00338D', data_format: 'Decimals', column_order: 13 },
  { id: 'sd_ev_3_14', output_sheet_id: 'os_ev_3', field_name: 'CLIENT PRICE PER SHARE (LOCAL)', fill_color_format: '#00338D', data_format: 'Decimals', column_order: 14 },
  { id: 'sd_ev_3_15', output_sheet_id: 'os_ev_3', field_name: 'PRICE SUBMITTED TO NPD (LOCAL)', fill_color_format: '#591C62', data_format: 'Decimals', column_order: 15 },
  { id: 'sd_ev_3_16', output_sheet_id: 'os_ev_3', field_name: 'CONTRACT_FACTOR PPS', fill_color_format: '#ACACAC', data_format: 'Decimals', column_order: 16 },
  { id: 'sd_ev_3_17', output_sheet_id: 'os_ev_3', field_name: 'PRICE PER SHARE DIFFERENCE', fill_color_format: '#00338D', data_format: 'Comma Non-Decimal', column_order: 17 },
  { id: 'sd_ev_3_18', output_sheet_id: 'os_ev_3', field_name: 'END QUANTITY PER 3RD PARTY', fill_color_format: '#178684', data_format: 'Comma Non-Decimal', column_order: 18 },
  { id: 'sd_ev_3_19', output_sheet_id: 'os_ev_3', field_name: '3RD PARTY QUANTITY RECONCILIATION', fill_color_format: '#ACACAC', data_format: 'Comma Non-Decimal', column_order: 19 },
  { id: 'sd_ev_3_20', output_sheet_id: 'os_ev_3', field_name: 'END QUANTITY EXCEPTIONS', fill_color_format: '#00338D', data_format: 'Comma Non-Decimal', column_order: 20 },
  { id: 'sd_ev_3_21', output_sheet_id: 'os_ev_3', field_name: 'EXISTENCE VALUE DIFFERENCE', fill_color_format: '#00338D', data_format: 'Comma Non-Decimal', column_order: 21 },
  { id: 'sd_ev_3_22', output_sheet_id: 'os_ev_3', field_name: 'NPD RELIABILITY INDICATOR', fill_color_format: '#591C62', data_format: 'General', column_order: 22 },
  { id: 'sd_ev_3_23', output_sheet_id: 'os_ev_3', field_name: 'NPD RESULT', fill_color_format: '#591C62', data_format: 'General', column_order: 23 },
  { id: 'sd_ev_3_24', output_sheet_id: 'os_ev_3', field_name: 'NPD HIGH PRICE (LOCAL)', fill_color_format: '#591C62', data_format: 'Decimals', column_order: 24 },
  { id: 'sd_ev_3_25', output_sheet_id: 'os_ev_3', field_name: 'NPD LOW PRICE (LOCAL)', fill_color_format: '#591C62', data_format: 'Decimals', column_order: 25 },
  { id: 'sd_ev_3_26', output_sheet_id: 'os_ev_3', field_name: 'CONTRACT_FACTOR NPD', fill_color_format: '#ACACAC', data_format: 'Decimals', column_order: 26 },
  { id: 'sd_ev_3_27', output_sheet_id: 'os_ev_3', field_name: 'MARKET VALUE RECONCILIATION', fill_color_format: '#ACACAC', data_format: 'Comma Non-Decimal', column_order: 27 },
  { id: 'sd_ev_3_28', output_sheet_id: 'os_ev_3', field_name: 'MARKET VALUE DIFFERENCE', fill_color_format: '#00338D', data_format: 'Comma Non-Decimal', column_order: 28 },
];