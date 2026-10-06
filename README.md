# subs. — prywatny menedżer subskrypcji

Mobile-first aplikacja webowa (Next.js 16 + Postgres) do śledzenia własnych subskrypcji. Logowanie przez Google — każde konto widzi wyłącznie swoje dane.

## Funkcje

- Subskrypcje: kwota, waluta, cykl (co N dni/tyg./mies./lat), od kiedy / do kiedy, okres próbny, karta, kategoria, podział kosztu (plan rodzinny), link do anulowania, notatki.
- Następna płatność liczona automatycznie z daty startu (lub pierwszej płatności / końca okresu próbnego). Obsługa końców miesiąca (31 → 28/30) i lat przestępnych.
- Pulpit: średni koszt miesięczny i roczny, faktyczne obciążenie w bieżącym miesiącu (ile już zeszło, ile zostało), najbliższe 30 dni, podział na kategorie i karty.
- Alerty: koniec okresu próbnego, karta wygasająca przed kolejną płatnością, subskrypcje dobiegające końca.
- Waluty obce przeliczane po kursie średnim NBP (cache 12 h).
- Kalendarz `.ics` (Apple/Google) z przypomnieniem przed każdą płatnością — osobny, prywatny adres dla każdego konta.
- Konto: profil z Google, eksport JSON, wylogowanie, usunięcie konta ze wszystkimi danymi.
- PWA (dodaj do ekranu głównego).

## Lokalnie

```bash
cp .env.example .env.local   # uzupełnij
npm install
npm run db:migrate
npm run dev
npm test                     # testy logiki rozliczeń
```

## Deploy na Vercel

1. Importuj repo w Vercelu.
2. Storage → dodaj **Neon Postgres** (Marketplace) — ustawi `DATABASE_URL` i `DATABASE_URL_UNPOOLED`.
3. Logowanie Google: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth consent screen (typ External, opublikuj aplikację, inaczej zalogują się tylko „test users”) → Credentials → Create OAuth client ID → Web application. Authorized redirect URI: `https://<twoja-domena>/api/auth/google/callback` (lokalnie dodatkowo `http://localhost:3000/api/auth/google/callback`).
4. Environment Variables:
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — z kroku 3.
   - `AUTH_SECRET` (`openssl rand -base64 32`).
   - `OWNER_EMAIL` — Twój adres Google. Przy pierwszym logowaniu to konto przejmie dane z czasów jednego użytkownika (subskrypcje, karty, kategorie, urządzenia push, ustawienia przypomnień; dotychczasowy `ICS_TOKEN` zostaje jego adresem kalendarza).
   - opcjonalnie `ALLOWED_EMAILS` (lista po przecinku; puste = może się zarejestrować każdy z kontem Google), `APP_URL` (gdy adres callbacku ma być inny niż domena żądania, np. za proxy), `APP_TZ` (domyślnie `Europe/Warsaw`).
   - `APP_PASSWORD` nie jest już używany.
   - Powiadomienia push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`), `VAPID_SUBJECT` (`mailto:twój@email`), `CRON_SECRET` (`openssl rand -hex 24`). Dzienne zadanie przypomnień to Vercel Cron z `vercel.json` (07:00 UTC).
5. Deploy (po dodaniu bazy lub zmiennych: Deployments → ⋯ → Redeploy). Skrypt `vercel-build` sam odpala migracje przed buildem; bez bazy je pomija, a aplikacja pokazuje ekran z brakującymi zmiennymi.

Zmiana schematu: edytuj `src/db/schema.ts` → `npm run db:generate` → commit pliku z `drizzle/`.
