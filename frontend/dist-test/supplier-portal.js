/** Supplier Portal JavaScript — React-like vanilla component.
 *
 * In production: use the same admin.html base + React Native Web.
 * For MVP: Minimal Vue-like reactive class with PO list, status toggle.
 */

class SupplierPortal {
  constructor(apiBase, containerId) {
    this.api = apiBase;
    this.container = document.getElementById(containerId);
    this.token = '';
    this.pos = [];
    this.supplier = null;
  }

  async init(token) {
    this.token = token;
    await this.loadProfile();
    await this.loadPOs();
    this.render();
  }

  async loadProfile() {
    const res = await fetch(`${this.api}/quan-ly/suppliers/me`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (res.ok) this.supplier = await res.json();
  }

  async loadPOs() {
    const res = await fetch(`${this.api}/quan-ly/suppliers/purchase-orders`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (res.ok) this.pos = await res.json();
  }

  async confirmPO(poId) {
    await fetch(`${this.api}/quan-ly/suppliers/purchase-orders/${poId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
    });
    await this.loadPOs();
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <h2>Supplier: ${this.supplier?.name || 'N/A'}</h2>
      <table>
        <tr><th>PO#</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr>
        ${this.pos.map(po => `
          <tr>
            <td>${po.po_number}</td>
            <td>${po.created_at?.slice(0, 10)}</td>
            <td>${po.total_amount?.toLocaleString()}</td>
            <td><span class="badge ${po.status === 'draft' ? 'warning' : 'success'}">${po.status}</span></td>
            <td>${po.status === 'draft' ? `<button onclick="portal.confirmPO('${po.id}')">Confirm</button>` : '✓ Confirmed'}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }
}

const portal = new SupplierPortal('/api/v1', 'app');
