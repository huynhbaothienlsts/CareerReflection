import assert from "node:assert/strict";
import test from "node:test";
import tasksData from "../app/data/tasks.json";
import rulesData from "../app/data/rules.json";
import { findRule, getStateCode, selectPriorities, summary } from "../app/lib/engine";
import type { Answers, Rule, Task } from "../app/lib/types";

const tasks = tasksData as Task[];
const rules = rulesData as Rule[];
const answer = (execution: "Chưa thực hiện"|"Đã thực hiện một phần"|"Đã thực hiện", confidence: number) => ({ execution, confidence, updatedAt: "test" });

test("ma trận 9 trạng thái xử lý đủ sáu biên bắt buộc và ba mức giữa", () => {
  assert.deepEqual([
    getStateCode(answer("Chưa thực hiện",1)), getStateCode(answer("Chưa thực hiện",5)),
    getStateCode(answer("Đã thực hiện một phần",1)), getStateCode(answer("Đã thực hiện một phần",5)),
    getStateCode(answer("Đã thực hiện",1)), getStateCode(answer("Đã thực hiện",5)),
    getStateCode(answer("Chưa thực hiện",3)), getStateCode(answer("Đã thực hiện một phần",3)), getStateCode(answer("Đã thực hiện",3)),
  ], ["A","C","D","F","G","I","B","E","H"]);
});

test("225 tổ hợp đều ghép đúng mã nhiệm vụ và trạng thái", () => {
  assert.equal(rules.length, 225);
  for (const task of tasks) {
    for (const execution of ["Chưa thực hiện","Đã thực hiện một phần","Đã thực hiện"] as const) {
      for (const confidence of [1,3,5]) {
        const found = findRule(task.id, answer(execution, confidence), rules);
        assert.equal(found?.taskId, task.id);
        assert.equal(found?.taskTitle, task.title);
      }
    }
  }
});

test("thiếu câu trả lời và bỏ qua không bị tự gán trạng thái", () => {
  assert.equal(getStateCode(undefined), null);
  assert.equal(getStateCode({ execution:"Chưa thực hiện", updatedAt:"test" }), null);
  assert.equal(getStateCode({ skipped:true, updatedAt:"test" }), null);
});

test("nhiều nhiệm vụ cần hỗ trợ chỉ hiển thị tối đa ba và đưa nền tảng lên trước", () => {
  const answers: Answers = {
    "2.2": answer("Chưa thực hiện",1), "2.1": answer("Chưa thực hiện",3),
    "3.2": answer("Chưa thực hiện",1), "3.1": answer("Chưa thực hiện",3), "4.5": answer("Chưa thực hiện",1)
  };
  const chosen = selectPriorities(tasks, answers);
  assert.ok(chosen.length <= 3);
  if (chosen.some(t=>t.id==="2.2")) assert.ok(chosen.findIndex(t=>t.id==="2.1") < chosen.findIndex(t=>t.id==="2.2"));
});

test("đổi lựa chọn tạo trạng thái mới, tóm tắt giữ hai thang độc lập", () => {
  const answers: Answers = { "1.1": answer("Chưa thực hiện",1) };
  assert.equal(getStateCode(answers["1.1"]), "A");
  answers["1.1"] = answer("Đã thực hiện",5);
  assert.equal(getStateCode(answers["1.1"]), "I");
  assert.deepEqual(summary(tasks, answers), { done:1, partial:0, notDone:0, answered:1, skipped:0 });
});

test("từ chối câu hỏi bổ sung vẫn nhận quy tắc cơ bản", () => {
  const a = { ...answer("Chưa thực hiện",1), obstacle:"Mình không muốn trả lời." };
  assert.equal(findRule("1.1", a, rules)?.stateCode, "A");
});
