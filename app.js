var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var session = require("express-session");
var i18n = require("i18n");

i18n.configure({
  locales: ['en', 'id', 'jp', 'ph'],
  directory: path.join(__dirname, 'locales'),
  defaultLocale: 'en',
  cookie: 'lang'
});

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var apiRouter = require("./routes/api");
var adminRouter = require("./routes/admin");
var cors = require("cors");
var authMiddleware = require("./middleware/authMiddleware");
var whatsappService = require("./services/whatsapp");
var cron = require("node-cron");
var moderationService = require("./services/moderationService");
var helmet = require("helmet");
var rateLimit = require("express-rate-limit");

// Initialize WhatsApp Client
whatsappService.client.initialize();

// Initialize Backup Job (Only in production to avoid local test overwrites)
if (process.env.APP_ENV === 'production') {
    const backupJob = require('./jobs/backup');
    backupJob.init();
    console.log("🛡️ [BACKUP] Automated Backup System initialized (Production Mode)");
}

// --- CRON JOBS ---
// Run Atelier Sentinel (Midnight Triage) at 00:00 every day
cron.schedule("0 0 * * *", async () => {
    console.log("🚀 [SENTINEL] Starting Midnight Triage Batch...");
    try {
        const result = await moderationService.runBatchModeration();
        console.log(`✅ [SENTINEL] Triage complete. Processed ${result.processed} items.`);
    } catch (error) {
        console.error("❌ [SENTINEL] Triage failed:", error);
    }
});

var app = express();
app.set("trust proxy", 1); // Trust first reverse proxy (e.g. Nginx, Load Balancer)

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use("/api/", apiLimiter);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(i18n.init); // Initialize i18n after cookie parser

// Session Configuration
app.use(
  session({
    secret: "atelier-curator-secret-2026",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.use("/storage", express.static(path.join(__dirname, "storage")));
// Add this route so that https://dietalase.com/Assets/... maps directly to the local storage/Assets folder
app.use("/Assets", express.static(path.join(__dirname, "storage/Assets")));

// Map specific asset subdirectories to root so flat filenames can be resolved
const assetsPath = path.join(__dirname, "storage/Assets");
app.use(express.static(path.join(assetsPath, "Product_Image")));
app.use(express.static(path.join(assetsPath, "Store_Image")));
app.use(express.static(path.join(assetsPath, "Owner_Image")));
app.use(express.static(path.join(assetsPath, "Chat_Media")));
app.use(express.static(path.join(assetsPath, "Product_Video")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/admin", adminRouter);
app.use("/field", require("./routes/field"));
app.use("/api/admin", require("./routes/admin-assets"));

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

// Apply apiRouter (authMiddleware is now handled inside apiRouter)
app.use("/api", apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
