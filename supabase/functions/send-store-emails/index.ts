import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async () => {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("STORE_EMAIL_FROM") ?? "Regaleria Shop <pedidos@regaleriashop.com>";
  if (!resendKey) return new Response("Falta RESEND_API_KEY", { status: 500 });

  const { data: rows, error } = await supabase
    .from("store_email_queue")
    .select("id,recipient,data")
    .eq("status", "pendiente")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) return new Response(error.message, { status: 500 });

  for (const row of rows ?? []) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: row.recipient,
        subject: row.data.subject,
        html: row.data.html
      })
    });

    await supabase
      .from("store_email_queue")
      .update({
        status: response.ok ? "enviado" : "fallo",
        data: { ...row.data, status: response.ok ? "enviado" : "fallo" }
      })
      .eq("id", row.id);
  }

  return Response.json({ processed: rows?.length ?? 0 });
});
