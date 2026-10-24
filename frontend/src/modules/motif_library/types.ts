export interface MotifCollection { id: string; label: string; total: number }
export interface Motif {
  id: string;
  collection_id: string;
  label: string;
  description: string;
  thumbnail_url: string;
  full_url: string;
  width: number;
  height: number;
}
export interface MotifCollections { catalog_version: string; collections: MotifCollection[] }
export interface MotifPage { catalog_version: string; collection: string; total: number; offset: number; limit: number; items: Motif[] }
export interface ResourceDecoration { motif_id: string; placement: 'header' }
