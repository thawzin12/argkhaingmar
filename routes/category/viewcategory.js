const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

// Adjust this import to match your project structure:
// If you export all models from /models/index.js:
const { Category, Product } = require("../../models");
// If you have a single file: const Category = require("../../models/Category");

const { isValidSpaceName } = require("../../utils/validation");

// GET: render view page
router.get("/categories", async (req, res) => {
  try {
    res.render("viewcategories", {
      title: "Categories",
      activePage: "category-list",
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load categories page.");
    res.redirect("/");
  }
});

// GET: DataTables source
router.get("/categories/ajax", async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["name", "ASC"]],
      // Include products if you want counts (optional)
      // include: [{ model: Product, attributes: ["product_id"] }],
    });

    const data = categories.map((c) => ({
      category_id: c.category_id ?? c.id, // support either key name
      name: c.name,
      description: c.description || "",
    }));

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ data: [], error: "Failed to fetch categories." });
  }
});

// POST: update category (JSON IN / JSON OUT)
router.post("/categories/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name } = req.body || {};

    const errors = {};
    const cleanName = (name || "").trim();

    if (!cleanName) {
      errors.name = "Name is required.";
    } else if (isValidSpaceName(cleanName)) {
      errors.name = "Name can contain only letters and spaces.";
    }

    if (Object.keys(errors).length) {
      return res.json({ success: false, errors, message: "Validation error." });
    }

    // ensure unique name
    const exists = await Category.findOne({
      where: {
        name: cleanName,
        [Category.primaryKeyAttribute || "category_id"]: { [Op.ne]: id },
      },
    });
    if (exists) {
      return res.json({
        success: false,
        errors: { name: "Another category with this name already exists." },
      });
    }

    const [affected] = await Category.update(
      { name: cleanName },
      { where: { [Category.primaryKeyAttribute || "category_id"]: id } }
    );

    if (!affected) {
      return res.json({ success: false, message: "Category not found." });
    }

    return res.json({
      success: true,
      message: "Category updated successfully.",
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Update failed." });
  }
});

// POST: delete category (JSON IN / JSON OUT) with type-to-confirm
router.post("/categories/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { confirmName } = req.body || {};

    const cat = await Category.findOne({
      where: { [Category.primaryKeyAttribute || "category_id"]: id },
    });
    if (!cat) {
      return res.json({ success: false, message: "Category not found." });
    }

    const expected = (cat.name || "").trim();
    if ((confirmName || "").trim() !== expected) {
      return res.json({
        success: false,
        message: "Confirmation text does not match category name.",
      });
    }

    await Category.destroy({
      where: { [Category.primaryKeyAttribute || "category_id"]: id },
    });

    return res.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Delete failed." });
  }
});

module.exports = router;
