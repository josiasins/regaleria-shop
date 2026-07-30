import http from "node:http";
import { handleCatalogImageRequest } from "./openaiApi.mjs";

const port = Number(process.env.PORT || 3000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: true, service: "regaleria-internal-api" }));
  }
  if (url.pathname === "/api/ai/catalog-image") {
    return handleCatalogImageRequest(req, res);
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Ruta no encontrada." }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Regaleria internal API listening on ${port}`);
});
