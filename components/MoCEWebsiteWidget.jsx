"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, ShieldCheck, Search, Database, Brain, Gauge,
  ThumbsUp, ThumbsDown, RefreshCw, CheckCircle2, ClipboardList,
  Sparkles, UserCheck, MessageSquare, ChevronRight, ChevronDown,
  MessageCircle, X, Menu, Globe, Phone, Mail, Facebook, Instagram,
  Youtube, Twitter, ArrowRight, Minus, Mic, Settings,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Design tokens — matched to the real moce.gov.ae hero (reference        */
/* screenshot): warm cream background, deep coffee-brown headline/ink,    */
/* olive-gold accents on pills, icons, and CTAs.                          */
/* ---------------------------------------------------------------------- */

const MAROON = "#4B3220";       /* deep coffee-brown — headlines, primary accent */
const MAROON_DARK = "#2E1F14";  /* darker brown — gradients, footer */
const GOLD = "#A9862E";         /* olive-gold — pills, icons, secondary accent */
const INK = "#241B15";
const PAPER = "#FBF5EA";        /* warm cream background */
const SAND = "#F3E9D6";

/* ---------------------------------------------------------------------- */
/* Mock enterprise data — curated from MoCE's public Social Welfare       */
/* Program / Inflation Allowance structure.                               */
/*                                                                         */
/* CONFIRMED (public sources, verified via research):                     */
/* - Income threshold: AED 25,000/month household income                  */
/* - Fuel Allowance: AED 300 / 600 / 900 monthly, tiered to the Fuel      */
/*   Price Committee's Special 95 bracket (AED 2.10–2.85 / 2.86–3.60 /    */
/*   3.61+ per litre)                                                     */
/* - Food Allowance: AED 500 primary beneficiary + AED 500 spouse +       */
/*   AED 250 per child under 21 (max 4 children), credited monthly        */
/* - Electricity & Water: 50% of consumption cost or AED 400/month,       */
/*   whichever is lower, deducted directly from the utility bill          */
/* - Social Welfare Program application: 21 working-day SLA, ~10 min to   */
/*   apply                                                                 */
/* - Inflation Allowance specifically: up to 10 working-day processing    */
/* - Complaints Service: 5 working-day SLA, ~1 min to file                */
/* - Legal basis: Federal Decree-Law No. 23 of 2024 (Social Support and   */
/*   Empowerment); Cabinet Resolution No. 57 of 2025 (executive           */
/*   regulations); Cabinet Resolution No. 58 of 2025 (Inflation Allowance */
/*   rates specifically); AED 3.5 billion programme budget                */
/*                                                                         */
/* ILLUSTRATIVE (invented for demo purposes, not confirmed real figures): */
/* specific citizen IDs, exact case timelines/meter readings, and the     */
/* revalidation-window/appeal-window day-counts below — the real          */
/* mechanism for contesting a decision is simply filing a Complaint       */
/* (5 working-day SLA, see above), not a separate fixed appeal window.    */
/*                                                                         */
/* NOTE ON DESIGN: real case lookups should never fan out across a        */
/* citizen's whole history without narrowing down first. So this is       */
/* split into list_citizen_cases (returns just case IDs/category/status)  */
/* and get_case_details (returns full detail for ONE case_id) — mirroring */
/* how a real case-management system would require disambiguation before */
/* returning a full record, rather than guessing which case to search.    */
/* ---------------------------------------------------------------------- */

/* Computes dates relative to whenever the demo actually runs, so a mock
   "pending" complaint never silently drifts past its own SLA window no
   matter how much later this artifact gets used. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const MOCK_CASE_DB = {
  "SW-2026-004821": {
    case_id: "SW-2026-004821",
    category: "fuel_allowance",
    status: "Suspended",
    opened: "15 Dec 2025",
    reason_codes: ["MOCE-ELG-45"],
    case_history: [
      "Household composition updated (spouse employment status changed) 94 days ago — no revalidation on file",
      "Fuel Allowance active at the AED 600/month tier (Special 95 in the AED 2.86–3.60/litre bracket) since Jan 2023",
    ],
    previous_complaints: [],
    appeals: [`Complaint filed ${daysAgo(3)} — pending officer review (5 working-day SLA, not yet elapsed)`],
  },
  "SW-2023-000937": {
    case_id: "SW-2023-000937",
    category: "food_allowance",
    status: "Suspended",
    opened: "01 Mar 2023",
    reason_codes: ["MOCE-ELG-08"],
    case_history: [
      "Household income reassessment recorded AED 26,400/month — above the AED 25,000 threshold",
      "Food Allowance active continuously since Mar 2023 (AED 500 primary + AED 500 spouse + AED 250 x 2 children)",
    ],
    previous_complaints: [`${daysAgo(90)}: payment delay to Lulu Hypermarket account — resolved within 4 days`],
    appeals: [],
  },
  "SW-2024-001552": {
    case_id: "SW-2024-001552",
    category: "electricity_water_allowance",
    status: "Suspended",
    opened: "10 Feb 2024",
    reason_codes: ["MOCE-ELG-08"],
    case_history: [
      "Latest DEWA/utility feed shows monthly consumption cost of AED 460 — above the AED 400 subsidy cap",
      "Electricity & Water Allowance active since Feb 2024",
    ],
    previous_complaints: [],
    appeals: [],
  },
};

function mockListCases() {
  return Object.values(MOCK_CASE_DB).map(({ case_id, category, status, opened }) => ({ case_id, category, status, opened }));
}

function mockGetCaseDetails(caseId) {
  const found = MOCK_CASE_DB[caseId];
  if (!found) return { error: "not_found", message: `No case found with ID ${caseId}.` };
  return found;
}

const KNOWLEDGE_BASE = [
  {
    rule_id: "MOCE-ELG-45",
    title: "Household Composition Revalidation",
    summary:
      "Under Federal Decree-Law No. 23 of 2024 on Social Support and Empowerment, allowances tied to household size or composition (marriage, a new dependent, a spouse's employment status) are recalculated automatically once updated data reaches MoCE from MOHRE or the Federal Authority for Identity and Citizenship. A change that pushes the household over the eligibility line suspends the linked allowance.",
    appeal_path: "To contest the recalculation, the citizen files a Complaint (free, ~1 minute to submit, 5 working-day SLA) via the portal, app, service center, or 800623.",
    tags: ["household", "revalidation", "spouse", "composition", "dependents", "fuel"],
  },
  {
    rule_id: "MOCE-ELG-08",
    title: "Household Income Eligibility Threshold",
    summary:
      "Per Articles 6–8 of Federal Decree-Law No. 23 of 2024, and its executive regulations under Cabinet Resolution No. 57 of 2025, the Inflation Allowance (food, fuel, and electricity & water) is available only to households with total monthly income below AED 25,000. Income data is pulled automatically from MOHRE, so a salary change can trigger suspension without a new application.",
    appeal_path: "To dispute the income figure, the citizen files a Complaint with updated salary documentation (5 working-day SLA).",
    tags: ["income", "threshold", "25000", "eligibility", "food", "electricity", "water", "utility", "consumption"],
  },
  {
    rule_id: "MOCE-FUEL-01",
    title: "Fuel Allowance Calculation",
    summary:
      "Set under Cabinet Resolution No. 58 of 2025 Regarding Inflation Allowance, the Fuel Allowance pays AED 300/month when the Fuel Price Committee's Special 95 rate is AED 2.10–2.85/litre, AED 600/month at AED 2.86–3.60/litre, and AED 900/month at AED 3.61/litre or above. It's credited monthly to the beneficiary's Emirates ID.",
    appeal_path: "To query the tier applied, the citizen files a Complaint referencing the relevant month's fuel price bracket.",
    tags: ["fuel", "litre", "subsidy", "petrol"],
  },
  {
    rule_id: "MOCE-FOOD-01",
    title: "Food Allowance Calculation",
    summary:
      "Also under Cabinet Resolution No. 58 of 2025, the Food Allowance credits AED 500/month to the primary beneficiary, AED 500 to one Emirati wife, and AED 250 per child under 21 (up to four children), disbursed to the Emirates ID and redeemable at partner hypermarkets.",
    appeal_path: "To dispute an amount, the citizen files a Complaint (5 working-day SLA).",
    tags: ["food", "hypermarket", "grocery", "subsidy"],
  },
  {
    rule_id: "MOCE-UTIL-01",
    title: "Electricity & Water Allowance Cap",
    summary:
      "Under Cabinet Resolution No. 58 of 2025, the Electricity & Water Allowance covers 50% of the monthly consumption cost or AED 400, whichever is lower, applied directly as a deduction on the DEWA/utility bill. Unused amounts don't carry over to the next month.",
    appeal_path: "To request a meter re-read, the citizen files a Complaint (5 working-day SLA).",
    tags: ["electricity", "water", "utility", "kwh", "gallons", "dewa"],
  },
  {
    rule_id: "FAQ-01",
    title: "General Resolution Notes",
    summary: "Most complaints resolve automatically when the underlying case data confirms the citizen's reported issue matches a known, documented MoCE rule. The Social Welfare Program's own application SLA is 21 working days; the Inflation Allowance specifically processes in up to 10 working days.",
    appeal_path: "Complaints Service: free, ~1 minute to file, 5 working-day SLA, via portal, app, service center, or 800623.",
    tags: ["general", "social welfare", "programme"],
  },
];

function mockSearchKnowledge(query = "") {
  const q = query.toLowerCase();
  const hits = KNOWLEDGE_BASE.filter((k) => k.tags.some((t) => q.includes(t)));
  return hits.length ? hits : [KNOWLEDGE_BASE[5]];
}

function mockEnterpriseData() {
  return {
    note: "Aggregate context only — not case-specific.",
    benefit_trend: "The Inflation Allowance programme runs on an AED 3.5 billion budget; roughly 12% of Fuel Allowance suspensions this quarter trace back to unrevalidated household changes (illustrative trend figure).",
    historical_analytics: "Complaints Service SLA: 5 working days. Inflation Allowance application processing: up to 10 working days. Main Social Welfare Program application: 21 working days.",
  };
}

const MODEL = "claude-sonnet-5"; // real public API model — verify current model IDs at https://docs.claude.com if this changes
const MOCK_CITIZEN_NAME = "Ahmed Al Mansoori";

/* ---------------------------------------------------------------------- */
/* LLM provider settings — user-supplied API keys, held only in           */
/* sessionStorage (cleared when the tab closes) and sent per-request to    */
/* our own /api/chat route, never to Anthropic/OpenAI directly from here.  */
/* Server env vars (ANTHROPIC_API_KEY / OPENAI_API_KEY) are always the     */
/* fallback if a field here is left blank.                                 */
/* ---------------------------------------------------------------------- */

const SETTINGS_STORAGE_KEY = "moce_llm_settings";
const DEFAULT_LLM_SETTINGS = { anthropicKey: "", openaiKey: "", provider: "auto", language: "en" };

/* ---------------------------------------------------------------------- */
/* i18n — English / Arabic UI strings for the chat widget. The citizen    */
/* can still type in either language regardless of this toggle; it only   */
/* sets the widget chrome and the assistant's default/greeting language    */
/* (see the LANGUAGE directive in buildSystemPrompt, which detects and     */
/* matches whatever language the citizen actually writes in).             */
/* ---------------------------------------------------------------------- */

const TRANSLATIONS = {
  en: {
    dir: "ltr",
    headerTitle: "MoCE Assistant",
    headerSubtitleAuth: (name) => `${name} · Verified`,
    headerSubtitleGuest: "Ask about Social Welfare",
    signOut: "Sign out",
    newConversationTitle: "Start a new conversation",
    settingsTitle: "LLM provider settings",
    languageToggleTitle: "Switch to Arabic",
    emptyStateText: "Ask about the Social Welfare Program, or check your own case.",
    examples: ["What's the income threshold for the Inflation Allowance?", "My Fuel Allowance was stopped incorrectly."],
    inputPlaceholder: "Type your question…",
    loginPrompt: "Verify your identity to continue",
    loginButton: "Continue with UAE Pass",
    feedbackHelpful: "Helpful",
    feedbackNotHelpful: "Not helpful",
    feedbackRecorded: "Added to evaluation dataset.",
    signedOutDivider: "Signed out",
    thinking: "Thinking…",
    workingCase: "Working through the case",
    workedCase: "Worked through the case",
    lookingInto: "Looking into that",
    lookedInto: "Looked into that",
    stepLabel: (n) => `${n} step${n > 1 ? "s" : ""}`,
    followUpsResolved: ["Can I appeal this decision?", "What documents do I need?", "How long will the review take?"],
    followUpsUnresolved: ["Can you check my own case?", "What's the appeal window for this rule?"],
    toolLabels: {
      operationalRetrieval: "Operational Retrieval",
      caseDirectory: "Case Directory",
      knowledgeRetrieval: "Knowledge Retrieval",
      enterpriseData: "Enterprise Data",
      aiInferencing: "AI Inferencing",
    },
    reasoningComplete: "Reasoning complete — routing case.",
    autoResponse: "Auto-response",
    humanReview: "Routed to human review",
    citesRule: (rule) => `· cites ${rule}`,
    confidenceEval: "Confidence Evaluation",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
    errorGeneric: "Something went wrong. Please try again.",
    errorTooManySteps: "Took too many steps. Please try again.",
    errorFallback: "Couldn't reach the agent. Please try again.",
    notFound: (id) => `No case found with ID ${id}.`,
    settingsPanel: {
      title: "LLM Provider Settings",
      description:
        "Keys entered here are stored only in this browser tab (sessionStorage) and sent directly to this app's own server with each message. They're cleared automatically when you close the tab. Leave a field blank to use the server's configured key, if any.",
      anthropicLabel: "Anthropic API key",
      openaiLabel: "OpenAI API key (gpt-4o-mini)",
      providerLabel: "Preferred provider",
      providerAuto: "Auto (Anthropic first, then gpt-4o-mini)",
      providerAnthropic: "Anthropic (Claude)",
      providerOpenai: "OpenAI (gpt-4o-mini)",
      save: "Save settings",
    },
  },
  ar: {
    dir: "rtl",
    headerTitle: "مساعد الوزارة",
    headerSubtitleAuth: (name) => `${name} · موثّق`,
    headerSubtitleGuest: "اسأل عن الرعاية الاجتماعية",
    signOut: "تسجيل الخروج",
    newConversationTitle: "بدء محادثة جديدة",
    settingsTitle: "إعدادات مزوّد الذكاء الاصطناعي",
    languageToggleTitle: "التبديل إلى الإنجليزية",
    emptyStateText: "اسأل عن برنامج الرعاية الاجتماعية، أو تحقّق من حالتك الخاصة.",
    examples: ["ما هو حد الدخل المؤهل لبدل التضخم؟", "تم إيقاف بدل الوقود الخاص بي عن طريق الخطأ."],
    inputPlaceholder: "اكتب سؤالك…",
    loginPrompt: "تحقّق من هويتك للمتابعة",
    loginButton: "المتابعة عبر UAE Pass",
    feedbackHelpful: "مفيد",
    feedbackNotHelpful: "غير مفيد",
    feedbackRecorded: "تمت الإضافة إلى مجموعة بيانات التقييم.",
    signedOutDivider: "تم تسجيل الخروج",
    thinking: "جارٍ التفكير…",
    workingCase: "جارٍ معالجة الحالة",
    workedCase: "تمت معالجة الحالة",
    lookingInto: "جارٍ البحث في ذلك",
    lookedInto: "تم البحث في ذلك",
    stepLabel: (n) => `${n} ${n > 1 ? "خطوات" : "خطوة"}`,
    followUpsResolved: ["هل يمكنني الاعتراض على هذا القرار؟", "ما هي المستندات التي أحتاجها؟", "كم من الوقت ستستغرق المراجعة؟"],
    followUpsUnresolved: ["هل يمكنك التحقق من حالتي الخاصة؟", "ما هي مهلة الاعتراض على هذه القاعدة؟"],
    toolLabels: {
      operationalRetrieval: "الاسترجاع التشغيلي",
      caseDirectory: "دليل الحالات",
      knowledgeRetrieval: "استرجاع المعرفة",
      enterpriseData: "بيانات المؤسسة",
      aiInferencing: "الاستدلال بالذكاء الاصطناعي",
    },
    reasoningComplete: "اكتمل التحليل — جارٍ توجيه الحالة.",
    autoResponse: "رد تلقائي",
    humanReview: "تمت الإحالة إلى مراجعة بشرية",
    citesRule: (rule) => `· استناداً إلى ${rule}`,
    confidenceEval: "تقييم مستوى الثقة",
    high: "مرتفع",
    medium: "متوسط",
    low: "منخفض",
    errorGeneric: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    errorTooManySteps: "استغرقت العملية خطوات كثيرة جدًا. يرجى المحاولة مرة أخرى.",
    errorFallback: "تعذّر الوصول إلى المساعد. يرجى المحاولة مرة أخرى.",
    notFound: (id) => `لم يتم العثور على حالة بالرقم ${id}.`,
    settingsPanel: {
      title: "إعدادات مزوّد الذكاء الاصطناعي",
      description:
        "يتم تخزين المفاتيح المُدخلة هنا فقط في علامة تبويب المتصفح الحالية (sessionStorage) وتُرسل مباشرة إلى خادم هذا التطبيق مع كل رسالة. تُمسح تلقائيًا عند إغلاق علامة التبويب. اترك الحقل فارغًا لاستخدام مفتاح الخادم المُعدّ مسبقًا، إن وُجد.",
      anthropicLabel: "مفتاح Anthropic API",
      openaiLabel: "مفتاح OpenAI API (gpt-4o-mini)",
      providerLabel: "المزوّد المفضّل",
      providerAuto: "تلقائي (Anthropic أولاً، ثم gpt-4o-mini)",
      providerAnthropic: "Anthropic (Claude)",
      providerOpenai: "OpenAI (gpt-4o-mini)",
      save: "حفظ الإعدادات",
    },
  },
};

function loadLlmSettings() {
  if (typeof window === "undefined") return DEFAULT_LLM_SETTINGS;
  try {
    const raw = window.sessionStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_LLM_SETTINGS, ...JSON.parse(raw) } : DEFAULT_LLM_SETTINGS;
  } catch {
    return DEFAULT_LLM_SETTINGS;
  }
}

function saveLlmSettings(settings) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function SettingsPanel({ settings, onSave, onClose, t }) {
  const [anthropicKey, setAnthropicKey] = useState(settings.anthropicKey);
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey);
  const [provider, setProvider] = useState(settings.provider);
  const s = t.settingsPanel;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${MAROON}, ${MAROON_DARK})`, flexShrink: 0 }}>
        <div className="flex items-center gap-2 text-[13px] font-semibold"><Settings size={15} /> {s.title}</div>
        <button onClick={onClose} className="text-white/80 hover:text-white"><X size={17} /></button>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4 overflow-y-auto" style={{ background: PAPER, flex: "1 1 auto" }}>
        <p className="text-[11.5px] text-neutral-500 leading-relaxed">
          {s.description}
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-600">{s.anthropicLabel}</span>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-..."
            className="rounded-md border border-neutral-200 px-3 py-2 text-[12.5px] outline-none focus:border-neutral-400"
            autoComplete="off"
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-600">{s.openaiLabel}</span>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="rounded-md border border-neutral-200 px-3 py-2 text-[12.5px] outline-none focus:border-neutral-400"
            autoComplete="off"
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-neutral-600">{s.providerLabel}</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-md border border-neutral-200 px-3 py-2 text-[12.5px] outline-none focus:border-neutral-400 bg-white"
          >
            <option value="auto">{s.providerAuto}</option>
            <option value="anthropic">{s.providerAnthropic}</option>
            <option value="openai">{s.providerOpenai}</option>
          </select>
        </label>

        <button
          onClick={() => onSave({ anthropicKey, openaiKey, provider })}
          className="rounded-md px-3 py-2 text-[12.5px] font-semibold text-white"
          style={{ background: MAROON }}
        >
          {s.save}
        </button>
      </div>
    </div>
  );
}

function buildSystemPrompt(authState, language = "en") {
  const authLine = authState.authenticated
    ? `The citizen is currently authenticated via UAE Pass as ${authState.name}. You may look up their case and take action on it.`
    : `The citizen is NOT yet authenticated. You may answer general policy/FAQ questions freely, but you must NOT look up or act on any specific personal case until they are authenticated.`;

  const interfaceLanguage = language === "ar" ? "Arabic" : "English";

  return `You are the case-resolution agent for MoCE (Ministry of Community Empowerment), the UAE federal ministry that administers the Social Welfare Program for low-income Emirati families, including the Inflation Allowance (food, fuel, and electricity & water subsidies). Eligibility generally requires total monthly household income below AED 25,000, per Federal Decree-Law No. 23 of 2024.

${authLine}

LANGUAGE: The citizen's selected interface language is ${interfaceLanguage}. Regardless of that setting, always detect the language of the citizen's MOST RECENT message and reply fully in that same language — if they write in Arabic, reply entirely in clear, natural Modern Standard Arabic; if they write in English, reply in English. If a message is a greeting or otherwise gives no clear language cue, default to the interface language above. Never mix the two languages within one reply. This rule applies ONLY to the natural-language text of your reply — the <use_tool name="...">{...}</use_tool> tag syntax, JSON field names/keys, rule IDs (e.g. MOCE-ELG-45), and case IDs (e.g. SW-2024-001552) must always stay exactly as specified, in English/ASCII, no matter which language you're replying in.

You have five actions available. To use one, output EXACTLY one line in this format and then STOP immediately — write nothing else, not even a newline:
<use_tool name="ACTION_NAME">{...json args...}</use_tool>

Worked example — calling get_case_details for case SW-2024-001552, character for character:
<use_tool name="get_case_details">{"case_id": "SW-2024-001552"}</use_tool>
Match that punctuation exactly: a ">" (never ":") immediately after the closing quote of name, then the raw JSON object, then "</use_tool>". Never wrap it as {"name": "...", "arguments": {...}} or any other JSON-call shape — the literal <use_tool name="...">...</use_tool> text is the only format this system understands.

Available actions:
1. request_login {} — use when the citizen wants you to check, resolve, or act on their own specific case, but they are not yet authenticated.
2. get_case_details {"case_id": "..."} — fetches full details for ONE specific case. Only call this once you actually have a case ID — never guess one.
3. list_citizen_cases {} — fallback only: returns the citizen's case IDs/category/status/opened-date, for when they don't know or don't have their case number. Use this to help them find the right one, not as your default first move.
4. search_knowledge_base {"query": "short description of the issue"} — safe anytime, for FAQs or case research.
5. query_enterprise_data {"query": "short description"} — optional, only if broader trend context helps.
6. submit_decision {"category": "...", "confidence": 0-100, "decision": "auto_response" | "human_review", "rule_cited": "...", "reasoning": "..."} — only for resolving a specific case, never for general FAQs.

Process:
- Greeting or vague/small-talk message with no specific request yet (e.g. "hi", "hello", "can you help me?"): reply with a brief, friendly welcome explaining you can answer questions about the Social Welfare Program / Inflation Allowance, or help check/resolve their own case or complaint if they have one. Do NOT call request_login or any tool for this — wait until they actually state what they need.
- General question about policy, eligibility rules, or how something works: answer directly (optionally using search_knowledge_base first). No authentication, no submit_decision.
- Citizen clearly wants to check or resolve THEIR OWN specific case, or wants to file/raise a complaint or concern about their own situation (e.g. "check my case", "my fuel allowance was stopped", "I want to file a complaint"), and is not authenticated: you MUST actually call request_login using the exact <use_tool name="request_login">{}</use_tool> format and stop there. Do not call get_case_details or submit_decision first, and do not instead just tell them in plain text that they need to log in — a prose sentence about logging in does not show them the real UAE Pass login button, only the actual tool call does.
- Do NOT call request_login just because a message mentions allowances, complaints, or cases in general terms — only trigger it once the citizen clearly means their own case/situation, not a hypothetical or general question about how something works. But once you've decided it IS their own case/situation, commit to the real tool call — don't hedge with a text-only "please log in" reply.
- Once request_login succeeds, you'll be told their name in the tool result. Do not ask them to repeat what they already told you before logging in — that violates the "Ask Once" principle. But a case ID is different information they haven't given you yet, so:
  - If they haven't given you a case/reference number, your final reply for this turn should be ONLY a brief greeting by name plus a request for their case or reference number (format looks like SW-YYYY-NNNNNN), mentioning briefly what their issue was about if they already said. Do not call any lookup tool yet. Wait for their reply.
  - If their message already contains something that looks like a case number, skip straight to get_case_details with it.
- If the citizen provides a case number: call get_case_details with it directly. If it's not found, tell them plainly and offer to look up their cases instead (list_citizen_cases).
- If the citizen says they don't have their case number, don't know it, or ask you to just look: call list_citizen_cases, then present the short list (case ID, category, status) in your reply and ask which one they mean — do not fetch full details for more than one case without them choosing. Only call get_case_details once they've indicated which case ID.
- Once you have the specific case's full details: call search_knowledge_base, optionally query_enterprise_data, then call submit_decision exactly once (confidence >= 80 -> auto_response, otherwise human_review). Only after submit_decision has run, write a short plain-language reply: explain what happened, cite the rule in plain terms, and give next steps. If human_review, say it's been sent to an officer and note the real Complaints Service SLA of 5 working days. Keep it under 120 words. Never mention tools, MCP, or system internals. You may use **bold** for key terms (like rule IDs or amounts) and "- " bullet points for lists of steps or documents, but never JSON or tags.

Today's date is ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}. Use this to reason about elapsed time accurately — e.g. whether a complaint's SLA window has already passed. Trust the dates/status in tool results as already accurate; don't assume a "pending" status is stale just because a case was opened a while ago.

Real service SLAs to cite accurately when relevant (never invent different numbers):
- Complaints Service: free, ~1 minute to file, 5 working-day SLA
- Inflation Allowance application/reassessment: up to 10 working days
- Main Social Welfare Program application: 21 working-day SLA, ~10 minutes to apply
- Contesting any decision (income figure, household status, meter reading) happens by filing a Complaint — there is no separate fixed "appeal window" beyond that 5-day SLA, so don't invent one.

CRITICAL RULES:
- Never call request_login in response to a greeting, small talk, or a general policy/FAQ question — only when the citizen clearly means their own case, application, allowance, or complaint.
- Whenever login is genuinely needed, you must emit the real <use_tool name="request_login">{}</use_tool> call — never say "please log in" (or similar) as plain text instead of calling the tool, since only the actual tool call renders a working login button for the citizen.
- After writing a <use_tool> tag you MUST stop. Never write a <tool_result> yourself, never guess or invent what a tool would return, never continue the sentence after the tag.
- Only real results provided back to you (in a following message starting with <tool_result>) are true. Anything you might imagine before that does not exist.
- Do not narrate tool calls in prose ("Let me check...") followed by a fake result — either make a real <use_tool> call and stop, or write the final reply. Never both fake and real content in the same message.`;
}

/* ---------------------------------------------------------------------- */
/* Chat UI atoms (recolored to the maroon/gold ministry palette)          */
/* ---------------------------------------------------------------------- */

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
    )
  );
}

function FormattedText({ text }) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  let currentList = null;
  lines.forEach((line) => {
    const bullet = line.match(/^[-•]\s+(.*)/);
    const numbered = line.match(/^\d+[.)]\s+(.*)/);
    if (bullet) {
      if (!currentList || currentList.type !== "ul") { currentList = { type: "ul", items: [] }; blocks.push(currentList); }
      currentList.items.push(bullet[1]);
    } else if (numbered) {
      if (!currentList || currentList.type !== "ol") { currentList = { type: "ol", items: [] }; blocks.push(currentList); }
      currentList.items.push(numbered[1]);
    } else {
      currentList = null;
      blocks.push({ type: "p", text: line });
    }
  });
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((b, i) => {
        if (b.type === "ul") return (
          <ul key={i} className="list-disc pl-5 space-y-1">
            {b.items.map((it, j) => <li key={j}>{renderInline(it, `${i}-${j}`)}</li>)}
          </ul>
        );
        if (b.type === "ol") return (
          <ol key={i} className="list-decimal pl-5 space-y-1">
            {b.items.map((it, j) => <li key={j}>{renderInline(it, `${i}-${j}`)}</li>)}
          </ol>
        );
        return <p key={i}>{renderInline(b.text, `${i}`)}</p>;
      })}
    </div>
  );
}

function getFollowUps(turn, t) {
  const resolved = turn.steps.some((s) => s.type === "decision");
  return resolved ? t.followUpsResolved : t.followUpsUnresolved;
}

function FollowUpChips({ turn, onPick, t }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {getFollowUps(turn, t).map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] text-neutral-600 hover:border-neutral-300"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function LoginCard({ onLogin, t }) {
  return (
    <div className="rounded-md border px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: "#FBF3E7", borderColor: "#EAD9AF" }}>
      <div className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: "#8A6A17" }}>
        <ShieldCheck size={15} />
        {t.loginPrompt}
      </div>
      <button onClick={onLogin} className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold text-white" style={{ background: MAROON }}>
        {t.loginButton}
      </button>
    </div>
  );
}

function SystemChain({ steps }) {
  return (
    <div className="flex items-center flex-wrap gap-1 mb-1.5">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <ArrowRight size={9} className="text-neutral-300 shrink-0" />}
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
            style={
              i === steps.length - 1
                ? { background: MAROON, color: "white" }
                : { background: "#F0EAE0", color: "#6B5D4A" }
            }
          >
            {s}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function ToolCard({ icon: Icon, label, tone, children }) {
  const bg = tone === "gold" ? "#FBF3E7" : "#F6EDF0";
  const border = tone === "gold" ? "#EAD9AF" : "#E7D3DA";
  const fg = tone === "gold" ? "#8A6A17" : MAROON;
  return (
    <div className="rounded-md border px-3.5 py-2.5" style={{ background: bg, borderColor: border }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} style={{ color: fg }} />
        <span className="text-[9.5px] font-semibold tracking-wide uppercase" style={{ color: fg }}>{label}</span>
      </div>
      <div className="text-[12px] text-neutral-700 leading-snug">{children}</div>
    </div>
  );
}

function ConfidenceCard({ confidence, ruleCited, t }) {
  const isHigh = confidence >= 80;
  const barColor = isHigh ? MAROON : confidence >= 60 ? GOLD : "#B85450";
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Gauge size={13} className="text-neutral-400" />
        <span className="text-[9.5px] font-semibold tracking-wide uppercase text-neutral-400">{t.confidenceEval}</span>
      </div>
      <div className="flex items-end gap-2 mb-1.5">
        <div className="text-2xl font-bold" style={{ color: barColor }}>{Math.round(confidence)}<span className="text-sm align-top">%</span></div>
        <span className="mb-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: barColor }}>
          {isHigh ? t.high : confidence >= 60 ? t.medium : t.low}
        </span>
      </div>
      <div className="h-1 rounded-full bg-neutral-100 overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${confidence}%`, background: barColor }} />
      </div>
      <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium" style={{ background: isHigh ? "#F6EDF0" : "#FBF3E7", color: isHigh ? MAROON : "#8A6A17" }}>
        {isHigh ? <CheckCircle2 size={12} /> : <UserCheck size={12} />}
        {isHigh ? t.autoResponse : t.humanReview}
        {ruleCited ? <span className="text-neutral-400 font-normal">{t.citesRule(ruleCited)}</span> : null}
      </div>
    </div>
  );
}

function FeedbackRow({ onFeedback, given, t }) {
  if (given) {
    return <div className="flex items-center gap-1.5 text-[11px] mt-1.5" style={{ color: MAROON }}><RefreshCw size={11} />{t.feedbackRecorded}</div>;
  }
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <button onClick={() => onFeedback(true)} className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-0.5 text-[10.5px] text-neutral-500 hover:border-neutral-300"><ThumbsUp size={11} /> {t.feedbackHelpful}</button>
      <button onClick={() => onFeedback(false)} className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-0.5 text-[10.5px] text-neutral-500 hover:border-neutral-300"><ThumbsDown size={11} /> {t.feedbackNotHelpful}</button>
    </div>
  );
}

function ProcessTrace({ turn, onToggle, t }) {
  const stepCount = turn.steps.length;
  const isCaseFlow = turn.steps.some((s) => s.label === t.toolLabels.operationalRetrieval || s.label === t.toolLabels.caseDirectory || s.type === "decision");
  if (stepCount === 0 && turn.loading) {
    return <div className="flex items-center gap-1.5 text-neutral-400 text-[11.5px] px-1 py-1"><Loader2 size={12} className="animate-spin" /> {t.thinking}</div>;
  }
  if (stepCount === 0) return null;
  const expanded = turn.loading || turn.expanded;
  const verb = isCaseFlow ? t.workingCase : t.lookingInto;
  const verbDone = isCaseFlow ? t.workedCase : t.lookedInto;
  return (
    <div>
      <button onClick={() => !turn.loading && onToggle(turn.id)} className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-700 py-0.5">
        {turn.loading ? <Loader2 size={12} className="animate-spin text-neutral-400" /> : <CheckCircle2 size={12} style={{ color: MAROON }} />}
        <span>{turn.loading ? `${verb}…` : `${verbDone} · ${t.stepLabel(stepCount)}`}</span>
        {!turn.loading && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
      </button>
      {expanded && (
        <div className="flex flex-col gap-1.5 pl-1 pt-1 border-l-2 border-neutral-100 ml-1">
          <div className="flex flex-col gap-1.5 pl-2.5">
            {turn.steps.map((step, i) => {
              if (step.type === "tool") {
                const Icon = step.icon;
                return <ToolCard key={i} icon={Icon} label={step.label} tone={step.tone}>{step.content}</ToolCard>;
              }
              if (step.type === "decision") return <ConfidenceCard key={i} confidence={step.confidence} ruleCited={step.ruleCited} t={t} />;
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* The chat widget itself                                                 */
/* ---------------------------------------------------------------------- */

function ChatWidget({ onClose }) {
  const [turns, setTurns] = useState([]);
  const [convo, setConvo] = useState([]);
  const [input, setInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [citizenName, setCitizenName] = useState(null);
  const [llmSettings, setLlmSettings] = useState(DEFAULT_LLM_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef(null);
  const pendingHistoryRef = useRef({});

  const language = llmSettings.language === "ar" ? "ar" : "en";
  const t = TRANSLATIONS[language];

  useEffect(() => {
    setLlmSettings(loadLlmSettings());
  }, []);

  function handleSaveSettings(next) {
    setLlmSettings(next);
    saveLlmSettings(next);
    setSettingsOpen(false);
  }

  function handleToggleLanguage() {
    const next = { ...llmSettings, language: language === "ar" ? "en" : "ar" };
    setLlmSettings(next);
    saveLlmSettings(next);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  function updateTurn(id, patch) {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));
  }
  function addStep(id, step) {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, steps: [...t.steps, step] } : t)));
  }

  function runTool(turnId, name, toolInput) {
    if (name === "get_case_details") {
      const result = mockGetCaseDetails(toolInput.case_id);
      if (result.error) {
        addStep(turnId, {
          type: "tool", tone: "maroon", icon: Database, label: t.toolLabels.operationalRetrieval,
          content: (
            <>
              <SystemChain steps={["MCP", "webMethods", "Dynamics"]} />
              <span className="text-red-500">{t.notFound(toolInput.case_id)}</span>
            </>
          ),
        });
        return result;
      }
      addStep(turnId, {
        type: "tool", tone: "maroon", icon: Database, label: t.toolLabels.operationalRetrieval,
        content: (
          <>
            <SystemChain steps={["MCP", "webMethods", "Dynamics"]} />
            <b>{result.case_id}</b> · Status: <b>{result.status}</b> · Codes: {result.reason_codes.join(", ") || "none"}<br />{result.case_history[0]}
          </>
        ),
      });
      return result;
    }
    if (name === "list_citizen_cases") {
      const result = mockListCases();
      addStep(turnId, {
        type: "tool", tone: "maroon", icon: ClipboardList, label: t.toolLabels.caseDirectory,
        content: (
          <>
            <SystemChain steps={["MCP", "webMethods", "Dynamics"]} />
            {result.map((c) => (
              <div key={c.case_id}>
                <b>{c.case_id}</b> — {c.category.replace(/_/g, " ")} · {c.status}
              </div>
            ))}
          </>
        ),
      });
      return result;
    }
    if (name === "search_knowledge_base") {
      const result = mockSearchKnowledge(toolInput.query);
      addStep(turnId, {
        type: "tool", tone: "maroon", icon: Search, label: t.toolLabels.knowledgeRetrieval,
        content: (
          <>
            <SystemChain steps={["GraphRAG", "Vector + Graph"]} />
            {result.map((r) => <div key={r.rule_id}><b>{r.rule_id}</b> — {r.title}</div>)}
          </>
        ),
      });
      return result;
    }
    if (name === "query_enterprise_data") {
      const result = mockEnterpriseData();
      addStep(turnId, {
        type: "tool", tone: "maroon", icon: ClipboardList, label: t.toolLabels.enterpriseData,
        content: (
          <>
            <SystemChain steps={["MCP", "webMethods", "EDW / SQL Server"]} />
            {result.benefit_trend}
          </>
        ),
      });
      return result;
    }
    if (name === "submit_decision") {
      addStep(turnId, { type: "tool", tone: "gold", icon: Brain, label: t.toolLabels.aiInferencing, content: <>{t.reasoningComplete}</> });
      addStep(turnId, { type: "decision", confidence: toolInput.confidence, ruleCited: toolInput.rule_cited });
      return { ok: true, recorded: true };
    }
    return { ok: false, error: "unknown tool" };
  }

  async function callLLM(messages, authState) {
    // Calls our own Next.js API route (app/api/chat/route.js), which resolves
    // Anthropic vs. OpenAI (gpt-4o-mini) server-side and forwards the request.
    // Never call api.anthropic.com / api.openai.com directly from client-side
    // code — that would require exposing an API key in the browser. Optional
    // user-supplied keys from the settings gear icon ride along as headers;
    // the server falls back to its own env vars for whichever is blank.
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(llmSettings.anthropicKey ? { "x-anthropic-key": llmSettings.anthropicKey } : {}),
        ...(llmSettings.openaiKey ? { "x-openai-key": llmSettings.openaiKey } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: buildSystemPrompt(authState, language),
        stop_sequences: ["</use_tool>"],
        messages,
        provider: llmSettings.provider || "auto",
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.error) || `API error ${res.status}`);
    return data;
  }

  function extractToolCall(text) {
    // Anthropic reliably emits name="X">{...}, but cheaper/smaller models
    // (e.g. gpt-4o-mini) sometimes drift — e.g. name="X":{...} with no
    // closing tag. Tolerate an optional ":" or ">" (or neither) between the
    // name attribute and the JSON args, and strip a trailing </use_tool> if
    // the model included it instead of being cut off by the stop sequence.
    const m = text.match(/<use_tool\s+name="([^"]+)"\s*[:>]?\s*([\s\S]*)$/);
    if (!m) return null;
    const name = m[1];
    const jsonStr = m[2].trim().replace(/<\/use_tool>\s*$/, "").trim();
    try { return { name, args: JSON.parse(jsonStr), preface: text.slice(0, m.index).trim() }; }
    catch { return { name, args: {}, preface: text.slice(0, m.index).trim(), parseError: true }; }
  }

  async function runAgentLoop(turnId, startHistory, authState) {
    let history = startHistory;
    try {
      for (let i = 0; i < 8; i++) {
        const data = await callLLM(history, authState);
        const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
        const call = data.stop_reason === "stop_sequence" ? extractToolCall(text) : null;

        if (call && call.parseError) {
          updateTurn(turnId, { error: t.errorGeneric, loading: false, expanded: false });
          setConvo(history);
          return;
        }
        if (call && call.name === "request_login") {
          const closedHistory = [...history, { role: "assistant", content: text + "</use_tool>" }];
          pendingHistoryRef.current[turnId] = closedHistory;
          updateTurn(turnId, { pendingLogin: true, loginPreface: call.preface, loading: false, expanded: false });
          setConvo(closedHistory);
          return;
        }
        if (call) {
          const result = runTool(turnId, call.name, call.args);
          history = [...history, { role: "assistant", content: text + "</use_tool>" }];
          history = [...history, { role: "user", content: `<tool_result name="${call.name}">${JSON.stringify(result)}</tool_result>` }];
          continue;
        }
        updateTurn(turnId, { assistantText: text.trim(), loading: false, expanded: false });
        history = [...history, { role: "assistant", content: text }];
        setConvo(history);
        return;
      }
      updateTurn(turnId, { error: t.errorTooManySteps, loading: false, expanded: false });
      setConvo(history);
    } catch (err) {
      updateTurn(turnId, { error: err.message || t.errorFallback, loading: false, expanded: false });
    }
  }

  async function handleSend(text) {
    const userText = (text ?? input).trim();
    if (!userText || isBusy) return;
    setInput("");
    const turnId = "turn-" + Date.now() + Math.random();
    setTurns((prev) => [...prev, { id: turnId, userText, steps: [], loading: true, expanded: true, assistantText: null, error: null, feedbackGiven: false, pendingLogin: false, loginPreface: null }]);
    const history = [...convo, { role: "user", content: userText }];
    await runAgentLoop(turnId, history, { authenticated, name: citizenName });
  }

  function handleLoginClick(turnId) {
    const baseHistory = pendingHistoryRef.current[turnId] || convo;
    delete pendingHistoryRef.current[turnId];
    const name = MOCK_CITIZEN_NAME;
    setAuthenticated(true);
    setCitizenName(name);
    updateTurn(turnId, { pendingLogin: false, loading: true, expanded: true });
    const resumedHistory = [...baseHistory, { role: "user", content: `<tool_result name="request_login">${JSON.stringify({ authenticated: true, name })}</tool_result>` }];
    runAgentLoop(turnId, resumedHistory, { authenticated: true, name });
  }

  function toggleExpand(turnId) {
    updateTurn(turnId, (t) => ({ expanded: !t.expanded }));
  }
  function handleFeedback(turnId) {
    updateTurn(turnId, { feedbackGiven: true });
  }
  function handleSignOut() {
    setAuthenticated(false);
    setCitizenName(null);
    setConvo([]);
    setTurns((prev) => [...prev, { id: "divider-" + Date.now(), type: "divider" }]);
  }
  function handleResetConversation() {
    setAuthenticated(false);
    setCitizenName(null);
    setConvo([]);
    setTurns([]);
    pendingHistoryRef.current = {};
  }

  const isBusy = turns.some((t) => t.loading || t.pendingLogin);

  return (
    <div className="relative flex flex-col bg-white" style={{ height: "100%" }} dir={t.dir} lang={language}>
      {/* Widget header */}
      <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${MAROON}, ${MAROON_DARK})`, flexShrink: 0 }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/15">
            <MessageCircle size={16} />
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight">{t.headerTitle}</div>
            <div className="text-[10.5px] text-white/70 leading-tight">
              {authenticated ? t.headerSubtitleAuth(citizenName) : t.headerSubtitleGuest}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {authenticated && !isBusy && (
            <button onClick={handleSignOut} className="text-[10.5px] text-white/70 hover:text-white underline underline-offset-2">{t.signOut}</button>
          )}
          <button
            onClick={handleToggleLanguage}
            title={t.languageToggleTitle}
            className="flex items-center gap-1 rounded-md border border-white/25 px-1.5 py-0.5 text-[10.5px] font-semibold text-white/90 hover:text-white hover:border-white/50"
          >
            <Globe size={13} />
            {language === "ar" ? "EN" : "عربي"}
          </button>
          <button onClick={handleResetConversation} disabled={isBusy} title={t.newConversationTitle} className="text-white/80 hover:text-white disabled:opacity-40"><RefreshCw size={15} /></button>
          <button onClick={() => setSettingsOpen(true)} title={t.settingsTitle} className="text-white/80 hover:text-white"><Settings size={16} /></button>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={17} /></button>
        </div>
      </div>

      {settingsOpen && (
        <SettingsPanel settings={llmSettings} onSave={handleSaveSettings} onClose={() => setSettingsOpen(false)} t={t} />
      )}

      {/* Chat body */}
      <div ref={scrollRef} className="px-3.5 py-3.5" style={{ background: PAPER, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
        <div className="flex flex-col gap-2.5">
          {turns.length === 0 && (
            <div className="text-center text-neutral-400 text-[12px] mt-8 px-2">
              <MessageSquare size={20} className="mx-auto mb-2 text-neutral-300" />
              {t.emptyStateText}
              <div className="flex flex-col gap-1.5 mt-3">
                {t.examples.map((ex) => (
                  <button key={ex} onClick={() => handleSend(ex)} className={`rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11.5px] text-neutral-600 hover:border-neutral-300 ${language === "ar" ? "text-right" : "text-left"}`}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, i) => {
            if (turn.type === "divider") {
              return (
                <div key={turn.id} className="flex items-center gap-2 my-0.5">
                  <div className="flex-1 border-t border-dashed border-neutral-200" />
                  <span className="text-[9.5px] font-medium tracking-wide uppercase text-neutral-400">{t.signedOutDivider}</span>
                  <div className="flex-1 border-t border-dashed border-neutral-200" />
                </div>
              );
            }
            return (
              <div key={turn.id} className="flex flex-col gap-1.5">
                <div className="self-end max-w-[85%] rounded-lg text-white px-3 py-2 text-[12.5px]" style={{ background: INK }} dir="auto">
                  {turn.userText}
                </div>

                <ProcessTrace turn={turn} onToggle={toggleExpand} t={t} />

                {turn.pendingLogin && (
                  <div className="flex flex-col gap-1.5">
                    {turn.loginPreface && (
                      <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2 text-[12.5px] text-neutral-800 leading-relaxed" dir="auto">{turn.loginPreface}</div>
                    )}
                    <LoginCard onLogin={() => handleLoginClick(turn.id)} t={t} />
                  </div>
                )}

                {turn.assistantText && (
                  <div>
                    <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2 text-[12.5px] text-neutral-800 leading-relaxed" dir="auto">
                      <FormattedText text={turn.assistantText} />
                    </div>
                    <FeedbackRow given={turn.feedbackGiven} onFeedback={() => handleFeedback(turn.id)} t={t} />
                  </div>
                )}

                {turn.assistantText && i === turns.length - 1 && !isBusy && (
                  <FollowUpChips turn={turn} onPick={handleSend} t={t} />
                )}

                {turn.error && (
                  <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-[11.5px]">{turn.error}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 bg-white px-3 py-2.5" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t.inputPlaceholder}
            dir="auto"
            className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-[12.5px] outline-none focus:border-neutral-400"
          />
          <button
            onClick={() => handleSend()}
            disabled={isBusy || !input.trim()}
            className="flex items-center justify-center rounded-md w-9 h-9 text-white disabled:opacity-40 shrink-0"
            style={{ background: MAROON }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Homepage — representative recreation of moce.gov.ae's real content     */
/* structure (nav labels, hero copy, service tiles, footer columns) with  */
/* an approximated maroon/gold visual theme.                              */
/* ---------------------------------------------------------------------- */

function TopBar() {
  return (
    <div className="hidden md:block text-[11px] border-b" style={{ background: SAND, borderColor: "#E7DCC4" }}>
      <div className="max-w-[1200px] mx-auto px-6 h-8 flex items-center justify-between" style={{ color: MAROON }}>
        <div className="flex items-center gap-4 opacity-80">
          <span>UAE Government Portal</span>
        </div>
        <div className="flex items-center gap-4 opacity-80">
          <button className="flex items-center gap-1 hover:opacity-100"><Globe size={12} /> العربية</button>
          <button className="hover:opacity-100">Accessibility</button>
          <button className="hover:opacity-100">Login</button>
        </div>
      </div>
    </div>
  );
}

function MoceLogo({ height = 36, light = false }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-md font-bold"
          style={{ height, width: height, background: light ? "rgba(255,255,255,0.15)" : MAROON, color: "white", fontSize: height * 0.32 }}
        >
          M
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-bold" style={{ color: light ? "white" : INK }}>Ministry of Community</div>
          <div className="text-[13px] font-bold -mt-0.5" style={{ color: light ? "rgba(255,255,255,0.8)" : MAROON }}>Empowerment</div>
        </div>
      </div>
    );
  }
  return (
    <img
      src="https://www.moce.gov.ae/documents/d/guest/uae_moce_horizontal_cmyk_e"
      alt="Ministry of Community Empowerment"
      style={{ height, width: "auto" }}
      onError={() => setFailed(true)}
    />
  );
}

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = ["Home", "About", "Services", "Digital Participation", "Open Data", "Media Center", "Contact Us"];
  return (
    <div className="bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MoceLogo height={34} />
        </div>
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <button key={item} className="text-[13px] font-medium text-neutral-600 hover:text-[--maroon] flex items-center gap-1" style={{ "--maroon": MAROON }}>
              {item}
            </button>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <button className="text-[12.5px] font-semibold px-3 py-1.5 rounded-md" style={{ color: MAROON }}>Ask Us</button>
          <button className="text-[12.5px] font-semibold text-white px-4 py-1.5 rounded-md" style={{ background: MAROON }}>Login</button>
        </div>
        <button className="lg:hidden" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <div className="lg:hidden border-t border-neutral-100 px-6 py-3 flex flex-col gap-2.5">
          {navItems.map((item) => <span key={item} className="text-[13px] text-neutral-600">{item}</span>)}
        </div>
      )}
    </div>
  );
}

function Hero() {
  const searches = ["Social Welfare Program", "NPO Sector", "Volunteerism", "NPO Empowerment Fund"];
  const pills = [
    { text: "An empowered", style: { background: GOLD } },
    { text: "flourishing", style: { background: `linear-gradient(135deg, #8A9A3A, #C9C24A)` } },
    { text: "and", style: { background: MAROON } },
    { text: "stable community", style: { background: `linear-gradient(135deg, #C9C24A, #8A9A3A)` } },
  ];
  return (
    <div className="relative overflow-hidden" style={{ background: PAPER }}>
      <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20 text-center">
        <h1 className="text-3xl md:text-[46px] font-extrabold leading-tight max-w-3xl mx-auto" style={{ color: MAROON }}>
          Future Built by the Community, for the Community
        </h1>

        <div className="mt-9 max-w-2xl mx-auto flex items-center gap-3 bg-white rounded-full px-5 py-3.5 border" style={{ borderColor: "#E7DCC4" }}>
          <Mic size={18} style={{ color: GOLD }} />
          <input placeholder="Search here" className="flex-1 outline-none text-[14px] px-1 text-neutral-500" />
        </div>

        <div className="mt-6 flex flex-wrap justify-center items-center gap-2.5">
          <span className="text-[13px] font-medium text-neutral-700 mr-1">Popular Searches:</span>
          {searches.map((s) => (
            <span
              key={s}
              className="text-[12.5px] font-medium rounded-full px-4 py-2 border cursor-default"
              style={{ borderColor: MAROON, color: MAROON }}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {pills.map((p) => (
            <span
              key={p.text}
              className="text-white font-extrabold text-[18px] md:text-[22px] rounded-full px-6 py-3.5"
              style={p.style}
            >
              {p.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceTiles() {
  const tiles = [
    { title: "Social Welfare Application", desc: "Monthly financial assistance for Emirati families with limited income, including basic and supplementary allowances.", tag: "Social Welfare" },
    { title: "Applying for Inflation Allowance", desc: "Temporary monthly support for households under AED 25,000/month, covering fuel, food, and electricity & water.", tag: "Inflation Allowance" },
    { title: "Inquiry Service", desc: "Ask about the Ministry's services, initiatives, events, or the status of a previously submitted application.", tag: "Support" },
    { title: "Complaints Service", desc: "Submit feedback or complaints about applications, procedures, or programs to help us improve.", tag: "Support" },
  ];
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-14">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: INK }}>Start here</h2>
        <button className="text-[12.5px] font-semibold flex items-center gap-1" style={{ color: MAROON }}>
          All services <ArrowRight size={13} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div key={t.title} className="rounded-lg border border-neutral-200 bg-white p-5 hover:shadow-md transition-shadow flex flex-col">
            <span className="text-[10px] font-semibold tracking-wide uppercase mb-2" style={{ color: GOLD }}>{t.tag}</span>
            <h3 className="text-[14px] font-bold mb-2" style={{ color: INK }}>{t.title}</h3>
            <p className="text-[12.5px] text-neutral-500 leading-relaxed flex-1">{t.desc}</p>
            <div className="flex items-center gap-1 text-[12px] font-semibold mt-4" style={{ color: MAROON }}>
              Learn more <ArrowRight size={13} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedProgram() {
  return (
    <div style={{ background: SAND }}>
      <div className="max-w-[1200px] mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="text-[10.5px] font-semibold tracking-wide uppercase" style={{ color: MAROON }}>Federal Initiative</span>
          <h2 className="text-2xl font-bold mt-2 mb-3" style={{ color: INK }}>Social Welfare Program</h2>
          <p className="text-[13.5px] text-neutral-600 leading-relaxed mb-5">
            A government support program aimed at enhancing the quality of life for Emirati individuals and families
            with low income — offering a comprehensive system of monthly allowances tailored to each family's needs,
            including the Inflation Allowance for food, fuel, and electricity & water.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="text-[12.5px] font-semibold text-white px-4 py-2 rounded-md" style={{ background: MAROON }}>
              Social Welfare Program
            </button>
            <button className="text-[12.5px] font-semibold px-4 py-2 rounded-md border" style={{ color: MAROON, borderColor: MAROON }}>
              Allowance Calculator
            </button>
          </div>
        </div>
        <div className="rounded-xl h-56 md:h-64" style={{ background: `linear-gradient(135deg, ${MAROON}, ${GOLD})`, opacity: 0.85 }} />
      </div>
    </div>
  );
}

function Footer() {
  const columns = [
    { title: "The Ministry", links: ["About us", "Careers", "Customers Happiness Centers"] },
    { title: "Using the website", links: ["Copyrights", "Disclaimer", "Privacy Policy", "Terms and Conditions"] },
    { title: "Information and support", links: ["Media Center", "Contact Us", "FAQ", "Sitemap"] },
    { title: "Quick Links", links: ["Ministry Publication", "Media Kit", "Services Guide"] },
  ];
  return (
    <footer style={{ background: INK }} className="text-white/70">
      <div className="max-w-[1200px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-white text-[12.5px] font-bold mb-3 uppercase tracking-wide">{col.title}</h4>
            <ul className="flex flex-col gap-2">
              {col.links.map((l) => <li key={l} className="text-[12.5px] hover:text-white cursor-default">{l}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[12px]">
            <span className="flex items-center gap-1.5"><Phone size={13} /> Toll free: 800623</span>
            <span className="flex items-center gap-1.5"><Mail size={13} /> info@moce.gov.ae</span>
          </div>
          <div className="flex items-center gap-3">
            <Facebook size={15} />
            <Instagram size={15} />
            <Twitter size={15} />
            <Youtube size={15} />
          </div>
        </div>
      </div>
      <div className="text-center text-[11px] text-white/40 py-3 border-t border-white/10">
        © 2026 Ministry of Community Empowerment. All rights reserved.
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------------- */
/* Root: homepage + floating collapsible chat widget                      */
/* ---------------------------------------------------------------------- */

export default function MoCEWebsiteWithWidget() {
  const [open, setOpen] = useState(false);

  function handleClose() {
    // Just hides the panel — ChatWidget stays mounted so its auth state and
    // conversation survive minimize/reopen. Only the explicit "Sign out"
    // button (inside ChatWidget) should end the session.
    setOpen(false);
  }

  return (
    <div style={{ background: PAPER }} className="h-screen w-full relative overflow-hidden">
      {/* Scrollable homepage content, confined to this fixed-height frame so the
          overall page box never grows with chat content (which has its own
          internal scroll inside the widget). */}
      <div className="h-full w-full overflow-y-auto">
        <TopBar />
        <NavBar />
        <Hero />
        <ServiceTiles />
        <FeaturedProgram />
        <Footer />
      </div>

      {/* Floating widget panel — absolutely positioned within the fixed frame
          above. Sizing is set via inline style (not Tailwind arbitrary
          classes) so it's guaranteed to apply regardless of what arbitrary
          values this renderer's Tailwind build supports. */}
      <div
        className="absolute rounded-2xl shadow-2xl overflow-hidden z-40"
        style={{
          bottom: 96,
          right: 24,
          width: 460,
          maxWidth: "calc(100vw - 2rem)",
          height: "68vh",
          minHeight: 420,
          maxHeight: "calc(100vh - 6rem)",
          transformOrigin: "bottom right",
          transition: "transform 0.2s ease, opacity 0.2s ease",
          transform: open ? "scale(1)" : "scale(0.9)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <ChatWidget onClose={handleClose} />
      </div>

      {/* Launcher button */}
      <button
        onClick={() => (open ? handleClose() : setOpen(true))}
        className="absolute rounded-full shadow-xl flex items-center justify-center text-white z-40 hover:scale-105 transition-transform"
        style={{ bottom: 24, right: 24, height: 56, width: 56, background: `linear-gradient(135deg, ${MAROON}, ${MAROON_DARK})` }}
      >
        {open ? <Minus size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
