const en = {
  "enrol.error.loadOfferings":
    "Unable to load current academy offerings from the KHLIM API.",
  "enrol.error.selectOffering": "Select an available programme offering.",
  "enrol.error.selectPlan":
    "Select a valid membership plan with configured pricing.",
  "enrol.error.acceptTerms":
    "Accept the membership terms and any required recurring-billing authorization to continue.",
  "enrol.error.selectAthlete": "Select or create an athlete before checkout.",
  "enrol.error.createPending": "Unable to create the pending membership.",
  "enrol.header.eyebrow": "Academy Enrolment",
  "enrol.header.title": "Join KHLIM Basketball Academy",
  "enrol.header.subtitle":
    "Programme availability and pricing are loaded from the KHLIM backend.",
  "enrol.signIn.title": "Guardian sign-in required",
  "enrol.signIn.body":
    "Sign in before creating or selecting a managed athlete.",
  "enrol.dateOfBirthLabel": "Date of birth",
  "enrol.loadingOfferings": "Loading offerings…",
  "enrol.noOfferings": "No open programme offerings are currently available.",
  "enrol.venueToBeConfirmed": "Venue to be confirmed",
  "enrol.starts": "Starts {date}",
  "enrol.capacity": "Capacity {count}",
  "enrol.noActivePlans": "No active plans are linked to this offering.",
  "enrol.pricingUnavailable": "Pricing unavailable",
  "enrol.upfrontPayment": "one-time upfront payment",
  "enrol.monthlyInstallments": "{count} monthly installment(s)",
  "enrol.review.subtitle":
    "Review the server-provided plan before billing authorization.",
  "enrol.review.player": "Player",
  "enrol.review.offering": "Offering",
  "enrol.review.plan": "Plan",
  "enrol.review.amount": "Amount",
  "enrol.review.unavailable": "Unavailable",
  "enrol.review.billing": "Billing",
  "enrol.review.recurringAuthorization":
    "I authorize the recurring installment schedule shown above.",
  "enrol.terms.acceptPrefix": "I accept the",
  "enrol.terms.membershipLink": "draft KHLIM membership terms",
  "enrol.terms.and": "and",
  "enrol.terms.privacyLink": "privacy notice",
  "enrol.payment.description":
    "Checkout is hosted by the configured payment provider.",
  "enrol.payment.handoffTitle": "Secure provider handoff",
  "enrol.payment.handoffBody":
    "KHLIM does not render or store card numbers or CVVs. If no provider is configured, your membership remains PENDING and no payment is claimed.",
  "enrol.payment.createAndContinue": "Create membership & continue to payment",
  "enrol.summary.title": "Enrolment summary",
  "enrol.summary.notSelected": "Not selected",
  "enrol.summary.apiSource":
    "Price and eligibility originate from the KHLIM API.",
  "enrol.loading": "Loading enrolment…",
  "enrol.confirmation.verifyMembershipError":
    "The requested membership could not be verified.",
  "enrol.confirmation.verifyStateError": "Unable to verify enrolment state.",
  "enrol.confirmation.verifying":
    "Verifying the current membership and billing state with KHLIM…",
  "enrol.confirmation.missingTitle": "Missing enrolment reference",
  "enrol.confirmation.missingBody":
    "This page requires an athlete and membership reference. Open the membership from your parent portal.",
  "enrol.confirmation.errorTitle": "Unable to verify enrolment state",
  "enrol.confirmation.safetyNotice":
    "No payment or membership success is being assumed.",
  "enrol.confirmation.retry": "Retry verification",
  "enrol.confirmation.activeTitle": "Membership active",
  "enrol.confirmation.pendingTitle": "Membership recorded — activation pending",
  "enrol.confirmation.activeBody":
    "KHLIM has verified the backend membership as ACTIVE.",
  "enrol.confirmation.pendingBody":
    "The backend currently reports this membership as pending or otherwise not active. Payment is not treated as successful until verified provider processing updates backend state.",
  "enrol.confirmation.membershipId": "Membership ID",
  "enrol.confirmation.offering": "Offering",
  "enrol.confirmation.plan": "Plan",
  "enrol.confirmation.backendStatus": "Backend status",
  "enrol.confirmation.parentDashboard": "Parent dashboard",
  "enrol.confirmation.membershipDetails": "Membership details",
  "enrol.confirmation.loading": "Loading confirmation…",
} as const;

type Key = keyof typeof en;
type Catalogue = Record<Key, string>;

const ms: Catalogue = {
  "enrol.error.loadOfferings":
    "Tidak dapat memuatkan tawaran akademi semasa daripada API KHLIM.",
  "enrol.error.selectOffering": "Pilih tawaran program yang tersedia.",
  "enrol.error.selectPlan":
    "Pilih pelan keahlian yang sah dengan harga yang dikonfigurasi.",
  "enrol.error.acceptTerms":
    "Terima syarat keahlian dan sebarang kebenaran pengebilan berulang yang diperlukan untuk meneruskan.",
  "enrol.error.selectAthlete": "Pilih atau cipta atlet sebelum pembayaran.",
  "enrol.error.createPending": "Tidak dapat mencipta keahlian yang menunggu.",
  "enrol.header.eyebrow": "Pendaftaran Akademi",
  "enrol.header.title": "Sertai Akademi Bola Keranjang KHLIM",
  "enrol.header.subtitle":
    "Ketersediaan program dan harga dimuatkan daripada pelayan KHLIM.",
  "enrol.signIn.title": "Log masuk penjaga diperlukan",
  "enrol.signIn.body":
    "Log masuk sebelum mencipta atau memilih atlet yang diurus.",
  "enrol.dateOfBirthLabel": "Tarikh lahir",
  "enrol.loadingOfferings": "Memuatkan tawaran…",
  "enrol.noOfferings":
    "Tiada tawaran program terbuka yang tersedia pada masa ini.",
  "enrol.venueToBeConfirmed": "Lokasi akan disahkan",
  "enrol.starts": "Bermula {date}",
  "enrol.capacity": "Kapasiti {count}",
  "enrol.noActivePlans": "Tiada pelan aktif dipautkan kepada tawaran ini.",
  "enrol.pricingUnavailable": "Harga tidak tersedia",
  "enrol.upfrontPayment": "bayaran pendahuluan sekali gus",
  "enrol.monthlyInstallments": "{count} ansuran bulanan",
  "enrol.review.subtitle":
    "Semak pelan yang diberikan pelayan sebelum kebenaran pengebilan.",
  "enrol.review.player": "Pemain",
  "enrol.review.offering": "Tawaran",
  "enrol.review.plan": "Pelan",
  "enrol.review.amount": "Jumlah",
  "enrol.review.unavailable": "Tidak tersedia",
  "enrol.review.billing": "Pengebilan",
  "enrol.review.recurringAuthorization":
    "Saya membenarkan jadual ansuran berulang yang ditunjukkan di atas.",
  "enrol.terms.acceptPrefix": "Saya menerima",
  "enrol.terms.membershipLink": "draf syarat keahlian KHLIM",
  "enrol.terms.and": "dan",
  "enrol.terms.privacyLink": "notis privasi",
  "enrol.payment.description":
    "Pembayaran dihoskan oleh penyedia pembayaran yang dikonfigurasi.",
  "enrol.payment.handoffTitle": "Serahan selamat kepada penyedia",
  "enrol.payment.handoffBody":
    "KHLIM tidak memaparkan atau menyimpan nombor kad atau CVV. Jika tiada penyedia dikonfigurasi, keahlian anda kekal MENUNGGU dan tiada pembayaran didakwa berjaya.",
  "enrol.payment.createAndContinue": "Cipta keahlian & teruskan ke pembayaran",
  "enrol.summary.title": "Ringkasan pendaftaran",
  "enrol.summary.notSelected": "Belum dipilih",
  "enrol.summary.apiSource": "Harga dan kelayakan berasal daripada API KHLIM.",
  "enrol.loading": "Memuatkan pendaftaran…",
  "enrol.confirmation.verifyMembershipError":
    "Keahlian yang diminta tidak dapat disahkan.",
  "enrol.confirmation.verifyStateError":
    "Tidak dapat mengesahkan status pendaftaran.",
  "enrol.confirmation.verifying":
    "Mengesahkan status keahlian dan pengebilan semasa dengan KHLIM…",
  "enrol.confirmation.missingTitle": "Rujukan pendaftaran tiada",
  "enrol.confirmation.missingBody":
    "Halaman ini memerlukan rujukan atlet dan keahlian. Buka keahlian daripada portal ibu bapa anda.",
  "enrol.confirmation.errorTitle": "Tidak dapat mengesahkan status pendaftaran",
  "enrol.confirmation.safetyNotice":
    "Tiada kejayaan pembayaran atau keahlian sedang dianggap.",
  "enrol.confirmation.retry": "Cuba pengesahan semula",
  "enrol.confirmation.activeTitle": "Keahlian aktif",
  "enrol.confirmation.pendingTitle":
    "Keahlian direkodkan — pengaktifan menunggu",
  "enrol.confirmation.activeBody":
    "KHLIM telah mengesahkan keahlian pada pelayan sebagai AKTIF.",
  "enrol.confirmation.pendingBody":
    "Pelayan kini melaporkan keahlian ini sebagai menunggu atau belum aktif. Pembayaran tidak dianggap berjaya sehingga pemprosesan penyedia yang disahkan mengemas kini status pelayan.",
  "enrol.confirmation.membershipId": "ID keahlian",
  "enrol.confirmation.offering": "Tawaran",
  "enrol.confirmation.plan": "Pelan",
  "enrol.confirmation.backendStatus": "Status pelayan",
  "enrol.confirmation.parentDashboard": "Papan pemuka ibu bapa",
  "enrol.confirmation.membershipDetails": "Butiran keahlian",
  "enrol.confirmation.loading": "Memuatkan pengesahan…",
};

const zhHans: Catalogue = {
  "enrol.error.loadOfferings": "无法从 KHLIM API 加载当前学院班次。",
  "enrol.error.selectOffering": "请选择可用的课程班次。",
  "enrol.error.selectPlan": "请选择已配置价格的有效会籍方案。",
  "enrol.error.acceptTerms": "请接受会籍条款以及所需的定期扣款授权后继续。",
  "enrol.error.selectAthlete": "结账前请选择或创建学员。",
  "enrol.error.createPending": "无法创建待处理会籍。",
  "enrol.header.eyebrow": "学院报名",
  "enrol.header.title": "加入 KHLIM 篮球学院",
  "enrol.header.subtitle": "课程名额和价格均从 KHLIM 后端加载。",
  "enrol.signIn.title": "需要监护人登录",
  "enrol.signIn.body": "创建或选择受管理学员前请先登录。",
  "enrol.dateOfBirthLabel": "出生日期",
  "enrol.loadingOfferings": "正在加载班次…",
  "enrol.noOfferings": "目前没有可用的开放课程班次。",
  "enrol.venueToBeConfirmed": "场地待确认",
  "enrol.starts": "{date} 开始",
  "enrol.capacity": "名额 {count}",
  "enrol.noActivePlans": "此班次没有关联的有效方案。",
  "enrol.pricingUnavailable": "价格不可用",
  "enrol.upfrontPayment": "一次性预付",
  "enrol.monthlyInstallments": "{count} 期月度分期",
  "enrol.review.subtitle": "授权扣款前请核对服务器提供的方案。",
  "enrol.review.player": "学员",
  "enrol.review.offering": "班次",
  "enrol.review.plan": "方案",
  "enrol.review.amount": "金额",
  "enrol.review.unavailable": "不可用",
  "enrol.review.billing": "计费方式",
  "enrol.review.recurringAuthorization":
    "我授权按上方所示的定期分期计划进行扣款。",
  "enrol.terms.acceptPrefix": "我接受",
  "enrol.terms.membershipLink": "KHLIM 会籍条款草案",
  "enrol.terms.and": "以及",
  "enrol.terms.privacyLink": "隐私通知",
  "enrol.payment.description": "结账由已配置的支付服务商托管。",
  "enrol.payment.handoffTitle": "安全跳转至支付服务商",
  "enrol.payment.handoffBody":
    "KHLIM 不显示或存储银行卡号或 CVV。如果未配置支付服务商，您的会籍会保持待处理状态，系统不会声称付款成功。",
  "enrol.payment.createAndContinue": "创建会籍并继续付款",
  "enrol.summary.title": "报名摘要",
  "enrol.summary.notSelected": "尚未选择",
  "enrol.summary.apiSource": "价格与资格均以 KHLIM API 为准。",
  "enrol.loading": "正在加载报名流程…",
  "enrol.confirmation.verifyMembershipError": "无法验证所请求的会籍。",
  "enrol.confirmation.verifyStateError": "无法验证报名状态。",
  "enrol.confirmation.verifying": "正在通过 KHLIM 验证当前会籍和账单状态…",
  "enrol.confirmation.missingTitle": "缺少报名引用",
  "enrol.confirmation.missingBody":
    "此页面需要学员和会籍引用。请从家长门户打开相应会籍。",
  "enrol.confirmation.errorTitle": "无法验证报名状态",
  "enrol.confirmation.safetyNotice": "系统不会假定付款或会籍已经成功。",
  "enrol.confirmation.retry": "重新验证",
  "enrol.confirmation.activeTitle": "会籍已生效",
  "enrol.confirmation.pendingTitle": "会籍已记录 — 等待激活",
  "enrol.confirmation.activeBody": "KHLIM 已确认后端会籍状态为已生效。",
  "enrol.confirmation.pendingBody":
    "后端当前报告此会籍仍在等待或尚未生效。只有经验证的支付服务商处理更新后端状态后，系统才会将付款视为成功。",
  "enrol.confirmation.membershipId": "会籍 ID",
  "enrol.confirmation.offering": "班次",
  "enrol.confirmation.plan": "方案",
  "enrol.confirmation.backendStatus": "后端状态",
  "enrol.confirmation.parentDashboard": "家长控制台",
  "enrol.confirmation.membershipDetails": "会籍详情",
  "enrol.confirmation.loading": "正在加载确认页面…",
};

const zhHant: Catalogue = {
  "enrol.error.loadOfferings": "無法從 KHLIM API 載入目前學院班次。",
  "enrol.error.selectOffering": "請選擇可用的課程班次。",
  "enrol.error.selectPlan": "請選擇已設定價格的有效會籍方案。",
  "enrol.error.acceptTerms": "請接受會籍條款以及所需的定期扣款授權後繼續。",
  "enrol.error.selectAthlete": "結帳前請選擇或建立學員。",
  "enrol.error.createPending": "無法建立待處理會籍。",
  "enrol.header.eyebrow": "學院報名",
  "enrol.header.title": "加入 KHLIM 籃球學院",
  "enrol.header.subtitle": "課程名額和價格均從 KHLIM 後端載入。",
  "enrol.signIn.title": "需要監護人登入",
  "enrol.signIn.body": "建立或選擇受管理學員前請先登入。",
  "enrol.dateOfBirthLabel": "出生日期",
  "enrol.loadingOfferings": "正在載入班次…",
  "enrol.noOfferings": "目前沒有可用的開放課程班次。",
  "enrol.venueToBeConfirmed": "場地待確認",
  "enrol.starts": "{date} 開始",
  "enrol.capacity": "名額 {count}",
  "enrol.noActivePlans": "此班次沒有關聯的有效方案。",
  "enrol.pricingUnavailable": "價格不可用",
  "enrol.upfrontPayment": "一次性預付",
  "enrol.monthlyInstallments": "{count} 期每月分期",
  "enrol.review.subtitle": "授權扣款前請核對伺服器提供的方案。",
  "enrol.review.player": "學員",
  "enrol.review.offering": "班次",
  "enrol.review.plan": "方案",
  "enrol.review.amount": "金額",
  "enrol.review.unavailable": "不可用",
  "enrol.review.billing": "計費方式",
  "enrol.review.recurringAuthorization":
    "我授權按上方所示的定期分期計劃進行扣款。",
  "enrol.terms.acceptPrefix": "我接受",
  "enrol.terms.membershipLink": "KHLIM 會籍條款草案",
  "enrol.terms.and": "以及",
  "enrol.terms.privacyLink": "私隱通知",
  "enrol.payment.description": "結帳由已設定的支付服務商託管。",
  "enrol.payment.handoffTitle": "安全跳轉至支付服務商",
  "enrol.payment.handoffBody":
    "KHLIM 不顯示或儲存銀行卡號或 CVV。如果未設定支付服務商，您的會籍會保持待處理狀態，系統不會聲稱付款成功。",
  "enrol.payment.createAndContinue": "建立會籍並繼續付款",
  "enrol.summary.title": "報名摘要",
  "enrol.summary.notSelected": "尚未選擇",
  "enrol.summary.apiSource": "價格與資格均以 KHLIM API 為準。",
  "enrol.loading": "正在載入報名流程…",
  "enrol.confirmation.verifyMembershipError": "無法驗證所要求的會籍。",
  "enrol.confirmation.verifyStateError": "無法驗證報名狀態。",
  "enrol.confirmation.verifying": "正在透過 KHLIM 驗證目前會籍和帳單狀態…",
  "enrol.confirmation.missingTitle": "缺少報名參照",
  "enrol.confirmation.missingBody":
    "此頁面需要學員和會籍參照。請從家長門戶開啟相應會籍。",
  "enrol.confirmation.errorTitle": "無法驗證報名狀態",
  "enrol.confirmation.safetyNotice": "系統不會假定付款或會籍已經成功。",
  "enrol.confirmation.retry": "重新驗證",
  "enrol.confirmation.activeTitle": "會籍已生效",
  "enrol.confirmation.pendingTitle": "會籍已記錄 — 等待啟用",
  "enrol.confirmation.activeBody": "KHLIM 已確認後端會籍狀態為已生效。",
  "enrol.confirmation.pendingBody":
    "後端目前報告此會籍仍在等待或尚未生效。只有經驗證的支付服務商處理更新後端狀態後，系統才會將付款視為成功。",
  "enrol.confirmation.membershipId": "會籍 ID",
  "enrol.confirmation.offering": "班次",
  "enrol.confirmation.plan": "方案",
  "enrol.confirmation.backendStatus": "後端狀態",
  "enrol.confirmation.parentDashboard": "家長控制台",
  "enrol.confirmation.membershipDetails": "會籍詳情",
  "enrol.confirmation.loading": "正在載入確認頁面…",
};

const hi: Catalogue = {
  "enrol.error.loadOfferings":
    "KHLIM API से वर्तमान अकादमी विकल्प लोड नहीं किए जा सके।",
  "enrol.error.selectOffering": "उपलब्ध कार्यक्रम विकल्प चुनें।",
  "enrol.error.selectPlan": "कॉन्फ़िगर मूल्य वाली मान्य सदस्यता योजना चुनें।",
  "enrol.error.acceptTerms":
    "जारी रखने के लिए सदस्यता शर्तें और आवश्यक आवर्ती-बिलिंग अनुमति स्वीकार करें।",
  "enrol.error.selectAthlete": "चेकआउट से पहले खिलाड़ी चुनें या बनाएँ।",
  "enrol.error.createPending": "लंबित सदस्यता बनाई नहीं जा सकी।",
  "enrol.header.eyebrow": "अकादमी नामांकन",
  "enrol.header.title": "KHLIM बास्केटबॉल अकादमी में शामिल हों",
  "enrol.header.subtitle":
    "कार्यक्रम उपलब्धता और मूल्य KHLIM बैकएंड से लोड किए जाते हैं।",
  "enrol.signIn.title": "अभिभावक साइन इन आवश्यक है",
  "enrol.signIn.body": "प्रबंधित खिलाड़ी बनाने या चुनने से पहले साइन इन करें।",
  "enrol.dateOfBirthLabel": "जन्म तिथि",
  "enrol.loadingOfferings": "विकल्प लोड हो रहे हैं…",
  "enrol.noOfferings": "अभी कोई खुला कार्यक्रम विकल्प उपलब्ध नहीं है।",
  "enrol.venueToBeConfirmed": "स्थान की पुष्टि बाकी है",
  "enrol.starts": "{date} से शुरू",
  "enrol.capacity": "क्षमता {count}",
  "enrol.noActivePlans": "इस विकल्प से कोई सक्रिय योजना जुड़ी नहीं है।",
  "enrol.pricingUnavailable": "मूल्य उपलब्ध नहीं है",
  "enrol.upfrontPayment": "एक बार अग्रिम भुगतान",
  "enrol.monthlyInstallments": "{count} मासिक किस्तें",
  "enrol.review.subtitle":
    "बिलिंग अनुमति से पहले सर्वर द्वारा दी गई योजना की समीक्षा करें।",
  "enrol.review.player": "खिलाड़ी",
  "enrol.review.offering": "विकल्प",
  "enrol.review.plan": "योजना",
  "enrol.review.amount": "राशि",
  "enrol.review.unavailable": "उपलब्ध नहीं",
  "enrol.review.billing": "बिलिंग",
  "enrol.review.recurringAuthorization":
    "मैं ऊपर दिखाई गई आवर्ती किस्त अनुसूची को अधिकृत करता/करती हूँ।",
  "enrol.terms.acceptPrefix": "मैं स्वीकार करता/करती हूँ",
  "enrol.terms.membershipLink": "KHLIM सदस्यता शर्तों का मसौदा",
  "enrol.terms.and": "और",
  "enrol.terms.privacyLink": "गोपनीयता सूचना",
  "enrol.payment.description":
    "चेकआउट कॉन्फ़िगर किए गए भुगतान प्रदाता द्वारा होस्ट किया जाता है।",
  "enrol.payment.handoffTitle": "सुरक्षित प्रदाता हस्तांतरण",
  "enrol.payment.handoffBody":
    "KHLIM कार्ड नंबर या CVV प्रदर्शित या संग्रहीत नहीं करता। यदि कोई प्रदाता कॉन्फ़िगर नहीं है, तो आपकी सदस्यता लंबित रहती है और किसी भुगतान को सफल नहीं बताया जाता।",
  "enrol.payment.createAndContinue": "सदस्यता बनाएँ और भुगतान जारी रखें",
  "enrol.summary.title": "नामांकन सारांश",
  "enrol.summary.notSelected": "चयनित नहीं",
  "enrol.summary.apiSource": "मूल्य और पात्रता KHLIM API से आते हैं।",
  "enrol.loading": "नामांकन लोड हो रहा है…",
  "enrol.confirmation.verifyMembershipError":
    "अनुरोधित सदस्यता सत्यापित नहीं की जा सकी।",
  "enrol.confirmation.verifyStateError":
    "नामांकन स्थिति सत्यापित नहीं की जा सकी।",
  "enrol.confirmation.verifying":
    "KHLIM के साथ वर्तमान सदस्यता और बिलिंग स्थिति सत्यापित की जा रही है…",
  "enrol.confirmation.missingTitle": "नामांकन संदर्भ गायब है",
  "enrol.confirmation.missingBody":
    "इस पेज के लिए खिलाड़ी और सदस्यता संदर्भ आवश्यक हैं। अपने अभिभावक पोर्टल से सदस्यता खोलें।",
  "enrol.confirmation.errorTitle": "नामांकन स्थिति सत्यापित नहीं की जा सकी",
  "enrol.confirmation.safetyNotice":
    "किसी भुगतान या सदस्यता की सफलता मानकर नहीं चली जा रही है।",
  "enrol.confirmation.retry": "फिर से सत्यापित करें",
  "enrol.confirmation.activeTitle": "सदस्यता सक्रिय है",
  "enrol.confirmation.pendingTitle": "सदस्यता दर्ज है — सक्रियण लंबित है",
  "enrol.confirmation.activeBody":
    "KHLIM ने बैकएंड सदस्यता को सक्रिय के रूप में सत्यापित किया है।",
  "enrol.confirmation.pendingBody":
    "बैकएंड अभी इस सदस्यता को लंबित या अन्यथा निष्क्रिय बता रहा है। भुगतान को तब तक सफल नहीं माना जाता जब तक सत्यापित प्रदाता प्रोसेसिंग बैकएंड स्थिति अपडेट न कर दे।",
  "enrol.confirmation.membershipId": "सदस्यता ID",
  "enrol.confirmation.offering": "विकल्प",
  "enrol.confirmation.plan": "योजना",
  "enrol.confirmation.backendStatus": "बैकएंड स्थिति",
  "enrol.confirmation.parentDashboard": "अभिभावक डैशबोर्ड",
  "enrol.confirmation.membershipDetails": "सदस्यता विवरण",
  "enrol.confirmation.loading": "पुष्टि लोड हो रही है…",
};

export const enrolWebMessages = {
  en,
  ms,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  hi,
} as const;
