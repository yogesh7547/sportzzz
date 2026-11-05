import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers= new Map();

function subscribe(matchId, socket){
  if(!matchSubscribers.has(matchId)){
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket){
  const subscribers = matchSubscribers.get(matchId);

  if(!subscribers) return;

  subscribers.delete(socket);

  if(subscribers.size === 0){
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket){

  for (const matchId of socket.subscriptions){
    unsubscribe(matchId, socket);
  }
}

function sendJson(socket, payload) {
  if (socket.readyState != WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

const MAX_BUFFERED_AMOUNT = 1024 * 1024;

function broadcastToAll(wss, payload) {
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


function broadcastToMatch(matchId, payload){
  const subscribers = matchSubscribers.get(matchId);

  if(!subscribers || subscribers.size===0) return;

  const message = JSON.stringify(payload);

  for(const client of subscribers){
    if(client.readyState !== WebSocket.OPEN) {
      continue;
    }
    client.send(message);
  }
}

function handleMessage(socket, data){
  let message;

  try{

    message = JSON.parse(data.toString());

  }
  catch{
    sendJson(socket, { type: "error", message: "Invalid JSON" });
  }

  if(message?.type=== "subscribe" && Number.isInteger(message.matchId)){
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if(message?.type=== "unsubscribe" && Number.isInteger(message.matchId)){
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
    return;
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

    socket.subscriptions = new Set();

    sendJson(socket, { type: "welcome" });

    socket.on("message", (data) => {
      handleMessage(socket, data);
    });

    socket.on('error', ()=>{
      socket.terminate();
    })

    socket.on('close', ()=>{
      cleanupSubscriptions(socket);
    })

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
    broadcastToAll(wss, { type: "match_created", data: match });
    console.log("Broadcasting:", match); 
  }

  function broadcastCommentary(matchId, comment){
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}
