import { useEffect, useMemo, useRef, useState } from "react";
import {
  PHASES,
  buildSummary,
  createSession,
  getAgentGreeting,
  getCurrentQuestion,
  getNotepadState,
  getPhaseTransitionMessage,
  getProgressPercent,
  submitAnswer,
} from "./planner";

const STORAGE_KEY = "simple-ai-whiteboard-v4";

function readStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

function buildKnownNotes(summary, session) {
  const items = [];

  if (isFilled(summary.business_type, ["Nao identificado"])) {
    items.push({
      label: "Tipo de negocio",
      value: summary.business_type,
    });
  }

  if (isFilled(summary.brand_name, ["Nao definido"])) {
    items.push({
      label: "Nome",
      value: summary.brand_name,
    });
  }

  if (isFilled(summary.primary_cta, ["Entrar em contato"])) {
    items.push({
      label: "Acao principal",
      value: summary.primary_cta,
    });
  }

  if (isFilled(summary.target_audience, ["Nao definido"])) {
    items.push({
      label: "Publico",
      value: summary.target_audience,
    });
  }

  if (isFilled(summary.brand_tone, ["Nao definido"])) {
    items.push({
      label: "Tom visual",
      value: summary.brand_tone,
    });
  }

  if (getProgressPercent(session) >= 58 && summary.stack?.profile) {
    items.push({
      label: "Stack inicial",
      value: summary.stack.profile,
    });
  }

  return items.slice(0, 6);
}

function buildMissingNotes(summary, currentQuestion, notepadState) {
  const items = [];

  if (currentQuestion) {
    items.push(`Responder agora: ${currentQuestion.question}`);
  }

  const fieldLabels = {
    brand_name: "nome do negocio",
    business_type: "tipo de negocio",
    primary_cta: "acao principal que o visitante deve fazer",
    target_audience: "quem deve usar o site",
    scope: "cidade ou regiao atendida",
    brand_tone: "estilo visual que agrada ao dono do negocio",
  };

  [...notepadState.missingCritical, ...notepadState.missingImportant]
    .filter((field, index, array) => array.indexOf(field) === index)
    .forEach((field) => {
      const label = fieldLabels[field];
      if (label) {
        items.push(`Falta confirmar: ${label}`);
      }
    });

  if (
    !isFilled(summary.primary_cta, ["Entrar em contato"]) &&
    !items.some((item) => item.includes("acao principal"))
  ) {
    items.push("Falta confirmar: o que a pessoa deve fazer no site");
  }

  return items.slice(0, 5);
}

function getFlowGuide(session) {
  const currentIndex = PHASES.findIndex((phase) => phase.id === session.phase);
  const currentPhase = PHASES[currentIndex] ?? PHASES[0];
  const upcoming = PHASES.slice(currentIndex + 1, currentIndex + 3).map(
    (phase) => phase.label,
  );

  return {
    currentPhase,
    upcoming,
  };
}

function WhiteboardCard({ eyebrow, title, children, variant = "default" }) {
  return (
    <article className={`whiteboard-card whiteboard-card-${variant}`}>
      <p className="card-eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function TranscriptMessage({ message }) {
  return (
    <article className={`transcript-message transcript-${message.role}`}>
      <span>{message.role === "assistant" ? "Simple AI" : "Voce"}</span>
      <p>{message.content}</p>
    </article>
  );
}

function WhiteboardCanvas({ session }) {
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
  const progress = getProgressPercent(session);
  const notepadState = getNotepadState(session);
  const knownNotes = buildKnownNotes(summary, session);
  const missingNotes = buildMissingNotes(summary, currentQuestion, notepadState);
  const flowGuide = getFlowGuide(session);
  const phaseMessage = getPhaseTransitionMessage(session);

  return (
    <section className="whiteboard-grid" aria-label="Lousa de planejamento">
      <WhiteboardCard
        eyebrow="Ja entendemos"
        title={summary.business_type ?? "Primeiro mapa do projeto"}
        variant="anchor"
      >
        {knownNotes.length > 0 ? (
          <ul className="board-note-list">
            {knownNotes.map((item) => (
              <li key={`${item.label}-${item.value}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="board-copy">
            Assim que a primeira resposta chegar, a lousa vai anotar os pontos
            principais aqui.
          </p>
        )}
      </WhiteboardCard>

      <WhiteboardCard
        eyebrow="Fluxo"
        title={`Agora: ${flowGuide.currentPhase.label}`}
        variant="guide"
      >
        <p className="board-copy">
          {phaseMessage || flowGuide.currentPhase.description}
        </p>
        <div className="phase-strip">
          <div>
            <span>Progresso</span>
            <strong>{progress}%</strong>
          </div>
          <div>
            <span>Pronto para montar</span>
            <strong>{notepadState.readyToBuild ? "Quase la" : "Ainda nao"}</strong>
          </div>
        </div>
        {flowGuide.upcoming.length > 0 ? (
          <div className="next-phase-list">
            <span>Depois disso</span>
            <ul>
              {flowGuide.upcoming.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </WhiteboardCard>

      <WhiteboardCard
        eyebrow="Falta responder"
        title={currentQuestion?.question ?? "Briefing inicial fechado"}
        variant="question"
      >
        <p className="board-copy">
          A lousa so mostra o minimo necessario para nao confundir quem esta
          usando.
        </p>
        {missingNotes.length > 0 ? (
          <ul className="board-task-list">
            {missingNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="board-copy">
            O contexto minimo ja foi reunido. O proximo passo e transformar
            isso em estrutura do site.
          </p>
        )}
      </WhiteboardCard>
    </section>
  );
}

export default function App() {
  const storedSession = useMemo(() => readStoredSession(), []);
  const [session, setSession] = useState(storedSession);
  const [composer, setComposer] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const speechBufferRef = useRef("");
  const sessionRef = useRef(session);
  const fileInputRef = useRef(null);

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

  const transcript = useMemo(() => {
    const items = [{ role: "assistant", content: getAgentGreeting() }];

    if (!session) return items;

    items.push(...session.transcript);

    if (session.isComplete) {
      items.push({
        role: "assistant",
        content:
          "Ja tenho um primeiro briefing confiavel. Agora a lousa pode continuar guiando a construcao do site.",
      });
    } else {
      const phaseMessage = getPhaseTransitionMessage(session);
      const currentQuestion = getCurrentQuestion(session);

      if (phaseMessage) {
        items.push({ role: "assistant", content: phaseMessage });
      }

      if (currentQuestion) {
        items.push({ role: "assistant", content: currentQuestion.question });
      }
    }

    return items;
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

  function buildOutgoingMessage() {
    const parts = [];

    if (composer.trim()) {
      parts.push(composer.trim());
    }

    if (attachment) {
      parts.push(
        `Enviei uma imagem chamada ${attachment.name} como referencia visual do que eu quero.`,
      );
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
        <div className="brand-lockup">
          <span className="brand-dot" />
          <strong>SIMPLE-AI</strong>
        </div>
        <span className="topbar-status">
          {isListening ? "Ouvindo..." : "Whiteboard mode"}
        </span>
      </header>

      <main className="whiteboard-stage">
        <WhiteboardCanvas session={session} />
      </main>

      <aside className="chat-dock">
        <div className="chat-dock-head">
          <div>
            <p className="card-eyebrow">Chat</p>
            <h2>Conversa guiada</h2>
          </div>
          <button
            aria-label={isListening ? "Parar microfone" : "Ativar microfone"}
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
            placeholder={
              getCurrentQuestion(session ?? createSession())?.placeholder ||
              "Me conte o que voce quer criar"
            }
            value={composer}
          />

          {attachment ? (
            <div className="attachment-pill" aria-live="polite">
              <span>Imagem pronta para enviar</span>
              <strong>{attachment.name}</strong>
            </div>
          ) : null}

          <p className="composer-copy">
            Digite sua mensagem. Se nao escrever nada, o botao abre a galeria
            para enviar uma imagem.
          </p>

          <button className="send-button" type="submit">
            Enviar
          </button>
        </form>
      </aside>
    </div>
  );
}
