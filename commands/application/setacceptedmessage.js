const LenoxCommand = require('../LenoxCommand.js');

module.exports = class setacceptedmessageCommand extends LenoxCommand {
	constructor(client) {
		super(client, {
			name: 'setacceptedmessage',
			group: 'application',
			memberName: 'setacceptedmessage',
			description: 'Sets a custom message that receive the applicants who have been accepted',
			format: 'setacceptedmessage {custom message}',
			aliases: [],
			examples: ['setacceptedmessage You have been accepted!'],
			clientPermissions: ['SEND_MESSAGES'],
			userPermissions: ['ADMINISTRATOR'],
			shortDescription: 'Settings',
			dashboardsettings: true
		});
	}

	async run(msg) {
		const langSet = msg.client.provider.getGuild(msg.message.guild.id, 'language');
		const lang = require(`../../languages/${langSet}.json`);
		const args = msg.content.split(' ').slice(1);

		const content = args.slice().join(' ');
		if (!content) return msg.channel.send(lang.setacceptedmessage_noinput);

		const currentApplication = msg.client.provider.getGuild(msg.message.guild.id, 'application');
		currentApplication.acceptedmessage = content;
		await msg.client.provider.setGuild(msg.message.guild.id, 'application', currentApplication);

		return msg.channel.send(lang.setacceptedmessage_set);
	}
};
