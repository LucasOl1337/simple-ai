import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { buildSummary, getCurrentQuestion, getNotepadState } from "../../engine";
import { getPublicSiteUrl, buildKnownNotes, buildMissingNotes, readStoredNoteLayout } from "../utils";
import { NOTE_LAYOUT_STORAGE_KEY } from "../constants";
import WhiteboardNote from "./WhiteboardNote";
import BrowserPreviewPanel from "./BrowserPreviewPanel";
import BuildingCard from "./BuildingCard";
import ReadyToBuildCard from "./ReadyToBuildCard";

const OnboardingLoopPlayer = lazy(() => import("../remotion/OnboardingLoop"));

export default function WhiteboardCanvas({ session, sessionId, buildState, onStartBuild, isStartingBuild, onResetBuild }) {
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

  if (buildState && ["starting", "building", "done", "error"].includes(buildState.status)) {
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
