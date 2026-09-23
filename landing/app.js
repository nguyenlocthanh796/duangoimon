/**
 * OngChu POS — Master Marketing Website Script (v2.0)
 * Standard: Pure Vanilla ES6+, Zero-Dependencies, Accessible, Fast
 */
document.addEventListener('DOMContentLoaded', () => {
  // ----------------------------------------------------
  // 1. MOBILE NAVIGATION DRAWER
  // ----------------------------------------------------
  const hamburgerBtn = document.getElementById('nav-hamburger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const drawerBackdrop = document.getElementById('mobile-drawer-backdrop');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  function openDrawer() {
    if (drawer) {
      drawer.classList.add('active');
      drawer.setAttribute('aria-hidden', 'false');
    }
    if (drawerBackdrop) drawerBackdrop.classList.add('active');
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    trackEvent('mobile_drawer_open');
  }

  function closeDrawer() {
    if (drawer) {
      drawer.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
  drawerLinks.forEach(link => link.addEventListener('click', closeDrawer));

  // ----------------------------------------------------
  // 2. DEVICE SHOWCASE INTERACTIVE TABS
  // ----------------------------------------------------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const activePane = document.getElementById(`tab-${targetTab}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      trackEvent('device_tab_select', { device: targetTab });
    });
  });

  // ----------------------------------------------------
  // 3. ACCESSIBLE FAQ ACCORDION
  // ----------------------------------------------------
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const panel = item.querySelector('.faq-panel');

    if (trigger && panel) {
      trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

        // Optional: close other items for clean single-item view
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherTrigger = otherItem.querySelector('.faq-trigger');
            if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          }
        });

        if (isExpanded) {
          item.classList.remove('active');
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('active');
          trigger.setAttribute('aria-expanded', 'true');
          trackEvent('faq_open', { question: trigger.textContent.trim() });
        }
      });
    }
  });

  // ----------------------------------------------------
  // 4. ACCESSIBLE MODALS (App Downloads & Guides)
  // ----------------------------------------------------
  window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      trackEvent('modal_open', { modalId });
    }
  };

  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  };

  // Close modal on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });
  });

  // Global Escape Key Listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.active').forEach(modal => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
      closeDrawer();
      document.body.style.overflow = '';
    }
  });

  // ----------------------------------------------------
  // 5. PRIVACY-FRIENDLY EVENT DISPATCHER
  // ----------------------------------------------------
  function trackEvent(eventName, params = {}) {
    // Log to custom telemetry or analytics if configured
    if (window._ongchuAnalytics) {
      window._ongchuAnalytics.push({ event: eventName, ...params, timestamp: new Date().toISOString() });
    }
  }

  // Track CTA clicks
  document.querySelectorAll('[data-track]').forEach(el => {
    el.addEventListener('click', () => {
      const eventName = el.getAttribute('data-track');
      trackEvent(eventName);
    });
  });

  // ----------------------------------------------------
  // 6. COPY DOWNLOAD LINK HELPER
  // ----------------------------------------------------
  window.copyDownloadLink = function(btn) {
    const url = 'https://ongchu.cloud/tai-app.html';
    navigator.clipboard.writeText(url).then(() => {
      const origText = btn.innerHTML;
      btn.innerHTML = '✓ Đã sao chép link!';
      btn.style.color = '#15803D';
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.style.color = '';
      }, 2500);
    }).catch(() => {
      alert('Đường dẫn: ' + url);
    });
  };
});
