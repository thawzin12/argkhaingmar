const express = require("express");
const router = express.Router();
const { Product, Category, ProductSize, Size, Unit } = require("../../models");
// Render products page
router.get("/products", async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    res.render("products", { categories });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong: " + err.message);
    res.redirect("/");
  }
});

// DataTables AJAX
router.get("/products/ajax", async (req, res) => {
  try {
    const categoryId = req.query.category_id;

    let query = {
      include: [
        { model: ProductSize, include: [Size, Unit] }, // Include Size and Unit
      ],
    };
    if (categoryId) {
      query.where = { category_id: categoryId };
    }

    const products = await Product.findAll(query);

    // Flatten for DataTables
    const data = [];
    products.forEach((product) => {
      product.ProductSizes.forEach((psize) => {
        data.push({
          id: psize.size_id, // Unique row ID
          name: product.name,
          package_size: psize.Size ? psize.Size.size_label : "N/A",
          unit_label: psize.Unit ? psize.Unit.unit_label : "N/A",
          cost_price: psize.cost_price,
          sale_price: psize.sale_price,
          barcode: psize.barcode,
          stock_qty: psize.stock_qty,
        });
      });
    });

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching products" });
  }
});

// Update price
router.post("/products/update-price/:id", async (req, res) => {
  try {
    const { cost_price, sale_price } = req.body;
    const sizeId = req.params.id;

    const productSize = await ProductSize.findByPk(sizeId);
    if (!productSize) return res.json({ success: false });

    productSize.cost_price = cost_price;
    productSize.sale_price = sale_price;
    await productSize.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Delete product size row
router.delete("/products/delete/:id", async (req, res) => {
  try {
    const sizeId = req.params.id;
    await ProductSize.destroy({ where: { size_id: sizeId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

module.exports = router;
