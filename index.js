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

// Function to add a new channel for the bot to follow with retry and backoff
function addChannel(channelName, retryCount = 3, delay = 1000, backoffFactor = 2) {

  client.join(channelName)
    .then(() => {
      console.log(`Successfully joined ${channelName}`);
    })
    .catch((err) => {

      console.log(`Error attempting to join ${channelName}: ${err}`);

      if (retryCount > 0 && err === 'ERR_TOO_MANY_CHANNELS') {
        console.log(`Rate limit exceeded. Retrying in ${delay} milliseconds...`);
        setTimeout(() => {
          addChannel(channelName, retryCount - 1, delay * backoffFactor, backoffFactor);
        }, delay);
      } else {
        console.error(`Error joining ${channelName}: ${err}`);
      }

    });

}

// Example usage: Call addChannel() whenever you want to add a new channel
// addChannel('new_channel_to_follow');
