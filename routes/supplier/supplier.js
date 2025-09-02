const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Supplier = require("../../models/Supplier");
const { isValidSpaceName } = require("../../utils/validation");
const { isAuth, isAuthenticated } = require("../../middleware/authMiddleware");
// GET
router.get("/createsupplier", isAuthenticated, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({ order: [["name", "ASC"]] });
    res.render("createsupplier", {
      title: "Create Supplier",
      activePage: "supplier",
      suppliers,
      formData: {},
      errors: req.flash("errors")[0] || {},
    });
  } catch (err) {
    console.error(err);
    res.render("createsupplier", {
      title: "Create Supplier",
      activePage: "supplier",
      suppliers: [],
      formData: {},
      errors: { general: "Failed to load suppliers!" },
    });
  }
});

// POST: Create
router.post("/createsupplier", async (req, res) => {
  const { name, phone, address } = req.body;
  const errors = {};
  if (!name) errors.name = "Name is required!";
  else if (isValidSpaceName(name))
    errors.name = "Name can contain only letters and spaces!";
  if (!phone) errors.phone = "Phone is required!";
  if (!address) errors.address = "Address is required!";

  if (Object.keys(errors).length > 0) {
    req.flash("formData", req.body);
    req.flash("errors", errors);
    return res.redirect("/createsupplier");
  }

  try {
    const exists = await Supplier.findOne({ where: { name } });
    if (exists) {
      req.flash("formData", req.body);
      req.flash("errors", { name: `Supplier "${name}" already exists!` });
      return res.redirect("/createsupplier");
    }
    await Supplier.create({ name, phone, address });
    req.flash("success_msg", "Supplier created successfully!");
    res.redirect("/createsupplier");
  } catch (err) {
    console.error(err);
    req.flash("formData", req.body);
    req.flash("errors", { general: "Create failed: " + err.message });
    res.redirect("/createsupplier");
  }
});

// POST: Edit
router.post("/editsupplier/:id", async (req, res) => {
  const { name, phone, address } = req.body;
  const errors = {};
  if (!name) errors.name = "Name is required!";
  else if (isValidSpaceName(name))
    errors.name = "Name can contain only letters and spaces!";
  if (!phone) errors.phone = "Phone is required!";
  if (!address) errors.address = "Address is required!";

  if (Object.keys(errors).length > 0) {
    req.flash("errors", errors);
    return res.redirect("/createsupplier");
  }

  try {
    const exists = await Supplier.findOne({
      where: { name, supplier_id: { [Op.ne]: req.params.id } },
    });
    if (exists) {
      req.flash("errors", {
        name: `Another supplier with name "${name}" exists!`,
      });
      return res.redirect("/createsupplier");
    }
    const updated = await Supplier.update(
      { name, phone, address },
      { where: { supplier_id: req.params.id } }
    );
    if (!updated[0]) req.flash("error_msg", "Supplier not found.");
    else req.flash("success_msg", "Supplier updated successfully!");
    res.redirect("/createsupplier");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Update failed: " + err.message);
    res.redirect("/createsupplier");
  }
});

// POST: Delete
router.post("/deletesupplier/:id", async (req, res) => {
  try {
    const deleted = await Supplier.destroy({
      where: { supplier_id: req.params.id },
    });
    if (!deleted) req.flash("error_msg", "Supplier not found.");
    else req.flash("success_msg", "Supplier deleted successfully!");
    res.redirect("/createsupplier");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Delete failed: " + err.message);
    res.redirect("/createsupplier");
  }
});

module.exports = router;
