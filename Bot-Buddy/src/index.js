import { Client, GatewayIntentBits, REST, Routes, Collection } from 'discord.js';
import { musicCommands } from './commands/music.js';
import { gameCommands } from './commands/game.js';
import { seedDatabase } from './db/seed.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

const allCommands = [...musicCommands, ...gameCommands];

for (const command of allCommands) {
  client.commands.set(command.data.name, command);
}

async function registerCommands(token, clientId) {
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    const commandData = allCommands.map(cmd => cmd.data.toJSON());
    
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandData },
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Bot is in ${client.guilds.cache.size} guilds`);
  
  await seedDatabase();
  
  await registerCommands(process.env.DISCORD_BOT_TOKEN, client.user.id);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    
    const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set!');
  console.log('Please set DISCORD_BOT_TOKEN environment variable with your Discord bot token.');
  console.log('You can get a bot token from https://discord.com/developers/applications');
  process.exit(1);
}

client.login(token);
