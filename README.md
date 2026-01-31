# ambientry.fi

Suomen Ambientyhdistys **~**

## Sisällön hallinta
- `content/index.json` listaa `content/`-kansion markdown-tiedostot.
- Tiedostot nimetään kolmella numerolla: `001-otsikko.md`.
- Järjestys määräytyy numerosta, saman numeron sisällä aakkosjärjestys.
- Jos numeroprefiksi puuttuu, tiedosto sijoittuu loppuun.

## Rytmi
- Sisältö sijoitetaan morsekoodin rytmiin sanasta `suomenambientyhdistys`.
- Piste = sisältöruutu, viiva = tyhjä ruutu.

## Fysiikka
- `physics.js` hoitaa ruutujen kellunnan ja dragauksen.
- Mobiilissa kellunta on pehmeämpi ja hitaampi.

## Käyttö
- Avaa `index.html` selaimessa tai tarjoa tiedostot kevyellä HTTP-palvelimella.
- Inline-sisältö `index.html`-tiedostossa toimii fallbackina ilman palvelinta.