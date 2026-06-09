const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log(`🍄 ${client.user.tag} ตื่นจากการจำศีลในป่าเห็ดแล้ว!`);
});

client.on('messageCreate', message => {
    if (message.author.bot) return;

    if (message.content === '!hello') {
        message.reply('ยินดีต้อนรับสู่อาณาจักรเห็ดต่างโลก! มีอะไรให้ข้านับใช้ไหมเจ้าคะ/ครับ? 🍄✨');
    }
});

// นำ Token จากขั้นตอนที่ 1 มาใส่ที่นี่
client.login('ใส่_TOKEN_ของบอทตรงนี้');
