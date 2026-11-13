import { createClient } from "https://esm.sh/@supabase/supabase-js@2.107.0";

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Método no permitido", { status: 405 });
  const cronSecret = Deno.env.get("EMAIL_CRON_SECRET");
  if (!cronSecret || request.headers.get("Authorization") !== `Bearer ${cronSecret}`) return new Response("No autorizado", { status: 401 });
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("STORE_EMAIL_FROM");
  if (!resendKey || !from) return new Response("Falta configurar el proveedor y el remitente verificado", { status: 503 });

  const { data: rows, error } = await supabase.rpc("claim_store_email_batch", { batch_size: 25 });
  if (error) return new Response("No se pudo reservar la cola", { status: 503 });
  let accepted = 0;
  for (const row of rows ?? []) {
    let ok = false;
    let providerId: string | null = null;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(20_000),
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `regaleria-${row.id}` },
        body: JSON.stringify({ from, to: row.recipient, subject: row.data.subject, html: row.data.html })
      });
      ok = response.ok;
      if (ok) providerId = (await response.json()).id ?? null;
    } catch { /* Timeout keeps the record retryable with the same idempotency key. */ }
    const status = ok ? "enviado" : "fallo";
    await supabase.from("store_email_queue").update({ status, data: { ...row.data, status }, provider_message_id: providerId, processing_started_at: null, last_error: ok ? null : "Proveedor no confirmó la aceptación" }).eq("id", row.id).eq("status", "procesando");
    if (ok) accepted++;
  }
  // Provider acceptance is not proof of delivery to the recipient's inbox.
  return Response.json({ processed: rows?.length ?? 0, accepted });
});
