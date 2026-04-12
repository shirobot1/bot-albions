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

/* ================= FIX REAL (SEM LIMITE DE CLASSE) ================= */

function parseRoles(input) {
  const roles = {};
  const parts = input.split(",");

  for (const p of parts) {
    const name = p.trim();

    if (!name) continue;

    roles[name] = {
      name: name
    };
  }

  return roles;
}

function parseDateTime(dateStr, timeStr) {
  const [d, m, y] = dateStr.split("/").map(Number);
  const [h, min] = timeStr.split(":").map(Number);

  // salva como UTC puro SEM ajuste automático do Node
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

function formatDate(d) {
  const utc = d.getTime();
  const offset = -3 * 60; // Brasil UTC-3
  const local = new Date(utc + offset * 60000);

  const dd = String(local.getUTCDate()).padStart(2, "0");
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = local.getUTCFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(d) {
  const utc = d.getTime();
  const offset = -3 * 60; // Brasil UTC-3
  const local = new Date(utc + offset * 60000);

  const hh = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");

  return `${hh}:${min}`;
}
/* ================= EMBED ================= */

function buildEmbed(group) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${group.title}`)
    .setColor(0x5865F2)
    .setDescription(
      `📅 Data: ${formatDate(group.startDate)}\n` +
      `🕒 Horário: ${formatTime(group.startDate)} BR\n` +
      `📝 ${group.description}\n\n` +
      `👥 Total: ${group.total}`
    );

  for (const key in group.roles) {
    const role = group.roles[key];
    const emoji = getEmoji(role.name);

    const members =
      group.members[key].map(u => `<@${u.id}>`).join("\n") || "—";

    embed.addFields({
      name: `${emoji} ${role.name} (${group.members[key].length})`,
      value: members,
      inline: true
    });
  }

  return embed;
}

/* ================= BOTÕES ================= */

function buildButtons(group) {

  const rows = [];
  let currentRow = new ActionRowBuilder();
  const allButtons = [];

  for (const key in group.roles) {

    const role = group.roles[key];
    const emoji = getEmoji(role.name);

    allButtons.push(
      new ButtonBuilder()
        .setCustomId("join_" + key)
        .setEmoji(emoji)
        .setLabel(role.name)
        .setStyle(ButtonStyle.Primary)
    );
  }

  allButtons.push(
    new ButtonBuilder()
      .setCustomId("leave")
      .setLabel("🚪 Sair")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("ping_all")
      .setLabel("🔔 Ping")
      .setStyle(ButtonStyle.Secondary)
  );

  for (const button of allButtons) {
    if (currentRow.components.length === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    currentRow.addComponents(button);
  }

  if (currentRow.components.length > 0) rows.push(currentRow);
  return rows;
}

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`Bot online como ${client.user.tag}`);
  loadGroups();

  const commands = [
    new SlashCommandBuilder()
      .setName("criar")
      .setDescription("Criar grupo de conteúdo")
      .addStringOption(o=>o.setName("tipo").setDescription("Tipo").setRequired(true))
      .addIntegerOption(o=>o.setName("jogadores").setDescription("Total jogadores").setRequired(true))
      .addStringOption(o=>o.setName("classes").setDescription("tank, healer, dps").setRequired(true))
      .addStringOption(o=>o.setName("data").setDescription("DD/MM/AAAA").setRequired(true))
      .addStringOption(o=>o.setName("horario").setDescription("HH:MM UTC-3").setRequired(true))
      .addStringOption(o=>o.setName("descricao").setDescription("Descrição")),

    new SlashCommandBuilder()
      .setName("divisao")
      .setDescription("Calcular divisão de loot")
      .addIntegerOption(o=>o.setName("loot").setDescription("Valor total").setRequired(true))
      .addIntegerOption(o=>o.setName("jogadores").setDescription("Quantidade jogadores"))
      .addStringOption(o=>o.setName("mencoes").setDescription("@user")),

    new SlashCommandBuilder()
      .setName("remover")
      .setDescription("Remover jogador")
      .addUserOption(o =>
        o.setName("usuario")
        .setDescription("Usuário")
        .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("Comandos registrados.");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async i => {

  if (i.isChatInputCommand()) {

    if (i.commandName === "criar") {

      const roles = parseRoles(i.options.getString("classes"));

      const members = {};
      for (const r in roles) members[r] = [];

      const group = {
        title: i.options.getString("tipo"),
        total: i.options.getInteger("jogadores"),
        roles,
        members,
        description: i.options.getString("descricao") || "Sem descrição",
        startDate: parseDateTime(
          i.options.getString("data"),
          i.options.getString("horario")
        ),
        creatorId: i.user.id
      };

      const msg = await i.reply({
        embeds: [buildEmbed(group)],
        components: buildButtons(group),
        fetchReply: true
      });

      groups.set(msg.id, group);
      saveGroups();
    }

    if (i.commandName === "remover") {

      const user = i.options.getUser("usuario");

      const group = [...groups.values()].find(g =>
        Object.values(g.members).flat().some(u => u.id === user.id)
      );

      if (!group)
        return i.reply({ content: "Usuário não encontrado.", ephemeral: true });

      if (i.user.id !== group.creatorId)
        return i.reply({ content: "❌ Apenas o criador pode remover.", ephemeral: true });

      for (const r in group.members) {
        group.members[r] = group.members[r].filter(u => u.id !== user.id);
      }

      saveGroups();

      return i.reply({ content: "Usuário removido." });
    }
  }

  if (i.isButton()) {

    const group = groups.get(i.message.id);
    if (!group)
      return i.reply({ content: "Evento expirado.", ephemeral: true });

    const user = i.user;

    if (i.customId === "leave") {
      for (const r in group.members)
        group.members[r] = group.members[r].filter(u => u.id !== user.id);

      await i.update({
        embeds: [buildEmbed(group)],
        components: buildButtons(group)
      });

      saveGroups();
      return;
    }

    if (i.customId === "ping_all") {

      if (i.user.id !== group.creatorId)
        return i.reply({ content: "❌ Apenas o criador.", ephemeral: true });

      const mentions = [];
      for (const r in group.members)
        group.members[r].forEach(u => mentions.push(`<@${u.id}>`));

      return i.reply({ content: mentions.join(" ") || "Vazio" });
    }

    const role = i.customId.replace("join_", "");

    for (const r in group.members)
      group.members[r] = group.members[r].filter(u => u.id !== user.id);

    group.members[role].push(user);

    await i.update({
      embeds: [buildEmbed(group)],
      components: buildButtons(group)
    });

    saveGroups();
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
