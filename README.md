# ambientry.fi

Suomen Ambientyhdistys **~**

Live: https://sayry-web-ambientyhdistys.vercel.app/

## Sivut
- `index.html` — koti
- `tapahtumat.html`
- `jasenyys.html` — jäseneksi
- `hallitus.html`
- `yhteys.html`

Sisältö sijoitetaan kelluviin ruutuihin. `physics.js` hoitaa ruutujen kellunnan ja dragauksen. Rytmi tulee morsekoodista sanasta `suomenambientyhdistys`.

## Tapahtuma-arkisto
- `content/events/index.json` listaa markdown-tiedostot näyttöjärjestyksessä.
- Yksi tiedosto per tapahtuma tai tapahtumasarja.
- `year` on pakollinen ja toimii erillään tarkasta `date`-kentästä.
- `date` merkitään vain, kun tarkka päivä on tiedossa.

## Käyttö
- `python3 -m http.server 8000` ja avaa `http://localhost:8000`.
