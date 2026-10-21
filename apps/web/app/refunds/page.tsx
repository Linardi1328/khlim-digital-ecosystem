import React from "react";
import Link from "next/link";
import {
  LegalDocument,
  type LegalSection,
} from "../../components/legal/legal-document";
import { getPublicBusinessDetails } from "../../lib/business-details";

const EFFECTIVE_DATE = "11 September 2026";

export default function RefundPolicyPage() {
  const business = getPublicBusinessDetails();
  const contact = business.email || "the contact form";
  const contactZh = business.email || "联络表格";

  const englishSections: LegalSection[] = [
    {
      title: "1. Statutory rights come first",
      paragraphs: [
        "This policy is a baseline customer policy for KHLIM academy services. It does not exclude, restrict or replace any refund, remedy, consumer guarantee or other right that cannot lawfully be excluded under Malaysian law.",
      ],
    },
    {
      title: "2. Refund before the paid service period starts",
      paragraphs: [
        "If you cancel before the first scheduled session of the paid service period and KHLIM has not yet supplied any part of that paid service, you may request a full refund of the amount paid for that service period. Any plan-specific condition that would materially change this rule must be clearly disclosed before checkout and remain subject to applicable law.",
      ],
    },
    {
      title: "3. KHLIM cancellation or inability to supply",
      paragraphs: [
        "If KHLIM cancels a paid programme, materially changes it so the purchased service cannot reasonably be supplied, or cannot provide a paid session/service, KHLIM will offer an appropriate remedy such as a replacement, credit or refund for the affected unused service. If an offered alternative is materially different from what was purchased and you reasonably decline it, KHLIM will refund the affected unused amount, subject to applicable law.",
      ],
    },
    {
      title: "4. After the service period has started",
      paragraphs: [
        "After the paid service period has started, amounts relating to sessions already attended or services already supplied are normally not refundable for a change of mind. For unused future service, KHLIM will apply the cancellation terms clearly disclosed for the selected plan before checkout, together with this policy and any mandatory consumer rights. If no more specific cancellation rule was disclosed before checkout, KHLIM will not invent a harsher rule after payment.",
      ],
    },
    {
      title: "5. Missed sessions",
      paragraphs: [
        "A session missed by the participant does not automatically create a refund right where KHLIM made the purchased session available as agreed. KHLIM may offer a make-up session or credit as a goodwill or operational measure. This does not affect remedies that apply where KHLIM failed to supply the service as required by law or contract.",
      ],
    },
    {
      title: "6. Duplicate, incorrect or unauthorised charges",
      paragraphs: [
        "Tell KHLIM promptly if you believe you were charged twice, charged the wrong amount or charged without authority. Verified duplicate or incorrect charges will be corrected or refunded. Suspected unauthorised-payment cases may also need to be handled with the payment provider or financial institution.",
      ],
    },
    {
      title: "7. How to request a refund",
      paragraphs: [
        `Contact ${contact} or use the KHLIM contact page. Include the payer's name, athlete/member name, programme or membership, payment date and enough transaction information for KHLIM to locate the payment. Do not send card numbers, CVVs or online-banking passwords.`,
        "KHLIM may ask for reasonable information to verify the payer, guardian authority or transaction before issuing money. Approved refunds should be returned through the original payment channel where reasonably possible. Processing time can depend on the payment provider or bank; KHLIM will not promise a faster settlement time than it can control.",
      ],
    },
    {
      title: "8. Recurring plans",
      paragraphs: [
        "A refund request and a cancellation of future recurring billing are different actions. If a recurring membership is eligible to end, KHLIM should stop future instalments in accordance with the applicable plan terms and law after the cancellation takes effect. Amounts already validly due or services already supplied are handled separately under this policy.",
      ],
    },
    {
      title: "9. Questions",
      paragraphs: [
        <React.Fragment key="refunds-en-s9-terms-privacy-links">
          For related contract terms, see the{" "}
          <Link href="/terms">Terms and Conditions</Link>. For payment-related
          personal data, see the <Link href="/privacy">Privacy Policy</Link>.
        </React.Fragment>,
      ],
    },
  ];

  const malaySections: LegalSection[] = [
    {
      title: "1. Hak statutori diutamakan",
      paragraphs: [
        "Dasar ini ialah dasar asas pelanggan untuk perkhidmatan akademi KHLIM. Ia tidak mengecualikan, menyekat atau menggantikan apa-apa bayaran balik, remedi, jaminan pengguna atau hak lain yang tidak boleh dikecualikan secara sah di bawah undang-undang Malaysia.",
      ],
    },
    {
      title: "2. Bayaran balik sebelum tempoh perkhidmatan berbayar bermula",
      paragraphs: [
        "Jika anda membatalkan sebelum sesi pertama yang dijadualkan bagi tempoh perkhidmatan berbayar dan KHLIM belum membekalkan mana-mana bahagian perkhidmatan berbayar itu, anda boleh meminta bayaran balik penuh bagi amaun yang dibayar untuk tempoh tersebut. Apa-apa syarat khusus pelan yang mengubah peraturan ini secara material hendaklah didedahkan dengan jelas sebelum pembayaran dan tetap tertakluk kepada undang-undang berkenaan.",
      ],
    },
    {
      title: "3. Pembatalan oleh KHLIM atau kegagalan membekalkan",
      paragraphs: [
        "Jika KHLIM membatalkan program berbayar, membuat perubahan material sehingga perkhidmatan dibeli tidak dapat dibekalkan secara munasabah, atau tidak dapat menyediakan sesi/perkhidmatan berbayar, KHLIM akan menawarkan remedi yang sesuai seperti sesi gantian, kredit atau bayaran balik bagi perkhidmatan terjejas yang belum digunakan. Jika alternatif yang ditawarkan berbeza secara material daripada apa yang dibeli dan anda menolaknya secara munasabah, KHLIM akan memulangkan amaun terjejas yang belum digunakan, tertakluk kepada undang-undang berkenaan.",
      ],
    },
    {
      title: "4. Selepas tempoh perkhidmatan bermula",
      paragraphs: [
        "Selepas tempoh perkhidmatan berbayar bermula, amaun bagi sesi yang telah dihadiri atau perkhidmatan yang telah dibekalkan biasanya tidak boleh dibayar balik kerana perubahan fikiran. Bagi perkhidmatan masa hadapan yang belum digunakan, KHLIM akan menggunakan terma pembatalan yang didedahkan dengan jelas untuk pelan dipilih sebelum pembayaran, bersama dasar ini dan hak pengguna mandatori. Jika tiada peraturan pembatalan khusus didedahkan sebelum pembayaran, KHLIM tidak akan mencipta peraturan yang lebih keras selepas pembayaran.",
      ],
    },
    {
      title: "5. Sesi yang tidak dihadiri",
      paragraphs: [
        "Sesi yang tidak dihadiri oleh peserta tidak secara automatik mewujudkan hak bayaran balik jika KHLIM telah menyediakan sesi yang dibeli seperti dipersetujui. KHLIM boleh menawarkan sesi gantian atau kredit sebagai ihsan atau langkah operasi. Ini tidak menjejaskan remedi jika KHLIM gagal membekalkan perkhidmatan seperti dikehendaki undang-undang atau kontrak.",
      ],
    },
    {
      title: "6. Caj berganda, salah atau tanpa kebenaran",
      paragraphs: [
        "Maklumkan KHLIM dengan segera jika anda percaya anda dicaj dua kali, dicaj amaun yang salah atau dicaj tanpa kebenaran. Caj berganda atau salah yang disahkan akan diperbetulkan atau dibayar balik. Kes bayaran tanpa kebenaran mungkin juga perlu dikendalikan dengan penyedia pembayaran atau institusi kewangan.",
      ],
    },
    {
      title: "7. Cara meminta bayaran balik",
      paragraphs: [
        `Hubungi ${contact} atau gunakan halaman hubungan KHLIM. Sertakan nama pembayar, nama atlet/ahli, program atau keahlian, tarikh bayaran dan maklumat transaksi yang cukup untuk KHLIM mencari pembayaran. Jangan hantar nombor kad, CVV atau kata laluan perbankan dalam talian.`,
        "KHLIM boleh meminta maklumat munasabah untuk mengesahkan pembayar, kuasa penjaga atau transaksi sebelum memulangkan wang. Bayaran balik yang diluluskan hendaklah dikembalikan melalui saluran bayaran asal jika munasabah. Tempoh pemprosesan boleh bergantung pada penyedia pembayaran atau bank; KHLIM tidak akan menjanjikan tempoh penyelesaian yang lebih cepat daripada apa yang boleh dikawalnya.",
      ],
    },
    {
      title: "8. Pelan berulang",
      paragraphs: [
        "Permintaan bayaran balik dan pembatalan bil berulang masa hadapan ialah dua tindakan berbeza. Jika keahlian berulang layak ditamatkan, KHLIM hendaklah menghentikan ansuran masa hadapan mengikut terma pelan dan undang-undang selepas pembatalan berkuat kuasa. Amaun yang telah sah perlu dibayar atau perkhidmatan yang telah dibekalkan dikendalikan secara berasingan di bawah dasar ini.",
      ],
    },
    {
      title: "9. Pertanyaan",
      paragraphs: [
        <React.Fragment key="refunds-ms-s9-terms-privacy-links">
          Bagi terma kontrak berkaitan, lihat{" "}
          <Link href="/terms">Terma dan Syarat</Link>. Bagi data peribadi
          berkaitan pembayaran, lihat <Link href="/privacy">Dasar Privasi</Link>
          .
        </React.Fragment>,
      ],
    },
  ];

  const chineseSections: LegalSection[] = [
    {
      title: "1. 法定权利优先 (Statutory rights come first)",
      paragraphs: [
        "本政策是 KHLIM 学院服务的基础客户政策。它不会排除、限制或替代根据马来西亚法律无法合法排除的任何退款、救济、消费者保证或其他权利。",
      ],
    },
    {
      title:
        "2. 付费服务期开始前的退款 (Refund before the paid service period starts)",
      paragraphs: [
        "如果您在付费服务期的首个预定训练课程开始前取消，且 KHLIM 尚未提供该付费服务的任何部分，您可以申请全额退还为该服务期支付的金额。任何实质性改变此规则的特定计划条款必须在结账前明确披露，并始终符合适用法律。",
      ],
    },
    {
      title:
        "3. KHLIM 取消或无法提供服务 (KHLIM cancellation or inability to supply)",
      paragraphs: [
        "如果 KHLIM 取消付费课程、对其进行实质性修改致使所购服务无法合理提供，或无法提供已付费课程/服务，KHLIM 将针对受影响的未使用服务提供适当的救济，如替补课程、积分抵扣或退款。如果提供的替代方案与所购服务存在重大差异且您合理拒绝，KHLIM 将依法退还受影响的未使用金额。",
      ],
    },
    {
      title: "4. 服务期开始后 (After the service period has started)",
      paragraphs: [
        "付费服务期开始后，对于已参加的课程或已提供的服务，通常不因改变主意而予以退款。对于未使用的未来服务，KHLIM 将适用结账前为所选计划明确披露的取消条款，结合本政策和任何强制性消费者权利执行。如果结账前未披露更具体的取消规则，KHLIM 不会在付款后临时制定更严苛的规则。",
      ],
    },
    {
      title: "5. 缺席课程 (Missed sessions)",
      paragraphs: [
        "如果 KHLIM 已按约定提供了所购课程，参与者因个人原因缺席并不自动产生退款权利。KHLIM 可出于善意或运营安排提供补课或积分，但这不影响因 KHLIM 未依法或依约提供服务时适用的法定救济。",
      ],
    },
    {
      title:
        "6. 重复、错误或未授权扣费 (Duplicate, incorrect or unauthorised charges)",
      paragraphs: [
        "如果您认为自己被重复扣费、扣费金额错误或未经授权扣款，请立即通知 KHLIM。经核实的重复或错误扣费将予以更正或退款。涉嫌未经授权的支付案例可能还需要向支付服务商或金融机构报备处理。",
      ],
    },
    {
      title: "7. 如何申请退款 (How to request a refund)",
      paragraphs: [
        `请联系 ${contactZh} 或使用 KHLIM 联系页面。请提供付款人姓名、学员/会员姓名、课程或会员名称、付款日期以及足以让 KHLIM 定位该笔付款的交易凭据信息。请勿发送银行卡号、CVV 校验码或网银密码。`,
        "在退款前，KHLIM 可能会要求提供合理信息以核实付款人、监护人权限或交易真实性。经批准的退款在合理可行的情况下应通过原支付渠道退还。处理时间取决于支付服务商或银行；KHLIM 不承诺超出其可控范围的更快到账时间。",
      ],
    },
    {
      title: "8. 周期性扣费计划 (Recurring plans)",
      paragraphs: [
        "退款申请与取消未来的周期性账单属于不同操作。如果周期性会员符合终止条件，KHLIM 应在取消生效后根据适用计划条款和法律停止未来的扣款。已有效到期的应付金额或已提供的服务在此政策下单独处理。",
      ],
    },
    {
      title: "9. 疑问与相关政策 (Questions)",
      paragraphs: [
        <React.Fragment key="refunds-zh-s9-terms-privacy-links">
          有关相关合同条款，请参阅{" "}
          <Link href="/terms">服务条款 (Terms and Conditions)</Link>
          。有关支付相关的个人数据，请参阅{" "}
          <Link href="/privacy">隐私政策 (Privacy Policy)</Link>。
        </React.Fragment>,
      ],
    },
  ];

  return (
    <LegalDocument
      title="Refund and Cancellation Policy"
      malayTitle="Dasar Bayaran Balik dan Pembatalan"
      chineseTitle="退款与取消政策"
      effectiveDate={EFFECTIVE_DATE}
      englishIntro="This policy explains the baseline refund and cancellation treatment for KHLIM academy purchases. Specific membership-plan cancellation terms may add detail only if they are clearly disclosed before checkout and comply with applicable Malaysian law."
      malayIntro="Dasar ini menerangkan layanan asas bayaran balik dan pembatalan bagi pembelian akademi KHLIM. Terma pembatalan khusus pelan keahlian hanya boleh menambah butiran jika didedahkan dengan jelas sebelum pembayaran dan mematuhi undang-undang Malaysia yang berkenaan."
      chineseIntro="本政策说明 KHLIM 学院购买的基础退款和取消处理规则。具体会员计划取消条款只有在结账前明确披露且符合适用的马来西亚法律的前提下，方可作为补充细则。"
      englishSections={englishSections}
      malaySections={malaySections}
      chineseSections={chineseSections}
    />
  );
}
