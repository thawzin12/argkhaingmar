const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const {
  Sale,
  SaleItem,
  SalePayment,
  Customer,
  ProductSize,
  Product,
  Size,
  Unit,
  sequelize,
} = require("../../models");

// Render sales page
router.get("/sales", (req, res) =>
  res.render("sales", { activePage: "sale-list" })
);

// AJAX: list sales (for DataTables)
router.get("/sales/ajax", async (req, res) => {
  try {
    const { date, month, customer } = req.query;

    // Build where for date/month
    let where = {};
    if (date) {
      where.sale_date = date;
    } else if (month) {
      const [year, mon] = month.split("-").map(Number);
      // filter by YYYY-MM
      where = sequelize.where(
        sequelize.fn("DATE_FORMAT", sequelize.col("sale_date"), "%Y-%m"),
        `${year}-${String(mon).padStart(2, "0")}`
      );
    }

    // fetch sales with relationships
    const sales = await Sale.findAll({
      where,
      include: [
        {
          model: Customer,
          attributes: ["customer_id", "name", "phone", "address"],
        },
        { model: SaleItem },
        { model: SalePayment },
      ],
      order: [["sale_date", "DESC"]],
    });

    // format for front-end
    const data = sales.map((s) => {
      const totalPaid = (s.SalePayments || []).reduce(
        (a, p) => a + parseFloat(p.amount || 0),
        0
      );
      const totalAmount = parseFloat(s.total_amount) || 0;
      const remaining = totalAmount - totalPaid;

      // prefer customer record; fallback to snapshot fields if you store them
      const custId = s.Customer ? s.Customer.customer_id : null;
      const custName = s.Customer ? s.Customer.name : s.customer_name || "-";
      const custPhone = s.Customer
        ? s.Customer.phone || "-"
        : s.customer_phone || "-";
      const custAddr = s.Customer
        ? s.Customer.address || "-"
        : s.customer_address || "-";

      return {
        sale_id: s.sale_id,
        invoice_number: s.invoice_number,
        customer_id: custId, // <-- expose id for stable grouping
        customer_name: custName,
        customer_address: custAddr,
        customer_phone: custPhone,
        sale_date: s.sale_date
          ? new Date(s.sale_date).toISOString().slice(0, 10)
          : "",
        total_amount: totalAmount,
        total_paid: totalPaid,
        remaining,
        status: remaining <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Unpaid",
      };
    });

    // optional client-side customer *name* filter (substring match)
    const filtered = customer
      ? data.filter((d) =>
          (d.customer_name || "")
            .toLowerCase()
            .includes(String(customer).toLowerCase())
        )
      : data;

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// Fetch sale items for modal
router.get("/sales/items/:id", async (req, res) => {
  try {
    const saleId = req.params.id;
    const items = await SaleItem.findAll({
      where: { sale_id: saleId },
      include: [{ model: ProductSize, include: [Product, Size, Unit] }],
    });

    const fmt = (n) => Number(n || 0).toFixed(2);

    const data = items.map((i) => ({
      product_name: i.ProductSize?.Product?.name || i.product_name || "",
      size_label: i.ProductSize?.Size?.size_label || "",
      unit_label: i.ProductSize?.Unit?.unit_label || "",
      quantity: i.quantity,
      unit_price: fmt(i.unit_price),
      discount: fmt(i.discount || 0),
      subtotal: fmt(i.subtotal),
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Record sale payment
router.post("/sales/pay/:id", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const saleId = req.params.id;
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0)
      return res.json({ success: false, message: "Invalid amount" });

    const sale = await Sale.findByPk(saleId, {
      include: [SalePayment],
      transaction: t,
    });
    if (!sale) throw new Error("Sale not found");

    // Create payment
    await SalePayment.create(
      {
        sale_id: saleId,
        payment_date: new Date(),
        amount,
        method: "cash",
        uid: req.user ? req.user.id : 1,
      },
      { transaction: t }
    );

    // Recalculate
    const payments = await SalePayment.findAll({
      where: { sale_id: saleId },
      transaction: t,
    });
    const totalPaid = payments.reduce(
      (s, p) => s + parseFloat(p.amount || 0),
      0
    );

    const newStatus =
      totalPaid >= parseFloat(sale.total_amount || 0)
        ? "Paid"
        : totalPaid > 0
        ? "Partial"
        : "Unpaid";

    await sale.update(
      { actual_income: totalPaid, status: newStatus },
      { transaction: t }
    );

    await t.commit();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    await t.rollback();
    res.json({ success: false, message: err.message });
  }
});

// Delete sale (restore stock, delete items & payments & sale)
router.delete("/sales/delete/:id", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const saleId = req.params.id;
    const items = await SaleItem.findAll({
      where: { sale_id: saleId },
      transaction: t,
    });

    // restore stock
    for (const it of items) {
      const ps = await ProductSize.findByPk(it.size_id, { transaction: t });
      if (ps) {
        const newStock = (ps.stock_qty || 0) + (it.quantity || 0);
        await ps.update({ stock_qty: newStock }, { transaction: t });
      }
    }

    // delete related records
    await SaleItem.destroy({ where: { sale_id: saleId }, transaction: t });
    await SalePayment.destroy({ where: { sale_id: saleId }, transaction: t });
    await Sale.destroy({ where: { sale_id: saleId }, transaction: t });

    await t.commit();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    await t.rollback();
    res.json({ success: false, message: err.message });
  }
});

//////////////////
router.get("/viewcustomer", (req, res) =>
  res.render("viewcustomer", { activePage: "customer-summary" })
);

// Get summary by customer with optional date range
router.get("/sales/customer-summary", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const where = {};

    if (fromDate && toDate) {
      where.sale_date = { [Op.between]: [fromDate, toDate] };
    }

    const sales = await Sale.findAll({
      where,
      include: [Customer, SalePayment],
    });

    const map = {};
    sales.forEach((s) => {
      const cid = s.Customer ? s.Customer.customer_id : "unknown";
      if (!map[cid]) {
        map[cid] = {
          customer_id: cid,
          customer_name: s.Customer ? s.Customer.name : "-",
          customer_phone: s.Customer ? s.Customer.phone : "-",
          customer_address: s.Customer ? s.Customer.address : "-",
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0,
        };
      }
      const totalPaid = (s.SalePayments || []).reduce(
        (a, p) => a + parseFloat(p.amount || 0),
        0
      );
      const totalAmount = parseFloat(s.total_amount) || 0;
      const remaining = totalAmount - totalPaid;

      map[cid].total_amount += totalAmount;
      map[cid].total_paid += totalPaid;
      map[cid].total_remaining += remaining;
    });

    res.json(Object.values(map));
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Update customer phone/address with validation
router.post("/customers/update/:id", async (req, res) => {
  try {
    const { phone, address } = req.body;

    // Validate phone
    if (!/^[0-9]{9,11}$/.test(phone)) {
      return res.json({
        success: false,
        message: "Phone must be 9–11 digits.",
      });
    }

    // Check unique phone
    const existing = await Customer.findOne({
      where: { phone, customer_id: { [Op.ne]: req.params.id } },
    });
    if (existing) {
      return res.json({ success: false, message: "Phone already exists." });
    }

    await Customer.update(
      { phone, address },
      { where: { customer_id: req.params.id } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
