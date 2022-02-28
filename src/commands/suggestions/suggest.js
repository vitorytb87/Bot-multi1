const { MessageEmbed, Message, CommandInteraction, MessageActionRow, MessageButton } = require("discord.js");
const { Command } = require("@src/structures");
const { SUGGESTIONS } = require("@root/config");
const { addSuggestion } = require("@schemas/Suggestions");
const { stripIndent } = require("common-tags");

module.exports = class Suggest extends Command {
  constructor(client) {
    super(client, {
      name: "suggest",
      description: "create a suggestion",
      category: "SUGGESTION",
      command: {
        enabled: true,
        usage: "<suggestion>",
        minArgsCount: 1,
      },
      slashCommand: {
        enabled: true,
        options: [
          {
            name: "suggestion",
            description: "the suggestion",
            type: "STRING",
            required: true,
          },
        ],
      },
    });
  }

  /**
   * @param {Message} message
   * @param {string[]} args
   * @param {object} data
   */
  async messageRun(message, args, data) {
    const suggestion = args.join(" ");
    const response = await suggest(message.member, suggestion, data.settings);
    if (typeof response === "boolean") return message.safeReply("Your suggestion has been submitted!", 5);
    else await message.safeReply(response);
  }

  /**
   * @param {CommandInteraction} interaction
   * @param {object} data
   */
  async interactionRun(interaction, data) {
    const suggestion = interaction.args.join(" ");
    const response = await suggest(interaction.member, suggestion, data.settings);
    if (typeof response === "boolean") interaction.deferReply("Your suggestion has been submitted!");
    else await interaction.deferReply(response);
  }
};

async function suggest(member, suggestion, settings) {
  if (!settings.suggestions.channel_id) return "Suggestions are disabled in this server! Channel not configured!";
  const channel = member.guild.channels.cache.get(settings.suggestions.channel_id);
  if (!channel) return "Suggestions are disabled in this server! Channel not found!";

  const embed = new MessageEmbed()
    .setAuthor({ name: "New Suggestion" })
    .setThumbnail(member.user.avatarURL())
    .setColor(SUGGESTIONS.DEFAULT_EMBED)
    .setDescription(
      stripIndent`
        **Submitter** 
        ${member.user.tag} [${member.id}]
        
        **Suggestion**
        ${suggestion}
      `
    )
    .setTimestamp();

  let buttonsRow = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("SUGGEST_APPROVE").setLabel("Approve").setStyle("SUCCESS"),
    new MessageButton().setCustomId("SUGGEST_REJECT").setLabel("Reject").setStyle("DANGER")
  );

  try {
    const sentMsg = await channel.send({
      embeds: [embed],
      components: [buttonsRow],
    });

    await sentMsg.react(SUGGESTIONS.EMOJI.UP_VOTE);
    await sentMsg.react(SUGGESTIONS.EMOJI.DOWN_VOTE);

    await addSuggestion(sentMsg, member.id, suggestion);

    return true;
  } catch (ex) {
    member.client.logger.error("suggest", ex);
    return "Failed to send message to suggestions channel!";
  }
}
