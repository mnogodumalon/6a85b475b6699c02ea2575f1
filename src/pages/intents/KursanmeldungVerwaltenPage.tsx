/**
 * Kursanmeldung Verwalten — 2-Schritt-Wizard.
 * Steps: 1) Kurs wählen (nur nicht ausgebuchte Kurse) → 2) Teilnehmerdaten eingeben & Anmeldung anlegen.
 * Reads: kursverwaltung. Writes: kursanmeldung (createKursanmeldungEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDashboardData } from '@/hooks/useDashboardData';
import { APP_IDS } from '@/types/app';
import type { Kursverwaltung } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { tx } from '@/i18n';
import { IconUsers, IconCheck } from '@tabler/icons-react';

export default function KursanmeldungVerwaltenPage() {
  const data = useDashboardData();
  const { kursverwaltung, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedKurs, setSelectedKurs] = useState<Kursverwaltung | null>(null);

  // Step 2 form state
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [kommentar, setKommentar] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleKursSelect = (id: string) => {
    const kurs = kursverwaltung.find(k => k.record_id === id);
    if (!kurs) return;
    setSelectedKurs(kurs);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedKurs || !vorname || !nachname || !email) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createKursanmeldungEntry({
        vorname,
        nachname,
        email,
        telefon: telefon || undefined,
        kommentar: kommentar || undefined,
        kurs: createRecordUrl(APP_IDS.KURSVERWALTUNG, selectedKurs.record_id),
      });
      setDone(true);
    } catch {
      setSubmitError(tx('Anmeldung konnte nicht gespeichert werden. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedKurs(null);
    setVorname('');
    setNachname('');
    setEmail('');
    setTelefon('');
    setKommentar('');
    setSubmitError(null);
    setDone(false);
    setStep(1);
  };

  const kursItems = kursverwaltung.map(k => {
    const belegung = k.fields.aktuelle_belegung ?? 0;
    const max = k.fields.max_teilnehmer ?? 0;
    const ausgebucht = max > 0 && belegung >= max;
    return {
      id: k.record_id,
      title: k.fields.kursname ?? tx('Unbekannter Kurs'),
      subtitle: [
        k.fields.wochentag?.label,
        k.fields.startzeit && k.fields.endzeit
          ? `${k.fields.startzeit} – ${k.fields.endzeit}`
          : k.fields.startzeit,
        k.fields.kursleitung,
      ]
        .filter(Boolean)
        .join(' · '),
      status: ausgebucht
        ? { key: 'ausgebucht', label: tx('Ausgebucht') }
        : k.fields.schwierigkeitsgrad
        ? { key: k.fields.schwierigkeitsgrad.key, label: k.fields.schwierigkeitsgrad.label }
        : undefined,
      stats: [
        { label: tx('Belegt'), value: `${belegung}${max > 0 ? ` / ${max}` : ''}` },
      ],
      icon: <IconUsers size={20} className="text-primary" />,
      disabled: ausgebucht,
    };
  });

  return (
    <IntentWizardShell
      title={tx('Kursanmeldung erfassen')}
      subtitle={tx('Wähle einen Kurs und trage die Teilnehmerdaten ein.')}
      steps={[{ label: tx('Kurs wählen') }, { label: tx('Teilnehmerdaten') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Kurs wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={kursItems}
          onSelect={handleKursSelect}
          searchPlaceholder={tx('Kurs suchen …')}
          emptyText={tx('Keine verfügbaren Kurse gefunden.')}
          emptyIcon={<IconUsers size={48} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Teilnehmerdaten eingeben */}
      {step === 2 && (
        selectedKurs ? (
          done ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <IconCheck size={40} className="text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {tx('Anmeldung erfolgreich!')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tx('Die Anmeldung für')} <strong>{selectedKurs.fields.kursname}</strong>{' '}
                  {tx('wurde gespeichert.')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={handleReset}>{tx('Neue Anmeldung erfassen')}</Button>
                <a href="#/">
                  <Button variant="outline">{tx('Zurück zum Dashboard')}</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-lg mx-auto">
              {/* Kurs-Zusammenfassung */}
              <div className="rounded-2xl border bg-secondary/50 p-4 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {tx('Ausgewählter Kurs')}
                </p>
                <p className="font-semibold text-foreground">
                  {selectedKurs.fields.kursname}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[
                    selectedKurs.fields.wochentag?.label,
                    selectedKurs.fields.startzeit && selectedKurs.fields.endzeit
                      ? `${selectedKurs.fields.startzeit} – ${selectedKurs.fields.endzeit}`
                      : selectedKurs.fields.startzeit,
                    selectedKurs.fields.kursleitung,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              {/* Formular */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="vorname">{tx('Vorname')} *</Label>
                    <Input
                      id="vorname"
                      value={vorname}
                      onChange={e => setVorname(e.target.value)}
                      placeholder={tx('Vorname')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nachname">{tx('Nachname')} *</Label>
                    <Input
                      id="nachname"
                      value={nachname}
                      onChange={e => setNachname(e.target.value)}
                      placeholder={tx('Nachname')}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">{tx('E-Mail-Adresse')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={tx('beispiel@email.de')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telefon">{tx('Telefonnummer')}</Label>
                  <Input
                    id="telefon"
                    type="tel"
                    value={telefon}
                    onChange={e => setTelefon(e.target.value)}
                    placeholder={tx('Optional')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="kommentar">{tx('Kommentar')}</Label>
                  <Textarea
                    id="kommentar"
                    value={kommentar}
                    onChange={e => setKommentar(e.target.value)}
                    placeholder={tx('Hinweise, Fragen oder besondere Wünsche …')}
                    rows={3}
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!vorname || !nachname || !email || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? tx('Wird gespeichert …') : tx('Anmeldung abschicken')}
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  {tx('Zurück')}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
