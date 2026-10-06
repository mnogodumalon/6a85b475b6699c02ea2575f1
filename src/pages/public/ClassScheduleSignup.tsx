import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconClock, IconDoor, IconUser, IconCheck } from '@tabler/icons-react';
import { PublicShell } from '@/components/PublicShell';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import {
  loadPublicPagesConfig, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useStepForm, useJourneySubmit, fieldText, fieldLookup, fieldNumber,
  type JourneyRecord, type JourneyPort,
} from '@/lib/journey';
import { tx } from '@/i18n';

const SLUG = 'kursplan';
const DAY_ORDER = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

interface ClassRow {
  id: string;
  name: string;
  description: string;
  day: string;
  dayLabel: string;
  start: string;
  end: string;
  instructor: string;
  level: string;
  room: string;
  max: number;
  taken: number;
  free: number;
}

function toRow(r: JourneyRecord): ClassRow {
  const day = fieldLookup(r, 'wochentag');
  const max = fieldNumber(r, 'max_teilnehmer') ?? 0;
  const taken = fieldNumber(r, 'aktuelle_belegung') ?? 0;
  return {
    id: r.id,
    name: fieldText(r, 'kursname'),
    description: fieldText(r, 'beschreibung'),
    day: day?.key ?? '',
    dayLabel: day?.label ?? '',
    start: fieldText(r, 'startzeit'),
    end: fieldText(r, 'endzeit'),
    instructor: fieldText(r, 'kursleitung'),
    level: fieldLookup(r, 'schwierigkeitsgrad')?.label ?? '',
    room: fieldText(r, 'raum'),
    max,
    taken,
    free: Math.max(0, max - taken),
  };
}

export default function ClassScheduleSignup() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return (
    <PublicShell title={page.title} description={page.description} wide>
      <SignupWizard cfg={cfg} page={page} />
    </PublicShell>
  );
}

function SignupWizard({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const port: JourneyPort = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const form = useStepForm('kursanmeldung', {
    fields: ['kurs', 'vorname', 'nachname', 'email', 'telefon', 'kommentar'],
    steps: { kurs: 1, vorname: 2, nachname: 2, email: 2, telefon: 2, kommentar: 2 },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{ key: 'anmeldung', entity: 'kursanmeldung', form, primary: true }],
    { draftKey: SLUG },
  );

  const load = useCallback(async (): Promise<ClassRow[]> => {
    const recs = await port.list('kursverwaltung', { limit: 500 });
    const rows = recs.map(toRow);
    setClasses(rows);
    return rows;
  }, [port]);

  useEffect(() => {
    load()
      .then(() => setListError(null))
      .catch(() => setListError(tx('Der Kursplan konnte nicht geladen werden.')))
      .finally(() => setListLoading(false));
  }, [load]);

  const byDay = useMemo(() => {
    const groups = DAY_ORDER.map(d => ({
      day: d,
      label: classes.find(c => c.day === d)?.dayLabel ?? d,
      items: classes
        .filter(c => c.day === d)
        .sort((a, b) => a.start.localeCompare(b.start)),
    }));
    return groups.filter(g => g.items.length > 0);
  }, [classes]);

  const selectedId = (form.get('kurs') as string | undefined) || null;
  const selected = classes.find(c => c.id === selectedId);

  // Blocking check against fresh data: the class must still have a free spot.
  const ensureFreeSpot = async (): Promise<boolean | string> => {
    if (!selectedId) return tx('Bitte wähle einen Kurs aus.');
    try {
      const rows = await load();
      const row = rows.find(c => c.id === selectedId);
      if (!row || row.free <= 0) {
        (form.set as (k: string, v: unknown, l?: string) => void)('kurs', '');
        return tx('Dieser Kurs ist leider ausgebucht. Bitte wähle einen anderen Kurs.');
      }
      return true;
    } catch {
      return tx('Die Verfügbarkeit konnte nicht geprüft werden. Bitte versuche es erneut.');
    }
  };

  const choose = (c: ClassRow) => {
    if (c.free <= 0) return;
    const ep = page.endpoints?.find(e => e.op === 'create');
    if (ep) prepareChallenge(cfg, page, 'POST', `/apps/${ep.app_id}/records`);
    (form.set as (k: string, v: unknown, l?: string) => void)('kurs', c.id, c.name);
  };

  const steps = [
    { label: tx('Kurs wählen') },
    { label: tx('Deine Daten') },
    { label: tx('Prüfen') },
  ];

  const restart = () => {
    submit.reset();
    form.reset();
    setStep(1);
    void load();
  };

  return (
    <IntentWizardShell
      steps={steps}
      currentStep={step}
      onStepChange={setStep}
      back={false}
      forms={[form]}
      draftKey={SLUG}
    >
      {step === 1 && (
        <div className="space-y-5">
          {listLoading && <p className="text-sm text-muted-foreground">{tx('Kursplan wird geladen …')}</p>}
          {listError && <p className="text-sm text-destructive">{listError}</p>}
          {!listLoading && !listError && byDay.length === 0 && (
            <p className="text-sm text-muted-foreground">{tx('Aktuell sind keine Kurse geplant.')}</p>
          )}
          {byDay.map(g => (
            <section key={g.day} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h3>
              <ul className="space-y-2">
                {g.items.map(c => {
                  const full = c.free <= 0;
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={full}
                        aria-pressed={active}
                        onClick={() => choose(c)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors overflow-hidden ${
                          active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
                        } ${full ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              {active && <IconCheck size={16} className="shrink-0 text-primary" />}
                              <span className="break-words">{c.name}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <IconClock size={14} className="shrink-0" />{c.start}–{c.end}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <IconUser size={14} className="shrink-0" />{c.instructor}
                              </span>
                              {c.room && (
                                <span className="inline-flex items-center gap-1">
                                  <IconDoor size={14} className="shrink-0" />{c.room}
                                </span>
                              )}
                              {c.level && <span>{c.level}</span>}
                            </div>
                            {c.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                              full
                                ? 'bg-red-100 text-red-700'
                                : c.free <= 3
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {full ? tx('Ausgebucht') : tx`${c.free} von ${c.max} Plätzen frei`}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <FieldErrorSummary forms={[form]} step={1} />
          <StepNav
            hideBack
            nextStepLabel={tx('Deine Daten')}
            onNext={async () => {
              if (!form.validate(['kurs'])) return false;
              return ensureFreeSpot();
            }}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {selected && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              {tx`Kurs: ${selected.name}`} · {selected.dayLabel} {selected.start}–{selected.end}
            </p>
          )}
          <Bound form={form} name="vorname" />
          <Bound form={form} name="nachname" />
          <Bound form={form} name="email" />
          <Bound form={form} name="telefon" />
          <Bound form={form} name="kommentar" />
          <FieldErrorSummary forms={[form]} step={2} />
          <StepNav
            onBack={() => setStep(1)}
            nextStepLabel={tx('Prüfen')}
            onNext={async () => {
              if (!form.validate(['vorname', 'nachname', 'email'])) return false;
              const ok = await ensureFreeSpot();
              if (ok !== true) {
                setStep(1);
                return ok;
              }
              return true;
            }}
          />
        </div>
      )}

      {step === 3 && !submit.done && (
        <SummaryStep
          forms={[form]}
          submit={submit}
          whatHappensNext={tx('Nach dem Absenden ist dein Platz im Kurs reserviert.')}
        />
      )}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[form]}
          next={[{ label: tx('Weiteren Kurs buchen'), onClick: restart }]}
        />
      )}
    </IntentWizardShell>
  );
}
