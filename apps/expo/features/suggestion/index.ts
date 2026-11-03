export { toDecisionCandidates, toRuleContext } from './decision'
export {
  encodeGeohash,
  normalizeMerchantKey,
  stripDiacritics,
  toMerchantKey,
  toPlaceKey,
} from './keys'
export {
  DEFAULT_OCR_DATE_WINDOW_DAYS,
  DEFAULT_OPTIONAL_THRESHOLDS,
  FIELD_PRIORITY,
  applySuggestion,
  bestSuggestion,
  createDraft,
  finalizeProvenance,
  merge,
  priorityOf,
  thresholdFor,
  userEdit,
} from './merge'
export type { MergeConfig, MergeThresholds, PendingSuggestion, SuggestionDraft } from './merge'
export { ocrLinesFromText, parseReceipt, toOcrCandidates } from './receipt-parser'
export type {
  OcrBox,
  OcrLine,
  OcrResult,
  ReceiptAmountCandidate,
  ReceiptCandidates,
  ReceiptDateCandidate,
  ReceiptMerchantCandidate,
  ReceiptParseOptions,
} from './receipt-parser'
export { DEFAULT_RULE_CURRENCY, compareRules, evaluateRules, ruleMatches } from './rule-evaluator'
export type { RuleContext, RuleEvaluationOptions } from './rule-evaluator'
export { PLACE_KEY_PRECISION } from './keys'
export { SUGGESTION_FIELDS } from './types'
export type {
  CandidateSource,
  DecisionImageConfig,
  FieldOutcome,
  FieldProvenance,
  FieldProvenanceMap,
  ImageTypeKey,
  InferenceChoice,
  InferenceResult,
  InferenceStatus,
  RuleActions,
  RuleConditions,
  RuleOrigin,
  SuggestionCandidate,
  SuggestionChoice,
  SuggestionImageType,
  SuggestionFeatures,
  SuggestionField,
  SuggestionRule,
  SuggestionSnapshot,
  SuggestionSource,
  SuggestionThresholds,
} from './types'
export { parseInferenceResult, parseOcrResult, parseSnapshot, toRequestLocale } from './contract'
export { encodeWithinBudget, longEdgeResize } from './compress-policy'
export { describeSource, machineProvenance } from './source-label'
export {
  MIN_DECISION_BUDGET_MS,
  PLACE_KEY_TIMEOUT_MS,
  SUGGESTION_BUDGET_MS,
  createSessionRegistry,
  createSuggestionSession,
} from './session'
export type {
  BranchStatus,
  CompressedImage,
  DecisionRequest,
  SuggestionBranches,
  SuggestionSavePayload,
  SuggestionSession,
  SuggestionSessionDeps,
  SuggestionSessionInput,
  SuggestionSessionRegistry,
  SuggestionSessionState,
} from './session'
export { createSnapshotStore } from './snapshot-store'
export type { SnapshotFetcher, SnapshotStorage, SnapshotStore } from './snapshot-store'
export { isOcrAvailable } from './ocr'
export { getLocationPermission } from './location'
export type { LocationPermission } from './location'
export {
  SuggestionProvider,
  useRefreshSuggestionSnapshot,
  usePreparePhotoSuggestion,
} from './suggestion-provider'
export { usePhotoSuggestion } from './use-photo-suggestion'
export type { PhotoSuggestion, PhotoSuggestionChip } from './use-photo-suggestion'
