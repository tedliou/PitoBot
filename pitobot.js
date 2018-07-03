const Discord = require('discord.js');
const request = require('request');
const cheerio = require('cheerio');
const ytdl = require('ytdl-core');
const fs = require('fs');

// Loading config.json Setting
console.log('Loading config.json');
var config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

// Loading Locale Languaue filePath
console.log('Loading ' + config.Setting.Languaue + '.json');
var lang = JSON.parse(fs.readFileSync('./locales/' + config.Setting.Languaue + '.json', 'utf-8'));

// Discord Bot Connect
var client = new Discord.Client();

// tmp
var tmp_playlist = new Array();

client.login(config.Api.DiscordToken);
client.on('ready', () => {
  client.user.setPresence({
    game: config.Setting.Status
  });
  let filePath = './data';
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
  }
  client.guilds.array().forEach((index) => {
    tmp_playlist[index.id] = new Array();
  });
  console.log('Done！');
});

// When change server region
client.on('guildUpdate', (oldGuild, newGuild) => {
  if (newGuild.voiceConnection && oldGuild.region != newGuild.region) {
    newGuild.voiceConnection.dispatcher.pause();

    newGuild.voiceConnection.once('reconnecting', () => {
      newGuild.voiceConnection.channel.join();
    });

    newGuild.voiceConnection.once('ready', () => {
      newGuild.voiceConnection.dispatcher.resume();
    });
  }
});

// When join a Server
client.on('guildCreate', (guild) => {
  tmp_playlist[guild.id] = new Array();
});

// When leave a Server
client.on('guildDelete', (guild) => {
  delete tmp_playlist[guild.id];
});

// When user input message
client.on('message', message => {

  if (message.content.startsWith(config.CommandPrefix)) {
    const command = message.content.toLowerCase();

    // Play url Command
    if (command.startsWith(config.CommandPrefix + config.Command.Play + ' ')) {
      cmd_play(message);
    }

    // Play & Resume
    else if (command === config.CommandPrefix + config.Command.Play) {
      cmd_resume(message);
    }

    // Stop Command
    else if (command === config.CommandPrefix + config.Command.Stop) {
      cmd_stop(message);
    }

    // Skip Command
    else if (command === config.CommandPrefix + config.Command.Skip) {
      cmd_skip(message);
    }

    // Pause Command
    else if (command === config.CommandPrefix + config.Command.Pause) {
      cmd_pause(message);
    }

    // Now Playing Command
    else if (command === config.CommandPrefix + config.Command.Nowplaying) {
      cmd_np(message);
    }

    // Queue Command
    else if (command === config.CommandPrefix + config.Command.Queue) {
      cmd_queue(message);
    }

    // Help Command
    else if (command === config.CommandPrefix + config.Command.Help) {
      cmd_help(message);
    }

    else if (command === config.CommandPrefix + config.Command.Reload) {
      cmd_reload(message);
    }
  }
});

async function arrayShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function addPlaylist(url, message) {

  var embed = new Discord.RichEmbed()
  .setAuthor(lang.LoadingPlaylist)
  .setTitle(lang.LoadingPlaylistTitle)
  .setFooter(config.Setting.Name)
  .setTimestamp()
  .setColor(0x00AE86);

  message.channel.send(embed).then(msg => {
    request(url, (error, response, body) => {
      var tmp_array = new Array();
      var $ = cheerio.load(body);
      var tr = $('#pl-load-more-destination tr').each((index, element) => {
        let videoTitle = $(element).attr('data-title');
        let videoID = $(element).attr('data-video-id');
        let videoTime = $(element).find('.timestamp span').text();
        tmp_array.push(new Array(videoTitle, videoID, videoTime));
      });

      if (config.Setting.Shuffle) {
        arrayShuffle(tmp_array);
      }

      tmp_playlist[message.guild.id] = tmp_playlist[message.guild.id].concat(tmp_array);

      const embed = new Discord.RichEmbed()
      .setAuthor((lang.AddPlaylist).replace('%count%', tr.length))
      .setTitle(lang.AddPlaylistTitle)
      .setFooter(config.Setting.Name)
      .setTimestamp()
      .setColor(0x00AE86);
      msg.edit(embed);

      if(!message.guild.voiceConnection.dispatcher) {
        playSound(message);
      }
    });
  });
}

async function addSound(url, message) {
  ytdl.getInfo(url, (err, info) => {
    var videoTitle = info.title;
    var videoID = info.video_id;
    var videoURL = info.video_url;
    var time = info.length_seconds;

    if (time < 3600) {
      var videoTime = Math.floor(time / 60) % 60 + ':' + Math.floor(time - (Math.floor(time / 60) % 60) * 60);
    } else {
      var videoTime = Math.floor(time / 60 / 60) + ':' + Math.floor(time / 60) % 60 + ':' + Math.floor(time - (Math.floor(time / 60) % 60) * 60);
    }

    tmp_playlist[message.guild.id].push(new Array(videoTitle, videoID, videoTime));

    const embed = new Discord.RichEmbed()
    .setAuthor(lang.AddSound)
    .setTitle((lang.AddSoundTitle).replace('%title%', videoTitle))
    .setURL(videoURL)
    .setDescription('[' + videoTime + ']')
    .setFooter(config.Setting.Name)
    .setTimestamp()
    .setColor(0x00AE86);
    message.channel.send(embed);

    if(!message.guild.voiceConnection.dispatcher) {
      playSound(message);
    }
  });
}

async function playSound(message) {
  if (tmp_playlist[message.guild.id].length > 0) {
    const embed = new Discord.RichEmbed()
    .setAuthor(lang.NowPlaying)
    .setTitle(tmp_playlist[message.guild.id][0][0])
    .setURL('https://www.youtube.com/watch?v=' + tmp_playlist[message.guild.id][0][1])
    .setDescription('[' + tmp_playlist[message.guild.id][0][2] + ']')
    .setFooter(config.Setting.Name)
    .setTimestamp()
    .setColor(0x00AE86);
    message.channel.send(embed);

    var stream = ytdl('https://www.youtube.com/watch?v=' + tmp_playlist[message.guild.id][0][1], {filter: 'audio'});
    var dispatcher = message.guild.voiceConnection.playStream(stream, {
      passes: config.Setting.Passes,
      bitrate: config.Setting.Bitrate
    });

    dispatcher.once('end', (reason) => {
      tmp_playlist[message.guild.id].shift();
      if (reason === 'stop') {
        message.guild.voiceConnection.disconnect();
        tmp_playlist[message.guild.id] = new Array();
      } else {
        if (tmp_playlist[message.guild.id].length > 0) {
          setImmediate(() => {
            playSound(message);
          });
        } else {
          message.guild.voiceConnection.disconnect();
        }
      }
    });
  }
}

async function cmd_play(message) {
  if (message.member.voiceChannel) {
    await message.member.voiceChannel.join();
    let url = message.content.split(' ').slice(1).toString();

    if (url.startsWith('https://www.youtube.com/playlist?list=')) {
      addPlaylist(url, message);
    } else if (ytdl.validateURL(url)) {
      addSound(url, message);
    } else {
      message.reply(lang.UnknownSource);
    }
  } else {
    message.reply(lang.PleaseJoinChannelFirst);
  }
}

async function cmd_resume(message) {
  if (message.member.voiceChannel) {
    if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher && message.guild.voiceConnection.dispatcher.paused) {
      message.guild.voiceConnection.dispatcher.resume();
      message.reply(lang.ResumeSound);
    }
  } else {
    message.reply(lang.PleaseJoinChannelFirst);
  }
}

async function cmd_stop(message) {
  if (message.member.voiceChannel) {
    if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
      await message.guild.voiceConnection.dispatcher.end('stop');
      message.reply(lang.StopSound);
    }
  } else {
    message.reply(lang.PleaseJoinChannelFirst);
  }
}

async function cmd_skip(message) {
  if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
    await message.guild.voiceConnection.dispatcher.end('skip');
    message.reply(lang.SkipSound);
  } else {
    message.reply(lang.PleaseJoinChannelFirst);
  }
}

async function cmd_pause(message) {
  if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
    await message.guild.voiceConnection.dispatcher.pause();
    message.reply(lang.PauseSound);
  } else {
    message.reply(lang.PleaseJoinChannelFirst);
  }
}

async function cmd_np(message) {
  const embed = new Discord.RichEmbed()
    .setAuthor(lang.NowPlaying)
    .setFooter(config.Setting.Name)
    .setTimestamp()
    .setColor(0x00AE86);
  if (tmp_playlist[message.guild.id].length > 0) {
    embed.setTitle(tmp_playlist[message.guild.id][0][0])
      .setURL('https://www.youtube.com/watch?v=' + tmp_playlist[message.guild.id][0][1])
      .setDescription('[' + tmp_playlist[message.guild.id][0][2] + ']');
  } else {
    embed.setTitle(lang.NowPlayingNothing);
  }
  message.channel.send(embed);
}

async function cmd_queue(message) {
  const embed = new Discord.RichEmbed()
    .setAuthor((lang.Queue).replace('%count%', tmp_playlist[message.guild.id].length - 1))
    .setFooter(config.Setting.Name)
    .setTimestamp()
    .setColor(0x00AE86);
  if (tmp_playlist[message.guild.id].length > 1) {
    for (i=1;i<tmp_playlist[message.guild.id].length&&i<11;i++) {
      embed.addField(tmp_playlist[message.guild.id][i][0] + '[' + tmp_playlist[message.guild.id][i][2] + ']', 'https://www.youtube.com/watch?v=' + tmp_playlist[message.guild.id][i][1], true);
    }
  } else {
    embed.setTitle(lang.QueueNothing);
  }
  message.channel.send(embed);
}

async function cmd_help(message) {
  const embed = new Discord.RichEmbed()
  .setAuthor(lang.Help)
  .setFooter(config.Setting.Name)
  .setTimestamp()
  .setColor(0x00AE86);
  var cmds = '';
  for(var cmd in config.Command) {
    cmds += config.CommandPrefix + config.Command[cmd] + '\n';
  }
  embed.setDescription(cmds);
  message.channel.send(embed);
}

async function cmd_reload(message) {
  var owner = config.Setting.Owner.split(' ');
  if (owner.includes(message.author.id)) {
    message.channel.send(lang.Restarting)
      .then(async(msg) => {
        if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
          await message.guild.voiceConnection.dispatcher.end('stop');
        }

        client.destroy();
        // Loading config.json Setting
        console.log('Reloading config.json');
        config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

        // Loading Locale Languaue filePath
        console.log('Reloading ' + config.Setting.Languaue + '.json');
        lang = JSON.parse(fs.readFileSync('./locales/' + config.Setting.Languaue + '.json', 'utf-8'));

        tmp_playlist = new Array();
      })
      .then(() => client.login(config.Api.DiscordToken));
  } else {
    message.reply(lang.NotOwner);
  }
}
