const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');

// 🔹 استخدام المتغيرات البيئية لتوكن البوت
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// 🔹 API للمواقيت، الأذكار، القرآن، والراديو
const PRAYER_API = "https://api.aladhan.com/v1/timingsByCity?city={city}&country=SA&method=4";
const AZKAR_API = "https://raw.githubusercontent.com/nawafalqari/azkar-api/56df51279ab6eb86dc2f6202c7de26c8948331c1/azkar.json";
const RADIO_API = "https://data-rosy.vercel.app/radio.json";
const QURAN_API = "https://api.alquran.cloud/v1/surah/";
const NOTIFICATIONS = {};

// 🔹 قائمة المدن لمواقيت الصلاة
const cities = {
    "🕋 مكة": { name: "Mecca", image: "مكة.png" },
    "🏙 المدينة": { name: "Medina", image: "المدينة.png" },
    "🌊 جدة": { name: "Jeddah", image: "جدة.png" },
    "🏢 الرياض": { name: "Riyadh", image: "الرياض.png" }
};

// 🔹 تحويل الوقت إلى صيغة 12 ساعة
function formatTime(time) {
    let [hours, minutes] = time.split(":").map(Number);
    let period = hours >= 12 ? "مساءً" : "صباحًا";
    hours = hours % 12 || 12;
    return `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${period}`;
}

// 🔹 جلب مواقيت الصلاة مع عرض صورة المدينة
async function getPrayerTimes(cityKey) {
    const city = cities[cityKey].name;
    const url = PRAYER_API.replace("{city}", city);
    try {
        const response = await axios.get(url);
        const timings = response.data.data.timings;
        return {
            text: `
📍 **${cityKey}**
- الفجر: ${formatTime(timings.Fajr)}
- الظهر: ${formatTime(timings.Dhuhr)}
- العصر: ${formatTime(timings.Asr)}
- المغرب: ${formatTime(timings.Maghrib)}
- العشاء: ${formatTime(timings.Isha)}
            `,
            image: cities[cityKey].image
        };
    } catch (error) {
        console.error(`❌ خطأ في جلب مواقيت الصلاة لـ ${cityKey}`, error);
        return { text: "❌ حدث خطأ أثناء جلب مواقيت الصلاة.", image: null };
    }
}

// 🔹 إرسال صورة الشعار عند `/start` أو `🔙 رجوع`
function sendMainMenu(ctx) {
    ctx.replyWithPhoto({ source: "العداد.png" }, {
        caption: "👋 أهلاً بك في البوت! اختر من الأزرار التالية:",
        ...Markup.keyboard([
            ["🕌 مواقيت الصلاة", "📿 أذكار"],
            ["📻 إذاعات القرآن", "📖 سورة من القرآن"],
            ["📖 سورة الكهف", "🔔 تفعيل تذكيرات الصلاة"],
            ["🛠 تواصل مع المطور"]
        ]).resize()
    });
}

// 🔹 عند تشغيل البوت
bot.start((ctx) => sendMainMenu(ctx));

// 🔙 زر الرجوع يعمل بشكل صحيح
bot.hears("🔙 رجوع", (ctx) => sendMainMenu(ctx));

// 🕌 عرض مواقيت الصلاة مع صورة المدينة
bot.hears("🕌 مواقيت الصلاة", (ctx) => {
    ctx.reply("📍 اختر المدينة:", 
        Markup.keyboard([
            ["🕋 مكة", "🏙 المدينة"],
            ["🌊 جدة", "🏢 الرياض"],
            ["🔙 رجوع"]
        ]).resize()
    );
});

// 🕌 استقبال استجابة المدن لمواقيت الصلاة
bot.hears(Object.keys(cities), async (ctx) => {
    const cityKey = ctx.message.text;
    const { text, image } = await getPrayerTimes(cityKey);
    await ctx.replyWithPhoto({ source: image }, { caption: text });
});

// 📖 إرسال سورة الكهف PDF
bot.hears("📖 سورة الكهف", (ctx) => {
    ctx.replyWithDocument({ source: "الكهف.pdf" });
});

// 📻 إرسال إذاعات القرآن الكريم
bot.hears("📻 إذاعات القرآن", async (ctx) => {
    const response = await axios.get(RADIO_API);
    const stations = response.data.radios;
    let message = "📻 **إذاعات القرآن الكريم:**\n\n";
    stations.forEach(station => {
        message += `🎙 **${station.name}**\n🔊 ${station.url}\n\n`;
    });
    ctx.reply(message);
});

// 📖 إرسال سور القرآن
bot.hears("📖 سورة من القرآن", (ctx) => {
    ctx.reply("🔢 أدخل رقم السورة التي تريد قراءتها (مثلاً: 1 للفاتحة، 114 للناس)");
});

bot.on("text", async (ctx) => {
    const surahNumber = parseInt(ctx.message.text);
    if (!isNaN(surahNumber) && surahNumber >= 1 && surahNumber <= 114) {
        const url = `${QURAN_API}${surahNumber}`;
        const response = await axios.get(url);
        const surah = response.data.data;
        let message = `📖 **${surah.englishName} - ${surah.name}**\n\n`;
        surah.ayahs.forEach(ayah => {
            message += `(${ayah.numberInSurah}) ${ayah.text}\n\n`;
        });
        ctx.reply(message);
    }
});

// 🔔 تفعيل تذكيرات الصلاة باختيار المدينة
bot.hears("🔔 تفعيل تذكيرات الصلاة", (ctx) => {
    ctx.reply("📍 اختر المدينة لتفعيل التذكيرات:", 
        Markup.keyboard(Object.keys(cities).map(city => [city]).concat([["🔙 رجوع"]])).resize()
    );
});

bot.hears(Object.keys(cities), (ctx) => {
    const cityKey = ctx.message.text;
    NOTIFICATIONS[ctx.chat.id] = cityKey;
    ctx.reply(`✅ تم تفعيل التذكيرات لمدينة ${cityKey}. سيتم إرسال إشعارات الصلاة تلقائيًا.`);
});

// 🔔 إرسال تذكيرات الصلاة تلقائيًا
schedule.scheduleJob("0 * * * *", async () => {
    for (let chatId in NOTIFICATIONS) {
        const cityKey = NOTIFICATIONS[chatId];
        const { text } = await getPrayerTimes(cityKey);
        bot.telegram.sendMessage(chatId, `🔔 **تذكير بوقت الصلاة:**\n${text}`);
    }
});

// 🛠 تواصل مع المطور
bot.hears("🛠 تواصل مع المطور", (ctx) => {
    ctx.reply("📩 تواصل مع المطور عبر تيليجرام: @tahikal");
});

// 🚀 تشغيل البوت
bot.launch();
console.log("🚀 البوت شغال الآن!");