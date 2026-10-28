"use client";

import { useEffect, useMemo, useState } from "react";
import rawTasks from "../data/tasks.json";
import rawRules from "../data/rules.json";
import { actionSteps, estimatedTime, findRule, getStateCode, RULE_VERSION, selectPriorities, summary } from "../lib/engine";
import type { Answer, Answers, Execution, Rule, Task } from "../lib/types";

const tasks = rawTasks as Task[];
const rules = rawRules as Rule[];
const STORE_KEY = "career-reflection-progress-v1";
const groups = [...new Set(tasks.map((t) => t.group))];
const executions: Execution[] = ["Đã thực hiện", "Đã thực hiện một phần", "Chưa thực hiện"];
const confidenceLabels = ["Rất không tự tin", "Ít tự tin", "Chưa chắc chắn", "Tự tin", "Rất tự tin"];
const obstacles = [
  "Mình chưa biết bắt đầu từ đâu", "Mình chưa biết tìm thông tin ở đâu",
  "Mình chưa có đủ thời gian hoặc cơ hội", "Mình chưa biết nhiệm vụ này có ích gì với mình",
  "Lý do khác", "Mình chưa xác định được nguyên nhân", "Mình không muốn trả lời"
];

type Screen = "intro" | "guide" | "assessment" | "results";

export default function CareerReflectionApp() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (saved?.version === RULE_VERSION) {
        setAnswers(saved.answers || {}); setIndex(saved.index || 0); setScreen(saved.screen || "intro");
      }
    } catch { /* Dữ liệu lỗi được bỏ qua an toàn. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORE_KEY, JSON.stringify({ version: RULE_VERSION, answers, index, screen, savedAt: new Date().toISOString() }));
  }, [answers, index, screen, ready]);

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

  if (screen === "intro") return <Intro onStart={() => setScreen("guide")} hasProgress={stats.answered + stats.skipped > 0} onResume={() => setScreen("assessment")} onResults={() => setScreen("results")} />;
  if (screen === "guide") return <Guide onBack={() => setScreen("intro")} onContinue={() => setScreen("assessment")} onResults={() => setScreen("results")} />;
  if (screen === "results") return <Results answers={answers} onHome={() => setScreen("intro")} onBack={() => setScreen("assessment")} onJump={(id) => { setIndex(tasks.findIndex((t) => t.id === id)); setScreen("assessment"); }} expanded={expanded} setExpanded={setExpanded} />;

  const groupIndex = groups.indexOf(current.group);
  return (
    <main className="app-shell">
      <header className="topbar no-print">
        <button className="brand brand-with-icon" onClick={() => setScreen("intro")}><span className="brand-symbol">✦</span><span>Lựa chọn nghề nghiệp</span></button>
        <nav className="app-nav" aria-label="Điều hướng chính">
          <button onClick={() => setScreen("intro")}>Trang chủ</button>
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
          <div className="group-heading"><p className="eyebrow">{current.group}</p><h1>{current.groupGoal}</h1><p>Mỗi lựa chọn chỉ đúng với thời điểm hiện tại, bạn có thể quay lại và thay đổi bất cứ lúc nào.</p></div>
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
    </main>
  );
}

function SiteNav({ active, onHome, onGuide, onAssessment, onResults }: { active: "home" | "guide" | "assessment" | "results"; onHome: () => void; onGuide: () => void; onAssessment: () => void; onResults: () => void }) {
  return <header className="site-nav no-print">
    <button className="brand brand-with-icon" onClick={onHome}><span className="brand-symbol">✦</span><span>Lựa chọn nghề nghiệp</span></button>
    <nav aria-label="Điều hướng chính">
      <button className={active === "home" ? "active" : ""} onClick={onHome}>Trang chủ</button>
      <button className={active === "guide" ? "active" : ""} onClick={onGuide}>Hướng dẫn</button>
      <button className={active === "assessment" ? "active" : ""} onClick={onAssessment}>Bộ câu hỏi</button>
      <button className={active === "results" ? "active" : ""} onClick={onResults}>Kết quả</button>
    </nav>
    <span className="nav-badge">Riêng tư · Tự động lưu</span>
  </header>;
}

function Intro({ onStart, hasProgress, onResume, onResults }: { onStart: () => void; hasProgress: boolean; onResume: () => void; onResults: () => void }) {
  return <main className="landing"><SiteNav active="home" onHome={() => {}} onGuide={onStart} onAssessment={hasProgress ? onResume : onStart} onResults={onResults} /><section className="hero"><div><p className="eyebrow">Bộ câu hỏi phản tư dành cho học sinh THPT</p><h1>ĐÁNH GIÁ LẠI QUÁ TRÌNH ĐƯA RA LỰA CHỌN NGHỀ NGHIỆP</h1><p className="lead">Chậm lại một chút để nhìn rõ điều bạn đã làm, điều còn băn khoăn và một vài bước tiếp theo phù hợp với chính bạn.</p><div className="hero-actions"><button className="primary large" onClick={onStart}>Bắt đầu</button>{hasProgress && <button className="secondary large" onClick={onResume}>Tiếp tục tiến trình</button>}</div><small>Khoảng 25 nhiệm vụ · Có thể tạm dừng bất cứ lúc nào</small></div><div className="hero-visual" aria-hidden="true"><div className="paper-card back"/><div className="paper-card"><span>01</span><p>Khám phá bản thân</p><div/><span>02</span><p>Tìm hiểu nghề nghiệp</p><div/><span>03</span><p>Chọn bước tiếp theo</p></div></div></section><section className="intro-note"><strong>“Lựa chọn nghề nghiệp”</strong><p>là nghề nghiệp bạn dự định làm trong tương lai, ví dụ Nhân sự hoặc Giáo viên. Công cụ này không kết luận về năng lực hay tương lai của bạn.</p></section><ResearchFoundation /></main>;
}

function ResearchFoundation() {
  const [activeDirection, setActiveDirection] = useState(0);
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
    { title: "Hiểu bản thân và nghề mình chọn", goal: "Giúp học sinh nhận ra điểm mạnh, sở thích và những điều mình coi trọng; hiểu những yếu tố ảnh hưởng đến cách nhìn nhận bản thân và lựa chọn nghề nghiệp." },
    { title: "Tìm hiểu và kiểm tra thông tin nghề nghiệp", goal: "Giúp học sinh tìm kiếm thông tin về ngành nghề, phân biệt thông tin đáng tin cậy với ý kiến chủ quan và nhận ra những điều mình cần tìm hiểu thêm trước khi lựa chọn." },
    { title: "So sánh và cân nhắc các lựa chọn nghề nghiệp", goal: "Giúp học sinh mở rộng các lựa chọn, so sánh ưu nhược điểm và hiểu rõ vì sao mình ưu tiên một nghề hơn những nghề khác." },
    { title: "Lên kế hoạch theo đuổi nghề nghiệp", goal: "Giúp học sinh xác định những việc cần làm, chuẩn bị nguồn lực cần thiết và dự đoán khó khăn để xây dựng kế hoạch phù hợp với điều kiện hiện tại." },
    { title: "Giải quyết khó khăn khi lựa chọn nghề nghiệp", goal: "Giúp học sinh nhận diện những băn khoăn và suy nghĩ đang cản trở mình, kiểm tra chúng bằng thông tin và bằng chứng, từ đó tìm cách điều chỉnh lựa chọn hoặc tìm kiếm sự hỗ trợ phù hợp." },
  ];
  return <section className="research-section" aria-labelledby="research-title">
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
        <article><span>Lý thuyết</span><p>Dựa trên sự tương đồng giữa năm nhóm nhiệm vụ CDMSE của Taylor và Betz (1983) [5] và các kỹ năng tư duy phản biện của Facione (1990) [15], nghiên cứu xây dựng công cụ phản tư nhằm hỗ trợ học sinh tự đánh giá quá trình lựa chọn nghề nghiệp [3].</p></article>
      </div>
      <div className="foundation-table-wrap"><table className="foundation-table"><thead><tr><th>Các nhóm nhiệm vụ CDMSE</th><th>Mối liên hệ</th><th>Kỹ năng tư duy phản biện</th></tr></thead><tbody>{foundations.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>
      <div className="references"><h4>Tài liệu tham khảo</h4><ol><li>K. R. Hall, J. L. Rushing, and A. Khurshid, “Using the Solving Problems Together psychoeducational group counseling model as an intervention for negative peer pressure,” <em>Journal for Specialists in Group Work</em>, vol. 36, no. 2, pp. 97–110, Jun. 2011, doi: 10.1080/01933922.2011.562344.</li><li>K.-H. Kim and E.-H. Hwang, “Influence of Ego-Resilience, Critical Thinking Disposition, and Self Leadership on Career Decision-Making Self-Efficacy in Nursing Students,” <em>Journal of the Korea Academia-Industrial cooperation Society</em>, vol. 17, no. 2, pp. 436–445, Feb. 2016, doi: 10.5762/kais.2016.17.2.436.</li><li>P. A. Facione, “‘The Delphi Report’ Critical Thinking: A Statement of Expert Consensus for Purposes of Educational Assessment and Instruction.” [Online]. Available: <a href="http://www.insightassessment.com" target="_blank" rel="noreferrer">www.insightassessment.com</a>.</li></ol></div>
    </article>
    <article className="direction-panel">
      <div className="direction-heading"><div className="section-number">03</div><div><p className="eyebrow">Mô hình 5 mảnh ghép</p><h3>Hướng đi của công cụ</h3><p>Chọn từng mảnh để xem mục tiêu của nhóm nhiệm vụ tương ứng.</p></div></div>
      <div className="direction-layout">
        <div className="five-forces" role="group" aria-label="Năm nhóm nhiệm vụ của công cụ">{directions.map((item, index) => <button key={item.title} className={`force-piece piece-${index + 1}${activeDirection === index ? " active" : ""}`} onClick={() => setActiveDirection(index)} aria-pressed={activeDirection === index}><b>Nhóm {index + 1}</b><span>{item.title}</span></button>)}<div className="force-center"><strong>5</strong><span>nhóm nhiệm vụ</span></div></div>
        <div className="direction-detail" aria-live="polite"><span>Nhóm {activeDirection + 1}</span><h4>{directions[activeDirection].title}</h4><p><strong>Mục tiêu:</strong> {directions[activeDirection].goal}</p></div>
      </div>
    </article>
  </section>;
}

function Guide({ onBack, onContinue, onResults }: { onBack: () => void; onContinue: () => void; onResults: () => void }) {
  const items = ["Có 5 nhóm, mỗi nhóm gồm 5 nhiệm vụ.","Không có câu trả lời đúng hoặc sai.","Hãy dựa trên trải nghiệm thực tế của bạn.","Nếu chưa thực hiện, hãy trả lời trung thực; không cần cố chọn theo hướng tích cực.","Bạn có thể làm dần; bộ câu hỏi được khuyến khích hoàn thành trong 1 tuần.","Kết quả gợi ý bước tiếp theo, không đánh giá năng lực hay tương lai nghề nghiệp."];
  return <main className="guide-page"><SiteNav active="guide" onHome={onBack} onGuide={() => {}} onAssessment={onContinue} onResults={onResults} /><section className="guide-card"><p className="eyebrow">Trước khi bắt đầu</p><h1>Một số lưu ý</h1><div className="guide-list">{items.map((x,i)=><div key={x}><span>{String(i+1).padStart(2,"0")}</span><p>{x}</p></div>)}</div><div className="privacy-note"><strong>Quyền riêng tư</strong><p>Câu trả lời chỉ được lưu trong trình duyệt trên thiết bị hiện tại. Dữ liệu không tự đồng bộ sang thiết bị khác.</p></div><div className="card-actions"><button className="secondary" onClick={onBack}>Quay lại</button><button className="primary" onClick={onContinue}>Tôi đã hiểu · Tiếp tục</button></div></section></main>;
}

function Results({ answers, onHome, onBack, onJump, expanded, setExpanded }: { answers: Answers; onHome: () => void; onBack: () => void; onJump: (id:string)=>void; expanded: string|null; setExpanded:(id:string|null)=>void }) {
  const stats = summary(tasks, answers); const priorities = selectPriorities(tasks, answers); const complete = stats.answered === 25;
  const byGroup = groups.map((g) => ({ name:g, answered: tasks.filter((t)=>t.group===g && answers[t.id]?.execution && answers[t.id]?.confidence).length }));
  return <main className="results-page" id="results-content"><SiteNav active="results" onHome={onHome} onGuide={onBack} onAssessment={onBack} onResults={() => {}} /><header className="result-header"><div><p className="eyebrow">Kết quả cá nhân hóa</p><h1>Một số định hướng tiếp theo</h1><p>Đây là bản tóm tắt từ câu trả lời bạn đã cung cấp</p></div><div className="no-print result-actions"><button className="secondary" onClick={onBack}>Tiếp tục chỉnh sửa</button><button

className="primary" onClick={async () => {const element = document.getElementById("results-content"); if (!element) return; const html2pdf = (await import("html2pdf.js")).default; const options = {margin: 10,filename: "ket-qua-huong-nghiep.pdf",image: { type: "jpeg" as const, quality: 0.98 },html2canvas: { scale: 2, backgroundColor: "#ffffff" },jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const }};await html2pdf().set(options).from(element).save();
}}>Xuất PDF</button></div></header>{!complete && <div className="incomplete"><strong>Kết quả</strong><span>Còn {25-stats.answered} nhiệm vụ chưa có đủ hai câu trả lời nên chưa thể tiếp tục</span></div>}<section className="stats-grid"><div><span>Đã thực hiện</span><strong>{stats.done}</strong></div><div><span>Thực hiện một phần</span><strong>{stats.partial}</strong></div><div><span>Chưa thực hiện</span><strong>{stats.notDone}</strong></div><div><span>Đã trả lời</span><strong>{stats.answered}/25</strong></div></section><section className="group-overview"><h2>Tổng quan theo 5 nhóm</h2>{byGroup.map((g)=><div key={g.name}><span>{g.name}</span><div className="progress"><span style={{width:`${g.answered*20}%`}}/></div><b>{g.answered}/5</b></div>)}</section><section className="result-section"><p className="eyebrow">Ưu tiên ban đầu</p><h2>Tối đa ba nhiệm vụ để bắt đầu</h2><p className="section-copy">Thứ tự dựa trên trạng thái, mức ưu tiên và các quan hệ được ghi trong dữ liệu. Bạn vẫn có thể chọn nhiệm vụ khác.</p><div className="priority-list">{priorities.map((task,i)=><PriorityCard key={task.id} task={task} answer={answers[task.id]} rank={i+1} onDone={()=>onJump(task.id)}/>)}</div></section><section className="result-section"><h2>Những gì bạn đã báo cáo là đã làm</h2><div className="chips">{tasks.filter(t=>["Đã thực hiện","Đã thực hiện một phần"].includes(answers[t.id]?.execution||"")).map(t=><button key={t.id} onClick={()=>onJump(t.id)}>{t.id} · {t.title}</button>)}</div></section><section className="result-section remaining"><h2>Các nhiệm vụ còn lại</h2>{tasks.filter(t=>!priorities.some(p=>p.id===t.id)).map(task=>{const rule=findRule(task.id,answers[task.id],rules); return <article key={task.id}><button className="accordion" onClick={()=>setExpanded(expanded===task.id?null:task.id)}><span>{task.id} · {task.title}</span><b>{expanded===task.id?"−":"+"}</b></button>{expanded===task.id&&<div className="accordion-body">{rule?<><p>{rule.interpretation}</p><p><strong>Gợi ý:</strong> {rule.action}</p><button className="text-button" onClick={()=>onJump(task.id)}>Xem lại câu trả lời</button></>:<p>Nhiệm vụ này chưa có đủ dữ liệu để ghép quy tắc.</p>}</div>}</article>})}</section><footer className="result-footer">Phiên bản quy tắc {RULE_VERSION} · Dữ liệu được lưu cục bộ trên thiết bị hiện tại.</footer></main>;
}
function PriorityCard({ task, answer, rank, onDone }: { task: Task; answer: Answer; rank:number; onDone:()=>void }) {
  const rule=findRule(task.id,answer,rules); if(!rule)return null; const state=getStateCode(answer)!;
  return <article className="priority-card"><div className="rank">{String(rank).padStart(2,"0")}</div><div><p className="eyebrow">{task.group} · Trạng thái {state}</p><h3>{task.title}</h3><dl><div><dt>Vì sao gợi ý này xuất hiện?</dt><dd>{rule.interpretation}{answer.obstacle&&!answer.obstacle.includes("không muốn")?` Bạn đã chọn trở ngại: ${answer.obstacle}`:""}</dd></div><div><dt>Mục tiêu nhỏ</dt><dd>{task.foundationAction}</dd></div><div><dt>Các bước thực hiện</dt><dd><ol>{actionSteps(rule.action).map(x=><li key={x}>{x}</li>)}</ol></dd></div><div><dt>Thời gian dự kiến</dt><dd>{estimatedTime(state)}. Đây chỉ là gợi ý, bạn có thể thay đổi nếu muốn</dd></div><div><dt>Nguồn lực</dt><dd>{task.evidence}</dd></div><div><dt>Tiêu chí hoàn thành</dt><dd>{rule.completionCriteria}</dd></div><div><dt>Câu hỏi phản tư</dt><dd>{rule.reflectionPrompt}</dd></div><div><dt>Bước tiếp theo</dt><dd>{task.dependency}</dd></div></dl><button className="secondary no-print" onClick={onDone}>Mở nhiệm vụ này</button></div></article>;
}
