import { useEffect, useState } from 'react';
import type { PageKey } from '../config/venue';

export interface Route {
  page: PageKey | '';
  id?: string;
  query: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const [page, id] = path.split('/');
  return { page: (page as PageKey) || '', id: id ? decodeURIComponent(id) : undefined, query: new URLSearchParams(qs ?? '') };
}

/** Initial tab from `?tab=` so any tab can be deep-linked (e.g. #/staff?tab=roster). */
export function initialTab<T extends string>(allowed: readonly T[], fallback: T): T {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const t = q.get('tab') as T | null;
  return t && allowed.includes(t) ? t : fallback;
}

export function navigate(to: string) {
  const target = to.startsWith('#') ? to : `#/${to.replace(/^\//, '')}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    let last = parse();
    const on = () => {
      const next = parse();
      if (next.page !== last.page || next.id !== last.id) window.scrollTo({ top: 0 });
      last = next;
      setRoute(next);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
