const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// ✅ Load .env immediately at startup (absolute path to server/.env)
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

// Debug logs at startup
console.log("==== Loaded ENV values at startup ====");
console.log("ENV PATH:", envPath);
console.log("JWT_SECRET set:", Boolean(process.env.JWT_SECRET));
console.log("FIREBASE_WEB_API_KEY set:", Boolean(process.env.FIREBASE_WEB_API_KEY));
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || "<missing>");
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL || "<missing>");
console.log("Private Key Exists:", Boolean(process.env.FIREBASE_PRIVATE_KEY));
console.log("======================================");

// ✅ Health route
app.get("/health", (_req, res) => {
    console.log(">>> HEALTH CHECK ROUTE IS RUNNING <<<");
  
    res.json({
      status: "ok",
      env: {
        jwtSecret: Boolean(process.env.JWT_SECRET),
        firebaseWebApiKey: Boolean(process.env.FIREBASE_WEB_API_KEY),
        firebaseAdmin: {
          projectId: Boolean(process.env.FIREBASE_PROJECT_ID),
          clientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
          privateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
        },
      },
    });
  });
  
// Example: auth routes (keep your existing)
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
