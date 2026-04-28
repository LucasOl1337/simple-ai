import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LogsPage from "./LogsPage";
import "./styles.css";

const Root = window.location.pathname === "/logs" ? LogsPage : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <Root />,
);
