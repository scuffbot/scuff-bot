import { createAudioPlayer, createAudioResource, AudioPlayerStatus, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus, entersState, getVoiceConnection } from '@discordjs/voice';
import playDl from 'play-dl';
import { generateDependencyReport } from '@discordjs/voice';

class MusicPlayer {
  constructor() {
    this.queues = new Map();
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        connection: null,
        player: null,
        songs: [],
        currentIndex: 0,
        playing: false,
        loop: false,
      });
    }
    return this.queues.get(guildId);
  }

  async join(channel) {
    const queue = this.getQueue(channel.guild.id);
    
    console.log('Voice dependency report:', generateDependencyReport());
    console.log(`Attempting to join voice channel: ${channel.name} (${channel.id})`);
    
    const existingConnection = getVoiceConnection(channel.guild.id);
    if (existingConnection) {
      console.log('Destroying existing connection...');
      existingConnection.destroy();
    }
    
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`Voice connection state: ${oldState.status} -> ${newState.status}`);
    });

    connection.on('error', error => {
      console.error('Voice connection error:', error);
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 60_000);
      console.log('Voice connection established successfully');
    } catch (error) {
      console.error('Voice connection failed:', error);
      connection.destroy();
      throw new Error('Failed to connect to voice channel - this may be due to network restrictions in the hosting environment');
    }

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      this.handleSongEnd(channel.guild.id);
    });

    player.on('error', error => {
      console.error('Audio player error:', error);
      this.handleSongEnd(channel.guild.id);
    });

    queue.connection = connection;
    queue.player = player;

    return queue;
  }

  async addSong(guildId, url, requestedBy) {
    const queue = this.getQueue(guildId);
    
    try {
      let songInfo;
      
      if (playDl.yt_validate(url) === 'video') {
        const info = await playDl.video_info(url);
        songInfo = {
          title: info.video_details.title,
          url: url,
          duration: info.video_details.durationInSec,
          thumbnail: info.video_details.thumbnails[0]?.url,
          requestedBy: requestedBy,
        };
      } else if (playDl.sp_validate(url)) {
        if (await playDl.sp_validate(url) === 'track') {
          const sp = await playDl.spotify(url);
          const searched = await playDl.search(`${sp.name} ${sp.artists[0]?.name}`, { limit: 1 });
          if (searched.length > 0) {
            songInfo = {
              title: sp.name,
              url: searched[0].url,
              duration: searched[0].durationInSec,
              thumbnail: sp.thumbnail?.url,
              requestedBy: requestedBy,
            };
          }
        }
      } else {
        const searched = await playDl.search(url, { limit: 1 });
        if (searched.length > 0) {
          songInfo = {
            title: searched[0].title,
            url: searched[0].url,
            duration: searched[0].durationInSec,
            thumbnail: searched[0].thumbnails[0]?.url,
            requestedBy: requestedBy,
          };
        }
      }

      if (!songInfo) {
        throw new Error('Could not find the song');
      }

      queue.songs.push(songInfo);
      return songInfo;
    } catch (error) {
      console.error('Error adding song:', error);
      throw error;
    }
  }

  async play(guildId) {
    const queue = this.getQueue(guildId);
    
    if (!queue.player || !queue.connection) {
      throw new Error('Bot is not connected to a voice channel');
    }

    if (queue.songs.length === 0 || queue.currentIndex >= queue.songs.length) {
      queue.playing = false;
      return null;
    }

    const song = queue.songs[queue.currentIndex];
    
    try {
      const stream = await playDl.stream(song.url);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
      });

      queue.player.play(resource);
      queue.playing = true;

      return song;
    } catch (error) {
      console.error('Error playing song:', error);
      this.handleSongEnd(guildId);
      throw error;
    }
  }

  handleSongEnd(guildId) {
    const queue = this.getQueue(guildId);
    
    if (queue.loop) {
      this.play(guildId);
    } else {
      queue.currentIndex++;
      if (queue.currentIndex < queue.songs.length) {
        this.play(guildId);
      } else {
        queue.playing = false;
      }
    }
  }

  pause(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player) {
      queue.player.pause();
      queue.playing = false;
      return true;
    }
    return false;
  }

  resume(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player) {
      queue.player.unpause();
      queue.playing = true;
      return true;
    }
    return false;
  }

  stop(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player) {
      queue.player.stop();
      queue.songs = [];
      queue.currentIndex = 0;
      queue.playing = false;
      return true;
    }
    return false;
  }

  skip(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player && queue.songs.length > queue.currentIndex + 1) {
      queue.currentIndex++;
      this.play(guildId);
      return queue.songs[queue.currentIndex];
    } else if (queue.player) {
      queue.player.stop();
      queue.playing = false;
      return null;
    }
    return null;
  }

  skipBack(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player && queue.currentIndex > 0) {
      queue.currentIndex--;
      this.play(guildId);
      return queue.songs[queue.currentIndex];
    }
    return null;
  }

  reload(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.player && queue.songs.length > 0) {
      this.play(guildId);
      return queue.songs[queue.currentIndex];
    }
    return null;
  }

  getCurrentSong(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.songs.length > 0 && queue.currentIndex < queue.songs.length) {
      return queue.songs[queue.currentIndex];
    }
    return null;
  }

  getQueueInfo(guildId) {
    const queue = this.getQueue(guildId);
    return {
      songs: queue.songs,
      currentIndex: queue.currentIndex,
      playing: queue.playing,
    };
  }

  disconnect(guildId) {
    const queue = this.getQueue(guildId);
    if (queue.connection) {
      queue.connection.destroy();
      this.queues.delete(guildId);
      return true;
    }
    return false;
  }
}

export const musicPlayer = new MusicPlayer();
