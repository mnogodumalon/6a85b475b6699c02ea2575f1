/**
 * Für Kurs anmelden — 3-Schritt-Wizard.
 * Steps: 1) Kurs mit freien Plätzen wählen → 2) Teilnehmerdaten erfassen (Kurs darf nicht voll sein) → 3) Prüfen & anmelden.
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
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useSignUpForClassFlow } from '@/lib/journey/flows/SignUpForClass';
import { tx } from '@/i18n';

export default function SignUpForClassPage() {
  const [step, setStep] = useState(1);
  const flow = useSignUpForClassFlow({
    steps: { kurs: 1, vorname: 2, nachname: 2, email: 2, telefon: 2, kommentar: 2 },
    items: {
      kurs: r => {
        const max = fieldNumber(r, 'max_teilnehmer') ?? 0;
        const belegt = fieldNumber(r, 'aktuelle_belegung') ?? 0;
        const frei = Math.max(0, max - belegt);
        const day = fieldLookup(r, 'wochentag')?.label ?? '';
        return {
          id: r.id,
          title: fieldText(r, 'kursname'),
          subtitle: `${day} ${fieldText(r, 'startzeit')}–${fieldText(r, 'endzeit')} · ${fieldText(r, 'kursleitung')}`,
          stats: [{ label: tx('Freie Plätze'), value: frei > 0 ? `${frei} / ${max}` : tx('Voll') }],
        };
      },
    },
  });

  const form = flow.forms.kursanmeldung;
  const kursId = form.get('kurs') as string | undefined;
  const kurs = kursId ? flow.picks.kurs.recordOf(kursId) : undefined;
  const max = kurs ? fieldNumber(kurs, 'max_teilnehmer') ?? 0 : 0;
  const belegt = kurs ? fieldNumber(kurs, 'aktuelle_belegung') ?? 0 : 0;
  const isFull = Boolean(kurs) && belegt >= max;

  return (
    <IntentWizardShell
      title={tx('Für Kurs anmelden')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Person für einen Kurs mit freien Plätzen anmelden.'),
        needs: [tx('Vor- und Nachname'), tx('E-Mail-Adresse')],
      }}
    >
      <WizardStep label={tx('Kurs')} description={tx('Welchen Kurs soll die Person besuchen? Volle Kurse sind nicht buchbar.')}>
        <EntitySelectStep
          {...flow.picks.kurs.select}
          {...flow.pick('kurs')}
          create={false}
          avatar="none"
          searchPlaceholder={tx('Kursname oder Kursleitung …')}
        />
      </WizardStep>
      <WizardStep label={tx('Teilnehmer')} description={tx('Kontaktdaten der Person erfassen.')} needs={['kurs']}>
        <div className="space-y-4">
          {kurs && (
            <BudgetTracker
              format="count"
              unit={tx('Plätze')}
              budget={max}
              booked={belegt}
              label={fieldText(kurs, 'kursname')}
            />
          )}
          {isFull && (
            <p className="text-sm text-destructive">{tx('Dieser Kurs ist voll. Es sind keine Plätze mehr frei.')}</p>
          )}
          <Bound form={form} name="vorname" />
          <Bound form={form} name="nachname" />
          <Bound form={form} name="email" />
          <Bound form={form} name="telefon" />
          <Bound form={form} name="kommentar" rows={3} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => {
              if (isFull) return tx('Dieser Kurs ist voll. Es sind keine Plätze mehr frei.');
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
            whatHappensNext={tx('Die Anmeldung wird gespeichert und der Platz im Kurs ist reserviert.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          title={tx('Anmeldung gespeichert')}
          next={[{ label: tx('Zum Dashboard'), href: '#/' }]}
        />
      )}
    </IntentWizardShell>
  );
}
