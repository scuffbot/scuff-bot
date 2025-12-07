import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { musicPlayer } from '../music/player.js';

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const musicCommands = [
  {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song from YouTube or Spotify')
      .addStringOption(option =>
        option.setName('query')
          .setDescription('YouTube/Spotify URL or search query')
          .setRequired(true)),
    async execute(interaction) {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: 'You need to be in a voice channel!', ephemeral: true });
      }

      await interaction.deferReply();

      try {
        const queue = musicPlayer.getQueue(interaction.guildId);
        if (!queue.connection) {
          await musicPlayer.join(voiceChannel);
        }

        const query = interaction.options.getString('query');
        const song = await musicPlayer.addSong(interaction.guildId, query, interaction.user.username);

        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('Added to Queue')
          .setDescription(`**${song.title}**`)
          .addFields(
            { name: 'Duration', value: formatDuration(song.duration), inline: true },
            { name: 'Requested by', value: song.requestedBy, inline: true }
          );

        if (song.thumbnail) {
          embed.setThumbnail(song.thumbnail);
        }

        await interaction.editReply({ embeds: [embed] });

        if (!queue.playing) {
          await musicPlayer.play(interaction.guildId);
        }
      } catch (error) {
        console.error('Play error:', error);
        await interaction.editReply({ content: `Error: ${error.message}` });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('pause')
      .setDescription('Pause the current song'),
    async execute(interaction) {
      const success = musicPlayer.pause(interaction.guildId);
      if (success) {
        await interaction.reply({ content: 'Paused the music.' });
      } else {
        await interaction.reply({ content: 'Nothing is playing!', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('resume')
      .setDescription('Resume the paused song'),
    async execute(interaction) {
      const success = musicPlayer.resume(interaction.guildId);
      if (success) {
        await interaction.reply({ content: 'Resumed the music.' });
      } else {
        await interaction.reply({ content: 'Nothing to resume!', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Stop the music and clear the queue'),
    async execute(interaction) {
      const success = musicPlayer.stop(interaction.guildId);
      if (success) {
        await interaction.reply({ content: 'Stopped the music and cleared the queue.' });
      } else {
        await interaction.reply({ content: 'Nothing is playing!', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Skip to the next song'),
    async execute(interaction) {
      const nextSong = musicPlayer.skip(interaction.guildId);
      if (nextSong) {
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('Now Playing')
          .setDescription(`**${nextSong.title}**`);
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ content: 'Skipped. No more songs in queue.' });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('skipback')
      .setDescription('Go back to the previous song'),
    async execute(interaction) {
      const prevSong = musicPlayer.skipBack(interaction.guildId);
      if (prevSong) {
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('Now Playing')
          .setDescription(`**${prevSong.title}**`);
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ content: 'No previous song to go back to!', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('reload')
      .setDescription('Restart the current song'),
    async execute(interaction) {
      const song = musicPlayer.reload(interaction.guildId);
      if (song) {
        await interaction.reply({ content: `Restarting: **${song.title}**` });
      } else {
        await interaction.reply({ content: 'Nothing to reload!', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('nowplaying')
      .setDescription('Show the currently playing song'),
    async execute(interaction) {
      const song = musicPlayer.getCurrentSong(interaction.guildId);
      if (song) {
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('Now Playing')
          .setDescription(`**${song.title}**`)
          .addFields(
            { name: 'Duration', value: formatDuration(song.duration), inline: true },
            { name: 'Requested by', value: song.requestedBy, inline: true }
          );
        if (song.thumbnail) {
          embed.setThumbnail(song.thumbnail);
        }
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ content: 'Nothing is playing!', ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('queue')
      .setDescription('Show the current music queue'),
    async execute(interaction) {
      const queueInfo = musicPlayer.getQueueInfo(interaction.guildId);
      if (queueInfo.songs.length === 0) {
        return interaction.reply({ content: 'The queue is empty!', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Music Queue')
        .setDescription(
          queueInfo.songs.map((song, index) => {
            const prefix = index === queueInfo.currentIndex ? '**> ' : '';
            const suffix = index === queueInfo.currentIndex ? ' <**' : '';
            return `${prefix}${index + 1}. ${song.title} [${formatDuration(song.duration)}]${suffix}`;
          }).join('\n')
        );

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName('disconnect')
      .setDescription('Disconnect the bot from voice channel'),
    async execute(interaction) {
      const success = musicPlayer.disconnect(interaction.guildId);
      if (success) {
        await interaction.reply({ content: 'Disconnected from voice channel.' });
      } else {
        await interaction.reply({ content: 'Not connected to a voice channel!', ephemeral: true });
      }
    },
  },
];
