const Discord = require('discord.js');
//const Google = require('googleapis');
const ytdl = require('ytdl-core');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');

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

function validURL(url) {
  if (url.startsWith('https://www.youtube.com/playlist?list=')) {
    return 1;
  } else if (ytdl.validateURL(url)) {
    return 2;
  } else {
    return 0;
  }
}

function addPlaylist(url, message) {


  request(url, (err, res, body) => {
    var $ = cheerio.load(body);
    var tr = $('#pl-load-more-destination tr');
    var filePath = './data/' + message.guild.id + '.json';

    const embed = new Discord.RichEmbed()
    .setTitle('讀取 ' + tr.length + ' 首歌曲 ...')
    .setAuthor('正在擷取播放清單')
    .setFooter('Pitohui Music Bot')
    .setTimestamp()
    .setColor(0x00AE86);
    message.channel.send(embed).then(msg => {
      if (config.Setting.MessageDelete.enable == true) {
        msg.delete(config.Setting.MessageDelete.delay * 1000);
      }


      fs.readFile(filePath, 'utf8', (err, data) => {
        try {
          var json = JSON.parse(data);

        } catch (e) {
          console.log(e);
          var json = new Array();
        }
        for (let i = 1; i < tr.length; i++) {
          let videoID = tr.eq(i).attr('data-video-id');
          let videoTitle = tr.eq(i).attr('data-title');
          json.push(new Array(videoID, videoTitle));
        }

        fs.writeFile(filePath, JSON.stringify(json), (err) => {
          if (err) throw err;

          const embed = new Discord.RichEmbed()
          .setTitle('讀取完成')
          .setAuthor('已加到佇列')
          .setFooter('Pitohui Music Bot')
          .setTimestamp()
          .setColor(0x00AE86);
          msg.edit(embed);
          /*message.channel.send(embed).then(msg => {
            if (config.Setting.MessageDelete.enable == true) {
              msg.delete(config.Setting.MessageDelete.delay * 1000);
            }
          });*/

          if(!message.guild.voiceConnection.dispatcher) {
            if (json.length > tr.length) {
              message.reply('佇列中尚有待播放的音樂，請輸入 ' + config.Setting.CommandPrefix + 'play 進行播放');
            } else {
              playSound(message);
            }
          }
        });
      });


    });


  });
}

// When user input message
client.on('message', message => {
  const command = message.content.toLowerCase();

  // Play url Command
  if (command.startsWith(config.Setting.CommandPrefix + 'play ')) {
    if (message.member.voiceChannel) {
      message.member.voiceChannel.join()
        .then(connection => {
          let url = message.content.split(' ').slice(1).toString();

          switch (validURL(url)) {
            case 0:
              message.reply('未知的來源');
              break;
            case 1:
              addPlaylist(url, message);
              break;
            case 2:
              addQueue(url, message);
              break;
          }
        });
    } else {
      message.reply('請先加入語音頻道再進行操作');
    }
    autoDeleteMessage(message);
  }

  else if (command === config.Setting.CommandPrefix + 'play') {
    if (message.member.voiceChannel) {
      message.member.voiceChannel.join();
      if (!message.member.voiceChannel.dispatcher) {
        playSound(message);
      }
    } else {
      message.reply('請先加入語音頻道再進行操作');
    }
    autoDeleteMessage(message);
  }

  // Stop Command
  else if (command === config.Setting.CommandPrefix + 'stop') {
    if (message.member.voiceChannel) {
      if (message.guild.voiceConnection) {
        message.guild.voiceConnection.disconnect();
      }
      message.reply('停止音樂');
    } else {
      message.reply('請先加入語音頻道再進行操作');
    }

    autoDeleteMessage(message);
  }

  // Skip Command
  else if (command === config.Setting.CommandPrefix + 'skip') {
    if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
      message.guild.voiceConnection.dispatcher.end();
      message.reply('跳過音樂');
    } else {
      message.reply('請先加入語音頻道再進行操作');
    }
    autoDeleteMessage(message);
  }

  // Pause Command
  else if (command === config.Setting.CommandPrefix + 'pause') {
    if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
      message.guild.voiceConnection.dispatcher.pause();
      message.reply('暫停音樂');
    } else {
      message.reply('請先加入語音頻道再進行操作');
    }
    autoDeleteMessage(message);
  }

  // Resume Command
  else if (command === config.Setting.CommandPrefix + 'resume') {
    if (message.guild.voiceConnection && message.guild.voiceConnection.dispatcher) {
      message.guild.voiceConnection.dispatcher.resume();
      message.reply('恢復音樂');
    } else {
      message.reply('請先加入語音頻道再進行操作');
    }
    autoDeleteMessage(message);
  }

  // Now Playing Command
  else if (command === config.Setting.CommandPrefix + 'np') {
    var filePath = './data/' + message.guild.id + '.json';
    fs.readFile(filePath, 'utf8', (err, data) => {
      try {
        var json = JSON.parse(data);
        if (json.length > 0) {
          const embed = new Discord.RichEmbed()
          .setTitle(json[0][1])
          .setURL('https://www.youtube.com/watch?v=' + json[0][0])
          .setAuthor('正在播放')
          .setFooter('Pitohui Music Bot')
          .setTimestamp()
          .setColor(0x00AE86);
          message.channel.send(embed).then(msg => {
            if (config.Setting.MessageDelete.enable == true) {
              msg.delete(config.Setting.MessageDelete.delay * 1000);
            }
          });
        }
      } catch (e) {
        console.log(e);
      }
    });
    autoDeleteMessage(message);
  }

  // Queue Command
  else if (command === config.Setting.CommandPrefix + 'queue') {
    var filePath = './data/' + message.guild.id + '.json';
    fs.readFile(filePath, 'utf8', (err, data) => {
      try {
        var json = JSON.parse(data);
        if (json.length > 0) {
          const embed = new Discord.RichEmbed()
          .setAuthor('播放佇列')
          .setFooter('Pitohui Music Bot')
          .setTimestamp()
          .setColor(0x00AE86);
          for (i=0;i<json.length&&i<25;i++) {
            embed.addField(json[i][1], 'https://www.youtube.com/watch?v=' + json[i][0], true);
          }

          message.channel.send(embed).then(msg => {
            if (config.Setting.MessageDelete.enable == true) {
              autoDeleteMessage(msg);
            }
          });
        } else {
          const embed = new Discord.RichEmbed()
          .setAuthor('播放佇列')
          .setTitle('沒有歌曲')
          .setFooter('Pitohui Music Bot')
          .setTimestamp()
          .setColor(0x00AE86);
          message.channel.send(embed).then(msg => {
            if (config.Setting.MessageDelete.enable == true) {
              autoDeleteMessage(msg);
            }
          });
        }
      } catch (e) {
        console.log(e);
      }
    });

    autoDeleteMessage(message);
  }

  // Clear Command
  else if (command === config.Setting.CommandPrefix + 'clear') {
    message.reply('清除音樂佇列');
    var filePath = './data/' + message.guild.id + '.json';
    var json = new Array();
    fs.writeFile(filePath, JSON.stringify(json), (err) => {
      if (err) throw err;
    });
  }
});




function autoDeleteMessage(message) {
  if (config.Setting.MessageDelete.enable == true) {
    message.delete(config.Setting.MessageDelete.delay * 1000);
  }
}

function addQueue(url, message) {
  var filePath = './data/' + message.guild.id + '.json';
  var videoID = ytdl.getURLVideoID(url);
  ytdl.getInfo(videoID, (err, info) => {
    var videoTitle = info.title;
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        var json = new Array(new Array(videoID, videoTitle));
      }
      else {
        try {
          var json = JSON.parse(data);
        } catch (e) {
          var json = new Array();
        }
        json.push(new Array(videoID, videoTitle));

        const embed = new Discord.RichEmbed()
        .setTitle(info.title)
        .setURL(info.video_url)
        .setAuthor('已加到佇列')
        .setFooter('Pitohui Music Bot')
        .setTimestamp()
        .setColor(0x00AE86);
        message.channel.send(embed).then(msg => {
          if (config.Setting.MessageDelete.enable == true) {
            msg.delete(config.Setting.MessageDelete.delay * 1000);
          }
        });

      }
      fs.writeFile(filePath, JSON.stringify(json), (err) => {
        if (err) throw err;
        if(!message.guild.voiceConnection.dispatcher) {
          if (json.length > 1) {
            message.reply('佇列中尚有待播放的音樂，請輸入 ' + config.Setting.CommandPrefix + 'play 進行播放');
          } else {
            playSound(message);
          }
        }
      });
    });
  });
}

function playSound(message) {
  var filePath = './data/' + message.guild.id + '.json';
  fs.readFile(filePath, 'utf8', (err, data) => {
    try {
      var json = JSON.parse(data);

    } catch (e) {
      console.log(e);
      var json = new Array();
    }

    var stream = ytdl('https://www.youtube.com/watch?v=' + json[0][0], {filter: 'audio'});
    const embed = new Discord.RichEmbed()
    .setTitle(json[0][1])
    .setURL('https://www.youtube.com/watch?v=' + json[0][0])
    .setAuthor('正在播放')
    .setFooter('Pitohui Music Bot')
    .setTimestamp()
    .setColor(0x00AE86);
    message.channel.send(embed).then(msg => {
      if (config.Setting.MessageDelete.enable == true) {
        msg.delete(config.Setting.MessageDelete.delay * 1000);
      }
    });
    try {
      message.guild.voiceConnection.playStream(stream, {
        passes: 2,
        bitrate: 'auto'
      });
      message.guild.voiceConnection.dispatcher.once('end', function() {
        fs.readFile(filePath, 'utf8', (err, data) => {
          try {
            var json = JSON.parse(data);

          } catch (e) {
            console.log(e);
            var json = new Array();
          }
          json.shift();
          fs.writeFile(filePath, JSON.stringify(json), (err) => {
            if (err) throw err;
            if (json.length > 0 && message.guild.voiceConnection) {
              setImmediate(() => {
                playSound(message);
              });
            } else {
              if (message.guild.voiceConnection) {
                message.guild.voiceConnection.disconnect();
              }
            }
          });
        });
      });
    } catch (e) {
      //console.log(e);
    }
  });
}
