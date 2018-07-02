const Discord = require('discord.js');
const request = require('request');
const cheerio = require('cheerio');
const ytdl = require('ytdl-core');
const fs = require('fs');

// Import config.json Setting
console.log('Loading config.json');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

// Discord Bot Connect
const client = new Discord.Client();

client.login(config.Api.DiscordToken);
client.on('ready', () => {
  client.user.setPresence({
    game: config.Setting.AccountStatus
  });
  let filePath = './data';
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
  }
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

// When user input message
client.on('message', message => {
  const command = message.content.toLowerCase();
  // Play url Command
  if (command.startsWith(config.Setting.Prefix + config.Command.Play + ' ')) {
    if (message.member.voiceChannel) {
      message.member.voiceChannel.join()
        .then(connection => {
          let url = message.content.split(' ').slice(1).toString();

          if (url.startsWith('https://www.youtube.com/playlist?list=')) {
            addPlaylist(url, message);
          } else if (ytdl.validateURL(url)) {
            addSound(url, message);
          } else {
            message.reply('未知的來源');
          }

        });
    } else {
      message.reply(config.Message.PleaseJoinChannel);
    }
  }

  // Play & Resume
  else if (command === config.Setting.Prefix + config.Command.Play) {
    if (message.member.voiceChannel) {
      message.member.voiceChannel.join();
      if (!message.guild.voiceConnection.dispatcher) {
        playSound(message);
      } else if (message.guild.voiceConnection.dispatcher.paused) {
        message.guild.voiceConnection.dispatcher.resume();
      }
    } else {
      message.reply(config.Message.PleaseJoinChannel);
    }
  }

  // Stop Command
  else if (command === config.Setting.Prefix + config.Command.Stop) {
    if (message.member.voiceChannel) {
      if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
        message.guild.voiceConnection.dispatcher.end('stop');
        message.reply('停止音樂');
      }
    } else {
      message.reply(config.Message.PleaseJoinChannel);
    }
  }

  // Skip Command
  else if (command === config.Setting.Prefix + config.Command.Skip) {
    if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
      message.guild.voiceConnection.dispatcher.end();
      message.reply('切歌');
    } else {
      message.reply(config.Message.PleaseJoinChannel);
    }
  }

  // Pause Command
  else if (command === config.Setting.Prefix + config.Command.Pause) {
    if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
      message.guild.voiceConnection.dispatcher.pause();
      message.reply('暫停音樂');
    } else {
      message.reply(config.Message.PleaseJoinChannel);
    }
  }

  // Now Playing Command
  else if (command === config.Setting.Prefix + config.Command.Nowplaying) {
    var filePath = './data/' + message.guild.id + '.json';
    fs.readFile(filePath, 'utf8', (err, data) => {
      try {
        var json = JSON.parse(data);
        if (json.length > 0) {
          const embed = new Discord.RichEmbed()
          .setTitle(json[0][1])
          .setURL('https://www.youtube.com/watch?v=' + json[0][0])
          .setAuthor('正在播放')
          .setFooter(config.Setting.BotName)
          .setTimestamp()
          .setColor(0x00AE86);
          message.channel.send(embed);
        }
      } catch (e) {
        console.log(e);
      }
    });
  }

  // Queue Command
  else if (command === config.Setting.Prefix + config.Command.Queue) {
    var filePath = './data/' + message.guild.id + '.json';
    fs.readFile(filePath, 'utf8', (err, data) => {
      try {
        var json = JSON.parse(data);
        if (json.length > 0) {
          const embed = new Discord.RichEmbed()
          .setAuthor('播放佇列')
          .setFooter(config.Setting.BotName)
          .setTimestamp()
          .setColor(0x00AE86);
          for (i=0;i<json.length&&i<25;i++) {
            embed.addField(json[i][1], 'https://www.youtube.com/watch?v=' + json[i][0], true);
          }

          message.channel.send(embed);
        } else {
          const embed = new Discord.RichEmbed()
          .setAuthor('播放佇列')
          .setTitle('沒有歌曲')
          .setFooter(config.Setting.BotName)
          .setTimestamp()
          .setColor(0x00AE86);
          message.channel.send(embed);
        }
      } catch (e) {
        console.log(e);
      }
    });
  }

  // Help Command
  else if (command === config.Setting.Prefix + config.Command.Help) {
    const embed = new Discord.RichEmbed()
    .setAuthor('指令說明')
    .setFooter(config.Setting.BotName)
    .setTimestamp()
    .setColor(0x00AE86);
    var cmds = '';
    for(var cmd in config.Command) {
      cmds += config.Setting.Prefix + config.Command[cmd] + '\n';
    }
    embed.setDescription(cmds);
    message.channel.send(embed);
  }
});

function arrayShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function addPlaylist(url, message) {

  var embed = new Discord.RichEmbed()
  .setTitle('讀取中...')
  .setAuthor('正在讀取')
  .setFooter(config.Setting.BotName)
  .setTimestamp()
  .setColor(0x00AE86);

  message.channel.send(embed).then(msg => {
    request(url, (error, response, body) => {
      var filePath = './data/' + message.guild.id + '.json';
      fs.readFile(filePath, 'utf8', (err, data) => {
        var json = JSON.parse(data);
        var tmp = new Array();
        var $ = cheerio.load(body);
        var tr = $('#pl-load-more-destination tr').each((index, element) => {
          let videoID = $(element).attr('data-video-id');
          let videoTitle = $(element).attr('data-title');
          tmp.push(new Array(videoID, videoTitle));
        });

        if (config.Setting.ShufflePlaylist) {
          arrayShuffle(tmp);
        }

        json = json.concat(tmp);

        fs.writeFile(filePath, JSON.stringify(json), (err) => {
          if (err) throw err;
          const embed = new Discord.RichEmbed()
          .setTitle(':white_check_mark: 讀取完成')
          .setAuthor('新增 ' + tr.length + ' 首歌曲至播放清單')
          .setFooter(config.Setting.BotName)
          .setTimestamp()
          .setColor(0x00AE86);
          msg.edit(embed);

          if(!message.guild.voiceConnection.dispatcher) {
            if (json.length > tr.length) {
              message.reply('佇列中尚有待播放的音樂，請輸入 ' + config.Setting.Prefix + 'play 進行播放');
            } else {
              playSound(message);
            }
          }

        });
      });
    });
  });
}

function addSound(url, message) {
  var filePath = './data/' + message.guild.id + '.json';
  var videoID = ytdl.getURLVideoID(url);
  ytdl.getInfo(videoID, (err, info) => {
    var videoTitle = info.title;
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        var json = new Array(new Array(videoID, videoTitle));
      }
      else {
        var json = JSON.parse(data);
        json.push(new Array(videoID, videoTitle));

        const embed = new Discord.RichEmbed()
        .setTitle(':white_check_mark: ' + info.title)
        .setURL(info.video_url)
        .setAuthor('已加到佇列')
        .setFooter(config.Setting.BotName)
        .setTimestamp()
        .setColor(0x00AE86);
        message.channel.send(embed);
      }

      fs.writeFile(filePath, JSON.stringify(json), (err) => {
        if (err) throw err;
        if(!message.guild.voiceConnection.dispatcher) {
          playSound(message);
        }
      });
    });
  });
}

function playSound(message) {
  var filePath = './data/' + message.guild.id + '.json';

  fs.readFile(filePath, 'utf8', (err, data) => {
    var json = JSON.parse(data);

    if (json.length > 0) {
      const embed = new Discord.RichEmbed()
      .setTitle(json[0][1])
      .setURL('https://www.youtube.com/watch?v=' + json[0][0])
      .setAuthor('正在播放')
      .setFooter(config.Setting.BotName)
      .setTimestamp()
      .setColor(0x00AE86);
      message.channel.send(embed);

      var stream = ytdl('https://www.youtube.com/watch?v=' + json[0][0], {filter: 'audio'});
      var dispatcher = message.guild.voiceConnection.playStream(stream, {
        passes: 2,
        bitrate: 'auto'
      });

      dispatcher.once('end', (reason) => {
        if (reason === 'stop') {
          message.guild.voiceConnection.disconnect();
          var json = new Array();
          fs.writeFile(filePath, JSON.stringify(json), (err) => {
            if (err) throw err;
          });
        } else {
          fs.readFile(filePath, 'utf8', (err, data) => {
            var json = JSON.parse(data);
            json.shift();
            fs.writeFile(filePath, JSON.stringify(json), (err) => {
              if (err) throw err;
              if (json.length > 0) {
                setImmediate(() => {
                  playSound(message);
                });
              } else {
                message.guild.voiceConnection.disconnect();
              }
            });
          });
        }
      });
    }
  });
}
