# VAR Notulen

Opname- en transcriptietool voor de Verpleegkundig Advies Raad (VAR) van het Bravis
ziekenhuis. Neem een vergadering op via de microfoon (fysiek of tijdens een Teams-gesprek),
en de app transcribeert de audio automatisch in fragmenten via de OpenAI Whisper API.
Transcripten zijn te bekijken, bewerken en exporteren als Word- of tekstbestand.

## Hoe het werkt

- Audio wordt in de browser opgenomen en elke ~2 minuten als fragment naar de server
  gestuurd.
- De server stuurt elk fragment door naar de OpenAI Whisper API (`whisper-1`,
  taal: Nederlands) en slaat alleen de resulterende tekst op — niet de audio zelf.
- Transcripten staan als JSON-bestanden in `server/data/meetings/` en zijn te bewerken,
  te exporteren (.docx / .txt) en te verwijderen via de webinterface.
- Toegang is beveiligd met één gedeeld wachtwoord (in te stellen via `.env`).

## Vereisten

- Node.js 18 of hoger
- Een OpenAI API key met toegang tot de Whisper/audio-transcriptie-endpoint

## Installatie (lokaal draaien)

```bash
cd var-notulen/server
npm install
cp .env.example .env
# vul OPENAI_API_KEY, VAR_APP_PASSWORD en SESSION_SECRET in .env in
npm start
```

Open daarna `http://localhost:3000` in de browser.

## Hosten (productie)

Deze app heeft — in tegenstelling tot de statische AmaanCover-pagina's in de rest van
deze repository — een **Node.js-server** nodig (vanwege de OpenAI API key die geheim
moet blijven en de bestandsopslag van transcripten). Geschikte opties:

- Een klein VPS of interne Bravis-server met Node.js
- Render, Railway, Fly.io of vergelijkbare Node-hosting

Zet bij het hosten altijd de environment variabelen (`OPENAI_API_KEY`,
`VAR_APP_PASSWORD`, `SESSION_SECRET`) in de hostingomgeving zelf, nooit in de code of
in git. Zorg voor HTTPS in productie (anders werkt de sessie-cookie niet veilig en
kan de microfoontoegang door de browser geblokkeerd worden).

**Back-ups**: `server/data/meetings/` bevat alle notulen. Neem dit mee in je back-upstrategie
als je de transcripten wilt bewaren.

## Privacy — belangrijk voor gebruik binnen Bravis

Deze tool stuurt audiofragmenten naar de OpenAI API (servers van OpenAI, buiten de EU)
om ze te laten transcriberen. OpenAI bewaart API-data volgens hun eigen (beperkte)
retentiebeleid en gebruikt het standaard niet om modellen te trainen, maar de audio
verlaat wél het ziekenhuisnetwerk.

Omdat VAR-vergaderingen mogelijk herleidbare of gevoelige informatie kunnen bevatten
(patiëntgerelateerde casuïstiek, personeelszaken, organisatiebrede besluitvorming),
wordt aangeraden om **vóór gebruik** af te stemmen met de privacy officer / FG en de
IT-afdeling van Bravis of dit past binnen het AVG- en informatiebeveiligingsbeleid
(bijv. NEN 7510). Bespreek in ieder geval:

- of gevoelige patiëntinformatie tijdens VAR-vergaderingen vermeden kan worden,
- of een verwerkersovereenkomst met OpenAI nodig/aanwezig is,
- en hoe lang transcripten bewaard mogen blijven (verwijder vergaderingen die niet
  meer nodig zijn via de "Verwijderen"-knop).

## Functionaliteit v1

- Login met gedeeld wachtwoord
- Vergadering starten, opnemen (microfoon), automatisch per fragment transcriberen
- Transcript live meelezen tijdens de opname
- Transcript achteraf bewerken en opslaan
- Exporteren als .docx (Word) of .txt
- Vergadering verwijderen

## Mogelijke vervolgstappen (niet in v1)

- Systeemaudio apart opnemen naast microfoon (voor scherpere Teams-audio)
- Automatische sprekersherkenning
- Directe Teams-integratie (bot/Graph API) zodat opnemen niet handmatig hoeft
- Automatisch samenvatten van actiepunten uit het transcript
