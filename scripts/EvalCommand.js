import * as cmd from './CommandRegistry.js'
import { globalCommandEngine } from './Global.js';
import { Vector3, getPlayerFromName } from './Utilities.js';

import * as mc from '@minecraft/server';
import * as CV from './ComponentViewer.js'; // DEBUG

let global = {}; // eval use

function stringifyObject(obj) {
	let objType = typeof obj;
	if(objType != "object") {
		let result = "§e" + objType;
		if(objType != "function") result += " \"§a" + obj + "§e\"";
		return result;
	}
	let result = "";
	for(let key in obj) {
		let value = obj[key];
		result += "§e" + typeof value + " §b" + key + "§r";
		if(typeof value != "function") result += ": §a" + value + "§r";
		result += ", \n";
	}
	result = result.slice(0, result.length - 3);
	return result;
}

{
	let permitedUsers = ["SkeletonSquid12"];
	/*
	 * Usage: #eval code <Javascript code...>
	 * 		or: #eval run
	 */
	function help(sender) {
		let message = "§eBasic syntax: \"§b#eval run§e\" or \"§b#eval code <Javascript Code...>§e\".\n";
		message += "§eThis commands enables players to run javascript code dynamically.\n";
		message += "§eYou could use either \"§b#eval run§e\" to run javascript code thourgh a writable book you're currently selected, or \"§b#eval code <code>§e\" to run code through command line directly.";
		sender.sendMessage(message);
	}

	let evalCommand = new cmd.Command("eval");
	evalCommand.description = "Run a specified javascript code.";
	evalCommand.setCallback((sender, inputArray, isScriptEvent) => {
		if(isScriptEvent) return;
		if(!permitedUsers.includes(sender.name)) {
			sender.sendMessage("§cThis command is still in development.");
			return;
		}
		if(inputArray.length == 1) {
			help(sender);
			return;
		}
		if(inputArray[1] == "code") {
			inputArray.splice(0, 2);
			let code = inputArray.join(" ");
			try {
				eval(code);
			} catch(E) {
				sender.sendMessage(`§cAn error has occured while running "§6${code}§c".§r`);
				sender.sendMessage(String(E)); // DEBUG
				return;
			}
		} else if(inputArray[1] == "run") {
			/** @type mc.EntityInventoryComponent*/
			let inventory = sender.getComponent("minecraft:inventory");
			let item = inventory.container.getItem(sender.selectedSlot);
			// TODO
			sender.sendMessage();
		} else {
			help(sender);
		}
	});

	globalCommandEngine.register(evalCommand);
}
