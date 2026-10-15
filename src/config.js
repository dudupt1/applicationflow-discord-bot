import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  applicationCategoryId: process.env.APPLICATION_CATEGORY_ID || null,
  staffRoleId: process.env.STAFF_ROLE_ID || null,
  acceptedRoleId: process.env.ACCEPTED_ROLE_ID || null,
  applicationLogChannelId: process.env.APPLICATION_LOG_CHANNEL_ID || null,
};

export function requireRuntimeConfig() {
  if (!config.token) throw new Error('DISCORD_TOKEN is missing. Create .env from .env.example.');
}

export function requireDeployConfig() {
  const missing = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}
