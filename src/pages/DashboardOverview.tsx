import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { LOOKUP_OPTIONS, APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import {
  IconCalendarEvent,
  IconUsers,
  IconAlertCircle,
  IconCheck,
  IconPlus,
} from '@tabler/icons-react';

// Wochentag-Key → JS getDay() (0=So, 1=Mo, …)
const WEEKDAY_TO_JS: Record<string, number> = {
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
  samstag: 6,
  sonntag: 0,
};

export default function DashboardOverview() {
  const data = useDashboardData();
  const { kursverwaltung, kursanmeldung, kursverwaltungMap, loading, error, fetchAll } = data;
  const crud = useEntityCrud(data);
  const enrichedKursanmeldung = crud.enriched.kursanmeldung;
  const clock = useClock();

  const [filterFull, setFilterFull] = useState(false);

  // Alle Hooks ÜBER den Early-Returns
  const aktivKurse = useMemo(
    () => kursverwaltung.filter(k => k.fields.kursname),
    [kursverwaltung],
  );

  // Belegungsdaten
  const volleKurse = useMemo(
    () =>
      aktivKurse.filter(
        k =>
          (k.fields.aktuelle_belegung ?? 0) >= (k.fields.max_teilnehmer ?? Infinity),
      ),
    [aktivKurse],
  );

  const gesamtFreiePlaetze = useMemo(
    () =>
      aktivKurse.reduce(
        (acc, k) =>
          acc + Math.max(0, (k.fields.max_teilnehmer ?? 0) - (k.fields.aktuelle_belegung ?? 0)),
        0,
      ),
    [aktivKurse],
  );

  // Anmeldungen der letzten 7 Tage
  const neueAnmeldungen = useMemo(() => {
    const cutoff = new Date(clock);
    cutoff.setDate(cutoff.getDate() - 7);
    return enrichedKursanmeldung.filter(a => new Date(a.createdat) >= cutoff);
  }, [enrichedKursanmeldung, clock]);

  // CalendarEvent[] — jeder Kurs wird an JEDEM Wochentag in der aktuellen Woche gerendert
  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];
    aktivKurse.forEach(k => {
      const wd = k.fields.wochentag?.key;
      if (!wd || !(wd in WEEKDAY_TO_JS)) return;
      const jsDay = WEEKDAY_TO_JS[wd];

      // Berechne den Wochentag für die nächsten 3 Wochen ab heute (damit der Kalender
      // im Wochen-Board-Modus immer Kurse zeigt)
      const today = new Date(clock);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Montag dieser Woche

      for (let weekOffset = -1; weekOffset <= 4; weekOffset++) {
        const base = new Date(weekStart);
        base.setDate(weekStart.getDate() + weekOffset * 7);
        const diff = (jsDay - 1 + 7) % 7; // Offset von Montag (JS: Mo=1)
        const eventDate = new Date(base);
        eventDate.setDate(base.getDate() + diff);

        const dateStr = format(eventDate, 'yyyy-MM-dd');
        const belegung = k.fields.aktuelle_belegung ?? 0;
        const maxTN = k.fields.max_teilnehmer ?? 0;
        const istVoll = maxTN > 0 && belegung >= maxTN;
        const startzeit = k.fields.startzeit ?? '09:00';
        const endzeit = k.fields.endzeit ?? '10:00';

        result.push({
          id: `kurs:${k.record_id}:${dateStr}`,
          start: `${dateStr}T${startzeit}`,
          end: `${dateStr}T${endzeit}`,
          title: k.fields.kursname ?? '',
          subtitle: istVoll
            ? tx('Ausgebucht')
            : tx`${belegung}/${maxTN} Plätze`,
          tone: istVoll ? 'destructive' : belegung / (maxTN || 1) >= 0.8 ? 'warning' : 'primary',
        });
      }
    });
    return result;
  }, [aktivKurse, clock]);

  // Gefilterte Kurse für WorkList
  const anzeigeKurse = useMemo(
    () => (filterFull ? volleKurse : aktivKurse),
    [filterFull, volleKurse, aktivKurse],
  );

  // ChartWidget-Rows: Anmeldungen nach Kurs
  const chartRows = useMemo(
    () =>
      enrichedKursanmeldung.map(a => ({
        id: `anmeldung:${a.record_id}`,
        data: a,
      })),
    [enrichedKursanmeldung],
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Kontext-Linie
  const heute = tx('Heute');
  const neueCount = neueAnmeldungen.length;
  const kursNamen = namen(aktivKurse.map(k => k.fields.kursname ?? ''));
  const kontextLine =
    neueCount > 0
      ? tx`${neueCount} neue Anmeldungen diese Woche — Kurse: ${kursNamen}`
      : aktivKurse.length > 0
      ? tx`${aktivKurse.length} Kurse im Plan — ${kursNamen}`
      : tx('Noch keine Kurse angelegt.');

  // Hero: volle Kurse
  const hero =
    volleKurse.length > 0 ? (
      <HeroBanner
        icon={<IconAlertCircle size={18} />}
        action={{
          label: tx('Warteliste öffnen'),
          onClick: () => {
            volleKurse.forEach(k => crud.kursverwaltung.openDetail(k));
          },
        }}
      >
        <b>{namen(volleKurse.map(k => k.fields.kursname ?? ''))}</b>{' '}
        {volleKurse.length === 1 ? tx('ist ausgebucht') : tx('sind ausgebucht')}
        {' — '}
        {tx('keine freien Plätze mehr.')}
      </HeroBanner>
    ) : undefined;

  return (
    <div className="space-y-4">
      {/* Seitenheader */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {gruss(clock)} {tx('Willkommen im Yogastudio!')}
          </h1>
          <p className="text-muted-foreground mt-1">{kontextLine}</p>
        </div>
        <button
          onClick={() => crud.kursverwaltung.openCreate({})}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          <span className="hidden sm:inline">{tx('Neuer Kurs')}</span>
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={hero}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Kurse')}
              value={aktivKurse.length}
              icon={<IconCalendarEvent size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Anmeldungen gesamt')}
              value={kursanmeldung.length}
              icon={<IconUsers size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Freie Plätze')}
              value={gesamtFreiePlaetze}
              icon={<IconCheck size={16} />}
              tone={gesamtFreiePlaetze === 0 && aktivKurse.length > 0 ? 'destructive' : 'success'}
            />
            <StatStripItem
              title={tx('Ausgebucht')}
              value={volleKurse.length}
              icon={<IconAlertCircle size={16} />}
              tone={volleKurse.length > 0 ? 'warning' : 'default'}
              onClick={() => setFilterFull(f => !f)}
              active={filterFull}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={events}
            defaultView="week"
            weekLayout="board"
            locale={dateFnsLocale()}
            dayStartHour={7}
            dayEndHour={22}
            views={['week', 'day', 'agenda']}
            onEventClick={ev => {
              const id = ev.id.split(':')[1];
              if (!id) return;
              const kurs = kursverwaltungMap.get(id);
              if (kurs) crud.kursverwaltung.openDetail(kurs);
            }}
            onEmptyClick={date => {
              // Leeren Slot anklicken → neuen Kurs anlegen
              crud.kursverwaltung.openCreate({
                startzeit: format(date, 'HH:mm'),
              });
            }}
            renderDayBackground={date => {
              // Auslastungsbalken hinter den Events
              const dayKey = format(date, 'EEEE').toLowerCase();
              const tagKurse = aktivKurse.filter(k => {
                const wd = k.fields.wochentag?.key;
                return wd && WEEKDAY_TO_JS[wd] === date.getDay();
              });
              if (tagKurse.length === 0) return null;
              const gesamtBelegt = tagKurse.reduce(
                (s, k) => s + (k.fields.aktuelle_belegung ?? 0),
                0,
              );
              const gesamtMax = tagKurse.reduce(
                (s, k) => s + (k.fields.max_teilnehmer ?? 0),
                0,
              );
              void dayKey;
              if (gesamtMax === 0) return null;
              const pct = Math.min(100, Math.round((gesamtBelegt / gesamtMax) * 100));
              return (
                <div className="absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${pct >= 80 ? 'bg-amber-500/50' : 'bg-primary/30'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={filterFull ? tx('Ausgebuchte Kurse') : tx('Alle Kurse')}
              items={anzeigeKurse.slice(0, 8).map(k => {
                const belegung = k.fields.aktuelle_belegung ?? 0;
                const maxTN = k.fields.max_teilnehmer ?? 0;
                const istVoll = maxTN > 0 && belegung >= maxTN;
                return {
                  id: k.record_id,
                  title: k.fields.kursname ?? tx('Ohne Name'),
                  secondLine: (
                    <>
                      <span
                        className={`font-medium ${
                          istVoll
                            ? 'text-destructive'
                            : belegung / (maxTN || 1) >= 0.8
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {istVoll ? tx('Ausgebucht') : tx`${belegung}/${maxTN} Plätze`}
                      </span>
                      {k.fields.wochentag && (
                        <span className="text-muted-foreground">
                          {' · '}
                          {k.fields.wochentag.label}
                          {k.fields.startzeit && ` ${k.fields.startzeit}`}
                        </span>
                      )}
                    </>
                  ),
                  action: {
                    label: tx('Anmeldung'),
                    onClick: () => {
                      crud.kursanmeldung.openCreate({
                        kurs: createRecordUrl(APP_IDS.KURSVERWALTUNG, k.record_id),
                      });
                      undoToast(tx`Anmeldung für ${k.fields.kursname ?? ''} geöffnet`);
                    },
                  },
                };
              })}
              onItemClick={id => {
                const kurs = kursverwaltungMap.get(id);
                if (kurs) crud.kursverwaltung.openDetail(kurs);
              }}
              empty={{
                text: tx('Noch keine Kurse angelegt — leg jetzt deinen ersten Kurs an!'),
                action: { label: tx('Kurs anlegen'), onClick: () => crud.kursverwaltung.openCreate({}) },
              }}
            />
            <ChartWidget
              title={tx('Anmeldungen pro Kurs')}
              rows={chartRows}
              dimension={{
                kind: 'category',
                accessor: r => r.data.kursName || null,
                label: tx('Kurs'),
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
