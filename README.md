# Save Timmy 🐋

Ein lokales Multiplayer-Partyspiel im ".io"-Stil, bei dem Spieler gemeinsam einen gestrandeten Wal (Timmy) in Sicherheit navigieren müssen – doch einer unter ihnen ist der Saboteur!

Ein Gerät (Laptop/Tablet/TV) hostet das Spielfeld, während 4 bis 8 Spieler ihre Smartphones als Controller ("Boote") nutzen.

## 🛠 Technologien

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend / Realtime / DB:** Supabase (PostgreSQL, Realtime Channels, Edge Functions)
- **Icons & Assets:** Lucide React, benutzerdefinierte SVGs

---

## 🚀 Lokale Entwicklung & Setup

Um das Projekt lokal auszuführen und weiterzuentwickeln, folge diesen Schritten:

### 1. Voraussetzungen
- **Node.js** (Empfohlen: v18 oder neuer)
- **npm** (wird mit Node.js installiert)
- Ein **Supabase Account** (kostenlos unter [supabase.com](https://supabase.com))

### 2. Projekt klonen & Abhängigkeiten installieren

```bash
# Abhängigkeiten installieren
npm install
```

### 3. Supabase Backend einrichten

Erstelle ein neues Projekt in deinem Supabase-Dashboard.

#### Umgebungsvariablen (.env)
Erstelle eine Datei namens `.env` im Hauptverzeichnis des Projekts und füge deine Supabase-Zugangsdaten ein. Diese findest du in deinem Supabase-Dashboard unter **Settings > API**.

```env
VITE_SUPABASE_URL=https://dein-projekt-id.supabase.co
VITE_SUPABASE_ANON_KEY=dein-langer-anon-public-key
```
*(Achtung: Die `.env`-Datei sollte niemals in dein Git-Repository hochgeladen werden! Sie ist bereits in der `.gitignore` ignoriert.)*

#### Supabase CLI Setup & Datenbank Migration
Das Projekt nutzt die Supabase CLI, um die Datenbank-Tabellen und Edge Functions zu verwalten.

1. **Logge dich in die Supabase CLI ein:**
   ```bash
   npx supabase login
   ```
   *(Erstelle dazu ein Access Token unter https://app.supabase.com/account/tokens und füge es ein, falls der Browser-Login nicht klappt).*

2. **Verknüpfe das lokale Projekt mit deinem Remote-Supabase-Projekt:**
   ```bash
   npx supabase link --project-ref DEINE_PROJECT_ID
   ```
   *(Die Project-ID findest du in der Supabase URL: `https://[DEINE_PROJECT_ID].supabase.co`)*

3. **Pushe das Datenbankschema (Tabellen erstellen):**
   ```bash
   npx supabase db push
   ```

4. **Deploye die Edge Functions (z. B. Rollenverteilung):**
   ```bash
   npx supabase functions deploy
   ```

### 4. Entwicklungsserver starten

Sobald das Backend steht und die `.env` konfiguriert ist, kannst du das Frontend starten:

```bash
npm run dev
```
Das Spiel ist nun lokal unter `http://localhost:5173` (oder einem ähnlichen Port) erreichbar.

---

## 🏗 Build für Produktion

Um eine optimierte Produktionsversion zu erstellen (z.B. für das Deployment auf Netlify oder Vercel):

```bash
npm run build
```
Der fertige Code liegt danach im `dist/`-Ordner bereit.

**Wichtig beim Deployment:** Vergiss nicht, die Umgebungsvariablen (`VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`) auch in den Einstellungen deines Hosting-Anbieters (Netlify, Vercel etc.) zu hinterlegen!

---

## 🎨 Design-Philosophie
Das Spiel zielt auf einen zugänglichen ".io"-Charme ab:
- **Schriftart:** Comic Neue
- **Farben:** Helle, freundliche Palette mit starkem Kontrast (Hauptfarbe Blau `#61ACD2`, Sand `#f2dc70`).
- **UI:** Abgerundete Ecken, dicke Ränder und weiche Schatten für einen kartoonigen Look.
