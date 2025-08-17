const express = require("express");

const app = express();
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const flash = require("connect-flash");
/* =========================
   Security & Core Middleware
========================= */
app.use(
  helmet({
    contentSecurityPolicy: false, // keep simple for EJS demo
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Simple login brute-force limiter
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 50, // 50 hits per 10 mins
  standardHeaders: true,
  legacyHeaders: false,
});

const SESSION_SECRET = process.env.SESSION_SECRET || "S3cr3t!@#";
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // enable when behind HTTPS
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});
app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views"),
  path.join(__dirname, "views/auth"),
  path.join(__dirname, "views/admin"),
  path.join(__dirname, "views/category"),
  path.join(__dirname, "views/dashboard"),
  path.join(__dirname, "views/layouts"),
]);

const adminRoute = require("./routes/auth");
const categoryRoute = require("./routes/category/category");
app.use("/", categoryRoute);
app.use("/", adminRoute);
app.use("/", require("./routes/dashboard"));
app.use("/login", authLimiter);

app.use(express.json());
app.listen(process.env.PORT, () => {
  console.log(`The server is listen at ${process.env.PORT}`);
});

const password = "Thawzin@#12"; // the password you want
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log("Hashed password:", hash);
