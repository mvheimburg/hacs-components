# Verifikasjon av første Roborock-versjon

Kontrollert 17. november 2026.

**Publisert etter eiers godkjenning:** Begge komponentene er nå utgitt som
v0.1.1. GitHub-beskrivelser og topics er satt, og CI/Release er grønne i begge
repoene. Tidligere notater nedenfor om manglende publisering beskriver tilstanden
før denne godkjenningen. Ingen utrulling til eierens HA eller robot er utført.

- [Roborock Companion v0.1.1](https://github.com/mvheimburg/roborock-companion/releases/tag/v0.1.1)
- [Lovelace Roborock v0.1.1](https://github.com/mvheimburg/lovelace-roborock/releases/tag/v0.1.1)

Lovelace-utgivelsens JavaScript er byteidentisk med det lokale bygget. Alle
filene i integrasjonens publiserte ZIP er sammenlignet med lokal kildekode;
manifestet oppgir 0.1.1. Komponentenes tagger peker på publiserte main-commits.
 Dette er en første implementasjon med eksplisitte
begrensninger, ikke full LocalRock-paritet eller en attest på robotens firmware.

| Kontroll | Resultat |
| --- | --- |
| Integrasjonens HA-tester | 44 bestått med HA 2026.10.4, python-roborock 7.12.0 og testharness 0.13.375. |
| Eiers HA-versjon | Alle 13 moduler importerer på HA 2026.11.1; hassfest melder `Invalid integrations: 0`. Fullt fixture-testsett på denne versjonen avventer kompatibel testharness. |
| Lovelace | 14 nettlesertester bestått; lint, TypeScript, formatering og produksjonsbygg bestått. |
| Konfigurasjonspanel | 9 nettlesertester bestått, inkludert bevart utkast ved feil og gjenåpnede kontroller etter vellykket lagring; øvrige byggkontroller bestått. |
| Visuell kontroll | Generiske mobil-/PC-eksempler, ingen JavaScript-sidefeil; mobilbredde 390 px. Lys/mørk og forstørret visning kontrollert. |
| UI-kontroller | Begge strenge premium-auditer har 0 funn; DESIGN.md har 0 feil og 6 tokenadvarsler per pakke. |
| Docker | Compose-fragmentet validerer; ingen container startet på eierens maskin. |
| HACS-registrering | Paraplyens listekontroll består med 24 komponenter. GitHub-metadata-kommandoer ligger i begge README-er. |

Testharnessen bruker HA 2026.10.4 fordi dens loggerhjelpere ikke er kompatible
med 2026.11.x. Dette er dokumentert, og testhjelperne er ikke endret for å skjule
problemet. Importkontroll og hassfest på 2026.11.1 erstatter ikke kjøretidstesting.

Ingen fysiske robotkommandoer, nettverksmålinger, utrulling, push eller publisering
er utført. Funksjonstabellen i [integrasjonens README](../roborock-companion/README.md)
angir hvilke operasjoner som støttes eller er sperret. Følg
[installasjons- og trafikkoppskriften](roborock-local-setup.nb.md) for å kontrollere
sertifikater, innlogging, kartoppdatering og drift med sperret robot-WAN.

Sluttgjennomgangen fant tap av restriksjoner ved dupliserte blokker og feil ved
kart-/robotbytte. Rettelsene er dekket av nye regresjonstester, blant annet med
den faktiske installerte kartparseren. Avanserte kartskrivinger er nå sperret uten
et eksakt verifisert modell-/firmwareprofil; ingen slike profiler leveres ennå.

To mindre funn gjenstår: lagret tilbakemelding kan beholde forrige språk etter
språkbytte, og testene dekker ikke alle kombinasjoner av løpende handlinger.
De grønne testene er ikke en påstand om full dekning eller maskinvarekompatibilitet.

## Beslutninger og avgrensninger

- Work in the clean existing checkout on a new feature branch, with new component checkouts — preserves populated umbrella submodule state and avoids recloning unrelated components; cost if wrong is branch/worktree reorganization only.
- The latest published HA custom-component test harness (0.13.375) pins HA 2026.10.4 and fails at import on 2026.11.1 (_clear_logger_overwrites removed). Run real HA flow/runtime tests on the matching 2026.10.4 harness, keep 2026.11.1 source/API compatibility and hassfest as separate checks, and disclose the distinction. Cost if wrong: additional runtime verification on 2026.11.1 before installation. No test-helper monkey-patches will hide incompatibilities.
- Official map parser 0.1.5 omits some restriction blocks and their flags. To provide useful map editing without unsafe replacement, add a bounded structural header audit of cached map bytes, retaining the existing official parser for images, calibration and geometry. This narrows the original opaque-blob rule only for loss-prevention evidence; unknown/restricted blocks still disable destructive replacement. Cost if wrong: map editing is overly restricted, or a parser/header assumption requires adaptation; malformed/unknown inputs must fail closed.
- The upstream server lists native schedules as incomplete. Link the configuration panel to HA's authoritative automation editor for local scheduling, and keep robot timer reads explicit; do not add a second scheduler or promise unsupported native timer CRUD. Cost if wrong: native-timer editing needs a later model/server-specific extension. This limitation is documented in setup and feature tables.
- Keep model-specific carpets, thresholds, manual drive, SmartPlan, per-room order and map deletion/rename unavailable rather than sending unverified RPCs. This is a capability-bounded initial implementation, not completed full LocalRock parity; without a live Saros/HA connection, protocol acceptance and safe readback cannot be established. Cost if wrong: useful features stay disabled until model diagnostics and safe hardware validation enable them.
- Feature bits do not prove RPC envelopes. Require exact model, firmware and operation profiles; ship no verified physical map-writing profiles until real evidence is supplied — prevents unsupported Saros map mutations — cost: room split/merge, floor materials, restriction replacement, backup/restore and mapping remain unavailable in this initial version.
- Retain index 0 for the future bulk-replacement profile despite current upstream also reporting a single map at index 1 — our exact index/payload combination has not been validated — cost: a single map numbered 1 stays unavailable until that profile is verified.
- Actual Saros acceptance, persistence and physical outcomes remain unverified; fixtures cannot establish them — no robot access was supplied — cost: live acceptance testing remains before relying on advanced functions.
- WAN isolation, routing, renewal and restart behavior remain deployment checks — no owner-network measurements exist — cost: no claim of measured offline operation or destination country.
- Full live HA 2026.11.1 behavior remains a separate check from 10.4 fixture tests and 11.1 imports/hassfest — cost: a target runtime issue may still need correction.
- Native timer CRUD remains deferred under the earlier server-limitation ruling — HA automation editor is the scheduling surface — cost: native robot timers need later implementation.
- Carpet/threshold editing remains unavailable under the earlier preservation ruling — cost: those geometry settings need later protocol evidence.
- SmartPlan/per-room ordering remains unavailable under the earlier capability ruling — cost: those cleaning modes need later model validation.
- Manual drive remains unavailable under the earlier bounded-motion ruling — cost: no manual steering in this version.
- Robot map deletion/rename remains unavailable; companion room names are local display aliases — cost: robot map administration needs another verified tool.
- Camera/video, firmware, Wi-Fi provisioning and cloud-account management remain outside this component's approved design — cost: separate upstream tools are needed for those tasks.
- Published HACS installation, remote metadata and releases remain unexecuted; local branches are retained — publishing was not authorized and gh is unauthenticated — cost: the repositories are not installable through a published HACS release yet; ready metadata commands are in both READMEs.
- Generated bundles/lockfiles were checked through package builds rather than line-by-line independent review — cost: the independent review does not cover every generated line/dependency.
- Final generic screenshots and validation/setup documentation were inspected by the implementer after review freeze — no second review is dispatched — cost: presentation/documentation changes have only author verification.

Lokale rettelsescommits: companion `41a2283`, Lovelace `81dc655`. Komponentene
er ennå ikke publisert eller deployert. Det opprinnelige målet om full
LocalRock-konfigurasjon på Saros er fortsatt ufullført; dette er en begrenset
førsteversjon som kan gjennomgås og installeres manuelt.

## Separat broker i v0.1.1

Eierens valgte Docker-oppsett har nå to tjenester: standardserver v1.2.1 og
`roborock-mqtt` med offisiell Mosquitto 2.1.2-alpine. Serveren bruker ekstern
broker-modus; Mosquitto har eget persistent volum og internt nettverk uten
publisert verts-/LAN-port. Robot og HA bruker fortsatt serverens TLS-port 8881.

Kontrollert: Compose-skjema, nettverk, porter, broker-healthcheck, avhengighet og
identiske selvstendige pakkekopier. Upstreams uendrede v1.2.1-konfigurasjonsleser
aksepterte oppsettet. En lokal Mosquitto 2.0.18-prosess bestod QoS 1-healthcheck,
publisering/abonnement og bevart retained-melding etter omstart. Dette er ikke en
kjøring av det valgte Docker-imaget 2.1.2; ingen Docker-daemon eller eiernett var
tilgjengelig for den testen.

Alle 44 backend-, 14 kort- og 9 paneltester, lint, typekontroll, formatering,
bygg og lokal HA 2026.11.1-hassfest bestod. CI og Release på GitHub er grønne i
begge repoene for v0.1.1. Publiserte ZIP-/JS-filer er kontrollert mot lokal
kildekode/bygg. Ingen endring er deployert på eierens server.
