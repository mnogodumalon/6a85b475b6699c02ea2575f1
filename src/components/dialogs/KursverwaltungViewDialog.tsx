import type { Kursverwaltung } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel } from '@/i18n';

interface KursverwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Kursverwaltung | null;
  onEdit: (record: Kursverwaltung) => void;
}

export function KursverwaltungViewDialog({ open, onClose, record, onEdit }: KursverwaltungViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('kursverwaltung') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'kursname')}</Label>
            <p className="text-sm">{record.fields.kursname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'beschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'wochentag')}</Label>
            <Badge variant="secondary">{lookupLabel('kursverwaltung', 'wochentag', record.fields.wochentag?.key) ?? record.fields.wochentag?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'startzeit')}</Label>
            <p className="text-sm">{record.fields.startzeit ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'endzeit')}</Label>
            <p className="text-sm">{record.fields.endzeit ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'kursleitung')}</Label>
            <p className="text-sm">{record.fields.kursleitung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'schwierigkeitsgrad')}</Label>
            <Badge variant="secondary">{lookupLabel('kursverwaltung', 'schwierigkeitsgrad', record.fields.schwierigkeitsgrad?.key) ?? record.fields.schwierigkeitsgrad?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'raum')}</Label>
            <p className="text-sm">{record.fields.raum ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'max_teilnehmer')}</Label>
            <p className="text-sm">{record.fields.max_teilnehmer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('kursverwaltung', 'aktuelle_belegung')}</Label>
            <p className="text-sm">{record.fields.aktuelle_belegung ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.KURSVERWALTUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}