import { webcrypto } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); window.localStorage.clear(); });
it("uses a browser-bound S256 challenge rather than an implicit token redirect", async () => {
  vi.resetModules(); window.localStorage.clear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://fixture.example.invalid");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "fictional-public-test-key");
  vi.stubGlobal("crypto", webcrypto);
  const { supabase } = await import("./supabaseClient");
  try {
    const { data, error } = await supabase!.auth.signInWithOAuth({ provider: "google", options: { skipBrowserRedirect: true } });
    expect(error).toBeNull();
    const url = new URL(data.url!);
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("code_challenge_method")).toBe("s256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.hash).toBe("");
  } finally { await supabase!.auth.stopAutoRefresh(); }
});
