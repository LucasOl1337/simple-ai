import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TurnStatus } from "agora-agent-client-toolkit";
import logoUrl from "../../assets/logo.png";
import { useAgoraSession } from "../integrations/agora/useAgoraSession";
import {
  buildSummary,
  createSession,
  getCurrentQuestion,
  getNotepadState,
  submitAnswer,
} from "../features/discovery/planner";

const LaunchSequencePlayer = lazy(() => import("../remotion/LaunchSequence"));
const JourneyShareClipPlayer = lazy(() => import("../remotion/JourneyShareClip"));
const OnboardingLoopPlayer = lazy(() => import("../remotion/OnboardingLoop"));

const STORAGE_KEY = "simple-ai-whiteboard-v5";
const BUILD_STORAGE_KEY = "simple-ai-build-v1";
const NOTE_LAYOUT_STORAGE_KEY = "simple-ai-note-layout-v2";
const CHAT_SESSIONS_STORAGE_KEY = "simple-ai-chat-sessions-v1";
const ACTIVE_CHAT_SESSION_STORAGE_KEY = "simple-ai-active-chat-session-v1";
const THEME_STORAGE_KEY = "simple-ai-theme-v1";

const AUTO_TEST_SCENARIOS = [
  {
    id: "padaria",
    label: "Padaria de bairro",
    businessName: "Padaria Aurora",
    opening:
      "Tenho uma padaria de bairro e quero um site para mostrar produtos, receber encomendas e falar no WhatsApp.",
    whatYouDo:
      "A gente faz pão, bolo, salgados e encomendas para festa.",
    audience: "Famílias do bairro e gente que passa cedo pela região.",
    scope: "Atendo só na região central e nos bairros perto da padaria.",
    action: "Quero que a pessoa faça encomenda no WhatsApp.",
    channels: "Hoje o pessoal fala com a gente pelo WhatsApp e no Instagram.",
    presence: "Tenho Instagram e uma página no Google.",
    volume: "Quero mostrar uns 8 itens principais.",
    media: "Tenho fotos do balcão, dos bolos e do Instagram.",
    faq: "Horário, entrega e bolo por encomenda.",
    pricing: "Quero mostrar alguns preços e deixar o resto sob orçamento.",
    booking: "não",
    selling: "não",
    auth: "não",
    visual: "Quero um visual acolhedor, limpo e confiável.",
    brandAssets: "Tenho logo em vermelho e branco.",
  },
  {
    id: "oficina",
    label: "Oficina mecânica",
    businessName: "Auto Center Silva",
    opening:
      "Tenho uma oficina mecânica e quero um site para mostrar serviços, passar confiança e pedir orçamento no WhatsApp.",
    whatYouDo:
      "A gente faz revisão, freio, troca de óleo e manutenção em geral.",
    audience: "Motoristas da região, principalmente quem precisa resolver rápido.",
    scope: "Atendo na cidade inteira e também recebo alguns clientes de bairros vizinhos.",
    action: "Quero que a pessoa peça orçamento pelo WhatsApp.",
    channels: "Hoje fechamos pelo WhatsApp, telefone e indicação.",
    presence: "Tenho Instagram com fotos de serviços e comentários de clientes.",
    volume: "Quero mostrar 5 serviços principais.",
    media: "Tenho fotos reais da oficina e dos carros atendidos.",
    faq: "Tempo de serviço, garantia e formas de pagamento.",
    pricing: "Prefiro pedir orçamento.",
    booking: "não",
    selling: "não",
    auth: "não",
    visual: "Quero algo profissional e forte, sem cara de site genérico.",
    brandAssets: "Tenho logo azul e prata.",
  },
  {
    id: "clinica",
    label: "Clínica de estética",
    businessName: "Clínica Aura",
    opening:
      "Tenho uma clínica de estética e preciso de um site bonito para mostrar tratamentos e agendar pelo WhatsApp.",
    whatYouDo:
      "Fazemos limpeza de pele, botox, harmonização e protocolos faciais.",
    audience: "Mulheres que procuram cuidado com a pele e atendimento personalizado.",
    scope: "Atendo em um bairro fixo, com público da cidade toda.",
    action: "Quero agendamento e contato rápido.",
    channels: "As clientes chegam pelo Instagram e pelo WhatsApp.",
    presence: "Tenho Instagram forte e algumas avaliações boas no Google.",
    volume: "Quero mostrar poucos tratamentos, mas com mais detalhe.",
    media: "Tenho fotos de antes e depois e imagens da clínica.",
    faq: "Tempo de sessão, indicação e valores.",
    pricing: "Prefiro mostrar alguns valores e deixar o restante sob consulta.",
    booking: "sim",
    selling: "não",
    auth: "não",
    visual: "Quero uma sensação premium, leve e moderna.",
    brandAssets: "Tenho logo dourado e branco.",
  },
  {
    id: "salao",
    label: "Salão de beleza",
    businessName: "Studio Bela",
    opening:
      "Tenho um salão de beleza e quero um site para mostrar serviços, atrair clientes e marcar horário.",
    whatYouDo:
      "Faço cabelo, unhas, sobrancelha e maquiagem.",
    audience: "Público feminino da região e clientes que gostam de cuidar da aparência.",
    scope: "Atendo só na minha cidade.",
    action: "Quero que a pessoa marque horário.",
    channels: "Hoje o agendamento vai por WhatsApp e Instagram.",
    presence: "Tenho Instagram e várias fotos de trabalhos.",
    volume: "Quero mostrar 6 serviços principais.",
    media: "Tenho fotos boas e vídeos curtos.",
    faq: "Duração do atendimento, horário de sábado e formas de pagamento.",
    pricing: "Quero mostrar valores básicos.",
    booking: "sim",
    selling: "não",
    auth: "não",
    visual: "Quero algo moderno, feminino e acolhedor.",
    brandAssets: "Tenho logo rosa e branco.",
  },
  {
    id: "loja",
    label: "Loja de roupas",
    businessName: "Moda Viva",
    opening:
      "Tenho uma loja de roupas e quero um site para mostrar catálogo, separar novidades e receber pedidos.",
    whatYouDo:
      "Vendemos roupas femininas, acessórios e peças de temporada.",
    audience: "Mulheres que compram pela internet e também quem passa na loja.",
    scope: "Atendo online e também na loja física.",
    action: "Quero receber pedidos e chamar para comprar.",
    channels: "Hoje a maioria fala com a gente pelo Instagram e WhatsApp.",
    presence: "Tenho Instagram com catálogo e algumas campanhas antigas.",
    volume: "Quero mostrar bastante coisa, mas com organização.",
    media: "Tenho fotos de catálogo e ensaios.",
    faq: "Troca, envio, tamanho e prazo de entrega.",
    pricing: "Quero mostrar alguns preços e promoções.",
    booking: "não",
    selling: "sim",
    auth: "não",
    visual: "Quero um visual elegante e comercial.",
    brandAssets: "Tenho logo minimalista em preto e bege.",
  },
];

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pickAutoTestScenario(previousId = null) {
  const pool = AUTO_TEST_SCENARIOS.filter((scenario) => scenario.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)] ?? AUTO_TEST_SCENARIOS[0];
}

function buildAutoTestAnswer(question, scenario) {
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

function createChatSessionRecord(overrides = {}) {
  const id = overrides.id ?? `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  return {
    id,
    title: overrides.title ?? "Nova sessao",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    session: overrides.session ?? null,
    buildState: overrides.buildState ?? null,
  };
}
const OPENING_MESSAGE = "Oi. Me conta o que você quer criar.";

function readStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredBuild() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(BUILD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSessionTitle(session, buildState, fallback = "Nova sessao") {
  if (session) {
    const summary = buildSummary(session);
    if (isFilled(summary.brand_name, ["NÃ£o definido", "Não definido"])) {
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

function getSessionAgeLabel(updatedAt) {
  if (!updatedAt) return "";

  const diff = Date.now() - updatedAt;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  return `${Math.floor(hours / 24)} d`;
}

function getPublicSiteUrl(buildState) {
  const siteUrl = buildState?.preview_url || buildState?.site_url;
  if (!siteUrl) return "";
  if (/^https?:\/\//i.test(siteUrl)) return siteUrl;

  if (siteUrl.startsWith("/api/sites/")) {
    return `http://localhost:8000${siteUrl.replace(/^\/api/, "")}`;
  }

  return siteUrl;
}

function readStoredChatWorkspace() {
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

function readStoredNoteLayout(sessionId = "default") {
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

function readStoredTheme() {
  if (typeof window === "undefined") return "dark";

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch {
    return "dark";
  }
}

function isFilled(value, invalid = []) {
  if (!value) return false;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !invalid.map((item) => item.toLowerCase()).includes(normalized);
}

function normalizeMessageText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getVoiceTurnStatus(turn) {
  return String(turn?.status ?? "").toLowerCase();
}

function isVoiceTurnInProgress(turn) {
  const status = getVoiceTurnStatus(turn);
  return turn?.status === TurnStatus.IN_PROGRESS || status.includes("progress");
}

function createVoiceCommitKey(questionId, text) {
  return `${questionId || "no-question"}::${normalizeMessageText(text)}`;
}

function rememberVoiceCommit(cache, key, timestamp = Date.now()) {
  cache.set(key, timestamp);

  if (cache.size > 80) {
    const oldest = [...cache.entries()].sort((first, second) => first[1] - second[1]).slice(0, 24);
    oldest.forEach(([oldKey]) => cache.delete(oldKey));
  }
}

function removePlannerAssistantEcho(previousSession, nextSession, answer) {
  const previousLength = previousSession?.transcript?.length ?? 0;
  const transcript = nextSession?.transcript ?? [];
  const assistantIndex = previousLength;
  const userIndex = previousLength + 1;
  const assistantTurn = transcript[assistantIndex];
  const userTurn = transcript[userIndex];

  if (
    assistantTurn?.role !== "assistant" ||
    userTurn?.role !== "user" ||
    normalizeMessageText(userTurn.content) !== normalizeMessageText(answer)
  ) {
    return nextSession;
  }

  return {
    ...nextSession,
    transcript: [
      ...transcript.slice(0, assistantIndex),
      userTurn,
      ...transcript.slice(userIndex + 1),
    ],
  };
}

function buildKnownNotes(summary) {
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

function buildMissingNotes(currentQuestion, notepadState) {
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

function isInteractiveTarget(target) {
  return Boolean(
    target.closest("a, button, input, textarea, select, [role='button']"),
  );
}

function clampPosition(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let nodes = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(72, Math.max(38, Math.floor(width / 22)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
      }));
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(229, 165, 91, 0.52)";
      context.strokeStyle = "rgba(229, 165, 91, 0.12)";

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > 126) continue;
          context.globalAlpha = (1 - distance / 126) * 0.54;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }

      context.globalAlpha = 1;
      for (const node of nodes) {
        context.beginPath();
        context.arc(node.x, node.y, 1.35, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas aria-hidden="true" className="particle-field" ref={canvasRef} />;
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="theme-toggle"
      onClick={onToggle}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle-track">
        <i />
      </span>
      <strong>{isDark ? "Dark" : "Light"}</strong>
    </button>
  );
}

function SessionRail({
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onSelectSession,
  sessions,
}) {
  return (
    <nav className="session-rail" aria-label="Sessoes do projeto">
      <div className="session-rail-head">
        <span>Projeto</span>
        <button
          aria-label="Criar nova sessao"
          className="session-new-button"
          onClick={onCreateSession}
          type="button"
        >
          +
        </button>
      </div>

      <div className="session-project">
        <span className="session-folder" aria-hidden="true" />
        <strong>simple-ai</strong>
      </div>

      <div className="session-list">
        {sessions.map((item) => (
          <div
            className={`session-row ${item.id === activeSessionId ? "is-active" : ""}`}
            key={item.id}
          >
            <button
              className="session-item"
              onClick={() => onSelectSession(item.id)}
              type="button"
            >
              <span className="session-item-main">
                <span className="session-item-title">{item.title || "Nova sessao"}</span>
                {getPublicSiteUrl(item.buildState) ? <span className="session-site-pill">site</span> : null}
              </span>
              <span className="session-item-time">{getSessionAgeLabel(item.updatedAt)}</span>
            </button>
            <button
              aria-label={`Excluir sessao ${item.title || "Nova sessao"}`}
              className="session-delete-button"
              onClick={() => onDeleteSession(item.id)}
              type="button"
            >
                x
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}

function DraggableCard({
  children,
  className,
  defaultPosition,
  layoutId,
  onPositionChange,
  positions,
  ...props
}) {
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const position = positions[layoutId] ?? defaultPosition;

  function handlePointerDown(event) {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;

    const card = cardRef.current;
    const board = card?.parentElement;
    if (!card || !board) return;

    const boardRect = board.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cardRect.left - boardRect.left,
      originY: cardRect.top - boardRect.top,
      maxX: board.clientWidth - card.offsetWidth,
      maxY: board.clientHeight - card.offsetHeight,
    };

    card.setPointerCapture(event.pointerId);
    card.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextX = clampPosition(
      drag.originX + event.clientX - drag.startX,
      0,
      drag.maxX,
    );
    const nextY = clampPosition(
      drag.originY + event.clientY - drag.startY,
      0,
      drag.maxY,
    );

    onPositionChange(layoutId, { x: Math.round(nextX), y: Math.round(nextY) });
  }

  function handlePointerUp(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    cardRef.current?.classList.remove("is-dragging");
    dragRef.current = null;
  }

  function handleKeyDown(event) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    const card = cardRef.current;
    const board = card?.parentElement;
    if (!card || !board) return;

    event.preventDefault();

    const step = event.shiftKey ? 40 : 12;
    const delta = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    }[event.key];

    onPositionChange(layoutId, {
      x: Math.round(
        clampPosition(position.x + delta.x, 0, board.clientWidth - card.offsetWidth),
      ),
      y: Math.round(
        clampPosition(position.y + delta.y, 0, board.clientHeight - card.offsetHeight),
      ),
    });
  }

  return (
    <article
      {...props}
      aria-label={props["aria-label"] ?? "Cartão móvel da lousa"}
      className={`${className} draggable-card`}
      onKeyDown={handleKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={cardRef}
      style={{ left: position.x, top: position.y }}
      tabIndex={0}
    >
      {children}
    </article>
  );
}

function WhiteboardNote({
  items,
  layoutId,
  onPositionChange,
  positions,
  title,
  tone = "plain",
  defaultPosition,
}) {
  return (
    <DraggableCard
      className={`whiteboard-note whiteboard-note-${tone}`}
      defaultPosition={defaultPosition}
      layoutId={layoutId}
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <span>{title}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </DraggableCard>
  );
}

function BrowserPreviewPanel({ siteUrl, onPositionChange, positions }) {
  if (!siteUrl) return null;

  return (
    <DraggableCard
      className="preview-card"
      defaultPosition={{ x: 34, y: 60 }}
      layoutId="preview"
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <div className="preview-chrome" aria-label="Preview do site gerado">
        <div className="preview-toolbar">
          <span className="traffic-dot danger" />
          <span className="traffic-dot wait" />
          <span className="traffic-dot live" />
          <div className="preview-url">{siteUrl}</div>
        </div>
        <iframe className="preview-frame" src={siteUrl} title="Site gerado pelo Simple-AI" />
      </div>
    </DraggableCard>
  );
}

function ShareJourneyModal({ messages, onClose, siteUrl }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="share-modal-backdrop" role="presentation">
      <section className="share-modal" aria-label="Preview do clip social">
        <div className="share-modal-head">
          <div>
            <span>social render</span>
            <h3>Jornada Simple-AI</h3>
          </div>
          <button aria-label="Fechar" className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </div>
        <Suspense fallback={<div className="motion-fallback">loading motion...</div>}>
          <JourneyShareClipPlayer messages={messages} siteUrl={siteUrl} />
        </Suspense>
        <div className="share-modal-actions">
          <button className="build-cta build-cta-secondary" onClick={handleCopy} type="button">
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          <a className="build-cta" href={siteUrl} target="_blank" rel="noreferrer">
            Abrir site
          </a>
        </div>
      </section>
    </div>
  );
}

function BuildingCard({ buildState, onReset, positions, onPositionChange, session }) {
  const [launched, setLaunched] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const publicSiteUrl = getPublicSiteUrl(buildState);
  const shareMessages = useMemo(() => {
    const transcript = session?.transcript?.length
      ? session.transcript
      : [{ role: "assistant", content: OPENING_MESSAGE }];
    return transcript.slice(-6);
  }, [session]);

  useEffect(() => {
    if (buildState.status !== "done" || !buildState.site_url || launched) return undefined;
    const timer = window.setTimeout(() => setLaunched(true), 2100);
    return () => window.clearTimeout(timer);
  }, [buildState.site_url, buildState.status, launched]);

  if (buildState.status === "done" && buildState.site_url) {
    if (!launched) {
      return (
        <DraggableCard
          aria-live="polite"
          className="build-card build-card-launching"
          defaultPosition={{ x: 860, y: 80 }}
          layoutId="build"
          onPositionChange={onPositionChange}
          positions={positions}
        >
          <Suspense fallback={<div className="motion-fallback motion-fallback-launch">_</div>}>
            <LaunchSequencePlayer onEnded={() => setLaunched(true)} />
          </Suspense>
        </DraggableCard>
      );
    }

    return (
      <>
      <DraggableCard
        aria-live="polite"
        className="build-card build-card-done"
        defaultPosition={{ x: 860, y: 80 }}
        layoutId="build"
        onPositionChange={onPositionChange}
        positions={positions}
      >
        <span className="build-card-eyebrow">terminal success</span>
        <h3>Pronto!</h3>
        <p>Seu site está no ar.</p>
        <div className="build-actions">
          <a className="build-cta" href={publicSiteUrl} target="_blank" rel="noreferrer">
            Abrir preview local
          </a>
          <a className="build-cta build-cta-secondary" href={buildState.site_url} target="_blank" rel="noreferrer">
            Abrir no app
          </a>
          <button className="build-cta build-cta-secondary" onClick={() => setIsShareOpen(true)} type="button">
            Compartilhar jornada
          </button>
        </div>
        <div className="site-url-chip">{publicSiteUrl}</div>
        <small>job {buildState.job_id}</small>
        <button className="build-reset" onClick={onReset} type="button">
          começar de novo
        </button>
      </DraggableCard>
      {isShareOpen ? (
        <ShareJourneyModal
          messages={shareMessages}
          onClose={() => setIsShareOpen(false)}
          siteUrl={publicSiteUrl}
        />
      ) : null}
      </>
    );
  }

  if (buildState.status === "error") {
    return (
      <DraggableCard
        aria-live="polite"
        className="build-card build-card-error"
        defaultPosition={{ x: 450, y: 260 }}
        layoutId="build"
        onPositionChange={onPositionChange}
        positions={positions}
      >
        <span className="build-card-eyebrow">Agente 02</span>
        <h3>Algo deu errado</h3>
        <p>{buildState.error || "Falha ao construir o site."}</p>
        <button className="build-cta" onClick={onReset} type="button">
          tentar de novo
        </button>
      </DraggableCard>
    );
  }

  return (
    <DraggableCard
      aria-live="polite"
      className="build-card build-card-running"
      defaultPosition={{ x: 450, y: 260 }}
      layoutId="build"
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <span className="build-card-eyebrow">Agente 02</span>
      <h3>Construindo seu site...</h3>
      <p>{buildState.message || "Vou te avisar quando estiver pronto."}</p>
      <small>job {buildState.job_id}</small>
    </DraggableCard>
  );
}

function ReadyToBuildCard({
  isStarting,
  onConfirm,
  onPositionChange,
  positions,
}) {
  return (
    <DraggableCard
      className="build-card build-card-ready"
      defaultPosition={{ x: 360, y: 260 }}
      layoutId="ready"
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <span className="build-card-eyebrow">Tudo pronto</span>
      <h3>Posso começar a construir?</h3>
      <p>Já tenho o suficiente sobre seu negócio. Quando você confirmar, o Agente 02 começa.</p>
      <button
        className="build-cta"
        disabled={isStarting}
        onClick={onConfirm}
        type="button"
      >
        {isStarting ? "Iniciando..." : "Pode construir"}
      </button>
    </DraggableCard>
  );
}

function WhiteboardCanvas({ session, sessionId, buildState, onStartBuild, isStartingBuild, onResetBuild }) {
  const [notePositions, setNotePositions] = useState(() => readStoredNoteLayout(sessionId));

  useEffect(() => {
    setNotePositions(readStoredNoteLayout(sessionId));
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `${NOTE_LAYOUT_STORAGE_KEY}:${sessionId}`,
      JSON.stringify(notePositions),
    );
  }, [notePositions, sessionId]);

  const handleNotePositionChange = useCallback((layoutId, position) => {
    setNotePositions((current) => ({ ...current, [layoutId]: position }));
  }, []);

  if (
    buildState &&
    ["starting", "building", "done", "error"].includes(buildState.status)
  ) {
    return (
      <section className="whiteboard-notes" aria-label="Construção em andamento">
        {buildState.status === "done" && buildState.site_url ? (
          <BrowserPreviewPanel
            onPositionChange={handleNotePositionChange}
            positions={notePositions}
            siteUrl={getPublicSiteUrl(buildState)}
          />
        ) : null}
        <BuildingCard
          buildState={buildState}
          onPositionChange={handleNotePositionChange}
          onReset={onResetBuild}
          positions={notePositions}
          session={session}
        />
      </section>
    );
  }

  if (!session || session.transcript.length === 0) {
    return (
      <section className="whiteboard-empty" aria-label="Lousa vazia">
        <div className="onboarding-panel">
          <Suspense fallback={<div className="motion-fallback">initializing...</div>}>
            <OnboardingLoopPlayer />
          </Suspense>
        </div>
      </section>
    );
  }

  const summary = buildSummary(session);
  const currentQuestion = getCurrentQuestion(session);
  const notepadState = getNotepadState(session);
  const knownItems = buildKnownNotes(summary);
  const missingItems = buildMissingNotes(currentQuestion, notepadState);

  return (
    <section className="whiteboard-notes" aria-label="Lousa de notas">
      {knownItems.length > 0 ? (
        <WhiteboardNote
          defaultPosition={{ x: 42, y: 42 }}
          items={knownItems}
          layoutId="known"
          onPositionChange={handleNotePositionChange}
          positions={notePositions}
          title="anotado"
          tone="warm"
        />
      ) : null}

      {missingItems.length > 0 ? (
        <WhiteboardNote
          defaultPosition={{ x: 220, y: 220 }}
          items={missingItems}
          layoutId="missing"
          onPositionChange={handleNotePositionChange}
          positions={notePositions}
          title="falta"
          tone="soft"
        />
      ) : null}

      {notepadState.readyToBuild ? (
        <ReadyToBuildCard
          isStarting={isStartingBuild}
          onConfirm={onStartBuild}
          onPositionChange={handleNotePositionChange}
          positions={notePositions}
        />
      ) : null}
    </section>
  );
}

function TranscriptMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <article className={`transcript-message transcript-${message.role} ${message.isLive ? "is-live" : ""}`}>
      <span className="message-author">{isUser ? "Você" : "Simple"}</span>
      <p>{message.content}</p>
    </article>
  );
}

function ConversationStatus({ buildState, session }) {
  if (buildState?.status === "done") {
    return (
      <div className="conversation-status conversation-status-done">
        <span>Site pronto</span>
        <strong>Abrir pela lousa</strong>
      </div>
    );
  }

  if (buildState?.status === "building" || buildState?.status === "starting") {
    return (
      <div className="conversation-status">
        <span>Agente 02</span>
        <strong>Construindo o site</strong>
        <div className="conversation-progress" aria-hidden="true">
          <i style={{ width: "78%" }} />
        </div>
      </div>
    );
  }

  if (buildState?.status === "error") {
    return (
      <div className="conversation-status conversation-status-error">
        <span>Construção pausada</span>
        <strong>Toque em tentar de novo na lousa</strong>
      </div>
    );
  }

  const notepadState = session ? getNotepadState(session) : null;
  const currentQuestion = session ? getCurrentQuestion(session) : null;
  const progress = notepadState?.totalConfidence ?? 0;
  const title = notepadState?.readyToBuild
    ? "Já dá para construir"
    : currentQuestion?.question || "Comece contando o que quer criar";

  return (
    <div className="conversation-status">
      <span>{session ? `${progress}% anotado` : "Briefing"}</span>
      <strong>{title}</strong>
      <div className="conversation-progress" aria-hidden="true">
        <i style={{ width: `${Math.max(8, Math.min(progress, 100))}%` }} />
      </div>
    </div>
  );
}

function DiagnosticStep({ active, label, value, warn }) {
  return (
    <li className={`${active ? "is-ok" : warn ? "is-warn" : ""}`}>
      <span />
      <strong>{label}</strong>
      <small>{value}</small>
    </li>
  );
}

function VoiceDiagnostics({ diagnostics, logs }) {
  const recentLogs = logs.slice(-5).reverse();
  const micPercent = Math.min(100, Math.round((diagnostics?.microphoneLevel ?? 0) * 180));
  const hasAudio = (diagnostics?.microphoneLevel ?? 0) > 0.015;
  const userTurns = diagnostics?.userTranscriptCount ?? 0;
  const agentTurns = diagnostics?.agentTranscriptCount ?? 0;
  const agoraUserTurns = diagnostics?.agoraUserTranscriptCount ?? 0;
  const hasUserTranscripts = userTurns > 0;
  const hasAgentTranscripts = agentTurns > 0;
  const micError = diagnostics?.microphoneErrorMessage || "";

  return (
    <div className="voice-diagnostics">
      <div className="voice-diagnostics-head">
        <span>diagnostico</span>
        <strong>
          {micError
            ? "microfone bloqueado"
            : hasUserTranscripts
              ? "usuario transcrito"
              : hasAgentTranscripts
                ? "so agente transcrito"
                : hasAudio
                  ? "audio local detectado"
                  : "aguardando audio"}
        </strong>
      </div>

      {diagnostics?.currentStep ? (
        <p className="voice-current-step">etapa: {diagnostics.currentStep}</p>
      ) : null}

      <div className="voice-meter" aria-label={`Nivel do microfone ${micPercent}%`}>
        <i style={{ width: `${micPercent}%` }} />
      </div>

      <ul className="voice-diagnostic-steps">
        <DiagnosticStep
          active={diagnostics?.hasConfig}
          label="config"
          value={diagnostics?.channelName || "sem canal"}
        />
        <DiagnosticStep
          active={diagnostics?.isRtcConnected}
          label="rtc"
          value={diagnostics?.localUid ? `uid ${diagnostics.localUid}` : "nao entrou"}
        />
        <DiagnosticStep
          active={diagnostics?.isMicrophoneReady}
          label="mic"
          value={micError || (hasAudio ? `sinal ${micPercent}%` : "sem sinal local")}
          warn={Boolean(micError) || (diagnostics?.isMicrophoneReady && !hasAudio)}
        />
        <DiagnosticStep
          active={diagnostics?.isMicrophonePublished}
          label="publish"
          value={diagnostics?.isMicrophonePublished ? "mic no canal" : "nao publicado"}
          warn={diagnostics?.isRtcConnected && !diagnostics?.isMicrophonePublished}
        />
        <DiagnosticStep
          active={diagnostics?.isRtmReady}
          label="rtm"
          value={diagnostics?.isRtmReady ? "canal ativo" : "sem eventos"}
        />
        <DiagnosticStep
          active={diagnostics?.isToolkitReady}
          label="toolkit"
          value={diagnostics?.isToolkitReady ? "escutando mensagens" : "nao iniciou"}
        />
        <DiagnosticStep
          active={diagnostics?.isAgentStarted}
          label="agente"
          value={diagnostics?.agentId ? diagnostics.agentId.slice(0, 8) : "nao iniciou"}
        />
        <DiagnosticStep
          active={hasUserTranscripts}
          label="stt"
          value={`usuario ${agoraUserTurns} / agente ${agentTurns}`}
          warn={hasAudio && diagnostics?.isAgentStarted && !hasUserTranscripts}
        />
      </ul>

      {micError ? <p className="voice-last-transcript">{micError}</p> : null}

      {diagnostics?.lastTranscriptText ? (
        <p className="voice-last-transcript">{diagnostics.lastTranscriptText}</p>
      ) : null}

      {recentLogs.length > 0 ? (
        <div className="voice-log-list">
          {recentLogs.map((log) => (
            <small className={`voice-log-${log.level}`} key={log.id}>
              {log.message}
            </small>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VoiceFirstControls({
  agentState,
  diagnostics,
  isConnected,
  isConnecting,
  isMicrophoneReady,
  logs,
  onOpenTextFallback,
  onVoiceToggle,
}) {
  const lastError = [...logs].reverse().find((item) => item.level === "error");
  const micError = diagnostics?.microphoneErrorMessage;
  const blockedMic = Boolean(micError);
  const statusLabel = isConnected && isMicrophoneReady
    ? "ouvindo"
    : blockedMic
      ? "microfone bloqueado"
    : isConnecting
      ? "conectando"
      : isConnected
        ? "microfone"
        : lastError
          ? "atenção"
      : "voz pronta";
  const statusText = isConnected && isMicrophoneReady
    ? "Pode falar normalmente. Eu vou anotando na lousa."
    : blockedMic
      ? "O navegador bloqueou o microfone. Libere a permissao para a voz funcionar."
    : isConnecting
      ? "Estou abrindo a conversa por voz."
      : isConnected
        ? "A sessao abriu. Falta liberar o microfone."
        : lastError
          ? "A voz pausou. Toque para tentar de novo."
      : "Toque para iniciar a conversa por voz.";
  const actionLabel = isConnecting
    ? "cancelar"
    : isConnected
      ? "encerrar voz"
      : "ativar voz";

  return (
    <section className="voice-first-panel" aria-live="polite">
      <div className={`voice-orb ${isConnected || isConnecting ? "is-live" : ""}`}>
        <span />
        <i />
      </div>
      <div className="voice-first-copy">
        <span>{statusLabel}</span>
        <strong>{statusText}</strong>
        {agentState ? <small>estado: {String(agentState).toLowerCase()}</small> : null}
        {lastError ? <small className="voice-error">{lastError.message}</small> : null}
      </div>
      <VoiceDiagnostics diagnostics={diagnostics} logs={logs} />
      <div className="voice-first-actions">
        <button className="voice-link-button" onClick={onVoiceToggle} type="button">
          {actionLabel}
        </button>
        <button className="voice-link-button" onClick={onOpenTextFallback} type="button">
          usar texto
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const storedWorkspace = useMemo(() => readStoredChatWorkspace(), []);
  const storedTheme = useMemo(() => readStoredTheme(), []);
  const [chatSessions, setChatSessions] = useState(storedWorkspace.sessions);
  const [activeChatSessionId, setActiveChatSessionId] = useState(storedWorkspace.activeId);
  const activeChatSession = useMemo(
    () => chatSessions.find((item) => item.id === activeChatSessionId) ?? chatSessions[0],
    [activeChatSessionId, chatSessions],
  );
  const [session, setSession] = useState(activeChatSession?.session ?? null);
  const [buildState, setBuildState] = useState(activeChatSession?.buildState ?? null);
  const [composer, setComposer] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [theme, setTheme] = useState(storedTheme);
  const [isTextFallbackOpen, setIsTextFallbackOpen] = useState(false);
  const [autoTestState, setAutoTestState] = useState({
    running: false,
    scenario: null,
    step: 0,
    message: "",
  });
  const [, setIsAgentAvailable] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const sessionRef = useRef(session);
  const buildStateRef = useRef(buildState);
  const activeChatSessionIdRef = useRef(activeChatSessionId);
  const fileInputRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const processedAgoraTurnsRef = useRef(new Map());
  const lastCommittedVoiceTurnRef = useRef({ fingerprint: "", turnId: 0 });
  const autoVoiceStartedSessionRef = useRef(null);
  const autoTestRunRef = useRef({ runId: 0, cancelled: false, scenarioId: null });
  const voiceControlRef = useRef({
    disconnect: null,
    isConnected: false,
    isConnecting: false,
  });

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    buildStateRef.current = buildState;
  }, [buildState]);

  useEffect(() => {
    activeChatSessionIdRef.current = activeChatSessionId;
  }, [activeChatSessionId]);

  useEffect(() => {
    setChatSessions((current) =>
      current.map((item) =>
        item.id === activeChatSessionId
          ? {
              ...item,
              session,
              buildState,
              title: getSessionTitle(session, buildState, item.title),
              updatedAt: Date.now(),
            }
          : item,
      ),
    );
  }, [activeChatSessionId, buildState, session]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      CHAT_SESSIONS_STORAGE_KEY,
      JSON.stringify({ activeId: activeChatSessionId, sessions: chatSessions }),
    );
    window.localStorage.setItem(ACTIVE_CHAT_SESSION_STORAGE_KEY, activeChatSessionId);
  }, [activeChatSessionId, chatSessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (buildState) {
      window.localStorage.setItem(BUILD_STORAGE_KEY, JSON.stringify(buildState));
    } else {
      window.localStorage.removeItem(BUILD_STORAGE_KEY);
    }
  }, [buildState]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!buildState?.job_id) return;
    if (buildState.status !== "building" && buildState.status !== "starting") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v2/build/${buildState.job_id}`);
        const result = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (response.status === 404) {
          setBuildState((prev) => ({
            ...prev,
            status: "error",
            error: "O servidor reiniciou e perdeu este job. Tente construir de novo.",
          }));
          return;
        }
        if (!response.ok || result.code !== 0) return;

        const data = result.data || {};
        if (data.status === "done") {
          const nextBuildState = {
            ...buildStateRef.current,
            status: "done",
            site_url: data.site_url,
            preview_url: getPublicSiteUrl({ site_url: data.site_url }),
            usage: data.usage,
          };
          setBuildState((prev) => ({
            ...prev,
            ...nextBuildState,
          }));
          commitActiveChatSession({ buildState: nextBuildState, session: sessionRef.current });
        } else if (data.status === "error") {
          setBuildState((prev) => ({
            ...prev,
            status: "error",
            error: data.error || "Falha ao construir.",
          }));
        } else if (data.status && data.status !== buildState.status) {
          setBuildState((prev) => ({ ...prev, status: data.status }));
        }
      } catch {
        /* keep polling */
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [buildState?.job_id, buildState?.status]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function handleOnline() {
      setIsAgentAvailable(true);
    }

    function handleOffline() {
      setIsAgentAvailable(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const transcript = useMemo(() => {
    const items = [{ role: "assistant", content: OPENING_MESSAGE }];

    if (!session) return items;

    items.push(...session.transcript);

    const currentQuestion = getCurrentQuestion(session);
    const shouldShowQuestion = !["starting", "building", "done"].includes(buildState?.status);
    if (currentQuestion && shouldShowQuestion) {
      items.push({ role: "assistant", content: currentQuestion.question });
    }

    return items;
  }, [buildState?.status, session]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [transcript, buildState?.status]);

  const briefingContext = useMemo(() => {
    if (!session) return "Briefing vazio. Comece descobrindo o nome do negócio.";

    const summary = buildSummary(session);
    const lines = Object.entries(summary)
      .filter(([, value]) => isFilled(value, ["Não identificado", "Não definido", "Entrar em contato"]))
      .map(([key, value]) => `${key}: ${value}`);

    return lines.length > 0 ? lines.join("\n") : "Briefing vazio.";
  }, [session]);

  const priorityQuestion = useMemo(() => {
    if (!session) return "Pergunte qual é o nome do negócio e o que ele faz.";

    const current = getCurrentQuestion(session);
    return current?.question || "Briefing pronto. Confirme se podemos avançar.";
  }, [session]);

  const clearAttachment = useCallback(() => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const commitActiveChatSession = useCallback((patch) => {
    const targetId = activeChatSessionIdRef.current;

    setChatSessions((current) =>
      current.map((item) => {
        if (item.id !== targetId) return item;

        const nextSession = Object.prototype.hasOwnProperty.call(patch, "session")
          ? patch.session
          : item.session;
        const nextBuildState = Object.prototype.hasOwnProperty.call(patch, "buildState")
          ? patch.buildState
          : item.buildState;

        return {
          ...item,
          ...patch,
          session: nextSession,
          buildState: nextBuildState,
          title: getSessionTitle(nextSession, nextBuildState, item.title),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const handleSelectChatSession = useCallback((sessionId) => {
    const next = chatSessions.find((item) => item.id === sessionId);
    if (!next || next.id === activeChatSessionId) return;

    autoTestRunRef.current.cancelled = true;
    setAutoTestState((current) => (current.running ? { ...current, running: false, message: "Teste interrompido." } : current));

    commitActiveChatSession({
      session: sessionRef.current,
      buildState: buildStateRef.current,
    });
    activeChatSessionIdRef.current = next.id;
    setActiveChatSessionId(next.id);
    setSession(next.session ?? null);
    setBuildState(next.buildState ?? null);
    setComposer("");
    setIsTextFallbackOpen(false);
    clearAttachment();
    processedAgoraTurnsRef.current = new Map();
  }, [activeChatSessionId, chatSessions, clearAttachment, commitActiveChatSession]);

  const handleCreateChatSession = useCallback(() => {
    const next = createChatSessionRecord();
    autoTestRunRef.current.cancelled = true;
    setAutoTestState((current) => (current.running ? { ...current, running: false, message: "Teste interrompido." } : current));
    commitActiveChatSession({
      session: sessionRef.current,
      buildState: buildStateRef.current,
    });
    activeChatSessionIdRef.current = next.id;
    setChatSessions((current) => [next, ...current]);
    setActiveChatSessionId(next.id);
    setSession(null);
    setBuildState(null);
    setComposer("");
    setIsTextFallbackOpen(false);
    clearAttachment();
    processedAgoraTurnsRef.current = new Map();
  }, [clearAttachment, commitActiveChatSession]);

  const handleDeleteChatSession = useCallback((sessionId) => {
    const target = chatSessions.find((item) => item.id === sessionId);
    if (!target) return;

    autoTestRunRef.current.cancelled = true;
    setAutoTestState((current) => (current.running ? { ...current, running: false, message: "Teste interrompido." } : current));

    const title = target.title || "Nova sessao";
    const confirmed = window.confirm(
      `Excluir a sessao "${title}"? Isso remove a conversa e o site salvo desta sessao apenas neste navegador.`,
    );
    if (!confirmed) return;

    setChatSessions((current) => {
      const remaining = current.filter((item) => item.id !== sessionId);
      const fallback = remaining[0] ?? createChatSessionRecord();
      const nextSessions = remaining.length > 0 ? remaining : [fallback];

      if (sessionId === activeChatSessionIdRef.current) {
        activeChatSessionIdRef.current = fallback.id;
        setActiveChatSessionId(fallback.id);
        setSession(fallback.session ?? null);
        setBuildState(fallback.buildState ?? null);
        setComposer("");
        setIsTextFallbackOpen(false);
        clearAttachment();
        processedAgoraTurnsRef.current = new Map();
      }

      return nextSessions;
    });
  }, [chatSessions, clearAttachment]);

  const handleConversationSubmit = useCallback((rawInput, options = {}) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const currentSession = sessionRef.current;
    const isVoiceInput = options.source === "voice";

    if (!currentSession) {
      const created = createSession();
      const nextSession = submitAnswer(created, trimmed);
      const committedSession = isVoiceInput
        ? removePlannerAssistantEcho(created, nextSession, trimmed)
        : nextSession;
      setSession(committedSession);
      commitActiveChatSession({ session: committedSession, buildState: buildStateRef.current });
      setComposer("");
      clearAttachment();
      return;
    }

    const nextSession = submitAnswer(currentSession, trimmed);
    const committedSession = isVoiceInput
      ? removePlannerAssistantEcho(currentSession, nextSession, trimmed)
      : nextSession;
    setSession(committedSession);
    commitActiveChatSession({ session: committedSession, buildState: buildStateRef.current });
    setComposer("");
    clearAttachment();
  }, [clearAttachment, commitActiveChatSession]);

  const startBuildForSession = useCallback(async (currentSession = sessionRef.current) => {
    if (!currentSession) return;
    if (buildStateRef.current && buildStateRef.current.status !== "error") return;

    setBuildState({ status: "starting", started_at: Date.now() });

    try {
      const summary = buildSummary(currentSession);
      const userQuotes = (currentSession.transcript || [])
        .filter((m) => m.role === "user")
        .slice(-5)
        .map((m) => m.content);

      const payload = {
        business_name: summary.brand_name,
        segment: summary.business_type,
        current_workflow: null,
        primary_pain: null,
        user_facing_actions: Array.isArray(summary.modules) ? summary.modules : [],
        data_entities: [],
        raw_quotes: userQuotes,
        summary,
      };

      const response = await fetch("/api/v2/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.code !== 0) {
        throw new Error(result.detail || result.msg || `HTTP ${response.status}`);
      }

      setBuildState({
        status: "building",
        job_id: result.data?.job_id,
        message: result.data?.message,
        started_at: Date.now(),
      });
    } catch (error) {
      setBuildState({
        status: "error",
        error: error.message || "Falha ao iniciar a construção.",
        started_at: Date.now(),
      });
    }
  }, []);

  const handleStartBuild = useCallback(() => {
    startBuildForSession(sessionRef.current);
  }, [startBuildForSession]);

  const handleResetBuild = useCallback(() => {
    setBuildState(null);
    processedAgoraTurnsRef.current = new Map();
    lastCommittedVoiceTurnRef.current = { fingerprint: "", turnId: 0 };
  }, []);

  const handleStopAutoTest = useCallback(() => {
    autoTestRunRef.current.cancelled = true;
    setAutoTestState((current) =>
      current.running
        ? {
            ...current,
            running: false,
            message: "Teste interrompido.",
          }
        : current,
    );
  }, []);

  const handleStartAutoTest = useCallback(async () => {
    if (autoTestState.running) return;

    if (voiceControlRef.current.isConnected || voiceControlRef.current.isConnecting) {
      try {
        await voiceControlRef.current.disconnect?.();
      } catch {
        /* ignore voice shutdown failures during test mode */
      }
    }

    const scenario = pickAutoTestScenario(autoTestRunRef.current.scenarioId);
    autoTestRunRef.current = {
      runId: autoTestRunRef.current.runId + 1,
      cancelled: false,
      scenarioId: scenario.id,
    };
    const runId = autoTestRunRef.current.runId;

    handleStopAutoTest();
    handleResetBuild();

    commitActiveChatSession({
      session: sessionRef.current,
      buildState: buildStateRef.current,
    });

    const nextRecord = createChatSessionRecord({
      title: `Teste rápido: ${scenario.label}`,
    });

    activeChatSessionIdRef.current = nextRecord.id;
    setChatSessions((current) => [nextRecord, ...current]);
    setActiveChatSessionId(nextRecord.id);
    setSession(null);
    setBuildState(null);
    setComposer("");
    setIsTextFallbackOpen(false);
    clearAttachment();
    processedAgoraTurnsRef.current = new Map();
    lastCommittedVoiceTurnRef.current = { fingerprint: "", turnId: 0 };

    let workingSession = createSession();
    setSession(workingSession);
    commitActiveChatSession({ session: workingSession, buildState: null });
    setAutoTestState({
      running: true,
      scenario,
      step: 0,
      message: "Preparando cenário de teste...",
    });

    for (let step = 0; step < 18; step += 1) {
      if (autoTestRunRef.current.cancelled || autoTestRunRef.current.runId !== runId) {
        return;
      }

      const currentQuestion = getCurrentQuestion(workingSession);
      if (!currentQuestion) break;

      const answer = buildAutoTestAnswer(currentQuestion, scenario);
      workingSession = submitAnswer(workingSession, answer);
      setSession(workingSession);
      commitActiveChatSession({ session: workingSession, buildState: null });
      setAutoTestState({
        running: true,
        scenario,
        step: step + 1,
        message: `${currentQuestion.question} -> ${answer}`,
      });

      if (workingSession.readyToBuild || getNotepadState(workingSession).readyToBuild) {
        break;
      }

      await wait(650);
    }

    if (autoTestRunRef.current.cancelled || autoTestRunRef.current.runId !== runId) {
      return;
    }

    commitActiveChatSession({ session: workingSession, buildState: buildStateRef.current });

    const readyToBuild = workingSession.readyToBuild || getNotepadState(workingSession).readyToBuild;
    setAutoTestState({
      running: false,
      scenario,
      step: getNotepadState(workingSession).messagesCount,
      message: readyToBuild
        ? "Teste concluído. Iniciando a geração do site..."
        : "Teste concluído, mas o briefing ainda não ficou pronto.",
    });

    if (readyToBuild) {
      await startBuildForSession(workingSession);
    }
  }, [
    autoTestState.running,
    clearAttachment,
    commitActiveChatSession,
    handleResetBuild,
    handleStopAutoTest,
    startBuildForSession,
  ]);

  const handleAgoraTranscript = useCallback((turns) => {
    if (!Array.isArray(turns)) return;

    const finalUserTurns = turns
      .filter((turn) => turn.type === "user")
      .filter((turn) => !isVoiceTurnInProgress(turn))
      .filter((turn) => turn.text && turn.text.trim())
      .sort((first, second) => {
        const firstOrder = Number(first.turnId) || Number(first.timestamp) || 0;
        const secondOrder = Number(second.turnId) || Number(second.timestamp) || 0;
        return firstOrder - secondOrder;
      });

    const turn = finalUserTurns[finalUserTurns.length - 1];
    if (!turn) return;

    const currentSession = sessionRef.current;
    const currentQuestion = currentSession ? getCurrentQuestion(currentSession) : null;
    const questionId = currentQuestion?.id || "initial";
    const now = Date.now();

    const normalized = normalizeMessageText(turn.text);
    if (!normalized || normalized.length < 3) return;

    const turnId = Number(turn.turnId) || 0;
    const fingerprint = `${turnId || turn.timestamp || "no-turn"}::${normalized}`;
    if (turnId && turnId <= lastCommittedVoiceTurnRef.current.turnId) return;
    if (fingerprint === lastCommittedVoiceTurnRef.current.fingerprint) return;

    const commitKey = createVoiceCommitKey(questionId, normalized);
    if (processedAgoraTurnsRef.current.has(commitKey)) return;

    const recentUserText = sessionRef.current?.transcript
      ?.filter((message) => message.role === "user")
      ?.slice(-4)
      ?.some((message) => normalizeMessageText(message.content) === normalized);
    if (recentUserText) {
      rememberVoiceCommit(processedAgoraTurnsRef.current, commitKey, now);
      lastCommittedVoiceTurnRef.current = { fingerprint, turnId };
      return;
    }

    rememberVoiceCommit(processedAgoraTurnsRef.current, commitKey, now);
    lastCommittedVoiceTurnRef.current = { fingerprint, turnId };
    handleConversationSubmit(turn.text, { source: "voice" });
  }, [handleConversationSubmit]);

  const {
    agentState: agoraAgentState,
    connect,
    diagnostics: agoraDiagnostics,
    disconnect,
    isConnected: isAgoraConnected,
    isConnecting: isAgoraConnecting,
    isMicrophoneReady,
    logs: agoraLogs,
    transcripts: agoraTranscripts,
  } = useAgoraSession({
    briefingContext,
    priorityQuestion,
    onTranscriptChange: handleAgoraTranscript,
    language: "pt-BR",
  });

  useEffect(() => {
    voiceControlRef.current = {
      disconnect,
      isConnected: isAgoraConnected,
      isConnecting: isAgoraConnecting,
    };
  }, [disconnect, isAgoraConnected, isAgoraConnecting]);

  const voiceTranscriptMessages = useMemo(() => {
    const committedTexts = new Set(
      (session?.transcript ?? []).map((message) => normalizeMessageText(message.content)),
    );

    const latestBySignature = new Map();

    agoraTranscripts
      .filter((turn) => turn.text && turn.text.trim())
      .filter((turn) => {
        if (isVoiceTurnInProgress(turn)) return true;
        return !committedTexts.has(normalizeMessageText(turn.text));
      })
      .forEach((turn) => {
        const signature = `${turn.type}-${normalizeMessageText(turn.text)}-${isVoiceTurnInProgress(turn) ? "live" : "final"}`;
        latestBySignature.set(signature, turn);
      });

    return [...latestBySignature.values()].slice(-4).map((turn) => ({
        role: turn.type === "user" ? "user" : "assistant",
        content: turn.text,
        isLive: isVoiceTurnInProgress(turn),
      }));
  }, [agoraTranscripts, session?.transcript]);

  const displayedTranscript = useMemo(
    () => [...transcript, ...voiceTranscriptMessages],
    [transcript, voiceTranscriptMessages],
  );

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [displayedTranscript]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    autoVoiceStartedSessionRef.current = null;
  }, []);

  function buildOutgoingMessage() {
    const parts = [];

    if (composer.trim()) {
      parts.push(composer.trim());
    }

    if (attachment) {
      parts.push(`Enviei uma imagem chamada ${attachment.name}.`);
    }

    return parts.join(" ");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!composer.trim() && !attachment) {
      fileInputRef.current?.click();
      return;
    }

    handleConversationSubmit(buildOutgoingMessage());
  }

  function handleComposerKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
    event.preventDefault();

    if (composer.trim() || attachment) {
      handleConversationSubmit(buildOutgoingMessage());
      return;
    }

    const currentSession = sessionRef.current;
    if (
      currentSession &&
      getNotepadState(currentSession).readyToBuild &&
      (!buildState || buildState.status === "error")
    ) {
      handleStartBuild();
    }
  }

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0] ?? null;
    setAttachment(file);
  }, []);

  const handleVoiceToggle = useCallback(async () => {
    if (isAgoraConnected || isAgoraConnecting) {
      await disconnect();
      return;
    }

    await connect();
  }, [connect, disconnect, isAgoraConnected, isAgoraConnecting]);

  const voiceButtonLabel = isAgoraConnected
    ? "Encerrar voz"
    : isAgoraConnecting
      ? "Cancelar voz"
      : "Ativar voz";
  const voiceStatusClass = isAgoraConnected
    ? "is-online"
    : isAgoraConnecting
      ? "is-connecting"
      : "";

  return (
    <div className="whiteboard-shell">
      <ParticleField />
      <SessionRail
        activeSessionId={activeChatSessionId}
        onCreateSession={handleCreateChatSession}
        onDeleteSession={handleDeleteChatSession}
        onSelectSession={handleSelectChatSession}
        sessions={chatSessions}
      />
      <header className="whiteboard-topbar">
        <img alt="Simple AI" className="brand-logo" src={logoUrl} />
        <div className="topbar-actions">
          <button
            className={`topbar-test-button ${autoTestState.running ? "is-running" : ""}`}
            onClick={autoTestState.running ? handleStopAutoTest : handleStartAutoTest}
            type="button"
          >
            {autoTestState.running ? "parar teste" : "teste rápido"}
          </button>
          {autoTestState.scenario ? (
            <small className="topbar-test-label">
              {autoTestState.scenario.label}
              {autoTestState.message ? ` · ${autoTestState.message}` : ""}
            </small>
          ) : null}
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          />
        </div>
      </header>

      <main className="whiteboard-stage">
        <WhiteboardCanvas
          session={session}
          sessionId={activeChatSessionId}
          buildState={buildState}
          onStartBuild={handleStartBuild}
          isStartingBuild={buildState?.status === "starting"}
          onResetBuild={handleResetBuild}
        />
      </main>

      <aside className="chat-dock">
        <div className="chat-dock-head">
          <div className="chat-title">
            <span
              className={`chat-status-dot ${voiceStatusClass}`}
              aria-hidden="true"
            />
            <strong>Simple</strong>
          </div>

          <button
            aria-label={voiceButtonLabel}
            className={`mic-button ${isAgoraConnected || isAgoraConnecting ? "is-live" : ""}`}
            onClick={handleVoiceToggle}
            type="button"
          >
            <span className="mic-core" />
          </button>
        </div>

        <div className="transcript-panel" aria-live="polite">
          {displayedTranscript.map((message, index) => (
            <TranscriptMessage
              key={`${message.role}-${index}-${message.content}`}
              message={message}
            />
          ))}
          {buildState?.status === "starting" || buildState?.status === "building" ? (
            <div className="typing-indicator" aria-label="Simple esta digitando">
              <span />
              <span />
              <span />
            </div>
          ) : null}
          <div ref={transcriptEndRef} />
        </div>

        {isTextFallbackOpen ? (
          <form className="chat-composer chat-composer-text" onSubmit={handleSubmit}>
            <input
              accept="image/*"
              className="hidden-file-input"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />

            <textarea
              aria-label="Mensagem"
              className="chat-input"
              onKeyDown={handleComposerKeyDown}
              onChange={(event) => setComposer(event.target.value)}
              placeholder="> descreva seu negocio..."
              value={composer}
            />

            {attachment ? (
              <div className="attachment-pill" aria-live="polite">
                <span>imagem</span>
                <strong>{attachment.name}</strong>
              </div>
            ) : null}

            <button className="send-button" type="submit">
              Enviar
            </button>
            <button
              className="voice-link-button text-fallback-close"
              onClick={() => setIsTextFallbackOpen(false)}
              type="button"
            >
              voltar para voz
            </button>
          </form>
        ) : (
          <VoiceFirstControls
            agentState={agoraAgentState}
            diagnostics={agoraDiagnostics}
            isConnected={isAgoraConnected}
            isConnecting={isAgoraConnecting}
            isMicrophoneReady={isMicrophoneReady}
            logs={agoraLogs}
            onOpenTextFallback={() => setIsTextFallbackOpen(true)}
            onVoiceToggle={handleVoiceToggle}
          />
        )}
      </aside>
    </div>
  );
}
