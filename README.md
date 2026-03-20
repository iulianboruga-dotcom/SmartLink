# Cum lucrezi pe GitHub direct din browser
## Tutorial pentru echipa SmartLink

Nu trebuie să instalezi nimic. Tot ce ai nevoie e un browser și un cont GitHub.

---

## 1. Intră pe repo

Deschide: **https://github.com/iulianboruga-dotcom/SmartLink**

Vei vedea pagina principală a proiectului cu fișierele de pe branch-ul `main`.

---

## 2. Selectează branch-ul tău

**NU lucrezi pe `main`!** Selectează branch-ul pe care ești repartizat.

1. Click pe butonul unde scrie **`main`** (stânga sus, deasupra listei de fișiere)
2. Apare o listă cu toate branch-urile
3. Click pe branch-ul tău (ex: `cloud-backend`, `android-app`, `web-frontend`, `esp32-firmware`, sau `learning`)

Acum vezi fișierele de pe branch-ul respectiv.

---

## 3. Creează un fișier nou

1. Click pe **Add file** (buton verde, dreapta sus) → **Create new file**
2. În câmpul de sus (unde scrie "Name your file...") scrie numele fișierului

**Trucul pentru a crea foldere:** pune `/` în nume!

Exemple:
- Scrii `test.txt` → creează fișierul `test.txt` în rădăcină
- Scrii `api/server.js` → creează folderul `api/` cu fișierul `server.js` în el
- Scrii `src/pages/Login.jsx` → creează `src/pages/` cu `Login.jsx` în el

3. Scrie conținutul fișierului în editorul mare de jos
4. Scroll jos → la **Commit changes**:
   - Scrie un mesaj scurt (ex: "feat: add server.js")
   - Asigură-te că e selectat **"Commit directly to the `branch-ul-tău` branch"**
   - Click **Commit changes**

---

## 4. Editează un fișier existent

1. Navighează la fișierul pe care vrei să-l modifici (click pe foldere → click pe fișier)
2. Click pe **iconița creion** ✏️ (dreapta sus, deasupra conținutului fișierului)
   - Sau click pe butonul cu **"Edit this file"**
3. Modifică ce ai de modificat în editor
4. Click pe butonul verde **Commit changes** (dreapta sus)
5. În fereastra pop-up:
   - Scrie mesajul de commit (ex: "fix: correct temperature reading")
   - Lasă selectat "Commit directly to..."
   - Click **Commit changes**

---

## 5. Încarcă fișiere de pe calculator

1. Navighează la folderul unde vrei să pui fișierele
2. Click pe **Add file** → **Upload files**
3. Drag & drop fișierele sau click **choose your files**
4. Scrie mesajul de commit
5. Click **Commit changes**

Merge pentru orice: poze, documente, cod, PDF-uri.

---

## 6. Șterge un fișier

1. Navighează la fișier → click pe el
2. Click pe **iconița trei puncte** ⋯ (dreapta sus) → **Delete file**
3. Commit changes

---

## 7. Creează un branch nou (doar Team Lead face asta de obicei)

1. Click pe dropdown-ul cu numele branch-ului curent (ex: `main`)
2. Scrie numele noului branch (ex: `learning`)
3. Apare opțiunea: **"Create branch: learning from main"**
4. Click pe ea — gata, branch-ul există

---

## 8. Fă Pull Request (când ai terminat de lucrat)

Asta combină munca ta de pe branch-ul tău înapoi pe `main`:

1. Click pe tab-ul **Pull requests** (sus, lângă Code)
2. Click **New pull request**
3. **base:** `main` ← **compare:** `branch-ul-tău`
4. Click **Create pull request**
5. Scrie un titlu + descriere scurtă a ce ai făcut
6. Click **Create pull request**
7. Anunță pe Discord: "Am deschis PR"
8. Team Lead-ul verifică și face **Merge**

---

---

## 🎓 Branch-ul `learning` — Zonă de exersare

**URL:** https://github.com/iulianboruga-dotcom/SmartLink/tree/learning

Acest branch e **zona voastră de joacă**. Puteți:
- Crea fișiere
- Edita fișiere
- Șterge fișiere
- Încerca commit-uri
- Greși fără consecințe

**Nimeni nu face merge din `learning` pe `main`.** E complet separat.

### Exerciții de probă:

**Exercițiul 1 — Primul tău fișier**
1. Selectează branch-ul `learning`
2. Add file → Create new file
3. Nume: `exercitii/NUMELE-TAU.txt`
4. Conținut: "Salut, sunt [numele tău] și am învățat să fac commit!"
5. Commit changes
6. Verifică: navighează la folderul `exercitii/` — fișierul tău e acolo?

**Exercițiul 2 — Editează fișierul**
1. Click pe fișierul tău din `exercitii/`
2. Click pe creion ✏️
3. Adaugă o linie nouă: "Am editat fișierul cu succes!"
4. Commit changes

**Exercițiul 3 — Creează un folder cu subfolder**
1. Add file → Create new file
2. Nume: `exercitii/NUMELE-TAU/proiect/index.html`
3. Conținut:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Primul meu site</title>
   </head>
   <body>
       <h1>Salut lume!</h1>
       <p>Sunt [numele tău] și am creat o pagină web.</p>
   </body>
   </html>
   ```
4. Commit changes
5. Navighează în foldere și verifică structura: `exercitii/NUMELE-TAU/proiect/index.html`

**Exercițiul 4 — Uploadează o poză**
1. Navighează la `exercitii/NUMELE-TAU/`
2. Add file → Upload files
3. Trage o poză de pe desktop
4. Commit changes

**Exercițiul 5 — Simulează lucrul real**
1. Navighează la `exercitii/NUMELE-TAU/proiect/`
2. Add file → Create new file → `style.css`:
   ```css
   body {
       font-family: Arial, sans-serif;
       background-color: #f0f0f0;
       text-align: center;
       padding: 50px;
   }
   h1 {
       color: #333;
   }
   ```
3. Commit changes
4. Editează `index.html` (click → creion ✏️)
5. Adaugă în `<head>`: `<link rel="stylesheet" href="style.css">`
6. Commit changes

Bravo! Tocmai ai făcut exact ce fac programatorii zilnic: ai creat fișiere, le-ai editat, și ai făcut commit-uri. Acum ești gata să lucrezi pe branch-ul real al modulului tău.

---

## Rezumat rapid

| Vrei să... | Faci asta |
|------------|-----------|
| Creezi fișier | Add file → Create new file |
| Creezi folder | Scrii `numefolder/numefisier` în câmpul de nume |
| Editezi fișier | Click pe fișier → creion ✏️ → Commit |
| Uploadezi fișiere | Add file → Upload files |
| Ștergi fișier | Click pe fișier → ⋯ → Delete file |
| Schimbi branch-ul | Click pe dropdown-ul cu numele branch-ului |
| Faci merge | Pull requests → New pull request |
| Exersezi | Treci pe branch-ul `learning` |
