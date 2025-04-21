import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";
import { init } from "@telegram-apps/sdk-react";

// Initialize router by importing it (the hook ensures it's set up)
import "./utils/use-router";

try {
  init();
} catch (error) {
  console.error("Error initializing Telegram SDK:", error);
}

render(<App />, document.getElementById("app")!);
