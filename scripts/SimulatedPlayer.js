import * as GameTest from '@minecraft/server-gametest';

import {
	world,
	system,
	Player,
	GameMode,
	MinecraftBlockTypes
} from '@minecraft/server';

import {alertPermissionDenied, Vector3} from './Utilities.js';

import * as cmd from './CommandRegistry.js';

import {globalCommandEngine} from './global.js'

class CurrentBehavior {
	static symbol = Symbol("currentBehavior");
	static attackInterval = 0;
	static useInterval = 1;

	constructor(behaviorId, ...args) {
		this.behaviorId = behaviorId;
		this.lastTick = system.currentTick;
		args.length >= 1 && (this.interval = Number(args[0]));
	}
}

/** @type GameTest.Test */
let test;

// This symbol is used to record the birth place of a simulated player entity
const initialSpawnSymbol = Symbol("initialSpawn");
const simulatedPlayerRespawnTime = 20; // 20 ticks

// DEBUG
function stringifyObject(obj) {
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

/** @param {Player} player */
function getGamemode(player){
	let gameModes = [GameMode.survival, GameMode.creative, GameMode.adventure, GameMode.spectator];
	for(let gamemode of gameModes) {
		if([...world.getPlayers({name: player.name, gameMode: gamemode})].length != 0) {
			return gamemode;
		}
	}
	throw new Error(`Error: cannot determine gamemode of ${player.name}'s`);
}

{
	/**
	 * @callback SubCommandCallback
	 * @param {Player} sender
	 * @param {String[]} inputArray
	 *
	 * @callback SubCommandHelpCallback
	 * @param {Player} sender
	 * @param {String[]} inputArray
	 */

	class SubCommand {
		/**
		 * @param {String} id
		 * @param {SubCommandCallback} callback
		 * @param {SubCommandHelpCallback} helpCallback
		 */
		constructor(id, callback, helpCallback) {
			this.id = id;
			this.callback = callback;
			this.helpCallback = helpCallback;
		}
	}
	let subCommands = {
		/** @type Map<String, SubCommand>*/
		map: new Map(),
		/**
		 * @param {String} id
		 * @param {SubCommand} subCommand
		 */
		_register(subCommand) {
			this.map.set(subCommand.id, subCommand);
		}
	};

	subCommands._register(new SubCommand("spawn", (sender, inputArray) => {
		// TODO
		const simulatedPlayerName = inputArray[1];
		if([...world.getPlayers({name: simulatedPlayerName})].length != 0) {
			sender.sendMessage(`§cError: Player "§6${simulatedPlayerName}§c" exists.`);
			return;
		}
		let simulatedPlayer = test.spawnSimulatedPlayer(new Vector3(0, 0, 0), simulatedPlayerName, getGamemode(sender));
		let {x, y} = sender.getRotation();
		simulatedPlayer.teleport(sender.location, sender.dimension, x, y, false);
		simulatedPlayer[initialSpawnSymbol] = [sender.location, sender.dimension, x, y, false];
	}, (sender) => {
		let message = "§eBasic syntax: \"§b#player <Simulated Player Name> spawn§e\".\n";
		message += "§eSpawn a simulated player at caller's position, who has a same gamemode of caller's.\n";
		message += "§eFor example \"§b#player abcd spawn§e\" will spawn a simulated player named \"§aabcd§e\".";
		sender.sendMessage(message);
	}));

	subCommands._register(new SubCommand("kill", (sender, inputArray) => {
		const simulatedPlayerName = inputArray[1];
		/** @type GameTest.SimulatedPlayer*/
		let simulatedPlayer = [...world.getPlayers({ name: simulatedPlayerName })];
		if(simulatedPlayer.length != 1) {
			sender.sendMessage(`§cError: Player "§6${simulatedPlayerName}§c" not found.`);
			return;
		}
		simulatedPlayer = simulatedPlayer[0];
		if(simulatedPlayer.attack == undefined) {
			sender.sendMessage(`§cError: Player "§6${simulatedPlayerName}§c" is not a simulated player.`);
			return;
		}
		simulatedPlayer.disconnect();
		world.sendMessage(`§eSimulated player "${simulatedPlayerName}" has exited the game`);
	}, (sender) => {
		let message = "§eBasic syntax: \"§b#player <Simulated Player Name> kill§e\".\n";
		message += "§eMakes a existing simulated player disconnect.\n";
		message += "§eFor example \"§b#player abcd kill§e\" will make player \"§aabcd§e\" disconnect, if it was a simulated player.";
		sender.sendMessage(message);
	}));

	// #player abcd attack interval 3
	subCommands._register(new SubCommand("attack", (sender, inputArray) => {
		let interval = Number(inputArray[4], 10);
		if((inputArray.length >= 4 && !["continuous", "once", "interval"].includes(inputArray[3])) || (inputArray[3] === "interval" && !Number.isInteger(interval))) {
			sender.sendMessage("§cIllegal syntax. Type \"§6#player --help attack§c\" for help.");
			return;
		}

		const simulatedPlayerName = inputArray[1];
		/** @type GameTest.SimulatedPlayer */
		let simulatedPlayer = [...world.getPlayers({ name: simulatedPlayerName })];
		if(simulatedPlayer.length != 1) {
			sender.sendMessage(`§cError: Player "§6${simulatedPlayerName}§c" not found.`);
			return;
		}
		simulatedPlayer = simulatedPlayer[0];
		if(simulatedPlayer.attack == undefined) {
			sender.sendMessage(`§cError: Player "§6${simulatedPlayerName}§c" is not a simulated player.`);
			return;
		}

		if(inputArray.length == 3 || inputArray[3] == "once") {
			simulatedPlayer.attack();

			return;
		}
		if(inputArray[3] == "interval") {
			simulatedPlayer[CurrentBehavior.symbol] = new CurrentBehavior(CurrentBehavior.attackInterval, Number(inputArray[4], 10));

			return;
		}

	}, (sender) => {
		let message = "§eBasic syntax: \"§b#player <Simulated Player Name> attack <once | continuous | interval> <tick: interval>§e\".\n";
		message += "§eMakes a existing simulated player attack.\n";
		sender.sendMessage(message);
	}));

	subCommands._register(new SubCommand("run", (sender, inputArray) => {
		// TODO
		const simulatedPlayerName = inputArray[1];
		/** @type GameTest.SimulatedPlayer*/
		let simulatedPlayer = [...world.getPlayers({ name: simulatedPlayerName })];
		if(simulatedPlayer.length != 1) {
			sender.sendMessage(`§cError: Player "§6${simulatedPlayerName}§c" not found.`);
			return;
		}
		simulatedPlayer = simulatedPlayer[0];
		if(simulatedPlayer.attack == undefined) {
			sender.sendMessage(`§cError: Player "§6${simulatedPlayerName}§c" is not a simulated player.`);
			return;
		}
		if(inputArray.length >= 4) {
			let code = inputArray.slice(3).join(" ");
			let me = simulatedPlayer;
			try {
				eval(code);
			} catch(E) {
				sender.sendMessage(`§cAn error has occured while running "§6${code}§c".§r`);
				sender.sendMessage(String(E)); // DEBUG
				return;
			}
		}
	}, () => {}));

	let subCommandHelp = new SubCommand("--help", (sender, inputArray) => {
		if(inputArray.length >= 3 && subCommands.map.has(inputArray[2])) {
			subCommands.map.get(inputArray[2]).helpCallback(sender, inputArray);
			return;
		}
		let message = "§eBasic syntax: \"§b#player <Simulated Player Name> <Sub Command>§e\".\n"
		message += "§eThis command is intended for enabling simulated players manipulating operations.\n";
		message += "§eHere are available sub commands: ";
		{
			let first = true;
			for(let key of subCommands.map.keys()) {
				if(!first) message += ", ";
				message += "§b" + key + "§e";
				first = false;
			}
			message += "\n";
		}
		message += "§eFor further explaination, type \"§b#player --help <subcommand>§e\". For example \"§b#player --help spawn§e\".";

		sender.sendMessage(message);
	});

	let commandPlayer = new cmd.Command("player");
	commandPlayer.description = "Spawn or manipulate a simulated player."
	commandPlayer.setCallback((sender, inputArray) => {
		try {
			if(!sender.isOp()) {
				sender.sendMessage("§c§lPermission denied.");
				alertPermissionDenied(sender);
				return;
			}
			if(!test) {
				//await sender.runCommandAsync("execute positioned 0 0 -3 run gametest run simulatedplayer:simulatedplayer");
				/* Only old use of execute is effective. Strange */
				sender.dimension.fillBlocks(new Vector3(0, 317, 0), new Vector3(0, 317, 0), MinecraftBlockTypes.glass);
				sender.dimension.fillBlocks(new Vector3(0, 318, 0), new Vector3(0, 319, 0), MinecraftBlockTypes.air);
				sender.runCommandAsync("execute @s 0 0 -3 gametest run simulatedplayer:simulatedplayer");
				sender.sendMessage("Initializing. Try rerun.");
				return;
			}
			inputArray = inputArray.filter(value => { return value != ""; });

			/* HANDLE HELP SUB COMMAND */
			if(inputArray[1] == "--help" || inputArray.length < 3) {
				subCommandHelp.callback(sender, inputArray);
				return;
			}

			let subCommand = subCommands.map.get(inputArray[2]);
			if(subCommand == undefined) {
				sender.sendMessage(`§cUnknown sub command "${inputArray[2]}". Type "#player --help" for further explaination.`);
				return;
			}
			subCommand.callback(sender, inputArray);
		} catch (E) {
			world.sendMessage(String(E)); // DEBUG
		}
	});

	globalCommandEngine.register(commandPlayer);
}


world.events.entityDie.subscribe((event) => {
	// respawn dead simulated players
	if(event.deadEntity.respawn === undefined) return;
	system.runTimeout(() => {
		event.deadEntity.respawn();
		event.deadEntity.teleport.apply(event.deadEntity, event.deadEntity[initialSpawnSymbol]);
	}, simulatedPlayerRespawnTime);
});

system.runInterval(() => {
	/** @type GameTest.SimulatedPlayer[] */
	let simulatedPlayers = [...world.getPlayers()].filter(p => { return p.attack !== undefined });

	for(let player of simulatedPlayers) {
		if(player[CurrentBehavior.symbol] === undefined) continue;
		/** @type CurrentBehavior*/
		let cb = player[CurrentBehavior.symbol];
		if(cb.behaviorId == CurrentBehavior.attackInterval) {
			if(system.currentTick % cb.lastTick >= cb.interval) {
				player.attack();
				cb.lastTick = system.currentTick;
			}
		}
	}
});

GameTest.register("SimulatedPlayer", "SimulatedPlayer", (test_) => {
	test = test_;
	// let player = test.spawnSimulatedPlayer({x: 0, y: 0, z: 0}, "SimulatedPlayer1", GameMode.survival);
	// test.succeedOnTick(200);
}).maxTicks(999999999) //INFINITY
	.structureName("void:void");
