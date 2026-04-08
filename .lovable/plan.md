

## B&B a Bari — Sito Web

### Branding
- **Nome**: "Casa del Sole — B&B Bari" (placeholder, modificabile)
- **Palette**: toni turchese/acquamarina (come nel design di riferimento), bianco, grigio chiaro
- **Font**: Inter per il body, font elegante per i titoli

### Pagine e Sezioni

#### Homepage (ispirata al design)
1. **Hero** — Immagine grande di Bari/Puglia con titolo "Scopri Bari, sentiti a casa" + barra di ricerca con selettore date check-in/check-out e numero ospiti
2. **Le nostre camere** — Card per le 3 camere con foto placeholder, nome, descrizione breve, prezzo a notte e pulsante "Prenota"
3. **Offerte del momento** — Sezione con eventuali sconti o pacchetti speciali (stile "Best offer this month")
4. **Esplora Bari** — Sezione con attrazioni e luoghi da visitare nei dintorni
5. **Footer** — Contatti, indirizzo, mappa, link social

#### Pagina Prenotazione
- Calendario interattivo con selezione date check-in e check-out
- Selezione camera e numero ospiti
- Form con nome, email, telefono, note
- Riepilogo prenotazione e pulsante "Invia richiesta"
- Conferma visuale dopo l'invio (senza backend, i dati vengono mostrati a schermo / toast)

### Funzionalità
- **Selezione date** con calendario Shadcn (date range picker)
- **Navigazione** tra homepage e pagina prenotazione
- **Design responsive** mobile-first
- **Immagini placeholder** di alta qualità (Unsplash URLs per Bari/Puglia)
- Dati camere e offerte gestiti come dati statici nel codice (facilmente sostituibili in futuro)

> **Nota**: Lovable crea app React client-side. Per un backend Node.js con gestione prenotazioni reale, si potrà integrare Supabase in un secondo momento.

