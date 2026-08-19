/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'kursverwaltung'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` carries the snake_case IDENTIFIER, NOT the camelCase key that
 *   `crud.<entity>` uses — for multi-word entities the two differ. Take each
 *   from its own column below, verbatim; a camelCase top.type narrows `top`
 *   to `never` and costs a build cycle (TS2367 "have no overlap", then
 *   TS2339 on top.record):
 *     crud.kursverwaltung  ·  top.type === 'kursverwaltung'
 *     crud.kursanmeldung  ·  top.type === 'kursanmeldung'
 *   …
 *   crud.kursverwaltung.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.kursverwaltung.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.kursverwaltung.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.kursanmeldung              // memoized Enriched* arrays — reuse these,
 *                                       // never call enrich*() yourself in the page
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   kursverwaltung: kursname, beschreibung, wochentag, startzeit, endzeit, kursleitung, schwierigkeitsgrad, raum, …  ·  ← kursanmeldung (list + contextual +)
 *   kursanmeldung: vorname, nachname, email, telefon, kurs, kommentar  ·  → kursverwaltung
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Kursverwaltung, Kursanmeldung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichKursanmeldung } from '@/lib/enrich';
import type { EnrichedKursanmeldung } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KursverwaltungDialog, type KursverwaltungDialogDefaults } from '@/components/dialogs/KursverwaltungDialog';
import { KursverwaltungDetails } from '@/components/details/KursverwaltungDetails';
import { KursanmeldungDialog, type KursanmeldungDialogDefaults } from '@/components/dialogs/KursanmeldungDialog';
import { KursanmeldungDetails } from '@/components/details/KursanmeldungDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'kursverwaltung'; record: Kursverwaltung }
  | { type: 'kursanmeldung'; record: EnrichedKursanmeldung };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  kursverwaltung: EntityCrudApi<Kursverwaltung, KursverwaltungDialogDefaults>;
  kursanmeldung: EntityCrudApi<Kursanmeldung, KursanmeldungDialogDefaults>;
  /** Memoized Enriched* arrays — reuse these, never re-enrich in the page. */
  enriched: { kursanmeldung: EnrichedKursanmeldung[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [kursverwaltungDialog, setKursverwaltungDialog] = useState<{ defaults?: KursverwaltungDialogDefaults; editing?: Kursverwaltung } | null>(null);
  const [kursanmeldungDialog, setKursanmeldungDialog] = useState<{ defaults?: KursanmeldungDialogDefaults; editing?: Kursanmeldung } | null>(null);
  const enrichedKursanmeldung = useMemo(() => enrichKursanmeldung(data.kursanmeldung, { kursverwaltungMap: data.kursverwaltungMap }), [data.kursanmeldung, data.kursverwaltungMap]);

  function detailKursverwaltung(record: Kursverwaltung, push = false) {
    const item: OverlayItem = { type: 'kursverwaltung', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKursverwaltung(fields: Kursverwaltung['fields']) {
    const editing = kursverwaltungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKursverwaltung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKursverwaltungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kursverwaltung')} — ${t('crud_updated')}`, async () => {
        data.setKursverwaltung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKursverwaltungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKursverwaltungEntry(fields);
      undoToast(`${appLabel('kursverwaltung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKursanmeldung(record: Kursanmeldung, push = false) {
    const rec = enrichedKursanmeldung.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kursanmeldung', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKursanmeldung(fields: Kursanmeldung['fields']) {
    const editing = kursanmeldungDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKursanmeldung(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKursanmeldungEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kursanmeldung')} — ${t('crud_updated')}`, async () => {
        data.setKursanmeldung(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKursanmeldungEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKursanmeldungEntry(fields);
      undoToast(`${appLabel('kursanmeldung')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <KursverwaltungDialog
        open={kursverwaltungDialog !== null}
        onClose={() => setKursverwaltungDialog(null)}
        onSubmit={submitKursverwaltung}
        defaultValues={kursverwaltungDialog?.defaults}
        recordId={kursverwaltungDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kursverwaltung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kursverwaltung']}
      />
      <KursanmeldungDialog
        open={kursanmeldungDialog !== null}
        onClose={() => setKursanmeldungDialog(null)}
        onSubmit={submitKursanmeldung}
        defaultValues={kursanmeldungDialog?.defaults}
        recordId={kursanmeldungDialog?.editing?.record_id}
        kursverwaltungList={data.kursverwaltung}
        enablePhotoScan={AI_PHOTO_SCAN['Kursanmeldung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kursanmeldung']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'kursverwaltung') {
            return (
              <>
                <RecordHeader title={top.record.fields.kursname ?? appLabel('kursverwaltung')} subtitle={undefined} />
                <KursverwaltungDetails
                  record={top.record}
                  kursanmeldungList={data.kursanmeldung}
                  onOpenKursanmeldung={(r) => detailKursanmeldung(r, true)}
                  onAddKursanmeldung={() => setKursanmeldungDialog({ defaults: { kurs: createRecordUrl(APP_IDS.KURSVERWALTUNG, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'kursanmeldung') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('kursanmeldung')} subtitle={undefined} />
                <KursanmeldungDetails
                  record={top.record}
                  kursverwaltungList={data.kursverwaltung}
                  onOpenKursverwaltung={(r) => detailKursverwaltung(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'kursverwaltung') setKursverwaltungDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kursanmeldung') setKursanmeldungDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    kursverwaltung: {
      openCreate: (defaults?: KursverwaltungDialogDefaults) => setKursverwaltungDialog({ defaults }),
      openEdit: (record: Kursverwaltung) => setKursverwaltungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kursverwaltung) => detailKursverwaltung(record, false),
    },
    kursanmeldung: {
      openCreate: (defaults?: KursanmeldungDialogDefaults) => setKursanmeldungDialog({ defaults }),
      openEdit: (record: Kursanmeldung) => setKursanmeldungDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kursanmeldung) => detailKursanmeldung(record, false),
    },
    enriched: { kursanmeldung: enrichedKursanmeldung },
  };
}
