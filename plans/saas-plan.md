# OpenFS — SaaS Plan

Decision record from the monetization planning discussion (2026-06-11). Goal: replace the
dated incumbents (Fahrschulmanager, FahrschulOffice, …) with a modern multi-tenant SaaS
for German driving schools.

## Business model

- **Subscription-only at launch:** €99–149/month per school. No discounting below market —
  incumbents charge €100–180/month; underpricing signals "hobby project".
- Subscription is the sole revenue stream in v1, so the price point must carry the business.
- In-portal payment processing (and any per-transaction cut) is **explicitly deferred** —
  it pulls in BaFin/ZAG questions and Stripe Connect plumbing we don't want yet. Revisit
  once schools run their daily operations on the platform.
- Market ceiling: ~10k driving schools in Germany (~13k incl. AT/CH). Long-term option if
  more scale is needed: the same shape (calendar + customers + GoBD accounting) fits other
  appointment-driven German SMBs (Physio, Musikschulen, Nachhilfe, …). Fahrschulen first —
  we have unfair distribution there (family business as live reference customer).

## Architecture

- **Tenancy:** each school gets `schoolname.openfs.de` with its own portal.
- **Database:** one SQLite DB per tenant (physical isolation; maps directly onto the
  existing single-tenant architecture). Replicated backups (Litestream-style) to object
  storage. "Export all your data" = hand them the file.
- **Hosting:** Hetzner servers. Documents/PDFs on **Hetzner Object Storage** (S3-compatible)
  — NOT AWS. "Alles auf deutschen Servern" is a headline selling point.
- **Compliance:** AVV template for every school (school = Verantwortlicher, we =
  Auftragsverarbeiter), DSGVO documentation. Get the AVV lawyer-templated once.
- The current `electron-rewrite` codebase mostly ports over: server domain modules,
  accounting engine, DATEV export carry across. New work: tenancy, auth, subdomain
  routing, file uploads, backups.

## Phase 1 — the portal (the wedge)

- Multi-tenant portal: calendar with Terminvorschläge, student register, instructor +
  vehicle management, price plans.
- GoBD accounting engine + DATEV export — the differentiator; incumbents treat this as an
  afterthought. (Caution: have a Steuerberater review before marketing anything as
  "GoBD-konform".)
- **Free data migration from incumbent software** — the single most important sales
  weapon. Schools stay with 20-year-old software because their student histories, open
  balances, and Ausbildungsnachweise are trapped in it. Unglamorous CSV work; budget for it.
- Legal scaffolding: Impressum, AGB, AVV, simple German marketing site.

## Phase 2 — the apps (the moat)

- Free student iOS/Android app, activated via a school code tied to the school's active
  subscription. Students become the distribution channel.
- Terminbuchung, lesson history, progress tracking.
- **Instructor mobile view:** day schedule + digitaler Ausbildungsnachweis with student
  signature after each Fahrstunde (FahrSchAusbO documentation duty). This makes the app
  indispensable rather than optional — ship it before theory learning.
- Payment **tracking** only: school records payments, student sees balance. No in-app
  payment processing.

## Phase 3 — later, revenue-funded

- **Theory learning:** the amtlicher Fragenkatalog is NOT free government material — it is
  owned/licensed by arge tp 21 (TÜV + DEKRA joint venture). Options: license it, or
  partner with an existing theory-app vendor. Do not block launch on this.
- **In-portal payments:** Stripe Connect (school = merchant, we take an application fee),
  SEPA-Lastschrift first, Ratenzahlung for the €3,000–4,500 Führerschein auto-booked into
  the accounting engine. Adds the second revenue stream (~1% of payment volume).

## Go-to-market

- Hardest part is distribution, not technology.
- Live reference customer: the family Fahrschule ("built by a Fahrschule, for Fahrschulen").
- First customers: neighboring schools known via Fahrlehrerverband; demos at regional
  Verband events.
- The migration service is the door-opener; the accounting/DATEV story closes.

## Next step

Map exactly what in the current codebase transfers to the multi-tenant server and what
needs rethinking (tenancy, auth, subdomain routing, uploads, backups).
