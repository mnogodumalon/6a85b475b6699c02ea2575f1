import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kursverwaltung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kursname?: string;
    beschreibung?: string;
    wochentag?: LookupValue;
    startzeit?: string;
    endzeit?: string;
    kursleitung?: string;
    schwierigkeitsgrad?: LookupValue;
    raum?: string;
    max_teilnehmer?: number;
    aktuelle_belegung?: number;
  };
}

export interface Kursanmeldung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    kurs?: string; // applookup -> URL zu 'Kursverwaltung' Record
    kommentar?: string;
  };
}

export const APP_IDS = {
  KURSVERWALTUNG: '6a85b4625daa8d682242a596',
  KURSANMELDUNG: '6a85b465a3b42067c6974807',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kursverwaltung': {
    wochentag: [{ key: "montag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "montag") ?? "Montag"; } }, { key: "dienstag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "dienstag") ?? "Dienstag"; } }, { key: "mittwoch", get label() { return lookupLabel('kursverwaltung', 'wochentag', "mittwoch") ?? "Mittwoch"; } }, { key: "donnerstag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "donnerstag") ?? "Donnerstag"; } }, { key: "freitag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "freitag") ?? "Freitag"; } }, { key: "samstag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "samstag") ?? "Samstag"; } }, { key: "sonntag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "sonntag") ?? "Sonntag"; } }],
    schwierigkeitsgrad: [{ key: "anfaenger", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "anfaenger") ?? "Anfänger"; } }, { key: "mittelstufe", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "mittelstufe") ?? "Mittelstufe"; } }, { key: "fortgeschritten", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "fortgeschritten") ?? "Fortgeschritten"; } }, { key: "alle_levels", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "alle_levels") ?? "Alle Levels"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kursverwaltung': {
    'kursname': 'string/text',
    'beschreibung': 'string/textarea',
    'wochentag': 'lookup/select',
    'startzeit': 'string/text',
    'endzeit': 'string/text',
    'kursleitung': 'string/text',
    'schwierigkeitsgrad': 'lookup/radio',
    'raum': 'string/text',
    'max_teilnehmer': 'number',
    'aktuelle_belegung': 'number',
  },
  'kursanmeldung': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'kurs': 'applookup/select',
    'kommentar': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKursverwaltung = StripLookup<Kursverwaltung['fields']>;
export type CreateKursanmeldung = StripLookup<Kursanmeldung['fields']>;