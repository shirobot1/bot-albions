require("dotenv").config();
const fs = require("fs");
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
    console.log(`[Sistema] Grupos salvos (${groups.size})`);
  } catch (e) {
    console.error("Erro ao salvar:", e);
  }
}

function loadGroups() {
  try {
    if (fs.existsSync("./groups.json")) {
      const data = JSON.parse(fs.readFileSync("./groups.json", "utf8"));
      for (const id in data) {
        data[id].startDate = new Date(data[id].startDate);
        groups.set(id, data[id]);
      }
      console.log(`[Sistema] ${groups.size} grupos carregados.`);
    }
  } catch (e) {
    console.error("Erro ao carregar:", e);
  }
}

/* ================= UTIL ================= */

function getEmoji(roleName){
  const name = roleName.toLowerCase();

  if(name.includes("incubus")) return "<:Incubus:1479601055816749212>";
  if(name.includes("aguia")) return "<:aguia:1479601119612240003>";
  if(name.includes("chama")) return "<:chamasombra:1479601382318280926>";
  if(name.includes("dps")) return "<:dps:1479601155582459904>";
  if(name.includes("foice")) return "<:foice:1479601139338186834>";
  if(name.includes("fulgurante")) return "<:fulgurante:1479601175157407907>";
  if(name.includes("healer")) return "<:healer:1479601216831885512>";
  if(name.includes("mainhealer")) return "<:mainhealer:1479600899067347070>";
  if(name.includes("maintank")) return "<:maintank:1479600981342949536>";
  if(name.includes("raizbm")) return "<:raizbm:1479601235014320201>";
  if(name.includes("oculto")) return "<:oculto:1479601337367789621>";
  if(name.includes("offtank")) return "<:offtank:1479601014440067082>";
  if(name.includes("paratempo")) return "<:paratempo:1479601362231886007>";
  if(name.includes("prisma")) return "<:prisma:1479601196938428597>";
  if(name.includes("ptheal")) return "<:ptheal:1479601036153983058>";
  if(name.includes("quebrareinos")) return "<:quebrareinos:1479601271584325633>";
  if(name.includes("silence")) return "<:silence:1479601096644104376>";
  if(name.includes("uivo")) return "<:uivo:1479601081544736830>";
  if(name.includes("tank")) return "<:tank:1479709733559730277>";
  if(name.includes("badon")) return "<:badon:1479710170132119552>";
  if(name.includes("raizferrea")) return "<:raizferrea:1480898476324819035>";
  if(name.includes("arcolongo")) return "<:arcolongo:1480899757189763233>";
  if(name.includes("susurante")) return "<:susurante:1480899728748314686>";
  if(name.includes("furabruma")) return "<:furabruma:1480899700549877791>";
  if(name.includes("bruxo")) return "<:bruxo:1487148891928264735>";

  return "⚔️";
}

function parseRoles(input) {
  const roles = {};
  const parts = input.split(",");
  for (const p of parts) {
    const match = p.trim().match(/^(\d+)\s+(.+)$/);
    if (match) {
      const qty = parseInt(match[1]);
      const name = match[2].trim();
      roles[name] = { name, limit: qty };
    }
  }
  return roles;
}

function parseDateTime(dateStr, timeStr) {
  const [d, m, y] = dateStr.split("/").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

function formatDate(d) {
  return d.toLocaleDateString("pt-BR");
}

function formatTime(d) {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* ================= EMBED NORMAL ================= */

function buildEmbed(group) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${group.title}`)
    .setColor(0x5865F2)
    .setDescription(
      `📅 Data: ${formatDate(group.startDate)}\n` +
      `🕒 Horário: ${formatTime(group.startDate)}\n` +
      `📝 ${group.description || "Sem descrição"}`
    );

  for (const key in group.members) {
    embed.addFields({
      name: `${key}`,
      value: group.members[key].length
        ? group.members[key].map(u => `<@${u}>`).join("\n")
        : "—",
      inline: true
    });
  }

  return embed;
}

/* ================= BOTÕES NORMAL ================= */

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

/* ================= DGAVA FULL (ADICIONADO) ================= */

const DGAVA_CLASSES = [
  { name: "MAIN TANK", emoji: "<:MAIN_TANK:1492631415953686559>" },
  { name: "OFF TANK", emoji: "<:OFF_TANK:1492631605166997694>" },
  { name: "ARCANO ELEVADO", emoji: "<:ARCANO_ELEVADO:1492689272887705681>" },
  { name: "ARCANO SILENCE", emoji: "<:ARCANO_SILENCE:1492689883301417051>" },
  { name: "MAIN HEALER", emoji: "<:MAIN_HEALER:1492688340296925225>" },
  { name: "BRUXO", emoji: "<:BRUXO:1492688682350678157>" },
  { name: "RAIZ PT HEAL", emoji: "<:RAIZ_PT_HEAL:1492689727982141531>" },
  { name: "RAIZ BM", emoji: "<:RAIZ_BM:1492689129589313566>" },
  { name: "QUEBRA REINOS", emoji: "<:QUEBRA_REINOS:1492689509958287621>" },
  { name: "INCUBUS", emoji: "<:INCUBUS:1492688930162872460>" },
  { name: "OCULTO", emoji: "<:OCULTO:1492692707846389850>" },
  { name: "SCOUT", emoji: "<:SCOUT:1492692746203299970>" },
  { name: "DPS", emoji: "<:DPS:1492631692823891998>" }
];

const DPS_SUBCLASSES = [
  { label: "FROST", value: "FROST", emoji: "<:FROST:1492689983901929572>" },
  { label: "FULGURANTE", value: "FULGURANTE", emoji: "<:FULGURANTE:1492688810180608010>" },
  { label: "FOICE DE CRISTAL", value: "FOICE", emoji: "<:FOICE_DE_CRISTAL:1492688757583777905>" },
  { label: "AGUIA", value: "AGUIA", emoji: "<:AGUIA:1492688099459727390>" },
  { label: "BESTA LEVE", value: "BESTA", emoji: "<:BESTALEVE:1492688194511306953>" },
  { label: "RAIZ DPS", value: "RAIZ_DPS", emoji: "<:RAIZ_DPS:1492693786625708244>" }
];

function buildDgavaEmbed(event) {
  const embed = new EmbedBuilder()
    .setTitle("⚔️ DGAVA FULL RAID")
    .setColor(0xFF0000)
    .setDescription(
      `📅 ${event.data}\n🕒 ${event.hora}\n📝 ${event.descricao}`
    );

  for (const c of DGAVA_CLASSES) {
    const list = event.members[c.name] || [];

    embed.addFields({
      name: `${c.emoji} ${c.name}`,
      value: list.length ? list.map(u => `<@${u}>`).join("\n") : "—",
      inline: true
    });
  }

  return embed;
}

function buildDgavaButtons() {
  const rows = [];
  let row = new ActionRowBuilder();

  for (const c of DGAVA_CLASSES) {
    const btn = new ButtonBuilder()
      .setCustomId("dgava_" + c.name)
      .setLabel(c.name)
      .setEmoji(c.emoji)
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

function buildDpsMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("dgava_dps")
      .setPlaceholder("Escolha DPS")
      .addOptions(DPS_SUB)
  );
}

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`Bot online ${client.user.tag}`);
  loadGroups();

  const commands = [
    new SlashCommandBuilder()
      .setName("criar")
      .setDescription("Criar grupo")
      .addStringOption(o => o.setName("tipo").setRequired(true))
      .addIntegerOption(o => o.setName("jogadores").setRequired(true))
      .addStringOption(o => o.setName("classes").setRequired(true))
      .addStringOption(o => o.setName("data").setRequired(true))
      .addStringOption(o => o.setName("horario").setRequired(true))
      .addStringOption(o => o.setName("descricao").setRequired(false)),

    new SlashCommandBuilder()
      .setName("dgavafull")
      .setDescription("DGAVA FULL RAID")
      .addStringOption(o => o.setName("data").setRequired(true))
      .addStringOption(o => o.setName("hora").setRequired(true))
      .addStringOption(o => o.setName("descricao").setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async i => {

  /* ===== DGAVA FULL ===== */

  if (i.isChatInputCommand() && i.commandName === "dgavafull") {

    const event = {
      data: i.options.getString("data"),
      hora: i.options.getString("hora"),
      descricao: i.options.getString("descricao"),
      members: {},
      creatorId: i.user.id
    };

    for (const c of DGAVA_CLASSES) {
      event.members[c.name] = [];
    }

    const msg = await i.reply({
      embeds: [buildDgavaEmbed(event)],
      components: buildDgavaButtons(),
      fetchReply: true
    });

    groups.set(msg.id, event);
    saveGroups();
  }

  /* ===== BOTÕES DGAVA ===== */

  if (i.isButton() && i.customId.startsWith("dgava_")) {

    const event = groups.get(i.message.id);
    if (!event) return;

    const role = i.customId.replace("dgava_", "");

    for (const c in event.members) {
      event.members[c] = event.members[c].filter(u => u !== i.user.id);
    }

    if (role === "DPS") {
      return i.update({
        embeds: [buildDgavaEmbed(event)],
        components: [...buildDgavaButtons(), buildDpsMenu()]
      });
    }

    event.members[role].push(i.user.id);

    return i.update({
      embeds: [buildDgavaEmbed(event)],
      components: buildDgavaButtons()
    });
  }

  /* ===== DPS MENU ===== */

  if (i.isStringSelectMenu() && i.customId === "dgava_dps") {

    const event = groups.get(i.message.id);
    if (!event) return;

    for (const c in event.members) {
      event.members[c] = event.members[c].filter(u => u !== i.user.id);
    }

    event.members["DPS"].push(i.user.id);

    return i.reply({
      content: `DPS selecionado: ${i.values[0]}`,
      ephemeral: true
    });
  }
});


client.login(process.env.DISCORD_TOKEN);

// ================= SERVIDOR WEB PARA RENDER =================
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Albion Bot está online!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor web ativo na porta " + PORT);
});
