const Discord = require('discord.js');
exports.run = async(client, msg, args, lang) => {
	const config = require('../../settings.json');
	const { Client, Util } = require('discord.js');
	const YouTube = require('simple-youtube-api');
	const youtube = new YouTube(config.googlekey);
	const queue = client.queue;
	const skipvote = client.skipvote;
	const input = msg.content.split(' ');
	const ytdl = require('ytdl-core');
	if (msg.author.bot) return undefined;
	const searchString = input.slice(1).join(' ');
	const url = input[1] ? input[1].replace(/<(.+)>/g, '$1') : '';


	const voiceChannel = msg.member.voiceChannel;
	if (!voiceChannel) return msg.channel.send(lang.play_notvoicechannel);
	const permissions = voiceChannel.permissionsFor(msg.client.user);
	if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
		const playlist = await youtube.getPlaylist(url);
		const videos = await playlist.getVideos();
		for (const video of Object.values(videos)) {
			const video2 = await youtube.getVideoByID(video.id);
			await handleVideo(video2, msg, voiceChannel, true);
		}
		var playlistadded = lang.play_playlistadded.replace('%playlisttitle', `**${playlist.title}**`);
		return msg.channel.send(playlistadded);
	} else {
		try {
			var video = await youtube.getVideo(url);
		} catch (error) {
			try {
				var videos = await youtube.searchVideos(searchString, 10);
				let index = 0;
				const embed = new Discord.RichEmbed()
				.setColor('#7BB3FF')
				.setDescription(`${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}`)
				.setAuthor(lang.play_songselection, 'https://cdn.discordapp.com/attachments/355972323590930432/357097120580501504/unnamed.jpg');

				const embed2 = new Discord.RichEmbed()
				.setColor('#0066CC')
				.setDescription(lang.play_value);
				msg.channel.send({ embed });
				msg.channel.send({ embed: embed2 });
				try {
					var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11 && msg.author.id === msg2.author.id, {
						maxMatches: 1,
						time: 10000,
						errors: ['time']
					});
				} catch (err) {
					return msg.channel.send(lang.play_error);
				}
				const videoIndex = parseInt(response.first().content);
				var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
			} catch (err) {
				return msg.channel.send(lang.play_noresult);
			}
		}
		return handleVideo(video, msg, voiceChannel);
	}
	async function handleVideo(video, msg, voiceChannel, playlist = false) {
			const serverQueue = queue.get(msg.guild.id);
			const song = {
				id: video.id,
				title: Util.escapeMarkdown(video.title),
				url: `https://www.youtube.com/watch?v=${video.id}`
			};
			if (!serverQueue) {
				const queueConstruct = {
					textChannel: msg.channel,
					voiceChannel: voiceChannel,
					connection: null,
					songs: [],
					volume: 5,
					playing: true
				};
				await queue.set(msg.guild.id, queueConstruct);

				queueConstruct.songs.push(song);

				const vote = {
					users: []
				};

				skipvote.set(msg.guild.id, vote);

				try {
					var connection = await voiceChannel.join();
					queueConstruct.connection = connection;
					await play(msg.guild, queueConstruct.songs[0]);
				} catch (error) {
					queue.delete(msg.guild.id);
					skipvote.delete(msg.guild.id);
					return msg.channel.send(lang.play_errorjoin);
				}
			} else {
				await serverQueue.songs.push(song);
				if (playlist) return undefined;
				else {
					var songadded = lang.play_songadded.replace('%songtitle', `**${song.title}**`);
					return msg.channel.send(songadded);
				}
			}
			return undefined;
		}

		function play(guild, song) {
			const serverQueue = queue.get(guild.id);
		
			if (!song) {
				serverQueue.voiceChannel.leave();
				queue.delete(guild.id);
				return undefined;
			}
			const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
				.on('end', async reason => {
					if (reason === 'Stream is not generating quickly enough.');
					await serverQueue.songs.shift('Stream is not generating quickly enough');
					await play(guild, serverQueue.songs[0]);
				})
				.on('error', error => console.error(error));
			dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

			const vote = {
				users: []
			};
			skipvote.set(msg.guild.id, vote);

			var startplaying = lang.play_startplaying.replace('%songtitle', `**${song.title}**`);
			serverQueue.textChannel.send(startplaying);
		}
};

exports.conf = {
	enabled: true,
	guildOnly: false,
	aliases: [],
    userpermissions: []
};

exports.help = {
	name: 'play',
	description: 'Searches for music that matches to your request',
	usage: 'play {query}',
	example: ['play Gangnam Style'],
	category: 'music',
    botpermissions: ['SEND_MESSAGES', 'CONNECT', 'SPEAK']
};
