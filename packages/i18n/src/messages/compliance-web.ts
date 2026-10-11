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
  "compliance.consent.bannerTitle": "Cookie & Analytics Preferences",
  "compliance.consent.bannerBody":
    "With your permission, KHLIM uses privacy-respecting, opt-in analytics (PostHog US Cloud) to measure the 24 Oct 3x3 campaign without tracking individuals or recording form inputs. You can accept or decline, and change your mind at any time in the Cookie Policy.",
  "compliance.consent.acceptButton": "Accept Analytics",
  "compliance.consent.declineButton": "Decline",
  "compliance.consent.cookiePolicyLink": "Cookie Policy",
  "compliance.consent.statusTitle": "Analytics Preferences",
  "compliance.consent.withdrawnStatus": "Analytics disabled (opted out)",
  "compliance.consent.grantedStatus": "Analytics enabled (consented)",
  "compliance.consent.pendingStatus": "No preference set (disabled by default)",
  "compliance.consent.withdrawButton": "Withdraw Consent",
  "compliance.consent.grantButton": "Enable Analytics",
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
  "compliance.consent.bannerTitle": "Pilihan Kuki & Analitik",
  "compliance.consent.bannerBody":
    "Dengan kebenaran anda, KHLIM menggunakan analitik persetujuan pilihan (PostHog US Cloud) untuk mengukur kempen 3x3 24 Okt tanpa menjejak individu atau merakam borang. Anda boleh menerima atau menolak, dan mengubah pilihan anda pada bila-bila masa dalam Dasar Kuki.",
  "compliance.consent.acceptButton": "Terima Analitik",
  "compliance.consent.declineButton": "Tolak",
  "compliance.consent.cookiePolicyLink": "Dasar Kuki",
  "compliance.consent.statusTitle": "Pilihan Analitik",
  "compliance.consent.withdrawnStatus": "Analitik dinyahaktifkan (ditolak)",
  "compliance.consent.grantedStatus": "Analitik diaktifkan (dibenarkan)",
  "compliance.consent.pendingStatus":
    "Tiada pilihan ditetapkan (dimatikan secara lalai)",
  "compliance.consent.withdrawButton": "Tarik Balik Persetujuan",
  "compliance.consent.grantButton": "Dayakan Analitik",
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
  "compliance.consent.bannerTitle": "Cookie 与分析偏好设置",
  "compliance.consent.bannerBody":
    "经您许可，KHLIM 使用注重隐私的选择性分析（PostHog 美国云）来评估 10 月 24 日 3x3 活动，不追踪个人且不记录表单输入内容。您可以接受或拒绝，并可随时在 Cookie 政策中更改您的选择。",
  "compliance.consent.acceptButton": "接受分析",
  "compliance.consent.declineButton": "拒绝",
  "compliance.consent.cookiePolicyLink": "Cookie 政策",
  "compliance.consent.statusTitle": "分析偏好设置",
  "compliance.consent.withdrawnStatus": "分析已停用（已拒绝）",
  "compliance.consent.grantedStatus": "分析已启用（已同意）",
  "compliance.consent.pendingStatus": "尚未设置偏好（默认停用）",
  "compliance.consent.withdrawButton": "撤回同意",
  "compliance.consent.grantButton": "启用分析",
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
  "compliance.consent.bannerTitle": "Cookie 與分析偏好設定",
  "compliance.consent.bannerBody":
    "經您許可，KHLIM 使用注重私隱的選擇性分析（PostHog 美國雲）來評估 10 月 24 日 3x3 活動，不追蹤個人且不記錄表單輸入內容。您可以接受或拒絕，並可隨時在 Cookie 政策中更改您的選擇。",
  "compliance.consent.acceptButton": "接受分析",
  "compliance.consent.declineButton": "拒絕",
  "compliance.consent.cookiePolicyLink": "Cookie 政策",
  "compliance.consent.statusTitle": "分析偏好設定",
  "compliance.consent.withdrawnStatus": "分析已停用（已拒絕）",
  "compliance.consent.grantedStatus": "分析已啟用（已同意）",
  "compliance.consent.pendingStatus": "尚未設定偏好（預設停用）",
  "compliance.consent.withdrawButton": "撤回同意",
  "compliance.consent.grantButton": "啟用分析",
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
  "compliance.consent.bannerTitle": "कुकी और विश्लेषिकी प्राथमिकताएं",
  "compliance.consent.bannerBody":
    "आपकी अनुमति से, KHLIM 24 अक्टूबर के 3x3 अभियान को मापने के लिए व्यक्तियों को ट्रैक किए बिना या फ़ॉर्म इनपुट रिकॉर्ड किए बिना गोपनीयता-अनुकूल ऑप्ट-इन एनालिटिक्स (PostHog US Cloud) का उपयोग करता है। आप स्वीकार या अस्वीकार कर सकते हैं, और कुकी नीति में कभी भी अपना निर्णय बदल सकते हैं।",
  "compliance.consent.acceptButton": "एनालिटिक्स स्वीकार करें",
  "compliance.consent.declineButton": "अस्वीकार करें",
  "compliance.consent.cookiePolicyLink": "कुकी नीति",
  "compliance.consent.statusTitle": "एनालिटिक्स प्राथमिकताएं",
  "compliance.consent.withdrawnStatus": "एनालिटिक्स अक्षम (ऑप्ट आउट)",
  "compliance.consent.grantedStatus": "एनालिटिक्स सक्षम (सहमति प्राप्त)",
  "compliance.consent.pendingStatus":
    "कोई प्राथमिकता निर्धारित नहीं (डिफ़ॉल्ट रूप से अक्षम)",
  "compliance.consent.withdrawButton": "सहमति वापस लें",
  "compliance.consent.grantButton": "एनालिटिक्स सक्षम करें",
};

export const complianceWebMessages = {
  en,
  ms,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  hi,
} as const;
