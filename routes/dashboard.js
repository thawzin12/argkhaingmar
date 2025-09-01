const express = require("express");
const router = express.Router();
const {
  Category,
  Product,
  Supplier,
  Customer,
  SalePayment,
} = require("../models");
const { Op } = require("sequelize");

// Helper: Last N days labels
const getLastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
  }
  return days;
};

// Helper: Last 12 months labels
const getLast12Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}`);
  }
  return months;
};

router.get("/dashboard", async (req, res) => {
  try {
    // Counts
    const [categoryCount, productCount, supplierCount, customerCount] =
      await Promise.all([
        Category.count(),
        Product.count(),
        Supplier.count(),
        Customer.count(),
      ]);

    // Today & Month Income
    const now = new Date();

    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0
    );
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const [todayIncome, monthIncome] = await Promise.all([
      SalePayment.sum("amount", {
        where: { payment_date: { [Op.between]: [startOfDay, endOfDay] } },
      }) || 0,
      SalePayment.sum("amount", {
        where: { payment_date: { [Op.between]: [startOfMonth, endOfMonth] } },
      }) || 0,
    ]);

    // Chart data: last 7 days
    const last7Days = getLastNDays(7);
    const last7DaysIncome = await Promise.all(
      last7Days.map(async (day) => {
        const start = new Date(day + "T00:00:00");
        const end = new Date(day + "T23:59:59");
        return (
          (await SalePayment.sum("amount", {
            where: { payment_date: { [Op.between]: [start, end] } },
          })) || 0
        );
      })
    );

    // Chart data: this month (daily)
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const thisMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const thisMonthIncome = await Promise.all(
      thisMonthDays.map(async (day) => {
        const start = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0);
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          day,
          23,
          59,
          59
        );
        return (
          (await SalePayment.sum("amount", {
            where: { payment_date: { [Op.between]: [start, end] } },
          })) || 0
        );
      })
    );

    // Chart data: last 12 months
    const last12Months = getLast12Months();
    const last12MonthsIncome = await Promise.all(
      last12Months.map(async (month) => {
        const [year, mon] = month.split("-");
        const start = new Date(year, mon - 1, 1, 0, 0, 0);
        const end = new Date(year, mon, 0, 23, 59, 59);
        return (
          (await SalePayment.sum("amount", {
            where: { payment_date: { [Op.between]: [start, end] } },
          })) || 0
        );
      })
    );

    res.render("dashboard", {
      categoryCount,
      productCount,
      supplierCount,
      customerCount,
      todayIncome,
      monthIncome,
      last7Days,
      last7DaysIncome,
      thisMonthDays,
      thisMonthIncome,
      last12Months,
      last12MonthsIncome,
      activePage: "dashboard",
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Could not load dashboard data");
    res.redirect("/");
  }
});

module.exports = router;
