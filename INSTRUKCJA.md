# 📋 NoteFold — Instrukcja instalacji krok po kroku

> Napisane jak dla 5-latka. Każdy krok jest opisany dokładnie.
> Czytaj od góry do dołu, nie pomijaj żadnego kroku.

---

## 🗂️ SPIS TREŚCI

1. Co będziesz potrzebował
2. Tworzenie repozytorium GitHub
3. Wgranie plików na GitHub
4. Konfiguracja Firebase (baza danych + logowanie)
5. Konfiguracja Cloudinary (zdjęcia)
6. Połączenie z Vercel (hosting strony)
7. Instalacja backupu na VPS
8. Dodanie ikony na telefonie
9. Gotowe! Jak używać

---

## 1. CO BĘDZIESZ POTRZEBOWAŁ

Potrzebujesz:
- Konta na **GitHub** (masz już) → github.com
- Konta na **Firebase** (darmowe) → firebase.google.com
- Konta na **Vercel** (darmowe) → vercel.com
- Konta na **Cloudinary** (darmowe) → cloudinary.com
- Dostępu do swojego **VPS** przez PuTTY

---

## 2. TWORZENIE REPOZYTORIUM GITHUB

### Krok 2.1 — Wejdź na GitHub
- Otwórz przeglądarkę
- Wejdź na: **https://github.com**
- Zaloguj się

### Krok 2.2 — Utwórz nowe repo
- Kliknij zielony przycisk **"New"** (lewy górny róg)
- **Repository name:** wpisz `notefold`
- Upewnij się, że zaznaczone jest **"Public"**
- Kliknij zielony przycisk **"Create repository"**

### Krok 2.3 — Gotowe!
Masz puste repozytorium. Teraz wgrasz do niego pliki.

---

## 3. WGRYWANIE PLIKÓW NA GITHUB

Masz do wgrania następujące pliki:

```
index.html
style.css
app.js
firebase-config.js    ← najpierw uzupełnij (patrz krok 4!)
manifest.json
sw.js
vercel.json
icons/
  icon-192.png
  icon-512.png
```

### Jak wgrać pliki przez stronę GitHub (bez komend):

#### Krok 3.1 — Wejdź do swojego repo
- Otwórz: `https://github.com/TWOJA_NAZWA/notefold`

#### Krok 3.2 — Wgraj pliki główne
- Kliknij **"Add file"** → **"Upload files"**
- Przeciągnij na okno LUB kliknij "choose your files" i wybierz:
  - `index.html`
  - `style.css`
  - `app.js`
  - `firebase-config.js` ← (wypełniony! patrz krok 4)
  - `manifest.json`
  - `sw.js`
  - `vercel.json`
- Na dole wpisz cokolwiek w polu "Commit changes" np. `Dodaję pliki aplikacji`
- Kliknij zielony przycisk **"Commit changes"**

#### Krok 3.3 — Wgraj folder icons
- Kliknij **"Add file"** → **"Upload files"**
- Kliknij "choose your files"
- Przejdź do folderu `icons` i wybierz oba pliki:
  - `icon-192.png`
  - `icon-512.png`
- W polu commit wpisz `Dodaję ikonki`

**UWAGA:** GitHub nie obsługuje folderów przez "upload". Musisz to zrobić inaczej:
- Kliknij **"Add file"** → **"Create new file"**
- W polu nazwy pliku wpisz: `icons/icon-192.png`
- Ale PNG nie możesz wpisać ręcznie — dlatego użyj komendy przez PuTTY (patrz koniec tego kroku)

**ALTERNATYWA — przez PuTTY (łatwiej dla ikon):**

Zaloguj się do VPS przez PuTTY i wpisz kolejno:

```bash
# Zainstaluj git jeśli nie masz
apt-get install git -y

# Przejdź do folderu home
cd /root

# Sklonuj swoje repo (zamień TWOJA_NAZWA na swoją nazwę GitHub)
git clone https://github.com/TWOJA_NAZWA/notefold.git
cd notefold

# Utwórz folder icons
mkdir icons
```

Teraz przez **WinSCP** wgraj pliki PNG:
- Połącz się z VPS przez WinSCP
- Przejdź do: `/root/notefold/icons/`
- Przeciągnij `icon-192.png` i `icon-512.png`

Potem w PuTTY:
```bash
cd /root/notefold
git add .
git commit -m "Dodaję ikonki"
git push
```
GitHub zapyta o login i hasło (lub token — patrz niżej).

> **Jeśli GitHub pyta o token zamiast hasła:**
> - Wejdź na GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
> - Kliknij "Generate new token (classic)"
> - Zaznacz `repo`
> - Skopiuj token i użyj go zamiast hasła

---

## 4. KONFIGURACJA FIREBASE

Firebase to baza danych i system logowania. Jest darmowy.

### Krok 4.1 — Utwórz projekt Firebase
- Otwórz: **https://firebase.google.com**
- Kliknij **"Get started"** (lub "Zaloguj się")
- Zaloguj się kontem Google
- Kliknij **"Add project"** (Dodaj projekt)
- Wpisz nazwę: `notefold`
- Wyłącz Google Analytics (kliknij przełącznik) → nie jest potrzebny
- Kliknij **"Create project"**
- Poczekaj chwilę, aż projekt się utworzy
- Kliknij **"Continue"**

### Krok 4.2 — Dodaj aplikację webową
- W panelu Firebase kliknij ikonę **`</>`** (Web)
- App nickname: wpisz `notefold`
- **NIE zaznaczaj** "Firebase Hosting" (używamy Vercel)
- Kliknij **"Register app"**
- Zobaczysz blok kodu z danymi konfiguracyjnymi. Wyglądają tak:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "notefold-xxxxx.firebaseapp.com",
  projectId: "notefold-xxxxx",
  storageBucket: "notefold-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

- **SKOPIUJ TO** — przyda się za chwilę
- Kliknij **"Continue to console"**

### Krok 4.3 — Włącz Google Auth (logowanie)
- W lewym menu kliknij **"Authentication"**
- Kliknij **"Get started"**
- Kliknij na **"Google"**
- Kliknij przełącznik żeby **włączyć** (stanie się niebieski)
- W "Project support email" wybierz swój adres email
- Kliknij **"Save"**

### Krok 4.4 — Włącz Firestore (baza danych)
- W lewym menu kliknij **"Firestore Database"**
- Kliknij **"Create database"**
- Wybierz **"Start in test mode"** ← WAŻNE
- Kliknij **"Next"**
- Wybierz region: **"europe-west"** (lub europe-west3)
- Kliknij **"Enable"**
- Poczekaj chwilę

### Krok 4.5 — Reguły bezpieczeństwa Firestore
- Kliknij zakładkę **"Rules"** (w Firestore)
- Usuń obecny tekst i wklej to:

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

- Kliknij **"Publish"**

> To oznacza: każdy zalogowany użytkownik widzi TYLKO SWOJE dane.

### Krok 4.6 — Uzupełnij plik firebase-config.js

Otwórz plik `firebase-config.js` w edytorze (Notepad++ / VSCode):

```javascript
const firebaseConfig = {
  apiKey:            "TUTAJ_WKLEJ_API_KEY",
  authDomain:        "TUTAJ_WKLEJ_AUTH_DOMAIN",
  projectId:         "TUTAJ_WKLEJ_PROJECT_ID",
  storageBucket:     "TUTAJ_WKLEJ_STORAGE_BUCKET",
  messagingSenderId: "TUTAJ_WKLEJ_SENDER_ID",
  appId:             "TUTAJ_WKLEJ_APP_ID"
};

firebase.initializeApp(firebaseConfig);
```

Zamień każde `TUTAJ_WKLEJ_...` na dane skopiowane z Firebase w kroku 4.2.

Przykład po uzupełnieniu:
```javascript
const firebaseConfig = {
  apiKey:            "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain:        "notefold-12345.firebaseapp.com",
  projectId:         "notefold-12345",
  storageBucket:     "notefold-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abc123def456"
};

firebase.initializeApp(firebaseConfig);
```

Zapisz plik i wgraj go na GitHub (zastąp stary plik).

### Krok 4.7 — Pobierz Service Account Key (dla backupu VPS)
- W Firebase console kliknij ikonę ⚙️ (koła zębatego) → **"Project settings"**
- Kliknij zakładkę **"Service accounts"**
- Kliknij **"Generate new private key"**
- Kliknij **"Generate key"**
- Pobierze się plik JSON (np. `notefold-12345-firebase-adminsdk.json`)
- Zmień nazwę pliku na: **`serviceAccountKey.json`**
- Przez **WinSCP** wgraj go do: `/root/notefold/serviceAccountKey.json`

> ⚠️ NIE wgrywaj tego pliku na GitHub! Zawiera hasła.

---

## 5. KONFIGURACJA CLOUDINARY (zdjęcia)

### Krok 5.1 — Utwórz konto
- Wejdź na: **https://cloudinary.com**
- Kliknij **"Sign up for free"**
- Zarejestruj się (możesz przez Google)

### Krok 5.2 — Znajdź swoje dane
- Po zalogowaniu zobaczysz Dashboard
- Zanotuj **Cloud name** (np. `dxyz1234`)

### Krok 5.3 — Utwórz Upload Preset
- Kliknij ikonę ⚙️ (Settings) w lewym menu
- Kliknij **"Upload"**
- Przewiń w dół do sekcji **"Upload presets"**
- Kliknij **"Add upload preset"**
- **Preset name:** wpisz `notefold_preset`
- **Signing Mode:** zmień na **"Unsigned"** ← WAŻNE
- Kliknij **"Save"**

### Krok 5.4 — Uzupełnij app.js
- Otwórz plik `app.js`
- Na górze pliku znajdź te dwie linie:

```javascript
const CLOUDINARY_CLOUD_NAME = 'dfahpxrrv';
const CLOUDINARY_UPLOAD_PRESET = 'notefold_preset';
```

- Zamień `TWOJ_CLOUD_NAME` na swój Cloud name z kroku 5.2
- Zapisz i wgraj na GitHub

---

## 6. POŁĄCZENIE Z VERCEL (hosting)

### Krok 6.1 — Utwórz konto Vercel
- Wejdź na: **https://vercel.com**
- Kliknij **"Sign Up"**
- Wybierz **"Continue with GitHub"** ← łatwiej, bo już masz GitHub
- Zautoryzuj Vercel dostęp do GitHub

### Krok 6.2 — Importuj projekt
- Na stronie głównej Vercel kliknij **"New Project"**
- Zobaczysz listę swoich repozytoriów GitHub
- Znajdź `notefold` i kliknij **"Import"**

### Krok 6.3 — Konfiguracja projektu
- **Framework Preset:** wybierz **"Other"**
- Resztę zostaw bez zmian
- Kliknij **"Deploy"**

### Krok 6.4 — Poczekaj na deploy
- Vercel przez ~1 minutę buduje i wdraża aplikację
- Zobaczysz zielony napis "Congratulations!"
- Kliknij **"Continue to Dashboard"**

### Krok 6.5 — Sprawdź adres URL
- Zobaczysz adres np. `https://notefold-abc123.vercel.app`
- Kliknij go — powinna otworzyć się aplikacja!

### Krok 6.6 — Dodaj domenę do Firebase Auth
Teraz musisz powiedzieć Firebase, że Twoja aplikacja działa pod tym adresem:
- Wróć do **Firebase Console**
- Kliknij **"Authentication"** → zakładka **"Settings"**
- Przewiń do **"Authorized domains"**
- Kliknij **"Add domain"**
- Wpisz swój adres Vercel: `notefold-abc123.vercel.app`
- Kliknij **"Add"**

> Teraz Google Auth będzie działać na Twoim adresie.

### Krok 6.7 — Jak aktualizować aplikację?
Gdy zmienisz plik na GitHub → Vercel automatycznie wykrywa zmianę i za ~1 minutę aplikacja się aktualizuje. Nic nie musisz robić ręcznie!

---

## 7. INSTALACJA BACKUPU NA VPS

Backup uruchamia się automatycznie co 2 dni i usuwa pliki starsze niż 4 tygodnie.

### Krok 7.1 — Zaloguj się do VPS przez PuTTY

### Krok 7.2 — Przygotuj folder
```bash
mkdir -p /root/notefold/backups
mkdir -p /root/notefold/logs
```

### Krok 7.3 — Wgraj plik backupu
Przez **WinSCP** wgraj do `/root/notefold/`:
- `notefold_backup.py`
- `ecosystem.config.js`
- `serviceAccountKey.json` ← (pobrany w kroku 4.7)

### Krok 7.4 — Zainstaluj biblioteki Python
```bash
pip install firebase-admin --break-system-packages
pip install schedule --break-system-packages
```

Poczekaj aż się zainstaluje (może potrwać 2-3 minuty).

### Krok 7.5 — Sprawdź czy działa
```bash
cd /root/notefold
python3 notefold_backup.py
```

Powinno wyświetlić coś takiego:
```
[2025-01-15 03:00:00] Notefold Backup Service uruchomiony
[2025-01-15 03:00:01] Rozpoczynam backup...
[2025-01-15 03:00:03] Backup zapisany: notefold-backup-2025-01-15_03-00.json (0 notatek)
```

Naciśnij `Ctrl+C` żeby zatrzymać (uruchomisz przez PM2 zaraz).

### Krok 7.6 — Uruchom przez PM2
```bash
cd /root/notefold
pm2 start ecosystem.config.js
pm2 save
```

### Krok 7.7 — Sprawdź status
```bash
pm2 status
```

Powinien być widoczny proces `notefold-backup` ze statusem `online`.

### Krok 7.8 — Sprawdź logi
```bash
pm2 logs notefold-backup --lines 20
```

---

## 8. DODANIE IKONY NA TELEFONIE (PWA)

### Na Android (Chrome):
1. Otwórz Chrome na telefonie
2. Wejdź na adres swojej aplikacji (np. `https://notefold-abc123.vercel.app`)
3. Kliknij trzy kropki (⋮) w prawym górnym rogu
4. Wybierz **"Dodaj do ekranu głównego"**
5. Wpisz nazwę: `NoteFold`
6. Kliknij **"Dodaj"**

### Na iPhone (Safari):
1. Otwórz Safari na iPhonie
2. Wejdź na adres aplikacji
3. Kliknij ikonę **udostępniania** (kwadrat ze strzałką) na dole
4. Przewiń w dół i wybierz **"Dodaj do ekranu"**
5. Wpisz: `NoteFold`
6. Kliknij **"Dodaj"**

Teraz na ekranie głównym pojawi się ikona aplikacji!

---

## 9. GOTOWE! JAK UŻYWAĆ

### Pierwsze uruchomienie:
1. Wejdź na adres Vercel
2. Kliknij **"Zaloguj się przez Google"**
3. Wybierz swoje konto Google
4. Gotowe — jesteś w aplikacji!

### Jak dodać notatkę:
- Kliknij przycisk **+** na środku dolnego paska
- Wybierz typ: Notatka / TODO / Głosowa / Zdjęcie
- Wpisz tytuł
- Wypełnij treść
- Kliknij **"Zapisz"**

### Jak dodać folder:
- Kliknij **+** obok chipów folderów (górna część ekranu)
- Wpisz nazwę folderu
- Wybierz kolor
- Kliknij "Zapisz folder"

### Jak usunąć kilka notatek:
- Kliknij **"Zaznacz"** (prawy górny obszar)
- Kliknij notatki które chcesz usunąć
- Kliknij **"Usuń zaznaczone"**

### Jak nagrać notatkę głosową:
- Kliknij **+**, wybierz zakładkę 🎙️ Głosowa
- Kliknij przycisk mikrofonu
- Mów po polsku
- Kliknij **"Zatrzymaj"**
- Kliknij **"Zapisz"**

### Jak exportować notatki:
- Dolny pasek → ⚙️ Ustawienia
- Kliknij "Eksportuj notatki (JSON)"
- Plik zostanie pobrany na komputer

---

## 🗄️ STRUKTURA PLIKÓW — PODSUMOWANIE

| Plik | Gdzie | Co robi |
|------|-------|---------|
| `index.html` | GitHub | Główna strona aplikacji |
| `style.css` | GitHub | Wygląd (paper-fold design) |
| `app.js` | GitHub | Cała logika aplikacji |
| `firebase-config.js` | GitHub | Dane do Firebase |
| `manifest.json` | GitHub | Konfiguracja PWA |
| `sw.js` | GitHub | Offline service worker |
| `vercel.json` | GitHub | Konfiguracja hostingu |
| `icons/*.png` | GitHub | Ikony aplikacji |
| `notefold_backup.py` | VPS `/root/notefold/` | Skrypt backupu |
| `ecosystem.config.js` | VPS `/root/notefold/` | Konfiguracja PM2 |
| `serviceAccountKey.json` | VPS `/root/notefold/` | Klucz Firebase (NIE na GitHub!) |

---

## ❓ PROBLEMY I ROZWIĄZANIA

### "Nie mogę się zalogować przez Google"
→ Sprawdź czy domena Vercel jest dodana do Firebase Auth (krok 6.6)

### "Notatki się nie zapisują"
→ Sprawdź reguły Firestore (krok 4.5) — muszą być dokładnie takie jak w instrukcji

### "Cloudinary nie przesyła zdjęć"
→ Sprawdź czy Upload Preset jest ustawiony na "Unsigned" (krok 5.3)

### "Backup nie działa"
→ Sprawdź czy serviceAccountKey.json jest w `/root/notefold/`
→ Uruchom: `pm2 logs notefold-backup` i sprawdź błędy

### "Aplikacja nie aktualizuje się po zmianie pliku"
→ Vercel automatycznie deployuje po każdym push na GitHub — poczekaj 1-2 minuty
→ Sprawdź w panelu Vercel czy deployment jest "Ready"

---

> 📧 Instrukcja wygenerowana dla projektu NoteFold v1.0
> Stack: Vanilla JS + Firebase Firestore + Google Auth + Cloudinary + Vercel + PM2
