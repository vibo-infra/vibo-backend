import express from "express";
import cors from "cors";
// import dotenv from "dotenv";
import authRoutes from "./modules/auth";
import eventsRoutes from "./modules/events";

// dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/v0/api/auth', authRoutes);
app.use('/v0/api/events', eventsRoutes);


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});