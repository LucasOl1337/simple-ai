import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TurnStatus } from "agora-agent-client-toolkit";
import logoUrl from "../../assets/logo.svg";
import {
  buildSummary,
  createSession,
  getCurrentQuestion,
  getNotepadState,
  submitAnswer,
} from "../features/discovery/planner";
import AgoraSessionPanel from "../integrations/agora/AgoraSessionPanel";

const STORAGE_KEY = "simple-ai-whiteboard-v5";
const BUILD_STORAGE_KEY = "simple-ai-build-v1";
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

function isFilled(value, invalid = []) {
  if (!value) return false;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !invalid.map((item) => item.toLowerCase()).includes(normalized);
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

function WhiteboardNote({ title, items, tone = "plain" }) {
  return (
    <article className={`whiteboard-note whiteboard-note-${tone}`}>
      <span>{title}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function BuildingCard({ buildState, onReset }) {
  if (buildState.status === "done" && buildState.site_url) {
    return (
      <article className="build-card build-card-done" aria-live="polite">
        <span className="build-card-eyebrow">Agente 02</span>
        <h3>Pronto!</h3>
        <p>Seu site está no ar.</p>
        <a className="build-cta" href={buildState.site_url} target="_blank" rel="noreferrer">
          Abrir meu site
        </a>
        <small>job {buildState.job_id}</small>
        <button className="build-reset" onClick={onReset} type="button">
          começar de novo
        </button>
      </article>
    );
  }

  if (buildState.status === "error") {
    return (
      <article className="build-card build-card-error" aria-live="polite">
        <span className="build-card-eyebrow">Agente 02</span>
        <h3>Algo deu errado</h3>
        <p>{buildState.error || "Falha ao construir o site."}</p>
        <button className="build-cta" onClick={onReset} type="button">
          tentar de novo
        </button>
      </article>
    );
  }

  return (
    <article className="build-card build-card-running" aria-live="polite">
      <span className="build-card-eyebrow">Agente 02</span>
      <h3>Construindo seu site...</h3>
      <p>{buildState.message || "Vou te avisar quando estiver pronto."}</p>
      <small>job {buildState.job_id}</small>
    </article>
  );
}

function ReadyToBuildCard({ onConfirm, isStarting }) {
  return (
    <article className="build-card build-card-ready">
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
    </article>
  );
}

function WhiteboardCanvas({ session, buildState, onStartBuild, isStartingBuild, onResetBuild }) {
  if (
    buildState &&
    ["starting", "building", "done", "error"].includes(buildState.status)
  ) {
    return (
      <section className="whiteboard-notes" aria-label="Construção em andamento">
        <BuildingCard buildState={buildState} onReset={onResetBuild} />
      </section>
    );
  }

  if (!session || session.transcript.length === 0) {
    return (
      <section className="whiteboard-empty" aria-label="Lousa vazia">
        <div className="empty-ring" />
        <div className="empty-ring second" />
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
        <WhiteboardNote items={knownItems} title="anotado" tone="warm" />
      ) : null}

      {missingItems.length > 0 ? (
        <WhiteboardNote items={missingItems} title="falta" tone="soft" />
      ) : null}

      {notepadState.readyToBuild ? (
        <ReadyToBuildCard onConfirm={onStartBuild} isStarting={isStartingBuild} />
      ) : null}
    </section>
  );
}

function TranscriptMessage({ message }) {
  return (
    <article className={`transcript-message transcript-${message.role}`}>
      <p>{message.content}</p>
    </article>
  );
}

export default function App() {
  const storedSession = useMemo(() => readStoredSession(), []);
  const storedBuild = useMemo(() => readStoredBuild(), []);
  const [session, setSession] = useState(storedSession);
  const [buildState, setBuildState] = useState(storedBuild);
  const [composer, setComposer] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isAgentAvailable, setIsAgentAvailable] = useState(
    typeof window === "undefined" ? true : window.navigator.onLine,
  );

  const recognitionRef = useRef(null);
  const speechBufferRef = useRef("");
  const sessionRef = useRef(session);
  const fileInputRef = useRef(null);
  const processedAgoraTurnsRef = useRef(new Set());

  const isMicSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
          setBuildState((prev) => ({
            ...prev,
            status: "done",
            site_url: data.site_url,
            usage: data.usage,
          }));
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
    if (currentQuestion) {
      items.push({ role: "assistant", content: currentQuestion.question });
    }

    return items;
  }, [session]);

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

  function clearAttachment() {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleConversationSubmit(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const currentSession = sessionRef.current;

    if (!currentSession) {
      const created = createSession();
      const nextSession = submitAnswer(created, trimmed);
      setSession(nextSession);
      setComposer("");
      clearAttachment();
      return;
    }

    const nextSession = submitAnswer(currentSession, trimmed);
    setSession(nextSession);
    setComposer("");
    clearAttachment();
  }

  const handleStartBuild = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    if (buildState && buildState.status !== "error") return;

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
  }, [buildState]);

  const handleResetBuild = useCallback(() => {
    setBuildState(null);
    processedAgoraTurnsRef.current = new Set();
  }, []);

  const handleAgoraTranscript = useCallback((turns) => {
    if (!Array.isArray(turns)) return;

    for (const turn of turns) {
      if (turn.type !== "user") continue;
      if (turn.status === TurnStatus.IN_PROGRESS) continue;
      if (!turn.text || !turn.text.trim()) continue;
      if (processedAgoraTurnsRef.current.has(turn.id)) continue;

      processedAgoraTurnsRef.current.add(turn.id);
      handleConversationSubmit(turn.text);
    }
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

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setAttachment(file);
  }

  function toggleMicrophone() {
    if (!isMicSupported) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    speechBufferRef.current = "";
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcriptText = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      speechBufferRef.current = transcriptText;
      setComposer(transcriptText);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;

      if (speechBufferRef.current.trim()) {
        handleConversationSubmit(speechBufferRef.current);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div className="whiteboard-shell">
      <header className="whiteboard-topbar">
        <img alt="Simple AI" className="brand-logo" src={logoUrl} />
      </header>

      <main className="whiteboard-stage">
        <WhiteboardCanvas
          session={session}
          buildState={buildState}
          onStartBuild={handleStartBuild}
          isStartingBuild={buildState?.status === "starting"}
          onResetBuild={handleResetBuild}
        />
      </main>

      <aside className="chat-dock">
        <AgoraSessionPanel
          briefingContext={briefingContext}
          priorityQuestion={priorityQuestion}
          onTranscriptChange={handleAgoraTranscript}
        />

        <div className="chat-dock-head">
          <div className="agent-pill">
            <span
              className={`agent-dot ${isAgentAvailable ? "is-on" : "is-off"}`}
            />
            <span>{isAgentAvailable ? "agente disponível" : "agente offline"}</span>
          </div>

          <button
            aria-label={isListening ? "Mutar microfone" : "Ativar microfone"}
            className={`mic-button ${isListening ? "is-live" : ""}`}
            onClick={toggleMicrophone}
            type="button"
          >
            <span className="mic-core" />
          </button>
        </div>

        <div className="transcript-panel">
          {transcript.map((message, index) => (
            <TranscriptMessage
              key={`${message.role}-${index}-${message.content}`}
              message={message}
            />
          ))}
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
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
            onChange={(event) => setComposer(event.target.value)}
            placeholder="Digite aqui"
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
        </form>
      </aside>
    </div>
  );
}
