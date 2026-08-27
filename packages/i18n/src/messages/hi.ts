import type { MessageKey } from "./en";

export const hi: Record<MessageKey, string> = {
  // Navigation & Brand
  "brand.name": "KHLIM",
  "brand.tagline": "डिजिटल स्पोर्ट्स इकोसिस्टम",
  "brand.academy": "KHLIM बास्केटबॉल अकादमी",
  "nav.home": "मुख्य पृष्ठ",
  "nav.academy": "अकादमी",
  "nav.programmes": "प्रोग्राम",
  "nav.about": "हमारे बारे में",
  "nav.contact": "संपर्क करें",
  "nav.portal": "अभिभावक पोर्टल",
  "nav.login": "साइन इन",
  "nav.register": "अकादमी से जुड़ें",
  "nav.dashboard": "डैशबोर्ड",
  "nav.players": "खिलाड़ी",
  "nav.membership": "सदस्यता",
  "nav.payments": "भुगतान",
  "nav.schedule": "शेड्यूल",
  "nav.notifications": "सूचनाएं",
  "nav.account": "खाता",
  "nav.logout": "साइन आउट",

  // Public Hero & Highlights
  "hero.title": "मलेशिया में युवा बास्केटबॉल को बढ़ावा",
  "hero.subtitle":
    "खिलाड़ी-केंद्रित संरचित अकादमी इकोसिस्टम जो उत्कृष्ट कोचिंग, चरित्र निर्माण और डिजिटल प्रगति ट्रैकिंग को जोड़ता है।",
  "hero.cta.join": "अपने बच्चे का नामांकन करें",
  "hero.cta.explore": "प्रोग्राम देखें",
  "hero.badge": "बास्केटबॉल अकादमी सत्र 2026",
  "hero.feature.coaching": "FIBA प्रमाणित कोच",
  "hero.feature.venues": "प्रीमियम इनडोर कोर्ट",
  "hero.feature.portal": "अभिभावक स्वयं-सेवा पोर्टल",
  "hero.feature.development": "संरचित कौशल विकास मार्ग",

  // Programmes
  "programmes.title": "अकादमी प्रशिक्षण प्रोग्राम",
  "programmes.subtitle":
    "उम्र के अनुसार विकास मार्ग जो बुनियादी कौशल, बास्केटबॉल समझ और आत्मविश्वास का निर्माण करते हैं।",
  "programmes.ageGroup": "आयु वर्ग",
  "programmes.capacity": "क्षमता",
  "programmes.sessionsPerWeek": "प्रति सप्ताह सत्र",
  "programmes.viewDetails": "विवरण देखें",
  "programmes.spotsLeft": "केवल {count} स्थान शेष",
  "programmes.soldOut": "पूर्ण",
  "programmes.enrolNow": "इस सत्र के लिए नामांकन करें",

  // Auth
  "auth.login.title": "KHLIM में साइन इन करें",
  "auth.login.subtitle":
    "अपने अभिभावक पोर्टल, बच्चे के शेड्यूल और सदस्यता विवरण तक पहुंचें।",
  "auth.login.email": "ईमेल पता",
  "auth.login.password": "पासवर्ड",
  "auth.login.submit": "साइन इन करें",
  "auth.login.forgotPassword": "पासवर्ड भूल गए?",
  "auth.login.noAccount": "खाता नहीं है?",
  "auth.login.createAccount": "अभिभावक खाता बनाएं",
  "auth.register.title": "अभिभावक खाता बनाएं",
  "auth.register.subtitle":
    "KHLIM प्रोग्रामों और प्रतियोगिताओं में अपने बच्चों को प्रबंधित करने के लिए एक बार पंजीकरण करें।",
  "auth.register.fullName": "पूरा नाम",
  "auth.register.email": "ईमेल पता",
  "auth.register.password": "पासवर्ड बनाएं",
  "auth.register.confirmPassword": "पासवर्ड की पुष्टि करें",
  "auth.register.preferredLanguage": "पसंदीदा भाषा",
  "auth.register.termsNotice":
    "खाता बनाकर आप KHLIM सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं।",
  "auth.register.submit": "खाता बनाएं और आगे बढ़ें",
  "auth.register.haveAccount": "पहले से खाता है?",
  "auth.forgot.title": "पासवर्ड रीसेट करें",
  "auth.forgot.subtitle":
    "अपना पंजीकृत ईमेल दर्ज करें और हम आपको एक रीसेट लिंक भेजेंगे।",
  "auth.forgot.submit": "रीसेट लिंक भेजें",
  "auth.forgot.backToLogin": "साइन इन पर वापस जाएं",

  // Onboarding
  "onboarding.guardian.title": "अभिभावक प्रोफ़ाइल पूरा करें",
  "onboarding.guardian.subtitle":
    "कृपया अपनी संपर्क जानकारी प्रदान करें ताकि कोचिंग स्टाफ और अकादमी टीम आपसे संपर्क कर सके।",
  "onboarding.guardian.displayName": "अभिभावक का नाम",
  "onboarding.guardian.phone": "मोबाइल नंबर (WhatsApp सक्षम)",
  "onboarding.guardian.emergencyContact": "आपातकालीन संपर्क नाम और फोन",
  "onboarding.guardian.submit": "सहेजें और नामांकन जारी रखें",

  // Enrolment Wizard
  "enrol.steps.player": "1. खिलाड़ी",
  "enrol.steps.programme": "2. प्रोग्राम",
  "enrol.steps.plan": "3. पैकेज",
  "enrol.steps.terms": "4. शर्तें और समीक्षा",
  "enrol.steps.payment": "5. सुरक्षित भुगतान",
  "enrol.player.selectTitle": "नामांकन के लिए खिलाड़ी चुनें",
  "enrol.player.selectSubtitle":
    "लिंक किए गए बच्चे को चुनें या नया खिलाड़ी प्रोफ़ाइल जोड़ें।",
  "enrol.player.addNew": "+ नया बच्चा जोड़ें",
  "enrol.player.fullName": "बच्चे का पूरा नाम",
  "enrol.player.dob": "जन्म तिथि",
  "enrol.player.gender": "लिंग",
  "enrol.programme.selectTitle": "प्रोग्राम सत्र चुनें",
  "enrol.programme.selectSubtitle":
    "स्थान, सप्ताह का दिन और प्रशिक्षण समय स्लॉट चुनें।",
  "enrol.plan.selectTitle": "सदस्यता योजना चुनें",
  "enrol.plan.selectSubtitle":
    "पारदर्शी मूल्य निर्धारण जो KHLIM सर्वर द्वारा प्रमाणित है।",
  "enrol.plan.monthly": "मासिक आवर्ती",
  "enrol.plan.upfront": "एकमुश्त भुगतान",
  "enrol.plan.perMonth": "/ माह",
  "enrol.plan.total": "कुल",
  "enrol.plan.commitment": "{count} महीने की प्रतिबद्धता",
  "enrol.terms.title": "शर्तों की समीक्षा और आवर्ती बिलिंग सहमति",
  "enrol.terms.recurringNotice":
    "मैं KHLIM को सहमत अनुसूची के अनुसार मासिक सदस्यता शुल्क लेने के लिए अधिकृत करता हूं।",
  "enrol.terms.acceptCheckbox":
    "मैंने KHLIM अकादमी की शर्तें, आचार संहिता और आवर्ती बिलिंग नीति पढ़ ली है और सहमत हूं।",
  "enrol.checkout.proceed": "सुरक्षित भुगतान के लिए आगे बढ़ें",
  "enrol.confirmation.title": "नामांकन सफलतापूर्वक जमा हुआ!",
  "enrol.confirmation.subtitle":
    "आपका सदस्यता अनुरोध दर्ज कर लिया गया है और सक्रिय किया जा रहा है।",
  "enrol.confirmation.viewDashboard": "सदस्य डैशबोर्ड पर जाएं",

  // Member Portal
  "portal.dashboard.title": "अभिभावक डैशबोर्ड",
  "portal.dashboard.welcome": "वापसी पर स्वागत है, {name}",
  "portal.dashboard.selectChild": "सक्रिय खिलाड़ी",
  "portal.dashboard.nextTraining": "अगला प्रशिक्षण सत्र",
  "portal.dashboard.membershipStatus": "सदस्यता स्थिति",
  "portal.dashboard.nextPayment": "अगला देय भुगतान",
  "portal.dashboard.recentActivity": "हाल की सूचनाएं और अपडेट",
  "portal.players.title": "प्रबंधित खिलाड़ी",
  "portal.players.subtitle": "आपके अभिभावक खाते से जुड़े बच्चे।",
  "portal.players.addChild": "खिलाड़ी प्रोफ़ाइल जोड़ें",
  "portal.membership.title": "अकादमी सदस्यता",
  "portal.membership.activePlan": "सक्रिय योजना",
  "portal.membership.startDate": "शुरू हुआ",
  "portal.membership.endDate": "नवीनीकरण / समाप्ति",
  "portal.membership.history": "सदस्यता इतिहास",
  "portal.payments.title": "बिलिंग और भुगतान",
  "portal.payments.subtitle":
    "भुगतान कार्यक्रम, आगामी किश्तें और पिछली रसीदें देखें।",
  "portal.payments.upcoming": "आगामी किश्तें",
  "portal.payments.history": "लेन-देन इतिहास",
  "portal.payments.receipt": "रसीद देखें",
  "portal.schedule.title": "प्रशिक्षण कार्यक्रम",
  "portal.schedule.subtitle": "आधिकारिक सत्र तिथियां, कोर्ट आवंटन और कोच।",
  "portal.schedule.viewCalendar": "कैलेंडर दृश्य",
  "portal.schedule.viewList": "सूची दृश्य",
  "portal.notifications.title": "सूचनाएं",
  "portal.notifications.empty": "फिलहाल कोई नई सूचना नहीं है।",
  "portal.account.title": "खाता सेटिंग्स",
  "portal.account.profile": "अभिभावक प्रोफ़ाइल",
  "portal.account.language": "पसंदीदा भाषा",
  "portal.account.security": "सुरक्षा और पासवर्ड",

  // Status Badges
  "status.active": "सक्रिय",
  "status.pending": "प्रतीक्षारत",
  "status.suspended": "निलंबित",
  "status.cancelled": "रद्द",
  "status.completed": "पूर्ण",
  "status.expired": "समाप्त",
  "status.paid": "भुगतान किया गया",
  "status.failed": "भुगतान विफल",
  "status.scheduled": "निर्धारित",
  "status.rescheduled": "पुनर्निर्धारित",

  // Common UI
  "common.loading": "लोड हो रहा है...",
  "common.save": "परिवर्तन सहेजें",
  "common.cancel": "रद्द करें",
  "common.back": "वापस",
  "common.next": "जारी रखें",
  "common.retry": "पुनः प्रयास करें",
  "common.search": "खोजें...",
  "common.error": "एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
  "common.noData": "कोई रिकॉर्ड नहीं मिला।",
};
