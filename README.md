# 🔍 HandyScan – Tire Monitor PWA

> App open source per la gestione delle scansioni pneumatici **Handy Scan by Cormach Srl**  
> Progressive Web App – funziona su PC, iPhone, Android, Tablet

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)]()
[![No Dependencies](https://img.shields.io/badge/deps-zero-brightgreen.svg)]()

---

## ✨ Funzionalità

| Feature | Descrizione |
|---------|-------------|
| 📋 **Archivio completo** | Lista veicoli con ricerca, filtri e ordinamento |
| 🔍 **Dettaglio veicolo** | Schema visivo auto, barre spessore, stato semaforo |
| 🔔 **Allarmi automatici** | Notifica veicoli critici (≤1.6mm) e in attenzione (≤3.0mm) |
| 📊 **Statistiche** | Grafici distribuzione stato, trend, deposito, operatori |
| ⬆ **Import CSV** | Importa file esportati dal portale `portal.cormachsrl.com` |
| ⬇ **Export CSV** | Esporta tutti i dati in CSV compatibile con Excel |
| 🖨 **Stampa PDF** | Scheda cliente stampabile (o salva come PDF) |
| 📲 **Installabile** | Installabile su qualsiasi dispositivo come app nativa |
| 🌐 **Offline** | Funziona senza connessione dopo il primo caricamento |

---

## 🚀 Setup in 5 minuti

### Opzione 1 – GitHub Pages (gratis, zero server)

```bash
# 1. Fork/clone questa repo
git clone https://github.com/TUO-UTENTE/handyscan-app.git
cd handyscan-app

# 2. Vai su GitHub → Settings → Pages → Branch: main → / (root)
# 3. L'app sarà disponibile su:
#    https://TUO-UTENTE.github.io/handyscan-app/
```

### Opzione 2 – Locale (qualsiasi browser)

```bash
# Basta aprire index.html con un server locale
npx serve .
# oppure
python3 -m http.server 8080
# Apri http://localhost:8080
```

### Opzione 3 – Deploy su Netlify/Vercel

Trascina la cartella del progetto su [netlify.com/drop](https://netlify.com/drop) — online in 30 secondi.

---

## 📲 Installazione su dispositivo

### iPhone / iPad (Safari)
1. Apri l'URL dell'app in Safari
2. Tocca **Condividi** → **Aggiungi a schermata Home**
3. L'app appare come un'icona nativa

### Android (Chrome)
1. Apri l'URL in Chrome
2. Tocca il banner **"Installa HandyScan"** oppure menu → **Aggiungi a schermata Home**

### PC / Mac (Chrome, Edge)
1. Apri l'URL
2. Clicca l'icona di installazione nella barra degli indirizzi (➕)

---

## 📥 Come importare i dati da Handy Scan

1. Vai su [portal.cormachsrl.com/tireapp/tires-store](http://portal.cormachsrl.com/tireapp/tires-store)
2. Applica i filtri desiderati
3. Clicca **Scarica** (icona download)
4. Salva il file `.xls` e aprilo in Excel/LibreOffice
5. **Salva come CSV** (File → Salva con nome → CSV UTF-8)
6. In HandyScan → **⬆ Importa** → seleziona il file CSV
7. I record vengono aggiornati automaticamente (merge per targa)

> 💡 L'import riconosce automaticamente sia il formato del portale Cormach che il formato di esportazione nativo dell'app.

---

## 🗂 Struttura del Progetto

```
handyscan-app/
├── index.html       # App shell e layout HTML
├── style.css        # Design system completo
├── app.js           # Logica applicativa (Vanilla JS)
├── sw.js            # Service Worker per offline
├── manifest.json    # PWA manifest
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

---

## 🎨 Soglie di usura

| Colore | Soglia | Stato |
|--------|--------|-------|
| 🟢 Verde | > 3.0 mm | OK |
| 🟡 Arancione | 1.6 – 3.0 mm | Attenzione – pianificare sostituzione |
| 🔴 Rosso | ≤ 1.6 mm | **Critico – limite legale** |

---

## 🔧 Personalizzazione

Le soglie sono configurabili in `app.js`:
```js
const WARN_THRESHOLD = 3.0;   // mm – soglia attenzione
const CRIT_THRESHOLD = 1.6;   // mm – limite legale
```

---

## 📄 Licenza

MIT – Libero uso, modifica e distribuzione.  
Creato con ❤️ per i clienti **Handy Scan – Cormach Srl**

---

## 🤝 Contribuire

Pull request benvenute! Apri una issue per segnalare bug o proporre nuove funzioni.
