exports.run = (message, a, s, d, permLevel) => {
	if (!message.member.roles.find(r => r.name.toLowerCase() === i18n.get('struct.music.dj', message).toLowerCase()) && !message.member.roles.find(r => r.name.toLowerCase() === i18n.get('struct.music.music', message).toLowerCase()) && permLevel < 3) return message.react(':missingpermissions:407054344874229760').catch(() => {});

	if (!message.guild.music || !message.guild.music.queue) return message.channel.send(message.__('no_music'));

	message.channel.send(message.__('stopped', { user: message.member.displayName.replace(/@/g, '@\u200b').replace(/ /g, '') }));
	if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
	message.guild.music = {};
};

exports.config = {
	enabled: true,
	permLevel: 2,
	category: 'music'
};