const axios = require("axios");

const API = "https://eco.crysnovax.workers.dev";

module.exports = {
  name: 'economy',
  alias: [
    'bal','earn','pay','steal','daily',
    'work','loan','save','bank#','withdraw',
    'shield','buyweapon'
  ],
  desc: 'Premium Economy System',
  category: 'Game',

  async execute(sock, m, { reply }) {
    try {
      const text = m.text || "";
      const args = text.trim().split(" ").slice(1);
      const cmd = text.split(" ")[0].toLowerCase();

      // 🌟 MENU
      if (cmd === ".economy") {
        return reply(
`╭━〔 CRYSNOVA ECONOMY 〕━╮
┃
┃ 💰 .bal
┃ 🪙 .earn
┃ 🎁 .daily
┃ 💼 .work
┃ 💸 .pay @user 500
┃ 😈 .steal @user
┃
┃ 🏦 .bank#
┃ 💾 .save|name amount
┃ 💵 .withdraw amount
┃ 💳 .loan amount
┃
┃ 🛡️ .shield
┃ 🔫 .buyweapon
┃
╰━━━━━━━━━━━━━━╯`
        );
      }

      // 💰 BAL
      if (cmd === ".bal") {
        const res = await axios.get(`${API}/balance?user=${m.sender}`);
        return reply(`╭─💰 BALANCE\n│ ${res.data.balance}\n╰──────────`);
      }

      // 🪙 EARN
      if (cmd === ".earn") {
        const res = await axios.get(`${API}/earn?user=${m.sender}`);
        return reply(`╭─🪙 EARN\n│ ${res.data}\n╰──────────`);
      }

      // 💼 WORK
      if (cmd === ".work") {
        const res = await axios.get(`${API}/work?user=${m.sender}`);
        return reply(`╭─💼 WORK\n│ ${res.data}\n╰──────────`);
      }

      // 🎁 DAILY
      if (cmd === ".daily") {
        const res = await axios.get(`${API}/daily?user=${m.sender}`);
        return reply(`╭─🎁 DAILY\n│ ${res.data}\n╰──────────`);
      }

      // 💸 PAY
      if (cmd === ".pay") {
        const user = m.mentionedJid?.[0];
        const amount = parseInt(args[0]);

        if (!user || !amount) {
          return reply("Usage: .pay @user 500");
        }

        const res = await axios.get(
          `${API}/pay?from=${m.sender}&to=${user}&amount=${amount}`
        );

        return sock.sendMessage(
          m.chat,
          {
            text: `╭─💸 PAYMENT\n│ ${res.data}\n│ Amount: ${amount}\n│ To: @${user.split("@")[0]}\n╰──────────`,
            mentions: [user]
          },
          { quoted: m }
        );
      }

      // 😈 STEAL
      if (cmd === ".steal") {
        const user = m.mentionedJid?.[0];
        if (!user) return reply("Tag someone");

        const res = await axios.get(
          `${API}/steal?from=${m.sender}&to=${user}`
        );

        return sock.sendMessage(
          m.chat,
          {
            text: `╭─😈 STEAL\n│ ${res.data}\n│ Target: @${user.split("@")[0]}\n╰──────────`,
            mentions: [user]
          },
          { quoted: m }
        );
      }

      // 💳 LOAN
      if (cmd === ".loan") {
        const amount = parseInt(args[0]);
        if (!amount) return reply("Usage: .loan 1000");

        const res = await axios.get(
          `${API}/loan?user=${m.sender}&amount=${amount}`
        );

        return reply(`╭─🏦 LOAN\n│ ${res.data}\n╰──────────`);
      }

      // 💾 SAVE
      if (cmd === ".save") {
        const [name, amount] = args.join(" ").split("|");

        if (!name || !amount) {
          return reply("Usage: .save|name 500");
        }

        const res = await axios.get(
          `${API}/save?user=${m.sender}&name=${name}&amount=${amount}`
        );

        return reply(`╭─🏦 SAVE\n│ ${res.data}\n╰──────────`);
      }

      // 🏦 BANK
      if (cmd === ".bank") {
        const res = await axios.get(`${API}/bank?user=${m.sender}`);
        return reply(`╭─🏦 BANK\n│ ${res.data}\n╰──────────`);
      }

      // 💵 WITHDRAW
      if (cmd === ".withdraw") {
        const amount = parseInt(args[0]);
        if (!amount) return reply("Usage: .withdraw 500");

        const res = await axios.get(
          `${API}/withdraw?user=${m.sender}&amount=${amount}`
        );

        return reply(`╭─💵 WITHDRAW\n│ ${res.data}\n╰──────────`);
      }

      // 🛡️ SHIELD
      if (cmd === ".shield") {
        const res = await axios.get(`${API}/shield?user=${m.sender}`);
        return reply(`╭─🛡️ SHIELD\n│ ${res.data}\n╰──────────`);
      }

      // 🔫 BUY WEAPON
      if (cmd === ".buyweapon") {
        const res = await axios.get(`${API}/buy/weapon?user=${m.sender}`);
        return reply(`╭─🔫 WEAPON\n│ ${res.data}\n╰──────────`);
      }

    } catch (err) {
      console.error("[ECONOMY ERROR]", err);
      reply("❌ System error");
    }
  }
};
