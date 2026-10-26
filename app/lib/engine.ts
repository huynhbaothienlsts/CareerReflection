import type { Answer, Answers, Rule, StateCode, Task } from "./types";

export const RULE_VERSION = "2026-10-26-v1";

export function getStateCode(answer?: Answer): StateCode | null {
  if (!answer?.execution || !answer.confidence) return null;
  const band = answer.confidence <= 2 ? 0 : answer.confidence === 3 ? 1 : 2;
  const row = answer.execution === "Chưa thực hiện" ? 0 : answer.execution === "Đã thực hiện một phần" ? 1 : 2;
  return (["A","B","C","D","E","F","G","H","I"] as StateCode[])[row * 3 + band];
}

export function findRule(taskId: string, answer: Answer | undefined, rules: Rule[]) {
  const state = getStateCode(answer);
  return state ? rules.find((r) => r.taskId === taskId && r.stateCode === state) : undefined;
}

const dependencyIds = (text: string) => [...text.matchAll(/\b[1-5]\.[1-5]\b/g)].map((m) => m[0]);

function needScore(task: Task, answer: Answer, answers: Answers) {
  const state = getStateCode(answer);
  if (!state) return -100;
  let score = ({ A: 50, B: 44, C: 40, D: 48, E: 34, F: 26, G: 38, H: 18, I: 8 } as Record<StateCode, number>)[state];
  if (task.initialPriority.startsWith("Cao")) score += 8;
  else if (task.initialPriority.includes("cao")) score += 5;
  if (answer.obstacle && answer.obstacle !== "Mình chưa xác định được nguyên nhân.") score += 4;
  const unmetDependencies = dependencyIds(task.dependency).filter((id) => answers[id]?.execution !== "Đã thực hiện");
  if (unmetDependencies.length) score -= 12;
  if (answer.completedAction) score -= 30;
  return score;
}

export function selectPriorities(tasks: Task[], answers: Answers) {
  const candidates = tasks.filter((t) => getStateCode(answers[t.id])).sort((a, b) => {
    const diff = needScore(b, answers[b.id], answers) - needScore(a, answers[a.id], answers);
    return diff || Number(a.id.replace(".", "")) - Number(b.id.replace(".", ""));
  });
  const chosen: Task[] = [];
  for (const task of candidates) {
    const foundations = dependencyIds(task.dependency)
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is Task => Boolean(t && answers[t.id] && answers[t.id].execution !== "Đã thực hiện"));
    for (const foundation of foundations) if (!chosen.some((t) => t.id === foundation.id)) chosen.push(foundation);
    if (!chosen.some((t) => t.id === task.id)) chosen.push(task);
    if (chosen.length >= 3) break;
  }
  return chosen.slice(0, 3);
}

export function estimatedTime(state: StateCode) {
  return ["A","B","C","D"].includes(state) ? "Khoảng 15–25 phút cho bước đầu" : "Khoảng 10–20 phút để rà soát và hoàn thiện";
}

export function actionSteps(action: string) {
  return action.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 4);
}

export function summary(tasks: Task[], answers: Answers) {
  const counts = { done: 0, partial: 0, notDone: 0, answered: 0, skipped: 0 };
  tasks.forEach((t) => {
    const a = answers[t.id];
    if (a?.execution && a.confidence) {
      counts.answered++;
      if (a.execution === "Đã thực hiện") counts.done++;
      else if (a.execution === "Đã thực hiện một phần") counts.partial++;
      else counts.notDone++;
    } else if (a?.skipped) counts.skipped++;
  });
  return counts;
}
