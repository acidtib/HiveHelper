const tmi = require('tmi.js');

const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: 'my_bot_name',
		password: 'oauth:my_bot_token'
	},
	channels: [ 'my_name' ]
});

client.connect();

client.on('message', (channel, tags, message, self) => {
	// Ignore echoed messages.
	if(self) return;

	if(message.toLowerCase() === '!hello') {
		client.say(channel, `@${tags.username}, heya!`);
	}
});

// Listen for the 'raided' event
client.on('raided', (channel, username, viewers) => {
    // Send the /shoutout command for the user who raided
    client.say(channel, `/shoutout ${username}`);
});
