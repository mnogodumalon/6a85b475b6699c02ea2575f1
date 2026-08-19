import { useEffect, useState, useRef } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig, listPublicRecords, createPublicRecord,
  prepareChallenge, recordRef, PageUnavailableError,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { tx } from '@/i18n';

// Weekday order for display
const WEEKDAY_ORDER = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'] as const;
type WeekdayKey = typeof WEEKDAY_ORDER[number];

const SCHWIERIGKEIT_COLORS: Record<string, string> = {
  anfaenger: 'bg-emerald-100 text-emerald-700',
  mittelstufe: 'bg-amber-100 text-amber-700',
  fortgeschritten: 'bg-rose-100 text-rose-700',
  alle_levels: 'bg-violet-100 text-violet-700',
};

interface Kurs {
  id: string;
  kursname: string;
  beschreibung: string | null;
  wochentag: string | null;
  startzeit: string | null;
  endzeit: string | null;
  kursleitung: string | null;
  schwierigkeitsgrad: string | null;
  raum: string | null;
  max_teilnehmer: number | null;
  aktuelle_belegung: number | null;
}

interface FormData {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  kommentar: string;
}

interface FormErrors {
  vorname?: string;
  nachname?: string;
  email?: string;
}

export default function Kursplan() {
  const SCHWIERIGKEIT_LABELS: Record<string, string> = {
  anfaenger: 'Anfänger',
  mittelstufe: 'Mittelstufe',
  fortgeschritten: 'Fortgeschritten',
  alle_levels: 'Alle Levels',
};

  const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  montag: 'Montag',
  dienstag: 'Dienstag',
  mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag',
  freitag: 'Freitag',
  samstag: 'Samstag',
  sonntag: 'Sonntag',
};

  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [kurse, setKurse] = useState<Kurs[]>([]);
  const [kurseLoading, setKurseLoading] = useState(true);

  const [selectedKurs, setSelectedKurs] = useState<Kurs | null>(null);
  const [form, setForm] = useState<FormData>({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    kommentar: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPublicPagesConfig('kursplan').then(c => {
      setCfg(c);
      setPage(c?.pages['kursplan'] ?? null);
      setLoading(false);
      if (!c?.pages['kursplan']) setUnavailable(true);
    }).catch(err => {
      if (err instanceof PageUnavailableError) setUnavailable(true);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!cfg || !page) return;
    const ep = page.endpoints?.find(e => e.op === 'list' && e.entity === 'kursverwaltung');
    if (!ep) return;
    listPublicRecords(cfg, page, { appId: ep.app_id }).then(result => {
      const records: Kurs[] = Object.values(result).map(r => ({
        id: r.id,
        kursname: (r.fields.kursname as string) ?? '',
        beschreibung: (r.fields.beschreibung as string) ?? null,
        wochentag: (r.fields.wochentag as string) ?? null,
        startzeit: (r.fields.startzeit as string) ?? null,
        endzeit: (r.fields.endzeit as string) ?? null,
        kursleitung: (r.fields.kursleitung as string) ?? null,
        schwierigkeitsgrad: (r.fields.schwierigkeitsgrad as string) ?? null,
        raum: (r.fields.raum as string) ?? null,
        max_teilnehmer: (r.fields.max_teilnehmer as number) ?? null,
        aktuelle_belegung: (r.fields.aktuelle_belegung as number) ?? null,
      }));
      setKurse(records);
    }).finally(() => setKurseLoading(false));
  }, [cfg, page]);

  if (loading) return <PublicShell loading />;
  if (unavailable || !cfg || !page) return <PublicShell unavailable />;

  const grouped = WEEKDAY_ORDER.reduce<Record<string, Kurs[]>>((acc, day) => {
    acc[day] = kurse.filter(k => k.wochentag === day);
    return acc;
  }, {} as Record<string, Kurs[]>);

  const handleSelectKurs = (kurs: Kurs) => {
    if (selectedKurs?.id === kurs.id) {
      setSelectedKurs(null);
      return;
    }
    setSelectedKurs(kurs);
    setForm({ vorname: '', nachname: '', email: '', telefon: '', kommentar: '' });
    setErrors({});
    setSubmitted(false);
    setSubmitError(null);

    const createEp = page.endpoints?.find(e => e.op === 'create');
    if (createEp) {
      prepareChallenge(cfg, page, 'POST', `/apps/${createEp.app_id}/records`);
    }

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.vorname.trim()) newErrors.vorname = tx('Bitte Vorname eingeben');
    if (!form.nachname.trim()) newErrors.nachname = tx('Bitte Nachname eingeben');
    if (!form.email.trim()) {
      newErrors.email = tx('Bitte E-Mail-Adresse eingeben');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = tx('Bitte eine gültige E-Mail-Adresse eingeben');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKurs || !validate()) return;

    const createEp = page.endpoints?.find(e => e.op === 'create');
    const listEp = page.endpoints?.find(e => e.op === 'list' && e.entity === 'kursverwaltung');
    if (!createEp || !listEp) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const kursRef = recordRef(cfg, page, listEp.app_id, selectedKurs.id);
      await createPublicRecord(cfg, page, {
        vorname: form.vorname.trim(),
        nachname: form.nachname.trim(),
        email: form.email.trim(),
        telefon: form.telefon.trim() || undefined,
        kurs: kursRef,
        kommentar: form.kommentar.trim() || undefined,
      });
      setSubmitted(true);
      setSelectedKurs(null);
    } catch {
      setSubmitError(tx('Anmeldung fehlgeschlagen. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const daysWithCourses = WEEKDAY_ORDER.filter(day => grouped[day].length > 0);

  return (
    <PublicShell title={tx('Wöchentlicher Kursplan')} description={tx('Melde dich direkt für deinen Wunschkurs an — kein Login erforderlich.')} fullBleed>
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 text-white py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-3">{tx('Kursplan')}</h1>
          <p className="text-violet-100 text-lg">{tx('Wähle deinen Kurs und melde dich direkt an.')}</p>
        </div>
      </div>

      {/* Courses by weekday */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {kurseLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mr-3" />
            {tx('Kursplan wird geladen …')}
          </div>
        ) : daysWithCourses.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">{tx('Aktuell sind keine Kurse verfügbar.')}</p>
            <p className="mt-2 text-sm">{tx('Bitte schaue später wieder vorbei.')}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {daysWithCourses.map(day => (
              <section key={day}>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  {WEEKDAY_LABELS[day as WeekdayKey]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[day].map(kurs => {
                    const belegung = kurs.aktuelle_belegung ?? 0;
                    const max = kurs.max_teilnehmer ?? 1;
                    const isFull = belegung >= max;
                    const fillPct = Math.min(100, Math.round((belegung / max) * 100));
                    const isSelected = selectedKurs?.id === kurs.id;

                    return (
                      <div
                        key={kurs.id}
                        className={[
                          'rounded-xl border bg-white shadow-sm overflow-hidden transition-all duration-200',
                          isSelected ? 'ring-2 ring-violet-500 border-violet-300' : 'border-gray-200 hover:border-violet-200 hover:shadow-md',
                          isFull ? 'opacity-75' : 'cursor-pointer',
                        ].join(' ')}
                        onClick={() => !isFull && handleSelectKurs(kurs)}
                        role={isFull ? undefined : 'button'}
                        tabIndex={isFull ? undefined : 0}
                        onKeyDown={e => { if (!isFull && (e.key === 'Enter' || e.key === ' ')) handleSelectKurs(kurs); }}
                      >
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-base leading-snug min-w-0">
                              {kurs.kursname}
                            </h3>
                            {kurs.schwierigkeitsgrad && (
                              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${SCHWIERIGKEIT_COLORS[kurs.schwierigkeitsgrad] ?? 'bg-gray-100 text-gray-600'}`}>
                                {SCHWIERIGKEIT_LABELS[kurs.schwierigkeitsgrad] ?? kurs.schwierigkeitsgrad}
                              </span>
                            )}
                          </div>

                          {/* Time & instructor */}
                          <div className="text-sm text-gray-600 space-y-1 mb-3">
                            {kurs.startzeit && kurs.endzeit && (
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                </svg>
                                <span>{kurs.startzeit} – {kurs.endzeit}</span>
                              </div>
                            )}
                            {kurs.kursleitung && (
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                                <span className="truncate">{kurs.kursleitung}</span>
                              </div>
                            )}
                            {kurs.raum && (
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9,22 9,12 15,12 15,22" />
                                </svg>
                                <span className="truncate">{kurs.raum}</span>
                              </div>
                            )}
                          </div>

                          {/* Capacity bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>{tx('Belegung')}</span>
                              <span>{belegung} / {max}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isFull ? 'bg-rose-500' : fillPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          </div>

                          {/* CTA */}
                          {isFull ? (
                            <div className="text-center text-sm font-medium text-rose-600 bg-rose-50 rounded-lg py-2">
                              {tx('Kurs ausgebucht')}
                            </div>
                          ) : (
                            <button
                              className={[
                                'w-full text-sm font-medium py-2 rounded-lg transition-colors',
                                isSelected
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100',
                              ].join(' ')}
                              onClick={e => { e.stopPropagation(); handleSelectKurs(kurs); }}
                            >
                              {isSelected ? tx('Formular schließen') : tx('Jetzt anmelden')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Registration form */}
        {selectedKurs && (
          <div ref={formRef} className="mt-10 scroll-mt-6">
            <div className="max-w-lg mx-auto bg-white rounded-2xl border border-violet-200 shadow-lg overflow-hidden">
              <div className="bg-violet-600 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">{tx('Anmeldung')}: {selectedKurs.kursname}</h2>
                <p className="text-violet-100 text-sm mt-0.5">
                  {selectedKurs.startzeit && selectedKurs.endzeit
                    ? `${WEEKDAY_LABELS[selectedKurs.wochentag as WeekdayKey] ?? ''}, ${selectedKurs.startzeit} – ${selectedKurs.endzeit}`
                    : WEEKDAY_LABELS[selectedKurs.wochentag as WeekdayKey] ?? ''}
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{tx('Vorname')} *</label>
                    <input
                      type="text"
                      value={form.vorname}
                      onChange={e => setForm(f => ({ ...f, vorname: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${errors.vorname ? 'border-rose-400 bg-rose-50' : 'border-gray-300'}`}
                      placeholder={tx('Maria')}
                    />
                    {errors.vorname && <p className="mt-1 text-xs text-rose-600">{errors.vorname}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{tx('Nachname')} *</label>
                    <input
                      type="text"
                      value={form.nachname}
                      onChange={e => setForm(f => ({ ...f, nachname: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${errors.nachname ? 'border-rose-400 bg-rose-50' : 'border-gray-300'}`}
                      placeholder={tx('Mustermann')}
                    />
                    {errors.nachname && <p className="mt-1 text-xs text-rose-600">{errors.nachname}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tx('E-Mail-Adresse')} *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${errors.email ? 'border-rose-400 bg-rose-50' : 'border-gray-300'}`}
                    placeholder={tx('maria@example.de')}
                  />
                  {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tx('Telefonnummer')} <span className="text-gray-400 font-normal">{tx('(optional)')}</span></label>
                  <input
                    type="tel"
                    value={form.telefon}
                    onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="+49 123 456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tx('Kommentar')} <span className="text-gray-400 font-normal">{tx('(optional)')}</span></label>
                  <textarea
                    value={form.kommentar}
                    onChange={e => setForm(f => ({ ...f, kommentar: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                    placeholder={tx('Fragen oder Hinweise …')}
                  />
                </div>

                {submitError && (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    {submitError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedKurs(null)}
                    className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {tx('Abbrechen')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? tx('Wird angemeldet …') : tx('Jetzt anmelden')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success message */}
        {submitted && (
          <div className="mt-10 max-w-lg mx-auto bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-emerald-800 mb-1">{tx('Anmeldung erfolgreich!')}</h3>
            <p className="text-sm text-emerald-700">{tx('Wir haben deine Anmeldung erhalten und melden uns bei dir.')}</p>
            <button
              className="mt-4 text-sm font-medium text-emerald-700 underline underline-offset-2"
              onClick={() => setSubmitted(false)}
            >
              {tx('Weiteren Kurs buchen')}
            </button>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
