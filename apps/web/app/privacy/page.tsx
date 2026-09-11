import React from "react";
import Link from "next/link";
import {
  LegalDocument,
  type LegalSection,
} from "../../components/legal/legal-document";
import { getPublicBusinessDetails } from "../../lib/business-details";

const EFFECTIVE_DATE = "11 September 2026";

export default function PrivacyPage() {
  const business = getPublicBusinessDetails();
  const contact = business.email || "the contact form";
  const contactPhone = business.phone || "the telephone number shown in the website footer when configured";

  const englishSections: LegalSection[] = [
    {
      title: "1. Who controls your personal data",
      paragraphs: [
        <>
          {business.legalName} ("KHLIM", "we", "us") is the data controller for
          personal data collected through this website, academy enrolment and the
          member portal. The contact designation for privacy matters is the KHLIM
          Data Protection Contact. Privacy enquiries may be sent to {contact}, by
          telephone at {contactPhone}, or through the <Link href="/contact">contact page</Link>.
        </>,
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
      title: "3. Sources, required fields and what happens if you do not provide them",
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
        "Access is limited to KHLIM personnel and service providers who need the information for the purposes above. Depending on the feature used, processors may include Supabase for authentication/database services, Billplz for payment processing, hosting/infrastructure providers and Sentry for error monitoring where enabled. We may also disclose information where required by law or to protect legal rights and safety.",
        "We do not sell personal data and this build does not include advertising pixels or behavioural advertising analytics.",
      ],
    },
    {
      title: "7. Transfers outside Malaysia",
      paragraphs: [
        "Some technology providers may process or store data outside Malaysia. Where a cross-border transfer occurs, KHLIM must document and rely on an applicable condition under section 129 of the Personal Data Protection Act 2010 and apply reasonable contractual, technical and organisational safeguards appropriate to the transfer.",
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
        <>
          See the <Link href="/cookies">Cookie Policy</Link>. The current build does
          not intentionally deploy advertising pixels or non-essential marketing
          analytics. If that changes, the relevant tracking must not be enabled
          until the required notice and consent controls are in place.
        </>,
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
        <>
          {business.legalName} ("KHLIM", "kami") ialah pengawal data bagi data
          peribadi yang dikumpulkan melalui laman ini, pendaftaran akademi dan
          portal ahli. Jawatan hubungan bagi hal privasi ialah KHLIM Data Protection
          Contact. Pertanyaan privasi boleh dihantar ke {contact}, melalui telefon di
          {contactPhone}, atau melalui <Link href="/contact">halaman hubungan</Link>.
        </>,
      ],
    },
    {
      title: "2. Data yang kami kumpul — dan data yang tidak diperlukan",
      bullets: [
        "Data penjaga/akaun: nama, e-mel, bahasa pilihan dan, jika diperlukan untuk hubungan atau keselamatan akademi, nombor telefon.",
        "Data atlet: nama, tarikh lahir, hubungan/pautan penjaga, rekod program dan keahlian, kehadiran serta jadual.",
        "Rekod pembayaran: amaun, mata wang, status pembayaran, rujukan penyedia dan jadual bil. KHLIM tidak meminta nombor kad mentah atau CVV dimasukkan ke dalam borang KHLIM.",
        "Pertanyaan: nama, alamat e-mel dan mesej yang anda pilih untuk dihantar melalui borang hubungan.",
        "Data teknikal/keselamatan: log dan maklumat ralat terhad yang diperlukan untuk operasi, keselamatan dan diagnosis. Jika Sentry diaktifkan, ia dikonfigurasi supaya tidak menghantar PII lalai dan tidak mengumpul jejak prestasi.",
      ],
      paragraphs: [
        "Kami tidak sengaja mengumpul medan profil tambahan hanya kerana ia mungkin berguna pada masa hadapan. Kategori data baharu memerlukan tujuan yang didokumenkan dan semakan privasi sebelum dikumpul.",
      ],
    },
    {
      title: "3. Sumber data, medan wajib dan kesan jika anda tidak memberikannya",
      paragraphs: [
        "Kami memperoleh data peribadi secara langsung daripada anda atau penjaga yang dibenarkan melalui borang akaun, profil, pendaftaran dan hubungan; daripada penggunaan perkhidmatan apabila rekod teknikal atau transaksi dijana; dan daripada penyedia perkhidmatan seperti penyedia pembayaran apabila mereka mengembalikan status atau pengenal transaksi. Kakitangan KHLIM boleh menambah rekod operasi seperti kehadiran jika perlu untuk menjalankan akademi.",
        "Medan yang ditandakan wajib diperlukan bagi aliran akaun, profil atlet, pendaftaran, pembayaran atau keselamatan yang berkaitan. Jika anda tidak memberikan medan wajib atau persetujuan penjaga yang diperlukan, KHLIM mungkin tidak dapat mewujudkan profil, menerima pendaftaran, memproses pembayaran atau menyediakan ciri yang diminta. Medan yang dinyatakan sebagai pilihan adalah sukarela. Persetujuan pemasaran, fotografi dan publisiti pilihan tidak diperlukan untuk penyertaan akademi biasa apabila penggunaan itu tidak perlu untuk menyediakan perkhidmatan.",
      ],
    },
    {
      title: "4. Tujuan penggunaan data",
      bullets: [
        "mewujudkan dan melindungi akaun serta profil atlet yang diurus;",
        "mengurus pendaftaran, keahlian, kehadiran, jadual dan komunikasi akademi;",
        "menyediakan serta menyelaraskan pembayaran dan bayaran balik;",
        "menjawab pertanyaan dan permintaan sokongan;",
        "melindungi peserta, mencegah penyalahgunaan, menyelesaikan masalah perkhidmatan dan mematuhi kewajipan undang-undang; dan",
        "menyimpan rekod yang munasabah bagi kontrak, perakaunan, pertikaian dan pematuhan.",
      ],
      paragraphs: [
        "Jika persetujuan diperlukan, anda boleh menarik balik persetujuan tertakluk kepada undang-undang dan apa-apa pemprosesan yang masih diperlukan untuk melaksanakan kontrak atau kewajipan undang-undang.",
      ],
    },
    {
      title: "5. Kanak-kanak dan persetujuan penjaga",
      paragraphs: [
        "Profil atlet mungkin melibatkan individu bawah 18 tahun. Bagi individu bawah umur, KHLIM memerlukan persetujuan ibu bapa, penjaga sah atau orang lain yang mempunyai tanggungjawab keibubapaan sebelum data peribadi kanak-kanak dihantar untuk pendaftaran. Kanak-kanak tidak perlu mempunyai log masuk atau akaun e-mel KHLIM berasingan semata-mata untuk diurus oleh penjaga.",
        "Persetujuan pilihan untuk publisiti, fotografi atau pemasaran hendaklah diminta secara berasingan daripada pendaftaran teras akademi. Penolakan persetujuan media pilihan tidak sepatutnya menghalang penyertaan biasa jika penggunaan media itu tidak diperlukan untuk menyediakan perkhidmatan.",
      ],
    },
    {
      title: "6. Pihak yang mungkin menerima data",
      paragraphs: [
        "Akses dihadkan kepada kakitangan KHLIM dan penyedia perkhidmatan yang memerlukan maklumat untuk tujuan di atas. Bergantung pada ciri yang digunakan, pemproses mungkin termasuk Supabase bagi pengesahan/pangkalan data, Billplz bagi pembayaran, penyedia pengehosan/infrastruktur dan Sentry bagi pemantauan ralat jika diaktifkan. Kami juga boleh mendedahkan maklumat jika dikehendaki undang-undang atau untuk melindungi hak undang-undang dan keselamatan.",
        "Kami tidak menjual data peribadi dan binaan semasa tidak mengandungi piksel pengiklanan atau analitik pengiklanan berasaskan tingkah laku.",
      ],
    },
    {
      title: "7. Pemindahan data ke luar Malaysia",
      paragraphs: [
        "Sesetengah penyedia teknologi mungkin memproses atau menyimpan data di luar Malaysia. Jika pemindahan rentas sempadan berlaku, KHLIM hendaklah mendokumenkan dan bergantung pada syarat yang terpakai di bawah seksyen 129 Akta Perlindungan Data Peribadi 2010 serta menggunakan perlindungan kontrak, teknikal dan organisasi yang munasabah.",
      ],
    },
    {
      title: "8. Penyimpanan dan pemadaman",
      paragraphs: [
        "Kami menyimpan data peribadi hanya selama yang munasabah diperlukan untuk tujuan asal, akaun atau keahlian aktif, atau keperluan undang-undang, perakaunan, keselamatan dan penyelesaian pertikaian. Apabila data tidak lagi diperlukan, data hendaklah dipadam dengan selamat atau dinyahkenal pasti mengikut jadual penyimpanan KHLIM. Rekod pembayaran dan transaksi mungkin perlu disimpan lebih lama daripada kandungan akaun biasa.",
      ],
    },
    {
      title: "9. Akses, pembetulan dan permintaan lain",
      paragraphs: [
        "Tertakluk kepada PDPA dan pengecualian yang berkenaan, anda boleh meminta akses atau pembetulan data peribadi, menarik balik persetujuan apabila persetujuan ialah asas yang digunakan, atau membuat aduan privasi. Permintaan pemadaman atau nyahaktif akaun mungkin terhad apabila rekod perlu disimpan bagi tujuan undang-undang, perakaunan, keselamatan atau pertikaian. Hubungi kami menggunakan butiran di atas; kami mungkin perlu mengesahkan identiti atau kuasa penjaga anda.",
      ],
    },
    {
      title: "10. Keselamatan dan pelanggaran data",
      paragraphs: [
        "KHLIM menggunakan kawalan akses dan perlindungan munasabah lain yang sesuai. Tiada sistem dalam talian bebas risiko. Pelanggaran data peribadi yang disyaki hendaklah dinilai di bawah proses insiden KHLIM dan, jika diwajibkan undang-undang, dimaklumkan kepada Pesuruhjaya Perlindungan Data Peribadi serta subjek data yang terjejas mengikut keperluan yang berkenaan.",
      ],
    },
    {
      title: "11. Kuki dan teknologi serupa",
      paragraphs: [
        <>
          Lihat <Link href="/cookies">Dasar Kuki</Link>. Binaan semasa tidak
          sengaja menggunakan piksel iklan atau analitik pemasaran yang tidak
          perlu. Jika keadaan ini berubah, penjejakan berkaitan tidak boleh
          diaktifkan sehingga notis dan kawalan persetujuan yang diperlukan
          tersedia.
        </>,
      ],
    },
    {
      title: "12. Perubahan",
      paragraphs: [
        "Kami boleh mengemas kini notis ini apabila perkhidmatan, penyedia atau keperluan undang-undang berubah. Perubahan penting akan dipaparkan dengan tarikh kuat kuasa baharu dan, jika sesuai, notis tambahan sebelum perubahan berkuat kuasa.",
      ],
    },
  ];

  return (
    <LegalDocument
      title="Privacy Policy & Personal Data Protection Notice"
      malayTitle="Dasar Privasi & Notis Perlindungan Data Peribadi"
      effectiveDate={EFFECTIVE_DATE}
      englishIntro="This notice explains how KHLIM handles personal data in connection with its Malaysian academy website and services. It is intended to satisfy the notice-and-choice requirements of Malaysia's Personal Data Protection Act 2010 (PDPA) and should be read together with the Terms and Cookie Policy."
      malayIntro="Notis ini menerangkan cara KHLIM mengendalikan data peribadi berkaitan laman dan perkhidmatan akademi di Malaysia. Ia bertujuan memenuhi keperluan notis dan pilihan di bawah Akta Perlindungan Data Peribadi 2010 (PDPA) dan hendaklah dibaca bersama Terma serta Dasar Kuki."
      englishSections={englishSections}
      malaySections={malaySections}
    />
  );
}
