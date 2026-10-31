import { useRef, useState } from "react";
import type { Answers, Task } from "../lib/types";

const RESPONSES_API = "https://script.google.com/macros/s/AKfycbwYDdwIkh2hVotIQ2iTgWo8vL9f76JtvOI2avvhMRxv4ZLFT9i9kbqSm8FJalFqFEUl/exec";

function receipt(id: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const cb = "rspcb_" + crypto.randomUUID().replaceAll("-", "");
    const globals = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();
      globals[cb] = () => {};
      window.setTimeout(() => { delete globals[cb]; }, 60000);
    };
    const timer = window.setTimeout(() => {
      cleanup(); reject(new Error("Đọc xác nhận quá thời gian"));
    }, 20000);
    globals[cb] = (data: { ok?: boolean; saved?: boolean }) => {
      cleanup();
      if (data?.ok !== true) reject(new Error("Không đọc được xác nhận"));
      else resolve(data.saved === true);
    };
    script.onerror = () => { cleanup(); reject(new Error("Không kết nối được Google")); };
    const url = new URL(RESPONSES_API);
    url.searchParams.set("callback", cb);
    url.searchParams.set("id", id);
    url.searchParams.set("_", crypto.randomUUID());
    script.src = url.toString();
    document.head.appendChild(script);
  });
}

export default function SaveResponses({ answers, fullName, tasks, ruleVersion }: {
  answers: Answers; fullName: string; tasks: Task[]; ruleVersion: string;
}) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const sending = useRef(false);
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const [savedSignature, setSavedSignature] = useState("");
  const choices = tasks.map(task => {
    const a = answers[task.id];
    return {
      id: String(task.id), execution: a?.execution || "",
      confidence: a?.confidence ?? null, obstacle: a?.obstacle || "",
      skipped: a?.skipped === true
    };
  });
  const signature = JSON.stringify({ fullName: fullName.trim(), ruleVersion, answers: choices });
  const saved = savedSignature === signature;

  async function send() {
    if (!consent || sending.current || saved) return;
    if (!RESPONSES_API.startsWith("https://script.google.com/macros/s/") || !RESPONSES_API.endsWith("/exec")) {
      setMessage("Chưa cấu hình URL Apps Script lưu câu trả lời."); return;
    }
    sending.current = true;
    setBusy(true);
    setMessage("Đang gửi và chờ Google Sheets xác nhận…");
    try {
      if (attempt.current?.signature !== signature) {
        attempt.current = { signature, id: crypto.randomUUID() };
      }
      const id = attempt.current!.id;
      const payload = JSON.stringify({
        id, fullName: fullName.trim(), ruleVersion,
        consent: true, consentVersion: "responses-v1", answers: choices
      });
      for (let n = 0; n < 3; n++) {
        try {
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 20000);
          try {
            await fetch(RESPONSES_API, {
              method: "POST", mode: "no-cors", credentials: "omit",
              body: new URLSearchParams({ payload }), signal: controller.signal
            });
          } finally { window.clearTimeout(timer); }
        } catch { /* Vẫn kiểm tra vì máy chủ có thể đã nhận trước khi mất kết nối. */ }
        try {
          if (await receipt(id)) {
            setSavedSignature(signature);
            setMessage("Đã lưu bản câu trả lời này vào Google Sheets.");
            return;
          }
        } catch { /* Thử lại với cùng mã để tránh ghi trùng. */ }
        if (n < 2) await new Promise(resolve => window.setTimeout(resolve, 1500));
      }
      setMessage("Chưa xác nhận được đã lưu. Hãy giữ trang này và bấm gửi lại khi có mạng.");
    } catch {
      setMessage("Không gửi được dữ liệu. Vui lòng thử lại.");
    } finally { sending.current = false; setBusy(false); }
  }

  return (
    <section className="results-section no-print" aria-label="Gửi dữ liệu thống kê">
      <h2>Gửi câu trả lời để thống kê</h2>
      <p>Khi bạn đồng ý và bấm gửi, họ tên đã nhập và các lựa chọn của 25 nhiệm vụ sẽ được lưu vào Google Sheets do nhóm phụ trách website quản lý, để tổng hợp thống kê. Bạn có thể để trống họ tên. Việc gửi là tự nguyện và không ảnh hưởng đến kết quả.</p>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 16 }}>
        <input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />
        <span>Tôi đồng ý gửi dữ liệu nêu trên cho nhóm phụ trách website.</span>
      </label>
      <button type="button" className="primary" disabled={!consent || busy || saved} onClick={() => { void send(); }}>
        {busy ? "Đang gửi…" : saved ? "Đã lưu bản hiện tại" : "Gửi câu trả lời để thống kê"}
      </button>
      <p role="status" aria-live="polite">{saved ? "Đã lưu bản câu trả lời hiện tại vào Google Sheets." : message.startsWith("Đã lưu") ? "Câu trả lời đã thay đổi. Bạn có thể gửi bản mới." : message}</p>
    </section>
  );
}
