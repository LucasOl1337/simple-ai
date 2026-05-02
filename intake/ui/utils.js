import { buildSummary } from "../engine";
import {
  STORAGE_KEY,
  BUILD_STORAGE_KEY,
  NOTE_LAYOUT_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  ACTIVE_CHAT_SESSION_STORAGE_KEY,
  THEME_STORAGE_KEY,
  BUILDER_MODEL_OPTIONS,
  BUILDER_MODEL_STORAGE_KEY,
  DEFAULT_BUILDER_MODEL,
  AUTO_TEST_SCENARIOS,
  OPENING_MESSAGE,
} from "./constants";

export function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function pickAutoTestScenario(previousId = null) {
  const official = AUTO_TEST_SCENARIOS.find((scenario) => scenario.id === "napassarela");
  if (official) return official;
  const pool = AUTO_TEST_SCENARIOS.filter((scenario) => scenario.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)] ?? AUTO_TEST_SCENARIOS[0];
}

export function buildAutoTestAnswer(question, scenario) {
  const answers = {
    initial_description: scenario.opening,
    what_you_do: scenario.whatYouDo,
    brand_name: scenario.businessName,
    target_audience: scenario.audience,
    scope: scenario.scope,
    primary_action: scenario.action,
    current_channels: scenario.channels,
    existing_presence: scenario.presence,
    content_volume: scenario.volume,
    has_media: scenario.media,
    faq_content: scenario.faq,
    pricing_strategy: scenario.pricing,
    feature_booking: scenario.booking,
    feature_selling: scenario.selling,
    feature_area_cliente: scenario.auth,
    feature_simplify: "Pode começar simples.",
    visual_reference: scenario.visual,
    brand_tone: scenario.visual,
    brand_assets: scenario.brandAssets,
  };
  return answers[question.id] || scenario.opening;
}

export function createChatSessionRecord(overrides = {}) {
  const id = overrides.id ?? `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  return {
    id,
    title: overrides.title ?? "Nova sessão",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    session: overrides.session ?? null,
    buildState: overrides.buildState ?? null,
  };
}

export function readStoredSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readStoredBuild() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BUILD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isFilled(value, invalid = []) {
  if (!value) return false;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !invalid.map((item) => item.toLowerCase()).includes(normalized);
}

export function getSessionTitle(session, buildState, fallback = "Nova sessão") {
  if (session) {
    const summary = buildSummary(session);
    if (isFilled(summary.brand_name, ["Não definido", "Não definido"])) {
      return summary.brand_name;
    }
    const firstUserMessage = session.transcript?.find((message) => message.role === "user")?.content;
    if (firstUserMessage) {
      return firstUserMessage.length > 34
        ? `${firstUserMessage.slice(0, 34).trim()}...`
        : firstUserMessage;
    }
  }
  if (buildState?.site_url) return "Site pronto";
  return fallback;
}

export function getSessionAgeLabel(updatedAt) {
  if (!updatedAt) return "";
  const diff = Date.now() - updatedAt;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export function getPublicSiteUrl(buildState) {
  const siteUrl = buildState?.preview_url || buildState?.site_url;
  if (!siteUrl) return "";
  if (/^https?:\/\//i.test(siteUrl)) return siteUrl;
  // Keep the URL relative so Vite's dev-server proxy (or production
  // reverse-proxy) forwards /api/sites/* to whatever port the backend
  // is on. Hardcoding localhost:8000 broke when the backend moved off
  // that port (APEX collision -> Simple.AI now on 8002).
  return siteUrl;
}

export function readStoredChatWorkspace() {
  if (typeof window === "undefined") {
    const firstSession = createChatSessionRecord();
    return { activeId: firstSession.id, sessions: [firstSession] };
  }
  try {
    const raw = window.localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sessions = Array.isArray(parsed.sessions)
        ? parsed.sessions.filter((item) => item?.id)
        : [];
      const activeId = parsed.activeId || window.localStorage.getItem(ACTIVE_CHAT_SESSION_STORAGE_KEY);
      if (sessions.length > 0) {
        return {
          activeId: sessions.some((item) => item.id === activeId) ? activeId : sessions[0].id,
          sessions,
        };
      }
    }
  } catch {
    /* fall through to legacy migration */
  }
  const legacySession = readStoredSession();
  const legacyBuild = readStoredBuild();
  const migrated = createChatSessionRecord({
    title: getSessionTitle(legacySession, legacyBuild, "Abrir localhost 5175"),
    session: legacySession,
    buildState: legacyBuild,
  });
  return { activeId: migrated.id, sessions: [migrated] };
}

export function readStoredNoteLayout(sessionId = "default") {
  if (typeof window === "undefined") return {};
  try {
    const raw =
      window.localStorage.getItem(`${NOTE_LAYOUT_STORAGE_KEY}:${sessionId}`) ??
      window.localStorage.getItem(NOTE_LAYOUT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function readStoredTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch {
    return "dark";
  }
}

export function readStoredBuilderModel() {
  if (typeof window === "undefined") return DEFAULT_BUILDER_MODEL;
  try {
    const stored = window.localStorage.getItem(BUILDER_MODEL_STORAGE_KEY);
    if (BUILDER_MODEL_OPTIONS.some((option) => option.id === stored)) return stored;
    return DEFAULT_BUILDER_MODEL;
  } catch {
    return DEFAULT_BUILDER_MODEL;
  }
}

export function buildKnownNotes(summary) {
  const items = [];
  if (isFilled(summary.business_type, ["Não identificado"])) {
    items.push(summary.business_type);
  }
  if (isFilled(summary.brand_name, ["Não definido"])) {
    items.push(summary.brand_name);
  }
  if (isFilled(summary.primary_cta, ["Entrar em contato"])) {
    items.push(summary.primary_cta);
  }
  if (isFilled(summary.target_audience, ["Não definido"])) {
    items.push(summary.target_audience);
  }
  return items.slice(0, 4);
}

export function buildMissingNotes(currentQuestion, notepadState) {
  const labels = {
    brand_name: "nome do negócio",
    business_type: "tipo de negócio",
    primary_cta: "ação principal",
    target_audience: "público",
    scope: "cidade ou região",
  };
  const items = [];
  if (currentQuestion) {
    items.push(currentQuestion.question);
  }
  [...notepadState.missingCritical, ...notepadState.missingImportant]
    .filter((field, index, array) => array.indexOf(field) === index)
    .slice(0, 2)
    .forEach((field) => {
      if (labels[field]) {
        items.push(`Falta: ${labels[field]}`);
      }
    });
  return items.slice(0, 3);
}

export function isInteractiveTarget(target) {
  return Boolean(target.closest("a, button, input, textarea, select, [role='button']"));
}

export function clampPosition(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
