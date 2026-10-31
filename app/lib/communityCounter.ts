import { useSyncExternalStore } from "react";

const API = "https://script.google.com/macros/s/AKfycbzQ3fPDlsx-VY6QXFaWEcvjirSUwS4Y6tF6q3101GSSQnonbeLSy298I-8TfT1u21jD/exec";

type EventType = "visit" | "complete";
type Counts = { visits: number; completions: number };
type Reply = Counts & { ok: boolean; acknowledged: boolean };

let counts: Counts | null = null;
const listeners = new Set<() => void>();
const confirmed = new Set<string>();
const pending = new Map<string, Promise<void>>();

function publish(data: Counts) {
  counts = { visits: data.visits, completions: data.completions };
  listeners.forEach(listener => listener());
}

export function useCommunityCounts() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    () => counts,
    () => null
  );
}

export function counterToken(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID();
  storage.setItem(key, created);
  return created;
}

// Đọc công khai bằng JSONP; GET không làm tăng bộ đếm.
function readCounter(event?: EventType, token?: string): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const callback = "crcb_" + crypto.randomUUID().replaceAll("-", "");
    const script = document.createElement("script");
    const globals = window as unknown as Record<string, unknown>;

    const cleanup = () => {
      window.clearTimeout(timer);
      script.remove();

      // Giữ hàm rỗng một lúc nếu phản hồi đến sau khi hết thời gian.
      globals[callback] = () => {};
      window.setTimeout(() => { delete globals[callback]; }, 60000);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Đọc bộ đếm quá thời gian"));
    }, 20000);

    globals[callback] = (data: Reply) => {
      cleanup();

      if (
        data?.ok !== true ||
        !Number.isSafeInteger(data.visits) || data.visits < 0 ||
        !Number.isSafeInteger(data.completions) || data.completions < 0
      ) {
        reject(new Error("Dữ liệu bộ đếm không hợp lệ"));
        return;
      }

      resolve(data);
    };

    const url = new URL(API);
    url.searchParams.set("callback", callback);
    url.searchParams.set("_", crypto.randomUUID());

    if (event && token) {
      url.searchParams.set("event", event);
      url.searchParams.set("token", token);
    }

    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("Không kết nối được bộ đếm"));
    };

    document.head.appendChild(script);
  });
}

export async function refreshCommunityCounts() {
  publish(await readCounter());
}

const delay = (ms: number) =>
  new Promise<void>(resolve => window.setTimeout(resolve, ms));

export function reportCommunityEvent(
  event: EventType,
  token: string
): Promise<void> {
  const key = event + ":" + token;

  if (confirmed.has(key)) return Promise.resolve();

  const existing = pending.get(key);
  if (existing) return existing;

  const job = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 20000);

        try {
          // no-cors chỉ dùng để gửi.
          // Không coi fetch thành công là đã ghi nhận.
          await fetch(API, {
            method: "POST",
            mode: "no-cors",
            credentials: "omit",
            body: new URLSearchParams({ event, token }),
            signal: controller.signal
          });
        } finally {
          window.clearTimeout(timer);
        }

        // Đọc lại để xác nhận đúng sự kiện đã được lưu.
        const data = await readCounter(event, token);
        publish(data);

        if (data.acknowledged === true) {
          confirmed.add(key);
          return;
        }
      } catch (error) {
        console.warn("Chưa xác nhận được sự kiện bộ đếm:", error);
      }

      if (attempt < 2) await delay(1000 * (attempt + 1));
    }

    throw new Error("Chưa xác nhận được sự kiện sau 3 lần thử");
  })();

  pending.set(key, job);
  void job.then(
    () => { pending.delete(key); },
    () => { pending.delete(key); }
  );

  return job;
}
