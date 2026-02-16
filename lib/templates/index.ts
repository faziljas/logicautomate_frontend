// ============================================================
// BookFlow — Template System Public API
// lib/templates/index.ts
// ============================================================
// Single import point for all template functionality:
//   import { getTemplateById, validateCustomConfig } from '@/lib/templates'
// ============================================================

// Types
export type {
  IndustryType,
  TemplateConfig,
  BusinessCustomConfig,
  PartialTemplateConfig,
  TemplateTerminology,
  TemplateFeatures,
  BookingRules,
  TemplateBranding,
  CustomField,
  CustomFieldType,
  DefaultService,
  WhatsAppTemplates,
  Template,
  TemplateSummary,
  ApplyTemplateResult,
  ValidationResult,
  ValidationError,
  TemplateListResponse,
  TemplateDetailResponse,
  ApplyTemplateResponse,
} from './types';

// Validator
export {
  validateTemplateConfig,
  validatePartialConfig,
  assertValidTemplateConfig,
} from './validator';

// Utilities
export {
  getTemplateById,
  getAllTemplates,
  mergeCustomConfigWithDefaults,
  validateCustomConfig,
  applyTemplateToBusinessConfig,
  getBusinessConfig,
  getLocalTemplateConfig,
  interpolateWhatsAppTemplate,
} from './utils';
