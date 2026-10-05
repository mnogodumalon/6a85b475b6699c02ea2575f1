import type { Kursanmeldung, Kursverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface KursanmeldungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kursanmeldung;
  /** N:1-Ziel „Kursverwaltung": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kursverwaltungList: Kursverwaltung[];
  /** Klick auf die Kursverwaltung-Relation → overlay.push auf dessen Detail. */
  onOpenKursverwaltung?: (record: Kursverwaltung) => void;
}

export function KursanmeldungDetails({
  record,
  kursverwaltungList,
  onOpenKursverwaltung,
}: KursanmeldungDetailsProps) {
  const kursTarget = kursverwaltungList.find(r => r.record_id === extractRecordId(record.fields.kurs));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kursanmeldung', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('kursanmeldung', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('kursanmeldung', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('kursanmeldung', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('kursanmeldung', 'kommentar')} value={record.fields.kommentar} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('kursanmeldung', 'kurs')}
          name={kursTarget?.fields.kursname ?? '—'}
          meta={[kursTarget?.fields.startzeit, kursTarget?.fields.endzeit].filter(Boolean).join(' · ') || undefined}
          onClick={kursTarget && onOpenKursverwaltung ? () => onOpenKursverwaltung!(kursTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.KURSANMELDUNG} recordId={record.record_id} />
    </>
  );
}
