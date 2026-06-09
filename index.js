require('dotenv').config(); // เพื่อใช้ Environment Variable

const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  app.listen(port, () => {
    console.log(`Web server is running on http://localhost:${port}`);
  });
});

client.on('messageCreate', async message => {
  if (message.content.startsWith('!ping')) {
    message.reply('Pong!');
  }
});

client.login(process.env.DISCORD_TOKEN);