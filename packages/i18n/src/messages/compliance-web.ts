const en = {
  "compliance.enrol.guardianConsentRequired":
    "Guardian consent is required before a minor athlete profile can be created.",
  "compliance.enrol.checkoutUnavailable":
    "Online checkout is temporarily unavailable until KHLIM's required public business disclosure details are configured.",
  "compliance.enrol.checkoutDisabledTitle":
    "Online checkout temporarily disabled",
  "compliance.enrol.checkoutDisabledBody":
    "Required public seller details are not configured yet ({fields}). KHLIM will not send you to payment until those disclosures are complete.",
  "compliance.khero.mediaPendingRights": "Media pending rights verification",
  "compliance.footer.companyNumberLabel": "Company No.",
  "compliance.footer.emailLabel": "Email",
  "compliance.footer.telephoneLabel": "Tel",
  "compliance.footer.businessDisclosureIncomplete":
    "Business disclosure incomplete — online checkout is disabled.",
  "compliance.footer.legalHeading": "Legal",
  "compliance.footer.terms": "Terms & Conditions",
  "compliance.footer.privacy": "Privacy Policy",
  "compliance.footer.cookies": "Cookie Policy",
  "compliance.footer.refunds": "Refund Policy",
} as const;

type Key = keyof typeof en;
type Catalogue = Record<Key, string>;

const ms: Catalogue = {
  "compliance.enrol.guardianConsentRequired":
    "Persetujuan penjaga diperlukan sebelum profil atlet bawah umur boleh diwujudkan.",
  "compliance.enrol.checkoutUnavailable":
    "Pembayaran dalam talian tidak tersedia buat sementara sehingga butiran pendedahan perniagaan awam KHLIM yang diperlukan dilengkapkan.",
  "compliance.enrol.checkoutDisabledTitle":
    "Pembayaran dalam talian dinyahaktifkan buat sementara",
  "compliance.enrol.checkoutDisabledBody":
    "Butiran penjual awam yang diperlukan belum dikonfigurasi ({fields}). KHLIM tidak akan menghantar anda ke pembayaran sehingga pendedahan tersebut lengkap.",
  "compliance.khero.mediaPendingRights":
    "Media menunggu pengesahan hak penerbitan",
  "compliance.footer.companyNumberLabel": "No. Syarikat",
  "compliance.footer.emailLabel": "E-mel",
  "compliance.footer.telephoneLabel": "Tel",
  "compliance.footer.businessDisclosureIncomplete":
    "Pendedahan perniagaan belum lengkap — pembayaran dalam talian dinyahaktifkan.",
  "compliance.footer.legalHeading": "Undang-undang",
  "compliance.footer.terms": "Terma & Syarat",
  "compliance.footer.privacy": "Dasar Privasi",
  "compliance.footer.cookies": "Dasar Kuki",
  "compliance.footer.refunds": "Dasar Bayaran Balik",
};

const zhHans: Catalogue = {
  "compliance.enrol.guardianConsentRequired":
    "创建未成年学员档案前必须取得监护人同意。",
  "compliance.enrol.checkoutUnavailable":
    "在 KHLIM 配置完成所需的公开商家披露资料前，在线结账暂不可用。",
  "compliance.enrol.checkoutDisabledTitle": "在线结账暂时停用",
  "compliance.enrol.checkoutDisabledBody":
    "所需的公开卖家资料尚未配置（{fields}）。在这些披露资料完整前，KHLIM 不会将您跳转至付款。",
  "compliance.khero.mediaPendingRights": "媒体内容等待发布权利确认",
  "compliance.footer.companyNumberLabel": "公司编号",
  "compliance.footer.emailLabel": "电子邮箱",
  "compliance.footer.telephoneLabel": "电话",
  "compliance.footer.businessDisclosureIncomplete":
    "商家披露资料不完整 — 在线结账已停用。",
  "compliance.footer.legalHeading": "法律信息",
  "compliance.footer.terms": "条款与条件",
  "compliance.footer.privacy": "隐私政策",
  "compliance.footer.cookies": "Cookie 政策",
  "compliance.footer.refunds": "退款政策",
};

const zhHant: Catalogue = {
  "compliance.enrol.guardianConsentRequired":
    "建立未成年學員檔案前必須取得監護人同意。",
  "compliance.enrol.checkoutUnavailable":
    "在 KHLIM 完成所需的公開商家披露資料設定前，網上結帳暫不可用。",
  "compliance.enrol.checkoutDisabledTitle": "網上結帳暫時停用",
  "compliance.enrol.checkoutDisabledBody":
    "所需的公開賣家資料尚未設定（{fields}）。在這些披露資料完整前，KHLIM 不會將您轉至付款。",
  "compliance.khero.mediaPendingRights": "媒體內容等待發布權利確認",
  "compliance.footer.companyNumberLabel": "公司編號",
  "compliance.footer.emailLabel": "電子郵箱",
  "compliance.footer.telephoneLabel": "電話",
  "compliance.footer.businessDisclosureIncomplete":
    "商家披露資料不完整 — 網上結帳已停用。",
  "compliance.footer.legalHeading": "法律資訊",
  "compliance.footer.terms": "條款與條件",
  "compliance.footer.privacy": "私隱政策",
  "compliance.footer.cookies": "Cookie 政策",
  "compliance.footer.refunds": "退款政策",
};

const hi: Catalogue = {
  "compliance.enrol.guardianConsentRequired":
    "नाबालिग खिलाड़ी की प्रोफ़ाइल बनाने से पहले अभिभावक की सहमति आवश्यक है।",
  "compliance.enrol.checkoutUnavailable":
    "KHLIM की आवश्यक सार्वजनिक व्यावसायिक जानकारी कॉन्फ़िगर होने तक ऑनलाइन चेकआउट अस्थायी रूप से उपलब्ध नहीं है।",
  "compliance.enrol.checkoutDisabledTitle":
    "ऑनलाइन चेकआउट अस्थायी रूप से बंद है",
  "compliance.enrol.checkoutDisabledBody":
    "आवश्यक सार्वजनिक विक्रेता विवरण अभी कॉन्फ़िगर नहीं हैं ({fields})। ये विवरण पूरे होने तक KHLIM आपको भुगतान के लिए आगे नहीं भेजेगा।",
  "compliance.khero.mediaPendingRights":
    "मीडिया प्रकाशन अधिकारों की पुष्टि की प्रतीक्षा में है",
  "compliance.footer.companyNumberLabel": "कंपनी नं.",
  "compliance.footer.emailLabel": "ईमेल",
  "compliance.footer.telephoneLabel": "टेल",
  "compliance.footer.businessDisclosureIncomplete":
    "व्यावसायिक जानकारी अधूरी है — ऑनलाइन चेकआउट बंद है।",
  "compliance.footer.legalHeading": "कानूनी",
  "compliance.footer.terms": "नियम और शर्तें",
  "compliance.footer.privacy": "गोपनीयता नीति",
  "compliance.footer.cookies": "कुकी नीति",
  "compliance.footer.refunds": "रिफंड नीति",
};

export const complianceWebMessages = {
  en,
  ms,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  hi,
} as const;
