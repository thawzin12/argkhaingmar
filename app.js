const express = require("express");
const app = express();
require("dotenv-flow").config();
const path = require("path");
const bcrypt = require("bcryptjs");
const flash = require("connect-flash");
const SESSION_SECRET = process.env.SESSION_SECRET || "S3cr3t!@#";
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const sequelize = require("./config/database");

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: "sessions",
});

// Tell Express it’s behind a proxy (needed for secure cookies on prod)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: SESSION_SECRET,
    name: "session.id", // explicit cookie name (avoid default "connect.sid")
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // only set cookie over HTTPS in prod
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

sessionStore.sync();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Sync the session table

app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.formData = req.flash("formData")[0] || {};
  next();
});
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views")]);

const adminRoute = require("./routes/auth");
const categoryRoute = require("./routes/category/category");
const viewCategoryRoute = require("./routes/category/viewcategory");
const productRoute = require("./routes/product/product");
const purchaseRoute = require("./routes/purchase/purchase");
const saleRoute = require("./routes/sale/sale");
const saleRoutes = require("./routes/sale/sales");
const incomeRoute = require("./routes/sale/income");
const unitRoute = require("./routes/unit/unit");
const sizeRoute = require("./routes/size/size");
const supplierRoute = require("./routes/supplier/supplier");

app.use("/", categoryRoute);
app.use("/", viewCategoryRoute);
app.use("/", supplierRoute);
app.use("/", sizeRoute);
app.use("/", unitRoute);
app.use("/", saleRoute);
app.use("/", saleRoutes);
app.use("/", incomeRoute);
app.use("/", purchaseRoute);
app.use("/", adminRoute);
app.use("/", productRoute);
app.use("/", require("./routes/dashboard"));

app.use(express.json());
// Handle 404 - Keep this at the end, after all routes
app.use((req, res, next) => {
  res.status(404).render("404", {
    title: "Page Not Found",
    activePage: "404",
  });
});

// // Error handler (500 etc.)
// app.use((err, req, res, next) => {
//   console.error(err.stack);

//   res.status(500).render("error", {
//     title: "Error",
//     message:
//       process.env.NODE_ENV === "production"
//         ? "Something went wrong, please try again later."
//         : err.message,
//   });
// });

const PORT = process.env.PORT || process.env.SERVER_PORT || 4500;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
const password = "Thawzin@#12"; // the password you want
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log("Hashed password:", hash);
