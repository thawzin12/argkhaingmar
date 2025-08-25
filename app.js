const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const flash = require("connect-flash");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SESSION_SECRET = process.env.SESSION_SECRET || "S3cr3t!@#";
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

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
const productRoute = require("./routes/product/product");
const purchaseRoute = require("./routes/purchase/purchase");
const saleRoute = require("./routes/sale/sale");

app.use("/", categoryRoute);
app.use("/", saleRoute);
app.use("/", purchaseRoute);
app.use("/", adminRoute);
app.use("/", productRoute);
app.use("/", require("./routes/dashboard"));

app.use(express.json());
app.listen(process.env.PORT, () => {
  console.log(`The server is listen at ${process.env.PORT}`);
});

const password = "Thawzin@#12"; // the password you want
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log("Hashed password:", hash);
