"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ChartNoAxesCombined, CheckCircle2, ClipboardCheck, Clock3, Compass, Lightbulb, Puzzle, Route, Scale, SearchCheck, ShieldCheck, UserRoundSearch, X } from "lucide-react";
import rawTasks from "../data/tasks.json";
import rawRules from "../data/rules.json";
import { actionSteps, estimatedTime, findRule, getStateCode, RULE_VERSION, selectPriorities, summary } from "../lib/engine";
import type { Answer, Answers, Execution, Rule, Task } from "../lib/types";

const tasks = rawTasks as Task[];
const rules = rawRules as Rule[];
const STORE_KEY = "career-reflection-progress-v1";
const COUNTER_API = "https://career-reflection-counter.thienhb.chatgpt.site/api/counters";
const groups = [...new Set(tasks.map((t) => t.group))];
const executions: Execution[] = ["Đã thực hiện", "Đã thực hiện một phần", "Chưa thực hiện"];
const confidenceLabels = ["Rất không tự tin", "Ít tự tin", "Chưa chắc chắn", "Tự tin", "Rất tự tin"];
const obstacles = [
  "Mình chưa biết bắt đầu từ đâu", "Mình chưa biết tìm thông tin ở đâu",
  "Mình chưa có đủ thời gian hoặc cơ hội", "Mình chưa biết nhiệm vụ này có ích gì với mình",
  "Lý do khác", "Mình chưa xác định được nguyên nhân", "Mình không muốn trả lời"
];
const groupThemes = [
  { title: "Hiểu bản thân và nghề mình chọn", color: "#E9A18D", pale: "#F8E9E3", Icon: UserRoundSearch },
  { title: "Tìm hiểu và kiểm tra thông tin nghề nghiệp", color: "#83B9AD", pale: "#E6F2EF", Icon: SearchCheck },
  { title: "So sánh và cân nhắc các lựa chọn nghề nghiệp", color: "#E8C36A", pale: "#FAF2D9", Icon: Scale },
  { title: "Lên kế hoạch theo đuổi nghề nghiệp", color: "#91A9D8", pale: "#EAF0FA", Icon: Route },
  { title: "Giải quyết khó khăn khi lựa chọn nghề nghiệp", color: "#B9A0D5", pale: "#F1EAF7", Icon: Puzzle },
];

type Screen = "intro" | "guide" | "about" | "assessment" | "results";

export default function CareerReflectionApp() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [fullName, setFullName] = useState("");
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (saved?.version === RULE_VERSION) {
        setAnswers(saved.answers || {}); setFullName(saved.fullName || ""); setIndex(saved.index || 0); setScreen(saved.screen || "intro");
      }
    } catch { /* Dữ liệu lỗi được bỏ qua an toàn. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORE_KEY, JSON.stringify({ version: RULE_VERSION, answers, fullName, index, screen, savedAt: new Date().toISOString() }));
  }, [answers, fullName, index, screen, ready]);

  useEffect(() => {
    const openAbout = () => setScreen("about");
    window.addEventListener("open-about", openAbout);
    return () => window.removeEventListener("open-about", openAbout);
  }, []);

  const stats = useMemo(() => summary(tasks, answers), [answers]);
  const current = tasks[index];
  const currentAnswer = answers[current?.id] || { updatedAt: new Date().toISOString() };
  const isAnswered = Boolean(currentAnswer.execution && currentAnswer.confidence);
  const percent = Math.round(((stats.answered + stats.skipped) / tasks.length) * 100);

  function updateCurrent(patch: Partial<Answer>) {
    setAnswers((previous) => ({ ...previous, [current.id]: { ...previous[current.id], ...patch, skipped: false, updatedAt: new Date().toISOString() } }));
  }

  function skipCurrent() {
    setAnswers((previous) => ({ ...previous, [current.id]: { updatedAt: new Date().toISOString(), skipped: true } }));
    if (index < tasks.length - 1) setIndex(index + 1); else setScreen("results");
  }

  if (!ready) return <main className="loading">Đang mở tiến trình của bạn…</main>;

  if (screen === "about") return <AboutPage onHome={() => setScreen("intro")} onGuide={() => setScreen("guide")} onAssessment={() => setScreen(stats.answered + stats.skipped > 0 ? "assessment" : "guide")} onResults={() => setScreen("results")} />;
  if (screen === "intro") return <Intro onStart={() => setScreen("guide")} onAbout={() => setScreen("about")} hasProgress={stats.answered + stats.skipped > 0} onResume={() => setScreen("assessment")} onResults={() => setScreen("results")} onExploreGroup={(groupIndex) => { setIndex(groupIndex * 5); setScreen("assessment"); }} />;
  if (screen === "guide") return <Guide onBack={() => setScreen("intro")} onAbout={() => setScreen("about")} onContinue={() => setScreen("assessment")} onResults={() => setScreen("results")} />;
  if (screen === "results") return <><Results answers={answers} fullName={fullName} onHome={() => setScreen("intro")} onAbout={() => setScreen("about")} onBack={() => setScreen("assessment")} onJump={(id) => { setIndex(tasks.findIndex((t) => t.id === id)); setScreen("assessment"); }} expanded={expanded} setExpanded={setExpanded} /><CommunityFooter /></>;

  const groupIndex = groups.indexOf(current.group);
  const groupTheme = groupThemes[groupIndex] || groupThemes[0];
  const GroupIcon = groupTheme.Icon;
  return (
    <main className="app-shell">
      <header className="topbar no-print">
        <button className="brand brand-with-icon" onClick={() => setScreen("intro")}><span className="brand-symbol">✦</span><span>Công cụ phản tư</span></button>
        <nav className="app-nav" aria-label="Điều hướng chính">
          <button onClick={() => setScreen("intro")}>Trang chủ</button>
          <button onClick={() => setScreen("about")}>Về chúng tôi</button>
          <button className="active" onClick={() => setScreen("assessment")}>Bộ câu hỏi</button>
          <button onClick={() => setScreen("results")}>Kết quả</button>
        </nav>
        <div className="save-state"><span className="save-dot" /> Đã lưu trên thiết bị này</div>
      </header>
      <section className="assessment-layout">
        <aside className="steps" aria-label="Tiến trình 5 nhóm">
          <p className="eyebrow">Tiến trình của bạn</p>
          <strong>{stats.answered + stats.skipped}/25 nhiệm vụ</strong>
          <div className="progress"><span style={{ width: `${percent}%` }} /></div>
          <ol>{groups.map((g, i) => <li key={g} className={i === groupIndex ? "active" : i < groupIndex ? "complete" : ""}><span>{i < groupIndex ? "✓" : i + 1}</span><button onClick={() => setIndex(tasks.findIndex((t) => t.group === g))}>{g}</button></li>)}</ol>
          <button className="text-button" onClick={() => setScreen("results")}>Xem kết quả hiện tại</button>
        </aside>
        <section className="question-area">
          <div className="mobile-progress no-print"><span>Nhóm {groupIndex + 1}/5</span><strong>{stats.answered + stats.skipped}/25</strong><div className="progress"><span style={{ width: `${percent}%` }} /></div></div>
          <label className="student-name-card"><span>Họ và tên <small>(không bắt buộc)</small></span><input type="text" value={fullName} maxLength={80} autoComplete="name" placeholder="Nhập họ và tên của bạn" onChange={(event) => setFullName(event.target.value)} /><small>Chỉ được lưu trên thiết bị này và dùng để hiển thị trong kết quả, file PDF.</small></label>
          <div className="group-heading group-heading-themed" style={{ "--group-color": groupTheme.color, "--group-pale": groupTheme.pale } as CSSProperties}><div className="group-heading-icon"><GroupIcon aria-hidden="true" /></div><div><p className="eyebrow">Nhóm {groupIndex + 1} · {current.group}</p><h1>{groupTheme.title}</h1><strong>{current.groupGoal}</strong><p>Mỗi lựa chọn chỉ đúng với thời điểm hiện tại, bạn có thể quay lại và thay đổi bất cứ lúc nào.</p></div></div>
          <article className="task-card">
            <div className="task-number">Nhiệm vụ {current.id} · {index + 1}/25</div>
            <h2>{current.title}</h2>
            {current.example && <div className="example"><span>Ví dụ</span><p>{current.example}</p></div>}
            <fieldset><legend>Bạn đã thực hiện nhiệm vụ này chưa?</legend><div className="choice-grid three">{executions.map((value) => <label key={value} className={currentAnswer.execution === value ? "selected" : ""}><input type="radio" name="execution" checked={currentAnswer.execution === value} onChange={() => updateCurrent({ execution: value })}/><span>{value}</span></label>)}</div></fieldset>
            <fieldset><legend>Bạn tin rằng mình có thể thực hiện nhiệm vụ này đến mức nào?</legend><div className="choice-grid five">{confidenceLabels.map((label, i) => <label key={label} className={currentAnswer.confidence === i + 1 ? "selected" : ""}><input type="radio" name="confidence" checked={currentAnswer.confidence === i + 1} onChange={() => updateCurrent({ confidence: i + 1 })}/><b>{i + 1}</b><span>{label}</span></label>)}</div></fieldset>
            {(currentAnswer.execution === "Chưa thực hiện" || (currentAnswer.execution === "Đã thực hiện một phần" && (currentAnswer.confidence || 5) <= 2)) && <details className="obstacle"><summary>Nếu muốn, bạn có thể chia sẻ khó khăn đang gặp</summary><p>Câu trả lời này là tự nguyện và không được dùng để đánh giá nguyên nhân</p><select value={currentAnswer.obstacle || ""} onChange={(e) => updateCurrent({ obstacle: e.target.value })}><option value="">Chọn một phương án (không bắt buộc)</option>{obstacles.map((o) => <option key={o}>{o}</option>)}</select></details>}
            <div className="card-actions"><button className="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Quay lại</button><button className="skip" onClick={skipCurrent}>Bỏ qua lúc này</button><button className="primary" disabled={!isAnswered} onClick={() => index < tasks.length - 1 ? setIndex(index + 1) : setScreen("results")}>{index === tasks.length - 1 ? "Xem kết quả" : "Tiếp theo"}</button></div>
          </article>
        </section>
      </section>
      <CommunityFooter />
    </main>
  );
}

function SiteNav({ active, onHome, onAbout, onGuide, onAssessment, onResults }: { active: "home" | "about" | "guide" | "assessment" | "results"; onHome: () => void; onAbout?: () => void; onGuide: () => void; onAssessment: () => void; onResults: () => void }) {
  return <header className="site-nav no-print">
    <button className="brand brand-with-icon" onClick={onHome}><span className="brand-symbol">✦</span><span>Công cụ phản tư</span></button>
    <nav aria-label="Điều hướng chính">
      <button className={active === "home" ? "active" : ""} onClick={onHome}>Trang chủ</button>
      <button className={active === "about" ? "active" : ""} onClick={onAbout || (() => window.dispatchEvent(new Event("open-about")))}>Về chúng tôi</button>
      <button className={active === "guide" ? "active" : ""} onClick={onGuide}>Hướng dẫn</button>
      <button className={active === "assessment" ? "active" : ""} onClick={onAssessment}>Bộ câu hỏi</button>
      <button className={active === "results" ? "active" : ""} onClick={onResults}>Kết quả</button>
    </nav>
    <span className="nav-badge">Riêng tư · Tự động lưu</span>
  </header>;
}

function CommunityFooter() {
  const [counts, setCounts] = useState({ visits: 0, completions: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = (storage: Storage, key: string) => {
      const existing = storage.getItem(key);
      if (existing) return existing;
      const created = crypto.randomUUID().replaceAll("-", "");
      storage.setItem(key, created);
      return created;
    };
    const report = async (event: "visit" | "complete", eventToken: string) => {
      const response = await fetch(COUNTER_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, token: eventToken }) });
      if (!response.ok) throw new Error("Không thể cập nhật thống kê");
      return response.json() as Promise<{ visits: number; completions: number }>;
    };
    const load = async () => {
      try {
        let latest = await report("visit", token(sessionStorage, "career-reflection-visit-session"));
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
        const completed = tasks.every((task) => saved?.answers?.[task.id]?.execution && saved?.answers?.[task.id]?.confidence);
        if (completed && localStorage.getItem("career-reflection-completion-reported") !== "yes") {
          latest = await report("complete", token(localStorage, "career-reflection-device-token"));
          localStorage.setItem("career-reflection-completion-reported", "yes");
        }
        setCounts(latest); setLoaded(true);
      } catch {
        try { const response = await fetch(COUNTER_API); if (response.ok) setCounts(await response.json()); } catch { /* Footer vẫn hiển thị an toàn khi ngoại tuyến. */ }
        setLoaded(true);
      }
    };
    void load();
  }, []);

  return <footer className="community-footer" aria-label="Thống kê cộng đồng"><div><p className="eyebrow">Cộng đồng đang sử dụng công cụ</p><div className="community-stats"><article><span aria-hidden="true">↗</span><strong>{loaded ? counts.visits.toLocaleString("vi-VN") : "—"}</strong><p>Lượt truy cập website</p></article><article><span aria-hidden="true">✓</span><strong>{loaded ? counts.completions.toLocaleString("vi-VN") : "—"}</strong><p>Người dùng đã hoàn thành</p></article></div><small>Số liệu được cập nhật tự động. Không thu thập câu trả lời hoặc thông tin nhận dạng cá nhân.</small><p className="community-contact">Mọi thắc mắc xin gửi về: <strong>Châu Hồng Thiên An</strong>: <a href="mailto:2107026@lsts.edu.vn">2107026@lsts.edu.vn</a></p></div></footer>;
}

function Intro({ onStart, onAbout, hasProgress, onResume, onResults, onExploreGroup }: { onStart: () => void; onAbout: () => void; hasProgress: boolean; onResume: () => void; onResults: () => void; onExploreGroup: (groupIndex: number) => void }) {
  const benefits = [
    { Icon: UserRoundSearch, title: "Hiểu rõ quá trình của mình", copy: "Đánh giá mức độ thực hiện và mức độ tự tin đối với các nhiệm vụ ra quyết định nghề nghiệp." },
    { Icon: Lightbulb, title: "Biết mình cần làm gì tiếp theo", copy: "Nhận diện nhiệm vụ chưa thực hiện hoặc cần cải thiện và nhận gợi ý hành động cá nhân hóa." },
    { Icon: ChartNoAxesCombined, title: "Từng bước tiến bộ", copy: "Thực hành các gợi ý, theo dõi tiến độ và đánh giá lại để tiếp tục cải thiện." },
  ];
  return <main className="landing"><SiteNav active="home" onHome={() => {}} onAbout={onAbout} onGuide={onStart} onAssessment={hasProgress ? onResume : onStart} onResults={onResults} />
    <section className="hero home-hero"><div className="home-hero-copy"><p className="eyebrow">Công cụ phản tư dành cho học sinh THPT</p><h1>Công cụ phản tư hỗ trợ phát triển năng lực ra quyết định nghề nghiệp</h1><p className="home-slogan">Từ thấu hiểu bản thân đến năng lực ra quyết định nghề nghiệp.</p><p className="lead">Bạn đang tìm hiểu nghề nghiệp phù hợp với mình, hay vẫn chưa chắc chắn về lựa chọn trong tương lai? Công cụ này giúp bạn nhìn lại những gì mình đã làm, nhận diện điều cần cải thiện và khám phá các bước tiếp theo.</p><div className="hero-actions"><button className="primary large" onClick={onStart}>Bắt đầu hành trình</button>{hasProgress && <button className="secondary large" onClick={onResume}>Tiếp tục tiến trình</button>}</div></div>
      <div className="home-benefits"><div className="home-benefits-heading"><p className="eyebrow">Công cụ giúp bạn làm gì?</p></div>{benefits.map(({ Icon, title, copy }, index) => <article key={title}><div className="benefit-icon"><Icon aria-hidden="true" /></div><div><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p></div></article>)}</div>
    </section>
    <section className="home-disclaimer"><ShieldCheck aria-hidden="true" /><p>Đây là công cụ hỗ trợ tự phản tư, không phải bài kiểm tra hay công cụ quyết định nghề nghiệp thay bạn. Hãy bắt đầu từ trải nghiệm hiện tại và đi theo nhịp độ của riêng mình.</p></section>
    <ResearchFoundation onExploreGroup={onExploreGroup} />
  </main>;
}

function ResearchFoundation({ onExploreGroup }: { onExploreGroup: (groupIndex: number) => void }) {
  const [selectedDirection, setSelectedDirection] = useState<number | null>(null);
  const [hoveredDirection, setHoveredDirection] = useState<number | null>(null);
  const concepts = [
    { code: "CDMSE", name: "Niềm tin vào bản thân trong việc đưa ra quyết định nghề nghiệp", description: "Mức độ tự tin vào khả năng của bản thân trong việc tham gia vào các hoạt động và đưa ra những quyết định có ảnh hưởng đến con đường định hướng nghề nghiệp." },
    { code: "PP", name: "Áp lực đồng trang lứa", description: "Sự ảnh hưởng từ nhóm bạn đồng trang lứa nhằm khiến cá nhân hòa nhập hoặc tuân theo chuẩn mực của nhóm." },
    { code: "CM", name: "Mức độ trưởng thành nghề nghiệp", description: "Mức độ sẵn sàng đưa ra quyết định nghề nghiệp phù hợp, thể hiện qua khả năng khám phá nghề nghiệp, hiểu bản thân và ra quyết định." },
  ];
  const foundations = [
    ["Tự đánh giá", "Phân tích bản thân và xem xét các nhận định về bản thân", "Phân tích, kiểm tra giả định"],
    ["Thông tin nghề nghiệp", "Đánh giá độ tin cậy của thông tin nghề nghiệp", "Đánh giá bằng chứng"],
    ["Lựa chọn mục tiêu", "So sánh và cân nhắc các lựa chọn nghề nghiệp", "So sánh, suy luận, xem xét phương án thay thế"],
    ["Lập kế hoạch", "Xem xét tính khả thi và hệ quả của kế hoạch", "Đánh giá tính khả thi và hệ quả"],
    ["Giải quyết vấn đề", "Phân tích vấn đề và đánh giá các phương án giải quyết", "Nhận diện giả định, đánh giá và suy luận"],
  ];
  const directions = [
    { short: "Hiểu bản thân", title: "Hiểu bản thân và nghề mình chọn", goal: "Giúp học sinh nhận ra điểm mạnh, sở thích và những điều mình coi trọng; hiểu những yếu tố ảnh hưởng đến cách nhìn nhận bản thân và lựa chọn nghề nghiệp.", color: "#E9A18D", pale: "#F8E9E3", Icon: UserRoundSearch, path: "M 193.512,105.105 A 360 360 0 0 1 606.488,105.105 L 476.286,291.053 A 133 133 0 0 0 323.714,291.053 Z", label: { x: 300, y: 105, w: 200, h: 140 } },
    { short: "Kiểm tra thông tin", title: "Tìm hiểu và kiểm tra thông tin nghề nghiệp", goal: "Giúp học sinh tìm kiếm thông tin về ngành nghề, phân biệt thông tin đáng tin cậy với ý kiến chủ quan và nhận ra những điều mình cần tìm hiểu thêm trước khi lựa chọn.", color: "#83B9AD", pale: "#E6F2EF", Icon: SearchCheck, path: "M 616.653,112.491 A 360 360 0 0 1 744.270,505.254 L 527.189,438.885 A 133 133 0 0 0 480.041,293.781 Z", label: { x: 550, y: 270, w: 190, h: 150 } },
    { short: "Cân nhắc lựa chọn", title: "So sánh và cân nhắc các lựa chọn nghề nghiệp", goal: "Giúp học sinh mở rộng các lựa chọn, so sánh ưu nhược điểm và hiểu rõ vì sao mình ưu tiên một nghề hơn những nghề khác.", color: "#E8C36A", pale: "#FAF2D9", Icon: Scale, path: "M 740.387,517.205 A 360 360 0 0 1 406.283,759.945 L 402.321,532.980 A 133 133 0 0 0 525.754,443.301 Z", label: { x: 455, y: 535, w: 210, h: 150 } },
    { short: "Lên kế hoạch", title: "Lên kế hoạch theo đuổi nghề nghiệp", goal: "Giúp học sinh xác định những việc cần làm, chuẩn bị nguồn lực cần thiết và dự đoán khó khăn để xây dựng kế hoạch phù hợp với điều kiện hiện tại.", color: "#91A9D8", pale: "#EAF0FA", Icon: Route, path: "M 393.717,759.945 A 360 360 0 0 1 59.613,517.205 L 274.246,443.301 A 133 133 0 0 0 397.679,532.980 Z", label: { x: 135, y: 550, w: 210, h: 130 } },
    { short: "Giải quyết khó khăn", title: "Giải quyết khó khăn khi lựa chọn nghề nghiệp", goal: "Giúp học sinh nhận diện những băn khoăn và suy nghĩ đang cản trở mình, kiểm tra chúng bằng thông tin và bằng chứng, từ đó tìm cách điều chỉnh lựa chọn hoặc tìm kiếm sự hỗ trợ phù hợp.", color: "#B9A0D5", pale: "#F1EAF7", Icon: Puzzle, path: "M 55.730,505.254 A 360 360 0 0 1 183.347,112.491 L 319.959,293.781 A 133 133 0 0 0 272.811,438.885 Z", label: { x: 60, y: 270, w: 190, h: 150 } },
  ];
  const visibleDirection = hoveredDirection ?? selectedDirection;
  return <><section className="journey-home-section" aria-labelledby="journey-home-title">
    <article className="direction-panel">
      <div className="direction-heading"><div><p className="eyebrow">5 mảnh ghép tạo nên hành trình nghề nghiệp</p><h3 id="journey-home-title">Hướng đi của công cụ</h3><p>Di chuột hoặc chọn một mảnh ghép để khám phá mục tiêu của từng nhóm nhiệm vụ.</p></div></div>
      <div className="journey-layout">
        <div className="journey-model-wrap">
          <svg className="journey-model" viewBox="0 0 800 800" role="group" aria-label="Năm nhóm nhiệm vụ tạo nên hành trình nghề nghiệp của bạn">
            {directions.map((item, index) => {
              const Icon = item.Icon;
              return <g key={item.title} className={`journey-sector${selectedDirection === index ? " is-selected" : ""}`} role="button" tabIndex={0} aria-label={`Nhóm ${index + 1}: ${item.title}`} aria-pressed={selectedDirection === index} onMouseEnter={() => setHoveredDirection(index)} onMouseLeave={() => setHoveredDirection(null)} onFocus={() => setHoveredDirection(index)} onBlur={() => setHoveredDirection(null)} onClick={() => setSelectedDirection((current) => current === index ? null : index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedDirection((current) => current === index ? null : index); } if (event.key === "Escape") { setSelectedDirection(null); setHoveredDirection(null); } }}>
                <path d={item.path} fill={item.pale} style={{ fill: item.pale }} stroke={item.color} strokeWidth="5" />
                <foreignObject x={item.label.x} y={item.label.y} width={item.label.w} height={item.label.h} pointerEvents="none">
                  <div className="journey-label" style={{ color: item.color }}><Icon aria-hidden="true" /><b>Nhóm {index + 1}</b><span>{item.short}</span></div>
                </foreignObject>
              </g>;
            })}
            <circle className="journey-center-circle" cx="400" cy="400" r="122" />
            <foreignObject x="278" y="278" width="244" height="244" pointerEvents="none"><div className="journey-center-content"><strong>Hành trình</strong><span>nghề nghiệp<br />của bạn</span></div></foreignObject>
          </svg>
          <p className="journey-hint">Mỗi mảnh ghép là một năng lực cần thiết — bạn có thể bắt đầu từ bất kỳ nhóm nào.</p>
        </div>
        {visibleDirection === null ? <aside className="journey-popover is-placeholder"><Puzzle aria-hidden="true" /><h4>Chọn một mảnh ghép</h4><p>Thông tin về mục tiêu của nhóm sẽ xuất hiện tại đây. Trên điện thoại, hãy chạm vào mảnh ghép bạn muốn xem.</p></aside> : (() => {
          const item = directions[visibleDirection];
          const Icon = item.Icon;
          return <aside className={`journey-popover group-tone-${visibleDirection + 1}`} aria-live="polite"><button className="journey-close" aria-label="Đóng thông tin nhóm" onClick={() => { setSelectedDirection(null); setHoveredDirection(null); }}><X aria-hidden="true" /></button><div className="journey-popover-icon"><Icon aria-hidden="true" /></div><span>Nhóm {visibleDirection + 1}</span><h4>{item.title}</h4><p><strong>Mục tiêu:</strong> {item.goal}</p><button className="primary journey-explore" onClick={() => onExploreGroup(visibleDirection)}>Khám phá nhóm</button></aside>;
        })()}
      </div>
    </article>
  </section><section className="research-section" aria-labelledby="research-title">
    <div className="research-heading">
      <p className="eyebrow">Nền tảng khoa học</p>
      <h2 id="research-title">Công cụ phản tư hỗ trợ phát triển năng lực ra quyết định nghề nghiệp</h2>
    </div>
    <article className="goal-panel">
      <div className="section-number">01</div>
      <div><h3>Mục tiêu</h3><p>Giúp học sinh phản tư về quá trình ra quyết định nghề nghiệp, đánh giá mức độ thực hiện và sự tự tin đối với từng nhiệm vụ, từ đó nhận diện những nhiệm vụ chưa thực hiện và nhận gợi ý hành động phù hợp.</p><p>Đề xuất hành động phù hợp để nâng cao CDMSE, giảm tác động của PP. Từ đó củng cố khả năng ra quyết định nghề nghiệp độc lập và góp phần phát triển CM.</p></div>
    </article>
    <div className="concept-grid">{concepts.map((concept) => <article key={concept.code} className="concept-card"><span>{concept.code}</span><h3>{concept.name}</h3><p>{concept.description}</p></article>)}</div>
    <article className="foundation-panel">
      <div className="foundation-intro"><div className="section-number">02</div><div><h3>Cơ sở xây dựng</h3></div></div>
      <div className="evidence-grid">
        <article><span>Thực tiễn</span><p>Hall và cộng sự (2011) đề xuất kết hợp giải quyết vấn đề với tư duy phản biện để hỗ trợ học sinh ứng phó với áp lực đồng trang lứa (PP) [1].</p></article>
        <article><span>Nghiên cứu</span><p>Kim và Hwang (2016) ghi nhận mối tương quan thuận giữa khuynh hướng tư duy phản biện và niềm tin vào khả năng ra quyết định nghề nghiệp (CDMSE) ở sinh viên điều dưỡng (r = 0,519; p &lt; 0,001) [2].</p></article>
        <article><span>Lý thuyết</span><p>Dựa trên sự tương đồng giữa năm nhóm nhiệm vụ CDMSE của Taylor và Betz (1983) [3] và các kỹ năng tư duy phản biện của Facione (1990) [4], nghiên cứu xây dựng công cụ phản tư nhằm hỗ trợ học sinh tự đánh giá quá trình lựa chọn nghề nghiệp.</p></article>
      </div>
      <div className="foundation-table-wrap"><table className="foundation-table"><thead><tr><th>Các nhóm nhiệm vụ CDMSE</th><th>Mối liên hệ</th><th>Kỹ năng tư duy phản biện</th></tr></thead><tbody>{foundations.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>
      <div className="references"><h4>Tài liệu tham khảo</h4><ol><li>K. R. Hall, J. L. Rushing, and A. Khurshid, “Using the Solving Problems Together psychoeducational group counseling model as an intervention for negative peer pressure,” <em>Journal for Specialists in Group Work</em>, vol. 36, no. 2, pp. 97–110, Jun. 2011, doi: 10.1080/01933922.2011.562344.</li><li>K.-H. Kim and E.-H. Hwang, “Influence of Ego-Resilience, Critical Thinking Disposition, and Self Leadership on Career Decision-Making Self-Efficacy in Nursing Students,” <em>Journal of the Korea Academia-Industrial cooperation Society</em>, vol. 17, no. 2, pp. 436–445, Feb. 2016, doi: 10.5762/kais.2016.17.2.436.</li><li>K. M. Taylor and N. E. Betz, “Applications of Self-Efficacy Theory to the Understanding and Treatment of Career Indecision,” 1983.</li><li>P. A. Facione, “‘The Delphi Report’ Critical Thinking: A Statement of Expert Consensus for Purposes of Educational Assessment and Instruction.” [Online]. Available: <a href="http://www.insightassessment.com" target="_blank" rel="noreferrer">www.insightassessment.com</a>.</li></ol></div>
    </article>
  </section><CommunityFooter /></>;
}

function AboutPage({ onHome, onGuide, onAssessment, onResults }: { onHome: () => void; onGuide: () => void; onAssessment: () => void; onResults: () => void }) {
  const process = [
    ["01", "Nghiên cứu khoa học", "Tìm hiểu mối liên hệ giữa áp lực đồng trang lứa và mức độ trưởng thành nghề nghiệp."],
    ["02", "Phản tư cá nhân", "Học sinh nhìn lại quá trình lựa chọn nghề nghiệp của mình."],
    ["03", "Tự đánh giá", "Đánh giá mức độ thực hiện và sự tự tin đối với từng nhiệm vụ ra quyết định nghề nghiệp."],
    ["04", "Gợi ý hành động", "Xác định những nội dung cần cải thiện và các bước tiếp theo."],
  ];
  const authors = [
    ["Châu Hồng Thiên An", "Tác giả nghiên cứu và người phát triển công cụ phản tư."],
    ["Nguyễn Gia Như Ý", "Tác giả nghiên cứu và người phát triển công cụ phản tư."],
  ];
  return <main className="about-page">
    <SiteNav active="about" onHome={onHome} onAbout={() => {}} onGuide={onGuide} onAssessment={onAssessment} onResults={onResults} />
    <section className="about-hero">
      <div className="about-hero-copy"><p className="eyebrow">Về chúng tôi</p><h1>Your future is yours to discover.</h1><p>Chúng tôi tin rằng mỗi học sinh đều có khả năng chủ động định hình tương lai của mình. Điều các bạn cần không phải lúc nào cũng là một câu trả lời có sẵn, mà đôi khi là cơ hội để hiểu bản thân rõ hơn và tự tin hơn trong những lựa chọn của mình.</p><p>Công cụ phản tư được phát triển nhằm hỗ trợ học sinh nhìn lại quá trình lựa chọn nghề nghiệp, nhận diện những nhiệm vụ cần cải thiện và xác định các bước hành động phù hợp.</p><div className="about-keywords" aria-label="Thấu hiểu bản thân, Chủ động lựa chọn, Từng bước trưởng thành"><span>Thấu hiểu bản thân</span><span>Chủ động lựa chọn</span><span>Từng bước trưởng thành</span></div><button className="text-button about-scroll" onClick={() => document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth" })}>Khám phá câu chuyện ↓</button></div>
      <div className="about-hero-art" aria-hidden="true"><div className="journey-orbit orbit-one"/><div className="journey-orbit orbit-two"/><div className="journey-path"/><span className="journey-point point-one">Bạn</span><span className="journey-point point-two">Khám phá</span><span className="journey-point point-three">Lựa chọn</span><div className="journey-sun">Tương lai</div></div>
    </section>
    <section className="about-section story-section" id="our-story"><div className="about-kicker"><span>01</span><p>Câu chuyện của chúng tôi</p></div><div className="story-grid"><div><h2>Một lựa chọn nghề nghiệp nên bắt đầu từ đâu?</h2><p>Trong những năm cuối cấp, học sinh phải đối diện với nhiều câu hỏi về tương lai: Mình phù hợp với nghề gì? Mình thực sự yêu thích điều gì? Liệu lựa chọn của mình có đang bị ảnh hưởng từ những người xung quanh?</p><p>Áp lực đồng trang lứa có thể khiến quá trình lựa chọn nghề nghiệp trở nên phức tạp hơn, đặc biệt khi học sinh chưa thực sự tự tin vào khả năng của bản thân trong việc đưa ra quyết định.</p><p>Từ những trăn trở đó, một nghiên cứu khoa học được thực hiện nhằm tìm hiểu mối liên hệ giữa áp lực đồng lứa và mức độ trưởng thành nghề nghiệp của học sinh THPT tại TP.HCM.</p><p>Nhưng việc tìm hiểu vấn đề mới chỉ là bước khởi đầu. Chúng tôi tiếp tục đặt ra câu hỏi: Làm thế nào để những phát hiện từ nghiên cứu có thể trở thành một công cụ thiết thực, giúp học sinh nhìn lại bản thân và chủ động hơn trong quá trình lựa chọn nghề nghiệp?</p><p>Đó là động lực để công cụ phản tư được hình thành.</p></div><blockquote>“Bạn không cần phải có sẵn mọi câu trả lời. Bạn có thể bắt đầu bằng việc hiểu bản thân rõ hơn.”</blockquote></div></section>
    <section className="about-section science-section"><div className="about-kicker"><span>02</span><p>Nền tảng khoa học</p></div><div className="science-intro"><h2>Từ nghiên cứu đến ứng dụng thực tế.</h2><div><p>Công cụ được phát triển từ nghiên cứu khoa học về ảnh hưởng của áp lực đồng lứa đến mức độ trưởng thành nghề nghiệp của học sinh THPT tại TP.HCM.</p><p>Kết quả nghiên cứu cho thấy sự tự tin vào khả năng thực hiện các nhiệm vụ ra quyết định nghề nghiệp đóng vai trò trung gian trong mối liên hệ giữa áp lực đồng lứa và mức độ trưởng thành nghề nghiệp trong mô hình nghiên cứu.</p><p>Phát hiện này gợi mở hướng phát triển công cụ theo hướng hỗ trợ học sinh nhìn lại quá trình lựa chọn nghề nghiệp, tự đánh giá mức độ tự tin và xác định những nội dung cần cải thiện.</p></div></div><div className="research-process">{process.map((step, index) => <article key={step[0]}><span>{step[0]}</span><h3>{step[1]}</h3><p>{step[2]}</p>{index < process.length - 1 && <i aria-hidden="true">→</i>}</article>)}</div><small className="science-note">Sơ đồ thể hiện quá trình chuyển hóa định hướng nghiên cứu thành cấu trúc công cụ, không phải bằng chứng kiểm định hiệu quả của công cụ.</small></section>
    <section className="about-section team-section"><div className="about-kicker"><span>03</span><p>Nhóm tác giả</p></div><h2>Đằng sau công cụ phản tư.</h2><p className="team-intro">Công cụ phản tư được hình thành từ mong muốn tìm hiểu những khó khăn mà học sinh gặp phải trong quá trình lựa chọn nghề nghiệp và tìm kiếm những cách thức hỗ trợ thiết thực hơn.</p><div className="author-grid">{authors.map((author, index) => <article key={author[0]}><div className="portrait-placeholder" aria-label="Vị trí ảnh chân dung sẽ được bổ sung sau"><span>{String(index + 1).padStart(2, "0")}</span><p>Ảnh chân dung<br />sẽ được bổ sung</p></div><div><h3>{author[0]}</h3><p>{author[1]}</p></div></article>)}</div><div className="team-message"><p>Chúng mình hy vọng công cụ phản tư này có thể giúp các bạn học sinh hiểu bản thân rõ hơn, tự tin cân nhắc những lựa chọn và từng bước tìm ra hướng đi phù hợp với chính mình.</p><p>Chúng mình tin rằng mỗi người đều có một hành trình riêng. Thay vì đưa ra câu trả lời thay các bạn, chúng mình mong công cụ này có thể giúp các bạn có thêm cơ sở để tự đưa ra những quyết định có ý nghĩa với tương lai của mình.</p></div></section>
    <section className="about-cta"><p className="eyebrow">Bắt đầu từ chính bạn</p><h2>Bạn không cần phải có tất cả câu trả lời ngay hôm nay.</h2><p>Hãy bắt đầu bằng việc nhìn lại những gì bạn đã làm, những điều bạn còn băn khoăn và những khả năng bạn muốn phát triển.</p><button className="primary large" onClick={onGuide}>Bắt đầu hành trình phản tư →</button></section>
    <CommunityFooter />
  </main>;
}

function Guide({ onBack, onAbout, onContinue, onResults }: { onBack: () => void; onAbout: () => void; onContinue: () => void; onResults: () => void }) {
  const executionLevels = [
    ["Đã thực hiện", "Bạn đã hoàn thành những nội dung chính được yêu cầu."],
    ["Đã thực hiện một phần", "Bạn đã bắt đầu hoặc hoàn thành một số nội dung, nhưng vẫn còn phần quan trọng chưa hoàn thành."],
    ["Chưa thực hiện", "Bạn chưa bắt đầu và chưa có hành động cụ thể nào cho nhiệm vụ này."],
  ];
  const confidenceLevels = [
    ["1", "Rất không tự tin", "Bạn gần như chưa tin tưởng vào khả năng thực hiện nhiệm vụ của mình."],
    ["2", "Ít tự tin", "Bạn nghiêng về việc cho rằng mình chưa đủ khả năng, dù có thể biết cách bắt đầu."],
    ["3", "Chưa chắc chắn", "Bạn còn phân vân và chưa nghiêng rõ về khả năng làm được hay chưa làm được."],
    ["4", "Tự tin", "Bạn tin mình có thể thực hiện, dù có thể vẫn cần thêm thời gian hoặc hỗ trợ."],
    ["5", "Rất tự tin", "Bạn tin tưởng rõ ràng vào khả năng tự thực hiện nhiệm vụ của mình."],
  ];
  const journey = [
    { Icon: ClipboardCheck, title: "Tự đánh giá", copy: "Trả lời 25 câu hỏi về mức độ thực hiện và mức độ tự tin đối với từng nhiệm vụ ra quyết định nghề nghiệp." },
    { Icon: Lightbulb, title: "Xác định nhiệm vụ cần thực hiện", copy: "Xem kết quả tổng quát, nhận biết nhiệm vụ chưa hoàn thành hoặc mới hoàn thành một phần và nhận gợi ý hành động cá nhân hóa." },
    { Icon: ChartNoAxesCombined, title: "Thực hành và đánh giá lại", copy: "Thực hiện gợi ý, theo dõi tiến độ, so sánh với tiêu chí thành công và tiếp tục cải thiện." },
  ];
  const notes = [
    { Icon: CheckCircle2, title: "Không có đáp án đúng hay sai", copy: "Hãy trả lời trung thực theo trải nghiệm và cảm nhận hiện tại của bạn." },
    { Icon: Compass, title: "Không cần biết trước nghề mình muốn làm", copy: "Công cụ vẫn hữu ích khi bạn đang khám phá hoặc chưa có lựa chọn cụ thể." },
    { Icon: ShieldCheck, title: "Đây là công cụ phản tư, không phải bài kiểm tra", copy: "Kết quả hỗ trợ bạn nhận diện nội dung cần tìm hiểu hoặc cải thiện thêm, không kết luận cố định về năng lực của bạn." },
    { Icon: Clock3, title: "Đi theo nhịp độ của riêng bạn", copy: "Bạn có thể làm theo tốc độ phù hợp. Nên hoàn thành toàn bộ trong vòng một tuần để duy trì sự liền mạch, nhưng không cần hoàn thành ngay lập tức." },
  ];
  return <main className="guide-page guide-expanded"><SiteNav active="guide" onHome={onBack} onAbout={onAbout} onGuide={() => {}} onAssessment={onContinue} onResults={onResults} />
    <header className="guide-hero"><p className="eyebrow">Hướng dẫn sử dụng</p><h1>Hiểu rõ từng lựa chọn trước khi bắt đầu.</h1><p>25 nhiệm vụ giúp bạn nhìn lại quá trình tìm hiểu và lựa chọn nghề nghiệp. Với mỗi nhiệm vụ, hãy trả lời hai câu hỏi dựa trên trải nghiệm và cảm nhận hiện tại của bạn.</p></header>
    <section className="guide-section answer-guide"><div className="guide-section-heading"><span>01</span><div><p className="eyebrow">Hướng dẫn trả lời câu hỏi</p><h2>Làm thế nào để trả lời?</h2></div></div><div className="answer-card-grid">
      <article className="answer-explainer"><div className="answer-card-head"><span>Câu hỏi 1</span><h3>Mức độ thực hiện</h3><p>Bạn đã thực hiện nhiệm vụ này chưa?</p></div><div className="execution-levels">{executionLevels.map((level, index) => <div key={level[0]}><span>{index + 1}</span><p><strong>{level[0]}</strong>{level[1]}</p></div>)}</div><details className="guide-example"><summary>Xem ví dụ: tìm hiểu thông tin nghề nghiệp</summary><div><p><strong>Đã thực hiện:</strong> Đã tìm hiểu các ngành nghề và thu thập đủ thông tin cần thiết theo yêu cầu.</p><p><strong>Đã thực hiện một phần:</strong> Mới tìm hiểu một vài ngành nghề nhưng chưa có đủ thông tin cần thiết.</p><p><strong>Chưa thực hiện:</strong> Chưa bắt đầu tìm hiểu ngành nghề nào.</p></div></details><aside className="guide-boundary"><strong>Ranh giới cần nhớ</strong><p>Đã thử một lần chưa có nghĩa là đã hoàn thành. Hãy căn cứ vào nội dung cụ thể và mức độ hoàn thành các yêu cầu chính của nhiệm vụ.</p></aside></article>
      <article className="answer-explainer"><div className="answer-card-head"><span>Câu hỏi 2</span><h3>Mức độ tự tin</h3><p>Bạn tự tin đến mức nào về khả năng thực hiện nhiệm vụ này?</p></div><div className="confidence-levels">{confidenceLevels.map((level) => <div key={level[0]}><b>{level[0]}</b><p><strong>{level[1]}</strong>{level[2]}</p></div>)}</div><div className="confidence-compare"><div><strong>Ít tự tin</strong><p>Bạn nghiêng về việc mình chưa đủ khả năng.</p></div><div><strong>Chưa chắc chắn</strong><p>Bạn còn phân vân, chưa nghiêng rõ về phía nào.</p></div></div><aside className="guide-boundary"><strong>Hai khía cạnh khác nhau</strong><p>Bạn có thể chưa từng lập kế hoạch nghề nghiệp nhưng vẫn rất tự tin rằng mình có thể học cách lập kế hoạch. Mức độ thực hiện không quyết định mức độ tự tin.</p></aside></article>
    </div></section>
    <section className="guide-section journey-guide"><div className="guide-section-heading"><span>02</span><div><p className="eyebrow">Quy trình sử dụng</p><h2>Hành trình của bạn với công cụ</h2></div></div><div className="guide-journey">{journey.map(({ Icon, title, copy }, index) => <article key={title}><div className="guide-journey-icon"><Icon aria-hidden="true" /></div><span>Giai đoạn {index + 1}</span><h3>{title}</h3><p>{copy}</p>{index < journey.length - 1 && <i aria-hidden="true">→</i>}</article>)}</div></section>
    <section className="guide-section notes-guide"><div className="guide-section-heading"><span>03</span><div><p className="eyebrow">Lưu ý khi sử dụng</p><h2>Một vài điều dành cho bạn</h2></div></div><div className="guide-note-grid">{notes.map(({ Icon, title, copy }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div><blockquote>“Bạn không cần có tất cả câu trả lời ngay hôm nay. Hãy bắt đầu từ những gì bạn biết về bản thân và từng bước khám phá điều mình còn muốn tìm hiểu.”</blockquote><div className="guide-start"><button className="secondary" onClick={onBack}>Quay lại trang chủ</button><button className="primary large" onClick={onContinue}>Tôi đã hiểu · Bắt đầu</button></div></section>
    <CommunityFooter />
  </main>;
}

function Results({ answers, fullName, onHome, onAbout, onBack, onJump, expanded, setExpanded }: { answers: Answers; fullName: string; onHome: () => void; onAbout: () => void; onBack: () => void; onJump: (id:string)=>void; expanded: string|null; setExpanded:(id:string|null)=>void }) {
  const stats = summary(tasks, answers); const priorities = selectPriorities(tasks, answers); const preliminary = stats.answered < 25;
  const byGroup = groups.map((name, index) => { const groupTasks = tasks.filter((task) => task.group === name); const answeredTasks = groupTasks.filter((task) => answers[task.id]?.execution && answers[task.id]?.confidence); const confidence = answeredTasks.length ? answeredTasks.reduce((total, task) => total + (answers[task.id].confidence || 0), 0) / answeredTasks.length : null; return { name, index, tasks: groupTasks, answered: answeredTasks.length, confidence }; });
  const summaryText = stats.answered === 0 ? "Bạn chưa cung cấp đủ dữ liệu để hệ thống tạo nhận định cá nhân hóa. Hãy trả lời những nhiệm vụ phù hợp với trải nghiệm hiện tại của bạn." : `Bạn đã phản hồi ${stats.answered}/25 nhiệm vụ: ${stats.done} nhiệm vụ đã thực hiện, ${stats.partial} nhiệm vụ thực hiện một phần và ${stats.notDone} nhiệm vụ chưa thực hiện. Các gợi ý bên dưới chỉ dựa trên những câu trả lời này.`;
  const exportPdf = async () => { const element = document.getElementById("results-content"); if (!element) return; const html2pdf = (await import("html2pdf.js")).default; const nameSlug = fullName.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, ""); const options = { margin:10, filename:nameSlug?`ket-qua-huong-nghiep-${nameSlug}.pdf`:"ket-qua-huong-nghiep.pdf", image:{type:"jpeg" as const,quality:.98}, html2canvas:{scale:2,backgroundColor:"#ffffff"}, jsPDF:{unit:"mm" as const,format:"a4" as const,orientation:"portrait" as const} }; await html2pdf().set(options).from(element).save(); };
  return <main className="results-page results-redesign" id="results-content">
    <SiteNav active="results" onHome={onHome} onAbout={onAbout} onGuide={onBack} onAssessment={onBack} onResults={() => {}} />
    <section className="results-hero"><div><p className="eyebrow">Kết quả phản tư của bạn</p><h1>Kết quả phản tư của bạn</h1>{fullName.trim()&&<p className="result-student-name">Dành cho <strong>{fullName.trim()}</strong></p>}<p className="results-intro">Trang này giúp bạn nhìn lại những gì đã thực hiện và chọn một bước tiếp theo phù hợp. Đây không phải điểm số hay đánh giá năng lực nghề nghiệp.</p></div><div className="response-count"><strong>{stats.answered}<span>/25</span></strong><p>Nhiệm vụ đã phản hồi</p></div></section>
    <section className="reflection-summary"><div className="status-summary"><article><span>Đã thực hiện</span><strong>{stats.done}</strong></article><article><span>Thực hiện một phần</span><strong>{stats.partial}</strong></article><article><span>Chưa thực hiện</span><strong>{stats.notDone}</strong></article></div><div className={`personal-summary${preliminary?" is-preliminary":""}`}><span>{preliminary?"Kết quả sơ bộ":"Tóm tắt từ câu trả lời"}</span><p>{summaryText}</p>{preliminary&&<small>Gợi ý sẽ phù hợp hơn khi bạn cung cấp thêm câu trả lời. Bạn không cần hoàn thành tất cả trong một lần.</small>}</div></section>
    <section className="results-section group-results"><div className="results-section-heading"><p className="eyebrow">Tổng quan</p><h2>Năm nhóm nhiệm vụ</h2><p>Tiến độ phản hồi và mức tự tin được trình bày riêng để tránh tạo cảm giác chấm điểm.</p></div><div className="result-group-grid">{byGroup.map((group)=>{const theme=groupThemes[group.index];const Icon=theme.Icon;const key=`group-summary-${group.index}`;return <article key={group.name} style={{"--group-color":theme.color,"--group-pale":theme.pale} as CSSProperties}><div className="result-group-icon"><Icon aria-hidden="true"/></div><span>Nhóm {group.index+1}</span><h3>{theme.title}</h3><p><strong>{group.answered}/5</strong> nhiệm vụ đã phản hồi</p><p className="confidence-note">{group.confidence===null?"Chưa đủ dữ liệu về mức tự tin":`Mức tự tin tự đánh giá trung bình: ${group.confidence.toFixed(1)}/5`}</p><button className="text-button no-print" onClick={()=>setExpanded(expanded===key?null:key)}>{expanded===key?"Thu gọn":"Xem chi tiết"}</button>{expanded===key&&<div className="group-quick-list">{group.tasks.map(task=><button key={task.id} onClick={()=>onJump(task.id)}><span>{task.id}</span>{task.title}</button>)}</div>}</article>})}</div></section>
    <section className="results-section priority-results"><div className="results-section-heading"><p className="eyebrow">Gợi ý ưu tiên</p><h2>Bạn có thể bắt đầu từ đây</h2><p>Các nhiệm vụ dưới đây được chọn từ câu trả lời, mức tự tin, mức ưu tiên và quan hệ phụ thuộc hiện có. Bạn có thể chọn hướng khác nếu phù hợp hơn.</p></div>{priorities.length?<div className="priority-list">{priorities.map((task,index)=><PriorityCard key={task.id} task={task} answer={answers[task.id]} rank={index+1} expanded={expanded===`priority-${task.id}`} onToggle={()=>setExpanded(expanded===`priority-${task.id}`?null:`priority-${task.id}`)} onDone={()=>onJump(task.id)}/>)}</div>:<div className="empty-suggestion"><Lightbulb aria-hidden="true"/><h3>Chưa có gợi ý phù hợp</h3><p>Hãy phản hồi ít nhất một nhiệm vụ để hệ thống có cơ sở đề xuất bước tiếp theo.</p><button className="primary no-print" onClick={onBack}>Tiếp tục trả lời</button></div>}</section>
    <section className="results-section explore-results"><div className="results-section-heading"><p className="eyebrow">Tự chọn hướng đi</p><h2>Khám phá thêm</h2><p>Mở một nhóm khi bạn muốn xem các nhiệm vụ khác. Bạn không cần thực hiện theo thứ tự.</p></div><div className="explore-groups">{byGroup.map((group)=>{const key=`explore-${group.index}`;const theme=groupThemes[group.index];return <article key={group.name} style={{"--group-color":theme.color,"--group-pale":theme.pale} as CSSProperties}><button className="explore-group-toggle" onClick={()=>setExpanded(expanded===key?null:key)} aria-expanded={expanded===key}><span><b>0{group.index+1}</b>{theme.title}</span><i>{expanded===key?"−":"+"}</i></button>{expanded===key&&<div className="explore-task-list">{group.tasks.map(task=>{const answer=answers[task.id];return <button key={task.id} onClick={()=>onJump(task.id)}><span>{task.id}</span><strong>{task.title}</strong><em>{taskStatus(answer)}</em></button>})}</div>}</article>})}</div></section>
    <section className="results-next no-print"><div><p className="eyebrow">Bước tiếp theo</p><h2>Bạn muốn làm gì tiếp?</h2></div><div><button className="secondary" onClick={onBack}>Xem lại câu trả lời</button><button className="secondary" onClick={()=>priorities[0]?onJump(priorities[0].id):onBack()}>Tiếp tục thực hiện nhiệm vụ</button><button className="primary" onClick={exportPdf}>Xuất PDF</button></div></section>
    <footer className="result-footer">Phiên bản quy tắc {RULE_VERSION} · Dữ liệu được lưu cục bộ trên thiết bị hiện tại.</footer>
  </main>;
}
function taskStatus(answer?: Answer) { if (!answer?.execution || !answer.confidence) return "Chưa phản hồi"; if (answer.execution === "Chưa thực hiện") return "Chưa bắt đầu"; if (answer.execution === "Đã thực hiện một phần") return "Cần hoàn thiện"; if (answer.confidence <= 2) return "Cần xem xét lại"; return "Đã ghi nhận"; }
function taskActionLabel(answer?: Answer) { const status=taskStatus(answer); return status==="Chưa bắt đầu"?"Bắt đầu nhiệm vụ":status==="Cần hoàn thiện"?"Tiếp tục hoàn thiện":"Xem lại câu trả lời"; }
function PriorityCard({ task, answer, rank, expanded, onToggle, onDone }: { task: Task; answer: Answer; rank:number; expanded:boolean; onToggle:()=>void; onDone:()=>void }) {
  const rule=findRule(task.id,answer,rules); if(!rule)return null; const state=getStateCode(answer)!;
  return <article className={`priority-card priority-card-new${expanded?" is-expanded":""}`}><div className="priority-rank">Gợi ý {rank}</div><div className="priority-card-main"><div className="priority-meta"><span>{task.group}</span><b>{taskStatus(answer)}</b></div><h3>{task.title}</h3><div className="priority-essentials"><div><strong>Vì sao gợi ý này xuất hiện?</strong><p>{rule.interpretation}{answer.obstacle&&!answer.obstacle.includes("không muốn")?` Bạn đã chọn trở ngại: ${answer.obstacle}`:""}</p></div><div><strong>Bạn có thể làm gì?</strong><p>{task.foundationAction}</p></div><div><strong>Kết quả hướng đến</strong><p>{task.evidence}</p></div><div><strong>Thời gian tham khảo</strong><p>{estimatedTime(state)}</p></div></div>{expanded&&<div className="priority-details"><div><strong>Các bước gợi ý</strong><ol>{actionSteps(rule.action).map(step=><li key={step}>{step}</li>)}</ol></div><div><strong>Tiêu chí hoàn thành</strong><p>{rule.completionCriteria}</p></div><div><strong>Câu hỏi phản tư</strong><p>{rule.reflectionPrompt}</p></div></div>}<div className="priority-actions no-print"><button className="text-button" onClick={onToggle}>{expanded?"Thu gọn hướng dẫn":"Xem hướng dẫn chi tiết"}</button><button className="primary" onClick={onDone}>{taskActionLabel(answer)}</button></div></div></article>;
}
