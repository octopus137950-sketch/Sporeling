const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const fs = require('fs');

// สร้างบอทพร้อมสิทธิ์เข้าถึงสมาชิกและการส่งข้อความ
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // สำคัญมากสำหรับตรวจคนเข้า-ออก
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ไฟล์สำหรับบันทึกการตั้งค่าห้อง (Database จำลอง)
const SETTINGS_FILE = './server_settings.json';
let settings = {};
if (fs.existsSync(SETTINGS_FILE)) {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}

function saveSettings() {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// ----------------------------------------------------
// 1. ตั้งค่าคำสั่งสแลช (Slash Commands) สำหรับแอดมิน
// ----------------------------------------------------
const commands = [
    new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('ตั้งค่าห้องและข้อความต้อนรับของอาณาจักรเห็ด')
        .addChannelOption(option => option.setName('channel').setDescription('เลือกห้องที่ต้องการให้บอทแจ้งเตือน').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('คำต้อนรับ (ใช้ {user} แทนการแท็กชื่อผู้ใช้)').setRequired(true))
        .addStringOption(option => option.setName('image_url').setDescription('ลิงก์รูปภาพพื้นหลังโปรเตอร์ต้อนรับ').setRequired(false)),
        
    new SlashCommandBuilder()
        .setName('setgoodbye')
        .setDescription('ตั้งค่าห้องและข้อความอำลาเมื่อสปอร์เห็ดจากไป')
        .addChannelOption(option => option.setName('channel').setDescription('เลือกห้องที่ต้องการให้บอทแจ้งเตือน').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('คำอำลา (ใช้ {user} แทนการใส่ชื่อผู้ใช้)').setRequired(true))
        .addStringOption(option => option.setName('image_url').setDescription('ลิงก์รูปภาพพื้นหลังโปรเตอร์อำลา').setRequired(false))
].map(command => command.toJSON());

// ----------------------------------------------------
// 2. ระบบทำงานเมื่อบอทออนไลน์ & ลงทะเบียนคำสั่ง
// ----------------------------------------------------
client.once('ready', async () => {
    console.log(`🍄 ${client.user.tag} พร้อมดูแลระบบเข้า-ออกอาณาจักรเห็ดแล้ว!`);
    
    // ลงทะเบียน Slash Command ให้ใช้งานได้ในทุกเซิร์ฟเวอร์ที่บอทอยู่
    const rest = new REST({ version: '10' }).setToken(client.token);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
});

// ----------------------------------------------------
// 3. ทำงานเมื่อมีคนพิมพ์คำสั่งตั้งค่า
// ----------------------------------------------------
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์ระดับผู้ดูแลระบบ (Administrator) หรือไม่
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ เฉพาะผู้ดูแลอาณาจักรเห็ดเท่านั้นที่ใช้คำสั่งนี้ได้เจ้าค่ะ/ครับ!', ephemeral: true });
    }

    const { commandName, guildId } = interaction;
    if (!settings[guildId]) settings[guildId] = {};

    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');
    const imageUrl = interaction.options.getString('image_url') || '';

    if (commandName === 'setwelcome') {
        settings[guildId].welcomeChannel = channel.id;
        settings[guildId].welcomeMessage = message;
        settings[guildId].welcomeImage = imageUrl;
        saveSettings();
        await interaction.reply({ content: `✅ ตั้งค่าระบบต้อนรับเรียบร้อย! จะแจ้งเตือนที่ห้อง <#${channel.id}>`, ephemeral: true });
    }

    if (commandName === 'setgoodbye') {
        settings[guildId].goodbyeChannel = channel.id;
        settings[guildId].goodbyeMessage = message;
        settings[guildId].goodbyeImage = imageUrl;
        saveSettings();
        await interaction.reply({ content: `✅ ตั้งค่าระบบอำลาเรียบร้อย! จะแจ้งเตือนที่ห้อง <#${channel.id}>`, ephemeral: true });
    }
});

// ----------------------------------------------------
// 4. [Welcome] ทำงานเมื่อมีสมาชิกใหม่เข้ามา
// ----------------------------------------------------
client.on('guildMemberAdd', async member => {
    const guildSettings = settings[member.guild.id];
    if (!guildSettings || !guildSettings.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(guildSettings.welcomeChannel);
    if (!channel) return;

    // แทนค่าคำว่า {user} ให้กลายเป็นการแท็กชื่อคนนั้นจริงๆ
    const rawMessage = guildSettings.welcomeMessage || "ยินดีต้อนรับ {user} เข้าสู่อาณาจักรเห็ด";
    const formattedMessage = rawMessage.replace(/{user}/g, `${member}`);

    // ออกแบบหน้าตา UI ให้สวยงามกว่ารูปธรรมดาด้วย Embed
    const welcomeEmbed = new EmbedBuilder()
        .setColor('#FF6584') // สีขอบกล่อง (เลือกสีชมพู/แดงให้เข้ากับเห็ด)
        .setTitle('🍄 ต้อนรับผู้ร่วมทางคนใหม่! 🍄')
        .setDescription(formattedMessage)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 })) // ดึงรูปโปรไฟล์กลมๆ มาแสดงด้านข้าง
        .setTimestamp()
        .setFooter({ text: `สมาชิกคนที่ ${member.guild.memberCount}`, iconURL: member.guild.iconURL() });

    // ถ้าแอดมินใส่ลิงก์รูปพื้นหลังใหญ่ๆ ไว้ ให้แสดงตรงกลาง
    if (guildSettings.welcomeImage) {
        welcomeEmbed.setImage(guildSettings.welcomeImage);
    }

    // ส่งข้อความแท็กตัวผู้ใช้ พร้อมกับแนบการ์ด Embed สุดสวย
    channel.send({ content: `${member}`, embeds: [welcomeEmbed] });
});

// ----------------------------------------------------
// 5. [Goodbye] ทำงานเมื่อมีสมาชิกออกจากเซิร์ฟเวอร์
// ----------------------------------------------------
client.on('guildMemberRemove', async member => {
    const guildSettings = settings[member.guild.id];
    if (!guildSettings || !guildSettings.goodbyeChannel) return;

    const channel = member.guild.channels.cache.get(guildSettings.goodbyeChannel);
    if (!channel) return;

    // แสดงชื่อสมาชิกธรรมดา (เพราะออกจากเซิร์ฟไปแล้ว จะแท็กไอดีตรงๆ ไม่ติด)
    const rawMessage = guildSettings.goodbyeMessage || "แม้ {user} จะจากไปแล้ว เราจะคิดถึงคุณ";
    const formattedMessage = rawMessage.replace(/{user}/g, `**${member.user.username}**`);

    const goodbyeEmbed = new EmbedBuilder()
        .setColor('#555555') // สีโทนเทาๆ สื่อถึงความเศร้า
        .setTitle('🍂 สปอร์เห็ดปลิวจากไป... 🍂')
        .setDescription(formattedMessage)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp()
        .setFooter({ text: `เหลือสมาชิกในอาณาจักร ${member.guild.memberCount} คน` });

    if (guildSettings.goodbyeImage) {
        goodbyeEmbed.setImage(guildSettings.goodbyeImage);
    }

    channel.send({ embeds: [goodbyeEmbed] });
});

// วาง Token ของคุณตรงนี้
client.login('MTUxMzg0NzEyNjI2MDQ1MzU1Nw.G5itV0.h1eg5AZZNnnsxw0ut2mMXPErL1sAsXG12VdkV8');
