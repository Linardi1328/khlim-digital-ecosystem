import React from "react";
import Link from "next/link";
import {
  LegalDocument,
  type LegalSection,
} from "../../components/legal/legal-document";
import { getPublicBusinessDetails } from "../../lib/business-details";

const EFFECTIVE_DATE = "11 September 2026";

export default function TermsPage() {
  const business = getPublicBusinessDetails();
  const contact = business.email || "the contact form";

  const englishSections: LegalSection[] = [
    {
      title: "1. Operator and agreement",
      paragraphs: [
        `These terms govern the academy website, member portal, enrolments and memberships supplied by ${business.legalName} ("KHLIM"). By creating an account or completing an enrolment, you agree to these terms and any plan-specific information clearly shown before payment.`,
        "If you enrol a person under 18, you confirm that you are their parent, legal guardian or another person with parental responsibility and that you have authority to make the enrolment and provide the required personal-data consent.",
      ],
    },
    {
      title: "2. Programme, price and service information",
      paragraphs: [
        "Before checkout, KHLIM will show the selected athlete, programme/offering, venue where available, membership plan, price, currency, billing frequency and any commitment period that the platform supports. Taxes or other mandatory charges, if applicable, must be included or clearly disclosed before payment.",
        "Programme descriptions, age bands, capacity and schedules are subject to reasonable operational changes. A material change that prevents KHLIM from supplying the paid service is handled under the Refund Policy and applicable Malaysian consumer law.",
      ],
    },
    {
      title: "3. Accounts and accurate information",
      paragraphs: [
        "You must provide information that is accurate enough for account administration, participant identification, eligibility and safety. Do not create a child account merely to avoid guardian controls. Keep login credentials private and tell KHLIM promptly if you reasonably suspect unauthorised account access.",
      ],
    },
    {
      title: "4. Payments and recurring billing",
      paragraphs: [
        "Payments may be processed by Billplz or another payment provider identified at checkout. KHLIM does not ask you to enter raw card numbers or CVVs into KHLIM forms. A payment is treated as successful only after KHLIM receives verified payment status from the backend/payment provider.",
        "Where a plan is billed in recurring instalments, the amount, frequency and commitment period must be displayed before checkout and you must separately authorise recurring billing. Cancelling a payment method does not by itself erase amounts already validly due under an agreed plan, subject always to applicable consumer rights and the Refund Policy.",
      ],
    },
    {
      title: "5. Cancellations and refunds",
      paragraphs: [
        <>
          The <Link href="/refunds">Refund Policy</Link> forms part of these terms.
          Nothing in these terms is intended to exclude, restrict or modify a
          consumer guarantee, remedy or other right that cannot lawfully be
          excluded under Malaysian law.
        </>,
      ],
    },
    {
      title: "6. Attendance, conduct and safety",
      paragraphs: [
        "Participants must follow reasonable venue, coach and safety instructions and behave respectfully toward other participants, staff and property. KHLIM may suspend participation where reasonably necessary for safety, serious misconduct or non-payment, but will not use these terms to remove non-excludable statutory rights.",
        "Basketball and physical training involve ordinary sporting risks. KHLIM does not make medical, injury-prevention or guaranteed-performance claims. Parents/guardians remain responsible for deciding whether a participant is fit to take part and for providing safety information through the channels KHLIM specifically requests.",
      ],
    },
    {
      title: "7. Website content and intellectual property",
      paragraphs: [
        "KHLIM-owned branding, original text, graphics and other materials are protected by applicable intellectual-property law. Third-party material remains subject to the rights of its owner. You may use the site for ordinary personal access to KHLIM services but may not copy, republish or commercially exploit protected material without permission or another lawful basis.",
      ],
    },
    {
      title: "8. Availability and changes",
      paragraphs: [
        "KHLIM may maintain, secure, update or temporarily interrupt the website. We will not deliberately make a material paid-service change without addressing the effect on affected customers. Policy or term updates will carry a new effective date; material changes may require a fresh notice or acceptance where appropriate.",
      ],
    },
    {
      title: "9. Privacy",
      paragraphs: [
        <>
          Personal data is handled under the <Link href="/privacy">Privacy Policy</Link>.
          Optional marketing or media/publicity consent must be kept separate from
          consent needed for core enrolment where the optional use is not necessary
          to provide the service.
        </>,
      ],
    },
    {
      title: "10. Liability and Malaysian consumer rights",
      paragraphs: [
        "To the maximum extent permitted by law, each party is responsible for loss caused by its own breach, negligence or unlawful conduct. KHLIM does not exclude liability or remedies that Malaysian law does not allow to be excluded. Any limitation in these terms must therefore be read subject to mandatory consumer-protection and other applicable law.",
      ],
    },
    {
      title: "11. Governing law and contact",
      paragraphs: [
        `These terms are governed by the laws of Malaysia. Questions about these terms may be sent to ${contact} or through the KHLIM contact page. Nothing here prevents a consumer from using any complaint, tribunal or court route available under applicable law.`,
      ],
    },
  ];

  const malaySections: LegalSection[] = [
    {
      title: "1. Pengendali dan perjanjian",
      paragraphs: [
        `Terma ini mengawal laman akademi, portal ahli, pendaftaran dan keahlian yang dibekalkan oleh ${business.legalName} ("KHLIM"). Dengan mewujudkan akaun atau melengkapkan pendaftaran, anda bersetuju dengan terma ini dan maklumat khusus pelan yang dipaparkan dengan jelas sebelum pembayaran.`,
        "Jika anda mendaftarkan individu bawah 18 tahun, anda mengesahkan bahawa anda ialah ibu bapa, penjaga sah atau orang lain yang mempunyai tanggungjawab keibubapaan dan mempunyai kuasa untuk membuat pendaftaran serta memberikan persetujuan data peribadi yang diperlukan.",
      ],
    },
    {
      title: "2. Maklumat program, harga dan perkhidmatan",
      paragraphs: [
        "Sebelum pembayaran, KHLIM akan memaparkan atlet, program/tawaran, lokasi jika tersedia, pelan keahlian, harga, mata wang, kekerapan bil dan apa-apa tempoh komitmen yang disokong platform. Cukai atau caj mandatori lain, jika berkenaan, hendaklah dimasukkan atau dinyatakan dengan jelas sebelum pembayaran.",
        "Penerangan program, julat umur, kapasiti dan jadual tertakluk kepada perubahan operasi yang munasabah. Perubahan material yang menyebabkan KHLIM tidak dapat membekalkan perkhidmatan berbayar akan diurus di bawah Dasar Bayaran Balik dan undang-undang pengguna Malaysia yang berkenaan.",
      ],
    },
    {
      title: "3. Akaun dan maklumat yang tepat",
      paragraphs: [
        "Anda hendaklah memberikan maklumat yang cukup tepat untuk pentadbiran akaun, pengenalpastian peserta, kelayakan dan keselamatan. Jangan wujudkan akaun kanak-kanak untuk memintas kawalan penjaga. Simpan kelayakan log masuk secara sulit dan maklumkan KHLIM dengan segera jika anda mengesyaki akses akaun tanpa kebenaran.",
      ],
    },
    {
      title: "4. Pembayaran dan pengebilan berulang",
      paragraphs: [
        "Pembayaran boleh diproses oleh Billplz atau penyedia pembayaran lain yang dikenal pasti semasa pembayaran. KHLIM tidak meminta nombor kad mentah atau CVV dimasukkan ke dalam borang KHLIM. Pembayaran hanya dianggap berjaya selepas KHLIM menerima status pembayaran yang disahkan daripada backend/penyedia pembayaran.",
        "Jika pelan dibil secara ansuran berulang, amaun, kekerapan dan tempoh komitmen hendaklah dipaparkan sebelum pembayaran dan anda mesti memberi kebenaran berasingan untuk pengebilan berulang. Membatalkan kaedah pembayaran tidak dengan sendirinya memadam amaun yang telah sah perlu dibayar di bawah pelan yang dipersetujui, tertakluk kepada hak pengguna dan Dasar Bayaran Balik.",
      ],
    },
    {
      title: "5. Pembatalan dan bayaran balik",
      paragraphs: [
        <>
          <Link href="/refunds">Dasar Bayaran Balik</Link> menjadi sebahagian
          daripada terma ini. Tiada apa-apa dalam terma ini bertujuan mengecualikan,
          menyekat atau mengubah jaminan, remedi atau hak pengguna yang tidak boleh
          dikecualikan secara sah di bawah undang-undang Malaysia.
        </>,
      ],
    },
    {
      title: "6. Kehadiran, tatakelakuan dan keselamatan",
      paragraphs: [
        "Peserta hendaklah mematuhi arahan lokasi, jurulatih dan keselamatan yang munasabah serta menghormati peserta lain, kakitangan dan harta benda. KHLIM boleh menggantung penyertaan jika munasabah diperlukan kerana keselamatan, salah laku serius atau tunggakan bayaran, tetapi tidak akan menggunakan terma ini untuk menghapuskan hak statutori yang tidak boleh dikecualikan.",
        "Bola keranjang dan latihan fizikal melibatkan risiko sukan biasa. KHLIM tidak membuat dakwaan perubatan, pencegahan kecederaan atau prestasi yang dijamin. Ibu bapa/penjaga kekal bertanggungjawab menentukan sama ada peserta sesuai untuk mengambil bahagian dan memberi maklumat keselamatan melalui saluran yang diminta secara khusus oleh KHLIM.",
      ],
    },
    {
      title: "7. Kandungan laman dan harta intelek",
      paragraphs: [
        "Penjenamaan milik KHLIM, teks asal, grafik dan bahan lain dilindungi oleh undang-undang harta intelek yang berkenaan. Bahan pihak ketiga kekal tertakluk kepada hak pemiliknya. Anda boleh menggunakan laman ini untuk akses peribadi biasa kepada perkhidmatan KHLIM tetapi tidak boleh menyalin, menerbit semula atau mengeksploitasi bahan dilindungi secara komersial tanpa kebenaran atau asas sah lain.",
      ],
    },
    {
      title: "8. Ketersediaan dan perubahan",
      paragraphs: [
        "KHLIM boleh menyelenggara, melindungi, mengemas kini atau menghentikan sementara laman. Kami tidak akan sengaja membuat perubahan material kepada perkhidmatan berbayar tanpa menangani kesannya kepada pelanggan terlibat. Kemas kini polisi atau terma akan mempunyai tarikh kuat kuasa baharu; perubahan material mungkin memerlukan notis atau persetujuan baharu jika sesuai.",
      ],
    },
    {
      title: "9. Privasi",
      paragraphs: [
        <>
          Data peribadi dikendalikan di bawah <Link href="/privacy">Dasar Privasi</Link>.
          Persetujuan pemasaran atau media/publisiti pilihan hendaklah diasingkan
          daripada persetujuan yang diperlukan untuk pendaftaran teras jika
          penggunaan pilihan itu tidak diperlukan untuk menyediakan perkhidmatan.
        </>,
      ],
    },
    {
      title: "10. Liabiliti dan hak pengguna Malaysia",
      paragraphs: [
        "Setakat yang dibenarkan undang-undang, setiap pihak bertanggungjawab atas kerugian yang disebabkan oleh pelanggaran, kecuaian atau perbuatan menyalahi undang-undangnya sendiri. KHLIM tidak mengecualikan liabiliti atau remedi yang tidak dibenarkan oleh undang-undang Malaysia untuk dikecualikan. Apa-apa had dalam terma ini hendaklah dibaca tertakluk kepada undang-undang perlindungan pengguna dan undang-undang mandatori lain.",
      ],
    },
    {
      title: "11. Undang-undang terpakai dan hubungan",
      paragraphs: [
        `Terma ini dikawal oleh undang-undang Malaysia. Pertanyaan tentang terma ini boleh dihantar ke ${contact} atau melalui halaman hubungan KHLIM. Tiada apa-apa di sini menghalang pengguna daripada menggunakan saluran aduan, tribunal atau mahkamah yang tersedia di bawah undang-undang berkenaan.`,
      ],
    },
  ];

  return (
    <LegalDocument
      title="Academy Terms and Conditions"
      malayTitle="Terma dan Syarat Akademi"
      effectiveDate={EFFECTIVE_DATE}
      englishIntro="Please read these terms before creating an account, enrolling an athlete or paying for an academy plan. Plan-specific commercial terms shown before checkout form part of the agreement and must not contradict non-excludable Malaysian consumer rights."
      malayIntro="Sila baca terma ini sebelum mewujudkan akaun, mendaftarkan atlet atau membuat pembayaran bagi pelan akademi. Terma komersial khusus pelan yang dipaparkan sebelum pembayaran menjadi sebahagian daripada perjanjian dan tidak boleh bercanggah dengan hak pengguna Malaysia yang tidak boleh dikecualikan."
      englishSections={englishSections}
      malaySections={malaySections}
    />
  );
}
