import express from "express";
import { matchRouter } from "./routes/matchRouter.js";

const app = express();
const PORT = 8000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Hello from the Express server!" });
});

app.use("/matches", matchRouter);

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});