const express = require("express");
const router = express.Router();
const { fn, col, where } = require("sequelize"); // use where directly
const { Sale, Customer, SalePayment, sequelize } = require("../../models");
const { isAuthenticated } = require("../../middleware/authMiddleware");

/**
 * Safe date formatter that accepts Date or string
 * Returns YYYY-MM-DD or "" if falsy.
 */
function formatYMD(d) {
  if (!d) return "";
  try {
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    const nd = new Date(d);
    if (!isNaN(nd)) return nd.toISOString().slice(0, 10);
    // fallback for DATEONLY strings like "YYYY-MM-DD"
    return String(d).slice(0, 10);
  } catch {
    return "";
  }
}

// Views
router.get("/daily", isAuthenticated, (req, res) =>
  res.render("daily_income", { activePage: "daily-income" })
);
router.get("/monthly", isAuthenticated, (req, res) =>
  res.render("monthly_income", { activePage: "monthly-income" })
);

/**
 * DAILY INCOME (by payment_date)
 */
router.get("/reports/daily/ajax", async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const payments = await SalePayment.findAll({
      where: where(
        fn("DATE_FORMAT", col("SalePayment.payment_date"), "%Y-%m-%d"),
        date
      ),
      include: [
        {
          model: Sale,
          attributes: [
            "sale_id",
            "invoice_number",
            "total_amount",
            "sale_date",
          ],
          include: [
            { model: Customer, attributes: ["name", "address", "phone"] },
            { model: SalePayment, attributes: ["amount"] }, // all payments for remaining calc
          ],
        },
      ],
      order: [
        ["payment_date", "DESC"],
        ["payment_id", "DESC"],
      ],
    });

    const data = payments.map((p) => {
      const s = p.Sale || {};
      const c = s.Customer || {};
      const allPaid = (s.SalePayments || []).reduce(
        (a, x) => a + parseFloat(x.amount || 0),
        0
      );
      const remaining =
        parseFloat(s.total_amount || 0) - parseFloat(allPaid || 0);

      return {
        invoice_number: s.invoice_number || "-",
        customer_name: c.name || "-",
        address: c.address || "-",
        phone: c.phone || "-",
        income: parseFloat(p.amount || 0), // payment amount of that day
        payment_date: formatYMD(p.payment_date),
        total_amount: parseFloat(s.total_amount || 0),
        remaining: parseFloat(remaining < 0 ? 0 : remaining),
        sale_date: formatYMD(s.sale_date),
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

/**
 * MONTHLY INCOME (by payment_date month)
 */
router.get("/reports/monthly/ajax", async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

    const payments = await SalePayment.findAll({
      where: where(
        fn("DATE_FORMAT", col("SalePayment.payment_date"), "%Y-%m"),
        month
      ),
      include: [
        {
          model: Sale,
          attributes: [
            "sale_id",
            "invoice_number",
            "total_amount",
            "sale_date",
          ],
          include: [
            { model: Customer, attributes: ["name", "address", "phone"] },
            { model: SalePayment, attributes: ["amount"] },
          ],
        },
      ],
      order: [
        ["payment_date", "DESC"],
        ["payment_id", "DESC"],
      ],
    });

    const data = payments.map((p) => {
      const s = p.Sale || {};
      const c = s.Customer || {};
      const allPaid = (s.SalePayments || []).reduce(
        (a, x) => a + parseFloat(x.amount || 0),
        0
      );
      const remaining =
        parseFloat(s.total_amount || 0) - parseFloat(allPaid || 0);

      return {
        invoice_number: s.invoice_number || "-",
        customer_name: c.name || "-",
        address: c.address || "-",
        phone: c.phone || "-",
        income: parseFloat(p.amount || 0), // payment amount within this month
        payment_date: formatYMD(p.payment_date),
        total_amount: parseFloat(s.total_amount || 0),
        remaining: parseFloat(remaining < 0 ? 0 : remaining),
        sale_date: formatYMD(s.sale_date),
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

module.exports = router;
