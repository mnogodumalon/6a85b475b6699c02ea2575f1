import { useEffect, useMemo, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm, useJourneySubmit, fieldText, fieldLookup, fieldNumber,
  type JourneyRecord, type JourneyPort,
} from '@/lib/journey';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { tx } from '@/i18n';

const DAY_ORDER = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

interface ClassRow {
  id: string;
  name: string;
  description: string;
  dayKey: string;
  dayLabel: string;
  start: string;
  end: string;
  instructor: string;
  level: string;
  room: string;
  free: number;
}

function toRow(r: JourneyRecord): ClassRow {
  const day = fieldLookup(r, 'wochentag');
  const max = fieldNumber(r, 'max_teilnehmer') ?? 0;
  const cur = fieldNumber(r, 'aktuelle_belegung') ?? 0;
  return {
    id: r.id,
    name: fieldText(r, 'kursname'),
    description: fieldText(r, 'beschreibung'),
    dayKey: day?.key ?? '',
    dayLabel: day?.label ?? '',
    start: fieldText(r, 'startzeit'),
    end: fieldText(r, 'endzeit'),
    instructor: fieldText(r, 'kursleitung'),
    level: fieldLookup(r, 'schwierigkeitsgrad')?.label ?? '',
    room: fieldText(r, 'raum'),
    free: Math.max(0, max - cur),
  };
}

function SignupWizard({ port }: { port: JourneyPort }) {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<ClassRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const f = useStepForm('kursanmeldung', {
    fields: ['kurs', 'vorname', 'nachname', 'email', 'telefon', 'kommentar'],
    steps: { kurs: 1, vorname: 2, nachname: 2, email: 2, telefon: 2, kommentar: 2 },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{ key: 'anmeldung', entity: 'kursanmeldung', form: f, primary: true }],
    { draftKey: 'class-schedule-signup' },
  );

  useEffect(() => {
    let alive = true;
    port.list('kursverwaltung', { limit: 500 })
      .then(list => { if (alive) setRows(list.map(toRow)); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [port]);

  const byDay = useMemo(() => {
    const groups: Record<string, ClassRow[]> = {};
    for (const r of rows ?? []) (groups[r.dayKey] ??= []).push(r);
    for (const k of Object.keys(groups)) groups[k].sort((a, b) => a.start.localeCompare(b.start));
    return DAY_ORDER.filter(k => groups[k]).map(k => ({ key: k, label: groups[k][0].dayLabel, items: groups[k] }));
  }, [rows]);

  const selectedId = typeof f.get('kurs') === 'string' ? (f.get('kurs') as string) : null;
  const STEPS = [{ label: tx('Kurs') }, { label: tx('Deine Daten') }, { label: tx('Prüfen') }];

  const restart = () => { submit.reset(); f.reset(); setStep(1); };

  return (
    <IntentWizardShell
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      back={false}
      forms={[f]}
      draftKey="class-schedule-signup"
    >
      {step === 1 && (
        <div className="space-y-5">
          {loadError && <p className="text-sm text-destructive">{tx('Der Kursplan konnte nicht geladen werden.')}</p>}
          {!rows && !loadError && <p className="text-sm text-muted-foreground">{tx('Kursplan wird geladen …')}</p>}
          {rows && byDay.length === 0 && <p className="text-sm text-muted-foreground">{tx('Zurzeit sind keine Kurse geplant.')}</p>}
          {byDay.map(day => (
            <section key={day.key} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</h3>
              <div className="space-y-2">
                {day.items.map(c => {
                  const full = c.free <= 0;
                  const selected = selectedId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={full}
                      aria-pressed={selected}
                      onClick={() => f.set('kurs', c.id, c.name)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors overflow-hidden ${
                        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                          : full ? 'opacity-60 cursor-not-allowed bg-muted/40'
                          : 'hover:border-primary/50 bg-card'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {c.start}–{c.end}
                            {c.instructor ? ` · ${c.instructor}` : ''}
                            {c.room ? ` · ${c.room}` : ''}
                          </div>
                          {c.level && <div className="text-xs text-muted-foreground mt-0.5">{c.level}</div>}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            full ? 'bg-red-100 text-red-700'
                              : c.free <= 3 ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {full ? tx('Ausgebucht') : tx`${c.free} freie Plätze`}
                        </span>
                      </div>
                      {c.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {f.error('kurs') && <p className="text-sm text-destructive">{f.error('kurs')}</p>}
          <StepNav
            hideBack
            nextStepLabel={tx('Deine Daten')}
            onNext={() => f.validate(['kurs'])}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Bound form={f} name="vorname" />
          <Bound form={f} name="nachname" />
          <Bound form={f} name="email" />
          <Bound form={f} name="telefon" />
          <Bound form={f} name="kommentar" />
          <StepNav
            onBack={() => setStep(1)}
            nextStepLabel={tx('Prüfen')}
            onNext={() => f.validate(['vorname', 'nachname', 'email', 'telefon', 'kommentar'])}
          />
        </div>
      )}

      {step === 3 && !submit.done && (
        <SummaryStep
          forms={[f]}
          submit={submit}
          whatHappensNext={tx('Dein Platz wird für dich vorgemerkt. Wir melden uns bei Rückfragen per E-Mail.')}
        />
      )}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          title={tx('Anmeldung eingegangen')}
          next={[{ label: tx('Für einen weiteren Kurs anmelden'), onClick: restart }]}
        />
      )}
    </IntentWizardShell>
  );
}

export default function ClassScheduleSignup() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig('kursplan').then(c => {
      setCfg(c);
      setPage(c?.pages['kursplan'] ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const port = useMemo(() => (cfg && page ? createPublicPort(cfg, page) : null), [cfg, page]);

  if (loading || !cfg || !page || !port) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return (
    <PublicShell title={page.title} description={page.description}>
      <SignupWizard port={port} />
    </PublicShell>
  );
}
