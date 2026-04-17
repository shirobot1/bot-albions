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
  StringSelectMenuBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on("error", console.error);

const groups = new Map();

/* ================= SALVAR / CARREGAR ================= */

function saveGroups() {
  try {
    const data = Object.fromEntries(groups);
    fs.writeFileSync("./groups.json", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Erro ao salvar:", e);
  }
}

function loadGroups() {
  try {
    if (!fs.existsSync("./groups.json")) return;

    const data = JSON.parse(fs.readFileSync("./groups.json", "utf8"));

    for (const id in data) {
      groups.set(id, data[id]);
    }

    console.log(`[Sistema] ${groups.size} grupos carregados.`);
  } catch (e) {
    console.error("Erro ao carregar:", e);
  }
}

/* ================= UTIL ================= */

function getEmoji(roleName) {
  const name = roleName.toLowerCase();

  if (name.includes("incubus")) return "<:Incubus:1479601055816749212>";
  if (name.includes("aguia")) return "<:aguia:1479601119612240003>";
  if (name.includes("chama")) return "<:chamasombra:1479601382318280926>";
  if (name.includes("dps")) return "<:dps:1479601155582459904>";
  if (name.includes("foice")) return "<:foice:1479601139338186834>";
  if (name.includes("fulgurante")) return "<:fulgurante:1479601175157407907>";
  if (name.includes("healer")) return "<:healer:1479601216831885512>";
  if (name.includes("mainhealer")) return "<:mainhealer:1479600899067347070>";
  if (name.includes("maintank")) return "<:maintank:1479600981342949536>";
  if (name.includes("raizbm")) return "<:raizbm:1479601235014320201>";
  if (name.includes("oculto")) return "<:oculto:1479601337367789621>";
  if (name.includes("offtank")) return "<:offtank:1479601014440067082>";
  if (name.includes("paratempo")) return "<:paratempo:1479601362231886007>";
  if (name.includes("prisma")) return "<:prisma:1479601196938428597>";
  if (name.includes("ptheal")) return "<:ptheal:1479601036153983058>";
  if (name.includes("quebrareinos")) return "<:quebrareinos:1479601271584325633>";
  if (name.includes("silence")) return "<:silence:1479601096644104376>";
  if (name.includes("uivo")) return "<:uivo:1479601081544736830>";
  if (name.includes("tank")) return "<:tank:1479709733559730277>";
  if (name.includes("badon")) return "<:badon:1479710170132119552>";
  if (name.includes("raizferrea")) return "<:raizferrea:1480898476324819035>";
  if (name.includes("arcolongo")) return "<:arcolongo:1480899757189763233>";
  if (name.includes("susurante")) return "<:susurante:1480899728748314686>";
  if (name.includes("furabruma")) return "<:furabruma:1480899700549877791>";
  if (name.includes("bruxo")) return "<:bruxo:1487148891928264735>";

  return "⚔️";
}

/* ================= EMBED ================= */

function buildEmbed(group) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${group.title || "EVENTO"}`)
    .setColor(0x5865F2)
    .setDescription(
      `📅 Data: ${group.data}\n🕒 Hora: ${group.hora}\n📝 ${group.description || "Sem descrição"}`
    );

  for (const key in group.members) {
    const list = group.members[key] || [];

    embed.addFields({
      name: `${key}`,
      value: list.length
        ? list.map(u => `<@${u.id}>`).join("\n")
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
    const btn = new ButtonBuilder()
      .setCustomId("join_" + key)
      .setLabel(key)
      .setStyle(ButtonStyle.Primary);

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

function buildDgavaButtons() {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const c of DGAVA_CLASSES) {
    const btn = new ButtonBuilder()
      .setCustomId("dgava_" + c.name)
      .setLabel(c.name)
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

const DGAVA_CLASSES = [
  { name: "MAIN_TANK" },
  { name: "OFF_TANK" },
  { name: "ARCANO_ELEVADO" },
  { name: "ARCANO_SILENCE" },
  { name: "MAIN_HEALER" },
  { name: "BRUXO" },
  { name: "RAIZ_PT_HEAL" },
  { name: "RAIZ_BM" },
  { name: "QUEBRA_REINOS" },
  { name: "INCUBUS" },
  { name: "OCULTO" },
  { name: "SCOUT" },
  { name: "DPS" }
];

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`Bot online ${client.user.tag}`);
  loadGroups();

  const commands = [
    new SlashCommandBuilder()
      .setName("dgavafull")
      .setDescription("Criar DGAVA FULL")
      .addStringOption(o => o.setName("data").setRequired(true))
      .addStringOption(o => o.setName("hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setRequired(true)),

    new SlashCommandBuilder()
      .setName("criar")
      .setDescription("Criar evento manual")
      .addStringOption(o => o.setName("titulo").setRequired(true))
      .addStringOption(o => o.setName("classes").setRequired(true))
      .addStringOption(o => o.setName("data").setRequired(true))
      .addStringOption(o => o.setName("hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("Comandos registrados.");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async i => {
  try {

    /* DGAVA */
    if (i.isChatInputCommand() && i.commandName === "dgavafull") {

      const event = {
        title: "DGAVA FULL RAID",
        data: i.options.getString("data"),
        hora: i.options.getString("hora"),
        description: i.options.getString("descricao"),
        members: {}
      };

      for (const c of DGAVA_CLASSES) {
        event.members[c.name] = [];
      }

      const msg = await i.reply({
        embeds: [buildEmbed(event)],
        components: buildDgavaButtons(),
        fetchReply: true
      });

      groups.set(msg.id, event);
      saveGroups();
    }

    /* CRIAR */
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

    /* BOTÕES CRIAR */
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

    /* BOTÕES DGAVA */
    if (i.isButton() && i.customId.startsWith("dgava_")) {

      const event = groups.get(i.message.id);
      if (!event) return;

      const role = i.customId.replace("dgava_", "");

      for (const c of DGAVA_CLASSES) {
        event.members[c.name] = event.members[c.name].filter(u => u.id !== i.user.id);
      }

      event.members[role].push({ id: i.user.id });

      saveGroups();

      return i.update({
        embeds: [buildEmbed(event)],
        components: buildDgavaButtons()
      });
    }

  } catch (err) {
    console.error("Erro:", err);
  }
});

/* ================= EXPRESS ================= */

const app = express();
app.get("/", (req, res) => res.send("Albion Bot online"));

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server ativo");
});

client.login(process.env.DISCORD_TOKEN);
