export type AnalysisSeverity = "DANGER" | "CAUTION" | "SAFE";

export interface AnalysisResult {
  severity: AnalysisSeverity;
  message: string;
  legal_reference?: string;
}