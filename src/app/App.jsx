import { useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "../../assets/logo.svg";
import {
  buildSummary,
  createSession,
  getCurrentQuestion,
  getNotepadState,
  submitAnswer,
} from "../features/discovery/planner";

const STORAGE_KEY = "simple-ai-whiteboard-v5";
const OPENING_MESSAGE = "Oi. Me conta o que voce quer criar.";

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

function buildKnownNotes(summary) {
  const items = [];

  if (isFilled(summary.business_type, ["Nao identificado"])) {
    items.push(summary.business_type);
  }

  if (isFilled(summary.brand_name, ["Nao definido"])) {
    items.push(summary.brand_name);
  }

  if (isFilled(summary.primary_cta, ["Entrar em contato"])) {
    items.push(summary.primary_cta);
  }

  if (isFilled(summary.target_audience, ["Nao definido"])) {
    items.push(summary.target_audience);
  }

  return items.slice(0, 4);
}

function buildMissingNotes(currentQuestion, notepadState) {
  const labels = {
    brand_name: "nome do negocio",
    business_type: "tipo de negocio",
    primary_cta: "acao principal",
    target_audience: "publico",
    scope: "cidade ou regiao",
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
  const [session, setSession] = useState(storedSession);
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
        <WhiteboardCanvas session={session} />
      </main>

      <aside className="chat-dock">
        <div className="chat-dock-head">
          <div className="agent-pill">
            <span
              className={`agent-dot ${isAgentAvailable ? "is-on" : "is-off"}`}
            />
            <span>{isAgentAvailable ? "agente disponivel" : "agente offline"}</span>
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
