# VAR Notulen

Opname- en transcriptietool voor de Verpleegkundig Advies Raad (VAR) van het Bravis
ziekenhuis. Neem een vergadering op via de microfoon (fysiek of tijdens een Teams-gesprek),
en de app transcribeert de audio automatisch in fragmenten. Transcripten zijn te bekijken,
bewerken en exporteren als Word- of tekstbestand.

## Hoe het werkt

- Audio wordt in de browser opgenomen en elke ~2 minuten als fragment naar de server
  gestuurd.
- De server transcribeert elk fragment en slaat alleen de resulterende tekst op — niet
  de audio zelf. Dit kan op twee manieren (zie "Transcriptie-engines" hieronder).
- Transcripten staan als JSON-bestanden in `server/data/meetings/` en zijn te bewerken,
  te exporteren (.docx / .txt) en te verwijderen via de webinterface.
- Toegang is beveiligd met één gedeeld wachtwoord (in te stellen via `.env`).

## Transcriptie-engines

Instelbaar via `TRANSCRIPTION_ENGINE` in `.env`:

| | `local` (standaard) | `openai` |
|---|---|---|
| Waar draait het | Op je eigen server (whisper.cpp) | Cloud, bij OpenAI |
| Data-verkeer | Audio verlaat de server nooit | Audio gaat naar OpenAI-servers |
| Kosten | Gratis (alleen je eigen serverkosten) | Betaald per minuut audio |
| Snelheid | Trager, CPU-afhankelijk | Snel |
| Setup | Compileert zichzelf + download een model (eenmalig) | Alleen een API key nodig |

Voor VAR-vergaderingen met mogelijk gevoelige inhoud is `local` de veiligste keuze, omdat
er dan helemaal geen data het ziekenhuisnetwerk verlaat.

### Extra vereisten voor de lokale engine

- Een C/C++ build-toolchain: op Linux `sudo apt install build-essential cmake`, op macOS
  Xcode Command Line Tools, op Windows MSYS2/MinGW-w64 (zie de
  [nodejs-whisper documentatie](https://www.npmjs.com/package/nodejs-whisper)).
- `ffmpeg` op het systeem (`sudo apt install ffmpeg` / `brew install ffmpeg`), om de
  opgenomen audio naar het juiste formaat te converteren.
- Genoeg schijfruimte en RAM voor het model: `small` (standaard) is ~500 MB en werkt
  prima op een gewone server-CPU; `medium` is nauwkeuriger maar trager en zwaarder.

Bij de **allereerste** transcriptie compileert de app zichzelf en downloadt het model —
dat kan enkele minuten duren. Draai daarom na installatie eenmalig:

```bash
npm run warmup
```

zodat dit niet halverwege een echte vergadering gebeurt. Bij een nieuwe `npm install`
(bijv. na een herinstallatie) moet whisper.cpp opnieuw compileren, maar het gedownloade
model blijft staan in `server/data/models/` en hoeft niet opnieuw gedownload te worden.

## Vereisten

- Node.js 18 of hoger
- Bij `TRANSCRIPTION_ENGINE=local` (standaard): build-tools + ffmpeg, zie hierboven
- Bij `TRANSCRIPTION_ENGINE=openai`: een OpenAI API key met toegang tot de
  Whisper/audio-transcriptie-endpoint

## Installatie (lokaal draaien)

```bash
cd var-notulen/server
npm install
cp .env.example .env
# vul VAR_APP_PASSWORD en SESSION_SECRET in .env in
# (laat TRANSCRIPTION_ENGINE=local staan, of zet 'm op openai + vul OPENAI_API_KEY in)
npm run warmup   # alleen nodig/nuttig bij TRANSCRIPTION_ENGINE=local
npm start
```

Open daarna `http://localhost:3000` in de browser.

### Windows: zonder command-line

Niet handig met de opdrachtprompt? In `var-notulen/server` staan drie bestanden om te
dubbelklikken in plaats van te typen:

1. **`installeren.bat`** — installeert de app en maakt `.env` aan (opent Kladblok zodat
   je `VAR_APP_PASSWORD` en `SESSION_SECRET` kunt invullen)
2. **`starten.bat`** — start de app (laat dit venster open staan tijdens gebruik)
3. **`tunnel-starten.bat`** — start een Cloudflare Tunnel zodat de app ook buiten je
   eigen wifi bereikbaar is (bijv. vanaf een iPad); vereist dat `cloudflared` al is
   geïnstalleerd, zie "Toegang vanaf een iPad" hieronder

## Toegang vanaf een iPad (of andere telefoon/tablet)

De browser staat microfoontoegang alleen toe via een beveiligde `https://`-verbinding
(behalve op `localhost` zelf). Om de app op je eigen computer te laten draaien én
bereikbaar te maken voor een iPad, is een gratis Cloudflare Tunnel de simpelste route:

1. Installeer `cloudflared` (eenmalig): open een Opdrachtprompt/terminal en typ
   `winget install --id Cloudflare.cloudflared` (Windows), of zoek naar het project
   `cloudflare/cloudflared` op GitHub voor andere platformen.
2. Start de app zoals hierboven beschreven (`npm start` of `starten.bat`).
3. Start in een **tweede** terminalvenster de tunnel: `cloudflared tunnel --url
   http://localhost:3000` (of dubbelklik `tunnel-starten.bat` op Windows).
4. Er verschijnt een adres zoals `https://iets-random.trycloudflare.com` — open dat op
   de iPad in Safari, log in, en tik op het deel-icoon → "Zet op beginscherm" voor een
   app-icoontje.

Let op: dit adres is openbaar bereikbaar voor iedereen die de link kent (al blijft de
app zelf wachtwoord-beveiligd), en verandert elke keer dat je de tunnel herstart. Beide
vensters (app + tunnel) moeten open blijven staan zolang je de app gebruikt. Voor een
stabieler adres en een striktere, alleen-eigen-apparaten-toegang is
[Tailscale](https://tailscale.com) een alternatief, met iets meer opzetwerk.

## Hosten (productie)

Deze app heeft — in tegenstelling tot de statische AmaanCover-pagina's in de rest van
deze repository — een **Node.js-server** nodig (voor de bestandsopslag van transcripten,
sessiebeheer, en bij `local` ook voor de transcriptie zelf). Geschikte opties:

- Een klein VPS of interne Bravis-server met Node.js (bij `local`: liefst een paar CPU-cores)
- Render, Railway, Fly.io of vergelijkbare Node-hosting

Zet bij het hosten altijd de environment variabelen (`VAR_APP_PASSWORD`, `SESSION_SECRET`,
en indien van toepassing `OPENAI_API_KEY`) in de hostingomgeving zelf, nooit in de code of
in git. Zorg voor HTTPS in productie (anders werkt de sessie-cookie niet veilig en
kan de microfoontoegang door de browser geblokkeerd worden).

**Back-ups**: `server/data/meetings/` bevat alle notulen. Neem dit mee in je back-upstrategie
als je de transcripten wilt bewaren. `server/data/models/` bevat alleen het gedownloade
Whisper-model (bij `local`) en hoeft niet in een back-up.

## Privacy — belangrijk voor gebruik binnen Bravis

**Met `TRANSCRIPTION_ENGINE=local` (standaard)** blijft alle audio en tekst op de server
die je zelf beheert — er wordt niets naar een derde partij gestuurd. Dit is de aanbevolen
instelling voor VAR-vergaderingen.

**Met `TRANSCRIPTION_ENGINE=openai`** stuurt de app audiofragmenten naar de OpenAI API
(servers van OpenAI, buiten de EU) om ze te laten transcriberen. OpenAI bewaart API-data
volgens hun eigen (beperkte) retentiebeleid en gebruikt het standaard niet om modellen te
trainen, maar de audio verlaat wél het ziekenhuisnetwerk.

Ongeacht de gekozen engine geldt: omdat VAR-vergaderingen mogelijk herleidbare of
gevoelige informatie kunnen bevatten (patiëntgerelateerde casuïstiek, personeelszaken,
organisatiebrede besluitvorming), wordt aangeraden om **vóór gebruik** af te stemmen met
de privacy officer / FG en de IT-afdeling van Bravis of dit past binnen het AVG- en
informatiebeveiligingsbeleid (bijv. NEN 7510). Bespreek in ieder geval:

- of gevoelige patiëntinformatie tijdens VAR-vergaderingen vermeden kan worden,
- of een verwerkersovereenkomst met OpenAI nodig is (alleen relevant bij `openai`-engine),
- waar de server (en dus de opgeslagen transcripten) fysiek/netwerktechnisch staat,
- en hoe lang transcripten bewaard mogen blijven (verwijder vergaderingen die niet
  meer nodig zijn via de "Verwijderen"-knop).

## Functionaliteit v1

- Login met gedeeld wachtwoord
- Vergadering starten, opnemen (microfoon), automatisch per fragment transcriberen
- Twee transcriptie-engines: lokaal (whisper.cpp, privacyvriendelijk) of OpenAI (cloud)
- Transcript live meelezen tijdens de opname
- Transcript achteraf bewerken en opslaan
- Exporteren als .docx (Word) of .txt
- Vergadering verwijderen
- Microfoon-niveaumeter tijdens opname (zichtbare bevestiging dat er geluid wordt opgepikt)
- Pauzeren/hervatten tijdens een opname
- Statusbanner die laat zien of de lokale transcriptie-engine klaar is, of nog wordt voorbereid
- Zoeken in de vergaderingenlijst, automatisch opslaan van transcriptbewerkingen
- Nette in-app meldingen/bevestigingen in plaats van browser-popups

## Mogelijke vervolgstappen (niet in v1)

- Systeemaudio apart opnemen naast microfoon (voor scherpere Teams-audio)
- Automatische sprekersherkenning
- Directe Teams-integratie (bot/Graph API) zodat opnemen niet handmatig hoeft
- Automatisch samenvatten van actiepunten uit het transcript
