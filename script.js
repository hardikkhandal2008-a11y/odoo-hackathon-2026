// Compatibility loader for any page that still points to the legacy root script path.
(function loadAssetFlowScript() {
  if (document.querySelector('script[data-assetflow-loader="true"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "js/script.js";
  script.defer = true;
  script.dataset.assetflowLoader = "true";
  document.head.appendChild(script);
})();
