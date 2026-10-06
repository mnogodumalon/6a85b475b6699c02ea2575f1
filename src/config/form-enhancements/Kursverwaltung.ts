// Auto-generated. Per-entity form-enhancements config for "Class Management".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["kursname", "kursleitung", {"row": ["wochentag", "schwierigkeitsgrad"], "cols": "1fr 1fr"}, {"row": ["startzeit", "endzeit"], "cols": "1fr 1fr"}, {"row": ["max_teilnehmer", "aktuelle_belegung"], "cols": "1fr 1fr"}, "raum", "beschreibung"],
  defaults: {
    'aktuelle_belegung': { kind: 'literal', value: 0 },
    'schwierigkeitsgrad': { kind: 'lookup', key: 'alle_levels', label: 'All Levels' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
