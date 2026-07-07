import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import { PomodoroApp } from "./features/pomodoro/PomodoroApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PomodoroApp />
  </React.StrictMode>,
);
