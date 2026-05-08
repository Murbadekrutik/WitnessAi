export type AnalysisSeverity = "DANGER" | "CAUTION" | "SAFE";

export interface AnalysisResult {
  severity: AnalysisSeverity;
  message: string;
  legal_reference?: string;
  /** Optional phrase the user may say aloud to assert their rights calmly. */
  suggested_response?: string;
}