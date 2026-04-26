import React from "react";
import ReactDOM from "react-dom/client";
import AgoraRTC from "agora-rtc-sdk-ng";
import { AgoraRTCProvider } from "agora-rtc-react";
import App from "./app/App";
import "./app/styles.css";

const agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

try {
  AgoraRTC.setParameter("ENABLE_AUDIO_PTS", true);
} catch {}

try {
  AgoraRTC.setArea({ areaCode: "GLOBAL" });
} catch (error) {
  console.warn("[Agora] setArea failed", error);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AgoraRTCProvider client={agoraClient}>
    <App />
  </AgoraRTCProvider>,
);
