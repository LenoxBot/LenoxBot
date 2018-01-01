exports.run = async(client, msg, args, lang) => {
	const newprefix = args.slice();
	const tableload = client.guildconfs.get(msg.guild.id);

	var currentprefix = lang.prefix_currentprefix.replace('%prefix', tableload.prefix);

	if (newprefix.length === 0) return msg.channel.send(currentprefix);
	if (newprefix.length > 1) return msg.channel.send(prefix_error).then(m => m.delete(10000));

	tableload.prefix = newprefix;
	await client.guildconfs.set(msg.guild.id, tableload);

	var newprefixset = lang.prefix_newprefixset.replace('%newprefix', newprefix);
	
	return msg.channel.send(newprefixset);
};

exports.conf = {
	enabled: true,
	guildOnly: false,
	aliases: [],
    userpermissions: ['ADMINISTRATOR']
};

exports.help = {
	name: 'prefix',
	description: 'Changes the prefix of the server or shows you the current prefix if you just use ?prefix',
	usage: 'prefix {new prefix}',
	example: ['prefix !=!'],
	category: 'administration',
    botpermissions: ['SEND_MESSAGES']
};

