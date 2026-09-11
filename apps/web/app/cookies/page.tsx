import React from "react";
import Link from "next/link";
import {
  LegalDocument,
  type LegalSection,
} from "../../components/legal/legal-document";

const EFFECTIVE_DATE = "11 September 2026";

export default function CookiePolicyPage() {
  const englishSections: LegalSection[] = [
    {
      title: "1. Current cookie position",
      paragraphs: [
        "The current KHLIM web build is designed without advertising pixels, behavioural advertising cookies, Google Analytics, Meta Pixel, Hotjar, Mixpanel or similar non-essential marketing analytics. KHLIM therefore does not currently display a cookie-consent banner merely for the sake of showing one.",
        "Authentication/session mechanisms, security controls and local interface preferences may still use cookies or browser storage where they are necessary to provide the feature you request.",
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
      title: "5. When consent controls will be added",
      paragraphs: [
        "KHLIM must introduce an appropriate consent/preferences mechanism before intentionally enabling non-essential analytics, advertising pixels, cross-site marketing trackers or third-party embeds that require prior consent in a relevant jurisdiction. Non-essential tracking should default to off until the required choice is obtained, and users should be able to change that choice later.",
        "If the service begins targeting or materially monitoring users in jurisdictions with stricter cookie/ePrivacy rules, the consent implementation must be reassessed for those users before the relevant tracking is enabled.",
      ],
    },
    {
      title: "6. Your choices",
      paragraphs: [
        "You can use browser controls to block or delete cookies and site storage. Doing so may sign you out or stop essential features from working. Because the current build does not intentionally use non-essential marketing cookies, there is no separate marketing-cookie toggle at this time.",
      ],
    },
    {
      title: "7. Changes and privacy information",
      paragraphs: [
        <>
          This policy will be updated if the site's tracking stack changes. For
          personal-data handling, providers, retention and privacy rights, see the{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </>,
      ],
    },
  ];

  const malaySections: LegalSection[] = [
    {
      title: "1. Kedudukan kuki semasa",
      paragraphs: [
        "Binaan web KHLIM semasa direka tanpa piksel iklan, kuki pengiklanan tingkah laku, Google Analytics, Meta Pixel, Hotjar, Mixpanel atau analitik pemasaran tidak perlu yang serupa. Oleh itu KHLIM pada masa ini tidak memaparkan banner persetujuan kuki semata-mata untuk mempunyai banner.",
        "Mekanisme pengesahan/sesi, kawalan keselamatan dan pilihan antara muka tempatan masih boleh menggunakan kuki atau storan pelayar jika diperlukan untuk menyediakan ciri yang anda minta.",
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
      title: "5. Bila kawalan persetujuan akan ditambah",
      paragraphs: [
        "KHLIM hendaklah memperkenalkan mekanisme persetujuan/pilihan yang sesuai sebelum sengaja mengaktifkan analitik tidak perlu, piksel iklan, penjejak pemasaran rentas laman atau benaman pihak ketiga yang memerlukan persetujuan awal dalam bidang kuasa berkaitan. Penjejakan tidak perlu hendaklah dimatikan secara lalai sehingga pilihan yang diperlukan diperoleh, dan pengguna hendaklah boleh mengubah pilihan kemudian.",
        "Jika perkhidmatan mula menyasarkan atau memantau pengguna secara material dalam bidang kuasa dengan peraturan kuki/ePrivasi yang lebih ketat, pelaksanaan persetujuan hendaklah dinilai semula bagi pengguna tersebut sebelum penjejakan berkaitan diaktifkan.",
      ],
    },
    {
      title: "6. Pilihan anda",
      paragraphs: [
        "Anda boleh menggunakan kawalan pelayar untuk menyekat atau memadam kuki dan storan laman. Tindakan ini boleh melog keluar anda atau menghentikan ciri penting. Oleh sebab binaan semasa tidak sengaja menggunakan kuki pemasaran tidak perlu, tiada suis kuki pemasaran berasingan pada masa ini.",
      ],
    },
    {
      title: "7. Perubahan dan maklumat privasi",
      paragraphs: [
        <>
          Dasar ini akan dikemas kini jika susunan penjejakan laman berubah. Untuk
          pengendalian data peribadi, penyedia, penyimpanan dan hak privasi, lihat{" "}
          <Link href="/privacy">Dasar Privasi</Link>.
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
