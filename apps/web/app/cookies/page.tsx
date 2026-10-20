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
      items: [
        {
          type: "paragraph",
          key: "cookies-en-choices-intro",
          content:
            "You can accept or decline campaign analytics, or withdraw previously granted consent at any time. When consent is withdrawn, all client-side tracking immediately ceases and stored anonymous identifiers are deleted.",
        },
        {
          type: "interactive",
          key: "cookies-en-choices-control",
          component: (
            <AnalyticsPreferencesControl key="cookies-pref-control-en" />
          ),
        },
        {
          type: "paragraph",
          key: "cookies-en-choices-outro",
          content:
            "You can also use browser controls to block or delete cookies and site storage at any time.",
        },
      ],
    },
    {
      title: "7. Changes and privacy information",
      paragraphs: [
        <React.Fragment key="cookies-en-changes-privacy-link">
          This policy will be updated if the site's tracking stack changes. For
          personal-data handling, providers, retention and privacy rights, see
          the <Link href="/privacy">Privacy Policy</Link>.
        </React.Fragment>,
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
      items: [
        {
          type: "paragraph",
          key: "cookies-ms-choices-intro",
          content:
            "Anda boleh menerima atau menolak analitik kempen, atau menarik balik persetujuan yang diberikan sebelum ini pada bila-bila masa. Apabila persetujuan ditarik balik, semua penjejakan klien berhenti serta-merta dan pengenal tanpa nama dipadamkan.",
        },
        {
          type: "interactive",
          key: "cookies-ms-choices-control",
          component: (
            <AnalyticsPreferencesControl key="cookies-pref-control-ms" />
          ),
        },
        {
          type: "paragraph",
          key: "cookies-ms-choices-outro",
          content:
            "Anda juga boleh menggunakan kawalan pelayar untuk menyekat atau memadam kuki dan storan laman pada bila-bila masa.",
        },
      ],
    },
    {
      title: "7. Perubahan dan maklumat privasi",
      paragraphs: [
        <React.Fragment key="cookies-ms-changes-privacy-link">
          Dasar ini akan dikemas kini jika susunan penjejakan laman berubah.
          Untuk pengendalian data peribadi, penyedia, penyimpanan dan hak
          privasi, lihat <Link href="/privacy">Dasar Privasi</Link>.
        </React.Fragment>,
      ],
    },
  ];

  const chineseSections: LegalSection[] = [
    {
      title: "1. 当前 Cookie 立场 (Current cookie position)",
      paragraphs: [
        "KHLIM 仅使用维护身份验证会话、保护表单安全以及记住语言选择等界面偏好所绝对必要的浏览器存储及 Cookie。",
        "针对 2026 年 10 月 24 日的 3x3 篮球赛事活动，KHLIM 亦提供基于 PostHog（美国云端，项目 ID 652783）的可选、注重隐私保护的分析集成，以统计访客路径。该追踪默认关闭，仅在您明确同意后运行。",
        "本站绝未部署任何广告像素、跨站营销追踪程序或第三方行为广告 Cookie。",
      ],
    },
    {
      title: "2. 绝对必要的运行技术 (Strictly necessary technologies)",
      paragraphs: [
        "必要的 Cookie 或浏览器存储技术用于维持您的登录状态、保护已认证请求、维护安全状态、记录语言/界面偏好或保留简短的工作流程状态。若阻止这些技术，可能会导致登录或其他请求的功能无法正常运行。",
      ],
    },
    {
      title: "3. 错误监控机制 (Error monitoring)",
      paragraphs: [
        "在启用 Sentry 时，KHLIM 仅将其用于技术故障与错误监控，绝不用于行为广告投放。浏览器端配置已关闭默认个人身份信息（PII）传输及性能追踪。错误报告可能仍包含诊断故障所必需的技术元数据，关于 Sentry 的使用亦已在《隐私政策》中详述。",
      ],
    },
    {
      title: "4. 第三方支付页面 (Third-party payment pages)",
      paragraphs: [
        "若您继续进行付款，您可能会被重定向至 Billplz 或其他经指明的支付服务提供商。第三方网站可能根据其自身的隐私/Cookie 条款使用其自有的 Cookie 或存储技术。KHLIM 无法控制第三方提供商域名上设置的 Cookie。",
      ],
    },
    {
      title:
        "5. 营销活动分析与选择性同意控制 (Campaign analytics and opt-in consent controls)",
      paragraphs: [
        "针对 10 月 24 日 3x3 活动的分析追踪纯属选择性加入（opt-in），且默认保持关闭状态。PostHog 客户端配置禁用了自动抓取（autocapture）、会话录制、热图及自动身份识别，并明确禁止了用户画像与地理位置查询。记录的事件仅包含最小化、非识别性的营销活动标识及干净的页面路径，绝不传输完整 URL 或原始查询参数。分析事件绝不收集或传输监护人或未成年人的姓名、电话号码、电子邮件地址或表单中的自由文本内容。",
        "数据处理在 PostHog 美国云端执行，并严格遵循隐私评估及马来西亚《个人数据保护法》（PDPA）的跨境数据保障要求。您可随时通过下方偏好控制面板或同意横幅更改或撤回您的选择。",
      ],
    },
    {
      title: "6. 您的选择与同意偏好 (Your choices and consent preferences)",
      items: [
        {
          type: "paragraph",
          key: "cookies-zh-choices-intro",
          content:
            "您可以随时接受或拒绝营销活动分析，或撤回此前授予的同意。撤回同意后，所有客户端追踪将立即停止，所存储的匿名标识符将被清除。",
        },
        {
          type: "interactive",
          key: "cookies-zh-choices-control",
          component: (
            <AnalyticsPreferencesControl key="cookies-pref-control-zh" />
          ),
        },
        {
          type: "paragraph",
          key: "cookies-zh-choices-outro",
          content:
            "您也可以随时使用浏览器内置控制功能阻止或删除 Cookie 及网站存储数据。",
        },
      ],
    },
    {
      title: "7. 政策变更与隐私信息 (Changes and privacy information)",
      paragraphs: [
        <React.Fragment key="cookies-zh-changes-privacy-link">
          若网站的技术架构或追踪设置发生变化，本政策将相应更新。有关个人数据处理、服务商、数据保留及您的隐私法定权利，请参阅{" "}
          <Link href="/privacy">隐私政策 (Privacy Policy)</Link>。
        </React.Fragment>,
      ],
    },
  ];

  return (
    <LegalDocument
      title="Cookie Policy"
      malayTitle="Dasar Kuki"
      chineseTitle="Cookie 政策"
      effectiveDate={EFFECTIVE_DATE}
      englishIntro="This policy explains the cookies, browser storage and similar technologies used by the KHLIM website. It is intentionally specific to the current implementation rather than describing trackers that are not actually installed."
      malayIntro="Dasar ini menerangkan kuki, storan pelayar dan teknologi serupa yang digunakan oleh laman KHLIM. Ia sengaja menerangkan pelaksanaan semasa dan tidak menyenaraikan penjejak yang sebenarnya tidak dipasang."
      chineseIntro="本政策说明 KHLIM 网站使用的 Cookie、浏览器存储及类似技术。内容针对当前实际技术部署进行具体阐述，绝不虚构未实际安装的追踪程序。"
      englishSections={englishSections}
      malaySections={malaySections}
      chineseSections={chineseSections}
    />
  );
}
