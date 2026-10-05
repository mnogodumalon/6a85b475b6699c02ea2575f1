/**
 * Für einen Kurs anmelden — 3-Schritt-Wizard.
 * Steps: 1) Kurs mit freien Plätzen wählen → 2) Kontaktdaten erfassen → 3) Prüfen & anmelden.
 * Reads: kursverwaltung. Writes: kursanmeldung (via useSignUpForClassFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, BudgetTracker, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldLookup } from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { useSignUpForClassFlow } from '@/lib/journey/flows/SignUpForClass';
import { tx } from '@/i18n';

function isFull(r: JourneyRecord | undefined): boolean {
  if (!r) return false;
  const max = fieldNumber(r, 'max_teilnehmer');
  const used = fieldNumber(r, 'aktuelle_belegung') ?? 0;
  return max != null && used >= max;
}

export default function SignUpForClassPage() {
  const [step, setStep] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const flow = useSignUpForClassFlow({
    steps: { kurs: 1, vorname: 2, nachname: 2, email: 2, telefon: 2, kommentar: 2 },
    items: {
      kurs: r => {
        const full = isFull(r);
        const day = fieldLookup(r, 'wochentag')?.label ?? '';
        const time = `${fieldText(r, 'startzeit')}–${fieldText(r, 'endzeit')}`;
        const used = fieldNumber(r, 'aktuelle_belegung') ?? 0;
        const max = fieldNumber(r, 'max_teilnehmer') ?? 0;
        return {
          id: r.id,
          title: fieldText(r, 'kursname'),
          subtitle: `${day} ${time} · ${fieldText(r, 'kursleitung')}`.trim(),
          status: full
            ? { key: 'voll', label: tx('Ausgebucht') }
            : { key: 'frei', label: tx`${Math.max(max - used, 0)} frei` },
        };
      },
    },
  });

  const form = flow.forms.kursanmeldung;
  const kursId = (form.get('kurs') as string | undefined) || undefined;
  const kurs = kursId ? flow.picks.kurs.recordOf(kursId) : undefined;
  const pick = flow.pick('kurs');

  const checkClass = (): boolean | string => {
    if (!kursId) return tx('Bitte zuerst einen Kurs wählen.');
    if (isFull(kurs)) return tx('Dieser Kurs ist ausgebucht. Bitte einen anderen Kurs wählen.');
    return true;
  };

  return (
    <IntentWizardShell
      title={tx('Für einen Kurs anmelden')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Person für einen Kurs mit freien Plätzen anmelden.'),
        needs: [tx('Name und E-Mail-Adresse'), tx('Wunschkurs')],
      }}
    >
      <WizardStep label={tx('Kurs')} description={tx('Wähle einen Kurs, in dem noch Plätze frei sind.')}>
        <div className="space-y-3">
          {notice && <p className="text-sm text-destructive" role="alert">{notice}</p>}
          <EntitySelectStep
            {...flow.picks.kurs.select}
            {...pick}
            avatar="none"
            searchPlaceholder={tx('Kursname suchen …')}
            create={false}
            emptyText={tx('Es gibt keine Kurse.')}
            onSelect={id => {
              if (isFull(flow.picks.kurs.recordOf(id))) {
                setNotice(tx('Dieser Kurs ist ausgebucht. Bitte einen anderen Kurs wählen.'));
                return;
              }
              setNotice(null);
              pick.onSelect(id);
            }}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Kontakt')} description={tx('Wer wird angemeldet? Vor- und Nachname sowie E-Mail sind Pflicht.')}>
        <div className="space-y-4">
          {kurs && (
            <BudgetTracker
              format="count"
              unit={tx('Plätze')}
              label={fieldText(kurs, 'kursname')}
              budget={fieldNumber(kurs, 'max_teilnehmer') ?? 0}
              booked={fieldNumber(kurs, 'aktuelle_belegung') ?? 0}
            />
          )}
          <Bound form={form} name="vorname" />
          <Bound form={form} name="nachname" />
          <Bound form={form} name="email" />
          <Bound form={form} name="telefon" />
          <Bound form={form} name="kommentar" rows={3} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => {
              const c = checkClass();
              if (c !== true) return c;
              return flow.validateStep(2);
            }}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Anmeldung wird für den gewählten Kurs gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Weitere Person anmelden'), href: '#/intents/sign-up-for-class' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
