import {
	Player,
	system
} from '@minecraft/server';

/**
 * @callback commandCalledCallback
 * @param {Player} sender
 * @param {Array} inputArray
 * @param {Boolean} isScriptEvent
 */

export class Command {
	static prompt = "#";

	/** @param {String} identifier */
	constructor(identifier) {
		this._identifier = identifier;
	}

	get description() { return this._description; }
	get callback() { return this._callback; }
	get identifier() { return this._identifier; }

	/**
	 * @param {String} description
	 */
	set description(description) {
		this._description = description;
		return this;
	}

	/**
	 * @param {commandCalledCallback} callback
	 */
	setCallback(callback) {
		this._callback = callback;
		return this;
	}

	toString() {
		return "Command: " + prompt + this.identifier + ": " + this.description;
	}
};

export class ResolveResult {
	constructor() {
		this.isCommand = false,
		this.doCommandExists = false
	}
};

export class CommandEngine {
	constructor() {
		/** @type Map<String, Command>*/
		this.registeredCommands = new Map();

		let commandHelp = new Command("help");
		commandHelp.description = "Type this command for help.";
		commandHelp.setCallback((sender) => {
			sender.sendMessage("§2Displaying manual for commands with prompt \"" + Command.prompt + "\".");
			this.registeredCommands.forEach((value, key) => {
				sender.sendMessage(`#${key}: §b${value.description}`);
			});
			sender.sendMessage(`§2Displayed ${this.registeredCommands.size} commands.`);
		});

		this.register(commandHelp);

		let callback = (event) => {
			if(this === undefined) {
				system.events.scriptEventReceive.unsubscribe(callback);
			}
			if(event.sourceEntity === undefined || event.sourceEntity.typeId !== "minecraft:player") return;
			this.resolve(event.sourceEntity, '#' + event.message, true);
		};
		system.events.scriptEventReceive.subscribe(callback);
	}

	/**
	 * @param {Command} command
	 */
	register(command) {
		if(!command.identifier) throw new Error("Undefined identifier");
		if(this.registeredCommands.has(command.identifier)) throw new Error("Already registered");

		this.registeredCommands.set(command.identifier, command);
	}

	/**
	 * @param {Player} sender
	 * @param {String} input
	 * @param {Boolean} isScriptEvent
	 *
	 * @return ResolveResult
	 */
	resolve(sender, input, isScriptEvent) {
		let result = new ResolveResult();
		if(input.charAt(0) !== Command.prompt) return result;
		result.isCommand = true;
		let inputArr = input.split(' ');

		let whichCommand;
		this.registeredCommands.forEach((value, key) => {
			if("#" + key === inputArr[0]) {
				result.doCommandExists = true;
				whichCommand = value;
			}
		});
		if(result.doCommandExists) {
			whichCommand.callback(sender, inputArr, isScriptEvent);
		} else {
			sender.sendMessage(`§cUnknown command "${inputArr[0]}". Please type "#help" for help.`);
		}
		return result;
	}
};
