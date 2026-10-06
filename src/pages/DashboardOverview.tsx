import { useMemo, useState } from 'react';
import { IconPlus, IconUsers, IconFlame, IconArmchair, IconUserPlus } from '@tabler/icons-react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { Kursverwaltung } from '@/types/app';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { KanbanWidget, type KanbanCard } from '@/components/widgets/KanbanWidget';

type OccFilter = 'all' | 'full' | 'almost';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { kursverwaltung, kursanmeldung, setKursverwaltung, fetchAll } = data;
  const crud = useEntityCrud(data);
  const enrichedKursanmeldung = crud.enriched.kursanmeldung;
  const clock = useClock();
  const [filter, setFilter] = useState<OccFilter>('all');

  // booked spots per class: the larger of the maintained counter and real sign-ups
  const occupancy = useMemo(() => {
    const counts = new Map<string, number>();
    kursanmeldung.forEach(a => {
      const id = extractRecordId(a.fields.kurs);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    const occ = (k: Kursverwaltung) => {
      const max = k.fields.max_teilnehmer ?? 0;
      const booked = Math.max(k.fields.aktuelle_belegung ?? 0, counts.get(k.record_id) ?? 0);
      return { booked, max, free: Math.max(max - booked, 0), full: max > 0 && booked >= max, almost: max > 0 && booked < max && booked / max >= 0.8 };
    };
    return occ;
  }, [kursanmeldung]);

  const withOcc = kursverwaltung.map(k => ({ k, o: occupancy(k) }));
  const fullList = withOcc.filter(x => x.o.full);
  const almostList = withOcc.filter(x => x.o.almost);
  const totalMax = withOcc.reduce((s, x) => s + x.o.max, 0);
  const totalBooked = withOcc.reduce((s, x) => s + Math.min(x.o.booked, x.o.max), 0);

  const latest = [...enrichedKursanmeldung]
    .sort((a, b) => (b.createdat ?? '').localeCompare(a.createdat ?? ''));

  const columns = (LOOKUP_OPTIONS['kursverwaltung']?.['wochentag'] ?? []).map(o => ({ key: o.key, label: o.label }));

  const visible = withOcc
    .filter(x => filter === 'all' || (filter === 'full' ? x.o.full : x.o.almost))
    .sort((a, b) => (a.k.fields.startzeit ?? '').localeCompare(b.k.fields.startzeit ?? ''));

  const cards: KanbanCard[] = visible.map(({ k, o }) => ({
    id: `kurs:${k.record_id}`,
    column: k.fields.wochentag?.key ?? '',
    title: k.fields.kursname ?? '',
    subtitle: (
      <span className="block">
        <span className="block">{k.fields.startzeit}–{k.fields.endzeit}{k.fields.kursleitung ? ` · ${k.fields.kursleitung}` : ''}</span>
        <span className={o.full ? 'font-semibold text-destructive' : o.almost ? 'font-medium text-amber-600' : 'text-muted-foreground'}>
          {o.booked}/{o.max} {tx('Plätze')}{o.full ? ` · ${tx('Ausgebucht')}` : ''}
        </span>
      </span>
    ),
    tone: o.full ? 'destructive' : o.almost ? 'warning' : 'default',
  }));

  const openKurs = (id: string) => {
    const rec = kursverwaltung.find(k => k.record_id === id);
    if (rec) crud.kursverwaltung.openDetail(rec);
  };

  const moveCard = (cardId: string, newDay: string) => {
    const id = cardId.split(':')[1];
    const rec = kursverwaltung.find(k => k.record_id === id);
    if (!rec) return;
    const prev = rec.fields.wochentag;
    const apply = (v: typeof prev) =>
      setKursverwaltung(list => list.map(k => k.record_id === id ? { ...k, fields: { ...k.fields, wochentag: v } } : k));
    apply(lookupOption('kursverwaltung', 'wochentag', newDay));
    LivingAppsService.updateKursverwaltungEntry(id, { wochentag: newDay as never }).catch(() => fetchAll());
    undoToast(tx`${rec.fields.kursname ?? ''} verschoben`, () => {
      apply(prev);
      LivingAppsService.updateKursverwaltungEntry(id, { wochentag: (prev?.key ?? newDay) as never }).catch(() => fetchAll());
    });
  };

  const signUp = (k: Kursverwaltung) => crud.kursanmeldung.openCreate({ kurs: k.record_id });

  const contextLine = (() => {
    if (kursverwaltung.length === 0) return tx('Lege deinen ersten Kurs an, dann können sich Teilnehmer anmelden.');
    if (fullList.length > 0) return tx`${namen(fullList.map(x => x.k.fields.kursname ?? ''))} ist ausgebucht — neue Anmeldungen sind dort gesperrt.`;
    if (almostList.length > 0) return tx`${namen(almostList.map(x => x.k.fields.kursname ?? ''))} ist fast voll.`;
    if (latest[0]) return tx`Zuletzt angemeldet: ${`${latest[0].fields.vorname ?? ''} ${latest[0].fields.nachname ?? ''}`.trim()} für ${latest[0].kursName}.`;
    return tx('Noch keine Anmeldungen — alle Kurse haben freie Plätze.');
  })();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{contextLine}</p>
          <p className="text-xs text-muted-foreground">{format(clock, 'yyyy-MM-dd') && formatDate(format(clock, 'yyyy-MM-dd'))}</p>
        </div>
        {crud.kursverwaltung.canWrite && (
          <Button onClick={() => crud.kursverwaltung.openCreate({})}>
            <IconPlus size={16} className="shrink-0" />
            <span>{tx('Neuer Kurs')}</span>
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Ausgebucht')}
              value={fullList.length}
              icon={<IconFlame size={18} className="text-muted-foreground" />}
              tone={fullList.length > 0 ? 'destructive' : 'default'}
              onClick={() => setFilter(f => f === 'full' ? 'all' : 'full')}
              active={filter === 'full'}
            />
            <StatStripItem
              title={tx('Fast voll')}
              value={almostList.length}
              icon={<IconUsers size={18} className="text-muted-foreground" />}
              tone={almostList.length > 0 ? 'warning' : 'default'}
              onClick={() => setFilter(f => f === 'almost' ? 'all' : 'almost')}
              active={filter === 'almost'}
            />
            <StatStripItem
              title={tx('Belegte Plätze')}
              value={`${totalBooked}/${totalMax}`}
              icon={<IconArmchair size={18} className="text-muted-foreground" />}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={columns}
            cards={cards}
            onCardClick={c => openKurs(c.id.split(':')[1])}
            onCardMove={moveCard}
            onAddCard={crud.kursverwaltung.canWrite ? col => crud.kursverwaltung.openCreate({ wochentag: col }) : undefined}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Fast voll — noch Plätze frei')}
              icon={<IconUsers size={16} />}
              items={almostList.map(({ k, o }) => ({
                id: k.record_id,
                title: k.fields.kursname ?? '',
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{tx`noch ${o.free} frei`}</span>
                    <span className="text-muted-foreground"> · {k.fields.wochentag?.label} {k.fields.startzeit}</span>
                  </>
                ),
                action: crud.kursanmeldung.canWrite ? { label: tx('Anmelden'), onClick: () => signUp(k) } : undefined,
              }))}
              onItemClick={openKurs}
              empty={{ text: fullList.length > 0 ? tx('Keine weiteren Kurse knapp — nur ausgebuchte.') : tx('Alle Kurse haben ausreichend freie Plätze.') }}
            />
            <WorkList
              title={tx('Letzte Anmeldungen')}
              icon={<IconUserPlus size={16} />}
              items={latest.map(a => ({
                id: a.record_id,
                title: `${a.fields.vorname ?? ''} ${a.fields.nachname ?? ''}`.trim(),
                secondLine: (
                  <>
                    <span className="font-medium">{a.kursName}</span>
                    <span className="text-muted-foreground"> · {formatDate(a.createdat)}</span>
                  </>
                ),
              }))}
              onItemClick={id => {
                const rec = kursanmeldung.find(a => a.record_id === id);
                if (rec) crud.kursanmeldung.openDetail(rec);
              }}
              empty={{
                text: tx('Noch keine Anmeldungen.'),
                action: crud.kursanmeldung.canWrite ? { label: appLabel('kursanmeldung'), onClick: () => crud.kursanmeldung.openCreate({}) } : undefined,
              }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
