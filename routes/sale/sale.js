const express = require("express");
const router = express.Router();
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

// GET
router.get("/salevoucher", async (req, res) => {
  try {
    // include id, name, address, phone for picker
    const customers = await Customer.findAll({
      order: [["name", "ASC"]],
      attributes: ["customer_id", "name", "address", "phone"],
    });

    const productSizes = await ProductSize.findAll({
      include: [Product, Size, Unit],
      attributes: ["size_id", "barcode", "sale_price", "stock_qty"],
      order: [
        [Product, "name", "ASC"],
        [Size, "size_label", "ASC"],
      ],
    });

    res.render("sale_voucher", { customers, productSizes });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load sale voucher page.");
    res.redirect("/");
  }
});

// POST
router.post("/salevoucher", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let {
      customerName,
      customerAddress,
      customerPhone,
      items,
      paidAmount,
      paymentMethod, // ignored (auto decide)
      discountType,
      discountValue,
    } = req.body;

    items = JSON.parse(items || "[]");
    if (!customerName || items.length === 0) {
      return res.json({
        success: false,
        message: "Customer and items required.",
      });
    }

    // sanitize qty/unit price
    items = items.map((i) => ({
      ...i,
      quantity: Math.max(1, parseInt(i.quantity) || 1),
      unit_price: Number(i.unit_price) || 0,
      subtotal: Number(
        i.subtotal || (Number(i.unit_price) || 0) * (parseInt(i.quantity) || 1)
      ),
    }));

    // base total BEFORE discount
    const totalBeforeDiscount = items.reduce(
      (s, i) => s + Number(i.subtotal),
      0
    );

    // compute discount
    let discType = (discountType || "amount").toString();
    let discVal = Number(discountValue || 0);
    if (!Number.isFinite(discVal) || discVal < 0) discVal = 0;

    let discountAmount = 0;
    if (discType === "percent") {
      if (discVal > 100) discVal = 100;
      discountAmount = totalBeforeDiscount * (discVal / 100);
    } else {
      discountAmount = discVal;
    }
    if (discountAmount > totalBeforeDiscount)
      discountAmount = totalBeforeDiscount;

    const totalAmount = Number(
      (totalBeforeDiscount - discountAmount).toFixed(2)
    );

    // paid
    let pay = parseFloat(paidAmount);
    if (isNaN(pay) || pay < 0) pay = totalAmount;
    if (pay > totalAmount) pay = totalAmount;

    // -----------------------------
    // Customer upsert (UNIQUE by name+address+phone)
    // -----------------------------
    const name = (customerName || "").trim();
    const address = (customerAddress || "").trim();
    const phone = (customerPhone || "").trim();

    // strictly look up by triple
    let customer = await Customer.findOne({
      where: { name, address, phone },
      transaction: t,
    });

    if (!customer) {
      // Optional: guard to avoid accidental duplicates if phone omitted:
      // If exact name+address exists but phone differs, we still create new because uniqueness is triple.
      customer = await Customer.create(
        { name, address, phone },
        { transaction: t }
      );
    } else {
      // Nothing to update for identity fields; keep as-is.
      // If you keep other fields on Customer, update them here as needed.
    }

    // Stock check
    for (const i of items) {
      const ps = await ProductSize.findByPk(i.size_id, { transaction: t });
      if (!ps || Number(ps.stock_qty) < Number(i.quantity)) {
        await t.rollback();
        return res.json({
          success: false,
          message: `Insufficient stock for ${i.product_name}`,
        });
      }
    }

    // Status + payment method
    const status = pay >= totalAmount ? "paid" : pay > 0 ? "partial" : "unpaid";
    const balance = Number((totalAmount - pay).toFixed(2));
    const decidedMethod = balance === 0 ? "cash" : "credit";

    // Invoice #
    const last = await Sale.findOne({
      order: [["sale_id", "DESC"]],
      transaction: t,
    });
    const nextId = last ? last.sale_id + 1 : 1;
    const now = new Date();
    const invoiceNumber = `S-${now.getFullYear()}-${String(nextId).padStart(
      4,
      "0"
    )}`;

    // Create sale
    const sale = await Sale.create(
      {
        customer_id: customer.customer_id,
        invoice_number: invoiceNumber,
        sale_date: now,
        total_amount: totalAmount, // net after discount
        actual_income: pay,
        discount: discountAmount,
        status,
        uid: req.user ? req.user.id : 1,
      },
      { transaction: t }
    );

    // Items & stock update
    for (const i of items) {
      await SaleItem.create(
        {
          sale_id: sale.sale_id,
          size_id: i.size_id,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          subtotal: Number(i.subtotal),
        },
        { transaction: t }
      );
      const ps = await ProductSize.findByPk(i.size_id, { transaction: t });
      await ps.update(
        { stock_qty: ps.stock_qty - Number(i.quantity) },
        { transaction: t }
      );
    }

    // Payment record
    if (pay > 0) {
      await SalePayment.create(
        {
          sale_id: sale.sale_id,
          payment_date: now,
          amount: pay,
          method: decidedMethod,
          uid: req.user ? req.user.id : 1,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return res.json({
      success: true,
      invoice_number: invoiceNumber,
      items,
      total_before_discount: totalBeforeDiscount,
      discount: discountAmount,
      total_amount: totalAmount,
      paid_amount: pay,
      balance,
      method: decidedMethod,
      status,
      customer,
    });
  } catch (err) {
    console.error(err);
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
