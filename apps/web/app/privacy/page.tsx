import React from "react";
import Link from "next/link";
import {
  LegalDocument,
  type LegalSection,
} from "../../components/legal/legal-document";
import {
  formatRegisteredBusinessName,
  getPublicBusinessDetails,
} from "../../lib/business-details";

const EFFECTIVE_DATE = "11 October 2026";

export default function PrivacyPage() {
  const business = getPublicBusinessDetails();
  const registeredCompany = formatRegisteredBusinessName(business);
  const contact = business.email || "the contact form";
  const contactPhone =
    business.phone ||
    "the telephone number shown in the website footer when configured";
  const contactZh = business.email || "联络表格";
  const contactPhoneZh = business.phone || "网站页脚中配置的电话号码";

  const englishSections: LegalSection[] = [
    {
      title: "1. Who controls your personal data",
      paragraphs: [
        <React.Fragment key="privacy-en-s1-controller-contact-link">
          {registeredCompany} ("KHLIM", "we", "us") is the data controller for
          personal data collected through this website, academy enrolment and
          the member portal. The contact designation for privacy matters is the
          KHLIM Data Protection Contact. Privacy enquiries may be sent to{" "}
          {contact}, by telephone at {contactPhone}, or through the{" "}
          <Link href="/contact">contact page</Link>.
        </React.Fragment>,
      ],
    },
    {
      title: "2. What we collect — and what we do not need",
      bullets: [
        "Guardian/account data: name, email, preferred language and, where needed for academy contact or safety, telephone number.",
        "Athlete data: name, date of birth, guardian relationship/link, programme and membership records, attendance and schedule records.",
        "Payment records: amount, currency, payment status, provider reference and billing schedule. KHLIM does not ask you to enter raw card numbers or CVVs into KHLIM forms.",
        "Enquiries: the name, email address and message you choose to send through the contact form.",
        "Technical/security data: limited logs and error information needed to operate, secure and diagnose the service. If Sentry is enabled, it is configured not to send default PII and not to collect performance traces.",
      ],
      paragraphs: [
        "We do not intentionally collect extra profile fields simply because they might be useful later. New categories of personal data require a documented purpose and a privacy review before collection.",
      ],
    },
    {
      title:
        "3. Sources, required fields and what happens if you do not provide them",
      paragraphs: [
        "We obtain personal data directly from you or an authorised guardian through account, profile, enrolment and contact forms; from your use of the service where a technical or transaction record is generated; and from service providers such as the payment provider when they return transaction status or identifiers. KHLIM personnel may add operational records such as attendance where necessary to run the academy.",
        "Fields marked required are necessary for the relevant account, athlete profile, enrolment, payment or safety workflow. If you do not provide a required field or required guardian consent, KHLIM may be unable to create the profile, accept the enrolment, process payment or provide the requested feature. Fields described as optional are voluntary. Optional marketing, photography and publicity consent is not required for ordinary academy participation where that use is not necessary to deliver the service.",
      ],
    },
    {
      title: "4. Why we use the data",
      bullets: [
        "to create and secure accounts and managed athlete profiles;",
        "to process enrolment, memberships, attendance, schedules and academy communications;",
        "to prepare and reconcile payments and refunds;",
        "to respond to enquiries and support requests;",
        "to protect participants, prevent abuse, troubleshoot the service and comply with legal obligations; and",
        "to keep records reasonably required for contracts, accounting, disputes and regulatory compliance.",
      ],
      paragraphs: [
        "Where consent is required, you may withdraw it subject to applicable law and any processing that is still necessary to perform a contract or meet a legal obligation.",
      ],
    },
    {
      title: "5. Children and guardian consent",
      paragraphs: [
        "Athlete profiles may relate to people under 18. For a minor, KHLIM requires consent from a parent, legal guardian or other person with parental responsibility before the child's personal data is submitted for enrolment. A child does not need a separate KHLIM login or email account merely to be managed by a guardian.",
        "Optional publicity, photography or marketing consent must be requested separately from core academy enrolment. Refusing optional media consent must not by itself block ordinary participation where the media use is not necessary to provide the service.",
      ],
    },
    {
      title: "6. Who may receive the data",
      paragraphs: [
        "Access is limited to KHLIM personnel and service providers who need the information for the purposes above. Depending on the feature used, processors may include Supabase for authentication/database services, Billplz for payment processing, hosting/infrastructure providers, Sentry for technical error monitoring, and PostHog (US Cloud) for opt-in 24 Oct 3x3 campaign analytics where explicit consent is granted. Analytics events never transmit guardian or child names, phone numbers, emails, full URLs, or form contents, and explicitly suppress person profiles and geolocation lookups. We may also disclose information where required by law or to protect legal rights and safety.",
        "We do not sell personal data and this build does not include advertising pixels or cross-site behavioural advertising trackers.",
      ],
    },
    {
      title: "7. Transfers outside Malaysia",
      paragraphs: [
        "Some technology providers may process or store data outside Malaysia, including cloud services operated by Supabase and PostHog (US Cloud). Where a cross-border transfer occurs, KHLIM documents and relies on applicable conditions under section 129 of the Personal Data Protection Act 2010 (such as consent or contract necessity) and applies reasonable contractual, technical and organisational safeguards appropriate to the transfer.",
      ],
    },
    {
      title: "8. Retention and deletion",
      paragraphs: [
        "We keep personal data only for as long as it is reasonably needed for the purpose for which it was collected, for an active account or membership, or to meet legal, accounting, safety and dispute-resolution requirements. When data is no longer required, it should be securely deleted or de-identified under KHLIM's retention schedule. Payment and transaction records may need to be retained longer than ordinary account content.",
      ],
    },
    {
      title: "9. Access, correction and other requests",
      paragraphs: [
        "Subject to the PDPA and applicable exceptions, you may ask to access or correct personal data, withdraw consent where consent is the basis relied on, or raise a privacy complaint. Account deletion or deactivation requests may be limited where records must be kept for legal, accounting, safety or dispute purposes. Contact us using the details above and we may need to verify your identity or guardian authority before acting.",
      ],
    },
    {
      title: "10. Security and data breaches",
      paragraphs: [
        "KHLIM uses access controls and other reasonable safeguards appropriate to the service. No online system is risk-free. Suspected personal-data breaches must be assessed under KHLIM's incident process and, where legally required, notified to the Personal Data Protection Commissioner and affected data subjects within the applicable requirements.",
      ],
    },
    {
      title: "11. Cookies and similar technologies",
      paragraphs: [
        <React.Fragment key="privacy-en-s11-cookies-link">
          See the <Link href="/cookies">Cookie Policy</Link>. Non-essential
          analytics for the 24 Oct 3x3 campaign (PostHog US Cloud) are strictly
          opt-in and require your prior consent. You can change your preferences
          or withdraw consent at any time via the Cookie Policy page or consent
          banner.
        </React.Fragment>,
      ],
    },
    {
      title: "12. Changes",
      paragraphs: [
        "We may update this notice when the service, providers or legal requirements change. Material changes will be shown with a new effective date and, where appropriate, an additional notice before the change takes effect.",
      ],
    },
  ];

  const malaySections: LegalSection[] = [
    {
      title: "1. Siapa yang mengawal data peribadi anda",
      paragraphs: [
        <React.Fragment key="privacy-ms-s1-controller-contact-link">
          {registeredCompany} ("KHLIM", "kami") ialah pengawal data bagi data
          peribadi yang dikumpulkan melalui laman ini, pendaftaran akademi dan
          portal ahli. Jawatan hubungan bagi hal privasi ialah KHLIM Data
          Protection Contact. Pertanyaan privasi boleh dihantar ke {contact},
          melalui telefon di {contactPhone}, atau melalui{" "}
          <Link href="/contact">halaman hubungan</Link>.
        </React.Fragment>,
      ],
    },
    {
      title: "2. Apa yang kami kumpulkan — dan apa yang kami tidak perlukan",
      bullets: [
        "Data penjaga/akaun: nama, e-mel, pilihan bahasa dan, jika diperlukan untuk hubungan akademi atau keselamatan, nombor telefon.",
        "Data atlet: nama, tarikh lahir, hubungan/pautan penjaga, rekod program dan keahlian, rekod kehadiran dan jadual.",
        "Rekod pembayaran: amaun, mata wang, status pembayaran, rujukan penyedia dan jadual pengebilan. KHLIM tidak meminta nombor kad mentah atau CVV dimasukkan ke dalam borang KHLIM.",
        "Pertanyaan: nama, alamat e-mel dan mesej yang anda pilih untuk dihantar melalui borang hubungan.",
        "Data teknikal/keselamatan: log terhad dan maklumat ralat yang diperlukan untuk mengendalikan, melindungi dan mendiagnosis perkhidmatan. Jika Sentry diaktifkan, ia dikonfigurasikan untuk tidak menghantar PII lalai dan tidak mengumpul penjejakan prestasi.",
      ],
      paragraphs: [
        "Kami tidak sengaja mengumpulkan medan profil tambahan semata-mata kerana ia mungkin berguna kemudian. Kategori data peribadi baharu memerlukan tujuan yang didokumenkan dan semakan privasi sebelum pengumpulan.",
      ],
    },
    {
      title:
        "3. Sumber, medan wajib dan apa yang berlaku jika anda tidak memberikannya",
      paragraphs: [
        "Kami memperoleh data peribadi secara langsung daripada anda atau penjaga yang diberi kuasa melalui borang akaun, profil, pendaftaran dan hubungan; daripada penggunaan perkhidmatan oleh anda apabila rekod teknikal atau transaksi dijana; dan daripada penyedia perkhidmatan seperti penyedia pembayaran apabila mereka mengembalikan status transaksi atau pengenal. Kakitangan KHLIM boleh menambah rekod operasi seperti kehadiran jika perlu untuk mengendalikan akademi.",
        "Medan yang ditandakan wajib adalah perlu bagi akaun, profil atlet, pendaftaran, pembayaran atau aliran kerja keselamatan yang berkaitan. Jika anda tidak memberikan medan wajib atau persetujuan penjaga yang diperlukan, KHLIM mungkin tidak dapat membuat profil, menerima pendaftaran, memproses pembayaran atau menyediakan ciri yang diminta. Medan yang diterangkan sebagai pilihan adalah sukarela. Persetujuan pemasaran, fotografi dan publisiti pilihan tidak diperlukan untuk penyertaan biasa akademi jika penggunaan itu tidak perlu untuk menyampaikan perkhidmatan.",
      ],
    },
    {
      title: "4. Mengapa kami menggunakan data",
      bullets: [
        "untuk membuat dan melindungi akaun serta profil atlet yang diurus;",
        "untuk memproses pendaftaran, keahlian, kehadiran, jadual dan komunikasi akademi;",
        "untuk menyediakan dan menyelaraskan pembayaran serta bayaran balik;",
        "untuk menjawab pertanyaan dan permintaan sokongan;",
        "untuk melindungi peserta, mencegah penyalahgunaan, menyelesaikan masalah perkhidmatan dan mematuhi kewajipan undang-undang; dan",
        "untuk menyimpan rekod yang munasabah diperlukan bagi kontrak, perakaunan, pertikaian dan pematuhan kawal selia.",
      ],
      paragraphs: [
        "Jika persetujuan diperlukan, anda boleh menarik baliknya tertakluk kepada undang-undang berkenaan dan apa-apa pemprosesan yang masih perlu untuk melaksanakan kontrak atau memenuhi kewajipan undang-undang.",
      ],
    },
    {
      title: "5. Kanak-kanak dan persetujuan penjaga",
      paragraphs: [
        "Profil atlet mungkin berkaitan dengan individu bawah 18 tahun. Bagi kanak-kanak, KHLIM memerlukan persetujuan daripada ibu bapa, penjaga sah atau orang lain yang mempunyai tanggungjawab keibubapaan sebelum data peribadi kanak-kanak itu diserahkan untuk pendaftaran. Kanak-kanak tidak memerlukan log masuk atau akaun e-mel KHLIM yang berasingan semata-mata untuk diuruskan oleh penjaga.",
        "Persetujuan publisiti, fotografi atau pemasaran pilihan mesti diminta secara berasingan daripada pendaftaran teras akademi. Menolak persetujuan media pilihan tidak dengan sendirinya menghalang penyertaan biasa jika penggunaan media itu tidak perlu untuk menyediakan perkhidmatan.",
      ],
    },
    {
      title: "6. Siapa yang boleh menerima data",
      paragraphs: [
        "Akses terhad kepada kakitangan KHLIM dan penyedia perkhidmatan yang memerlukan maklumat tersebut untuk tujuan di atas. Bergantung pada ciri yang digunakan, pemproses mungkin termasuk Supabase untuk perkhidmatan pengesahan/pangkalan data, Billplz untuk pemprosesan pembayaran, penyedia pengehosan/infrastruktur, Sentry untuk pemantauan ralat teknikal, dan PostHog (US Cloud) untuk analitik pilihan kempen 3x3 24 Okt jika persetujuan jelas diberikan. Acara analitik tidak sekali-kali menghantar nama penjaga atau anak, nombor telefon, e-mel, URL penuh atau kandungan borang, serta menyekat profil peribadi dan carian geolokasi. Kami juga boleh mendedahkan maklumat jika dikehendaki oleh undang-undang atau untuk melindungi hak undang-undang dan keselamatan.",
        "Kami tidak menjual data peribadi dan binaan ini tidak mengandungi piksel iklan atau penjejak pengiklanan tingkah laku rentas laman.",
      ],
    },
    {
      title: "7. Pemindahan ke luar Malaysia",
      paragraphs: [
        "Sesetengah penyedia teknologi boleh memproses atau menyimpan data di luar Malaysia, termasuk perkhidmatan awan yang dikendalikan oleh Supabase dan PostHog (US Cloud). Jika pemindahan rentas sempadan berlaku, KHLIM mendokumenkan dan bergantung pada syarat berkenaan di bawah seksyen 129 Akta Perlindungan Data Peribadi 2010 (seperti persetujuan atau keperluan kontrak) serta menggunakan perlindungan kontrak, teknikal dan organisasi yang munasabah dan sesuai dengan pemindahan tersebut.",
      ],
    },
    {
      title: "8. Pengekalan dan pemadaman",
      paragraphs: [
        "Kami menyimpan data peribadi hanya selama yang diperlukan secara munasabah bagi tujuan ia dikumpulkan, untuk akaun atau keahlian yang aktif, atau untuk memenuhi keperluan undang-undang, perakaunan, keselamatan dan penyelesaian pertikaian. Apabila data tidak lagi diperlukan, ia hendaklah dipadamkan secara selamat atau dinyahkenal pasti di bawah jadual pengekalan KHLIM. Rekod pembayaran dan transaksi mungkin perlu disimpan lebih lama daripada kandungan akaun biasa.",
      ],
    },
    {
      title: "9. Akses, pembetulan dan permintaan lain",
      paragraphs: [
        "Tertakluk kepada PDPA dan pengecualian berkenaan, anda boleh meminta untuk mengakses atau membetulkan data peribadi, menarik balik persetujuan jika persetujuan ialah asas yang digunakan, atau membuat aduan privasi. Permintaan pemadaman atau penyahaktifan akaun mungkin terhad jika rekod mesti disimpan untuk tujuan undang-undang, perakaunan, keselamatan atau pertikaian. Hubungi kami menggunakan butiran di atas dan kami mungkin perlu mengesahkan identiti atau kuasa penjaga anda sebelum bertindak.",
      ],
    },
    {
      title: "10. Keselamatan dan pelanggaran data",
      paragraphs: [
        "KHLIM menggunakan kawalan akses dan perlindungan munasabah lain yang sesuai dengan perkhidmatan. Tiada sistem dalam talian yang bebas risiko. Pelanggaran data peribadi yang disyaki mesti dinilai di bawah proses insiden KHLIM dan, jika dikehendaki oleh undang-undang, dimaklumkan kepada Pesuruhjaya Perlindungan Data Peribadi dan subjek data yang terjejas dalam keperluan yang berkenaan.",
      ],
    },
    {
      title: "11. Kuki dan teknologi serupa",
      paragraphs: [
        <React.Fragment key="privacy-ms-s11-cookies-link">
          Lihat <Link href="/cookies">Dasar Kuki</Link>. Analitik bukan penting
          untuk kempen 3x3 24 Okt (PostHog US Cloud) adalah berasaskan
          persetujuan pilihan dan memerlukan persetujuan anda terlebih dahulu.
          Anda boleh mengubah pilihan atau menarik balik persetujuan pada
          bila-bila masa melalui halaman Dasar Kuki atau banner persetujuan.
        </React.Fragment>,
      ],
    },
    {
      title: "12. Perubahan",
      paragraphs: [
        "Kami boleh mengemas kini notis ini apabila perkhidmatan, penyedia atau keperluan undang-undang berubah. Perubahan penting akan dipaparkan dengan tarikh kuat kuasa baharu dan, jika sesuai, notis tambahan sebelum perubahan berkuat kuasa.",
      ],
    },
  ];

  const chineseSections: LegalSection[] = [
    {
      title: "1. 谁控制您的个人数据 (Who controls your personal data)",
      paragraphs: [
        <React.Fragment key="privacy-zh-s1-controller-contact-link">
          {registeredCompany}
          （“KHLIM”、“我们”）是通过本网站、学院报名及会员门户收集的个人数据的数据控制者。隐私事务联络人职务为
          KHLIM 数据保护联络人（KHLIM Data Protection
          Contact）。隐私合规咨询可发送至 {contactZh}，致电 {contactPhoneZh}
          ，或通过 <Link href="/contact">联系页面 (Contact Page)</Link> 提交。
        </React.Fragment>,
      ],
    },
    {
      title:
        "2. 我们收集的信息——以及我们不需要的信息 (What we collect — and what we do not need)",
      bullets: [
        "监护人/账户数据：姓名、电子邮件、首选语言，以及在学院联络或紧急安全需要时收集的电话号码。",
        "学员数据：姓名、出生日期、监护人关系/关联证明、课程及会员记录、出勤与赛程时间表记录。",
        "支付记录：金额、货币、支付状态、第三方服务商参考流水号及账单周期。KHLIM 绝不会要求您在 KHLIM 表单中输入银行卡原始卡号或 CVV 校验码。",
        "咨询信息：您通过联系表单自主选择发送的姓名、电子邮件地址与留言内容。",
        "技术/安全数据：运行、保护与诊断系统故障所需的有限日志及错误信息。如果启用了 Sentry，系统已配置为不发送默认个人身份信息（PII）且不收集性能追踪。",
      ],
      paragraphs: [
        "我们不会仅因某些额外字段“将来可能有用”而刻意收集多余的个人档案信息。增加任何新的个人数据类别前，必须记录其业务目的并在收集前完成严格的隐私审查。",
      ],
    },
    {
      title:
        "3. 数据来源、必填字段及未提供数据的后果 (Sources, required fields and what happens if you do not provide them)",
      paragraphs: [
        "我们通过账户注册、个人资料、报名及联系表单直接从您或授权监护人处获取个人数据；在您使用服务生成技术或交易记录时获取数据；并在支付服务商返回交易状态或标识符时从服务商处获取数据。KHLIM 工作人员在运营学院所必需时可录入出勤等操作记录。",
        "标有必填的字段对于相关账户创建、学员档案、课程报名、支付或安全流程至关重要。若您未提供必填字段或必需的监护人同意，KHLIM 可能无法创建档案、受理报名、处理付款或提供所请求的功能。注明为选填的字段纯属自愿。在提供常规学院服务并非必需的情况下，拒绝选填的营销、摄影与宣传同意不会影响学员正常参与常规培训。",
      ],
    },
    {
      title: "4. 数据处理目的 (Why we use the data)",
      bullets: [
        "创建并保护账户及受管理的学员档案；",
        "处理课程报名、会员管理、出勤统计、课程表及学院通讯联络；",
        "编制并对账付款与退款；",
        "回复咨询及提供支持服务；",
        "保护参与者安全、防止滥用、排查服务故障并遵守法定监管义务；以及",
        "妥善保存合同履行、会计核算、争议处理及合规审计合理所需的记录。",
      ],
      paragraphs: [
        "如需基于同意进行处理，您可在适用法律允许且不影响合同履行或法定义务的前提下撤回该同意。",
      ],
    },
    {
      title: "5. 未成年人与监护人责任 (Children and guardian consent)",
      paragraphs: [
        "学员档案可能涉及未满 18 周岁的人士。对于未成年人，KHLIM 要求在提交该未成年人的个人数据进行报名之前，必须获得其父母、法定监护人或其他行使亲权责任人士的明确同意。未成年人无须单独注册 KHLIM 登录账号或邮箱即可由监护人代为管理。",
        "选填的宣传、摄影或营销同意必须与学院核心课程报名分开单独征求。在媒体使用并非提供该服务所必需的情况下，拒绝选填的媒体拍摄同意不得作为拒绝学员正常参加训练的理由。",
      ],
    },
    {
      title: "6. 数据接收方与披露 (Who may receive the data)",
      paragraphs: [
        "数据访问权限严格限于出于上述目的需要该信息的 KHLIM 人员及授权服务提供商。根据所使用的具体功能，数据处理方可能包括用于身份认证及数据库服务的 Supabase、用于支付处理的 Billplz、主机托管及云端基础设施提供商、用于技术故障监控的 Sentry，以及在获得您明确同意后用于 10 月 24 日 3x3 篮球赛事分析的 PostHog（美国云端）。分析事件绝不传输监护人或未成年人的姓名、电话、邮箱、完整 URL 或表单文本，并明确禁用了个人档案及地理位置查询。在法律要求或为保护合法权利及人身安全时，我们亦可能依法披露信息。",
        "我们绝不出售个人数据，且当前版本不包含任何广告像素或跨站行为广告追踪程序。",
      ],
    },
    {
      title: "7. 境外数据传输 (Transfers outside Malaysia)",
      paragraphs: [
        "部分技术服务提供商可能在马来西亚境外处理或存储数据，包括由 Supabase 和 PostHog（美国云端）运营的云服务。在发生跨境传输时，KHLIM 严格记录并依据马来西亚《2010年个人数据保护法》（PDPA）第 129 条规定的适用条件（如用户同意或履行合同所必需），并采取与传输相适应的合理合同条款、技术性及组织性安全保障措施。",
      ],
    },
    {
      title: "8. 数据保留期限与删除 (Retention and deletion)",
      paragraphs: [
        "我们仅在实现收集目的所合理必需的期间内、在账户或会员资格保持活跃期间内，或为满足法律、会计、安全及争议解决要求所必需的期限内保留个人数据。当数据不再需要时，将根据 KHLIM 的数据保留规范进行安全销毁或匿名化去标识处理。支付与会计交易记录的法定保留期可能长于普通账户内容。",
      ],
    },
    {
      title: "9. 查阅、更正及其他请求 (Access, correction and other requests)",
      paragraphs: [
        "在遵循 PDPA 及相关法定豁免的前提下，您有权请求查阅或更正您的个人数据、撤回以同意为依据的数据处理授权，或提出隐私合规投诉。如果记录因法律、会计、安全或争议抗辩目的而必须保留，账户注销或停用请求可能会受到相应法律限制。您可通过上述联络方式与我们联系，在处理前我们可能需要核实您的身份或监护人代理权限。",
      ],
    },
    {
      title: "10. 数据安全保障与泄露应对 (Security and data breaches)",
      paragraphs: [
        "KHLIM 采取符合服务风险等级的严格访问控制及其他合理技术防护措施。任何互联网在线系统均无法保证百分之百零风险。一旦发生涉嫌个人数据泄露事件，必须按照 KHLIM 的突发事件处置机制进行评估，并在法律要求的情形及期限内向马来西亚个人数据保护专员（PDP Commissioner）及受影响的数据主体发出通知。",
      ],
    },
    {
      title: "11. Cookie 与类似技术 (Cookies and similar technologies)",
      paragraphs: [
        <React.Fragment key="privacy-zh-s11-cookies-link">
          详情请参阅 <Link href="/cookies">Cookie 政策 (Cookie Policy)</Link>
          。针对 10 月 24 日 3x3 赛事的非必要分析追踪（PostHog
          美国云端）严格采取选择性加入模式，必须事先征得您的明确同意。您可随时通过
          Cookie 政策页面或同意横幅更改偏好或撤回同意。
        </React.Fragment>,
      ],
    },
    {
      title: "12. 政策更新与变更 (Changes)",
      paragraphs: [
        "当业务服务、技术提供商或法律监管要求发生变化时，我们可能会更新本通知。重大变更将标注新的生效日期，并在适当时于变更生效前发布补充提示通知。",
      ],
    },
  ];

  return (
    <LegalDocument
      title="Privacy Policy & Personal Data Protection Notice"
      malayTitle="Dasar Privasi & Notis Perlindungan Data Peribadi"
      chineseTitle="隐私政策与个人数据保护声明"
      effectiveDate={EFFECTIVE_DATE}
      englishIntro="This notice explains how KHLIM handles personal data in connection with its Malaysian academy website and services. It is intended to satisfy the notice-and-choice requirements of Malaysia's Personal Data Protection Act 2010 (PDPA) and should be read together with the Terms and Cookie Policy."
      malayIntro="Notis ini menerangkan cara KHLIM mengendalikan data peribadi berkaitan laman dan perkhidmatan akademi di Malaysia. Ia bertujuan memenuhi keperluan notis dan pilihan di bawah Akta Perlindungan Data Peribadi 2010 (PDPA) dan hendaklah dibaca bersama Terma serta Dasar Kuki."
      chineseIntro="本声明阐述 KHLIM 如何就其马来西亚学院网站及服务处理个人数据。本文件旨在符合马来西亚《2010年个人数据保护法》（PDPA）的通知与选择要求，并应与服务条款和 Cookie 政策一并阅读。"
      englishSections={englishSections}
      malaySections={malaySections}
      chineseSections={chineseSections}
    />
  );
}
