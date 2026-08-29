const en = {
  "auth.login.error.required": "Please enter both email and password.",
  "auth.login.error.failed": "Sign in failed. Please verify your credentials.",
  "auth.login.loading": "Loading login…",
  "auth.register.error.invalid":
    "Enter your name, a valid email, and a password of at least 8 characters.",
  "auth.register.error.failed": "Registration failed.",
  "auth.register.verifyTitle": "Verify your email to continue",
  "auth.register.verifyBody":
    "Supabase requires email confirmation for {email}. Open the verification email, then sign in to finish your guardian profile.",
  "auth.register.minimumPassword": "Minimum 8 characters.",
  "auth.forgot.error.failed": "Password recovery request failed.",
  "auth.forgot.sentTitle": "Recovery Link Dispatched",
  "auth.forgot.sentBody":
    "If an account exists for {email}, a secure password reset link has been dispatched via Supabase Auth.",
  "auth.forgot.emailPlaceholder": "guardian@example.com",
  "auth.reset.error.minimum": "Password must contain at least 8 characters.",
  "auth.reset.error.mismatch": "Password confirmation does not match.",
  "auth.reset.error.failed": "Unable to update password.",
  "auth.reset.title": "Set a new password",
  "auth.reset.updatedTitle": "Password updated",
  "auth.reset.updatedBody": "Your Supabase account password has been changed.",
  "auth.reset.returnSignIn": "Return to sign in.",
  "auth.reset.unavailableTitle": "Recovery session unavailable",
  "auth.reset.unavailableBody":
    "Open this page from the latest password-recovery email. If the link has expired, request another reset link.",
  "auth.reset.newPassword": "New password",
  "auth.reset.confirmPassword": "Confirm new password",
  "auth.reset.submit": "Update password",
  "onboarding.guardian.error.displayName":
    "Please provide a guardian display name.",
  "onboarding.guardian.error.save": "Unable to save guardian profile.",
  "onboarding.guardian.phoneHelper":
    "Optional contact number stored in your KHLIM guardian profile.",
} as const;

type Key = keyof typeof en;
type Catalogue = Record<Key, string>;

const ms: Catalogue = {
  "auth.login.error.required": "Sila masukkan emel dan kata laluan.",
  "auth.login.error.failed": "Log masuk gagal. Sila semak kelayakan anda.",
  "auth.login.loading": "Memuatkan log masuk…",
  "auth.register.error.invalid":
    "Masukkan nama, emel yang sah dan kata laluan sekurang-kurangnya 8 aksara.",
  "auth.register.error.failed": "Pendaftaran gagal.",
  "auth.register.verifyTitle": "Sahkan emel anda untuk meneruskan",
  "auth.register.verifyBody":
    "Supabase memerlukan pengesahan emel untuk {email}. Buka emel pengesahan, kemudian log masuk untuk melengkapkan profil penjaga anda.",
  "auth.register.minimumPassword": "Minimum 8 aksara.",
  "auth.forgot.error.failed": "Permintaan pemulihan kata laluan gagal.",
  "auth.forgot.sentTitle": "Pautan Pemulihan Dihantar",
  "auth.forgot.sentBody":
    "Jika akaun wujud untuk {email}, pautan tetapan semula kata laluan yang selamat telah dihantar melalui Supabase Auth.",
  "auth.forgot.emailPlaceholder": "penjaga@example.com",
  "auth.reset.error.minimum":
    "Kata laluan mesti mengandungi sekurang-kurangnya 8 aksara.",
  "auth.reset.error.mismatch": "Pengesahan kata laluan tidak sepadan.",
  "auth.reset.error.failed": "Tidak dapat mengemas kini kata laluan.",
  "auth.reset.title": "Tetapkan kata laluan baharu",
  "auth.reset.updatedTitle": "Kata laluan dikemas kini",
  "auth.reset.updatedBody": "Kata laluan akaun Supabase anda telah ditukar.",
  "auth.reset.returnSignIn": "Kembali ke log masuk.",
  "auth.reset.unavailableTitle": "Sesi pemulihan tidak tersedia",
  "auth.reset.unavailableBody":
    "Buka halaman ini daripada emel pemulihan kata laluan yang terkini. Jika pautan telah tamat tempoh, minta pautan tetapan semula yang baharu.",
  "auth.reset.newPassword": "Kata laluan baharu",
  "auth.reset.confirmPassword": "Sahkan kata laluan baharu",
  "auth.reset.submit": "Kemas kini kata laluan",
  "onboarding.guardian.error.displayName": "Sila berikan nama paparan penjaga.",
  "onboarding.guardian.error.save": "Tidak dapat menyimpan profil penjaga.",
  "onboarding.guardian.phoneHelper":
    "Nombor hubungan pilihan yang disimpan dalam profil penjaga KHLIM anda.",
};

const zhHans: Catalogue = {
  "auth.login.error.required": "请输入电子邮箱和密码。",
  "auth.login.error.failed": "登录失败，请检查您的登录信息。",
  "auth.login.loading": "正在加载登录页面…",
  "auth.register.error.invalid":
    "请输入姓名、有效电子邮箱以及至少 8 个字符的密码。",
  "auth.register.error.failed": "注册失败。",
  "auth.register.verifyTitle": "请验证电子邮箱以继续",
  "auth.register.verifyBody":
    "Supabase 要求验证 {email}。请打开验证邮件，然后登录以完成监护人资料。",
  "auth.register.minimumPassword": "至少 8 个字符。",
  "auth.forgot.error.failed": "密码恢复请求失败。",
  "auth.forgot.sentTitle": "恢复链接已发送",
  "auth.forgot.sentBody":
    "如果 {email} 对应的账户存在，Supabase Auth 已发送安全的密码重置链接。",
  "auth.forgot.emailPlaceholder": "guardian@example.com",
  "auth.reset.error.minimum": "密码必须至少包含 8 个字符。",
  "auth.reset.error.mismatch": "两次输入的密码不一致。",
  "auth.reset.error.failed": "无法更新密码。",
  "auth.reset.title": "设置新密码",
  "auth.reset.updatedTitle": "密码已更新",
  "auth.reset.updatedBody": "您的 Supabase 账户密码已更改。",
  "auth.reset.returnSignIn": "返回登录。",
  "auth.reset.unavailableTitle": "恢复会话不可用",
  "auth.reset.unavailableBody":
    "请从最新的密码恢复邮件打开此页面。如果链接已过期，请重新申请重置链接。",
  "auth.reset.newPassword": "新密码",
  "auth.reset.confirmPassword": "确认新密码",
  "auth.reset.submit": "更新密码",
  "onboarding.guardian.error.displayName": "请输入监护人显示名称。",
  "onboarding.guardian.error.save": "无法保存监护人资料。",
  "onboarding.guardian.phoneHelper":
    "可选联系电话，将保存在您的 KHLIM 监护人资料中。",
};

const zhHant: Catalogue = {
  "auth.login.error.required": "請輸入電子郵箱和密碼。",
  "auth.login.error.failed": "登入失敗，請檢查您的登入資料。",
  "auth.login.loading": "正在載入登入頁面…",
  "auth.register.error.invalid":
    "請輸入姓名、有效電子郵箱以及至少 8 個字元的密碼。",
  "auth.register.error.failed": "註冊失敗。",
  "auth.register.verifyTitle": "請驗證電子郵箱以繼續",
  "auth.register.verifyBody":
    "Supabase 要求驗證 {email}。請開啟驗證郵件，然後登入以完成監護人資料。",
  "auth.register.minimumPassword": "至少 8 個字元。",
  "auth.forgot.error.failed": "密碼復原請求失敗。",
  "auth.forgot.sentTitle": "復原連結已傳送",
  "auth.forgot.sentBody":
    "如果 {email} 對應的帳戶存在，Supabase Auth 已傳送安全的密碼重設連結。",
  "auth.forgot.emailPlaceholder": "guardian@example.com",
  "auth.reset.error.minimum": "密碼必須至少包含 8 個字元。",
  "auth.reset.error.mismatch": "兩次輸入的密碼不一致。",
  "auth.reset.error.failed": "無法更新密碼。",
  "auth.reset.title": "設定新密碼",
  "auth.reset.updatedTitle": "密碼已更新",
  "auth.reset.updatedBody": "您的 Supabase 帳戶密碼已更改。",
  "auth.reset.returnSignIn": "返回登入。",
  "auth.reset.unavailableTitle": "復原工作階段不可用",
  "auth.reset.unavailableBody":
    "請從最新的密碼復原郵件開啟此頁面。如果連結已過期，請重新申請重設連結。",
  "auth.reset.newPassword": "新密碼",
  "auth.reset.confirmPassword": "確認新密碼",
  "auth.reset.submit": "更新密碼",
  "onboarding.guardian.error.displayName": "請輸入監護人顯示名稱。",
  "onboarding.guardian.error.save": "無法儲存監護人資料。",
  "onboarding.guardian.phoneHelper":
    "可選聯絡電話，將儲存在您的 KHLIM 監護人資料中。",
};

const hi: Catalogue = {
  "auth.login.error.required": "कृपया ईमेल और पासवर्ड दोनों दर्ज करें।",
  "auth.login.error.failed": "साइन इन विफल रहा। कृपया अपनी जानकारी जाँचें।",
  "auth.login.loading": "लॉगिन लोड हो रहा है…",
  "auth.register.error.invalid":
    "अपना नाम, मान्य ईमेल और कम से कम 8 अक्षरों का पासवर्ड दर्ज करें।",
  "auth.register.error.failed": "पंजीकरण विफल रहा।",
  "auth.register.verifyTitle": "जारी रखने के लिए अपना ईमेल सत्यापित करें",
  "auth.register.verifyBody":
    "Supabase को {email} के लिए ईमेल पुष्टि चाहिए। सत्यापन ईमेल खोलें, फिर अपनी अभिभावक प्रोफ़ाइल पूरी करने के लिए साइन इन करें।",
  "auth.register.minimumPassword": "कम से कम 8 अक्षर।",
  "auth.forgot.error.failed": "पासवर्ड रिकवरी अनुरोध विफल रहा।",
  "auth.forgot.sentTitle": "रिकवरी लिंक भेज दिया गया",
  "auth.forgot.sentBody":
    "यदि {email} के लिए खाता मौजूद है, तो Supabase Auth ने सुरक्षित पासवर्ड रीसेट लिंक भेज दिया है।",
  "auth.forgot.emailPlaceholder": "guardian@example.com",
  "auth.reset.error.minimum": "पासवर्ड में कम से कम 8 अक्षर होने चाहिए।",
  "auth.reset.error.mismatch": "पासवर्ड पुष्टि मेल नहीं खाती।",
  "auth.reset.error.failed": "पासवर्ड अपडेट नहीं किया जा सका।",
  "auth.reset.title": "नया पासवर्ड सेट करें",
  "auth.reset.updatedTitle": "पासवर्ड अपडेट हो गया",
  "auth.reset.updatedBody": "आपके Supabase खाते का पासवर्ड बदल दिया गया है।",
  "auth.reset.returnSignIn": "साइन इन पर लौटें।",
  "auth.reset.unavailableTitle": "रिकवरी सत्र उपलब्ध नहीं है",
  "auth.reset.unavailableBody":
    "इस पेज को नवीनतम पासवर्ड-रिकवरी ईमेल से खोलें। यदि लिंक समाप्त हो गया है, तो नया रीसेट लिंक माँगें।",
  "auth.reset.newPassword": "नया पासवर्ड",
  "auth.reset.confirmPassword": "नए पासवर्ड की पुष्टि करें",
  "auth.reset.submit": "पासवर्ड अपडेट करें",
  "onboarding.guardian.error.displayName": "कृपया अभिभावक का प्रदर्शन नाम दें।",
  "onboarding.guardian.error.save": "अभिभावक प्रोफ़ाइल सहेजी नहीं जा सकी।",
  "onboarding.guardian.phoneHelper":
    "वैकल्पिक संपर्क नंबर जो आपकी KHLIM अभिभावक प्रोफ़ाइल में सहेजा जाता है।",
};

export const authWebMessages = {
  en,
  ms,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  hi,
} as const;
