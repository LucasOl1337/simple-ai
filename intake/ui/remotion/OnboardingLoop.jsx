import { Player } from "@remotion/player";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const mockMessages = [
  ["SIMPLE", "Me conta o que você quer criar."],
  ["VOCÊ", "Uma landing page para uma clínica nova."],
  ["SIMPLE", "Entendi. Vou montar proposta, estrutura e CTA."],
];

export function OnboardingLoop() {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [150, 180], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const previewOpacity = interpolate(frame, [78, 116], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        color: "#3a3127",
        fontFamily: "Erode, serif",
        opacity: fadeOut,
        padding: 28,
      }}
    >
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "0.85fr 1.15fr", height: "100%" }}>
        <div style={{ alignSelf: "center", display: "grid", gap: 12 }}>
          {mockMessages.map(([author, text], index) => {
            const start = 8 + index * 22;
            const opacity = interpolate(frame, [start, start + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const y = interpolate(frame, [start, start + 12], [18, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={text}
                style={{
                  alignSelf: author === "VOCÊ" ? "end" : "start",
                  background: author === "VOCÊ" ? "rgba(184,106,74,0.12)" : "rgba(254,251,242,0.78)",
                  border: "1px solid rgba(58,49,39,0.12)",
                  borderLeft: author === "VOCÊ" ? "3px solid #b86a4a" : "3px solid rgba(58,49,39,0.2)",
                  borderRadius: 8,
                  maxWidth: "92%",
                  opacity,
                  padding: "10px 12px",
                  transform: `translateY(${y}px)`,
                }}
              >
                <div style={{ color: "#b86a4a", fontFamily: "Erode, serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
                  {author}
                </div>
                <div style={{ fontSize: 15, fontWeight: 400, lineHeight: 1.4 }}>{text}</div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            alignSelf: "center",
            background: "rgba(254,251,242,0.86)",
            border: "1px solid rgba(58,49,39,0.12)",
            borderRadius: 10,
            opacity: previewOpacity,
            overflow: "hidden",
          }}
        >
          <div style={{ background: "rgba(58,49,39,0.06)", height: 28 }} />
          <div style={{ display: "grid", gap: 14, padding: 22 }}>
            <div style={{ background: "#b86a4a", borderRadius: 3, height: 8, width: "28%" }} />
            <div style={{ background: "#3a3127", borderRadius: 4, height: 22, width: "76%" }} />
            <div style={{ background: "rgba(58,49,39,0.18)", borderRadius: 4, height: 8, width: "88%" }} />
            <div style={{ background: "rgba(58,49,39,0.12)", borderRadius: 4, height: 8, width: "62%" }} />
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, 1fr)", marginTop: 10 }}>
              <div style={{ background: "rgba(184,106,74,0.14)", border: "1px solid rgba(184,106,74,0.32)", borderRadius: 8, height: 62 }} />
              <div style={{ background: "rgba(58,49,39,0.06)", border: "1px solid rgba(58,49,39,0.1)", borderRadius: 8, height: 62 }} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export default function OnboardingLoopPlayer() {
  return (
    <Player
      acknowledgeRemotionLicense
      autoPlay
      component={OnboardingLoop}
      compositionHeight={420}
      compositionWidth={760}
      controls={false}
      durationInFrames={180}
      fps={30}
      loop
      muted
      style={{ height: "100%", width: "100%" }}
    />
  );
}
