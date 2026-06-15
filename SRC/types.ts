
export type UserRole = 'admin' | 'user' | 'guest';

export interface User {
  id?: number;
  username: string;
  role: UserRole;
}

export interface Routine {
  id: string;
  routine_name: string;
  routine_display_name: string;
  version: string;
  last_edited_date: string;
  routine_group: string;
  routine_type: string;
  fund_types: string[];
  capital_structure: string;
  region: string[];
  helper_routines: string[];
  to_show?: string; // 'Yes' | 'No'
  display_in_dropdown?: string; // 'Yes' | 'No'
  // Additional fields from "FM_-_Routine_Selection.csv" implied by spec
  is_active?: boolean;
  business_owner?: string;
  row_version?: string;
}

export interface Report {
  id: string;
  routine_id: string;
  report_name: string;
  is_optional: boolean;
}

export interface CDMMapping {
  id: string;
  report_id: string;
  field_mapping_name: string;
  data_type: string; // 'String', 'Integer', 'Decimal', 'Date', 'Boolean'
  is_required: boolean;
  blanks_allowed: string; // 'Allowed' | 'NotAllowed'
}

export interface Attribute {
  id: string;
  cdm_mapping_id: string;
  attribute_name: string;
}

export type SheetClassification = 'Main' | 'Helper' | 'Unclassified';

export interface SheetCatalogItem {
  id: string;
  sheet_name: string;
  name_key: string;
  classification: SheetClassification;
  global_order: number;
  row_version?: string;
}

export interface OutputSheet {
  id: string;
  routine_id: string;
  sheet_name: string;
  order_index: number;
  sheet_id?: string;
}

export interface SheetDetail {
  id: string;
  output_sheet_id: string;
  field_name: string;
  fill_color_format: string;
  data_format: string;
  column_order: number;

  // Verification Station / Additional Details
  document_type?: string;
  verification_rde_name?: string;
  verification_required_status?: string; // 'Required' | 'Secondary'
  field_description?: string;
  verification_data_type?: string;
  old_model_name?: string;
  old_model_mapping?: string;
  new_model_name?: string;
  table_name?: string;
  new_model_mapping?: string;
}

export interface UserInput {
  id: string;
  routine_id: string;
  user_input_name: string;
  input_location: string; // e.g., 'Routine Selection', 'Excel QAB'
  textbox_type: string; // e.g., 'Dropdown - Single Select', 'Text Box', 'Non-Editable', 'Date Selection'
  validations: string;
  min_value: string;
  max_value: string;
  is_mandatory: boolean;
}

// Consolidated types for Tabular Views
export interface ReportViewRow extends Report {
  routine_name: string;
}

export interface CDMMappingViewRow extends CDMMapping {
  routine_name: string;
  report_name: string;
}

export interface AttributeViewRow extends Attribute {
  report_name: string;
  cdm_mapping_name: string;
}

export interface UserInputViewRow extends UserInput {
  routine_name: string;
}

export interface SheetCatalogViewRow extends SheetCatalogItem {
  routine_names: string[];
  routines_display: string;
}

export interface RoutineFilters {
  version: string;
  startDate: string;
  endDate: string;
}



export interface AppConfiguration {

  versions: string[];

  routineTypes: string[];

  fundTypes: string[];

  regions: string[];

  capitalStructures: string[];

  dataTypes: string[];

  reportNames: string[];

  helperRoutines: string[];

}



export interface ActivityLog {
  id: number;
  routine_id: string | null;
  routine_name: string;
  changed_by: string;
  change_type: string;
  change_details: string;
  timestamp: string;
}



export type ConfigCategory = keyof AppConfiguration;

export interface DefaultMapping {
  id: string;
  report_name: string;
  field_mapping_name: string;
  data_type: string;
  is_required: boolean;
  blanks_allowed: string;
}
