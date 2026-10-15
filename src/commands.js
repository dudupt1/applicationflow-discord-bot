import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('applications')
    .setDescription('Publish and manage structured community applications.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('panel')
        .setDescription('Publish an application panel.')
        .addStringOption((option) => option.setName('position').setDescription('Role or opportunity members can apply for.').setMinLength(3).setMaxLength(80).setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName('stats').setDescription('View application workload and decisions.')),
].map((command) => command.toJSON());
