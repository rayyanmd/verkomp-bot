import { getCommands } from "../src/commands";

const { DISCORD_APP_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
  throw new Error(
    "Isi DISCORD_APP_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID di .dev.vars",
  );
}

(async () => {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/guilds/${DISCORD_GUILD_ID}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getCommands()),
    },
  );
  console.log(res.status, await res.text());
})();
