import React from "react";
import ReactDOM from "react-dom/client";
import AgoraRTC from "agora-rtc-sdk-ng";
import App from "./app/App";
import "./app/styles.css";

try {
  AgoraRTC.setParameter("ENABLE_AUDIO_PTS_METADATA", true);
} catch {}

try {
  AgoraRTC.setArea({ areaCode: "GLOBAL" });
} catch (error) {
  console.warn("[Agora] setArea failed", error);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />,
);
