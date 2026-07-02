/* ================================================================
   TireScan-Pro  |  js/demo.js  — Dataset dimostrativo v1.0
   10 clienti fittizi (3 flotte da 5 targhe + 7 clienti singoli)
   con scansioni inventate: utile come strumento di vendita Handy Scan.
   ================================================================ */
'use strict';

const DEMO_CUSTOMERS = [
  {
    "code": "DEMOFLT001",
    "company": "Autotrasporti Bianchi S.r.l.",
    "first": "",
    "last": "",
    "address": "Via Emilia Ovest 210",
    "locality": "Reggio Emilia",
    "prov": "RE",
    "zip": "42123",
    "country": "IT",
    "phone1": "0522 558890",
    "mobile1": "3351234567",
    "email1": "logistica@autotrasportibianchi.it"
  },
  {
    "code": "DEMOFLT002",
    "company": "Cooperativa Taxi Aurora",
    "first": "",
    "last": "",
    "address": "Piazzale Stazione 4",
    "locality": "Milano",
    "prov": "MI",
    "zip": "20125",
    "country": "IT",
    "phone1": "02 66998877",
    "mobile1": "3387654321",
    "email1": "prenotazioni@taxiaurora.it"
  },
  {
    "code": "DEMOFLT003",
    "company": "NoleggioPiù S.r.l.",
    "first": "",
    "last": "",
    "address": "Via Aeroporto 15",
    "locality": "Bologna",
    "prov": "BO",
    "zip": "40132",
    "country": "IT",
    "phone1": "051 7788990",
    "mobile1": "3491122334",
    "email1": "flotta@noleggiopiu.it"
  },
  {
    "code": "DEMOCLI004",
    "company": "",
    "first": "Mario",
    "last": "Esposito",
    "address": "Via Toledo 88",
    "locality": "Napoli",
    "prov": "NA",
    "zip": "80132",
    "country": "IT",
    "phone1": "",
    "mobile1": "3201112233",
    "email1": "mario.esposito@gmail.com"
  },
  {
    "code": "DEMOCLI005",
    "company": "",
    "first": "Giulia",
    "last": "Ferrari",
    "address": "Corso Canalchiaro 30",
    "locality": "Modena",
    "prov": "MO",
    "zip": "41121",
    "country": "IT",
    "phone1": "",
    "mobile1": "3478899001",
    "email1": "giulia.ferrari@libero.it"
  },
  {
    "code": "DEMOCLI006",
    "company": "",
    "first": "Luca",
    "last": "Romano",
    "address": "Via Appia Nuova 500",
    "locality": "Roma",
    "prov": "RM",
    "zip": "00179",
    "country": "IT",
    "phone1": "",
    "mobile1": "3331239876",
    "email1": "luca.romano@outlook.it"
  },
  {
    "code": "DEMOCLI007",
    "company": "",
    "first": "Anna",
    "last": "Conti",
    "address": "Via Po 14",
    "locality": "Torino",
    "prov": "TO",
    "zip": "10124",
    "country": "IT",
    "phone1": "",
    "mobile1": "3385554433",
    "email1": "anna.conti@gmail.com"
  },
  {
    "code": "DEMOCLI008",
    "company": "",
    "first": "Paolo",
    "last": "Greco",
    "address": "Lungarno Vespucci 22",
    "locality": "Firenze",
    "prov": "FI",
    "zip": "50123",
    "country": "IT",
    "phone1": "",
    "mobile1": "3669998877",
    "email1": "paolo.greco@hotmail.it"
  },
  {
    "code": "DEMOCLI009",
    "company": "",
    "first": "Francesca",
    "last": "Marino",
    "address": "Via XX Settembre 7",
    "locality": "Genova",
    "prov": "GE",
    "zip": "16121",
    "country": "IT",
    "phone1": "",
    "mobile1": "3401234567",
    "email1": "f.marino@gmail.com"
  },
  {
    "code": "DEMOCLI010",
    "company": "",
    "first": "Davide",
    "last": "Gallo",
    "address": "Corso Porta Nuova 3",
    "locality": "Verona",
    "prov": "VR",
    "zip": "37122",
    "country": "IT",
    "phone1": "",
    "mobile1": "3475556677",
    "email1": "davide.gallo@gmail.com"
  }
];
const DEMO_SCANS = [
  {
    "targa": "FB210AA",
    "data": "22/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Autotrasporti Bianchi S.r.l.",
    "size": "215/65R16C",
    "mm": [
      4.8,
      4.6,
      5.1,
      5.0
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "FB211AB",
    "data": "22/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Autotrasporti Bianchi S.r.l.",
    "size": "215/65R16C",
    "mm": [
      2.7,
      2.9,
      3.4,
      3.3
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "FB212AC",
    "data": "18/11/2025",
    "op": "HANDY SCAN",
    "cliente": "Autotrasporti Bianchi S.r.l.",
    "size": "215/65R16C",
    "mm": [
      3.6,
      3.5,
      3.8,
      3.7
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "FB213AD",
    "data": "08/06/2026",
    "op": "HANDY SCAN",
    "cliente": "Autotrasporti Bianchi S.r.l.",
    "size": "215/65R16C",
    "mm": [
      1.4,
      1.6,
      2.1,
      2.0
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "FB214AE",
    "data": "07/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Autotrasporti Bianchi S.r.l.",
    "size": "215/65R16C",
    "mm": [
      5.2,
      5.0,
      5.5,
      5.3
    ],
    "dep": true,
    "pos": "Corsia A — 12"
  },
  {
    "targa": "TX001MI",
    "data": "01/06/2026",
    "op": "HANDY SCAN",
    "cliente": "Cooperativa Taxi Aurora",
    "size": "195/65R15",
    "mm": [
      2.2,
      2.0,
      2.6,
      2.4
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "TX002MI",
    "data": "01/06/2026",
    "op": "HANDY SCAN",
    "cliente": "Cooperativa Taxi Aurora",
    "size": "195/65R15",
    "mm": [
      1.5,
      1.3,
      1.9,
      1.8
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "TX003MI",
    "data": "29/10/2025",
    "op": "HANDY SCAN",
    "cliente": "Cooperativa Taxi Aurora",
    "size": "195/65R15",
    "mm": [
      3.1,
      3.0,
      3.5,
      3.4
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "TX004MI",
    "data": "27/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Cooperativa Taxi Aurora",
    "size": "195/65R15",
    "mm": [
      4.0,
      3.9,
      4.3,
      4.2
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "TX005MI",
    "data": "27/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Cooperativa Taxi Aurora",
    "size": "195/65R15",
    "mm": [
      3.7,
      3.6,
      4.0,
      3.8
    ],
    "dep": true,
    "pos": "Box 3"
  },
  {
    "targa": "NP100BO",
    "data": "04/06/2026",
    "op": "HANDY SCAN",
    "cliente": "NoleggioPiù S.r.l.",
    "size": "205/55R16",
    "mm": [
      5.5,
      5.4,
      5.8,
      5.7
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "NP101BO",
    "data": "04/06/2026",
    "op": "HANDY SCAN",
    "cliente": "NoleggioPiù S.r.l.",
    "size": "235/60R18",
    "mm": [
      4.2,
      4.1,
      4.5,
      4.4
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "NP102BO",
    "data": "04/06/2026",
    "op": "HANDY SCAN",
    "cliente": "NoleggioPiù S.r.l.",
    "size": "205/55R16",
    "mm": [
      2.8,
      3.0,
      3.2,
      3.1
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "NP103BO",
    "data": "09/10/2025",
    "op": "HANDY SCAN",
    "cliente": "NoleggioPiù S.r.l.",
    "size": "205/55R16",
    "mm": [
      3.4,
      3.3,
      3.7,
      3.6
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "NP104BO",
    "data": "04/06/2026",
    "op": "HANDY SCAN",
    "cliente": "NoleggioPiù S.r.l.",
    "size": "235/60R18",
    "mm": [
      6.0,
      5.9,
      6.2,
      6.1
    ],
    "dep": true,
    "pos": "Magazzino — R4"
  },
  {
    "targa": "EX555NA",
    "data": "12/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Mario Esposito",
    "size": "205/55R16",
    "mm": [
      4.5,
      4.4,
      4.8,
      4.7
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "GF120MO",
    "data": "19/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Giulia Ferrari",
    "size": "205/55R16",
    "mm": [
      2.5,
      2.4,
      2.9,
      2.8
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "LR900RM",
    "data": "28/11/2025",
    "op": "HANDY SCAN",
    "cliente": "Luca Romano",
    "size": "235/60R18",
    "mm": [
      1.2,
      1.4,
      1.7,
      1.6
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "AC077TO",
    "data": "29/05/2026",
    "op": "HANDY SCAN",
    "cliente": "Anna Conti",
    "size": "205/55R16",
    "mm": [
      2.9,
      2.8,
      3.0,
      2.9
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "PG333FI",
    "data": "11/06/2026",
    "op": "HANDY SCAN",
    "cliente": "Paolo Greco",
    "size": "205/55R16",
    "mm": [
      6.5,
      6.4,
      6.8,
      6.7
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "FM640GE",
    "data": "31/07/2025",
    "op": "HANDY SCAN",
    "cliente": "Francesca Marino",
    "size": "205/55R16",
    "mm": [
      3.9,
      3.8,
      4.2,
      4.1
    ],
    "dep": false,
    "pos": ""
  },
  {
    "targa": "DG210VR",
    "data": "09/06/2025",
    "op": "HANDY SCAN",
    "cliente": "Davide Gallo",
    "size": "235/60R18",
    "mm": [
      4.6,
      4.5,
      4.9,
      4.8
    ],
    "dep": false,
    "pos": ""
  }
];

/* anagrafica → matrice come ExportCustomers (20 colonne) */
function demoCustomerRows() {
  const header = ['customer_code','company_name','first_name','last_name','Indirizzo','locality','Prov.','zip_code','region','zone','Paese','fiscal_code','vat_code','phone_1','phone_2','mobile_1','mobile_2','fax','email_1','email_2'];
  const rows = [header];
  DEMO_CUSTOMERS.forEach(c => rows.push([
    c.code, c.company, c.first, c.last, c.address, c.locality, c.prov, c.zip,
    '', '', c.country, '', '', c.phone1, '', c.mobile1, '', '', c.email1, ''
  ]));
  return rows;
}

function loadDemoData() {
  const has = (window.HS && HS.getRecords().length) || (window.CUST && CUST.getAll && CUST.getAll().length);
  if (has && !confirm("Caricare i dati demo? Sostituiranno i dati attualmente presenti.")) return;

  // pulizia: si parte da zero così la demo è sempre coerente
  if (window.HS && HS.resetAll) HS.resetAll();

  // 1) anagrafica clienti
  if (window.CUST) CUST.importRows(demoCustomerRows());

  // 2) scansioni
  const recs = HS.getRecords();
  DEMO_SCANS.forEach(s => {
    const rec = {
      id: HS.uid(), targa: s.targa.toUpperCase(),
      data: s.data, operatore: s.op || 'HANDY SCAN', cliente: s.cliente,
      ant_sx_tipo: s.size, ant_sx_mm: s.mm[0],
      ant_dx_tipo: s.size, ant_dx_mm: s.mm[1],
      post_sx_tipo: s.size, post_sx_mm: s.mm[2],
      post_dx_tipo: s.size, post_dx_mm: s.mm[3],
      deposito: !!s.dep, posizione: s.pos || '',
    };
    const i = recs.findIndex(r => r.targa === rec.targa);
    if (i >= 0) recs[i] = { ...rec, id: recs[i].id }; else recs.push(rec);
  });
  HS.setRecords(recs);
  if (window.CUST) CUST.load();

  if (window.closeWelcome) closeWelcome();
  if (window.toast) toast('🎬 Dati demo caricati: ' + DEMO_CUSTOMERS.length + ' clienti, ' + DEMO_SCANS.length + ' scansioni', 't-ok');
  if (window.showView) showView('dashboard');
}

window.loadDemoData = loadDemoData;
window.DEMO = { customers: DEMO_CUSTOMERS, scans: DEMO_SCANS, load: loadDemoData };
