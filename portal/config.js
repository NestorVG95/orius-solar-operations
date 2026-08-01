/*
 * Public runtime configuration.
 *
 * Keep demoMode=true for the portfolio link. For Hostinger, copy this file to
 * a private deployment branch and set demoMode=false after configuring /api.
 * Never put database, Google, or OAuth credentials in this file.
 */
window.ORIUS_CONFIG = Object.freeze({
  demoMode: true,
  apiBase: "/api/index.php",
});
