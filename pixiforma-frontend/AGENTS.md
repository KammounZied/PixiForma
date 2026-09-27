# PixiForma — Règles de design Piximindoui

## Palette de couleurs

- **Violet principal Piximind :** `#6763DD` (primary-400) — boutons, accents, liens, icônes actives, CTA
- **Violet profond :** `#504BCF` (primary-500 / DEFAULT) — hover des boutons, `text-primary`
- **Fond sidebar :** `#342F8E` (primary-700)
- **Échelle violette :** 25 `#F0F0FC`, 50 `#EAE9FB`, 100 `#D4D3F6`, 200 `#A9A7ED`, 300 `#7E7BE5`, 400 `#6763DD`, 500 `#504BCF`, 600 `#423DB3`, 700 `#342F8E`, 800 `#262269`, 900 `#181543`
- **Fond clair :** `#f8f9fa` — arrière-plans de sections
- **Blanc :** `#ffffff` — cartes, modales, conteneurs
- **Texte principal :** `#333333` ou `#2d3436`
- **Texte secondaire :** `#6c757d` ou `#7f8c8d`
- **Bordures :** `#e9ecef` ou `#dfe6e9`
- **Couleurs sémantiques (statuts) :** vert `#23B432` (succès / terminé), orange `#E0A449` (en cours / avertissement), rouge `#e0004d` (danger / erreurs / bloqué), bleu `#49A4E0` (disponible / information)

## Typographie

- **Police :** `Lato` (Google Fonts), `font-family: 'Lato', sans-serif;`
- **Hiérarchie :**
  - Titres : `font-weight: 700`, `1.5rem` à `2.5rem`
  - Sous-titres : `font-weight: 600`, `1.1rem` à `1.3rem`
  - Corps : `font-weight: 400`, `0.95rem` à `1rem`

## Composants

- **Boutons primaires :** Fond `#6763DD` (primary-400), texte blanc, `border-radius: 50px` ou `12px`, padding `12px 30px`, `font-weight: 600`, hover `bg-primary-500`
- **Boutons « blanc » (actions destructives / anciennement rouges) :** Fond blanc, `border: 1px solid primary-300`, texte `primary-500`, hover `bg-primary-50`
- **Boutons désactivés / loading :** `bg-primary-50 text-primary-300 border-primary-100`
- **Sidebar :** Fond `primary-700` (`#342F8E`), items inactifs `text-primary-200` hover `bg-white/10 text-white`, item actif (celui cliqué) `bg-primary-400 text-white`, déconnexion `text-red-300`, séparateurs `border-white/10`
- **Cartes :** Blanc, `border-radius: 12px`, ombre `0 2px 15px rgba(0,0,0,0.06)`
- **Sections :** Espacement vertical `60px` à `100px`
- **Liens/boutons :** `transition: all 0.3s ease`
- **Hover carte :** `translateY(-2px)` + ombre renforcée
- **Badges :** Fond en nuance de la couleur, texte pleine couleur, `border-radius: 9999px`
- **Modales :** Blanc, `border-radius: 16px`, overlay semi-transparent noir
