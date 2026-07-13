/** Supplier Portal JavaScript — React-like vanilla component.
/**
 * Supplier Portal JavaScript — React-like vanilla component.
 *
 * In production: use the same admin.html base + React Native Web.
 * For MVP: Minimal Vue-like reactive class with PO list, status toggle.
 */

class SupplierPortal {
  constructor(containerId, apiBase, token) {
    this.container = document.getElementById(containerId);
    this.apiBase = apiBase;
    this.token = token;
    this.supplier = null;
    this.pos = [];
  }

  async init() {
    await this.loadProfile();
    await this.loadPOs();
    this.render();
  }

  async loadProfile() {
    const r = await fetch(`${this.apiBase}/quan-ly/suppliers/me`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    this.supplier = await r.json();
  }

  async loadPOs() {
    const r = await fetch(`${this.apiBase}/quan-ly/suppliers/purchase-orders`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    this.pos = await r.json();
  }

  async confirmPO(poId) {
    await fetch(`${this.apiBase}/quan-ly/suppliers/purchase-orders/${poId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
    });
    await this.loadPOs();
    this.render();
  }

  render() {
    // Safe rendering — use textContent to prevent XSS
    const h2 = document.createElement("h2");
    h2.textContent = `Supplier: ${this.supplier?.name || "N/A"}`;

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>PO#</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr>";

    const tbody = document.createElement("tbody");
    for (const po of this.pos) {
      const tr = document.createElement("tr");

      const tdPo = document.createElement("td");
      tdPo.textContent = po.po_number || "";

      const tdDate = document.createElement("td");
      tdDate.textContent = po.created_at?.slice(0, 10) || "";

      const tdAmt = document.createElement("td");
      tdAmt.textContent = po.total_amount?.toLocaleString() || "0";

      const tdStatus = document.createElement("td");
      tdStatus.textContent = po.status || "";

      const tdAction = document.createElement("td");
      if (po.status === "new" || po.status === "moi") {
        const btn = document.createElement("button");
        btn.textContent = "Confirm";
        btn.onclick = () => this.confirmPO(po.id);
        tdAction.appendChild(btn);
      } else {
        tdAction.textContent = "—";
      }

      tr.append(tdPo, tdDate, tdAmt, tdStatus, tdAction);
      tbody.appendChild(tr);
    }

    table.append(thead, tbody);
    this.container.innerHTML = ""; // clear safely
    this.container.append(h2, table);
  }
}

// Auto-init
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("pos_token");
  if (!token) return (window.location.href = "/login");
  const portal = new SupplierPortal("supplier-portal", "/api/v1", token);
  portal.init();
});
