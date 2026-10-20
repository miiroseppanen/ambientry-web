# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People discovering Suomen Ambientyhdistys ry: what the association is, what it does, and how to join. Other audiences (members, press, partners) may use the same pages, but they are not the primary job.

## Product Purpose

This is the public website of Suomen Ambientyhdistys ry, a Tampere-based registered association that promotes ambient music and related experimental, audiovisual, interdisciplinary, and spatial art.

A successful visit lets someone understand the association and, if they want, apply for membership.

## Positioning

An official association site, not a festival microsite. Siirtymä and Lovi-klubi are activities of the association; current event publicity lives on Instagram (`@siirtyma`) and siirtyma.com.

## Operating Context

- Public pages: koti, tapahtumat, jäseneksi, hallitus, yhteys.
- Membership applications go through an existing Google Form; the board accepts members and notifies by email.
- Event history is an archive of confirmed dates and names, not a narrative programme.
- Content is edited as JSON blocks and Markdown event files, then served as static HTML.

## Capabilities and Constraints

- Static HTML, CSS, and JavaScript. No application backend.
- Membership fee is 20 € / year. No joining fee. Individuals and organizations may apply if they accept the association’s purpose and rules. Association rules URL is not published yet.
- Future work must not invent facts: no fabricated emails, phone numbers, Y-tunnus, venues, programme copy, or contact details.
- Event archive entries may show a date only when it is known; year alone is valid. Do not invent descriptions, venues, or artists for the archive listing.
- Finnish is the current public language of the site. Whether other languages are needed is undecided.

## Brand Commitments

- Name / identity mark: `Suomen Ambientyhdistys ~`
- Title of the identity mark stays in Times New Roman.
- Binding visual direction beyond that mark is not recorded here.

## Evidence on Hand

- Homepage copy and photos: `content/etusivu.json`, `content/008-siirtyma.jpg`, `content/016-siirtyma-woodhenge.jpg`
- Events intro and Instagram / Siirtymä links: `content/tapahtumat.json`
- Event archive: `content/events/` (Markdown + `index.json`), years 2017–2026
- Membership copy and Google Form: `content/jasenyys.json`
- Board 2026: `content/hallitus.json` (roles only where given)
- Contact currently published: `content/yhteys.json` — Suomen Ambientyhdistys ry, Tampere, c/o H23 Agency Oy, Hallituskatu 23, 33200 Tampere
- Intended public domain in metadata: ambientry.fi
- Current hosting URL: https://sayry-web-ambientyhdistys.vercel.app/
- Do not fabricate testimonials, press clippings, extra addresses, or unpublished emails.

## Product Principles

- Association first: the site represents ry, not a single festival brand.
- Facts over atmosphere copy: if it is not in the source files, it is not on the site.
- Joining is the main conversion; event discovery points onward to Instagram and siirtyma.com.
- Archive is a record of names and dates, not a reconstruction of past programmes.
- Keep the identity mark `Suomen Ambientyhdistys ~` intact.
