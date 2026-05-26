# CONTEXT.md — NoteFold
> Wygenerowano po sesji budowania aplikacji. Wklej ten plik na początku kolejnego czatu.

---

## 1. CZYM JEST APLIKACJA

**NoteFold** — aplikacja do robienia notatek w stylu **Paper-fold UI** (neumorfizm + zagięte rogi kartek papieru). Inspiracja: ColorNote / Google Keep. Działa jako PWA (Progressive Web App) — można ją zainstalować jako ikonę na telefonie Android i iOS.

**Użytkownicy:** wielu użytkowników, każdy widzi tylko swoje dane (izolacja per UID Firebase).

---

## 2. STACK TECHNOLOGICZNY

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Vanilla JS (ES6+), HTML5, CSS3 — **bez frameworka** |
| Baza danych | Firebase Firestore (NoSQL, real-time listeners) |
| Autoryzacja | Firebase Auth — Google Sign-In |
| Hosting | Vercel (auto-deploy z GitHub) |
| Zdjęcia | Cloudinary (unsigned upload preset) + fallback Base64 |
| Dyktowanie | Web Speech API (`pl-PL`) |
| PWA | manifest.json + Service Worker (Network First dla JS/CSS/HTML) |
| Backup | Python 3 + `firebase-admin` + `schedule` na VPS Ubuntu |
| Proces VPS | PM2 (`notefold-backup`) |
| Czcionki | Google Fonts: Lora (tytuły) + Inter (body) |

---

## 3. STRUKTURA PLIKÓW

### GitHub repo: `notefold`
```
notefold/
├── index.html          ← cała struktura HTML (SPA)
├── style.css           ← paper-fold design system, responsive
├── app.js              ← cała logika aplikacji
├── firebase-config.js  ← konfiguracja Firebase (uzupełniona przez użytkownika)
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (Network First)
├── vercel.json         ← konfiguracja Vercel (rewrite do index.html)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── notefold_backup.py  ← skrypt backupu (tylko info, działa na VPS)
├── ecosystem.config.js ← konfiguracja PM2 (tylko info)
└── CONTEXT.md          ← ten plik
```

### VPS: `/root/notefold/`
```
/root/notefold/
├── notefold_backup.py      ← skrypt backupu Firestore
├── ecosystem.config.js     ← PM2 config
├── serviceAccountKey.json  ← klucz Firebase Admin (NIE na GitHub!)
├── backups/                ← pliki JSON backup (co 2 dni)
└── logs/
    ├── backup-out.log
    └── backup-error.log
```

---

## 4. KONFIGURACJA

### firebase-config.js
```javascript
const firebaseConfig = {
  apiKey:            "...",
  authDomain:        "...",
  projectId:         "...",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "..."
};
firebase.initializeApp(firebaseConfig);
```

### Cloudinary (app.js, linie 10-11)
```javascript
const CLOUDINARY_CLOUD_NAME = 'dfahpxrrv';  // już uzupełnione
const CLOUDINARY_UPLOAD_PRESET = 'notefold_preset';  // Unsigned preset
```

### Firestore reguły bezpieczeństwa
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Firestore struktura kolekcji
```
users/
  {uid}/
    notes/
      {noteId}: {
        title, type, content, color, folderId, date,
        createdAt, updatedAt, starred,
        todos: [{text, done}],    // dla type='todo'
        transcript,               // dla type='voice'
        photos: [url],            // dla type='photo'
      }
    folders/
      {folderId}: { name, color, createdAt }
```

---

## 5. STRUKTURA UI

### Desktop (≥768px)
```
┌─────────────────────────────────────────────────┐
│ SIDEBAR (240px)    │  MAIN CONTENT              │
│ ─────────────────  │  ─────────────────────     │
│ 📋 NoteFold        │  TOPBAR (hamburger mobile  │
│                    │         + tytuł + user)     │
│ [Notatki]  ←active │  ─────────────────────     │
│ [Kalendarz]        │  VIEW (notatki/kalend/...)  │
│ [Galeria]          │                             │
│ [Ustawienia]       │                             │
│                    │                             │
│ [+ Nowa notatka]   │                             │
│                    │                             │
│ [Avatar | Imię]    │                             │
└─────────────────────────────────────────────────┘
```

### Mobile (≤768px)
```
┌──────────────────────┐
│ TOPBAR               │
│ (☰ | tytuł | 👤)    │
├──────────────────────┤
│                      │
│  VIEW CONTENT        │
│                      │
├──────────────────────┤
│ [📄] [📅] [+] [🖼] [⚙]│
│ Not  Kal  FAB Gal  Ust│
└──────────────────────┘
```

### Zakładki (views)
| ID | Nazwa | Zawartość |
|----|-------|-----------|
| `view-notes` | Notatki | lista/grid/details notatek, foldery, wyszukiwarka, sortowanie |
| `view-calendar` | Kalendarz | siatka miesięczna, kropki przy dniach z notatkami, lista notatek z dnia |
| `view-gallery` | Galeria | siatka zdjęć ze wszystkich notatek, lightbox, info o notatce+folderze |
| `view-settings` | Ustawienia | info o użytkowniku, eksport/import JSON, logout |

### Modalne okna
- **Editor** — dodawanie/edycja notatki (wyśrodkowany na desktop, bottom-sheet na mobile)
- **Folder modal** — tworzenie nowego folderu
- **User modal** — profil użytkownika, logout

---

## 6. FUNKCJE APLIKACJI

### Notatki
- Typy: `note` (tekst z formatowaniem), `todo` (lista z checkboxami), `voice` (dyktowanie), `photo` (zdjęcia Cloudinary/Base64)
- Kolory notatek: 8 predefiniowanych kolorów
- Gwiazdkowanie (`starred`)
- Przypisanie do folderu
- Data dodania (datetime-local input)

### Formatowanie tekstu (typ `note`)
- Bold, Italic, Underline (`execCommand`)
- Rozmiar czcionki (select: 12/14/16/18/22/28px)
- Kolor czcionki (color input)

### TODO
- Dodaj pozycję przyciskiem
- Klik na kółko = przekreślenie (done)
- Licznik `done/total` widoczny na karcie
- Usunięcie pozycji przyciskiem ×

### Foldery
- Tworzenie z kolorem
- Chip z licznikiem notatek (aktualizowany real-time)
- Usuwanie folderu (notatki zostają bez folderu)
- Filtrowanie notatek po folderze

### Widoki i sortowanie
- Lista / Grid / Details (toggle przyciski)
- Sortowanie: Data / Kolor / Nazwa
- Filtr: Wszystkie / Dzisiaj

### Wyszukiwarka
- Filtruje po tytule, treści, transkrypcie głosowym
- Przycisk czyszczenia ✕

### Usuwanie
- Pojedyncza notatka: przycisk ⋮ (trzy kropki) na karcie → menu kontekstowe
- Menu kontekstowe: ✏️ Edytuj / 🗑️ Usuń (z potwierdzeniem)
- Na mobile: długie przytrzymanie (600ms) otwiera menu
- Na desktop: prawy klik też działa
- Multi-select: przycisk "Zaznacz" → klik notatek → "Usuń zaznaczone"

### Galeria
- Pokazuje wszystkie notatki typu `photo`
- Każda karta: miniatura, tytuł notatki, folder, data
- Klik w zdjęcie → lightbox (pełny ekran, blur tła)
- Przycisk "✏️ Otwórz notatkę" → edytor

### Backup VPS
- Skrypt: `/root/notefold/notefold_backup.py`
- Co 2 dni o 03:00 → eksport całego Firestore do JSON
- Usuwa backupy starsze niż 28 dni (sprawdza `os.path.getctime`)
- PM2 process: `notefold-backup`

### Import/Export
- Eksport: pobiera JSON z notatkami i folderami
- Import: wgrywa JSON, dodaje do Firestore (nowe dokumenty, nie nadpisuje)

### PWA
- `manifest.json` → ikona na ekranie telefonu
- Service Worker: Network First dla .html/.js/.css, Cache First dla obrazków
- Auto-update: SW wykrywa nową wersję → sam przeładowuje stronę

---

## 7. DESIGN SYSTEM — PAPER-FOLD UI

### Kolory (CSS variables)
```css
--bg:         #e8e4dc   /* tło aplikacji */
--bg-dark:    #dedad2   /* tło sidebar/bottomnav */
--surface:    #eceae3   /* powierzchnia elementów */
--surface2:   #f4f1ea   /* jaśniejsza powierzchnia */
--fold:       #cac6bd   /* kolor zagięcia */
--fold-dark:  #b8b4ab   /* ciemniejsze zagięcie */
--text:       #2a2826
--text-muted: #7a7672
--accent:     #3a3632   /* ciemny brąz/grafit */
--danger:     #c0392b
```

### Zagięcia paper-fold
Każdy element ma zagięty róg przez `clip-path` + pseudoelement z trójkątem:
```css
/* Górny prawy róg (karty, foldery, przyciski nav) */
clip-path: polygon(0 0, calc(100% - VAR) 0, 100% VAR, 100% 100%, 0 100%);
::after { background: linear-gradient(225deg, var(--fold-dark) 50%, transparent 50%); }

/* Dolny lewy róg (karty notatek) */
clip-path: polygon(0 0, 100% 0, 100% 100%, VAR 100%, 0 calc(100% - VAR));
::before { border: solid; border-color: transparent transparent var(--fold-dark) transparent; }
```

### Cienie neumorficzne
```css
--shadow-out: 5px 5px 14px rgba(0,0,0,0.18), -3px -3px 8px rgba(255,255,255,0.78);
--shadow-in:  inset 3px 3px 7px rgba(0,0,0,0.16), inset -2px -2px 5px rgba(255,255,255,0.7);
--shadow-lg:  8px 8px 20px rgba(0,0,0,0.22), -4px -4px 10px rgba(255,255,255,0.72);
```

### Czcionki
- Tytuły (h1, nazwy notatek w edytorze): **Lora** (Google Fonts, serif)
- Body (wszystko inne): **Inter** (Google Fonts, sans-serif)

---

## 8. FLOW DANYCH

```
Użytkownik → Google Auth → Firebase UID
                                ↓
                    Firestore: users/{uid}/notes
                    Firestore: users/{uid}/folders
                                ↓
                    onSnapshot (real-time listener)
                                ↓
                    renderNotes() + renderFolders()
                    (foldery ładują się PIERWSZE,
                     potem notatki — ważna kolejność!)
                                ↓
                    buildNoteCard() → DOM
```

**Zdjęcia:**
```
Plik → handlePhotoUpload()
  → sprawdź czy Cloudinary skonfigurowany
  → TAK: fetch POST api.cloudinary.com → secure_url
  → NIE/błąd: resizeToBase64() → canvas → JPEG base64
  → img.src = url → zapisane w note.photos[]
```

---

## 9. CO ZOSTAŁO ZROBIONE W TEJ SESJI

### Zbudowane od zera
1. Cała aplikacja NoteFold (HTML + CSS + JS ~1500 linii łącznie)
2. Firebase Auth + Firestore z izolacją per użytkownik
3. 4 typy notatek: note/todo/voice/photo
4. Formatowanie tekstu (bold/italic/underline/rozmiar/kolor)
5. Foldery z kolorami i licznikami
6. Widoki: lista/grid/details + sortowanie
7. Wyszukiwarka real-time
8. Kalendarz z oznaczeniem dni z notatkami
9. Galeria zdjęć z lightboxem
10. Menu kontekstowe ⋮ (usuwanie, edycja)
11. Multi-select delete
12. Import/Export JSON
13. PWA (manifest + SW z auto-update)
14. Skrypt backupu VPS (Python + PM2)
15. Pełna instrukcja instalacji INSTRUKCJA.md

### Naprawione błędy (chronologicznie)
| Problem | Rozwiązanie |
|---------|-------------|
| FAB nie otwierał editora | `fab-btn` skomentowany podczas patchowania — przywrócono jako `fab-btn-desktop` + `fab-btn-mobile` |
| Modal przycięty na dole | Zmiana z `align-items: flex-end` na `center` + `border-radius: var(--radius-lg)` |
| Kliknięcie tła zamykało modal | Usunięto event listener na overlay dla editora, folder modal i user modal |
| Folder tag niewidoczny po zalogowaniu | Zmieniono kolejność `loadData()`: foldery ładują się PIERWSZE, potem notatki |
| Liczniki folderów pokazywały 0 | `renderFolders()` wywoływane teraz też przy każdej zmianie notatek |
| Brak usuwania notatek/folderów | Dodano menu ⋮ z kontekstem, `deleteFolder()`, `deleteNote()` |
| Cloudinary "failed to fetch" | Dodano fallback Base64 (`resizeToBase64()`), problem był z rozszerzeniami wallet (MetaMask blokował) |
| FAB zasłaniał ikonę Galerii | Zmieniona kolejność w HTML: Notatki→Kalendarz→**FAB**→Galeria→Ustawienia |
| SW cachował stare pliki | Zmiana strategii na Network First dla JS/CSS/HTML, auto-reload przy nowym SW |
| Desktop wyglądał źle (wąski) | Przebudowa layoutu: sidebar desktop + main content, bottomnav tylko mobile |
| Tagi folderów na kartach | Dodano `note-folder-tag` w `buildNoteCard()` |

---

## 10. AKTUALNY STAN

### ✅ Działa
- Logowanie Google, multi-user izolacja
- CRUD notatek (wszystkie 4 typy)
- Foldery z licznikami i usuwaniem
- Formatowanie tekstu
- Widoki lista/grid/details
- Sortowanie i wyszukiwarka
- Kalendarz z notatkami
- Galeria zdjęć + lightbox
- Menu kontekstowe ⋮ (edytuj/usuń)
- Multi-select delete
- Import/Export JSON
- Dyktowanie głosowe (pl-PL)
- Zdjęcia (Cloudinary + fallback Base64)
- PWA — ikona na telefonie
- Auto-update Service Worker
- Backup VPS co 2 dni

### ⚠️ Znane ograniczenia
- Cloudinary bywa blokowany przez rozszerzenia wallet (MetaMask/Backpack) — fallback Base64 działa poprawnie
- Backup VPS wymaga ręcznej instalacji `serviceAccountKey.json`
- Notatki głosowe działają tylko w Chrome/Edge (Safari ma ograniczenia)
- Base64 zdjęcia zajmują więcej miejsca w Firestore niż Cloudinary URL

### ❌ Nie zaimplementowano
- Powiadomienia push
- Udostępnianie notatek między użytkownikami
- Import z ColorNote (plik `.backup` jest zaszyfrowany AES kluczem urządzenia — niemożliwe bez roota)
- Edycja folderu (zmiana nazwy/koloru po utworzeniu)

---

## 11. KONWENCJE

### Deployment
- Zmiany plików → wgraj na GitHub przez Web UI
- Vercel wykrywa push → auto-deploy (~1 min)
- **NIE restartować** procesu VPS backup w godzinach 08:00–22:00 UTC
- VPS: zawsze `pm2 reload notefold-backup` (nie restart)

### Kod
- Vanilla JS, zero dependencies w frontend
- Wszystkie funkcje w jednym `app.js`
- Firebase compat SDK (nie modular) — `firebase.firestore()`, `firebase.auth()`
- Real-time listeners zamiast jednorazowych fetch
- Zawsze sprawdzaj `?.` przed odwołaniem do elementów DOM (mogą nie istnieć)

### UI/Design
- **Paper-fold** — każdy element ma zagięty róg przez `clip-path` + trójkąt z `::before`/`::after`
- Kolory z CSS variables — nigdy hardkodowane hex w JS
- Desktop: sidebar z nawigacją (nie dolny pasek)
- Mobile: dolny pasek 4 ikony + FAB pośrodku (kolejność: Notatki|Kalendarz|FAB|Galeria|Ustawienia)
- Toast zamiast `alert()` dla komunikatów sukcesu
- `confirm()` przed każdą operacją usuwania

### Pliki wrażliwe (NIE na GitHub)
- `serviceAccountKey.json` — tylko na VPS
- Wartości Firebase config — są w `firebase-config.js` (publiczne repozytorium, ale to OK dla Firebase)

---

## 12. PRZYDATNE KOMENDY VPS

```bash
# Status procesów
pm2 status

# Logi backup
pm2 logs notefold-backup --lines 50

# Restart backup
pm2 reload notefold-backup

# Ręczny backup
cd /root/notefold && python3 notefold_backup.py

# Lista backupów
ls -lh /root/notefold/backups/

# Instalacja zależności Python (jeśli potrzeba)
pip install firebase-admin schedule --break-system-packages
```

---

## 13. ZALEŻNOŚCI ZEWNĘTRZNE

| Serwis | Cel | Plan |
|--------|-----|------|
| Firebase (Google) | Auth + Firestore | Spark (darmowy) |
| Vercel | Hosting | Hobby (darmowy) |
| Cloudinary | Upload zdjęć | Free (25GB) |
| Google Fonts | Lora + Inter | Darmowy CDN |
| Firebase JS SDK | `gstatic.com` CDN v10.12.2 | Darmowy |

---

---

## 🚀 PROMPT STARTOWY

> Skopiuj poniższy blok i wklej jako pierwszą wiadomość w nowym czacie:

---

```
Cześć! Pracujemy nad projektem NoteFold — aplikacja do notatek w stylu Paper-fold UI.

STACK:
- Frontend: Vanilla JS + HTML + CSS (bez frameworka), hostowane na Vercel
- Baza: Firebase Firestore (real-time listeners), Auth: Google Sign-In
- Zdjęcia: Cloudinary (cloud name: dfahpxrrv, preset: notefold_preset, unsigned) + fallback Base64
- Dyktowanie: Web Speech API pl-PL
- PWA: manifest.json + Service Worker (Network First)
- Backup: Python skrypt na VPS Ubuntu, PM2 process: notefold-backup, co 2 dni do /root/notefold/backups/
- Deployment: GitHub Web UI → Vercel auto-deploy

PLIKI (GitHub repo: notefold):
index.html, style.css, app.js, firebase-config.js, manifest.json, sw.js, vercel.json, icons/icon-192.png, icons/icon-512.png

STRUKTURA FIRESTORE:
users/{uid}/notes/{noteId} — pola: title, type(note/todo/voice/photo), content, color, folderId, date, createdAt, updatedAt, starred, todos[], transcript, photos[]
users/{uid}/folders/{folderId} — pola: name, color, createdAt

UI:
- Desktop: sidebar lewy (Notatki/Kalendarz/Galeria/Ustawienia + przycisk "Nowa notatka" + user) + main content po prawej
- Mobile: topbar + dolny pasek (Notatki | Kalendarz | FAB+ | Galeria | Ustawienia)
- 4 widoki: view-notes, view-calendar, view-gallery, view-settings
- Design: Paper-fold (zagięte rogi clip-path, neumorficzne cienie), kolory kremowo-beżowe (#e8e4dc tło, #3a3632 accent), czcionki Lora+Inter

CO DZIAŁA: CRUD notatek, 4 typy (note/todo/voice/photo), foldery z licznikami, formatowanie tekstu, widoki lista/grid/details, sortowanie, wyszukiwarka, kalendarz, galeria+lightbox, menu kontekstowe ⋮ (edytuj/usuń), multi-select delete, import/export JSON, PWA, backup VPS, auto-update SW

KONWENCJE:
- Vanilla JS, Firebase compat SDK (nie modular)
- Real-time onSnapshot listeners
- Foldery ładują się PIERWSZE w loadData(), potem notatki (ważne dla tagów folderów)
- renderFolders() wywoływane przy każdej zmianie notatek I folderów
- Toast zamiast alert(), confirm() przed usunięciem
- VPS: pm2 reload (nie restart), deploy po 22:00 UTC
- serviceAccountKey.json tylko na VPS, nigdy na GitHub

OSTATNIA SESJA: Zbudowano całą aplikację od zera. Naprawiono: kolejność ładowania folderów/notatek, modal wyśrodkowany, SW Network First, FAB ID, menu kontekstowe ⋮, fallback Base64 dla zdjęć, kolejność ikon w bottomnav (FAB w środku).

Co chcesz zmienić/dodać?
```
