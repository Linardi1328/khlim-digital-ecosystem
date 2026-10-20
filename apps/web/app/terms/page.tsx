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
        <React.Fragment key="terms-en-refund-policy-link">
          The <Link href="/refunds">Refund Policy</Link> forms part of these
          terms. Nothing in these terms is intended to exclude, restrict or
          modify a consumer guarantee, remedy or other right that cannot
          lawfully be excluded under Malaysian law.
        </React.Fragment>,
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
        <React.Fragment key="terms-en-privacy-policy-link">
          Personal data is handled under the{" "}
          <Link href="/privacy">Privacy Policy</Link>. Optional marketing or
          media/publicity consent must be kept separate from consent needed for
          core enrolment where the optional use is not necessary to provide the
          service.
        </React.Fragment>,
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
        <React.Fragment key="terms-ms-refund-policy-link">
          <Link href="/refunds">Dasar Bayaran Balik</Link> menjadi sebahagian
          daripada terma ini. Tiada apa-apa dalam terma ini bertujuan
          mengecualikan, menyekat atau mengubah jaminan, remedi atau hak
          pengguna yang tidak boleh dikecualikan secara sah di bawah
          undang-undang Malaysia.
        </React.Fragment>,
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
        <React.Fragment key="terms-ms-privacy-policy-link">
          Data peribadi dikendalikan di bawah{" "}
          <Link href="/privacy">Dasar Privasi</Link>. Persetujuan pemasaran atau
          media/publisiti pilihan hendaklah diasingkan daripada persetujuan yang
          diperlukan untuk pendaftaran teras jika penggunaan pilihan itu tidak
          diperlukan untuk menyediakan perkhidmatan.
        </React.Fragment>,
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

  const chineseSections: LegalSection[] = [
    {
      title: "1. 运营方与协议 (Operator and agreement)",
      paragraphs: [
        `本条款适用于由 ${business.legalName}（“KHLIM”）提供的学院网站、会员门户、课程报名及会员服务。创建账户或完成报名即表示您同意本条款以及在付款前明确显示的任何特定计划信息。`,
        "若您为 18 岁以下人士报名，您确认自己是其父母、法定监护人或其他具有监护责任的人员，并有权进行报名并提供所需的个人数据同意。",
      ],
    },
    {
      title:
        "2. 课程项目、价格与服务信息 (Programme, price and service information)",
      paragraphs: [
        "在结账前，KHLIM 将展示所选学员、课程/项目、地点（若适用）、会员计划、价格、货币、账单结算周期以及平台支持的任何承诺期限。税费或其他强制性费用（如适用）必须在付款前包含在内或明确披露。",
        "课程描述、年龄段、容量和时间表受合理的运营调整约束。若重大调整导致 KHLIM 无法提供已付费服务，将根据《退款政策》和适用的马来西亚消费者权益法律处理。",
      ],
    },
    {
      title: "3. 账户与准确信息 (Accounts and accurate information)",
      paragraphs: [
        "您必须提供足够准确的信息，以便进行账户管理、参与者身份识别、资格核实与安全保障。请勿仅为规避监护人控制而创建儿童账户。请对登录凭证予以保密，并在合理怀疑账户遭到未授权访问时及时通知 KHLIM。",
      ],
    },
    {
      title: "4. 付款与周期性扣费 (Payments and recurring billing)",
      paragraphs: [
        "付款可由 Billplz 或结账时指明的其他支付服务商处理。KHLIM 绝不会要求您在 KHLIM 表单中输入原始卡号或 CVV 校验码。只有在 KHLIM 收到后端/支付服务商核实的付款成功状态后，付款才被视为成功。",
        "若计划按周期性分期付款计费，必须在结账前显示扣款金额、扣费频率和承诺期限，且您必须单独授权周期性扣费。在适用的消费者权利和《退款政策》的前提下，取消支付方式本身并不会免除根据约定计划已有效到期的应付金额。",
      ],
    },
    {
      title: "5. 取消与退款 (Cancellations and refunds)",
      paragraphs: [
        <React.Fragment key="terms-zh-refund-policy-link">
          <Link href="/refunds">退款政策 (Refund Policy)</Link>{" "}
          构成本条款的一部分。本条款中的任何内容均无意排除、限制或修改根据马来西亚法律无法依法排除的消费者法定保证、救济或其他权利。
        </React.Fragment>,
      ],
    },
    {
      title: "6. 出勤、行为规范与安全 (Attendance, conduct and safety)",
      paragraphs: [
        "参与者必须遵守场地、教练和安全方面的合理指示，并尊重其他参与者、工作人员和公共财产。出于安全需要、严重不当行为或逾期未缴费的合理必要情况，KHLIM 可暂停其参与资格，但不会利用本条款剥夺不可排除的法定权利。",
        "篮球和体育训练包含常规体育运动风险。KHLIM 不作任何医疗、伤病预防或保证成绩的声明。父母/监护人有责任确定参与者是否适合参加训练，并按 KHLIM 明确要求的渠道提供安全相关信息。",
      ],
    },
    {
      title:
        "7. 网站内容与知识产权 (Website content and intellectual property)",
      paragraphs: [
        "KHLIM 拥有的品牌标识、原创文字、图表及其他材料受适用的知识产权法保护。第三方材料仍受其所有者权利的约束。您可将本网站用于正常访问 KHLIM 服务的个人用途，但未经许可或无其他合法依据，不得复制、再发布或商业性利用受保护的材料。",
      ],
    },
    {
      title: "8. 服务可用性与变更 (Availability and changes)",
      paragraphs: [
        "KHLIM 可能会维护、保护、更新或暂时中断网站服务。我们不会故意对付费服务做出重大更改而不妥善解决对受影响客户的影响。政策或条款更新将标明新的生效日期；在适当时，重大变更可能需要新的通知或用户重新确认。",
      ],
    },
    {
      title: "9. 隐私 (Privacy)",
      paragraphs: [
        <React.Fragment key="terms-zh-privacy-policy-link">
          个人数据根据 <Link href="/privacy">隐私政策 (Privacy Policy)</Link>{" "}
          进行处理。如果可选用途对于提供核心服务并非必需，则可选的市场营销或媒体/宣传同意必须与核心报名所需的同意分开处理。
        </React.Fragment>,
      ],
    },
    {
      title:
        "10. 责任限制与马来西亚消费者权利 (Liability and Malaysian consumer rights)",
      paragraphs: [
        "在法律允许的最大范围内，各方对其自身的违约、疏忽或违法行为造成的损失承担责任。KHLIM 不排除马来西亚法律不允许排除的责任或救济。因此，本条款中的任何限制均必须受强制性消费者保护法及其他适用法律的约束。",
      ],
    },
    {
      title: "11. 管辖法律与联系方式 (Governing law and contact)",
      paragraphs: [
        `本条款受马来西亚法律管辖。有关本条款的问题可发送至 ${contact} 或通过 KHLIM 联系页面提交。此处的任何规定均不妨碍消费者利用适用法律下可用的任何投诉渠道、仲裁庭或法庭途径。`,
      ],
    },
  ];

  return (
    <LegalDocument
      title="Academy Terms and Conditions"
      malayTitle="Terma dan Syarat Akademi"
      chineseTitle="学院条款与条件"
      effectiveDate={EFFECTIVE_DATE}
      englishIntro="Please read these terms before creating an account, enrolling an athlete or paying for an academy plan. Plan-specific commercial terms shown before checkout form part of the agreement and must not contradict non-excludable Malaysian consumer rights."
      malayIntro="Sila baca terma ini sebelum mewujudkan akaun, mendaftarkan atlet atau membuat pembayaran bagi pelan akademi. Terma komersial khusus pelan yang dipaparkan sebelum pembayaran menjadi sebahagian daripada perjanjian dan tidak boleh bercanggah dengan hak pengguna Malaysia yang tidak boleh dikecualikan."
      chineseIntro="在创建账户、为学员报名或为学院计划付款之前，请仔细阅读本条款。结账前显示的特定计划商业条款构成本协议的一部分，且不得与不可排除的马来西亚消费者法定权利相抵触。"
      englishSections={englishSections}
      malaySections={malaySections}
      chineseSections={chineseSections}
    />
  );
}
