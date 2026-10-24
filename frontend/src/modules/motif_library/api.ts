import { api } from '@/lib/api';
import { curatedAssetPath } from './motifLibrary';
import type { Motif, MotifCollections, MotifPage } from './types';

export async function listCollections(): Promise<MotifCollections> {
  return (await api.get<MotifCollections>('/biblioteca-motivos/colecciones')).data;
}

export async function listMotifs(collection: string, offset = 0): Promise<MotifPage> {
  return (await api.get<MotifPage>('/biblioteca-motivos', { params: { coleccion: collection, offset, limit: 12 } })).data;
}

/** At most three small metadata pages; does not download any image. */
export async function collectionMotifs(collection: string): Promise<Motif[]> {
  const first = await listMotifs(collection);
  if (first.total < 1 || first.total > 30) throw new Error('Colección no disponible');
  const pages = await Promise.all(Array.from({ length: Math.ceil(first.total / 12) - 1 }, (_, index) => listMotifs(collection, (index + 1) * 12)));
  if (pages.some(page => page.catalog_version !== first.catalog_version || page.collection !== collection)) throw new Error('La biblioteca se actualizó; vuelve a elegir el área');
  const items = [first, ...pages].flatMap(page => page.items);
  if (items.length !== first.total || new Set(items.map(item => item.id)).size !== first.total) throw new Error('La colección no está completa');
  return items;
}

export async function motifFile(motif: Motif): Promise<File> {
  // Only this curated same-origin endpoint can be transformed into an upload.
  const path = curatedAssetPath(motif.full_url);
  const response = await api.get<Blob>(path.slice('/api'.length), { responseType: 'blob' });
  const blob = response.data;
  if (!['image/png', 'image/webp'].includes(blob.type) || blob.size > 307_200) throw new Error('No pudimos preparar esta ilustración');
  const extension = blob.type === 'image/png' ? 'png' : 'webp';
  return new File([blob], `${motif.id}.${extension}`, { type: blob.type });
}
