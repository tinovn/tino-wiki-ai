import { TinoWidget } from './widget';

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    console.error('[TinoWidget] Cannot find script element');
    return;
  }

  const token = script.getAttribute('data-token');
  const apiUrl = script.getAttribute('data-api') || 'https://api.tino.vn/api/v1';

  if (!token) {
    console.error('[TinoWidget] Missing data-token attribute');
    return;
  }

  // Avoid double initialization
  if ((window as any).__tinoWidget) return;

  const widget = new TinoWidget({ token, apiUrl });
  (window as any).__tinoWidget = widget;

  // Mount when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => widget.mount());
  } else {
    widget.mount();
  }
})();
