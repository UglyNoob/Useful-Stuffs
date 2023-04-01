import * as cmd from './CommandRegistry.js';

import { globalCommandEngine } from './Global.js';

import {
	Player,
	DynamicPropertiesDefinition,
	MinecraftEntityTypes,
	system,
	world
} from '@minecraft/server'

import {
	ActionFormData,
	ActionFormResponse,
	MessageFormData,
	MessageFormResponse,
	FormCancelationReason
} from '@minecraft/server-ui'

const requestTimeout = 20 * 30; // 30 seconds
const requestCooldown = 20 * 3; // 3 seconds
const requestCooldownKey = "sendTeleportRequestCooldown";

/** @param {Player} a @param {Player} b*/
function teleport(a, b) {
	const {x, y} = b.getRotation();
	a.teleport(b.location, b.dimension, x, y);
}


class RequestType {
	constructor(id) {this.id = id;}
}
RequestType.tp = new RequestType(0);
RequestType.tphere = new RequestType(1);

class Request {
	static symbol = Symbol("requestsSymbol");
	/**
	 * @param {Player} requester
	 * @param {Player} to
	 * @param {RequestType} type
	 */
	constructor(requester, to, type) {
		this.requester = requester;
		this.to = to;
		this.type = type;
		this.tick = system.currentTick;
		this.targetPlayerName = to.name;
	}

	accept() {
		if(this.type == RequestType.tp) {
			teleport(this.requester, this.to);
		} else if(this.type == RequestType.tphere) {
			teleport(this.to, this.requester);
		}
	}
}

{
	let commandTpa = new cmd.Command("tpa");
	commandTpa.description = "Teleport to other players with their allowance, for non-admin players.";
	commandTpa.setCallback((sender, inputArray) => {
		if(inputArray.length == 1) {
			sender.sendMessage(`§cError: Needs one target. Type "§6#tpa --help§c" for further explaination.`);
			return;
		}
		if(inputArray[1] == "--help") {
			let message = "§eBasic syntax: \"§b#tpa <Name of Player>§e\".\n";
			message += "§eFor example: Type \"§b#tpa abcd§e\" tp send a request to player §aabcd§e, whom you will teleport to if the player accepts.\n";
			message += "§eNote that you can also use \"§b#tpa --cancel§e\" to cancel the request you have made."
			sender.sendMessage(message);
			return;
		} else if(inputArray[1] == "--cancel") {
			/** @type Request */
			let existingRequest = sender[Request.symbol];
			if(existingRequest === undefined) {
				sender.sendMessage("§eYou haven't made any requests yet.");
			} else {
				sender.sendMessage(`§3Your request to "§a${existingRequest.targetPlayerName}§3" has been cancelled.`);
				sender[Request.symbol] = undefined;
			}
			return;
		}
		let targetPlayerName = inputArray[1];
		if(targetPlayerName == sender.name) {
			sender.sendMessage(`§cPlease specify other players. Type "§6#tpa --help§c" for further explaination.`);
			return;
		}
		let target = [...world.getPlayers({name: targetPlayerName})][0];
		if(target === undefined) {
			sender.sendMessage(`§cError: Player "§a${targetPlayerName}§c" not found. Type "§6#tpa --help§c" for further explaination.`);
			return;
		}
		// CHECK cooldown
		{
			let cooldown = sender.getDynamicProperty(requestCooldownKey);
			if(cooldown != 0) {
				sender.sendMessage("§cToo fast. Please request later.");
				return;
			}
			sender.setDynamicProperty(requestCooldownKey, requestCooldown);
		}
		/** @type Request */
		let existingRequest = sender[Request.symbol];
		if(existingRequest !== undefined) {
			if(existingRequest.to.name == targetPlayerName && existingRequest.type == RequestType.tp) {
				sender.sendMessage(`§3Request to "§a${targetPlayerName}§3" has already been made.`);
				return;
			}
		}

		sender[Request.symbol] = new Request(sender, target, RequestType.tp); // Make request

		sender.sendMessage(`§eYour teleport request to "§a${targetPlayerName}§e" has been made.`);
		target.sendMessage(`§6"§a${sender.name}§6" wants to teleport to your location. Please type "§b#tpaccept§6" to choose to accept or deny the request.`);
	});

	let commandTpahere = new cmd.Command("tpahere");
	commandTpahere.description = "Make other players teleport to your location with their allowance, for non-admin players.";
	commandTpahere.setCallback((sender, inputArray) => {
		if(inputArray.length == 1) {
			sender.sendMessage(`§cError: Needs one target. Type "§6#tpahere --help§c" for further explaination.`);
			return;
		}
		if(inputArray[1] == "--help") {
			let message = "§eBasic syntax: \"§b#tpahere <Name of Player>§e\".\n";
			message += "§eFor example: Type \"§b#tpahere abcd§e\" tp send a request to player §aabcd§e, who will teleport to you if the player accepts.\n";
			message += "§eNote that you can also use \"§b#tpahere --cancel§e\" to cancel the request you have made."
			sender.sendMessage(message);
			return;
		} else if(inputArray[1] == "--cancel") {
			/** @type Request */
			let existingRequest = sender[Request.symbol];
			if(existingRequest === undefined) {
				sender.sendMessage("§eYou haven't made any requests yet.");
			} else {
				sender.sendMessage(`§3Your request to "§a${existingRequest.targetPlayerName}§3" has been cancelled.`);
				sender[Request.symbol] = undefined;
			}
			return;
		}
		let targetPlayerName = inputArray[1];
		if(targetPlayerName == sender.name) {
			sender.sendMessage(`§cPlease specify other players. Type "§6#tpahere --help§c" for further explaination.`);
			return;
		}
		let target = [...world.getPlayers({name: targetPlayerName})][0];
		if(target === undefined) {
			sender.sendMessage(`§cError: Player "§a${targetPlayerName}§c" not found. Type "§6#tpahere --help§c" for further explaination.`);
			return;
		}
		// CHECK cooldown
		{
			let cooldown = sender.getDynamicProperty(requestCooldownKey);
			if(cooldown != 0) {
				sender.sendMessage("§cToo fast. Please request later.");
				return;
			}
			sender.setDynamicProperty(requestCooldownKey, requestCooldown);
		}
		/** @type Request */
		let existingRequest = sender[Request.symbol];
		if(existingRequest !== undefined) {
			if(existingRequest.to.name == targetPlayerName && existingRequest.type == RequestType.tphere) {
				sender.sendMessage(`§3Request to "§a${targetPlayerName}§3" has already been made.`);
				return;
			}
		}

		sender[Request.symbol] = new Request(sender, target, RequestType.tphere); // Make request

		sender.sendMessage(`§eYour teleport request to "§a${targetPlayerName}§e" has been made.`);
		target.sendMessage(`§6"§a${sender.name}§6" wants you to teleport to his location. Please type "§b#tpaccept§6" to choose to accept or deny the request.`);
	});

	let commandTpaccept = new cmd.Command("tpaccept");
	commandTpaccept.description = "Accept or deny teleport request from other players.";
	commandTpaccept.setCallback((sender, inputArray) => {
		if(inputArray.length >= 2 && !["--help", "--latest"].includes(inputArray[1])) {
			sender.sendMessage(`§cUnknown subcommand "§6${inputArray[1]}§c". Type "§6#tpaccept --help§c" for further explaination.`);
			return;
		}
		if(inputArray.length >= 2 && inputArray[1] == "--help") {
			let message = "§eThis command could be invoked with plain \"§6#tpaccept§e\".\n";
			message += "§eSub commands include --help and --latest are also available. With \"§6#tpaccept --latest§e\" you can accept the latest request from others directly and efficiently without any user interface.";
			sender.sendMessage(message);
			return;
		}
		/** @type Player[] */
		let requestSenders = [];
		for(let player of world.getPlayers()) {
			/** @type Request */
			let request = player[Request.symbol];
			if(request !== undefined && request.to.id == sender.id) requestSenders.push(player);
		}
		if(requestSenders.length == 0) {
			sender.sendMessage("§6You don't have any pending requests yet.");
			return;
		}
		requestSenders.sort((a, b) => { return b[Request.symbol].tick - a[Request.symbol].tick; }); // The latest first

		if(inputArray.length >= 2 && inputArray[1] == "--latest") {
			/** @type Request */
			let requestSender = requestSenders[0];
			let request = requestSender[Request.symbol];
			if(request.type == RequestType.tp) {
				requestSender.sendMessage(`§6Your request to teleport to "§a${sender.name}§6" has just been accepted.`);
				sender.sendMessage(`§eYou have accepted the request from "§a${requestSender.name}§e".`);
			} else if(request.type == RequestType.tphere) {
				requestSender.sendMessage(`§6Your request to make "§a${sender.name}§6" teleport to your location has just been accepted.`);
				sender.sendMessage(`§eYou have accepted the request from "§a${requestSender.name}§e".`);
			}
			request.accept();
			requestSender[Request.symbol] = undefined;
			return;
		}

		sender.sendMessage("§aPlease exit the chat menu.");

		/** @type Player */
		let selectedRequester;
		/** @type Request */
		let selectedRequest;

		/** @param {MessageFormResponse} response */
		let requestDetailCallback = (response) => {
			if(response.canceled) return;
			if(response.selection == 0) {
				// DENY
				if(selectedRequest.type == RequestType.tp) {
					selectedRequester.sendMessage(`§6Your request to teleport to "§a${sender.name}§6" has been rejected.`);
					sender.sendMessage(`§eYou have rejected the request from "§a${selectedRequester.name}§e".`);
				} else if(selectedRequest.type == RequestType.tphere) {
					selectedRequester.sendMessage(`§6Your request to make "§a${sender.name}§6" teleport to your location has been rejected.`);
					sender.sendMessage(`§eYou have rejected the request from "§a${selectedRequester.name}§e".`);
				}
			} else {
				// ACCEPT
				if(selectedRequest.type == RequestType.tp) {
					selectedRequester.sendMessage(`§6Your request to teleport to "§a${sender.name}§6" has just been accepted.`);
					sender.sendMessage(`§eYou have accepted the request from "§a${selectedRequester.name}§e".`);
				} else if(selectedRequest.type == RequestType.tphere) {
					selectedRequester.sendMessage(`§6Your request to make "§a${sender.name}§6" teleport to your location has just been accepted.`);
					sender.sendMessage(`§eYou have accepted the request from "§a${selectedRequester.name}§e".`);
				}
				selectedRequest.accept();
			}
			selectedRequester[Request.symbol] = undefined;
		};

		/** @param {ActionFormResponse} response */
		let menuCallback = (response) => {
			if(response.canceled) {
				if (response.cancelationReason == FormCancelationReason.userBusy) {
					menu.show(sender).then(menuCallback);
				}
				return;
			}
			selectedRequester = requestSenders[response.selection];
			selectedRequest = selectedRequester[Request.symbol];
			let detailMenu = new MessageFormData();
			detailMenu.title(`§3"§6${selectedRequester.name}§3's Request"`);
			if(selectedRequest.type == RequestType.tp) {
				detailMenu.body(`"§6${selectedRequester.name}§r" wants to teleport to your location.`);
			} else if(selectedRequest.type == RequestType.tphere) {
				detailMenu.body(`"§6${selectedRequester.name}§r" wants you to teleport to his location.`);
			}
			detailMenu.button1("§2Accept");
			detailMenu.button2("§c§lDeny");
			detailMenu.show(sender).then(requestDetailCallback);
		}
		let menu = new ActionFormData();
		menu.title("§3Requests");
		menu.body("§9Here are your pending requests:");
		for(let p of requestSenders) {
			menu.button((p[Request.symbol].type == RequestType.tp ? "§2" : "§6") + p.name); // different color for different types of request
		}
		menu.show(sender).then(menuCallback);

	});

	globalCommandEngine.register(commandTpa);
	globalCommandEngine.register(commandTpahere);
	globalCommandEngine.register(commandTpaccept);
}

world.events.worldInitialize.subscribe((event) => {
	let pro = new DynamicPropertiesDefinition();
	pro.defineNumber(requestCooldownKey);
	event.propertyRegistry.registerEntityTypeDynamicProperties(pro, MinecraftEntityTypes.player);
});

world.events.playerLeave.subscribe((event) => {
	// CHECK requests
	for(let player of world.getPlayers()) {
		/** @type Request */
		let existingRequest = player[Request.symbol];
		if(existingRequest !== undefined && existingRequest.targetPlayerName == event.playerName) {
			player.sendMessage(`§3Your teleport request to "§a${event.playerName}§3" has been fired since the player has disconnected.`);

			player[Request.symbol] = undefined;
		}
	}
});

system.runInterval(() => {
	for(let player of world.getPlayers()) {
		// CHECK cooldown
		let cooldown = player.getDynamicProperty(requestCooldownKey);
		if(cooldown > 0) {
			player.setDynamicProperty(requestCooldownKey, cooldown - 1);
		} else {
			player.setDynamicProperty(requestCooldownKey, 0); // NOT useless. Avoid undefined.
		}

		// CHECK timeout
		/** @type Request */
		let existingRequest = player[Request.symbol];
		if(existingRequest !== undefined) {
			if(system.currentTick - existingRequest.tick >= requestTimeout) {
				player.sendMessage(`§3Your teleport request to "§a${existingRequest.to.name}§3" has been fired due to timeout.`);

				player[Request.symbol] = undefined;
			}
		}
	}
});
