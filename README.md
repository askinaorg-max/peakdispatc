# PeakDispatch (updated)

## Што е додадено
- Професионализирани UI елементи за **Top Daily** + модал за коментари.
- **Коментари**: јавните коментари се зачувуваат како `pending` и се објавуваат по **рачно одобрување** од админ.
- **Drivers / Top Daily**: админ може да додава шофери и да избира кој се прикажува во Top Daily (Van/Reefer/Flatbed).
- **Live Video Call**: `/call` (јавна страна) и прием на повик во `/admin#calls` со “ringing” во прелистувачот.
- **Push notifications (опционално)**: копче “Enable push notifications” во админ за известувања (зависи од поддршка на прелистувач/OS; на iPhone најчесто бара “Add to Home Screen”).

> Забелешка: Барањето за автоматско додавање “измислени” позитивни коментари **не е имплементирано**, бидејќи тоа би било измамничко/манипулативно. Наместо тоа, системот поддржува реални коментари + модерација.

## Стартување локално
1) Инсталирај Node.js (LTS).
2) Во folder-от:
```bash
npm install
npm start
```
3) Отвори:
- Public: http://localhost:3000
- Admin:  http://localhost:3000/admin

## Админ логирање
Стандардно:
- Email: `admin@peakdispatch.com`
- Password: `Admin@123`

(препорачано) постави преку env:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

## Email / Phone lead (опционално)
За `/api/phone` да праќа email преку Gmail SMTP, постави:
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `PHONE_LEAD_TO`

За join form Resend:
- `RESEND_API_KEY`
- `MAIL_FROM`
- `MAIL_TO` (може повеќе со запирка)

## Датотеки со податоци
Се во `data/`:
- `drivers.json`
- `topdaily.json`
- `comments.json`
- `push-subs.json`
