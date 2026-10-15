import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { mutate, snapshot } from '../storage.js';

const PREFIX = 'appflow';
const statusStyle = {
  pending: { label: 'Awaiting staff review', emoji: '🟡', color: 0xfee75c },
  accepted: { label: 'Accepted', emoji: '✅', color: 0x57f287 },
  rejected: { label: 'Rejected', emoji: '⛔', color: 0xed4245 },
};

function shortId() {
  return randomUUID().split('-')[0];
}

function isStaff(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) || (config.staffRoleId && interaction.member?.roles?.cache?.has(config.staffRoleId));
}

function applicationsForGuild(data, guildId) {
  return Object.values(data.applications).filter((application) => application.guildId === guildId);
}

function reviewEmbed(application) {
  const status = statusStyle[application.status] ?? statusStyle.pending;
  const fields = [
    { name: 'Applicant', value: `<@${application.applicantId}>`, inline: true },
    { name: 'Position', value: application.position, inline: true },
    { name: 'Status', value: `${status.emoji} ${status.label}`, inline: true },
    { name: 'Experience', value: application.experience, inline: false },
    { name: 'Availability', value: application.availability, inline: false },
    { name: 'Why should we choose you?', value: application.motivation, inline: false },
  ];

  if (application.reviewedBy) fields.push({ name: 'Reviewed by', value: `<@${application.reviewedBy}>`, inline: true });

  return new EmbedBuilder()
    .setColor(status.color)
    .setTitle(`${application.position} application`)
    .addFields(fields)
    .setFooter({ text: `Application ID: ${application.id}` })
    .setTimestamp(new Date(application.createdAt));
}

function reviewControls(application) {
  const locked = application.status !== 'pending';
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}:accept:${application.id}`).setLabel('Accept').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(locked),
      new ButtonBuilder().setCustomId(`${PREFIX}:reject:${application.id}`).setLabel('Reject').setEmoji('⛔').setStyle(ButtonStyle.Danger).setDisabled(locked),
    ),
  ];
}

async function validCategory(guild) {
  if (!config.applicationCategoryId) return undefined;
  const category = await guild.channels.fetch(config.applicationCategoryId).catch(() => null);
  return category?.type === ChannelType.GuildCategory ? category.id : undefined;
}

async function sendLog(guild, application) {
  if (!config.applicationLogChannelId) return;
  const channel = await guild.channels.fetch(config.applicationLogChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const status = statusStyle[application.status];
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(status.color)
        .setTitle(`Application ${application.status}`)
        .setDescription(`<@${application.applicantId}> was ${application.status} for **${application.position}**.`)
        .addFields({ name: 'Reviewed by', value: `<@${application.reviewedBy}>`, inline: true })
        .setTimestamp(),
    ],
  });
}

export function isApplicationButton(interaction) {
  return interaction.customId?.startsWith(`${PREFIX}:`);
}

export function isApplicationModal(interaction) {
  return interaction.customId?.startsWith(`${PREFIX}:modal:`);
}

export async function publishPanel(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You need Manage Server to publish an application panel.', ephemeral: true });
    return;
  }

  const position = interaction.options.getString('position', true).trim();
  const panelId = shortId();
  mutate((data) => {
    data.panels[panelId] = { id: panelId, position, guildId: interaction.guildId, createdBy: interaction.user.id, createdAt: new Date().toISOString() };
  });

  const startButton = new ButtonBuilder().setCustomId(`${PREFIX}:start:${panelId}`).setLabel(`Apply for ${position}`).setEmoji('📝').setStyle(ButtonStyle.Primary);
  await interaction.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${position} applications`)
        .setDescription('Use the button below to submit a structured application. Your answers are sent to staff in a private review channel.')
        .setFooter({ text: 'ApplicationFlow • Complete every question honestly.' }),
    ],
    components: [new ActionRowBuilder().addComponents(startButton)],
  });
  await interaction.reply({ content: 'Application panel published.', ephemeral: true });
}

export async function showApplicationModal(interaction) {
  const panelId = interaction.customId.split(':')[2];
  const panel = snapshot().panels[panelId];
  if (!panel || panel.guildId !== interaction.guildId) {
    await interaction.reply({ content: 'This application panel is no longer active.', ephemeral: true });
    return;
  }

  const existing = applicationsForGuild(snapshot(), interaction.guildId).find((application) => application.applicantId === interaction.user.id && application.position === panel.position && application.status === 'pending');
  if (existing) {
    await interaction.reply({ content: `You already have a pending application: <#${existing.channelId}>`, ephemeral: true });
    return;
  }

  const modal = new ModalBuilder().setCustomId(`${PREFIX}:modal:${panelId}`).setTitle(`${panel.position} application`);
  const experience = new TextInputBuilder().setCustomId('experience').setLabel('Relevant experience').setStyle(TextInputStyle.Paragraph).setMinLength(10).setMaxLength(700).setRequired(true);
  const availability = new TextInputBuilder().setCustomId('availability').setLabel('Availability / time zone').setStyle(TextInputStyle.Short).setMinLength(4).setMaxLength(200).setRequired(true);
  const motivation = new TextInputBuilder().setCustomId('motivation').setLabel('Why should we choose you?').setStyle(TextInputStyle.Paragraph).setMinLength(15).setMaxLength(700).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(experience), new ActionRowBuilder().addComponents(availability), new ActionRowBuilder().addComponents(motivation));
  await interaction.showModal(modal);
}

export async function submitApplication(interaction) {
  const panelId = interaction.customId.split(':')[2];
  const panel = snapshot().panels[panelId];
  if (!panel || panel.guildId !== interaction.guildId) {
    await interaction.reply({ content: 'This application panel is no longer active.', ephemeral: true });
    return;
  }

  const existing = applicationsForGuild(snapshot(), interaction.guildId).find((application) => application.applicantId === interaction.user.id && application.position === panel.position && application.status === 'pending');
  if (existing) {
    await interaction.reply({ content: `You already have a pending application: <#${existing.channelId}>`, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const application = {
    id: shortId(),
    guildId: interaction.guildId,
    applicantId: interaction.user.id,
    position: panel.position,
    experience: interaction.fields.getTextInputValue('experience').trim(),
    availability: interaction.fields.getTextInputValue('availability').trim(),
    motivation: interaction.fields.getTextInputValue('motivation').trim(),
    status: 'pending',
    channelId: null,
    messageId: null,
    createdAt: new Date().toISOString(),
  };

  const permissions = [
    { id: interaction.guildId, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
  ];
  if (config.staffRoleId) permissions.push({ id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  const channel = await interaction.guild.channels.create({
    name: `application-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'member'}`,
    type: ChannelType.GuildText,
    parent: await validCategory(interaction.guild),
    topic: `ApplicationFlow | Applicant: ${interaction.user.id} | Position: ${panel.position}`,
    permissionOverwrites: permissions,
  });

  application.channelId = channel.id;
  const review = await channel.send({
    content: `${interaction.user}${config.staffRoleId ? ` <@&${config.staffRoleId}>` : ''}`,
    embeds: [reviewEmbed(application)],
    components: reviewControls(application),
  });
  application.messageId = review.id;
  mutate((data) => {
    data.applications[application.id] = application;
  });

  await interaction.editReply(`Your application was submitted for staff review: ${channel}`);
}

export async function reviewApplication(interaction) {
  const [, decision, applicationId] = interaction.customId.split(':');
  const application = snapshot().applications[applicationId];
  if (!application || application.channelId !== interaction.channelId || application.messageId !== interaction.message.id) {
    await interaction.reply({ content: 'This application review is no longer active.', ephemeral: true });
    return;
  }
  if (!isStaff(interaction)) {
    await interaction.reply({ content: 'Only staff can review applications.', ephemeral: true });
    return;
  }
  if (application.status !== 'pending') {
    await interaction.reply({ content: 'This application has already been reviewed.', ephemeral: true });
    return;
  }

  let updated;
  mutate((data) => {
    updated = data.applications[applicationId];
    updated.status = decision === 'accept' ? 'accepted' : 'rejected';
    updated.reviewedBy = interaction.user.id;
    updated.reviewedAt = new Date().toISOString();
  });

  let roleMessage = '';
  if (updated.status === 'accepted' && config.acceptedRoleId) {
    const member = await interaction.guild.members.fetch(updated.applicantId).catch(() => null);
    if (member) {
      const result = await member.roles.add(config.acceptedRoleId, 'ApplicationFlow accepted application').then(() => true).catch(() => false);
      roleMessage = result ? ' The accepted role was assigned.' : ' The decision was saved, but the accepted role could not be assigned.';
    }
  }

  await interaction.update({ embeds: [reviewEmbed(updated)], components: reviewControls(updated) });
  await interaction.channel.send(`${updated.status === 'accepted' ? '✅' : '⛔'} <@${updated.applicantId}>, your application for **${updated.position}** was **${updated.status}**.${roleMessage}`);
  await sendLog(interaction.guild, updated);
}

export async function showStats(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: 'You need Manage Server to view application statistics.', ephemeral: true });
    return;
  }

  const applications = applicationsForGuild(snapshot(), interaction.guildId);
  const pending = applications.filter((application) => application.status === 'pending').length;
  const accepted = applications.filter((application) => application.status === 'accepted').length;
  const rejected = applications.filter((application) => application.status === 'rejected').length;
  const reviewed = accepted + rejected;
  const acceptanceRate = reviewed ? Math.round((accepted / reviewed) * 100) : 0;

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('ApplicationFlow workload')
        .addFields(
          { name: 'Pending', value: String(pending), inline: true },
          { name: 'Accepted', value: String(accepted), inline: true },
          { name: 'Rejected', value: String(rejected), inline: true },
          { name: 'Acceptance rate', value: `${acceptanceRate}%`, inline: true },
        )
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}
