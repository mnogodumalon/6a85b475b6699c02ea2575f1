/**
 * useSignUpForClassFlow — the plumbing of the flow « Für einen Kurs anmelden », generated from the plan.
 *
 * Writes `kursanmeldung`: asks `vorname`, `nachname`, `email`, `telefon`, `kurs`, `kommentar`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useSignUpForClassFlow({
 *     steps: { kurs: 1, vorname: 2, nachname: 2, email: 2, telefon: 2, kommentar: 2 },
 *     items: { kurs: r => ({ id: r.id, title: fieldText(r, 'kursname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.kurs.select} {...flow.pick('kurs')} />
 *     <Bound form={flow.forms.kursanmeldung} name="vorname" />
 *     <Bound form={flow.forms.kursanmeldung} name="nachname" />
 *     <Bound form={flow.forms.kursanmeldung} name="email" />
 *     <Bound form={flow.forms.kursanmeldung} name="telefon" />
 *     <Bound form={flow.forms.kursanmeldung} name="kommentar" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type SignUpForClassFieldKey = 'email' | 'kommentar' | 'kurs' | 'nachname' | 'telefon' | 'vorname';

export interface SignUpForClassForms {
  kursanmeldung: StepForm<'kursanmeldung'>;
}

// Alias so the option generics stay readable.
type Key = SignUpForClassFieldKey;

export interface SignUpForClassFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    kurs?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"email": 2, "kommentar": 2, "kurs": 1, "nachname": 2, "telefon": 2, "vorname": 2};
export const SIGNUPFORCLASS_REVIEW_STEP = 3;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useSignUpForClassFlow(options: SignUpForClassFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const kursanmeldung = useStepForm('kursanmeldung', {
    fields: ["vorname", "nachname", "email", "telefon", "kurs", "kommentar"],
    steps: only(steps, ["vorname", "nachname", "email", "telefon", "kurs", "kommentar"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["vorname", "nachname", "email", "telefon", "kurs", "kommentar"]),
    messages: only(options.messages as Record<string, string> | undefined, ["vorname", "nachname", "email", "telefon", "kurs", "kommentar"]),
  });
  const forms: SignUpForClassForms = { kursanmeldung };
  const formList: StepForm[] = [kursanmeldung];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    kurs: useRecordSearch(servicePort, 'kursverwaltung', withPickPolicy('kurs', {
      searchFields: ["kursname", "startzeit", "endzeit", "kursleitung"] as never,
      toItem: options.items?.kurs as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:sign-up-for-class:read:${entity}`);
  const picks = {
    kurs: { ...searches.kurs, select: { ...searches.kurs.select, create: true as boolean, hint: hintFor('kurs', 'kursverwaltung', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'kursanmeldung', entity: 'kursanmeldung', form: kursanmeldung, primary: true,
      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "Allowed, no duplicate check", "id": "duplicate-signup", "question": "May one person sign up twice for a class?"}, {"assumed": "Unchanged, only create and delete count", "id": "occupancy-race", "question": "Should the occupancy be recalculated if sign-ups are edited?"}],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'sign-up-for-class' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: SignUpForClassFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: SignUpForClassFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'sign-up-for-class' as const,
    draftKey: 'sign-up-for-class' as const,
    entity: 'kursanmeldung' as const,
    form: kursanmeldung,
    forms, formList, picks, submit, steps,    reviewStep: SIGNUPFORCLASS_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type SignUpForClassFlow = ReturnType<typeof useSignUpForClassFlow>;
