const moment = require('moment');
const sql = require('sqlite');
const fs = require('fs');

const { statusUpdate } = require('../functions/eventLoader');
const { watch } = require('../commands/fun/poll');
const dbots = require('../functions/dbots');
const ipc = require('../struct/ipc');

function game (client) {
	let games = [
		[ 'Invite me to your server with the "invite" command.', 'PLAYING' ],
		[ `${client.guilds.size} servers do their things`, 'WATCHING' ],
		[ `${client.users.size} users very closely`, 'WATCHING' ],
		[ 'with the webshot command', 'PLAYING' ],
		[ 'The lovely mp3 command', 'LISTENING' ],
		[ 'what do i put here', 'PLAYING' ],
		[ 'SOUNDCLOUD SUPPOOORRRRTTTT', 'LISTENING' ],
		[ 'talk to me im lonely', 'PLAYING' ],
		[ 'honestly the best way to code is by etching engravings into your hard drive', 'PLAYING' ],
		[ 'enable hot levels with the levels command', 'PLAYING' ],
		[ 'are you feeling sad? look at a cat and feel happy for a few seconds.', 'PLAYING' ],
		[ 'feeling like you need help with life? have the 8ball make all your choices.', 'PLAYING' ],
		[ 'don\'t like my prefix? weirdo. change it with the "prefix" command.', 'PLAYING' ],
		[ '( ͡° ͜ʖ ͡°)', 'PLAYING' ],
		[ 'if you feel like this bot is crap, feel free to \'a.suggest\' on how to make it less crap.', 'PLAYING' ],
		[ 'join my server so my dev feels popular - click "Support Server" in the help command', 'PLAYING' ],
		[ 'did you know that you\'re a nerd?', 'PLAYING' ],
		[ 'mmm sexy polls i think', 'PLAYING' ],
		[ 'you.', 'WATCHING' ],
		[ 'the screams of.. uh.. nevermind..', 'LISTENING' ],
		[ `simultaneously with all of you ;)`, 'PLAYING' ],
		[ 'the Earth burn as I hitch a ride with the Vogons', 'WATCHING' ],
		[ 'Help translate Arthur! Join the support server and ask how you can.', 'PLAYING' ]
	];

	let array = games[Math.floor(Math.random() * games.length)];
	client.user.setActivity(`${array[0]} | @Arthur help`, { type: array[1] }).catch(() => {});
}

function writeStats (client) {
	fs.writeFileSync('../media/stats/commands.json', JSON.stringify(client.commandStatsObject));
	fs.writeFileSync('../media/stats/daily.json', JSON.stringify(client.dailyStatsObject));
	fs.writeFileSync('../media/stats/weekly.json', JSON.stringify(client.weeklyStatsObject));
}

function cleanProcesses(client) {
	client.voiceConnections.forEach(connection => {
		if (!connection.channel
			|| connection.channel.members.size < 2
			|| !connection.channel.guild
			|| !connection.channel.guild.music
			|| !connection.channel.guild.music.queue
		) {
			if (connection.channel.guild && connection.channel.guild.music) connection.channel.guild.music = {};
			
			connection.disconnect();
			connection.channel.leave();
		}
	});
	
	client.processing.forEach((item, i) => {
		if (typeof item !== 'string') return;
		
		let start = moment(item.split(' - ')[0], 'h:mm:ss A').valueOf();
		if (Date.now() - start > 600000) client.processing.splice(i, 1); // 600000 ms = 10 minutes
	});
}

module.exports = client => {
	if (Date.now() - client.loadStart > 300000) return;
	console.log(`\n${client.test ? 'Testbot' : 'Arthur'} has started! Currently in ${client.guilds.size} guilds, attempting to serve ${client.users.size} users. (${Date.now() - client.loadStart} ms)\n`);

	if (!client.test) dbots.post(client);
	/*if (!client.test)*/ ipc(client);

	client.owner = client.users.get(client.config.owners[0]);
	client.recentMessages = {};
	client.lastRecentMessageID = 0;

	if (!client.test) {
		let tempItems = fs.readdirSync('../media/temp');
		if (tempItems) tempItems.forEach(i => {
			fs.unlinkSync(`../media/temp/${i}`);
		});
	}

	game(client);
	client.setInterval(() => {
		game(client);
	}, 120000);

	client.setInterval(() => {
		cleanProcesses(client);
	}, 600000);

	if (!client.test) {
		client.setInterval(() => {
			writeStats(client);
		}, 30000);/*

		dbots.getLikes(client);
		client.setInterval(() => {
			dbots.getLikes(client);
		}, 600000);*/
	}

	statusUpdate({
		title: 'Bot started',
		timestamp: new Date().toISOString(),
		color: 0x00c140
	});

	sql.all('SELECT * FROM pollReactionCollectors').then(results => {
		let parsed = [];

		results.forEach(obj => {
			let options = JSON.parse(obj.options);
			let embed = JSON.parse(obj.embed);
			parsed.push({
				channelID: obj.channelID,
				messageID: obj.messageID,
				options,
				endDate: obj.endDate,
				embed
			});
		});

		parsed.forEach(obj => {
			let channel = client.channels.get(obj.channelID);
			if (!channel) return sql.run('DELETE FROM pollReactionCollectors WHERE messageID = ?', [obj.messageID]).catch(console.log);
			channel.fetchMessage(obj.messageID).then(msg => {
				watch(msg, obj.options, obj.endDate, client, obj.embed);
			}).catch(() => {
				sql.run('DELETE FROM pollReactionCollectors WHERE messageID = ?', [obj.messageID]).catch(console.log);
			})
		});
	}).catch(console.error);

	const crashPath = require('path').join(__basedir, '..', 'media', 'temp', 'crash.txt');
	if (fs.existsSync(crashPath)) fs.readFile(crashPath, 'utf8', (err, data) => {
		if (err) {
			console.error('Error loading previous error:\n', err);
			return client.errorLog('Error loading previous error', err.stack, err.code);
		}

		let datarray = data.split('\n');
		const code = datarray.shift();
		const stack = datarray.join('\n');

		client.errorLog('Previous crash error', stack, code);

		fs.unlink(crashPath, err => {
			if (err) console.error('Could not delete previous crash.txt file:\n', err.stack);
		});
	});
};
