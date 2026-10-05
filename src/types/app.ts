import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
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
    kurs?: RecordUrl; // applookup -> URL zu 'Kursverwaltung' Record
    kommentar?: string;
  };
}

export const APP_IDS = {
  KURSVERWALTUNG: '6a85b4625daa8d682242a596',
  KURSANMELDUNG: '6a85b465a3b42067c6974807',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kursverwaltung': {
    wochentag: [{ key: "montag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "montag") ?? "Monday"; } }, { key: "dienstag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "dienstag") ?? "Tuesday"; } }, { key: "mittwoch", get label() { return lookupLabel('kursverwaltung', 'wochentag', "mittwoch") ?? "Wednesday"; } }, { key: "donnerstag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "donnerstag") ?? "Thursday"; } }, { key: "freitag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "freitag") ?? "Friday"; } }, { key: "samstag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "samstag") ?? "Saturday"; } }, { key: "sonntag", get label() { return lookupLabel('kursverwaltung', 'wochentag', "sonntag") ?? "Sunday"; } }],
    schwierigkeitsgrad: [{ key: "anfaenger", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "anfaenger") ?? "Beginner"; } }, { key: "mittelstufe", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "mittelstufe") ?? "Intermediate"; } }, { key: "fortgeschritten", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "fortgeschritten") ?? "Advanced"; } }, { key: "alle_levels", get label() { return lookupLabel('kursverwaltung', 'schwierigkeitsgrad', "alle_levels") ?? "All Levels"; } }],
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