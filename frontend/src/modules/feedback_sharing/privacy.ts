/** Solo ruta, nunca leer/registrar URL completa ni credencial aquí. */
export function isFeedbackSurface(pathname = window.location.pathname) {
  return /^\/devolucion\/?$/.test(pathname);
}

export function installFeedbackPrivacy() {
  if (!isFeedbackSurface()) return;
  document.title = 'Tu devolución · XCalificator';
  for (const [name, content] of [['referrer', 'no-referrer'], ['robots', 'noindex, nofollow']]) {
    const tag = document.querySelector(`meta[name="${name}"]`) || document.head.appendChild(document.createElement('meta'));
    tag.setAttribute('name', name); tag.setAttribute('content', content);
  }
  document.querySelectorAll('link[rel="canonical"],meta[property^="og:"],meta[name^="twitter:"]').forEach(node => node.remove());
}
