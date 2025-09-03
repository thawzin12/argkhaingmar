const express = require("express");
const router = express.Router();
const {
  Category,
  Product,
  ProductSize,
  sequelize,
  Size,
  Unit,
} = require("../../models");
const { isValidSpaceName } = require("../../utils/validation");
// Show form

const { isAdmin, isAuthenticated } = require("../../middleware/authMiddleware");
router.get("/createcategory", isAuthenticated, (req, res) => {
  res.render("createcategory", {
    title: "Create Category",
    activePage: "category-create",
  });
});

// Handle form submit
router.post("/createcategory", async (req, res) => {
  try {
    const { category } = req.body;

    // Trim whitespace
    const name = category ? category.trim() : "";

    // Check if empty
    if (!name) {
      req.flash("error_msg", "Category name cannot be blank!");
      return res.redirect("/createcategory");
    }

    if (isValidSpaceName(name)) {
      req.flash(
        "error_msg",
        "Category name can contain only letters and spaces!"
      );
      return res.redirect("/createcategory");
    }

    // Check if exists
    const exist = await Category.findOne({ where: { name } });
    if (exist) {
      req.flash("error_msg", "Category already exists!");
      return res.redirect("/createcategory");
    }

    // Create new
    await Category.create({ name });
    req.flash("success_msg", `Category "${name}" created successfully!`);
    res.redirect("/createcategory");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", err.message || "Something went wrong!");
    res.redirect("/createcategory");
  }
});

// ================= GET =================
router.get("/createproduct", isAuthenticated, async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    const sizes = await Size.findAll({ order: [["size_label", "ASC"]] });
    const units = await Unit.findAll({ order: [["unit_label", "ASC"]] });

    res.render("createproduct", {
      activePage: "product-create",
      title: "Create Product",
      categories,
      sizes,
      units,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Cannot load categories/sizes/units");
    res.render("createproduct", {
      title: "Create Product",
      categories: [],
      sizes: [],
      units: [],
    });
  }
});

router.post("/createproduct", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      category_id,
      size_id,
      unit_id,
      cost_price,
      sale_price,
      barcode,
    } = req.body;

    // Preserve form data on validation error
    req.flash("formData", req.body);

    // 1. Basic validation
    if (!name || !category_id) {
      req.flash("error_msg", "Product name and category are required!");
      return res.redirect("/createproduct");
    }

    if (
      !Array.isArray(size_id) ||
      !Array.isArray(unit_id) ||
      !Array.isArray(cost_price) ||
      !Array.isArray(sale_price)
    ) {
      req.flash("error_msg", "Sizes, units, and prices are required!");
      return res.redirect("/createproduct");
    }

    // 2. Check category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      req.flash("error_msg", "Invalid category selected!");
      return res.redirect("/createproduct");
    }

    // 3. Check if product exists
    let product = await Product.findOne({ where: { name }, transaction: t });
    if (!product) {
      product = await Product.create({ name, category_id }, { transaction: t });
    } else if (product.category_id !== parseInt(category_id)) {
      const existingCategory = await Category.findByPk(product.category_id);
      const existingCategoryName = existingCategory
        ? existingCategory.name
        : "Unknown";
      await t.rollback();
      req.flash(
        "error_msg",
        `Product "${name}" already exists in category "${existingCategoryName}"!`
      );
      return res.redirect("/createproduct");
    }

    // 4. Insert sizes/units
    const combinationSet = new Set();

    const pad = (num, len) => num.toString().padStart(len, "0");

    for (let i = 0; i < size_id.length; i++) {
      const s_id = parseInt(size_id[i]);
      const u_id = parseInt(unit_id[i]);
      const cost = parseFloat(cost_price[i]) || 0;
      const sale = parseFloat(sale_price[i]) || 0;
      let code = barcode[i]?.trim();

      if (!s_id || !u_id || !cost || !sale) {
        await t.rollback();
        req.flash("error_msg", `All fields required in row ${i + 1}`);
        return res.redirect("/createproduct");
      }

      const key = `${s_id}-${u_id}`;
      if (combinationSet.has(key)) {
        await t.rollback();
        req.flash(
          "error_msg",
          `Duplicate size/unit in submission (row ${i + 1})`
        );
        return res.redirect("/createproduct");
      }
      combinationSet.add(key);

      // Check DB for duplicates
      const existingSize = await ProductSize.findOne({
        where: {
          product_id: product.product_id,
          size_id_ref: s_id,
          unit_id_ref: u_id,
        },
        transaction: t,
      });

      if (existingSize) {
        const sizeObj = await Size.findByPk(s_id);
        const unitObj = await Unit.findByPk(u_id);
        const sizeLabel = sizeObj ? sizeObj.size_label : s_id;
        const unitLabel = unitObj ? unitObj.unit_label : u_id;
        await t.rollback();
        req.flash(
          "error_msg",
          `Product "${name}" with size "${sizeLabel}" / unit "${unitLabel}" already exists!`
        );
        return res.redirect("/createproduct");
      }

      // Auto-generate numeric barcode if empty
      if (!code) {
        // Format: product_id(4 digits) + size_id(2 digits) + unit_id(2 digits)
        code = `${pad(product.product_id, 4)}${pad(s_id, 2)}${pad(u_id, 2)}`;
      }

      await ProductSize.create(
        {
          product_id: product.product_id,
          size_id_ref: s_id,
          unit_id_ref: u_id,
          cost_price: cost,
          sale_price: sale,
          barcode: code,
        },
        { transaction: t }
      );
    }

    await t.commit();
    req.flash("success_msg", "Product and sizes created successfully!");
    res.redirect("/createproduct");
  } catch (err) {
    await t.rollback();
    console.error(err);
    req.flash("error_msg", "Something went wrong: " + err.message);
    res.redirect("/createproduct");
  }
});

module.exports = router;
