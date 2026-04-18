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
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const groups = new Map();

/* ================= DPS ================= */

const DPS_SUB = {
  FROST: "<:FROST:1492689983901929572>",
  FULGURANTE: "<:FULGURANTE:1492688810180608010>",
  FOICE_DE_CRISTAL: "<:FOICE_DE_CRISTAL:1492688757583777905>",
  AGUIA: "<:AGUIA:1492688099459727390>",
  BESTALEVE: "<:BESTALEVE:1492688194511306953>",
  REPETIDOR: "<:REPETIDOR:1492689810664456252>"
};

/* ================= CLASSES ================= */

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

/* ================= SAVE ================= */

function saveGroups() {
  fs.writeFileSync("./groups.json", JSON.stringify(Object.fromEntries(groups), null, 2));
}

function loadGroups() {
  if (!fs.existsSync("./groups.json")) return;
  const data = JSON.parse(fs.readFileSync("./groups.json"));
  for (const id in data) groups.set(id, data[id]);
}

/* ================= TEMPO ================= */

function getEventDate(data, hora) {
  const [d, m, y] = data.split("/");
  const [h, min] = hora.split(":");
  return new Date(y, m - 1, d, h, min);
}

function getTimeRemaining(data, hora) {
  try {
    const diff = getEventDate(data, hora) - new Date();

    if (diff <= 0) return "Evento iniciado";

    const minTotal = Math.floor(diff / 60000);
    return `${Math.floor(minTotal / 60)}h ${minTotal % 60}m`;
  } catch {
    return "Data inválida";
  }
}

/* ================= FORMAT BR ================= */

function formatDateBR(data, hora) {
  try {
    return getEventDate(data, hora).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return `${data} ${hora}`;
  }
}

/* ================= EMBED ================= */

function buildEmbed(group) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${group.title}`)
    .setColor(0x5865F2)
    .setDescription(
      `📅 ${formatDateBR(group.data, group.hora)}\n⏳ ${getTimeRemaining(group.data, group.hora)}\n📝 ${group.description}`
    );

  for (const key in group.members) {
    let emoji = "";
    const found = DGAVA_CLASSES.find(c => c.name === key);
    if (found) emoji = found.emoji;

    embed.addFields({
      name: `${emoji} ${key}`,
      value: group.members[key].length
        ? group.members[key]
            .map(u => `${u.emoji ? u.emoji + " " : ""}<@${u.id}>`)
            .join("\n")
        : "—",
      inline: true
    });
  }

  return embed;
}

/* ================= BOTÕES ================= */

function buildButtons(group) {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const key in group.members) {
    const match = key.match(/<:[^:]+:(\d+)>/);

    const btn = new ButtonBuilder()
      .setCustomId("join_" + key)
      .setLabel(key.replace(/<:[^:]+:\d+>\s*/, ""))
      .setStyle(ButtonStyle.Primary);

    if (match) btn.setEmoji(match[1]);

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

function buildDgavaButtons(group) {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const c of DGAVA_CLASSES) {
    const id = c.emoji.match(/\d+/)[0];

    const btn = new ButtonBuilder()
      .setCustomId("dgava_" + c.name)
      .setLabel(c.name)
      .setEmoji(id)
      .setStyle(ButtonStyle.Secondary);

    if (row.components.length === 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(btn);
  }

  rows.push(row);

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("leave_event").setEmoji("🚪").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("edit_" + group.messageId).setEmoji("✏️").setStyle(ButtonStyle.Secondary)
    )
  );

  return rows;
}

/* ================= DPS MENU ================= */

function dpsMenu(messageId) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dps_select_" + messageId)
      .setPlaceholder("Escolha sua subclasse DPS")
      .addOptions(
        Object.entries(DPS_SUB).map(([k, v]) => ({
          label: k,
          value: k,
          emoji: v.match(/\d+/)[0]
        }))
      )
  );
}

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`Bot online ${client.user.tag}`);
  loadGroups();
  setInterval(checkEvents, 60000);

const commands = [
  new SlashCommandBuilder()
    .setName("dgavafull")
    .setDescription("Criar DG Avalon Full")
    .addStringOption(o =>
      o.setName("data")
        .setDescription("Data do evento (DD/MM/AAAA)")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("hora")
        .setDescription("Hora do evento (HH:MM)")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("descricao")
        .setDescription("Descrição do evento")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("criar")
    .setDescription("Criar evento personalizado")
    .addStringOption(o =>
      o.setName("titulo")
        .setDescription("Título do evento")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("classes")
        .setDescription("Emojis das classes (ex: <:tank:123> <:heal:456>)")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("data")
        .setDescription("Data do evento (DD/MM/AAAA)")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("hora")
        .setDescription("Hora do evento (HH:MM)")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("descricao")
        .setDescription("Descrição do evento")
        .setRequired(true)
    )
].map(c => c.toJSON());
  
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async i => {
  try {

    if (!i.deferred && !i.replied) await i.deferUpdate().catch(()=>{});

    if (i.isButton() && i.customId.startsWith("edit_")) {
      const id = i.customId.replace("edit_", "");
      const e = groups.get(id);
      if (!e) return;

      const modal = new ModalBuilder()
        .setCustomId("modal_edit_" + id)
        .setTitle("Editar Evento");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("data").setLabel("Data").setStyle(TextInputStyle.Short).setValue(e.data)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("hora").setLabel("Hora").setStyle(TextInputStyle.Short).setValue(e.hora)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("desc").setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setValue(e.description)
        )
      );

      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("modal_edit_")) {
      const id = i.customId.replace("modal_edit_", "");
      const e = groups.get(id);
      if (!e) return;

      e.data = i.fields.getTextInputValue("data");
      e.hora = i.fields.getTextInputValue("hora");
      e.description = i.fields.getTextInputValue("desc");

      saveGroups();

      const ch = await client.channels.fetch(e.channelId);
      const msg = await ch.messages.fetch(id);

      await msg.edit({ embeds: [buildEmbed(e)], components: msg.components });

      return i.reply({ content: "Atualizado!", ephemeral: true });
    }

    if (i.isButton() && i.customId === "leave_event") {
      const e = groups.get(i.message.id);

      for (const k in e.members)
        e.members[k] = e.members[k].filter(u => u.id !== i.user.id);

      saveGroups();

      return i.editReply({ embeds: [buildEmbed(e)], components: i.message.components });
    }

    if (i.isButton() && (i.customId.startsWith("join_") || i.customId.startsWith("dgava_"))) {

      const e = groups.get(i.message.id);
      if (!e) return;

      const role = i.customId.replace("join_", "").replace("dgava_", "");

      if (role === "DPS") {
        return i.followUp({
          content: "Escolha sua subclasse",
          components: [dpsMenu(i.message.id)],
          ephemeral: true
        });
      }

      for (const k in e.members)
        e.members[k] = e.members[k].filter(u => u.id !== i.user.id);

      e.members[role].push({ id: i.user.id });

      saveGroups();

      return i.editReply({ embeds: [buildEmbed(e)], components: i.message.components });
    }

    if (i.isStringSelectMenu() && i.customId.startsWith("dps_select_")) {
      const id = i.customId.replace("dps_select_", "");
      const e = groups.get(id);
      if (!e) return;

      const role = i.values[0];

      for (const k in e.members)
        e.members[k] = e.members[k].filter(u => u.id !== i.user.id);

      e.members["DPS"].push({
        id: i.user.id,
        emoji: DPS_SUB[role]
      });

      saveGroups();

      const ch = await client.channels.fetch(e.channelId);
      const msg = await ch.messages.fetch(id);

      await msg.edit({ embeds: [buildEmbed(e)], components: msg.components });

      return i.update({ content: "Selecionado!", components: [] });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= AVISO ================= */

function checkEvents() {
  const now = new Date();

  for (const e of groups.values()) {
    if (e.notified) continue;

    const diff = (getEventDate(e.data, e.hora) - now) / 60000;

    if (diff <= 10 && diff > 0) {
      const ch = client.channels.cache.get(e.channelId);
      if (!ch) continue;

      ch.send(`@everyone ⏰ Evento **${e.title}** começa em 10 minutos!`);
      e.notified = true;
      saveGroups();
    }
  }
}

/* ================= WEB ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot online"));
app.listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);
