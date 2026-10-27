import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

function sendJson(socket, payload) {
  if (socket.readyState != WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

const MAX_BUFFERED_AMOUNT = 1024 * 1024;

function broadcast(wss, payload) {
  console.log("Broadcasting payload:", payload);
  console.log("Connected clients:", wss.clients.size);

  for (const client of wss.clients) {
    console.log("Client state:", client.readyState);

    if (client.readyState !== WebSocket.OPEN) continue;

    if (client.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      client.close();
      continue;
    }

    client.send(JSON.stringify(payload));
  }
}

export function attatchWebsocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024 * 1024, // 1MB
  });

  server.on("upgrade", async (req, socket, head) => {
    try {
      if (new URL(req.url, "http://localhost").pathname !== "/ws") return;

      if (wsArcjet) {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const isRateLimit = decision.reason.isRateLimit();
          const statusCode = isRateLimit ? 429 : 403;
          const statusText = isRateLimit ? "Too Many Requests" : "Access Denied";
          const body = `${statusText}\n`;
          const response = [
            `HTTP/1.1 ${statusCode} ${statusText}`,
            "Connection: close",
            "Content-Type: text/plain",
            `Content-Length: ${Buffer.byteLength(body)}`,
            "",
            body,
          ].join("\r\n");

          socket.end(response, () => socket.destroy());
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch (err) {
      console.error("ws connection error ", err);
      socket.destroy();
    }
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome" });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
    console.log("Broadcasting:", match);
  }

  return { broadcastMatchCreated };
}
