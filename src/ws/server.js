import { WebSocket, WebSocketServer } from "ws";

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
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1MB
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => { socket.isAlive = true; });

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
