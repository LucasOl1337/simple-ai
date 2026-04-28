import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "../../assets/logo.png";
import { buildSummary, createDefaultTestSession, createSession, getCurrentQuestion, getNotepadState, submitAnswer } from "../engine";
import { getSiteBuildStatus, queueSiteBuild } from "../../builder/client";
import { filterIntakeMessage } from "./intakeFilterClient";
import { createIntakeTurnReply } from "./firstInteractionClient";
import {
  buildAutoTestAnswer,
  createChatSessionRecord,
  getPublicSiteUrl,
  getSessionTitle,
  isFilled,
  pickAutoTestScenario,
  readStoredChatWorkspace,
  readStoredTheme,
  wait,
} from "./utils";
import {
  ACTIVE_CHAT_SESSION_STORAGE_KEY,
  BUILD_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  OPENING_MESSAGE,
  STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "./constants";
import AppShellErrorBoundary from "./components/AppShellErrorBoundary";
import ParticleField from "./components/ParticleField";
import ThemeToggle from "./components/ThemeToggle";
import SessionRail from "./components/SessionRail";
import TranscriptMessage from "./components/TranscriptMessage";
import WhiteboardCanvas from "./components/WhiteboardCanvas";

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
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [theme, setTheme] = useState(storedTheme);
  const [autoTestState, setAutoTestState] = useState({
    running: false,
    scenario: null,
    step: 0,
    message: "",
  });
  const sessionRef = useRef(session);
  const buildStateRef = useRef(buildState);
  const activeChatSessionIdRef = useRef(activeChatSessionId);
  const fileInputRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const autoTestRunRef = useRef({ runId: 0, cancelled: false, scenarioId: null });

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { buildStateRef.current = buildState; }, [buildState]);
  useEffect(() => { activeChatSessionIdRef.current = activeChatSessionId; }, [activeChatSessionId]);

  useEffect(() => {
    setChatSessions((current) =>
      current.map((item) =>
        item.id === activeChatSessionId
          ? { ...item, session, buildState, title: getSessionTitle(session, buildState, item.title), updatedAt: Date.now() }
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
        const result = await getSiteBuildStatus(buildState.job_id);
        if (cancelled) return;

        if (result.statusCode === 404) {
          setBuildState((prev) => ({
            ...prev,
            status: "error",
            error: "O servidor reiniciou e perdeu este job. Tente construir de novo.",
          }));
          return;
        }
        if (!result.ok) return;
        const data = result.data;
        if (data.status === "done") {
          const nextBuildState = {
            ...buildStateRef.current,
            status: "done",
            site_url: data.site_url,
            preview_url: getPublicSiteUrl({ site_url: data.site_url }),
            usage: data.usage,
          };
          setBuildState((prev) => ({ ...prev, ...nextBuildState }));
          commitActiveChatSession({ buildState: nextBuildState, session: sessionRef.current });
        } else if (data.status === "error") {
          setBuildState((prev) => ({ ...prev, status: "error", error: data.error || "Falha ao construir." }));
        } else if (data.status && data.status !== buildState.status) {
          setBuildState((prev) => ({ ...prev, status: data.status }));
        }
      } catch {
        /* keep polling */
      }
    }, 1500);

    return () => { cancelled = true; clearInterval(interval); };
  }, [buildState?.job_id, buildState?.status]);

  const transcript = useMemo(() => {
    const items = [{ role: "assistant", content: OPENING_MESSAGE }];
    if (!session) {
      items.push(...optimisticMessages);
      return items;
    }
    const optimisticIds = new Set(optimisticMessages.map((message) => message.optimisticId).filter(Boolean));
    items.push(...session.transcript.filter((message) => !message.optimisticId || !optimisticIds.has(message.optimisticId)));
    items.push(...optimisticMessages);
    const currentQuestion = getCurrentQuestion(session);
    const visibleTail = optimisticMessages.length ? optimisticMessages : session.transcript;
    const lastMessage = visibleTail?.[visibleTail.length - 1];
    const shouldShowQuestion = !["starting", "building", "done"].includes(buildState?.status)
      && optimisticMessages.length === 0
      && !["first-interaction-agent", "turn-agent"].includes(lastMessage?.source);
    if (currentQuestion && shouldShowQuestion) {
      items.push({ role: "assistant", content: currentQuestion.question });
    }
    return items;
  }, [buildState?.status, optimisticMessages, session]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [transcript, buildState?.status]);

  const clearAttachment = useCallback(() => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const commitActiveChatSession = useCallback((patch) => {
    const targetId = activeChatSessionIdRef.current;
    setChatSessions((current) =>
      current.map((item) => {
        if (item.id !== targetId) return item;
        const nextSession = Object.prototype.hasOwnProperty.call(patch, "session") ? patch.session : item.session;
        const nextBuildState = Object.prototype.hasOwnProperty.call(patch, "buildState") ? patch.buildState : item.buildState;
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

  const commitChatSessionById = useCallback((sessionId, patch) => {
    if (!sessionId) return;
    setChatSessions((current) =>
      current.map((item) => {
        if (item.id !== sessionId) return item;
        const nextSession = Object.prototype.hasOwnProperty.call(patch, "session") ? patch.session : item.session;
        const nextBuildState = Object.prototype.hasOwnProperty.call(patch, "buildState") ? patch.buildState : item.buildState;
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
    setAutoTestState((current) => current.running ? { ...current, running: false, message: "Teste interrompido." } : current);
    commitActiveChatSession({ session: sessionRef.current, buildState: buildStateRef.current });
    activeChatSessionIdRef.current = next.id;
    setActiveChatSessionId(next.id);
    setSession(next.session ?? null);
    setBuildState(next.buildState ?? null);
    setOptimisticMessages([]);
    setComposer("");
    clearAttachment();
  }, [activeChatSessionId, chatSessions, clearAttachment, commitActiveChatSession]);

  const handleCreateChatSession = useCallback(() => {
    const next = createChatSessionRecord();
    autoTestRunRef.current.cancelled = true;
    setAutoTestState((current) => current.running ? { ...current, running: false, message: "Teste interrompido." } : current);
    commitActiveChatSession({ session: sessionRef.current, buildState: buildStateRef.current });
    activeChatSessionIdRef.current = next.id;
    setChatSessions((current) => [next, ...current]);
    setActiveChatSessionId(next.id);
    setSession(null);
    setBuildState(null);
    setOptimisticMessages([]);
    setComposer("");
    clearAttachment();
  }, [clearAttachment, commitActiveChatSession]);

  const handleDeleteChatSession = useCallback((sessionId) => {
    const target = chatSessions.find((item) => item.id === sessionId);
    if (!target) return;
    autoTestRunRef.current.cancelled = true;
    setAutoTestState((current) => current.running ? { ...current, running: false, message: "Teste interrompido." } : current);
    const title = target.title || "Nova sessão";
    const confirmed = window.confirm(`Excluir a sessão "${title}"? Isso remove a conversa e o site salvo desta sessão apenas neste navegador.`);
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
        setOptimisticMessages([]);
        setComposer("");
        clearAttachment();
      }
      return nextSessions;
    });
  }, [chatSessions, clearAttachment]);

  const applyIntakeFilter = useCallback(async (rawInput, candidateSession = null) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return "";
    const effectiveSession = candidateSession ?? sessionRef.current ?? createSession();
    const currentQuestion = getCurrentQuestion(effectiveSession);
    const notepadState = getNotepadState(effectiveSession);
    const transcriptTail = (effectiveSession.transcript || []).slice(-8);

    const filterResult = await filterIntakeMessage({
      user_message: trimmed,
      current_question: currentQuestion?.question || null,
      current_question_id: currentQuestion?.id || null,
      transcript: transcriptTail,
      notepad: notepadState,
      session_id: activeChatSessionIdRef.current,
    });
    if (typeof filterResult.filtered_message === "string" && filterResult.filtered_message.trim()) {
      return filterResult.filtered_message.trim();
    }
    throw new Error("Agente-filtro retornou resposta sem filtered_message. O chat nao vai continuar sem filtro.");
  }, []);

  const handleConversationSubmit = useCallback((rawInput) => {
    const run = async () => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;
      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setComposer("");
      clearAttachment();
      setOptimisticMessages((current) => [
        ...current,
        { role: "user", content: trimmed, optimisticId, pending: true },
        { role: "assistant", content: "Pensando...", optimisticId: `${optimisticId}-thinking`, pending: true, isLive: true },
      ]);
      const currentSession = sessionRef.current;
      const effectiveSession = currentSession ?? createSession();
      let filteredInput;
      try {
        filteredInput = await applyIntakeFilter(trimmed, effectiveSession);
      } catch (error) {
        setOptimisticMessages((current) => current.filter((message) => !String(message.optimisticId || "").startsWith(optimisticId)));
        const message = error?.message || "Agente-filtro indisponivel. O chat nao roda sem ele.";
        window.alert(message);
        return;
      }

      let nextSession = submitAnswer(effectiveSession, filteredInput);
      const nextQuestion = getCurrentQuestion(nextSession);
      let turnReply;
      try {
        turnReply = await createIntakeTurnReply({
          user_message: trimmed,
          filtered_message: filteredInput,
          notepad: getNotepadState(nextSession),
          local_next_question: nextQuestion?.question || null,
          transcript: nextSession.transcript || [],
          session_id: activeChatSessionIdRef.current,
          is_first_turn: !currentSession,
        });
      } catch (error) {
        setOptimisticMessages((current) => current.filter((message) => !String(message.optimisticId || "").startsWith(optimisticId)));
        const message = error?.message || "Agente de conversa indisponivel. O chat nao vai continuar.";
        window.alert(message);
        return;
      }

      const assistantMessage = turnReply?.assistant_message?.trim();
      if (!assistantMessage) {
        setOptimisticMessages((current) => current.filter((message) => !String(message.optimisticId || "").startsWith(optimisticId)));
        window.alert("Agente de conversa retornou resposta vazia. O chat nao vai continuar.");
        return;
      }
      if (turnReply.action === "build_with_defaults") {
        nextSession = createDefaultTestSession(filteredInput);
      }
      nextSession = {
        ...nextSession,
        transcript: [
          ...nextSession.transcript,
          { role: "assistant", content: assistantMessage, source: "turn-agent", action: turnReply.action },
        ],
        firstInteractionHandled: true,
      };
      setSession(nextSession);
      commitActiveChatSession({ session: nextSession, buildState: buildStateRef.current });
      setOptimisticMessages((current) => current.filter((message) => !String(message.optimisticId || "").startsWith(optimisticId)));
      if (turnReply.action === "build_with_defaults" || turnReply.action === "start_build") {
        await startBuildForSession(nextSession);
      }
    };
    run();
  }, [applyIntakeFilter, clearAttachment, commitActiveChatSession]);

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
        design_plan: summary.design_plan || null,
        visual_plan: summary.visual_plan || null,
        agent_profile: summary.design_plan?.agent_profile || null,
        summary,
      };
      const result = await queueSiteBuild(payload);
      setBuildState({ status: "building", job_id: result?.job_id, message: result?.message, started_at: Date.now() });
    } catch (error) {
      setBuildState({ status: "error", error: error.message || "Falha ao iniciar a construção.", started_at: Date.now() });
    }
  }, []);

  const handleStartBuild = useCallback(() => { startBuildForSession(sessionRef.current); }, [startBuildForSession]);
  const handleResetBuild = useCallback(() => { setBuildState(null); }, []);

  const handleStopAutoTest = useCallback(() => {
    autoTestRunRef.current.cancelled = true;
    setAutoTestState((current) => current.running ? { ...current, running: false, message: "Teste interrompido." } : current);
  }, []);

  const handleStartAutoTest = useCallback(async () => {
    if (autoTestState.running) return;
    handleStopAutoTest();
    handleResetBuild();
    const scenario = pickAutoTestScenario(autoTestRunRef.current.scenarioId);
    autoTestRunRef.current = { runId: autoTestRunRef.current.runId + 1, cancelled: false, scenarioId: scenario.id };
    const runId = autoTestRunRef.current.runId;
    commitActiveChatSession({ session: sessionRef.current, buildState: buildStateRef.current });
    const nextRecord = createChatSessionRecord({ title: `Teste rápido: ${scenario.label}` });
    activeChatSessionIdRef.current = nextRecord.id;
    setChatSessions((current) => [nextRecord, ...current]);
    setActiveChatSessionId(nextRecord.id);
    setSession(null);
    setBuildState(null);
    setComposer("");
    clearAttachment();
    let workingSession = createSession();
    setSession(workingSession);
    commitChatSessionById(nextRecord.id, { session: workingSession, buildState: null });
    setAutoTestState({ running: true, scenario, step: 0, message: "Preparando cenário de teste..." });
    for (let step = 0; step < 18; step += 1) {
      if (autoTestRunRef.current.cancelled || autoTestRunRef.current.runId !== runId) return;
      const currentQuestion = getCurrentQuestion(workingSession);
      if (!currentQuestion) break;
      const answer = buildAutoTestAnswer(currentQuestion, scenario);
      let filteredAnswer;
      try {
        filteredAnswer = await applyIntakeFilter(answer, workingSession);
      } catch (error) {
        setAutoTestState({
          running: false,
          scenario,
          step,
          message: error?.message || "Agente-filtro indisponivel. Teste interrompido.",
        });
        return;
      }
      workingSession = submitAnswer(workingSession, filteredAnswer);
      setSession(workingSession);
      commitChatSessionById(nextRecord.id, { session: workingSession, buildState: null });
      setAutoTestState({ running: true, scenario, step: step + 1, message: `${currentQuestion.question} -> ${filteredAnswer}` });
      if (workingSession.readyToBuild || getNotepadState(workingSession).readyToBuild) break;
      await wait(650);
    }
    if (autoTestRunRef.current.cancelled || autoTestRunRef.current.runId !== runId) return;
    commitChatSessionById(nextRecord.id, { session: workingSession, buildState: buildStateRef.current });
    const readyToBuild = workingSession.readyToBuild || getNotepadState(workingSession).readyToBuild;
    const summary = buildSummary(workingSession);
    const hasPilotBriefing =
      isFilled(summary.brand_name, ["Não definido"]) &&
      isFilled(summary.business_type, ["Não identificado"]) &&
      isFilled(summary.primary_cta, ["Entrar em contato"]);
    setAutoTestState({
      running: false,
      scenario,
      step: getNotepadState(workingSession).messagesCount,
      message: readyToBuild
        ? "Teste concluído. Iniciando a geração do site..."
        : hasPilotBriefing
          ? "Teste concluído. Briefing suficiente para build piloto."
          : "Teste concluído, mas o briefing ainda não ficou pronto.",
    });
    if (readyToBuild || hasPilotBriefing) await startBuildForSession(workingSession);
  }, [applyIntakeFilter, autoTestState.running, clearAttachment, commitActiveChatSession, commitChatSessionById, handleResetBuild, handleStopAutoTest, startBuildForSession]);

  function buildOutgoingMessage() {
    const parts = [];
    if (composer.trim()) parts.push(composer.trim());
    if (attachment) parts.push(`Enviei uma imagem chamada ${attachment.name}.`);
    return parts.join(" ");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (optimisticMessages.length > 0) return;
    if (!composer.trim() && !attachment) { fileInputRef.current?.click(); return; }
    handleConversationSubmit(buildOutgoingMessage());
  }

  function handleComposerKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (optimisticMessages.length > 0) return;
    if (composer.trim() || attachment) { handleConversationSubmit(buildOutgoingMessage()); return; }
    const currentSession = sessionRef.current;
    if (currentSession && getNotepadState(currentSession).readyToBuild && (!buildState || buildState.status === "error")) {
      handleStartBuild();
    }
  }

  const handleFileChange = useCallback((event) => {
    setAttachment(event.target.files?.[0] ?? null);
  }, []);

  return (
    <AppShellErrorBoundary>
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
              <span className="chat-status-dot is-online" aria-hidden="true" />
              <strong>Simple</strong>
            </div>
          </div>

          <div className="transcript-panel" aria-live="polite">
            {transcript.map((message, index) => (
              <TranscriptMessage
                key={`${message.role}-${index}-${message.content}`}
                message={message}
              />
            ))}
            {buildState?.status === "starting" || buildState?.status === "building" ? (
              <div className="typing-indicator" aria-label="Simple está digitando">
                <span /><span /><span />
              </div>
            ) : null}
            <div ref={transcriptEndRef} />
          </div>

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
              disabled={optimisticMessages.length > 0}
              onKeyDown={handleComposerKeyDown}
              onChange={(event) => setComposer(event.target.value)}
              placeholder="> descreva seu negócio..."
              value={composer}
            />
            {attachment ? (
              <div className="attachment-pill" aria-live="polite">
                <span>imagem</span>
                <strong>{attachment.name}</strong>
              </div>
            ) : null}
            <button className="send-button" disabled={optimisticMessages.length > 0} type="submit">
              {optimisticMessages.length > 0 ? "Enviando" : "Enviar"}
            </button>
          </form>
        </aside>
      </div>
    </AppShellErrorBoundary>
  );
}
