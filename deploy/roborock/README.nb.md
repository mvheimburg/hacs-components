# Roborock i eksisterende Docker-stack

Dette oppsettet passer en lokal støttestack med tjenester som Music Assistant,
mens Home Assistant OS kjører i en egen Proxmox-VM. HA Core 2026.11.1 støtter
manuell serveradresse. Saros 20 Sonic-firmwaren oppgitt av eieren er 02.58.82.

Roborock-serveren blir en egen Compose-tjeneste med innebygd MQTT og egne data.
Ikke koble den til Music Assistant sin konfigurasjon eller en eksisterende MQTT-
broker for første installasjon. Dette er standard upstream-server, ikke en fork.

MQTT har ingen separat tjeneste i Compose fordi **Mosquitto kjører inne i samme
container** som lokalserveren. Docker-imaget installerer Mosquitto, og serveren
starter prosessen når `config.toml` har denne modusen:

```toml
[broker]
mode = "embedded"
host = "127.0.0.1"
port = 18830
```

Dette er felter i den genererte `config.toml`, ikke Compose-miljøvariabler. Behold
resten av konfigurasjonen fra veiviseren. `18830` er en intern brokerport som ikke
skal publiseres. Robot og HA bruker serverens MQTT/TLS-endepunkt på **8881**;
serveren formidler trafikken videre til Mosquitto. Det trengs ingen ekstra
Mosquitto-container og ingen kobling til HA sin vanlige MQTT-broker.

Kilde: [Dockerfile v1.2.1](https://github.com/Python-roborock/local_roborock_server/blob/v1.2.1/Dockerfile),
[oppstart av innebygd broker](https://github.com/Python-roborock/local_roborock_server/blob/v1.2.1/src/roborock_local_server/server.py#L1900)
og [konfigurasjonsstandarder](https://github.com/Python-roborock/local_roborock_server/blob/v1.2.1/src/roborock_local_server/config.py#L226).

1. På Docker-serveren: velg en varig katalog, for eksempel
   `/srv/roborock-local-server`, og installer `uv` etter upstream-veiledningen.
   Klon standardserverens utgitte kildekode til katalogen:

   ```bash
   git clone --branch v1.2.1 --depth 1 https://github.com/Python-roborock/local_roborock_server.git /srv/roborock-local-server
   cd /srv/roborock-local-server
   uv sync
   uv run roborock-local-server configure
   mkdir -p data secrets
   docker build -t local/roborock-local-server:1.2.1 .
   ```

   Bruk et kort `api-...`-navn, region `eu`, porter `555`/`8881`, innebygd MQTT,
   egne lokale admin-/protokollpassord og riktig sertifikatvalg i veiviseren.
   Git-utgaven er låst til v1.2.1; byggingen henter fortsatt sine ordinære
   basisbilder/dependenser. Den lokale imagetagen er ikke en signatur.

2. Ta backup av den eksisterende stackfilen. Kopier **tjenesten** fra
   `compose.fragment.yaml` inn under dens eksisterende `services:`. Ikke legg til
   en ny `services:`-nøkkel nederst hvis filen allerede har en.

3. Sett `ROBOROCK_BIND_ADDRESS` til Docker-serverens LAN-IP og
   `ROBOROCK_SERVER_ROOT` til den absolutte katalogen fra steg 1. I vanlig Compose
   kan de ligge i stackens `.env`; i Portainer setter du dem i stackens
   miljøvariabler. `create_host_path: false` skal hindre at en manglende
   `config.toml` stille blir opprettet som katalog.

4. Kontroller og start bare den nye tjenesten i den eksisterende stacken:

   ```bash
   docker compose config --quiet
   docker compose up -d roborock-local-server
   docker compose ps roborock-local-server
   docker compose logs --tail 100 roborock-local-server
   ```

   Portene må være ledige på valgt IP. Eksemplet binder dem til LAN-adressen,
   ikke alle nettverksgrensesnitt. Ingen host-nettverk, privilegert container,
   Docker-socket eller internettportviderekobling trengs. Compose-eksemplet er
   for vanlig Compose/Portainer standalone, ikke et ferdig Docker Swarm-oppsett.

5. Lokal DNS: `api-...` skal peke på **Docker-serveren**, ikke HA-VM-en og ikke
   Proxmox-verten med mindre Docker faktisk kjører der. Kontroller DNS og begge
   portene fra robotens VLAN og fra HA-VM-en. Åpne `https://DITT_NAVN:555/admin`.
   Healthcheckens `-k` gjelder kun containerens lokale livstegn; HA, robot og
   onboarding skal bruke et gyldig sertifikat og korrekt navn.

6. Følg [hele oppskriften](../../docs/roborock-local-setup.nb.md) fra kontoimport,
   sammenkobling og HA-oppsett. HA-integrasjonen bruker Manual og den lokale
   HTTPS-adressen. Roboten skal kunne nå lokal DNS og serveren, med WAN blokkert.

7. Backup: ta med `config.toml`, `secrets/` og `data/`. Behandle dem som hemmelige
   hjemmedata. Planlegg også sertifikatfornyelse. Ved oppdatering tar du backup og
   bygger en valgt upstream-utgave bevisst; `pull_policy: never` skal forhindre at
   en vanlig stackstart henter en ny serverversjon automatisk.

Ikke blokker hele Docker-vertens Internett for å isolere Roborock; andre tjenester
kan trenge det. Robotens WAN sperres i ruteren. Begrens servercontainerens utgående
trafikk separat etter import, med nødvendige unntak for valgt sertifikatfornyelse.
Dette eksemplet er kildekontrollert og kan valideres med Compose; det er ikke
allerede deployert eller nettverksverifisert på eierens server.

[Upstream Compose](https://github.com/Python-roborock/local_roborock_server/blob/v1.2.1/compose.yaml),
[upstream installasjon](https://github.com/Python-roborock/local_roborock_server/blob/main/docs/installation.md).
