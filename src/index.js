import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config, requireRuntimeConfig } from './config.js';
import {
  isApplicationButton,
  isApplicationModal,
  publishPanel,
  reviewApplication,
  showApplicationModal,
  showStats,
  submitApplication,
} from './features/applications.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function replyWithError(interaction) {
  const message = 'ApplicationFlow could not complete that action. Please try again.';
  if (interaction.deferred) await interaction.editReply({ content: message }).catch(() => null);
  else if (interaction.replied) await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
  else await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`ApplicationFlow is online as ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.inGuild()) {
      if (interaction.isRepliable()) await interaction.reply({ content: 'ApplicationFlow can only be used inside Discord servers.', ephemeral: true });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'applications') {
      if (interaction.options.getSubcommand() === 'panel') await publishPanel(interaction);
      else await showStats(interaction);
      return;
    }

    if (interaction.isButton() && isApplicationButton(interaction)) {
      const action = interaction.customId.split(':')[1];
      if (action === 'start') await showApplicationModal(interaction);
      else await reviewApplication(interaction);
      return;
    }

    if (interaction.isModalSubmit() && isApplicationModal(interaction)) {
      await submitApplication(interaction);
    }
  } catch (error) {
    console.error('Interaction error:', error);
    await replyWithError(interaction);
  }
});

try {
  requireRuntimeConfig();
  client.login(config.token);
} catch (error) {
  console.error(`ApplicationFlow could not start: ${error.message}`);
  process.exitCode = 1;
}
