const express = require("express");
const router = express.Router();
const { Product, Category, ProductSize, Size, Unit } = require("../../models");

// GET products view
router.get("/products", async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    res.render("products", { categories, activePage: "product-list" });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong: " + err.message);
    res.redirect("/");
  }
});

// DataTables AJAX - flatten product sizes
router.get("/products/ajax", async (req, res) => {
  try {
    const categoryId = req.query.category_id;
    const query = {
      include: [{ model: ProductSize, include: [Size, Unit] }],
      order: [["name", "ASC"]],
    };
    if (categoryId) query.where = { category_id: categoryId };

    const products = await Product.findAll(query);

    const data = [];
    products.forEach((product) => {
      product.ProductSizes.forEach((psize) => {
        data.push({
          id: psize.size_id, // unique row id (product size)
          product_id: product.product_id,
          name: product.name,
          package_size: psize.Size ? psize.Size.size_label : "N/A",
          unit_label: psize.Unit ? psize.Unit.unit_label : "N/A",
          cost_price: psize.cost_price || 0,
          sale_price: psize.sale_price || 0,
          barcode: psize.barcode || "",
          stock_qty: psize.stock_qty || 0,
        });
      });
    });

    // return in DataTables format (can be simple array)
    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching products" });
  }
});

// Update price - validate server-side: sale_price must be greater than cost_price
router.post("/products/update-price/:id", async (req, res) => {
  try {
    const sizeId = req.params.id;
    const { cost_price, sale_price } = req.body;

    const cost = parseFloat(cost_price) || 0;
    const sale = parseFloat(sale_price) || 0;

    if (sale <= cost) {
      return res.json({
        success: false,
        message: "Sale price must be greater than Cost price.",
      });
    }

    const productSize = await ProductSize.findByPk(sizeId);
    if (!productSize)
      return res.json({
        success: false,
        message: "Product size row not found.",
      });

    productSize.cost_price = cost;
    productSize.sale_price = sale;
    await productSize.save();

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.json({
      success: false,
      message: "Server error while updating price.",
    });
  }
});

// Delete product-size row
router.delete("/products/delete/:id", async (req, res) => {
  try {
    const sizeId = req.params.id;
    const deleted = await ProductSize.destroy({ where: { size_id: sizeId } });
    if (!deleted) return res.json({ success: false, message: "Row not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
});

module.exports = router;
