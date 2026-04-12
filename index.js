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

/* ================= EMBED GENÉRICO ================= */

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

/* ================= BOTÕES GENÉRICOS ================= */

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

/* ================= DGAVA FULL ================= */

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

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`Bot online ${client.user.tag}`);
  loadGroups();

  const commands = [
    new SlashCommandBuilder()
      .setName("dgavafull")
      .setDescription("Criar DGAVA FULL RAID")
      .addStringOption(o =>
        o.setName("data").setDescription("DD/MM/AAAA").setRequired(true)
      )
      .addStringOption(o =>
        o.setName("hora").setDescription("HH:MM").setRequired(true)
      )
      .addStringOption(o =>
        o.setName("descricao").setDescription("Descrição").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("criar")
      .setDescription("Criar evento manual com emojis do Discord")
      .addStringOption(o =>
        o.setName("titulo").setDescription("Título").setRequired(true)
      )
      .addStringOption(o =>
        o.setName("classes").setDescription("Cole os emojis do Discord").setRequired(true)
      )
      .addStringOption(o =>
        o.setName("data").setDescription("DD/MM/AAAA").setRequired(true)
      )
      .addStringOption(o =>
        o.setName("hora").setDescription("HH:MM").setRequired(true)
      )
      .addStringOption(o =>
        o.setName("descricao").setDescription("Descrição").setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("Comandos registrados.");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async i => {
  try {

    /* DGAVA FULL */
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

    /* ================= CRIAR (CORRIGIDO) ================= */
    if (i.isChatInputCommand() && i.commandName === "criar") {

      try {
        await i.deferReply();

        const titulo = i.options.getString("titulo");
        const classesRaw = i.options.getString("classes");
        const data = i.options.getString("data");
        const hora = i.options.getString("hora");
        const descricao = i.options.getString("descricao");

        const event = {
          title: titulo,
          data,
          hora,
          description: descricao,
          members: {}
        };

        const emojis = classesRaw.match(/<:[a-zA-Z0-9_]+:\d+>/g) || [];

        for (const emoji of emojis) {
          const name = emoji.split(":")[1];
          event.members[name] = [];
        }

        const msg = await i.editReply({
          embeds: [buildEmbed(event)],
          components: buildButtons(event),
          fetchReply: true
        });

        groups.set(msg.id, event);
        saveGroups();

      } catch (err) {
        console.error("ERRO /criar:", err);

        if (!i.replied) {
          await i.reply({
            content: "Erro ao criar evento.",
            ephemeral: true
          });
        }
      }
    }

    /* BUTTONS */
    if (i.isButton() && i.customId.startsWith("dgava_")) {

      const event = groups.get(i.message.id);
      if (!event) return;

      const role = i.customId.replace("dgava_", "");

      for (const c of DGAVA_CLASSES) {
        event.members[c.name] = event.members[c.name].filter(u => u.id !== i.user.id);
      }

      event.members[role].push({ id: i.user.id, sub: null });

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
app.get("/", (req, res) => res.send("Albion Bot está online!"));

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web ativo");
});

client.login(process.env.DISCORD_TOKEN);
