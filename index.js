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
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const groups = new Map();

/* ================= SALVAR ================= */

function saveGroups() {
  fs.writeFileSync("./groups.json", JSON.stringify(Object.fromEntries(groups), null, 2));
}

function loadGroups() {
  if (!fs.existsSync("./groups.json")) return;
  const data = JSON.parse(fs.readFileSync("./groups.json"));
  for (const id in data) groups.set(id, data[id]);
}

/* ================= TEMPO ================= */

function getTimeRemaining(data, hora) {
  try {
    const [d, m, y] = data.split("/");
    const [h, min] = hora.split(":");

    const eventDate = new Date(y, m - 1, d, h, min);
    const now = new Date();

    const diff = eventDate - now;
    if (diff <= 0) return "Evento iniciado";

    const totalMin = Math.floor(diff / 60000);
    const hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;

    return `${hours}h ${minutes}m`;
  } catch {
    return "Data inválida";
  }
}

/* ================= EMBED ================= */

function buildEmbed(group) {
  const tempo = getTimeRemaining(group.data, group.hora);

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${group.title}`)
    .setColor(0x5865F2)
    .setDescription(
      `📅 ${group.data}\n🕒 ${group.hora}\n⏳ Começa em: ${tempo}\n📝 ${group.description}`
    );

  for (const key in group.members) {
    embed.addFields({
      name: key,
      value: group.members[key].length
        ? group.members[key].map(u => `<@${u.id}>`).join("\n")
        : "—",
      inline: true
    });
  }

  return embed;
}

/* ================= BOTÕES CRIAR ================= */

function buildButtons(group) {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const key in group.members) {
    const emojiMatch = key.match(/<:[^:]+:(\d+)>/);

    const btn = new ButtonBuilder()
      .setCustomId("join_" + key)
      .setLabel(key.replace(/<:[^:]+:\d+>\s*/, ""))
      .setStyle(ButtonStyle.Primary);

    if (emojiMatch) btn.setEmoji(emojiMatch[1]);

    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(btn);
  }

  rows.push(row);

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("leave_event")
        .setLabel("Sair")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🚪"),
      new ButtonBuilder()
        .setCustomId("edit_" + group.messageId)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
    )
  );

  return rows;
}

/* ================= DGAVA COM EMOJIS ================= */

const DGAVA_CLASSES = [
  { name: "MAIN_TANK", emoji: "<:MAIN_TANK:1492631415953686559>" },
  { name: "OFF_TANK", emoji: "<:OFF_TANK:1492631605166997694>" },
  { name: "ARCANO_ELEVADO", emoji: "<:ARCANO_ELEVADO:1492689272887705681>" },
  { name: "ARCANO_SILENCE", emoji: "<:ARCANO_SILENCE:1492689883301417051>" },
  { name: "MAIN_HEALER", emoji: "<:MAIN_HEALER:1492688340296925225>" },
  { name: "BRUXO", emoji: "<:BRUXO:1492688682350678157>" },
  { name: "RAIZ_PT_HEAL", emoji: "<:RAIZ_PT_HEAL:1492689727982141531>" },
  { name: "RAIZ_BM", emoji: "<:RAIZ_BM:1492689129589313566>" },
  { name: "QUEBRA_REINOS", emoji: "<:QUEBRA_REINOS:1492689509958287621>" },
  { name: "INCUBUS", emoji: "<:INCUBUS:1492688930162872460>" },
  { name: "OCULTO", emoji: "<:OCULTO:1492692707846389850>" },
  { name: "SCOUT", emoji: "<:SCOUT:1492692746203299970>" },
  { name: "DPS", emoji: "<:DPS:1492631692823891998>" }
];

function buildDgavaButtons(group) {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const c of DGAVA_CLASSES) {
    const id = c.emoji.match(/\d+/)[0];

    const btn = new ButtonBuilder()
      .setCustomId("dgava_" + c.name)
      .setLabel(c.name)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(id);

    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(btn);
  }

  rows.push(row);

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("leave_event")
        .setLabel("Sair")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🚪"),
      new ButtonBuilder()
        .setCustomId("edit_" + group.messageId)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
    )
  );

  return rows;
}

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`Bot online ${client.user.tag}`);
  loadGroups();
  setInterval(checkEvents, 60000);

  const commands = [
    new SlashCommandBuilder()
      .setName("dgavafull")
      .setDescription("Criar DGAVA FULL RAID")
      .addStringOption(o => o.setName("data").setDescription("Data").setRequired(true))
      .addStringOption(o => o.setName("hora").setDescription("Hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setDescription("Descrição").setRequired(true)),

    new SlashCommandBuilder()
      .setName("criar")
      .setDescription("Criar evento")
      .addStringOption(o => o.setName("titulo").setDescription("Título").setRequired(true))
      .addStringOption(o => o.setName("classes").setDescription("Emojis").setRequired(true))
      .addStringOption(o => o.setName("data").setDescription("Data").setRequired(true))
      .addStringOption(o => o.setName("hora").setDescription("Hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setDescription("Descrição").setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async i => {
  try {

    /* CRIAR */
    if (i.isChatInputCommand() && i.commandName === "criar") {
      await i.deferReply();

      const event = {
        title: i.options.getString("titulo"),
        data: i.options.getString("data"),
        hora: i.options.getString("hora"),
        description: i.options.getString("descricao"),
        members: {},
        channelId: i.channelId,
        notified: false
      };

      const emojis = i.options.getString("classes").match(/<:[^:]+:\d+>/g) || [];

      for (const emoji of emojis) {
        const name = emoji.split(":")[1];
        event.members[`${emoji} ${name}`] = [];
      }

      const msg = await i.editReply({
        embeds: [buildEmbed(event)],
        components: buildButtons({ ...event, messageId: "temp" }),
        fetchReply: true
      });

      event.messageId = msg.id;

      await msg.edit({
        embeds: [buildEmbed(event)],
        components: buildButtons(event)
      });

      groups.set(msg.id, event);
      saveGroups();
    }

    /* DGAVA */
    if (i.isChatInputCommand() && i.commandName === "dgavafull") {

      const event = {
        title: "DGAVA FULL RAID",
        data: i.options.getString("data"),
        hora: i.options.getString("hora"),
        description: i.options.getString("descricao"),
        members: {},
        channelId: i.channelId,
        notified: false
      };

      DGAVA_CLASSES.forEach(c => event.members[c.name] = []);

      const msg = await i.reply({
        embeds: [buildEmbed(event)],
        components: buildDgavaButtons({ ...event, messageId: "temp" }),
        fetchReply: true
      });

      event.messageId = msg.id;

      await msg.edit({
        embeds: [buildEmbed(event)],
        components: buildDgavaButtons(event)
      });

      groups.set(msg.id, event);
      saveGroups();
    }

    /* ENTRAR */
    if (i.isButton() && (i.customId.startsWith("join_") || i.customId.startsWith("dgava_"))) {
      const event = groups.get(i.message.id);
      if (!event) return;

      const role = i.customId.replace("join_", "").replace("dgava_", "");

      for (const key in event.members) {
        event.members[key] = event.members[key].filter(u => u.id !== i.user.id);
      }

      event.members[role].push({ id: i.user.id });
      saveGroups();

      return i.update({
        embeds: [buildEmbed(event)],
        components: i.message.components
      });
    }

    /* SAIR */
    if (i.isButton() && i.customId === "leave_event") {
      const event = groups.get(i.message.id);
      if (!event) return;

      for (const key in event.members) {
        event.members[key] = event.members[key].filter(u => u.id !== i.user.id);
      }

      saveGroups();

      return i.update({
        embeds: [buildEmbed(event)],
        components: i.message.components
      });
    }

    /* EDITAR */
    if (i.isButton() && i.customId.startsWith("edit_")) {

      const messageId = i.customId.replace("edit_", "");

      const modal = new ModalBuilder()
        .setCustomId("modal_edit_" + messageId)
        .setTitle("Editar Evento");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("titulo").setLabel("Título").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("data").setLabel("Data").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("hora").setLabel("Hora").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("desc").setLabel("Descrição").setStyle(TextInputStyle.Paragraph)
        )
      );

      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("modal_edit_")) {

      const messageId = i.customId.replace("modal_edit_", "");
      const event = groups.get(messageId);
      if (!event) return i.reply({ content: "Evento não encontrado", ephemeral: true });

      event.title = i.fields.getTextInputValue("titulo");
      event.data = i.fields.getTextInputValue("data");
      event.hora = i.fields.getTextInputValue("hora");
      event.description = i.fields.getTextInputValue("desc");

      saveGroups();

      const channel = await client.channels.fetch(event.channelId);
      const msg = await channel.messages.fetch(messageId);

      await msg.edit({
        embeds: [buildEmbed(event)],
        components: msg.components
      });

      return i.reply({ content: "Evento atualizado!", ephemeral: true });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= AVISO ================= */

function checkEvents() {
  const now = new Date();

  for (const event of groups.values()) {
    if (event.notified) continue;

    const [d, m, y] = event.data.split("/");
    const [h, min] = event.hora.split(":");

    const eventDate = new Date(y, m - 1, d, h, min);
    const diff = (eventDate - now) / 60000;

    if (diff <= 10 && diff > 0) {
      const channel = client.channels.cache.get(event.channelId);
      if (!channel) continue;

      channel.send(`@everyone ⏰ Evento **${event.title}** começa em 10 minutos!`);
      event.notified = true;
      saveGroups();
    }
  }
}

/* ================= WEB ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);
