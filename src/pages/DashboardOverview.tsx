import { useMemo, useState } from 'react';
import { IconPlus, IconUsers, IconClock, IconMapPin, IconUserPlus } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { Kursverwaltung } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { tx } from '@/i18n';
import { useClock, gruss, namen } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { Button } from '@/components/ui/button';

type Filter = 'all' | 'full' | 'almost';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { kursverwaltung, kursanmeldung } = data;
  const clock = useClock();
  const [filter, setFilter] = useState<Filter>('all');

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'kursverwaltung') return undefined;
      const k = top.record as Kursverwaltung;
      if (isFull(k)) return undefined;
      return { label: tx('Anmeldung erfassen'), onClick: () => crud.kursanmeldung.openCreate({ kurs: k.record_id }) };
    },
  });
  const enrichedKursanmeldung = crud.enriched.kursanmeldung;

  // sign-ups per class (a class is never shown emptier than its real sign-ups)
  const signupCount = useMemo(() => {
    const m = new Map<string, number>();
    kursanmeldung.forEach(a => {
      const id = extractRecordId(a.fields.kurs);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    });
    return m;
  }, [kursanmeldung]);

  function occOf(k: Kursverwaltung) {
    return Math.max(k.fields.aktuelle_belegung ?? 0, signupCount.get(k.record_id) ?? 0);
  }
  function isFull(k: Kursverwaltung) {
    const max = k.fields.max_teilnehmer;
    return max != null && max > 0 && occOf(k) >= max;
  }
  function isAlmost(k: Kursverwaltung) {
    const max = k.fields.max_teilnehmer;
    return max != null && max > 0 && !isFull(k) && occOf(k) / max >= 0.8;
  }

  const full = kursverwaltung.filter(isFull);
  const almost = kursverwaltung.filter(isAlmost);
  const totalMax = kursverwaltung.reduce((s, k) => s + (k.fields.max_teilnehmer ?? 0), 0);
  const totalOcc = kursverwaltung.reduce((s, k) => s + Math.min(occOf(k), k.fields.max_teilnehmer ?? occOf(k)), 0);

  const days = LOOKUP_OPTIONS.kursverwaltung.wochentag.map(o => ({ key: o.key, label: o.label }));
  const todayKey = days[(clock.getDay() + 6) % 7]?.key;

  const visible = kursverwaltung.filter(k => filter === 'all' ? true : filter === 'full' ? isFull(k) : isAlmost(k));
  const byDay = (key: string) => visible
    .filter(k => lookupKey(k.fields.wochentag) === key)
    .sort((a, b) => (a.fields.startzeit ?? '').localeCompare(b.fields.startzeit ?? ''));

  const todays = kursverwaltung.filter(k => lookupKey(k.fields.wochentag) === todayKey)
    .sort((a, b) => (a.fields.startzeit ?? '').localeCompare(b.fields.startzeit ?? ''));

  let context: string;
  if (kursverwaltung.length === 0) {
    context = tx('Lege deinen ersten Kurs an, dann können sich Besucher anmelden.');
  } else if (todays.length > 0) {
    const n = namen(todays.map(k => k.fields.kursname ?? ''), 3);
    context = full.length > 0
      ? tx`Heute: ${n}. Ausgebucht: ${namen(full.map(k => k.fields.kursname ?? ''), 3)}.`
      : tx`Heute: ${n}.`;
  } else if (full.length > 0) {
    context = tx`Heute ist kein Kurs. Ausgebucht: ${namen(full.map(k => k.fields.kursname ?? ''), 3)}.`;
  } else {
    context = tx`Heute ist kein Kurs — ${totalMax - totalOcc} freie Plätze in der Woche.`;
  }

  const recent = [...enrichedKursanmeldung]
    .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''));

  const dayName = (k: Kursverwaltung) => k.fields.wochentag?.label ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => crud.kursanmeldung.openCreate({})}>
            <IconUserPlus size={16} className="shrink-0" />
            {tx('Anmeldung')}
          </Button>
          <Button onClick={() => crud.kursverwaltung.openCreate({})}>
            <IconPlus size={16} className="shrink-0" />
            {tx('Neuer Kurs')}
          </Button>
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Ausgebucht')}
              value={full.length}
              tone={full.length > 0 ? 'destructive' : 'default'}
              onClick={() => setFilter(f => f === 'full' ? 'all' : 'full')}
              active={filter === 'full'}
            />
            <StatStripItem
              title={tx('Fast voll')}
              value={almost.length}
              tone={almost.length > 0 ? 'warning' : 'default'}
              onClick={() => setFilter(f => f === 'almost' ? 'all' : 'almost')}
              active={filter === 'almost'}
            />
            <StatStripItem
              title={tx('Belegt / Plätze')}
              value={`${totalOcc} / ${totalMax}`}
              icon={<IconUsers size={16} className="text-muted-foreground" />}
            />
          </StatStrip>
        }
        primary={
          <div className="rounded-[27px] bg-card shadow-sm overflow-hidden p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
              {days.map(d => {
                const list = byDay(d.key);
                if (filter !== 'all' && list.length === 0) return null;
                const isToday = d.key === todayKey;
                return (
                  <section key={d.key} className="min-w-0 space-y-2">
                    <h3 className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {d.label}{isToday ? ` · ${tx('Heute')}` : ''}
                    </h3>
                    {list.length === 0 && (
                      <p className="text-xs text-muted-foreground rounded-xl border border-dashed p-3">{tx('Kein Kurs')}</p>
                    )}
                    {list.map(k => {
                      const max = k.fields.max_teilnehmer ?? 0;
                      const occ = occOf(k);
                      const f = isFull(k);
                      const a = isAlmost(k);
                      const pct = max > 0 ? Math.min(100, Math.round((occ / max) * 100)) : 0;
                      return (
                        <div
                          key={k.record_id}
                          role="button"
                          tabIndex={0}
                          onClick={() => crud.kursverwaltung.openDetail(k)}
                          onKeyDown={e => { if (e.key === 'Enter') crud.kursverwaltung.openDetail(k); }}
                          className={`rounded-2xl border p-3 space-y-2 cursor-pointer overflow-hidden hover:shadow-md transition-shadow ${f ? 'border-destructive/40 bg-destructive/5' : 'bg-background'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{k.fields.kursname}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <IconClock size={12} className="shrink-0" />
                                <span className="truncate">{k.fields.startzeit}{k.fields.endzeit ? `–${k.fields.endzeit}` : ''}</span>
                              </div>
                              {(k.fields.raum || k.fields.kursleitung) && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <IconMapPin size={12} className="shrink-0" />
                                  <span className="truncate">{[k.fields.raum, k.fields.kursleitung].filter(Boolean).join(' · ')}</span>
                                </div>
                              )}
                            </div>
                            {f && <span className="text-xs font-semibold text-destructive shrink-0">{tx('Voll')}</span>}
                            {a && <span className="text-xs font-semibold text-amber-600 shrink-0">{tx('Fast voll')}</span>}
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${f ? 'bg-destructive' : a ? 'bg-amber-500' : 'bg-primary'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium">{tx`${occ} von ${max} Plätzen`}</span>
                              {!f && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="text-primary font-medium hover:underline"
                                  onClick={e => { e.stopPropagation(); crud.kursanmeldung.openCreate({ kurs: k.record_id }); }}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); crud.kursanmeldung.openCreate({ kurs: k.record_id }); } }}
                                >
                                  + {tx('Anmeldung')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </div>
        }
        aside={
          <>
            <WorkList
              title={tx('Fast voll')}
              items={almost
                .sort((a, b) => (b.fields.max_teilnehmer ? occOf(b) / b.fields.max_teilnehmer : 0) - (a.fields.max_teilnehmer ? occOf(a) / a.fields.max_teilnehmer : 0))
                .map(k => ({
                  id: k.record_id,
                  title: k.fields.kursname ?? '',
                  secondLine: (
                    <>
                      <span className="font-medium text-amber-600">{tx`${(k.fields.max_teilnehmer ?? 0) - occOf(k)} Plätze frei`}</span>
                      <span className="text-muted-foreground"> · {dayName(k)} {k.fields.startzeit}</span>
                    </>
                  ),
                  action: { label: tx('+ Anmeldung'), onClick: () => crud.kursanmeldung.openCreate({ kurs: k.record_id }) },
                }))}
              onItemClick={id => { const k = kursverwaltung.find(x => x.record_id === id); if (k) crud.kursverwaltung.openDetail(k); }}
              empty={{ text: tx('Keine Kurse kurz vor dem Limit.'), action: { label: tx('Anmeldung erfassen'), onClick: () => crud.kursanmeldung.openCreate({}) } }}
            />
            <WorkList
              title={tx('Neueste Anmeldungen')}
              items={recent.map(a => ({
                id: a.record_id,
                title: [a.fields.vorname, a.fields.nachname].filter(Boolean).join(' '),
                secondLine: (
                  <>
                    <span className="font-medium">{a.kursName || '—'}</span>
                    <span className="text-muted-foreground"> · {formatDate(a.createdat)}</span>
                  </>
                ),
              }))}
              onItemClick={id => { const a = kursanmeldung.find(x => x.record_id === id); if (a) crud.kursanmeldung.openDetail(a); }}
              empty={{ text: tx('Noch keine Anmeldungen.'), action: { label: tx('Anmeldung erfassen'), onClick: () => crud.kursanmeldung.openCreate({}) } }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
