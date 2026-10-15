import {WebSocket, WebSocketServer} from "ws";

function sendJson(socket, payload){
    if( socket.readyState != WebSocket.OPEN) return ;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  console.log("Broadcasting payload:", payload);
  console.log("Connected clients:", wss.clients.size);

  for (const client of wss.clients) {
    console.log("Client state:", client.readyState);

    if (client.readyState !== WebSocket.OPEN) return;

    client.send(JSON.stringify(payload));
  }
}

export function attatchWebsocketServer(server){
   const wss = new WebSocketServer({
      server,
      path: "/ws", 
      maxPayload: 1024 * 1024, // 1MB
   })

   wss.on('connection', (socket)=>{
     sendJson(socket, {type: "welcome"});

     socket.on('error', console.error);
   })

   function broadcastMatchCreated(match){
     broadcast(wss, {type: "match_created", data: match});
     console.log("Broadcasting:", match);
   }

   return {broadcastMatchCreated}
}   