import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resolvePageMetadata } from '@/config/seo';

const MANAGED_ATTRIBUTE = 'data-xcalificator-metadata';

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  element.setAttribute(MANAGED_ATTRIBUTE, 'true');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.setAttribute(MANAGED_ATTRIBUTE, 'true');
  element.href = href;
}

function remove(selector: string) {
  document.head.querySelectorAll(selector).forEach((element) => element.remove());
}

export function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = resolvePageMetadata(pathname);
    document.title = metadata.title;
    upsertMeta('meta[name="description"]', { name: 'description', content: metadata.description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: metadata.indexing });

    if (metadata.canonical) upsertCanonical(metadata.canonical);
    else remove('link[rel="canonical"]');

    if (metadata.social) {
      upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
      upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'es_CO' });
      upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'XCalificator' });
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: metadata.social.title });
      upsertMeta('meta[property="og:description"]', {
        property: 'og:description',
        content: metadata.social.description,
      });
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: metadata.social.url });
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: metadata.social.image });
      upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
      upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
      upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
      upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.social.title });
      upsertMeta('meta[name="twitter:description"]', {
        name: 'twitter:description',
        content: metadata.social.description,
      });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: metadata.social.image });
    } else {
      remove('meta[property^="og:"]');
      remove('meta[name^="twitter:"]');
    }
  }, [pathname]);

  return null;
}
