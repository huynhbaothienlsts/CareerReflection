export type Execution = "Chưa thực hiện" | "Đã thực hiện một phần" | "Đã thực hiện";
export type StateCode = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export interface Task {
  id: string; group: string; groupGoal: string; title: string; example?: string;
  foundationAction: string; evidence: string; dependency: string; initialPriority: string;
}

export interface Rule {
  taskId: string; group: string; taskTitle: string; execution: Execution; confidenceBand: string;
  stateCode: StateCode; supportType: string; interpretation: string; action: string;
  completionCriteria: string; reflectionPrompt: string; initialPriority: string;
  dependency: string; followUpPolicy: string; safetyNote: string;
}

export interface Answer {
  execution?: Execution; confidence?: number; skipped?: boolean; obstacle?: string;
  completedAction?: boolean; updatedAt: string;
}

export type Answers = Record<string, Answer>;
