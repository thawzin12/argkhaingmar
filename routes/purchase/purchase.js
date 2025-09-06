const express = require("express");
const router = express.Router();
const { Op, fn, col, where: seqWhere } = require("sequelize");
const { isValidSpaceName } = require("../../utils/validation");
// GET Supplier creation page

const {
  Purchase,
  InventoryMovement,
  PurchaseItem,
  PurchasePayment,
  Supplier,
  ProductSize,
  Product,
  Size,
  Unit,
  sequelize,
} = require("../../models");
const { isAuthenticated } = require("../../middleware/authMiddleware");
router.get("/createpurchase", isAuthenticated, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({ order: [["name", "ASC"]] });

    // This JOIN returns ps.size_id (PK of product_sizes), product name, size label, unit label
    const productSizes = await ProductSize.findAll({
      include: [
        { model: Product, attributes: ["product_id", "name"] },
        { model: Size, attributes: ["size_id", "size_label"] },
        { model: Unit, attributes: ["unit_id", "unit_label"] },
      ],
      order: [
        [Product, "name", "ASC"],
        [Size, "size_label", "ASC"],
        [Unit, "unit_label", "ASC"],
      ],
    });

    res.render("create_purchase", {
      activePage: "purchase-create",
      suppliers,
      productSizes,
      // inline errors + form data
      errors: {}, // field-level errors (supplier_id, invoice_number, purchase_date)
      itemErrors: [], // array of per-row errors
      formData: {}, // repopulation data
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load purchase form.");
    return res.redirect("/createpurchase");
  }
});

router.post("/createpurchase", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let {
      supplier_id,
      invoice_number,
      purchase_date,
      due_date,
      size_id = [],
      quantity = [],
      cost_price = [],
    } = req.body;

    if (!Array.isArray(size_id)) size_id = [size_id];
    if (!Array.isArray(quantity)) quantity = [quantity];
    if (!Array.isArray(cost_price)) cost_price = [cost_price];

    const errors = {};
    const itemErrors = size_id.map(() => ({}));

    if (!supplier_id) errors.supplier_id = "Supplier is required.";
    if (!invoice_number || !invoice_number.trim())
      errors.invoice_number = "Invoice number is required.";
    if (!invoiceTrim.Number) {
      errors.invoice_number = "Invoice is invalid.";
    }
    if (!purchase_date) errors.purchase_date = "Purchase date is required.";
    // Ensure due_date exists
    if (!due_date) {
      errors.due_date = "Due date is required.";
    } else if (new Date(due_date) < new Date(purchase_date)) {
      errors.due_date = "Due date must be after or equal to Purchase Date.";
    }

    let hasItem = false;
    let computedTotal = 0;

    for (let i = 0; i < size_id.length; i++) {
      const row = itemErrors[i];
      const sid = parseInt(size_id[i], 10);
      const qty = parseInt(quantity[i], 10);
      const cost = parseFloat(cost_price[i]);

      if (!sid) row.size_id = "Product (name-size-unit) is required.";
      if (!qty || qty <= 0) row.quantity = "Quantity must be greater than 0.";
      if (!cost || cost <= 0)
        row.cost_price = "Cost price must be greater than 0.";

      if (!row.size_id && !row.quantity && !row.cost_price) {
        hasItem = true;
        computedTotal += qty * cost;
      }
    }

    if (!hasItem) errors.items = "At least one valid item is required.";
    const anyItemErrors = itemErrors.some((r) => Object.keys(r).length > 0);

    if (Object.keys(errors).length > 0 || anyItemErrors) {
      await t.rollback();
      const suppliers = await Supplier.findAll({ order: [["name", "ASC"]] });
      const productSizes = await ProductSize.findAll({
        include: [
          { model: Product, attributes: ["product_id", "name"] },
          { model: Size, attributes: ["size_id", "size_label"] },
          { model: Unit, attributes: ["unit_id", "unit_label"] },
        ],
      });

      return res.status(422).render("create_purchase", {
        suppliers,
        productSizes,
        activePage: "purchase-create",
        errors,
        itemErrors,
        formData: {
          supplier_id,
          invoice_number,
          purchase_date,
          due_date,
          size_id,
          quantity,
          cost_price,
        },
      });
    }

    const invoiceTrim = invoice_number.trim();
    const existing = await Purchase.findOne({
      where: { invoice_number: invoiceTrim },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existing) {
      await t.rollback();
      errors.invoice_number = "Invoice number already exists.";
      const suppliers = await Supplier.findAll({ order: [["name", "ASC"]] });
      const productSizes = await ProductSize.findAll({
        include: [
          { model: Product, attributes: ["product_id", "name"] },
          { model: Size, attributes: ["size_id", "size_label"] },
          { model: Unit, attributes: ["unit_id", "unit_label"] },
        ],
      });

      return res.status(422).render("create_purchase", {
        suppliers,
        productSizes,
        activePage: "purchase-create",
        errors,
        itemErrors,
        formData: {
          supplier_id,
          invoice_number,
          purchase_date,
          due_date,
          size_id,
          quantity,
          cost_price,
        },
      });
    }

    const purchase = await Purchase.create(
      {
        supplier_id,
        invoice_number: invoiceTrim,
        purchase_date,
        due_date,
        total_amount: 0,
        status: "unpaid",
      },
      { transaction: t }
    );

    for (let i = 0; i < size_id.length; i++) {
      const sid = parseInt(size_id[i], 10);
      const qty = parseInt(quantity[i], 10);
      const cost = parseFloat(cost_price[i]);
      const subtotal = qty * cost;

      await PurchaseItem.create(
        {
          purchase_id: purchase.purchase_id,
          size_id: sid,
          quantity: qty,
          cost_price: cost,
          subtotal,
        },
        { transaction: t }
      );

      await InventoryMovement.create(
        {
          size_id: sid,
          source_type: "purchase",
          source_id: purchase.purchase_id,
          quantity: qty,
        },
        { transaction: t }
      );

      const ps = await ProductSize.findByPk(sid, { transaction: t });
      if (ps) {
        await ps.update(
          { stock_qty: (ps.stock_qty || 0) + qty, stock_updated: new Date() },
          { transaction: t }
        );
      }
    }

    await purchase.update({ total_amount: computedTotal }, { transaction: t });

    await t.commit();
    req.flash("success_msg", "Purchase created successfully.");
    return res.redirect("/createpurchase");
  } catch (err) {
    console.error(err);
    try {
      await t.rollback();
    } catch {}
    req.flash("error_msg", "Failed to create purchase. " + err.message);
    return res.redirect("/createpurchase");
  }
});

// View purchases page
router.get("/purchases", isAuthenticated, (req, res) =>
  res.render("purchases", { activePage: "purchase-list" })
);

// Add partial/full payment
router.post("/purchases/pay/:id", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const purchaseId = req.params.id;
    const { amount } = req.body;

    const purchase = await Purchase.findByPk(purchaseId, { transaction: t });
    if (!purchase) throw new Error("Purchase not found");

    await PurchasePayment.create(
      {
        purchase_id: purchaseId,
        payment_date: new Date(),
        amount,
        method: "cash",
      },
      { transaction: t }
    );

    const payments = await PurchasePayment.findAll({
      where: { purchase_id: purchaseId },
      transaction: t,
    });
    const totalPaid = payments.reduce(
      (sum, pay) => sum + parseFloat(pay.amount),
      0
    );

    await purchase.update(
      { status: totalPaid >= purchase.total_amount ? "Paid" : "Unpaid" },
      { transaction: t }
    );

    await t.commit();
    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// Fetch purchase items
router.get("/purchases/items/:id", async (req, res) => {
  try {
    const items = await PurchaseItem.findAll({
      where: { purchase_id: req.params.id },
      include: [{ model: ProductSize, include: [Product, Size, Unit] }],
    });

    const formatNumber = (n) =>
      parseFloat(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

    const data = items.map((i) => ({
      product_name: i.ProductSize.Product.name,
      size_label: i.ProductSize.Size.size_label,
      unit_label: i.ProductSize.Unit.unit_label,
      quantity: i.quantity,
      cost_price: formatNumber(i.cost_price),
      subtotal: formatNumber(i.subtotal),
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Delete purchase + adjust stock
router.delete("/purchases/delete/:id", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const purchaseId = req.params.id;
    const items = await PurchaseItem.findAll({
      where: { purchase_id: purchaseId },
      transaction: t,
    });

    for (let item of items) {
      const ps = await ProductSize.findByPk(item.size_id, { transaction: t });
      if (ps) {
        const newStock = (ps.stock_qty || 0) - item.quantity;
        await ps.update({ stock_qty: newStock }, { transaction: t });
      }
    }

    await PurchaseItem.destroy({
      where: { purchase_id: purchaseId },
      transaction: t,
    });
    await PurchasePayment.destroy({
      where: { purchase_id: purchaseId },
      transaction: t,
    });
    await Purchase.destroy({
      where: { purchase_id: purchaseId },
      transaction: t,
    });

    await t.commit();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    await t.rollback();
    res.json({ success: false });
  }
});

router.get("/purchases/ajax", async (req, res) => {
  try {
    const { date, month } = req.query;
    let where = {};

    if (date) {
      where.purchase_date = date;
    } else if (month) {
      const [year, mon] = month.split("-").map(Number);
      where = {
        [Op.and]: [
          sequelize.where(
            sequelize.fn("YEAR", sequelize.col("purchase_date")),
            year
          ),
          sequelize.where(
            sequelize.fn("MONTH", sequelize.col("purchase_date")),
            mon
          ),
        ],
      };
    }

    const purchases = await Purchase.findAll({
      where,
      include: [
        { model: Supplier, attributes: ["name"] },
        {
          model: PurchaseItem,
          include: [{ model: ProductSize, include: [Product, Size, Unit] }],
        },
        { model: PurchasePayment },
      ],
      order: [["purchase_date", "DESC"]],
    });

    const formatDate = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(dt.getDate()).padStart(2, "0")}`;
    };

    const data = purchases.map((p) => {
      const totalPaid = p.PurchasePayments.reduce(
        (sum, pay) => sum + parseFloat(pay.amount),
        0
      );
      const remaining = parseFloat(p.total_amount) - totalPaid;

      return {
        purchase_id: p.purchase_id,
        invoice_number: p.invoice_number,
        supplier_name: p.Supplier?.name || "-",
        purchase_date: formatDate(p.purchase_date),
        due_date: p.due_date ? formatDate(p.due_date) : null,
        total_amount: parseFloat(p.total_amount),
        total_paid: totalPaid,
        remaining: remaining,
        status: remaining <= 0 ? "Paid" : "Unpaid",
      };
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

router.post("/purchases/update/:id", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { invoice_number, purchase_date, due_date } = req.body;
    const purchaseId = req.params.id;

    const purchase = await Purchase.findByPk(purchaseId, { transaction: t });
    if (!purchase) throw new Error("Purchase not found");

    // 1. Trim invoice and check uniqueness (excluding current purchase)
    const invoiceTrim = invoice_number?.trim();
    if (invoiceTrim) {
      const existing = await Purchase.findOne({
        where: {
          invoice_number: invoiceTrim,
          purchase_id: { [Op.ne]: purchaseId }, // exclude current purchase
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (existing) {
        throw new Error(
          "Invoice number already exists. Please use a unique invoice number."
        );
      }
    }

    let purchaseDateObj = purchase_date
      ? new Date(purchase_date)
      : new Date(purchase.purchase_date);
    let dueDateObj = due_date ? new Date(due_date) : null;

    if (dueDateObj && purchaseDateObj && dueDateObj <= purchaseDateObj) {
      throw new Error("Due Date must be later than Purchase Date.");
    }

    await purchase.update(
      {
        invoice_number: invoiceTrim,
        purchase_date: purchaseDateObj,
        due_date: dueDateObj,
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
