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
