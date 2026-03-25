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
│   ├── data.js         ← Storage, import/export CSV, dati campione
│   ├── recall.js       ← Modulo richiami clienti via email
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
| ⬆ **Import CSV** | Riconosce formato portale Cormach e formato nativo |
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

## 📥 Import dati da Handy Scan (portale Cormach)

1. Vai su `portal.cormachsrl.com/tireapp/tires-store`
2. Applica filtri e clicca **Scarica**
3. Apri il `.xls` in Excel → **Salva come CSV UTF-8**
4. In HandyScan → **⬆ Importa** → seleziona il CSV
5. I record vengono uniti automaticamente (merge per targa)

> L'app riconosce automaticamente il formato del portale Cormach.

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
