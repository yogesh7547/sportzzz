import express from "express";
import { matchRouter } from "./routes/matchRouter.js";
import http from "http";
import  {attatchWebsocketServer}  from "./ws/server.js";


const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';
const app = express();

const server= http.createServer(app);

app.use(express.json());



app.get("/", (_req, res) => {
  res.json({ message: "Hello from the Express server!" });
});

app.use("/matches", matchRouter);

const {broadcastMatchCreated} = attatchWebsocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT,HOST, () => {
  const baseURL = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`; 
  console.log(`Server listening at ${baseURL}`);
  console.log(`WebSocket server listening at ${baseURL.replace('http', 'ws')}/ws`);
});