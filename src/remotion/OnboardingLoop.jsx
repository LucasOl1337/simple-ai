import { Player } from "@remotion/player";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const mockMessages = [
  ["SIMPLE", "Me conta o que voce quer criar."],
  ["VOCE", "Uma landing page para uma clinica nova."],
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
        color: "#f0f0f0",
        fontFamily: "Geist, sans-serif",
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
                  alignSelf: author === "VOCE" ? "end" : "start",
                  background: author === "VOCE" ? "rgba(229,165,91,0.11)" : "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderLeft: author === "VOCE" ? "3px solid #E5A55B" : "3px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  maxWidth: "92%",
                  opacity,
                  padding: "10px 12px",
                  transform: `translateY(${y}px)`,
                }}
              >
                <div style={{ color: "#E5A55B", fontFamily: "JetBrains Mono, monospace", fontSize: 9 }}>
                  {author}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.35 }}>{text}</div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            alignSelf: "center",
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            opacity: previewOpacity,
            overflow: "hidden",
          }}
        >
          <div style={{ background: "rgba(255,255,255,0.06)", height: 28 }} />
          <div style={{ display: "grid", gap: 14, padding: 22 }}>
            <div style={{ background: "#E5A55B", borderRadius: 3, height: 8, width: "28%" }} />
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 4, height: 22, width: "76%" }} />
            <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 4, height: 8, width: "88%" }} />
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 4, height: 8, width: "62%" }} />
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, 1fr)", marginTop: 10 }}>
              <div style={{ background: "rgba(229,165,91,0.12)", border: "1px solid rgba(229,165,91,0.22)", borderRadius: 8, height: 62 }} />
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, height: 62 }} />
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
