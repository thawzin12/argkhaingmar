document.addEventListener("DOMContentLoaded", () => {
  // -------- Data --------
  const products = JSON.parse(
    document.getElementById("PRODUCTS_DATA").textContent
  );
  const customers = JSON.parse(
    document.getElementById("CUSTOMERS_DATA").textContent
  );

  // -------- Elements --------
  const customerNameEl = document.getElementById("customerName");
  const customerAddressEl = document.getElementById("customerAddress");
  const customerPhoneEl = document.getElementById("customerPhone");

  const manualBarcodeEl = document.getElementById("manualBarcode");
  const addManualBtn = document.getElementById("addManualBtn");

  const toggleScanBtn = document.getElementById("toggleScan");
  const pickCustomerBtn = document.getElementById("pickCustomerBtn");

  const amountPaidEl = document.getElementById("amountPaid");
  const paidWarningEl = document.getElementById("paidWarning");
  const balanceEl = document.getElementById("balance");

  const itemsInputEl = document.getElementById("itemsInput");
  const discountTypeEl = document.getElementById("discountType");
  const discountValueEl = document.getElementById("discountValue");

  // -------- State --------
  let saleItems = [];
  let scanner = null,
    scanning = false;
  let lastAutoTotal = 0;

  const SCAN_COOLDOWN_MS = 1000;
  let lastScanCode = null;
  let lastScanAt = 0;

  // -------- Sweet helpers --------
  const sweetError = (msg) =>
    Swal.fire({ icon: "error", title: "Oops...", text: msg });
  const sweetInfo = (msg) =>
    Swal.fire({ icon: "info", title: "Notice", text: msg });
  const sweetOK = (title, msg) =>
    Swal.fire({ icon: "success", title, text: msg });

  // ---------------------------
  // Customer picker (contains + keyboard nav)
  // ---------------------------
  async function openCustomerPicker(initialQuery = "") {
    let activeIndex = -1;
    let filtered = [];

    const html = `
      <input id="swalSearch" class="swal2-input swal2-search-input" placeholder="Type to search by name (contains)" value="${initialQuery.replace(
        /"/g,
        "&quot;"
      )}">
      <div id="swalCustomerList" class="swal2-customer-list" tabindex="0"></div>
      <div class="text-muted small mt-2">
        Use <b>↑/↓</b> to move, <b>Enter</b> to select, <b>Esc</b> to close.
      </div>
    `;

    await Swal.fire({
      title: "Select Customer",
      html,
      width: 700,
      showCancelButton: true,
      focusConfirm: false,
      didOpen: () => {
        const $search = document.getElementById("swalSearch");
        const $list = document.getElementById("swalCustomerList");

        function renderList(q = "") {
          const query = q.trim().toLowerCase();
          filtered = customers
            .filter((c) => (c.name || "").toLowerCase().includes(query))
            .map((c) => ({
              id: c.customer_id,
              name: c.name || "Unknown",
              address:
                c.address && c.address.trim() ? c.address.trim() : "No Address",
              phone: c.phone || "",
            }));

          $list.innerHTML = filtered.length
            ? filtered
                .map(
                  (c, i) => `
                <div class="swal2-customer-item ${
                  i === activeIndex ? "active" : ""
                }" data-idx="${i}">
                  <div><strong>${c.name}</strong></div>
                  <div class="text-muted small">${c.address}${
                    c.phone ? " · " + c.phone : ""
                  }</div>
                </div>
              `
                )
                .join("")
            : '<div class="p-2 text-muted">No matches. You can cancel and type manually.</div>';

          // Click to select
          $list.querySelectorAll(".swal2-customer-item").forEach((el) => {
            el.addEventListener("click", () => {
              const i = Number(el.getAttribute("data-idx"));
              choose(i);
            });
          });
        }

        function setActive(idx) {
          if (filtered.length === 0) return;
          activeIndex = (idx + filtered.length) % filtered.length;
          [...$list.querySelectorAll(".swal2-customer-item")].forEach(
            (el, i) => {
              if (i === activeIndex) {
                el.classList.add("active");
                el.scrollIntoView({ block: "nearest" });
              } else el.classList.remove("active");
            }
          );
        }

        function choose(i) {
          if (i < 0 || i >= filtered.length) return;
          const c = filtered[i];
          customerNameEl.value = c.name;
          customerAddressEl.value = c.address === "No Address" ? "" : c.address;
          customerPhoneEl.value = c.phone;
          Swal.close();
        }

        $search.addEventListener("input", () => {
          activeIndex = -1;
          renderList($search.value);
        });

        $search.addEventListener("keydown", (e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(activeIndex < 0 ? 0 : activeIndex + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(activeIndex < 0 ? filtered.length - 1 : activeIndex - 1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex < 0 && filtered.length === 1) choose(0);
            else choose(activeIndex);
          } else if (e.key === "Escape") {
            e.preventDefault();
            Swal.close();
          }
        });

        renderList($search.value);
        setTimeout(() => $search.focus(), 50);
      },
    });
  }

  pickCustomerBtn.addEventListener("click", () => {
    openCustomerPicker(customerNameEl.value || "");
  });

  // Name blur → if exact name typed show selector when multiple same names
  customerNameEl.addEventListener("blur", async function () {
    const name = this.value.trim();
    if (!name) return;

    const matches = customers.filter(
      (c) => (c.name || "").toLowerCase() === name.toLowerCase()
    );

    if (matches.length === 1) {
      const c = matches[0];
      customerAddressEl.value = c.address || "";
      customerPhoneEl.value = c.phone || "";
    } else if (matches.length > 1) {
      openCustomerPicker(name);
    } else {
      sweetInfo("New customer — please fill address/phone manually.");
    }
  });

  // ---------------------------
  // Helpers for currency math
  // ---------------------------
  const to2 = (n) => Number(n || 0).toFixed(2);
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  // ---------------------------
  // Sale item handling (with icon controls) + per-item discount
  // ---------------------------
  function addItem(p, qty = 1) {
    const exist = saleItems.find((i) => i.size_id === p.size_id);
    if (exist) exist.quantity += qty;
    else
      saleItems.push({
        size_id: p.size_id,
        product_name: p.Product.name,
        size_label: p.Size.size_label,
        unit_label: p.Unit.unit_label,
        quantity: qty,
        unit_price: parseFloat(p.sale_price) || 0,
        discount: 0, // per-item discount (amount)
      });
    renderTable();
  }

  function computeTotals() {
    // Calculate line totals and apply per-item discount (capped)
    let gross = 0; // sum(qty*unit_price)
    let lineDiscounts = 0; // sum(per-item discount)
    let netAfterLines = 0; // sum(line net)

    saleItems.forEach((i) => {
      const lineTotal = Number(i.unit_price) * Number(i.quantity);
      let d = Number(i.discount) || 0;
      if (d < 0) d = 0;
      if (d > lineTotal) d = lineTotal;
      i.discount = d; // keep it sanitized in state
      const lineNet = lineTotal - d;

      i.subtotal = lineNet; // store net per line
      gross += lineTotal;
      lineDiscounts += d;
      netAfterLines += lineNet;
    });

    // Overall discount on the subtotal after line discounts
    const type = discountTypeEl.value;
    let val = parseFloat(discountValueEl.value) || 0;
    if (val < 0) val = 0;

    let overallDiscount = 0;
    if (type === "percent") {
      if (val > 100) val = 100;
      overallDiscount = netAfterLines * (val / 100);
    } else {
      overallDiscount = val;
    }
    if (overallDiscount > netAfterLines) overallDiscount = netAfterLines;

    const grand = netAfterLines - overallDiscount;

    return {
      gross, // before any discounts
      lineDiscounts,
      netAfterLines,
      overallDiscount,
      grand,
    };
  }

  function renderTable() {
    const tbody = document.querySelector("#saleItemsTable tbody");
    tbody.innerHTML = "";
    let insufficient = [];

    saleItems.forEach((i, idx) => {
      const stock =
        products.find((p) => p.size_id === i.size_id)?.stock_qty || 0;
      const remain = stock - i.quantity;
      const lineTotal = Number(i.unit_price) * Number(i.quantity);
      const sanitizedDiscount = clamp(Number(i.discount) || 0, 0, lineTotal);
      i.discount = sanitizedDiscount;
      i.subtotal = lineTotal - sanitizedDiscount;

      const border = remain < 0 ? "border:2px solid red" : "";
      if (remain < 0)
        insufficient.push(
          `${i.product_name} need ${i.quantity}, have ${stock}`
        );

      tbody.insertAdjacentHTML(
        "beforeend",
        `
        <tr>
          <td>${i.product_name}</td>
          <td>${i.size_label}</td>
          <td>${i.unit_label}</td>
          <td>
            <div class="qty-controls">
              <button class="btn btn-outline-secondary btn-sm qty-step" data-idx="${idx}" data-delta="-3" title="-3">
                <i class="bi bi-dash-circle"></i> 3
              </button>
              <button class="btn btn-outline-secondary btn-sm qty-step" data-idx="${idx}" data-delta="-1" title="-1">
                <i class="bi bi-dash-square"></i>
              </button>
              <input type="number" value="${
                i.quantity
              }" min="1" class="form-control qty-input" data-idx="${idx}" style="${border}">
              <button class="btn btn-outline-secondary btn-sm qty-step" data-idx="${idx}" data-delta="1" title="+1">
                <i class="bi bi-plus-square"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm qty-step" data-idx="${idx}" data-delta="3" title="+3">
                <i class="bi bi-plus-circle"></i> 3
              </button>
            </div>
          </td>
          <td>${remain >= 0 ? remain : 0}</td>
          <td>${to2(i.unit_price)}</td>
          <td>
            <input type="number" min="0" step="0.01" class="form-control disc-input item-discount" data-idx="${idx}" value="${
          i.discount
        }" title="Discount amount for this line (auto-capped)">
          </td>
          <td>${to2(i.subtotal)}</td>
          <td>
            <button type="button" class="btn btn-danger btn-sm item-remove" data-idx="${idx}">
              <i class="bi bi-x-lg"></i>
            </button>
          </td>
        </tr>
      `
      );
    });

    const totals = computeTotals();
    // Show "Items Total" as subtotal after line discounts
    document.getElementById("totalAmount").innerText = to2(
      totals.netAfterLines
    );
    document.getElementById("discountAmount").innerText = to2(
      totals.overallDiscount
    );
    document.getElementById("grandTotal").innerText = to2(totals.grand);

    itemsInputEl.value = JSON.stringify(saleItems);

    // Keep paid auto-filled unless user changed it away from previous auto
    if (
      !amountPaidEl.value ||
      parseFloat(amountPaidEl.value) === lastAutoTotal
    ) {
      amountPaidEl.value = to2(totals.grand);
      lastAutoTotal = totals.grand;
    }
    updateBalance();

    // Delegated events
    document.querySelectorAll(".qty-input").forEach((inp) => {
      inp.oninput = (e) => {
        const idx = Number(e.target.dataset.idx);
        const val = Math.max(1, parseInt(e.target.value) || 1);
        saleItems[idx].quantity = val;
        renderTable();
      };
    });

    document.querySelectorAll(".item-discount").forEach((inp) => {
      inp.oninput = (e) => {
        const idx = Number(e.target.dataset.idx);
        const val = Math.max(0, parseFloat(e.target.value) || 0);
        // Cap to current line total
        const lineTotal =
          Number(saleItems[idx].unit_price) * Number(saleItems[idx].quantity);
        saleItems[idx].discount = clamp(val, 0, lineTotal);
        renderTable();
      };
    });

    document.querySelectorAll(".qty-step").forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        const delta = Number(btn.dataset.delta);
        const current = saleItems[idx].quantity;
        const next = Math.max(1, current + delta);
        saleItems[idx].quantity = next;
        renderTable();
      };
    });

    document.querySelectorAll(".item-remove").forEach((btn) => {
      btn.onclick = () => {
        saleItems.splice(Number(btn.dataset.idx), 1);
        renderTable();
      };
    });

    const box = document.getElementById("insufficientBox");
    if (insufficient.length > 0) {
      box.classList.remove("d-none");
      box.innerHTML = "Insufficient stock:<br>" + insufficient.join("<br>");
    } else {
      box.classList.add("d-none");
      box.innerHTML = "";
    }
    return insufficient;
  }

  // Recalc on overall discount change
  discountTypeEl.addEventListener("change", renderTable);
  discountValueEl.addEventListener("input", renderTable);

  function updateBalance() {
    const { grand } = computeTotals();
    let paid = parseFloat(amountPaidEl.value) || 0;
    if (paid > grand) {
      paid = grand;
      amountPaidEl.value = to2(grand);
      paidWarningEl.style.display = "block";
    } else paidWarningEl.style.display = "none";
    balanceEl.value = to2(grand - paid);
  }
  amountPaidEl.addEventListener("input", updateBalance);

  // ---------------------------
  // Manual barcode add (+ shortcuts)
  // ---------------------------
  function addManualFromInput() {
    const code = manualBarcodeEl.value.trim();
    if (!code) return sweetError("Enter barcode first.");
    const p = products.find((p) => p.barcode === code);
    if (!p) return sweetError("Product not found.");
    addItem(p, 1);
    const sound = document.getElementById("scanSound");
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
    manualBarcodeEl.value = "";
  }
  addManualBtn.onclick = addManualFromInput;
  manualBarcodeEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addManualFromInput();
    }
  });

  // ---------------------------
  // Scanner (html5-qrcode) + shortcuts
  // ---------------------------
  function getScanConfig() {
    const fmts = window.Html5QrcodeSupportedFormats
      ? [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ]
      : undefined;

    return {
      fps: 15,
      qrbox: (viewfinder) => {
        const w = Math.min(viewfinder.width, 420);
        return { width: w, height: Math.floor(w * 0.35) };
      },
      aspectRatio: 1.777,
      disableFlip: true,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      formatsToSupport: fmts,
    };
  }

  function onScanSuccess(txt) {
    const now = Date.now();
    if (txt === lastScanCode && now - lastScanAt < SCAN_COOLDOWN_MS) return;
    lastScanCode = txt;
    lastScanAt = now;

    const p = products.find((p) => p.barcode === txt);
    if (p) {
      addItem(p, 1);
      const sound = document.getElementById("scanSound");
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
      }
    }

    try {
      if (scanner && typeof scanner.pause === "function") {
        scanner.pause(true);
        setTimeout(() => {
          try {
            scanner.resume();
          } catch (e) {}
        }, 200);
      }
    } catch (e) {}
  }

  async function startScanner() {
    try {
      if (scanning && scanner) return;
      scanner = new Html5Qrcode("reader", { verbose: false });
      const cameraCfg = { facingMode: "environment" };
      await scanner.start(cameraCfg, getScanConfig(), onScanSuccess, () => {});
      scanning = true;
      toggleScanBtn.innerText = "Stop Scanner";
      sweetOK("Scanner", "Camera is active.");
    } catch (err) {
      sweetError("Camera error: " + err);
    }
  }

  async function stopScanner() {
    try {
      if (scanner) await scanner.stop();
    } catch (e) {}
    scanning = false;
    toggleScanBtn.innerText = "Start Scanner";
    sweetInfo("Scanner stopped.");
  }

  toggleScanBtn.onclick = async () =>
    scanning ? stopScanner() : startScanner();

  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // If user is typing in an input, only allow the picker & add shortcuts if they make sense
    const tag =
      e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
    const typing = tag === "input" || tag === "textarea";

    // Customer picker: Ctrl+K
    if (e.ctrlKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCustomerPicker(customerNameEl.value || "");
      return;
    }

    // Start scanner: Ctrl+S
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (!scanning) startScanner();
      return;
    }

    // Stop scanner: Ctrl+X
    if (e.ctrlKey && e.key.toLowerCase() === "x") {
      e.preventDefault();
      if (scanning) stopScanner();
      return;
    }

    // Add manual: Ctrl+A
    if (e.ctrlKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      addManualFromInput();
      return;
    }

    // Focus manual barcode: Ctrl+B
    if (e.ctrlKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      manualBarcodeEl.focus();
      return;
    }

    // Quick qty add while a row qty input is focused: ArrowUp/Down adjusts by ±1, Shift for ±3
    if (typing && e.target.classList.contains("qty-input")) {
      const idx = Number(e.target.dataset.idx);
      if (!Number.isInteger(idx)) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const step = e.shiftKey ? 3 : 1;
        const delta = e.key === "ArrowUp" ? step : -step;
        saleItems[idx].quantity = Math.max(1, saleItems[idx].quantity + delta);
        renderTable();
      }
    }
  });

  // ---------------------------
  // Submit form
  // ---------------------------
  document.getElementById("saleForm").onsubmit = async (e) => {
    e.preventDefault();
    if (saleItems.length === 0) return sweetError("Add products first.");
    if (renderTable().length > 0)
      return sweetError("Fix insufficient stock before saving.");

    // (Optional) Light validation to encourage unique triple
    const n = customerNameEl.value.trim();
    const a = customerAddressEl.value.trim();
    const p = customerPhoneEl.value.trim();
    if (!n) return sweetError("Customer name is required.");
    if (!a || !p) {
      const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: "Missing Address/Phone?",
        text: "Customers are unique by Name + Address + Phone. Proceed anyway?",
        showCancelButton: true,
        confirmButtonText: "Proceed",
      });
      if (!isConfirmed) return;
    }

    // attach overall discount fields
    const dType = discountTypeEl.value;
    const dValue = parseFloat(discountValueEl.value) || 0;
    document.getElementById("discountTypeHidden").value = dType;
    document.getElementById("discountValueHidden").value = dValue;

    const payload = {
      customerName: n,
      customerAddress: a,
      customerPhone: p,
      paymentMethod: "auto",
      paidAmount: amountPaidEl.value,
      discountType: dType,
      discountValue: dValue,
      items: JSON.stringify(saleItems), // each item includes discount amount
    };

    try {
      const resp = await fetch("/salevoucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();

      if (data.success) {
        document.getElementById("pCustomer").innerText = data.customer.name;
        document.getElementById("pAddress").innerText =
          data.customer.address || "";
        document.getElementById("pPhone").innerText = data.customer.phone || "";
        document.getElementById("pInvoice").innerText = data.invoice_number;

        const tb = document.getElementById("pItems");
        tb.innerHTML = "";
        data.items.forEach(
          (i) =>
            (tb.innerHTML += `
          <tr>
            <td>${i.product_name}</td>
            <td>${i.size_label}</td>
            <td>${i.unit_label}</td>
            <td>${i.quantity}</td>
            <td>${Number(i.unit_price).toFixed(2)}</td>
            <td>${Number(i.discount || 0).toFixed(2)}</td>
            <td>${Number(i.subtotal).toFixed(2)}</td>
          </tr>`)
        );

        // Fill totals / discounts
        document.getElementById("pGross").innerText = Number(
          data.items_gross_total || 0
        ).toFixed(2);
        document.getElementById("pLineDiscounts").innerText = Number(
          data.items_discount_total || 0
        ).toFixed(2);
        document.getElementById("pTotal").innerText = Number(
          data.total_after_line_discounts || 0
        ).toFixed(2);
        document.getElementById("pDiscount").innerText = Number(
          data.overall_discount || 0
        ).toFixed(2);
        document.getElementById("pGrand").innerText = Number(
          data.total_amount || 0
        ).toFixed(2);
        document.getElementById("pPaid").innerText = Number(
          data.paid_amount
        ).toFixed(2);
        document.getElementById("pBalance").innerText = Number(
          data.balance
        ).toFixed(2);

        // Print then toast & reload
        const pr = document.getElementById("printVoucher").innerHTML;
        const w = window.open("", "PRINT", "height=650,width=900");
        w.document.write(pr);
        w.document.close();
        w.focus();
        w.print();
        w.close();

        await Swal.fire({
          icon: "success",
          title: "Saved",
          text: "Sale saved and printed.",
        });
        location.reload();
      } else {
        sweetError(data.message || "Failed to save sale.");
      }
    } catch (err) {
      sweetError(err.message || "Network error.");
    }
  };

  // initial
  renderTable();
});
