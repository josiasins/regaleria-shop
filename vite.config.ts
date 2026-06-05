import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { registerOpenAiApi } from "./server/openaiApi.mjs";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [
      react(),
      {
        name: "regaleria-openai-api",
        configureServer(server) {
          registerOpenAiApi(server);
        }
      }
    ],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"]
    }
  };
});
