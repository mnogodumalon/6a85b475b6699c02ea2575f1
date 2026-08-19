import type { EnrichedKursanmeldung } from '@/types/enriched';
import type { Kursanmeldung, Kursverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface KursanmeldungMaps {
  kursverwaltungMap: Map<string, Kursverwaltung>;
}

export function enrichKursanmeldung(
  kursanmeldung: Kursanmeldung[],
  maps: KursanmeldungMaps
): EnrichedKursanmeldung[] {
  return kursanmeldung.map(r => ({
    ...r,
    kursName: resolveDisplay(r.fields.kurs, maps.kursverwaltungMap, 'kursname'),
  }));
}
