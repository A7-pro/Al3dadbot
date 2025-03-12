const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const schedule = require('node-schedule');

// ضع التوكن الخاص بالبوت هنا
const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
const bot = new Telegraf(BOT_TOKEN);

// ملف لتخزين المستخدمين المشتركين في الإشعارات
const notificationsFile = 'notifications.json';
let notifications = fs.existsSync(notificationsFile) ? JSON.parse(fs.readFileSync(notificationsFile, 'utf-8')) : {};

// 🕌 قائمة المدن
const cities = {
    makkah: "Mecca",
    madinah: "Medina",
    jeddah: "Jeddah",
    riyadh: "Riyadh"
};

// API لجلب مواقيت الصلاة
const apiURL = "https://api.aladhan.com/v1/timingsByCity?city={city}&country=SA&method=4";

// 📌 دالة لجلب مواقيت الصلاة مع إضافة 3 دقائق
async function getPrayerTimes(cityKey) {
    const city = cities[cityKey];
    const url = apiURL.replace("{city}", city);
    try {
        const response = await axios.get(url);
        const timings = response.data.data.timings;

        return {
            text: `
📍 **${cityKey.toUpperCase()}**
- الفجر: ${adjustTime(timings.Fajr)}
- الظهر: ${adjustTime(timings.Dhuhr)}
- العصر: ${adjustTime(timings.Asr)}
- المغرب: ${adjustTime(timings.Maghrib)}
- العشاء: ${adjustTime(timings.Isha)}
        `,
            timings: timings
        };
    } catch (error) {
        console.error(`❌ خطأ في جلب مواقيت الصلاة لـ ${cityKey}`, error);
        return { text: "❌ حدث خطأ أثناء جلب مواقيت الصلاة.", timings: null };
    }
}

// 📌 دالة لإضافة 3 دقائق إلى الوقت
function adjustTime(time) {
    let [hours, minutes] = time.split(":").map(Number);
    minutes += 3;
    if (minutes >= 60) {
        minutes -= 60;
        hours += 1;
    }
    return `${hours}:${minutes < 10 ? "0" + minutes : minutes}`;
}

// 🔘 قائمة الأوامر الرئيسية عند `/start`
bot.start((ctx) => {
    ctx.reply("👋 أهلاً بك في البوت! اختر من الأزرار التالية:", 
        Markup.inlineKeyboard([
            [Markup.button.callback("🕌 مواقيت الصلاة", "prayer_times")],
            [Markup.button.callback("🔔 تفعيل إشعارات الصلاة", "enable_notifications")],
            [Markup.button.callback("📿 الأدعية", "duas")],
            [Markup.button.callback("📖 سورة الكهف", "kahf")],
            [Markup.button.callback("🛠️ تواصل مع المطور", "contact_dev")]
        ])
    );
});

// 📿 إرسال قائمة الأدعية كأزرار إنلاين
bot.action("duas", (ctx) => {
    ctx.reply("📿 اختر نوع الدعاء:", 
        Markup.inlineKeyboard([
            [Markup.button.callback("🌞 دعاء الصباح", "dua_sabah"), Markup.button.callback("🌙 دعاء المساء", "dua_masaa")],
            [Markup.button.callback("💰 دعاء الرزق", "dua_rizq"), Markup.button.callback("🤲 دعاء الاستغفار", "dua_istighfar")],
            [Markup.button.callback("❤️ دعاء الشفاء", "dua_shifa"), Markup.button.callback("🕊️ دعاء التوفيق", "dua_tawfiq")],
            [Markup.button.callback("🙏 دعاء المغفرة", "dua_maghfirah"), Markup.button.callback("⚖️ دعاء الصبر", "dua_sabr")],
            [Markup.button.callback("🔙 رجوع", "start")]
        ])
    );
});

// 📿 استقبال استجابة ضغط الأزرار للأدعية
bot.action(/^dua_(.+)$/, (ctx) => {
    const type = ctx.match[1];
    ctx.reply(`📿 **${type.replace("_", " ")}:**\n\n${type}`);
});

// 🕌 إرسال قائمة مواقيت الصلاة كأزرار إنلاين
bot.action("prayer_times", (ctx) => {
    ctx.reply("🕌 اختر المدينة:", 
        Markup.inlineKeyboard([
            [Markup.button.callback("🕋 مكة", "makkah"), Markup.button.callback("🏙️ المدينة", "madinah")],
            [Markup.button.callback("🌊 جدة", "jeddah"), Markup.button.callback("🏢 الرياض", "riyadh")],
            [Markup.button.callback("🔙 رجوع", "start")]
        ])
    );
});

// 🕌 استقبال استجابة ضغط الأزرار لمواقيت الصلاة
bot.action(/^makkah|madinah|jeddah|riyadh$/, async (ctx) => {
    const cityKey = ctx.match[0];
    const response = await getPrayerTimes(cityKey);
    ctx.reply(response.text);
});

// 🔔 تفعيل إشعارات الصلاة
bot.action("enable_notifications", (ctx) => {
    ctx.reply("📍 اختر المدينة التي تريد تفعيل الإشعارات لها:", 
        Markup.inlineKeyboard([
            [Markup.button.callback("🕋 مكة", "notify_makkah"), Markup.button.callback("🏙️ المدينة", "notify_madinah")],
            [Markup.button.callback("🌊 جدة", "notify_jeddah"), Markup.button.callback("🏢 الرياض", "notify_riyadh")],
            [Markup.button.callback("❌ إيقاف الإشعارات", "disable_notifications")],
            [Markup.button.callback("🔙 رجوع", "start")]
        ])
    );
});

// تفعيل الإشعارات حسب المدينة
bot.action(/^notify_(.+)$/, (ctx) => {
    const cityKey = ctx.match[1];
    notifications[ctx.chat.id] = cityKey;
    fs.writeFileSync(notificationsFile, JSON.stringify(notifications));
    ctx.reply(`✅ تم تفعيل الإشعارات لمدينة ${cityKey.toUpperCase()}!`);
});

// إيقاف الإشعارات
bot.action("disable_notifications", (ctx) => {
    delete notifications[ctx.chat.id];
    fs.writeFileSync(notificationsFile, JSON.stringify(notifications));
    ctx.reply("❌ تم إيقاف الإشعارات بنجاح!");
});

// 🛠️ التواصل مع المطور
bot.action("contact_dev", (ctx) => {
    ctx.reply("💬 للتواصل مع المطور، يمكنك مراسلته عبر تيليجرام: @tahikal");
});

// إرسال إشعارات الصلاة لكل مستخدم
schedule.scheduleJob("0 * * * *", async () => {
    for (let chatId in notifications) {
        const cityKey = notifications[chatId];
        const response = await getPrayerTimes(cityKey);
        bot.telegram.sendMessage(chatId, `🔔 **إشعار صلاة:**\n${response.text}`);
    }
});

// 🚀 تشغيل البوت
bot.launch();
console.log("🚀 البوت شغال الآن!");