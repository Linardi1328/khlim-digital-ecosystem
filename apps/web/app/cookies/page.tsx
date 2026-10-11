import React from "react";
import Link from "next/link";
import {
  LegalDocument,
  type LegalSection,
} from "../../components/legal/legal-document";
import { AnalyticsPreferencesControl } from "../../components/legal/analytics-preferences-control";

const EFFECTIVE_DATE = "11 October 2026";

export default function CookiePolicyPage() {
  const englishSections: LegalSection[] = [
    {
      title: "1. Current cookie position",
      paragraphs: [
        "KHLIM uses strictly necessary browser storage and cookies to maintain authenticated sessions, secure forms, and remember interface preferences like language choice.",
        "For the 24 October 2026 3x3 Basketball event campaign, KHLIM also provides an optional, privacy-focused analytics integration powered by PostHog (US Cloud, Project ID 652783) to measure campaign visitor journeys. This tracking is off by default and only operates with your explicit consent.",
        "No advertising pixels, cross-site marketing trackers, or third-party behavioral ad cookies are deployed.",
      ],
    },
    {
      title: "2. Strictly necessary technologies",
      paragraphs: [
        "Essential cookies or browser storage may be used to keep you signed in, protect authenticated requests, maintain security state, remember a language/interface choice or preserve short-lived workflow state. Blocking these technologies may prevent login or other requested features from working correctly.",
      ],
    },
    {
      title: "3. Error monitoring",
      paragraphs: [
        "Where Sentry is enabled, KHLIM uses it for technical error monitoring rather than behavioural advertising. The browser configuration disables default PII transmission and performance tracing. Error reports may still contain technical metadata necessary to diagnose failures, so Sentry use is also described in the Privacy Policy.",
      ],
    },
    {
      title: "4. Third-party payment pages",
      paragraphs: [
        "If you proceed to payment, you may be redirected to Billplz or another identified payment provider. That third-party site may use its own cookies or storage under its own privacy/cookie terms. KHLIM does not control cookies set on a third-party provider's domain.",
      ],
    },
    {
      title: "5. Campaign analytics and opt-in consent controls",
      paragraphs: [
        "Analytics tracking for the 24 Oct 3x3 campaign is strictly opt-in and off by default. PostHog client configuration disables autocapture, session recordings, heatmaps, and automatic identification, and explicitly suppresses person profiles and geolocation lookups. Events record only minimal, non-identifying campaign tokens and clean route paths without transmitting full URLs or raw query strings. Analytics events never collect or transmit guardian or child names, phone numbers, email addresses, or free-text form contents.",
        "Data is processed in PostHog US Cloud subject to privacy assessment and PDPA cross-border safeguards. You may change or withdraw your choice at any time using the preferences control below or the consent banner.",
      ],
    },
    {
      title: "6. Your choices and consent preferences",
      paragraphs: [
        "You can accept or decline campaign analytics, or withdraw previously granted consent at any time. When consent is withdrawn, all client-side tracking immediately ceases and stored anonymous identifiers are deleted.",
        <AnalyticsPreferencesControl key="pref-en" />,
        "You can also use browser controls to block or delete cookies and site storage at any time.",
      ],
    },
    {
      title: "7. Changes and privacy information",
      paragraphs: [
        <>
          This policy will be updated if the site's tracking stack changes. For
          personal-data handling, providers, retention and privacy rights, see
          the <Link href="/privacy">Privacy Policy</Link>.
        </>,
      ],
    },
  ];

  const malaySections: LegalSection[] = [
    {
      title: "1. Kedudukan kuki semasa",
      paragraphs: [
        "KHLIM menggunakan storan pelayar dan kuki yang benar-benar diperlukan untuk mengekalkan sesi berautentikasi, melindungi borang dan mengingati pilihan antara muka seperti bahasa.",
        "Bagi kempen acara Bola Keranjang 3x3 24 Oktober 2026, KHLIM juga menyediakan integrasi analitik pilihan yang mementingkan privasi menggunakan PostHog (US Cloud, ID Projek 652783) untuk mengukur perjalanan pengunjung kempen. Penjejakan ini dimatikan secara lalai dan hanya beroperasi dengan persetujuan jelas anda.",
        "Tiada piksel iklan, penjejak pemasaran rentas laman atau kuki iklan tingkah laku pihak ketiga yang dipasang.",
      ],
    },
    {
      title: "2. Teknologi yang benar-benar diperlukan",
      paragraphs: [
        "Kuki penting atau storan pelayar boleh digunakan untuk mengekalkan log masuk, melindungi permintaan berautentikasi, mengekalkan status keselamatan, mengingati pilihan bahasa/antara muka atau menyimpan status aliran kerja sementara. Menyekat teknologi ini boleh menyebabkan log masuk atau ciri yang diminta tidak berfungsi dengan betul.",
      ],
    },
    {
      title: "3. Pemantauan ralat",
      paragraphs: [
        "Jika Sentry diaktifkan, KHLIM menggunakannya untuk pemantauan ralat teknikal dan bukan pengiklanan tingkah laku. Konfigurasi pelayar mematikan penghantaran PII lalai serta penjejakan prestasi. Laporan ralat masih boleh mengandungi metadata teknikal yang diperlukan untuk mendiagnosis kegagalan, maka penggunaan Sentry turut diterangkan dalam Dasar Privasi.",
      ],
    },
    {
      title: "4. Halaman pembayaran pihak ketiga",
      paragraphs: [
        "Jika anda meneruskan pembayaran, anda mungkin dialihkan ke Billplz atau penyedia pembayaran lain yang dikenal pasti. Laman pihak ketiga itu mungkin menggunakan kuki atau storan sendiri di bawah terma privasi/kukinya. KHLIM tidak mengawal kuki yang ditetapkan pada domain penyedia pihak ketiga.",
      ],
    },
    {
      title: "5. Analitik kempen dan kawalan persetujuan pilihan",
      paragraphs: [
        "Penjejakan analitik bagi kempen 3x3 24 Okt adalah berasaskan persetujuan pilihan dan dimatikan secara lalai. Konfigurasi klien PostHog mematikan tangkapan automatik (autocapture), rakaman sesi, peta haba dan pengenalan automatik, serta menyekat penciptaan profil peribadi dan carian geolokasi. Acara analitik hanya merekodkan token kempen minimum yang tidak mengenal pasti dan laluan laman bersih tanpa menghantar URL penuh atau parameter pertanyaan mentah. Ia tidak sekali-kali mengumpul atau menghantar nama penjaga atau anak, nombor telefon, alamat e-mel atau kandungan teks borang.",
        "Data diproses di PostHog US Cloud tertakluk kepada penilaian privasi dan perlindungan rentas sempadan PDPA. Anda boleh mengubah atau menarik balik pilihan anda pada bila-bila masa menggunakan kawalan pilihan di bawah atau banner persetujuan.",
      ],
    },
    {
      title: "6. Pilihan anda dan keutamaan persetujuan",
      paragraphs: [
        "Anda boleh menerima atau menolak analitik kempen, atau menarik balik persetujuan yang diberikan sebelum ini pada bila-bila masa. Apabila persetujuan ditarik balik, semua penjejakan klien berhenti serta-merta dan pengenal tanpa nama dipadamkan.",
        <AnalyticsPreferencesControl key="pref-ms" />,
        "Anda juga boleh menggunakan kawalan pelayar untuk menyekat atau memadam kuki dan storan laman pada bila-bila masa.",
      ],
    },
    {
      title: "7. Perubahan dan maklumat privasi",
      paragraphs: [
        <>
          Dasar ini akan dikemas kini jika susunan penjejakan laman berubah.
          Untuk pengendalian data peribadi, penyedia, penyimpanan dan hak
          privasi, lihat <Link href="/privacy">Dasar Privasi</Link>.
        </>,
      ],
    },
  ];

  return (
    <LegalDocument
      title="Cookie Policy"
      malayTitle="Dasar Kuki"
      effectiveDate={EFFECTIVE_DATE}
      englishIntro="This policy explains the cookies, browser storage and similar technologies used by the KHLIM website. It is intentionally specific to the current implementation rather than describing trackers that are not actually installed."
      malayIntro="Dasar ini menerangkan kuki, storan pelayar dan teknologi serupa yang digunakan oleh laman KHLIM. Ia sengaja menerangkan pelaksanaan semasa dan tidak menyenaraikan penjejak yang sebenarnya tidak dipasang."
      englishSections={englishSections}
      malaySections={malaySections}
    />
  );
}
