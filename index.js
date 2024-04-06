const tmi = require('tmi.js');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');

// Create a single supabase client for interacting with your database
const supabase = createSupabaseClient(process.env.SUPERBASE_URL, process.env.SUPABASE_KEY);

async function fetchStreamers() {
  const { data, error } = await supabase
    .from('streamers')
    .select('username') // Select all fields
    .eq('active', true); // Filter where active is true

  if (error) {
    console.error('Error fetching data:', error.message);
    return;
  }

  return data;
}

async function addChannel(client, channelName, retryCount = 3, delay = 1000, backoffFactor = 2) {
  try {
    await client.join(channelName);
    console.log(`Successfully joined ${channelName}`);
  } catch (err) {
    console.log(`Error attempting to join ${channelName}: ${err}`);
    if (retryCount > 0 && err === 'ERR_TOO_MANY_CHANNELS') {
      console.log(`Rate limit exceeded. Retrying in ${delay} milliseconds...`);
      setTimeout(async () => {
        await addChannel(client, channelName, retryCount - 1, delay * backoffFactor, backoffFactor);
      }, delay);
    } else {
      console.error(`Error joining ${channelName}: ${err}`);
    }
  }
}


(async () => {
  // Fetch initial list of active streamers from the database
  const streamers = await fetchStreamers();
  // Extract channel names from the streamers' data
  const channelsToJoin = streamers.map(obj => obj.username);

  // Initialize TMI client
  const client = new tmi.Client({
    options: { debug: true },
    identity: {
      username: process.env.TWITCH_USERNAME,
      password: `oauth:${process.env.TWITCH_TOKEN}`
    },
    channels: channelsToJoin
  });

  // Connect TMI client to Twitch
  client.connect().catch(console.error);

  // Listen for messages in channels
  client.on('message', (channel, tags, message, self) => {
    if (self) return;

    if (message.toLowerCase() === '!hello') {
      client.say(channel, `@${tags.username}, heya!`);
    }
  });

  // Listen for raids and issue shoutouts
  client.on('raided', (channel, username, viewers) => {
    client.say(channel, `/shoutout ${username}`);
  });


  // Subscribe to changes in the streamers table in the database
  supabase
    .channel('streamers')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'streamers' }, payload => {
      // When a new streamer is inserted, join their channel
      addChannel(client, payload.new.username);
    })
    .subscribe()

})();
