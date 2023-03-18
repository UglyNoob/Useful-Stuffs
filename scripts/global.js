import {CommandEngine} from './CommandRegistry.js'
import {world} from '@minecraft/server';

export let globalCommandEngine = new CommandEngine();

world.events.beforeChat.subscribe((event) => {
	let result = globalCommandEngine.resolve(event.sender, event.message);

	if (result.isCommand) event.cancel = true;
});
