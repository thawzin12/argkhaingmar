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

    res.render("sale_voucher", {
      activePage: "sale-voucher",
      customers,
      productSizes,
    });
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

    // sanitize qty/unit price/discount
    items = items.map((i) => {
      const qty = Math.max(1, parseInt(i.quantity) || 1);
      const unit = Number(i.unit_price) || 0;
      const lineTotal = unit * qty;
      let disc = Number(i.discount || 0);
      if (!Number.isFinite(disc) || disc < 0) disc = 0;
      if (disc > lineTotal) disc = lineTotal; // cap
      const net = Number((lineTotal - disc).toFixed(2));
      return {
        ...i,
        quantity: qty,
        unit_price: unit,
        discount: disc,
        subtotal: net, // store net (after line discount)
      };
    });

    // gross/line-discounts/subtotal after line discounts
    const items_gross_total = items.reduce(
      (s, i) => s + Number(i.unit_price) * Number(i.quantity),
      0
    );
    const items_discount_total = items.reduce(
      (s, i) => s + Number(i.discount || 0),
      0
    );
    const total_after_line_discounts = items.reduce(
      (s, i) => s + Number(i.subtotal),
      0
    );

    // compute overall discount on subtotal-after-line
    let discType = (discountType || "amount").toString();
    let discVal = Number(discountValue || 0);
    if (!Number.isFinite(discVal) || discVal < 0) discVal = 0;

    let overall_discount = 0;
    if (discType === "percent") {
      if (discVal > 100) discVal = 100;
      overall_discount = total_after_line_discounts * (discVal / 100);
    } else {
      overall_discount = discVal;
    }
    if (overall_discount > total_after_line_discounts)
      overall_discount = total_after_line_discounts;

    const totalAmount = Number(
      (total_after_line_discounts - overall_discount).toFixed(2)
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
      customer = await Customer.create(
        { name, address, phone },
        { transaction: t }
      );
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
    const total_combined_discount = Number(
      (items_discount_total + overall_discount).toFixed(2)
    );

    const sale = await Sale.create(
      {
        customer_id: customer.customer_id,
        invoice_number: invoiceNumber,
        sale_date: now,
        total_amount: totalAmount, // final net after overall discount
        actual_income: pay,
        discount: total_combined_discount, // store combined discounts
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
          discount: Number(i.discount || 0), // NEW: per-item discount
          subtotal: Number(i.subtotal), // net after line discount
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
      // Compatibility + richer totals for printing
      items_gross_total,
      items_discount_total,
      total_after_line_discounts,
      overall_discount,
      // legacy fields kept meaningful:
      total_before_discount: items_gross_total, // before any discounts
      discount: total_combined_discount, // all discounts combined
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
