# MusaBachelorEKG

## Firebase-Konfiguration
Die Web-App-Schlüssel sind hinterlegt und können sofort verwendet werden (inkl. aktivem Google Tag für Analytics):

```js
const firebaseConfig = {
  apiKey: 'AIzaSyBi_FTaRZQDp6CK82VnvvR_B_4bi10WJDY',
  authDomain: 'musabachelor-ekg.firebaseapp.com',
  projectId: 'musabachelor-ekg',
  storageBucket: 'musabachelor-ekg.firebasestorage.app',
  messagingSenderId: '987763555706',
  appId: '1:987763555706:web:7b7a5206c1bae20512eac3',
  measurementId: 'G-G619CFWZG3',
};
```

Entschieden für den Live-Betrieb:

1. **Ziel in Firestore**
   - Sammlung: **`MusaBachelor-EKG-Datensätze`**
   - Dokument-ID: **Session UUID** (wird clientseitig pro Sitzung erzeugt und wiederverwendet)

2. **Sicherheitskonzept**
   - Keine Authentifizierung; **nur Schreiben**, kein Lesen (Firestore Rules: `allow write: if true; allow read: if false;`).
   - Region: **`eur3`**.

3. **Datenformat-Details**
   - Zeitstempel werden als **Firestore `Timestamp`** gespeichert (z. B. `createdAt` via `serverTimestamp`).
   - Beide Layouts vorbereitet: 
     - **Verschachtelt** (`nestedCases` mit allen Feldern je Fall).
     - **Tabellarisch** (`flatTableRows` als flache Zeilenstruktur mit klaren Spaltennamen).

Damit sind alle Parameter gesetzt; das Frontend erzeugt und speichert die Datensätze entsprechend dieser Vorgaben.

### Firestore-Konnektivität
- Die App initialisiert Firebase/Firestore beim Laden und schreibt einmalig ein `__connectivity__`-Dokument in die Sammlung **MusaBachelor-EKG-Datensätze** (Felder: `lastChecked` via `serverTimestamp`, `clientSession`, `type: connectivity-check`).
- So erkennst du, ob die Verbindung und die Schreibrechte aktiv sind, ohne einen kompletten Upload abzuwarten.
