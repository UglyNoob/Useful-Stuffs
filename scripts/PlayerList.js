import * as cmd from './CommandRegistry.js'

import {
	world
} from '@minecraft/server'

import { globalCommandEngine } from './Global.js'

{
	let listCommand = new cmd.Command("list");
	listCommand.description = "Show list of players";
}
