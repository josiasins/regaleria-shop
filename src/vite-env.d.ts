/// <reference types="vite/client" />

declare module "../server/openaiApi.mjs" {
  export function registerOpenAiApi(server: unknown): void;
}
