// Auto-generated. Per-entity form-enhancements config for "Kursverwaltung".
// The sandbox sub-agent (Step 0) may overwrite this file with a richer config.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'kursname',
    'wochentag',
    'startzeit',
    'endzeit',
    'schwierigkeitsgrad',
    'kursleitung',
    'raum',
    'max_teilnehmer',
    'aktuelle_belegung',
    'beschreibung',
  ],
  defaults: {
    'wochentag': { kind: 'lookup', key: 'montag', label: 'Montag' },
    'schwierigkeitsgrad': { kind: 'lookup', key: 'alle_levels', label: 'Alle Levels' },
    'max_teilnehmer': { kind: 'literal', value: 12 },
    'aktuelle_belegung': { kind: 'literal', value: 0 },
  },
  computed: {},
};

// Build-time-populated field dependencies for MODUS-2 arrow functions in
// `computed`. The sub-agent leaves this empty; scripts/parse-formulas.mjs
// fills it after Step 0 by regex-extracting ctx.* calls from each function
// body. The dialog feeds these into classifyComputed so MODUS-2 entries get
// inline anchors instead of always landing in the aggregate section.
export const computedDeps: Record<string, string[]> = {};

// Build-time-populated applookup (ownKey → lookupKey) pairs found in MODUS-2
// arrow functions. Filled by scripts/parse-formulas.mjs from regex matches
// on `ctx.applookup('x','y')` and `ctx.applookupAny('x','y')`. The dialog
// merges this with MODUS-1 refs extracted at render time, so every numeric
// field the formula pulls from a selected lookup is surfaced as an inline
// hint next to the lookup combobox.
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
