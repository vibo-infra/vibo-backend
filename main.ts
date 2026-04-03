import express from "express";
import cors from "cors";
// import dotenv from "dotenv";
import authRoutes from "./modules/auth";
import eventsRoutes from "./modules/events";
import { analyticsRouter } from "./modules/analytics";
import { webRouter } from "./modules/web";
import { ALLOWED_ORIGINS } from "./config/allowOrigin";

// dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Server Status</title>
      <style>
        body {
          margin: 0;
          font-family: system-ui, -apple-system, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
        }
        .card {
          background: #1e293b;
          padding: 24px 32px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        }
        .status {
          font-size: 18px;
          margin-top: 10px;
          color: #22c55e;
        }
        .dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🚀 Server Status</h2>
        <div class="status">
          <span class="dot"></span> Running
        </div>
      </div>
    </body>
    </html>
  `);
});
app.use('/v0/api/auth', authRoutes);
app.use('/v0/api/events', eventsRoutes);

app.use('/v0/api/web',       webRouter);
app.use('/v0/api/analytics', analyticsRouter);


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});