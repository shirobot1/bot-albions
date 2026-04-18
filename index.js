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
  const date = new Date(Date.UTC(y, m - 1, d, h, min, 0));
  return new Date(date.getTime() + (3 * 60 * 60 * 1000));
}

function getTimeRemaining(data, hora) {
  const diff = getEventDate(data, hora).getTime() - Date.now();
  if (diff <= 0) return "Evento iniciado";
  const minTotal = Math.floor(diff / 60000);
  return `${Math.floor(minTotal / 60)}h ${minTotal % 60}m`;
}

function formatDateBR(data, hora) {
  return `${data} às ${hora}`;
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
      new ButtonBuilder().setCustomId("leave_event").setLabel("Sair").setStyle(ButtonStyle.Danger).setEmoji("🚪"),
      new ButtonBuilder().setCustomId("edit").setLabel("Editar").setStyle(ButtonStyle.Secondary).setEmoji("✏️")
    )
  );

  return rows;
}

/* ================= DGAVA BUTTONS ================= */

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
      new ButtonBuilder().setCustomId("edit").setEmoji("✏️").setStyle(ButtonStyle.Secondary)
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

  const commands = [
    new SlashCommandBuilder()
      .setName("criar")
      .setDescription("Criar evento")
      .addStringOption(o => o.setName("titulo").setRequired(true))
      .addStringOption(o => o.setName("classes").setRequired(true))
      .addStringOption(o => o.setName("data").setRequired(true))
      .addStringOption(o => o.setName("hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

/* ================= INTERAÇÕES CORRIGIDAS ================= */

client.on("interactionCreate", async i => {
  try {

    /* JOIN / DGAVA */
    if (i.isButton() && (i.customId.startsWith("join_") || i.customId.startsWith("dgava_"))) {
      const e = groups.get(i.message.id);
      if (!e) return;

      const role = i.customId.replace("join_", "").replace("dgava_", "");

      if (role === "DPS") {
        return i.reply({
          content: "Escolha DPS",
          components: [dpsMenu(i.message.id)],
          ephemeral: true
        });
      }

      for (const k in e.members)
        e.members[k] = e.members[k].filter(u => u.id !== i.user.id);

      e.members[role].push({ id: i.user.id });

      saveGroups();

      return i.update({
        embeds: [buildEmbed(e)],
        components: buildButtons(e)
      });
    }

    /* SAIR */
    if (i.isButton() && i.customId === "leave_event") {
      const e = groups.get(i.message.id);
      if (!e) return;

      for (const k in e.members)
        e.members[k] = e.members[k].filter(u => u.id !== i.user.id);

      saveGroups();

      return i.update({
        embeds: [buildEmbed(e)],
        components: buildButtons(e)
      });
    }

    /* DPS SELECT */
    if (i.isStringSelectMenu() && i.customId.startsWith("dps_select_")) {
      const id = i.customId.replace("dps_select_", "");
      const e = groups.get(id);
      if (!e) return;

      const role = i.values[0];

      for (const k in e.members)
        e.members[k] = e.members[k].filter(u => u.id !== i.user.id);

      e.members["DPS"].push({ id: i.user.id, emoji: DPS_SUB[role] });

      saveGroups();

      return i.update({
        content: "Selecionado",
        components: []
      });
    }

    /* EDIT BUTTON */
    if (i.isButton() && i.customId === "edit") {
      return i.reply({ content: "Use comando de edição no sistema atual.", ephemeral: true });
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
