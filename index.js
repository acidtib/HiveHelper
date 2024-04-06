const tmi = require('tmi.js');
const { createClient } = require('redis');

// Create a Redis client
const redisClient = createClient();

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: 'my_bot_name',
		password: 'oauth:my_bot_token'
	},
	channels: [] // Start with an empty array; we'll add channels dynamically
});

client.connect().catch(console.error);

client.on('message', (channel, tags, message, self) => {
	if(self) return;

	if(message.toLowerCase() === '!hello') {
		client.say(channel, `@${tags.username}, heya!`);
	}
});

client.on('raided', (channel, username, viewers) => {
    client.say(channel, `/shoutout ${username}`);
});

async function addChannel(channelName, retryCount = 3, delay = 1000, backoffFactor = 2) {
  try {
    await client.join(channelName);
    console.log(`Successfully joined ${channelName}`);
  } catch (err) {
    console.log(`Error attempting to join ${channelName}: ${err}`);
    if (retryCount > 0 && err === 'ERR_TOO_MANY_CHANNELS') {
      console.log(`Rate limit exceeded. Retrying in ${delay} milliseconds...`);
      setTimeout(() => {
        addChannel(channelName, retryCount - 1, delay * backoffFactor, backoffFactor);
      }, delay);
    } else {
      console.error(`Error joining ${channelName}: ${err}`);
    }
  }
}

async function checkRedisForNewChannels() {
    try {
        const channels = await redisClient.lRange('twitch_to_join', 0, -1);
        channels.forEach(channelName => {
            addChannel(channelName);
            // Optionally, remove the channel from the list after attempting to join
            // await redisClient.lRem('twitch_to_join', 0, channelName);
        });
    } catch (err) {
        console.error('Failed to retrieve channels from Redis:', err);
    }
}

// Poll Redis every 30 seconds for new channels
setInterval(checkRedisForNewChannels, 30000);