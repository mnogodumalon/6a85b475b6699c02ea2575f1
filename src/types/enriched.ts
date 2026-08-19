import type { Kursanmeldung } from './app';

export type EnrichedKursanmeldung = Kursanmeldung & {
  kursName: string;
};
