const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const schedule = require('node-schedule');

// 🔹 استخدام المتغيرات البيئية لتوكن البوت
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// 🔹 API للمواقيت، الأذكار، القرآن، والراديو
const PRAYER_API = "https://api.aladhan.com/v1/timingsByCity?city={city}&country=SA&method=4";
const AZKAR_API = "https://raw.githubusercontent.com/nawafalqari/azkar-api/56df51279ab6eb86dc2f6202c7de26c8948331c1/azkar.json";
const RADIO_API = "https://data-rosy.vercel.app/radio.json";
const QURAN_API = "https://api.alquran.cloud/v1/surah/";

// 🔹 قائمة المدن المتاحة لمواقيت الصلاة
const cities = {
    makkah: "Mecca",
    madinah: "Medina",
    jeddah: "Jeddah",
    riyadh: "Riyadh"
};

// 🔹 دالة لجلب مواقيت الصلاة
async function getPrayerTimes(cityKey) {
    const city = cities[cityKey];
    const url = PRAYER_API.replace("{city}", city);
    try {
        const response = await axios.get(url);
        const timings = response.data.data.timings;
        return `
📍 **${cityKey.toUpperCase()}**
- الفجر: ${timings.Fajr}
- الظهر: ${timings.Dhuhr}
- العصر: ${timings.Asr}
- المغرب: ${timings.Maghrib}
- العشاء: ${timings.Isha}
        `;
    } catch (error) {
        console.error(`❌ خطأ في جلب مواقيت الصلاة لـ ${cityKey}`, error);
        return "❌ حدث خطأ أثناء جلب مواقيت الصلاة.";
    }
}

// 🔹 دالة لجلب الأذكار
async function getAzkar() {
    try {
        const response = await axios.get(AZKAR_API);
        const azkar = response.data;
        const randomZikr = azkar[Math.floor(Math.random() * azkar.length)];
        return `📿 **${randomZikr.category}**\n\n${randomZikr.zekr}\n\n🤲 ${randomZikr.description || ""}`;
    } catch (error) {
        console.error("❌ خطأ في جلب الأذكار:", error);
        return "❌ حدث خطأ أثناء جلب الأذكار.";
    }
}

// 🔹 دالة لجلب إذاعات القرآن
async function getRadioStations() {
    try {
        const response = await axios.get(RADIO_API);
        const stations = response.data.radios;
        let message = "📻 **إذاعات القرآن الكريم:**\n\n";
        stations.forEach((station, index) => {
            message += `🎙 **${station.name}**\n🔊 ${station.url}\n\n`;
        });
        return message;
    } catch (error) {
        console.error("❌ خطأ في جلب إذاعات القرآن:", error);
        return "❌ حدث خطأ أثناء جلب إذاعات القرآن.";
    }
}

// 🔹 دالة لجلب سورة من القرآن
async function getQuranSurah(surahNumber) {
    try {
        const url = `${QURAN_API}${surahNumber}`;
        const response = await axios.get(url);
        const surah = response.data.data;
        let message = `📖 **${surah.englishName} - ${surah.name}**\n\n`;
        surah.ayahs.forEach(ayah => {
            message += `(${ayah.numberInSurah}) ${ayah.text}\n\n`;
        });
        return message;
    } catch (error) {
        console.error("❌ خطأ في جلب السورة:", error);
        return "❌ حدث خطأ أثناء جلب السورة.";
    }
}

// 🔹 عند تشغيل البوت - عرض قائمة الأوامر ككيبورد
bot.start((ctx) => {
    ctx.reply("👋 أهلاً بك في البوت! اختر من الأزرار التالية:", 
        Markup.keyboard([
            ["🕌 مواقيت الصلاة", "📿 أذكار"],
            ["📻 إذاعات القرآن", "📖 سورة من القرآن"],
            ["📖 سورة الكهف", "🔔 تفعيل تذكيرات الصلاة"],
            ["🛠 تواصل مع المطور"]
        ]).resize()
    );
});

// 🕌 عرض مواقيت الصلاة ككيبورد
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
bot.hears(["🕋 مكة", "🏙 المدينة", "🌊 جدة", "🏢 الرياض"], async (ctx) => {
    const cityMap = {
        "🕋 مكة": "makkah",
        "🏙 المدينة": "madinah",
        "🌊 جدة": "jeddah",
        "🏢 الرياض": "riyadh"
    };
    const cityKey = cityMap[ctx.message.text];
    const times = await getPrayerTimes(cityKey);
    ctx.reply(times);
});

// 📿 إرسال أذكار عشوائية
bot.hears("📿 أذكار", async (ctx) => {
    const zikr = await getAzkar();
    ctx.reply(zikr);
});

// 📻 إرسال إذاعات القرآن الكريم
bot.hears("📻 إذاعات القرآن", async (ctx) => {
    const radios = await getRadioStations();
    ctx.reply(radios);
});

// 📖 إرسال سورة الكهف PDF
bot.hears("📖 سورة الكهف", (ctx) => {
    ctx.replyWithDocument({ source: 'الكهف.pdf' });
});

// 🔔 تفعيل تذكيرات الصلاة
bot.hears("🔔 تفعيل تذكيرات الصلاة", (ctx) => {
    ctx.reply("✅ تم تفعيل تذكيرات الصلاة!");
    schedule.scheduleJob("0 5 * * *", () => {
        bot.telegram.sendMessage(ctx.chat.id, "🕌 حان وقت صلاة الفجر!");
    });
    schedule.scheduleJob("0 12 * * *", () => {
        bot.telegram.sendMessage(ctx.chat.id, "🕌 حان وقت صلاة الظهر!");
    });
    schedule.scheduleJob("0 15 * * *", () => {
        bot.telegram.sendMessage(ctx.chat.id, "🕌 حان وقت صلاة العصر!");
    });
    schedule.scheduleJob("0 18 * * *", () => {
        bot.telegram.sendMessage(ctx.chat.id, "🕌 حان وقت صلاة المغرب!");
    });
    schedule.scheduleJob("0 20 * * *", () => {
        bot.telegram.sendMessage(ctx.chat.id, "🕌 حان وقت صلاة العشاء!");
    });
});

// 🛠 تواصل مع المطور
bot.hears("🛠 تواصل مع المطور", (ctx) => {
    ctx.reply("📩 تواصل مع المطور عبر تيليجرام: @tahikal");
});

// 🚀 تشغيل البوت
bot.launch();
console.log("🚀 البوت شغال الآن!");