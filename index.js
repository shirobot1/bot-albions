require("dotenv").config();
const fs = require("fs");
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  Events
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on("error", console.error);

const groups = new Map();

/* ================= SALVAR / CARREGAR ================= */

function saveGroups() {
  try {
    fs.writeFileSync("./groups.json", JSON.stringify(Object.fromEntries(groups), null, 2));
  } catch (e) {
    console.error(e);
  }
}

function loadGroups() {
  if (!fs.existsSync("./groups.json")) return;
  const data = JSON.parse(fs.readFileSync("./groups.json", "utf8"));
  for (const id in data) groups.set(id, data[id]);
}

/* ================= EMBED ================= */

function buildEmbed(group) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${group.title}`)
    .setColor(0x5865F2)
    .setDescription(`📅 ${group.data}\n🕒 ${group.hora}\n📝 ${group.description}`);

  for (const key in group.members) {
    const list = group.members[key];

    embed.addFields({
      name: key,
      value: list.length ? list.map(u => `<@${u.id}>`).join("\n") : "—",
      inline: true
    });
  }

  return embed;
}

/* ================= BOTÕES (CORRIGIDO COM EMOJI) ================= */

function buildButtons(group) {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const key in group.members) {

    const emojiMatch = key.match(/<:[^:]+:(\d+)>/);

    const btn = new ButtonBuilder()
      .setCustomId("join_" + key)
      .setLabel(key.replace(/<:[^:]+:\d+>\s*/, "")) // remove emoji do texto
      .setStyle(ButtonStyle.Primary);

    if (emojiMatch) {
      btn.setEmoji(emojiMatch[1]);
    }

    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(btn);
  }

  rows.push(row);
  return rows;
}

/* ================= DGAVA ================= */

const DGAVA_CLASSES = [
  "MAIN_TANK","OFF_TANK","ARCANO_ELEVADO","ARCANO_SILENCE",
  "MAIN_HEALER","BRUXO","RAIZ_PT_HEAL","RAIZ_BM",
  "QUEBRA_REINOS","INCUBUS","OCULTO","SCOUT","DPS"
];

function buildDgavaButtons() {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const c of DGAVA_CLASSES) {
    const btn = new ButtonBuilder()
      .setCustomId("dgava_" + c)
      .setLabel(c)
      .setStyle(ButtonStyle.Secondary);

    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(btn);
  }

  rows.push(row);
  return rows;
}

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`Bot online ${client.user.tag}`);
  loadGroups();

  const commands = [
    new SlashCommandBuilder()
      .setName("dgavafull")
      .setDescription("Criar DGAVA FULL")
      .addStringOption(o => o.setName("data").setDescription("Data").setRequired(true))
      .addStringOption(o => o.setName("hora").setDescription("Hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setDescription("Descrição").setRequired(true)),

    new SlashCommandBuilder()
      .setName("criar")
      .setDescription("Criar evento com emojis")
      .addStringOption(o => o.setName("titulo").setDescription("Título").setRequired(true))
      .addStringOption(o => o.setName("classes").setDescription("Cole emojis").setRequired(true))
      .addStringOption(o => o.setName("data").setDescription("Data").setRequired(true))
      .addStringOption(o => o.setName("hora").setDescription("Hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setDescription("Descrição").setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("Comandos registrados");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async i => {
  try {

    if (i.isChatInputCommand() && i.commandName === "dgavafull") {

      const event = {
        title: "DGAVA FULL RAID",
        data: i.options.getString("data"),
        hora: i.options.getString("hora"),
        description: i.options.getString("descricao"),
        members: {}
      };

      DGAVA_CLASSES.forEach(c => event.members[c] = []);

      const msg = await i.reply({
        embeds: [buildEmbed(event)],
        components: buildDgavaButtons(),
        fetchReply: true
      });

      groups.set(msg.id, event);
      saveGroups();
    }

    if (i.isChatInputCommand() && i.commandName === "criar") {

      await i.deferReply();

      const event = {
        title: i.options.getString("titulo"),
        data: i.options.getString("data"),
        hora: i.options.getString("hora"),
        description: i.options.getString("descricao"),
        members: {}
      };

      const emojis = i.options.getString("classes").match(/<:[^:]+:\d+>/g) || [];

      for (const emoji of emojis) {
        const name = emoji.split(":")[1];
        event.members[`${emoji} ${name}`] = [];
      }

      const msg = await i.editReply({
        embeds: [buildEmbed(event)],
        components: buildButtons(event),
        fetchReply: true
      });

      groups.set(msg.id, event);
      saveGroups();
    }

    if (i.isButton() && i.customId.startsWith("join_")) {

      const event = groups.get(i.message.id);
      if (!event) return;

      const role = i.customId.replace("join_", "");

      for (const key in event.members) {
        event.members[key] = event.members[key].filter(u => u.id !== i.user.id);
      }

      event.members[role].push({ id: i.user.id });

      saveGroups();

      return i.update({
        embeds: [buildEmbed(event)],
        components: buildButtons(event)
      });
    }

    if (i.isButton() && i.customId.startsWith("dgava_")) {

      const event = groups.get(i.message.id);
      if (!event) return;

      const role = i.customId.replace("dgava_", "");

      DGAVA_CLASSES.forEach(c => {
        event.members[c] = event.members[c].filter(u => u.id !== i.user.id);
      });

      event.members[role].push({ id: i.user.id });

      saveGroups();

      return i.update({
        embeds: [buildEmbed(event)],
        components: buildDgavaButtons()
      });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= EXPRESS ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);
