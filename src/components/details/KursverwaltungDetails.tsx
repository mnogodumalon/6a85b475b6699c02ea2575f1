import type { Kursverwaltung, Kursanmeldung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KursverwaltungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kursverwaltung;
  /** 1:N „Kursanmeldung" (kurs): VOLLE Liste — der Block filtert auf diesen Record. */
  kursanmeldungList: Kursanmeldung[];
  /** Zeilen-Klick → overlay.push auf das Kursanmeldung-Detail (nie der Edit-Dialog). */
  onOpenKursanmeldung: (record: Kursanmeldung) => void;
  /** Kontextuelles „+": öffnet den Kursanmeldung-Dialog mit diesem Record vorgesetzt. */
  onAddKursanmeldung: () => void;
}

export function KursverwaltungDetails({
  record,
  kursanmeldungList,
  onOpenKursanmeldung,
  onAddKursanmeldung,
}: KursverwaltungDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kursverwaltung', 'kursname')} value={record.fields.kursname} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kursverwaltung', 'wochentag')} value={record.fields.wochentag} format="pill" />
        <RecordField label={fieldLabel('kursverwaltung', 'startzeit')} value={record.fields.startzeit} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'endzeit')} value={record.fields.endzeit} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'kursleitung')} value={record.fields.kursleitung} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'schwierigkeitsgrad')} value={record.fields.schwierigkeitsgrad} format="pill" />
        <RecordField label={fieldLabel('kursverwaltung', 'raum')} value={record.fields.raum} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'max_teilnehmer')} value={record.fields.max_teilnehmer} format="text" />
        <RecordField label={fieldLabel('kursverwaltung', 'aktuelle_belegung')} value={record.fields.aktuelle_belegung} format="text" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('kursanmeldung')}
        items={kursanmeldungList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: r.fields.vorname ?? appLabel('kursanmeldung'), meta: undefined })}
        onOpen={onOpenKursanmeldung}
        onAdd={onAddKursanmeldung}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSVERWALTUNG} recordId={record.record_id} />
    </>
  );
}
