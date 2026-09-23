const en = {
  "spotlight.archive.badge": "Player Spotlight",
  "spotlight.archive.title": "Stories from the next milestone.",
  "spotlight.archive.description":
    "KHLIM Player Spotlight turns verified player achievements into concise club news stories, using AI-assisted drafting with staff review before publication.",
  "spotlight.archive.previewTitle": "Editorial preview only.",
  "spotlight.archive.previewBody":
    "No verified player spotlight has been published yet. The sample below demonstrates the article format without claiming a real result.",
  "spotlight.archive.photoSlot": "Photo slot: {label}",
  "spotlight.archive.previewStory": "Preview story →",
  "spotlight.archive.readStory": "Read story →",
  "spotlight.article.back": "← Back to Player Spotlight",
  "spotlight.article.previewTitle":
    "Editorial preview — not a real player result.",
  "spotlight.article.previewBody":
    "This AI-assisted article demonstrates the intended voice and layout. Replace the placeholder player/event facts and approved photo before publishing a real KHLIM story.",
  "spotlight.article.aiEditorial": "AI-assisted editorial",
  "spotlight.article.photoSlot": "Photo slot · {label}",
  "spotlight.article.standardLabel": "Editorial standard",
  "spotlight.article.standardTitle": "Facts first. Storytelling second.",
  "spotlight.article.standardBody":
    "KHLIM Player Spotlight copy can be AI-assisted, but names, event details, results, dates and photo permissions should be verified before publication.",
  "spotlight.article.programmesCta": "Explore KHLIM programmes",
} as const;

type Key = keyof typeof en;
type Catalogue = Record<Key, string>;

const ms: Catalogue = {
  "spotlight.archive.badge": "Sorotan Pemain",
  "spotlight.archive.title": "Kisah daripada pencapaian seterusnya.",
  "spotlight.archive.description":
    "Sorotan Pemain KHLIM menukar pencapaian pemain yang disahkan kepada berita kelab yang ringkas, menggunakan draf dibantu AI dengan semakan kakitangan sebelum penerbitan.",
  "spotlight.archive.previewTitle": "Pratonton editorial sahaja.",
  "spotlight.archive.previewBody":
    "Belum ada sorotan pemain yang disahkan diterbitkan. Contoh di bawah menunjukkan format artikel tanpa mendakwa keputusan sebenar.",
  "spotlight.archive.photoSlot": "Ruang foto: {label}",
  "spotlight.archive.previewStory": "Pratonton cerita →",
  "spotlight.archive.readStory": "Baca cerita →",
  "spotlight.article.back": "← Kembali ke Sorotan Pemain",
  "spotlight.article.previewTitle":
    "Pratonton editorial — bukan keputusan pemain sebenar.",
  "spotlight.article.previewBody":
    "Artikel dibantu AI ini menunjukkan gaya dan susun atur yang dimaksudkan. Gantikan fakta pemain/acara sementara dan foto yang diluluskan sebelum menerbitkan cerita KHLIM sebenar.",
  "spotlight.article.aiEditorial": "Editorial dibantu AI",
  "spotlight.article.photoSlot": "Ruang foto · {label}",
  "spotlight.article.standardLabel": "Standard editorial",
  "spotlight.article.standardTitle": "Fakta dahulu. Penceritaan kemudian.",
  "spotlight.article.standardBody":
    "Salinan Sorotan Pemain KHLIM boleh dibantu AI, tetapi nama, butiran acara, keputusan, tarikh dan kebenaran foto perlu disahkan sebelum penerbitan.",
  "spotlight.article.programmesCta": "Terokai program KHLIM",
};

const zhHans: Catalogue = {
  "spotlight.archive.badge": "球员聚焦",
  "spotlight.archive.title": "记录下一个里程碑的故事。",
  "spotlight.archive.description":
    "KHLIM 球员聚焦将经核实的球员成就整理成简洁的俱乐部新闻，AI 辅助起草后由工作人员审核再发布。",
  "spotlight.archive.previewTitle": "仅为编辑预览。",
  "spotlight.archive.previewBody":
    "目前尚未发布经核实的球员聚焦。以下示例只展示文章格式，不代表真实成绩。",
  "spotlight.archive.photoSlot": "照片位置：{label}",
  "spotlight.archive.previewStory": "预览故事 →",
  "spotlight.archive.readStory": "阅读故事 →",
  "spotlight.article.back": "← 返回球员聚焦",
  "spotlight.article.previewTitle": "编辑预览 — 并非真实球员成绩。",
  "spotlight.article.previewBody":
    "这篇 AI 辅助文章展示预期的语气和版式。发布真实 KHLIM 故事前，请替换占位球员/赛事事实并使用已获批准的照片。",
  "spotlight.article.aiEditorial": "AI 辅助编辑",
  "spotlight.article.photoSlot": "照片位置 · {label}",
  "spotlight.article.standardLabel": "编辑标准",
  "spotlight.article.standardTitle": "事实优先，故事其次。",
  "spotlight.article.standardBody":
    "KHLIM 球员聚焦文案可以由 AI 辅助，但姓名、赛事详情、结果、日期和照片授权必须在发布前核实。",
  "spotlight.article.programmesCta": "浏览 KHLIM 课程",
};

const zhHant: Catalogue = {
  "spotlight.archive.badge": "球員聚焦",
  "spotlight.archive.title": "記錄下一個里程碑的故事。",
  "spotlight.archive.description":
    "KHLIM 球員聚焦將經核實的球員成就整理成簡潔的俱樂部新聞，AI 輔助起草後由工作人員審核再發布。",
  "spotlight.archive.previewTitle": "僅為編輯預覽。",
  "spotlight.archive.previewBody":
    "目前尚未發布經核實的球員聚焦。以下示例只展示文章格式，不代表真實成績。",
  "spotlight.archive.photoSlot": "照片位置：{label}",
  "spotlight.archive.previewStory": "預覽故事 →",
  "spotlight.archive.readStory": "閱讀故事 →",
  "spotlight.article.back": "← 返回球員聚焦",
  "spotlight.article.previewTitle": "編輯預覽 — 並非真實球員成績。",
  "spotlight.article.previewBody":
    "這篇 AI 輔助文章展示預期的語氣和版式。發布真實 KHLIM 故事前，請替換佔位球員/賽事事實並使用已獲批准的照片。",
  "spotlight.article.aiEditorial": "AI 輔助編輯",
  "spotlight.article.photoSlot": "照片位置 · {label}",
  "spotlight.article.standardLabel": "編輯標準",
  "spotlight.article.standardTitle": "事實優先，故事其次。",
  "spotlight.article.standardBody":
    "KHLIM 球員聚焦文案可以由 AI 輔助，但姓名、賽事詳情、結果、日期和照片授權必須在發布前核實。",
  "spotlight.article.programmesCta": "瀏覽 KHLIM 課程",
};

const hi: Catalogue = {
  "spotlight.archive.badge": "प्लेयर स्पॉटलाइट",
  "spotlight.archive.title": "अगली उपलब्धि की कहानियाँ।",
  "spotlight.archive.description":
    "KHLIM प्लेयर स्पॉटलाइट सत्यापित खिलाड़ी उपलब्धियों को संक्षिप्त क्लब समाचार में बदलता है, जिसमें प्रकाशन से पहले स्टाफ समीक्षा के साथ AI-सहायित ड्राफ्टिंग होती है।",
  "spotlight.archive.previewTitle": "केवल संपादकीय प्रीव्यू।",
  "spotlight.archive.previewBody":
    "अभी कोई सत्यापित खिलाड़ी स्पॉटलाइट प्रकाशित नहीं हुआ है। नीचे का नमूना किसी वास्तविक परिणाम का दावा किए बिना लेख प्रारूप दिखाता है।",
  "spotlight.archive.photoSlot": "फ़ोटो स्थान: {label}",
  "spotlight.archive.previewStory": "कहानी का प्रीव्यू →",
  "spotlight.archive.readStory": "कहानी पढ़ें →",
  "spotlight.article.back": "← प्लेयर स्पॉटलाइट पर वापस",
  "spotlight.article.previewTitle":
    "संपादकीय प्रीव्यू — वास्तविक खिलाड़ी परिणाम नहीं।",
  "spotlight.article.previewBody":
    "यह AI-सहायित लेख इच्छित भाषा और लेआउट दिखाता है। वास्तविक KHLIM कहानी प्रकाशित करने से पहले प्लेसहोल्डर खिलाड़ी/इवेंट तथ्यों और स्वीकृत फ़ोटो को बदलें।",
  "spotlight.article.aiEditorial": "AI-सहायित संपादकीय",
  "spotlight.article.photoSlot": "फ़ोटो स्थान · {label}",
  "spotlight.article.standardLabel": "संपादकीय मानक",
  "spotlight.article.standardTitle": "पहले तथ्य। फिर कहानी।",
  "spotlight.article.standardBody":
    "KHLIM प्लेयर स्पॉटलाइट कॉपी AI-सहायित हो सकती है, लेकिन नाम, इवेंट विवरण, परिणाम, तिथियाँ और फ़ोटो अनुमतियाँ प्रकाशन से पहले सत्यापित होनी चाहिए।",
  "spotlight.article.programmesCta": "KHLIM कार्यक्रम देखें",
};

export const spotlightWebMessages = {
  en,
  ms,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  hi,
} as const;
