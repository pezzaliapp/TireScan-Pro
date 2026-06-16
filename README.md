# 🔍 HandyScan – Tire Monitor PWA

> App open source per la gestione delle scansioni pneumatici **Handy Scan by Cormach Srl**
> Progressive Web App — PC, iPhone, Android, Tablet in officina

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-00d4ff.svg)]()
[![No Deps](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()

---

## 📁 Struttura file

```
handyscan-pwa/
├── index.html          ← App shell — tutto il layout HTML
├── sw.js               ← Service Worker (offline)
├── manifest.json       ← PWA manifest (installazione)
├── css/
│   └── style.css       ← Design system completo
├── js/
│   ├── vendor/
│   │   └── xlsx.full.min.js  ← SheetJS (lettura Excel, offline)
│   ├── data.js         ← Storage, import Excel/CSV (report), export
│   ├── customers.js    ← Anagrafica clienti + match contatti per nome
│   ├── appointments.js ← Agenda appuntamenti + export .ics
│   ├── recall.js       ← Richiami: email / telefono / WhatsApp
│   └── app.js          ← Logica principale (viste, grafici, form)
├── icons/
│   └── icon-192.svg    ← Icona app
└── README.md
```

---

## ✨ Funzionalità

| Feature | Descrizione |
|---------|-------------|
| 🏠 **Dashboard** | Statistiche live: totale, OK, attenzione, critici, deposito |
| 📋 **Archivio** | Lista veicoli con ricerca, filtri, ordinamento colonne |
| 🔍 **Dettaglio** | Schema visivo auto con 4 ruote, barre spessore, stato semaforo |
| 🔔 **Allarmi** | Veicoli critici (≤1.6mm) e attenzione (≤3.0mm) separati |
| 📬 **Richiami** | Email clienti: critico, periodico, stagionale, anniversario |
| 📧 **Gestione email** | Import/export CSV email+telefono per ogni cliente |
| 📊 **Statistiche** | 4 grafici: stato, deposito, trend mm, operatori |
| ⬆ **Import Excel/CSV** | Legge `.xlsx` diretti: report scansioni **e** anagrafica clienti |
| 👥 **Anagrafica** | Email, telefono, cellulare, indirizzo collegati per nome alla targa |
| 📅 **Agenda** | Appuntamenti con export `.ics` per il calendario del telefono |
| ⬇ **Export CSV** | Esporta tutti i dati in CSV compatibile Excel |
| 🖨 **Stampa** | Scheda cliente ottimizzata per stampa/PDF |
| 📲 **Installabile** | PWA: si installa su iOS, Android, PC come app nativa |
| 🌐 **Offline** | Funziona senza rete dopo il primo caricamento |

---

## 🚀 Metti online in 3 passi

### GitHub Pages (gratis, consigliato)

```bash
# 1. Fork questa repo su GitHub
# 2. Settings → Pages → Branch: main → / (root) → Save
# 3. Online su: https://TUO-UTENTE.github.io/handyscan-pwa/
```

### Locale (test rapido)

```bash
npx serve .
# oppure
python3 -m http.server 8080
# poi apri http://localhost:8080
```

### Netlify Drop

Trascina la cartella su [netlify.com/drop](https://app.netlify.com/drop) — online in 30 secondi.

---

## 📲 Installazione su dispositivo

| Dispositivo | Istruzioni |
|-------------|------------|
| **iPhone / iPad** | Safari → Condividi → Aggiungi a schermata Home |
| **Android** | Chrome → menu ⋮ → Aggiungi a schermata Home |
| **PC / Mac** | Chrome/Edge → icona ➕ nella barra indirizzi |

---

## 🎬 Modalità demo (strumento di vendita)

Per dimostrare HandyScan abbinato all'Handy Scan senza dati reali:

- **Un clic:** nella schermata di benvenuto premi **🎬 Prova con dati demo** (oppure il pulsante 🎬 nella sezione **👥 Clienti**). Vengono caricati **10 clienti** fittizi — 3 flotte con **5 targhe ciascuna** (autotrasporti, taxi, autonoleggio) e 7 clienti con una targa — e **22 scansioni** con casi critici, attenzione, periodici e un anniversario. Dashboard, allarmi, richiami e contatti si popolano subito.
- **Dimostrando l'import:** la cartella `demo/` contiene `demo_StoreReportByPlate.xlsx` (report) e `demo_ExportCustomers.xlsx` (anagrafica). Importali con **⬆ Importa** per mostrare dal vivo la lettura diretta dell'Excel: ogni targa eredita email e cellulare del cliente.

> Multi-targa: un cliente con più veicoli mostra tutte le targhe come chip colorate per stato; il pulsante **📅 Appunt.** chiede per quale targa fissare l'appuntamento.

## 🎬 Dati demo (strumento di vendita)

Per mostrare l'app a un cliente senza dati reali, clicca **🎬 Prova con dati demo**
(schermata iniziale o sezione **👥 Clienti**). Vengono caricati **10 clienti fittizi**:

- **3 flotte** (autotrasporti, taxi, autonoleggio) con **5 targhe ciascuna**
- **7 clienti privati** con 1 targa

con **22 scansioni inventate** che mostrano subito il valore di Handy Scan: dashboard con
critici/attenzione, **16 richiami già pronti** (con email e cellulare compilati), veicoli in
deposito e clienti multi-targa. Tutto è simulato e resta solo sul dispositivo.

## 👥 Anagrafica e clienti multi-targa

Nella sezione **👥 Clienti** ogni riga mostra contatti (email, telefono, **💬 WhatsApp**) e le
**targhe collegate** come chip colorate per stato (verde/arancio/rosso). Il pulsante
**📅 Appuntamento** apre l'agenda: se il cliente ha più targhe, puoi **scegliere la targa** dal
menu a tendina. Cliccando una singola targa fissi l'appuntamento direttamente per quel veicolo.

## 📥 Import dati (Excel diretto, niente conversioni)

HandyScan ora legge **direttamente i file Excel** (`.xlsx`/`.xls`) oltre ai CSV, sia per i
**report scansioni** sia per l'**anagrafica clienti**. Il pulsante **⬆ Importa** riconosce
automaticamente il tipo di file.

### 1) Report scansioni (per targa)
1. Vai su `portal.cormachsrl.com/tireapp/tires-store`
2. Applica i filtri e clicca **Scarica** (`StoreReportByPlate_….xlsx`)
3. In HandyScan → **⬆ Importa** → seleziona il file `.xlsx`
4. I record vengono uniti automaticamente (merge per targa)

### 2) Anagrafica clienti (contatti)
1. Esporta i clienti dal gestionale (`ExportCustomers_….xlsx`)
2. In HandyScan → vai su **👥 Clienti** → **⬆ Importa anagrafica**
3. Ogni targa eredita **email e cellulare** del cliente tramite match per nome
   (normalizzazione di maiuscole/accenti/forme societarie)

> Sono ancora supportati i CSV (separatore `,` o `;`). Tutto resta salvato solo sul tuo dispositivo.

## 📬 Richiami — email, telefono, WhatsApp
Per ogni richiamo (critico, periodico, stagionale, anniversario) trovi i pulsanti:
**📧 Mail** (testo precompilato), **📞 Chiama** (`tel:`), **💬 WhatsApp** (`wa.me`) e
**📅 Appuntamento**. I contatti arrivano dall'anagrafica e sono sovrascrivibili per singola targa.

## 📅 Agenda appuntamenti
Crea appuntamenti da un richiamo, dal dettaglio veicolo o dall'anagrafica. Ogni appuntamento
può essere **aggiunto al calendario del dispositivo** (iPhone/Android/PC) tramite file **`.ics`**
con promemoria automatico 1 ora prima.

## 📥 Import vecchio metodo (solo CSV legacy)

---

## 📬 Modulo Richiami — Come funziona

Il modulo calcola automaticamente chi richiamare basandosi su 4 criteri:

| Tipo | Quando | Priorità |
|------|--------|----------|
| 🔴 Critico | Spessore < soglia configurata (default 3.0mm) | Urgente |
| 🔁 Periodico | Ultima scan > X mesi fa (default 6 mesi) | Alta/Normale |
| 🍂 Stagionale | Marzo/Aprile o Ottobre/Novembre | Normale |
| 🎂 Anniversario | N anni dalla prima scansione (finestra 30gg) | Bassa |

**Workflow:**
1. Vai su **📬 Richiami** — vedi chi contattare oggi
2. **📧 Apri in Mail** — si apre Outlook/Gmail con testo già pronto
3. **✅ Segna inviato** — sparisce dalla lista per quel mese

**Import email da CSV:**
```
Targa,Email,Telefono,Note
DW902KP,mario@email.it,+39 333 1234567,Cliente VIP
EH126GN,luca@gmail.com,,
```

---

## 🎨 Soglie usura

| 🟢 Verde | > 3.0 mm | OK |
| 🟡 Arancione | 1.6 – 3.0 mm | Attenzione |
| 🔴 Rosso | ≤ 1.6 mm | **Critico – limite legale** |

Soglie configurabili in `js/data.js` (costanti `WARN_MM` e `CRIT_MM`).

---

## 📄 Licenza

MIT — Libero uso, modifica e distribuzione.
Creato per i clienti **Handy Scan – Cormach Srl**, Correggio (RE)
