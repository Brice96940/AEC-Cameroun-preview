
window.dataLayer = window.dataLayer || [];

    /**
     * Wrapper GA4.
     */
    function gtag() {
      dataLayer.push(arguments);
    }

    gtag("js", new Date());
    gtag("config", "G-4LBV0YTTX4", { anonymize_ip: true });

    /**
     * Helper de tracking.
     * Permet de suivre les clics sans surcharger le HTML.
     *
     * @param {string} label
     * @param {string} [category="navigation"]
     */
    function track(label, category = "navigation") {
      if (typeof gtag !== "undefined") {
        gtag("event", "click", {
          event_category: category,
          event_label: label
        });
      }
    }

function getDeviceCategory() {
  if (window.innerWidth < 768) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}

document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-track]');
  if (!target) return;
  if (typeof gtag !== 'undefined') {
    gtag('event', 'aec_click', {
      event_category: target.dataset.linkKind || 'engagement',
      event_label: target.dataset.track || 'unknown',
      device_category: getDeviceCategory(),
      screen_resolution: `${window.screen.width}x${window.screen.height}`
    });
  }
});

document.addEventListener('DOMContentLoaded', function () {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'device_profile', {
      device_category: getDeviceCategory(),
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      user_agent: navigator.userAgent
    });
  }
});
