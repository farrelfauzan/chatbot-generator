# Wulan.ai — MVP Documentation

**Date:** 14/3/2026
**Creator:** Reska Donaga
**Version:** 1.0
**Document Type:** BRD (Business Requirements Document) + Pitch Deck

---

## Objective

Describe the preliminary information of Wulan.ai, including:

- General Terms
- User Workflow
- Define Development Phase & Features
- Metrics Measurement
- User Story
- Wulan Expected Behaviour
- Business Strategy, Market, and Brand (from Pitch Deck)

---

# PART 1 — MVP PRD

## A. General Terms

| No | Terms | Definition |
|----|-------|------------|
| 1 | Visitor | Unique traffic/people who visit websites but do not register |
| 2 | User | Visitor who is registered in Wulan.ai |
| 3 | Customer | User who tests Wulan on WhatsApp and converts to transaction (subscribe) Wulan for extension |
| 4 | User Tested | User who tested Wulan on WhatsApp but did not convert to transaction |
| 5 | Dormant Customer | Customer who transacted in the first month but did not extend for the second month |
| 6 | Deleted User | User who deleted their account in Wulan.ai |

---

## B. User Workflow

Secara general user workflow Wulan terdiri dari 5 proses besar:

1. **User Registration dan Login**
2. **User Onboarding**
3. **User Free Trial Wulan in WhatsApp**
4. **User Transaction (Payment)**
5. **Continue chatting on WhatsApp**

### High-Level Flow (6 steps visualized)

| Step | Stage | Detail |
|------|-------|--------|
| 1 | Browsing Website | — |
| 2 | Register | Using Google |
| 3 | Onboarding | Nama, Nama Panggilan, No WhatsApp, Lokasi (Kota/Kecamatan) |
| 4 | Free Trial | URL Link, QRIS on WhatsApp |
| 5 | Payment | — |
| 6 | Continue Chat | — |

### Detailed Flow Logic

- **Start** → User Registering Website → **User Click CTA?**
  - No → loop back
  - Yes → **Register Page** → **Success Register?**
    - No → loop back
    - Yes → **Onboarding Page** (Onboarding Process)
      - Entity fields: Name*, Nick Name*, WhatsApp Number*, Lokasi Area (for praying time)*
      - **Success Onboarding?**
        - Yes → **Redirect to WhatsApp**
        - No → loop back

- **User Interact** → **Credit < IDR 300?**
  - Yes → **Send Credit Reminder** → **Payment?**
    - Yes → continue
    - No → End

### WhatsApp Template Examples

**Template WhatsApp Opening (3 bubbles):**
1. Halo [nick name], kenalin aku Wulan dan mulai hari ini aku akan menjadi AI asisten pribadimu
2. Mulai sekarang aku akan mengingatkan pengingat shalat 5 waktumu ya, [location]:
   - Subuh
   - Dzuhur
   - Ashar
   - Maghrib
   - Isya
3. Jika kamu ada kebutuhan lain, kabarin aku ya

**Template WhatsApp Credit < IDR 300 (2 bubbles):**
1. Sebagai informasi, credit hampir habis. Kamu bisa bayar melalui link ini (Link)
   *Atau kamu bisa membayar melalui QRIS ini*
2. Image QRIS

---

## C. Define Development Phase and Features

### Feature Roadmap

| MVP (Priority) | Phase 1 | Phase 2 (Mobile App) | Phase 3 (Mobile App) |
|----------------|---------|----------------------|----------------------|
| Schedule Messages | Google Calendar Integration | Chat Field Experience | Hijiriah Calendar |
| Voice Automatic Transcription | Outlook Calendar Integration | Petunjuk Arah Kiblat | Halal checker for traveler |
| Reminder Push | — | Realtime Pengingat Waktu Ibadah | — |
| Schedule Action | — | Al-Quran Digital | — |
| Notes Memorize | — | Panduan Shalat (niat, tata cara dan bacaan) | — |
| Al-Quran Digital (API Integrated) | — | — | — |
| Wulan chat user contact [WhatsApp] | — | — | — |
| Daily Quotes | — | — | — |

### Usecase Visibility — Phases

#### MVP (Priority)
- User memorizes notes and reminder
- User request reminder activity
- User can use voice to add/update by voice notes
- User asks about surah in Quran
  - Latin
  - Meaning
  - Relate/relevancy
- User received quotes
  - Muslim quotes (based on Quran & Sunnah)
  - Motivational quotes
- User can create notes/memorize and remind on push notification and WhatsApp
- User request/give an order through voice
- User can ask Wulan to remind/chat their contacts on WhatsApp

#### Phase 1
- User add & update Google calendar
- User add & update Outlook calendar
- User get Praying reminder (sunnah & fardu)
- User can get push notification for praying reminder

#### Phase 2 (Mobile App)
- User can ask everything to Wulan.ai through mobile App
- User can get realtime kiblat direction on the mobile app
- User can get to a nearby mosque
- User can read Quran through mobile App
- User can get shalat guidance, bacaan doa, gerakan shalat
- User get assisted for Hafalan Surah
- User can create reminders through mobile apps and get reminders on WhatsApp

#### Phase 3 (Mobile App)
- User have access Hijiriah Calendar
- User get visibility for Halal traveling destination/guidance
  - Place
  - Food

---

## D. MVP Metrics Measurement

### CVR Visitor to User

| Metrics | Definition |
|---------|------------|
| #Website Visitor | Jumlah visitor yang visit website wulan.ai |
| #Website Unique Visitor | Jumlah unique visitor yang visit website wulan.ai |
| % CTR button on homepage | Jumlah visitor yang click button (any button) / Jumlah visitor yang visit website wulan.ai |
| % CTR Register | Jumlah visitor click button register with google / Jumlah visitor register page |
| % Register Success Rate (USER CVR) | Jumlah visitor success register / Jumlah visitor click button register with google |
| % CTR link Whatsapp | Jumlah user yang click Sambungkan WA button / Jumlah onboarding page visitor |
| WhatsApp DAU (Wulan DAU) | Jumlah user create chats or requests on WhatsApp minimal 1x/day |

### CVR User to Paid User 💸

| Metrics | Definition |
|---------|------------|
| #User credit limit | Jumlah user yang mempunyai credit limit IDR <300 |
| #User receives WA credit limit (URL & QRIS) | Jumlah user yang menerima konfirmasi credit limit dengan URL dan QRIS |
| % CTR URL Payment | Jumlah user yang click URL pada konfirmasi credit limit |
| % QRIS Scanned | Jumlah user yang scan QRIS pada konfirmasi credit limit |
| % Payment Success | Jumlah user yang sukses melakukan payment melalui URL / Jumlah user yang visit payment page |
| # Paid User | Jumlah user yang sukses melakukan pembayaran |
| % Paid User | Jumlah user yang sukses melakukan pembayaran / Jumlah user yang sukses menggunakan wulan.ai |

### Negative Metrics Indicator

| Metrics | Definition |
|---------|------------|
| # Dormant User | Jumlah user yang credit limit namun tidak melakukan perpanjangan |
| # Inactive User | Jumlah user yang sukses landed di WA Wulan NAMUN tidak melakukan interaksi chat |

### Technical Metrics Indicator

| Metrics | Definition |
|---------|------------|
| # Cron Created | Jumlah user request cron (reminder) |
| # Cron Running | Jumlah cron yang dikirimkan system per hari |
| % Cron Success Rate | Jumlah cron sukses dikirimkan / Jumlah cron yang terschedule |
| # Memorize request | Jumlah request notes/memorize per hari |
| # Memorize callback | Jumlah callback request notes |
| % Memorize callback success | Jumlah callback request notes yang berhasil dikirimkan / Jumlah callback request notes |

---

## E. User Story

### 1. Visitor bisa melakukan REGISTER

**As Visitor, saya dapat REGISTER akun Wulan.ai.**

**Acceptance Criteria:**
- Visitor dapat mengakses website
- Visitor dapat click CTA button dan redirect register page
- Visitor dapat click REGISTER button di register page
- User dapat sukses link google linked dalam proses registrasi

**Metrics:**
- #Website Visitor
- #Website Unique Visitor
- % CTR button on homepage
- % CTR Register
- % Register Success Rate (USER CVR)

**Design:** Homepage with Wulan.ai branding, pink/purple gradient, "Try now for free" CTA. Register page with "Daftar" card and "Continue with Google" button. Google sign-in "Choose an account" screen.

---

### 2. User dapat mengisi profile dan ngobrol pertama kali dengan WULAN

**As User, saya dapat mengisi profile saya sebagai informasi AI assistance Wulan.**

**Acceptance Criteria:**
- User dapat mengisi 4 field (mandatory):
  - Nama Lengkap
  - Nama Panggilanmu
  - No WhatsApp
  - Lokasimu

**Design:** "Lengkapi Profilmu — Agar Wulan bisa mulai membantumu di WhatsApp" form with fields:
- Nama Lengkap → "Tulis nama lengkapmu"
- Nama Panggilanmu → "Wulan akan panggil kamu"
- No WhatsApp → "e.g. 08123456789"
- Lokasimu → "Kota, untuk pengingat waktu shalatmu"
- CTA: "Sambungkan WhatsApp Wulan"

---

**As User, saya dapat memulai ngobrol dengan Wulan melalui WhatsApp.**

**Acceptance Criteria:**
- User dapat click CTA "sambungkan Whatsapp" di onboarding page
- User mendapatkan akses redirection page WhatsApp official
- User dapat mengakses WhatsApp Wulan
- User dapat first template chat: *"Halo [nick name], kenalin aku Wulan dan mulai hari ini aku akan menjadi AI asisten pribadimu"*
- User dapat mengirimkan chat template pertama melalui WhatsApp

**Metrics:**
- % CTR link WhatsApp
- WhatsApp DAU (Wulan DAU)

**Design:** WhatsApp redirection page with "Chat on WhatsApp with +62 821-5144-788" "Continue to chat" button. WhatsApp Wulan chat interface showing first template message: "Halo Mas Reska, kenalin aku Wulan dan mulai hari ini aku akan menjadi AI asisten pribadimu".

---

### 3. User dapat reminder Shalat 5 waktu

**As User, saya mendapatkan konfirmasi pertama kali untuk jadwal shalat 5 waktu sesuai dengan area saya tinggal.**

**Acceptance Criteria:**
- User dapat konfirmasi list jadwal shalat 5 waktu, sesuai lokasi
- User dapat mengubah lokasi melalui chat WA

**Design (example chat):**
> User: "aku lagi di Lawang Malang, ubah jadwal shalat 5 waktuku"
>
> Wulan: "Siap Mas Reska ✓
> Wulan sudah update jadwal shalat untuk wilayah Lawang, Malang hari ini (18 Maret 2026):
> - Dzuhur — 11:27 WIB
> - Ashar — 14:55 WIB
> - Maghrib — 17:41 WIB
> - Isya — 18:50 WIB
> (Subuh sudah lewat tadi pagi)
> Wulan sudah set pengingat otomatis, nanti Wulan kabari lewat WA tiap masuk waktu shalat ya 🙏
> Selamat beraktivitas di Lawang, Mas!"

---

### 4. User dapat membuat reminder

**As User, saya dapat membuat jadwal dan reminder sesuai dengan aktivitas dan kebutuhan saya.**

**Acceptance Criteria:**
- User dapat meminta Wulan untuk membuat jadwal baru, dan mengingatkan saya sesuai dengan request yang saya minta
  - *Example: "Wulan tolong tambahkan jadwal meeting saya dengan Sales jam 3 sore ini."*
- User dapat meminta Wulan untuk membuat pengingat setiap hari untuk kebutuhan saya
  - *Example: "Wulan ingatkan saya untuk Daily Workout setiap jam 5.45 pagi, ingatkan saya setiap hari ya!"*

---

### 5. User dapat meminta mencatat (memorize)

**As User, saya dapat mencatat apapun dan meminta wulan untuk mengingatkan saya tentang isi catatan tersebut.**

**Acceptance Criteria:**
- User dapat meminta Wulan mencatat notes sesuai dengan kebutuhan saya
  - *Example:*
    > Catat untuk ide Laju
    > - Research Website revamp
    > - Research competitor for CS MVP Laju
    > - Research Pricing Competitor

---

### 6. User dapat notifikasi credit hampir HABIS

**As User, saya dapat mendapatkan informasi bahwa credit AI Wulan akan segera habis.**

**Acceptance Criteria:**
- User dapat menerima informasi kredit sebelum kredit tersebut HABIS
- User dapat menerima LINK topup/pembayaran Wulan
- User dapat redirect ke payment page saat click URL pembayaran di WhatsApp

**Metrics:**
- #User credit limit
- #User receives WA credit limit (URL & QRIS)
- % CTR URL Payment
- % QRIS Scanned
- % Payment Success
- % Paid User

**Design:** WhatsApp notification: "Sebagai informasi, credit hampir habis. Kamu bisa bayar melalui link ini Wulan.ai/payment". Redirects to pricing page: "Wulan membantu kamu tetap produktif tanpa perlu khawatir biaya yang tinggi":
- **Starter** — Rp 29.900/month
- **Popular** (highlighted) — Rp 49.900/month
- **Premium** — Rp 119.900/month

---

## F. Wulan — Expected Behaviour

Sebagai AI assistance, Wulan harus memenuhi sifat yang mendekati AI Human:

1. Wulan harus mengirimkan text sesingkat mungkin, tanpa perlu basa-basi
2. Wulan harus bisa merespons dan menjawab user dengan cepat **<20 seconds**
3. Wulan harus mengingatkan shalat sesuai dengan request user, tanpa terlambat sedikitpun
4. Wulan harus mengingatkan USER REMINDER sesuai dengan content, dan waktu yang user minta
5. Wulan harus dapat **MENCATAT-MENGINGAT-MENGIRIMKAN NOTES** user, secara lengkap dan **TIDAK dalam bentuk SUMMARY**
6. Wulan dapat menjawab apapun mengenai Quran, dan surah
7. Wulan tidak boleh memberikan chat yang berhubungan dengan Teknikal/sistem Wulan
8. Wulan tidak boleh mengirimkan chat/balesan apapun yang tidak berhubungan dengan pertanyaan/permintaan user

---

# PART 2 — PITCH DECK

**Title:** WULAN.AI
**Date:** March 2026

## Product Overview

Wulan adalah asisten pribadi Muslim berbasis AI yang hadir di WhatsApp. Melalui pesan atau catatan suara, pengguna bisa dengan mudah membuat, mengelola jadwal/reminder, membuat dan mengingat catatan sehari-hari.

### Visi
Mengoptimalkan produktivitas Muslim untuk kehidupan dunia dan akhirat.
*Empowering Muslims to be productive in both worldly life and the hereafter.*

### Misi
Menyediakan asisten pribadi berbasis AI di WhatsApp yang membantu Muslim mengelola tugas, jadwal, pengingat, dan aktivitas harian dengan mudah.

---

## Competitor Analysis

| Brand | Website | Product Proposition | Investment | # Customer | Pricing |
|-------|---------|---------------------|------------|------------|---------|
| **Zapia** | Zapia \| The Personal A… | AI Executive Assistant Across Latin America | $5.1M Seed (Aug 2023); $7.25M Seed (Apr 2025); $7M Seed extension (9 Mar 2026). **Total $19.3 million** | > 6 million (2020–2026) | Seems freemium, pricing not yet found |
| **Memorae** | https://memorae.ai/ | AI-powered personal assistant that works within WhatsApp. Allows users to create, manage, and receive reminders, tasks, calendars, and lists seamlessly via messages or voice notes. Google Calendar sync and media-based task input supported. | Unfunded | > 85,000 (2025–2026) | Origin 130,000 IDR; Supernova 260,000 IDR; Big Bang 780,000 IDR (monthly pricing) |

---

## Fitur Wulan (Product Features)

### Core Features
| Feature | Description |
|---------|-------------|
| **Schedule Messages** | Write it on Sunday, Send it on Monday |
| **Automatic Transcription** | Your audios, in text Automatically |
| **Reminder Push** | Schedule Reminders on WhatsApp |
| **Notes Memorize** | Share your notes, Wulan Memorize it |

### Advanced Features
| Feature | Tier | Description |
|---------|------|-------------|
| **Personalized Assistance** | — | Create your own assistance persona |
| **Calendar Connect** | — | Handle the repetitive tasks so your day stays simple |
| **Life Assistance** | Premium | AI Agent Assistant accompany your day |
| **Business Copilot** | Enterprise | Connect your business. Get the report on WhatsApp |

### Mobile App Features
| Feature | Platform |
|---------|----------|
| **Petunjuk Arah Kiblat** | Mobile App |
| **Realtime Pengingat Waktu Ibadah** | Mobile App |
| **Al-Quran Digital** | Mobile App |
| **Hafalan Surah** | Mobile App |

---

## Usecase Wulan

| Usecase | Tier |
|---------|------|
| Pengingat Shalat & Waktu Ibadah | Gratis |
| Asisten Produktivitas Harian | Populer |
| Unlimited Reminders | Populer |
| Pencatat Kebutuhanmu | Populer |
| Quotes Motivasimu | Populer |
| Integrasi dengan Google Calendar | Premium |
| Sahabat AI-mu | Premium |
| Asisten Keuanganmu | Premium |
| Asisten Bisnismu/Pekerjaanmu | Enterprise |

---

## Pricing Plan

| Plan | Price | Features |
|------|-------|----------|
| **Gratis** | FREE | • Pengingat Shalat & Waktu Ibadah (FOREVER)<br>• Pengingat Harian (Limited)<br>• Mencatat kebutuhanmu (Limited)<br>• CTA: Coba Gratis Sekarang |
| **Populer** | IDR 49.900 / bulan | • Pengingat Shalat & Waktu Ibadah<br>• Pengingat Harian (Unlimited)<br>• Mencatat kebutuhanmu (Unlimited)<br>• Asisten Produktivitas Harian<br>• Quotes setiap hari untukmu<br>• Teman Diskusi Quranmu |
| **Premium** | IDR 89.900 / bulan | All Populer features +<br>• Integrasi dengan Google calendar<br>• Menjadi sahabat AI-mu, kita ngobrol lebih dalam |
| **Enterprise** | IDR 199.900 / bulan | All Premium features +<br>• Business Copilot (Gsheet, Excel Sheet) |

---

## User Acquisition Strategy

Wulan akan fokus conversion new user mencoba secara **GRATIS**. Wulan akan menyediakan **free credit max IDR 3,000** dan encourage user untuk mencoba 3 usecase yang paling berdampak:

1. Pengingat Shalat & Waktu Ibadah
2. Pengingat Harian (Limited)
3. Mencatat kebutuhanmu (Limited)

Wulan akan memberikan reminder kepada user bahwa:

> *"Terima kasih sudah memperkerjakan Wulan, namun Credit Wulan akan segera habis, jika kamu ingin Wulan terus mendampingi harimu, top up credit Wulan disini"*

User akan redirect ke halaman pricing plan, dan kita encourage untuk memilih **Populer plan dengan slashed price (diskon)**.

---

## Market Size — Muslim Indonesia

### TAM — Total Addressable Market — **IDR 2.0 T**
Muslim Digital Professionals, all genders, tinggal di urban / tier 1–2 cities, usia 22–40, white collar / entrepreneur / professional, heavy WhatsApp users.
**Total: 40 juta Muslim di Indonesia**

### SAM — Serviceable Available Market — **IDR 1.0 T**
Digital native, income > Rp5 juta/bulan (OMR), WhatsApp daily users.
**Total: 20 juta Muslim di Indonesia**

### SOM — Serviceable Obtainable Market — **IDR 10 Bio**
Target segment paling realistis untuk early traction: startup employee, consultant, founder, muslim professional, young parents — hanya sekitar 5–10% dari SAM.
**1% of SAM → 200,000 Muslim di Indonesia**

---

## Target Wulan 2026

Growth ladder:

1 → 10 → 100 → 1,000 → 10,000 → 100,000 paid user → **200,000 paid user**

---

## Business Model Wulan.ai

| Stage | Plans Available | Strategy |
|-------|-----------------|----------|
| **MVP** | Coba Gratis Sekarang + IDR 49.900/bulan | Fokus untuk meningkatkan conversion new user mencoba secara GRATIS. Untuk Paid customer, Wulan menyediakan pricing plan 1 bulan subscription only. Jika di tengah bulan user credit sudah habis, user dapat Top up perbulan dengan harga yang sama, dan expiry date-nya akan diperpanjang +31 hari dari tanggal tersebut. |
| **Phase 1** | Coba Gratis Sekarang + IDR 49.900/bulan | Continued conversion focus |
| **Phase 2** | Gratis + IDR 49.900 + IDR 89.900/bulan | Wulan menyediakan plan baru PREMIUM dan subscribe per 3 bulan |
| **Phase 3** | Gratis + IDR 49.900 + IDR 89.900 + IDR 199.900/bulan | Wulan menyediakan plan baru ENTERPRISE dan akan melihat adoption dan user feedback untuk plan 3 bulan subscription |

---

## Kalkulasi Margin Wulan

| Stage | Margin Strategy |
|-------|-----------------|
| **MVP** | Wulan akan mengambil margin sekecil mungkin atau minimal menutupi biaya free trial. **IDR 3k – 5K / user / bulan** |
| **Phase 1** | Wulan akan analisa % conversion dari GRATIS → PAID + user feedback pada MVP. Wulan akan menaikan margin minimal **IDR 10K / user / bulan** dengan catatan harga final stabil < IDR 50k / user / bulan |
| **Phase 2** | Insya Allah hasil Phase 1 sesuai dengan ekspektasi. Wulan akan release PREMIUM dan 3 bulan subscription. **PREMIUM: Margin Lebih tebal. 3 bln Subs: Less Margin, mendapatkan loyal user** |
| **Phase 3** | Wulan fokus untuk melebarkan market yang memiliki usecase "Membutuhkan Quick Report". Potensi: High Profile Profesional, Bisnis Owner, IRT (Menteri Keuangan) |

> *"Wulan focus on product market fit and natural growth"*
> *Wulan will create business projection later!*

---

## Future Business Opportunity

**Target: Free User — 200,000 Muslim di Indonesia**

Revenue streams:

1. **Paid User Subscription** — Aset: AI agent Assistance, Mobile App dengan fitur pendukung keseharian Muslim Indonesia (arah kiblat, jadwal shalat, Al-Quran digital, dan fitur lainnya)

2. **Muslim Brand Collaboration** — Memanfaatkan aset user based Muslim yang besar, brand dapat mengirimkan targeted dan personalized marketing promosi, produk baru, diskon dll.

3. **General Brand Collaboration** — Same as above but non-Muslim-specific brands

---

# PART 3 — BRAND STRATEGY (Wulan.ai)

## Brand Icon and Logo

### Wulan, si kucing putih

Wulan digambarkan sebagai **kucing putih yang lucu, ramah, dan penuh energi positif**. Karakter ini sering tampil dengan berbagai pakaian dan gaya yang berbeda, mencerminkan fleksibilitas Wulan sebagai asisten yang dapat menyesuaikan diri dengan berbagai kebutuhan dan momen dalam kehidupan penggunanya.

---

## wulan.ai — Key Message

- **ASISTEN PRIBADI MENGINGATKAN**
- **Bantu mengingat semua hal**
- **MUDAH**
- **Mencatat semua keperluan**
- **NOTES TAKER**
- **ASISTEN PINTAR SHALAT**
- **Asisten Quran**
- **LEBIH PRODUKTIF**
- **ASISTEN WHATSAPP**

---

## Brand Person

**Julia Hapsari** (juga dikenal sebagai **Joel Almahira**) adalah **Co-Founder dari Wulan.ai**. Ia adalah seorang book reviewer dan book content creator yang aktif membangun percakapan tentang produktivitas, pembelajaran, dan pengembangan diri melalui platform digital. Saat ini ia memiliki **lebih dari 1.500 pengikut di Instagram** dan membangun komunitas pecinta buku dengan **lebih dari 800 anggota**.

Sebelum mendirikan Wulan, Julia memiliki pengalaman panjang di bidang brand, marketing, dan business growth. Ia menjabat sebagai **Chief Marketing Officer (CMO)** di sebuah perusahaan retail di Indonesia, memimpin strategi brand dan pertumbuhan bisnis. Julia adalah lulusan **Fakultas Ekonomi dan Bisnis Universitas Indonesia (FEB UI)**.

Melalui Wulan.ai, Julia membawa visi untuk membangun AI assistant yang membantu Muslim menjadi lebih produktif dalam kehidupan dunia dan akhirat.

Sebagai Co-Founder, Julia mengambil peran aktif sebagai **front figure** dalam membangun brand Wulan, memperkenalkan produk melalui pendekatan komunitas dan jaringan yang telah ia bangun selama bertahun-tahun. Ia memanfaatkan komunitas literasi, jaringan alumni universitas, serta komunitas pengajian yang ia ikuti sebagai jalur awal untuk memperkenalkan Wulan kepada lebih banyak pengguna.

Bagi Julia, Wulan bukan sekadar produk teknologi, tetapi sebuah platform yang membantu Muslim mengelola hidup dengan lebih terarah, produktif, dan bermakna.

---

## Keyword Highlighted

**Persona keywords:**
- Woman in Tech
- Muslim Tech Founder
- Business Woman
- Startup Founder
- AI Entrepreneur

**Brand theme keywords:**
- AI for Muslim Productivity
- Faith & Technology
- Purpose-driven Technology
- Productivity for Dunia & Akhirat

---

## Contact

**Website:** https://wulan.ai

---

*Terima Kasih*
