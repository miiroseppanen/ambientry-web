# ambientry.fi

Suomen Ambientyhdistys **~**

Live: https://sayry-web-ambientyhdistys.vercel.app/

## Sisällön hallinta
- `content/index.json` osoittaa yksittäiseen JSON-sisältöön: `content/etusivu.json`.
- `content/etusivu.json` sisältää `blocks`-taulukon, jossa jokainen alkio on yksi ruutu.
- Tekstiruutu on tavallinen merkkijono; linkit voi tehdä markdownilla `[teksti](url)`.
- Kuvat lisätään omana alkionaan pelkällä tiedostonimellä, esim. `"008-siirtyma.jpg"`.

## Rytmi
- Sisältö sijoitetaan morsekoodin rytmiin sanasta `suomenambientyhdistys`.
- Piste = sisältöruutu, viiva = tyhjä ruutu.

## Fysiikka
- `physics.js` hoitaa ruutujen kellunnan ja dragauksen.
- Mobiilissa kellunta on pehmeämpi ja hitaampi.

## Käyttö
- Avaa `index.html` selaimessa tai tarjoa tiedostot kevyellä HTTP-palvelimella.
- Inline-sisältö `index.html`-tiedostossa toimii fallbackina ilman palvelinta.
- Kuvien ja `content/index.json`-tiedoston takia suosittelemme HTTP-palvelinta:
  - `python3 -m http.server 8000` ja avaa `http://localhost:8000`.