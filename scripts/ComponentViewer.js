'use strict'

import {
	world,
	system,
	ItemStack,
	MinecraftItemTypes,
	MinecraftEntityTypes,
	DynamicPropertiesDefinition
} from '@minecraft/server';

import {
	ActionFormData,
	ModalFormData,
	MessageFormData
} from '@minecraft/server-ui';

import {alert, alertPermissionDenied} from './Utilities.js';

import * as cmd from './CommandRegistry.js';
import {globalCommandEngine} from './global.js';

const triggerItem = new ItemStack(MinecraftItemTypes.stick, 1);
triggerItem.nameTag = "§r§b§lEntity Components Viewer§r";
triggerItem.setLore(["§r§eUse it to open the viewer menu."]);

const menuCooldown = 20; // 1 second
const specialSymbolForSpawnedEntity = Symbol("SpawnedByEntityComponentsViewer");
const entityComponentsViewingCooldownDynPro = "entityComponentsViewingCooldown";

function stringifyComponentObject(component) {
	let result = "";
	for(let key in component) {
		let value = component[key];
		result += "§e" + typeof value + " §b" + key + "§r";
		if(typeof value != "function") result += ": §a" + value + "§r";
		result += ", \n";
	}
	result = result.slice(0, result.length - 3);
	return result;
}

// no need to compare the amount
function isTriggerItem(a, b) {
	return a.typeId === b.typeId &&
		a.nameTag === b.nameTag &&
		a.getLore()[0] == b.getLore()[0];
}
isTriggerItem = isTriggerItem.bind(null, triggerItem);

{
	let commandComponent = new cmd.Command("component");
	commandComponent.description = "Get the component viewer which enables component viewing of an specified entity.";
	commandComponent.setCallback((player) => {
		if(!player.isOp()) {
			player.sendMessage("§4Permission denied.");
			alertPermissionDenied(player);
			return;
		}
		player.getComponent("minecraft:inventory").container.addItem(triggerItem);
		let message = `§aYou have been given ${triggerItem.nameTag}§a. If it does not exist in your inventory, check if it is full.§r`;
		player.sendMessage(message);
		alert(player, "Congratulations", message);
	});

	globalCommandEngine.register(commandComponent);
}

function before_item_use_callback(event) {
	if(event.source.typeId != "minecraft:player") return;
	let player = event.source;

	if(!isTriggerItem(event.item)) return;

	{ // Check cooldown
		let cooldown = player.getDynamicProperty(entityComponentsViewingCooldownDynPro);
		if(cooldown != 0) return;
		else player.setDynamicProperty(entityComponentsViewingCooldownDynPro, menuCooldown);
	}

	event.cancel = true;

	let requestTypeMenu = new ModalFormData();
	requestTypeMenu.title("§3§lEntity Components Viewer Menu§r");
	requestTypeMenu.textField("Please enter the type identification of the entity you want to view.",
		"Type of Entity...(e.g. minecraft:pig)");

	let entity;
	let entity_is_player = false;
	let inputedEntityTypeId;
	let componentsShowerMenu;
	let components;
	const errorShowingMenu = new MessageFormData();
	errorShowingMenu.button1("§2§lRetry");
	errorShowingMenu.button2("§4Cancel");

	let killEntity = function() { if(!entity_is_player) entity && entity.kill(); };

	let componentsShowerMenuCallback = function(response) {
		if(response.canceled) {
			killEntity();
			return;
		};

		let component = components[response.selection];

		let componentDetailShowerMenu = new MessageFormData();
		componentDetailShowerMenu.title("§e§l" + component.typeId);
		componentDetailShowerMenu.body(stringifyComponentObject(component));
		componentDetailShowerMenu.button1("§3§lRefresh");
		componentDetailShowerMenu.button2("§2§lBack");

		let componentDetailShowerMenuCallback = (response) => {
			if(response.canceled) {
				killEntity();
				return;
			}
			if(response.selection == 1) { // REFRESH BUTTON SELECTED
				componentDetailShowerMenu.body(stringifyComponentObject(component));
				componentDetailShowerMenu.show(player).then(componentDetailShowerMenuCallback);
			} else { // BACK BUTTON SELECTED
				componentsShowerMenu.show(player).then(componentsShowerMenuCallback);
			}
		};

		componentDetailShowerMenu.show(player).then(componentDetailShowerMenuCallback);
	};
	let errorShowingMenuCallback;
	let requestTypeMenuCallback = function(response) {
		if(response.canceled) {return;}
		inputedEntityTypeId = response.formValues[0];
		if (inputedEntityTypeId === "player" || inputedEntityTypeId === "minecraft:player") {
			entity = player;
			entity_is_player = true;
		}
		else try {
			entity = player.dimension.spawnEntity(inputedEntityTypeId, player.location);
			entity[specialSymbolForSpawnedEntity] = true; // The value does not matter
			// entity.kill(); Should not kill
		} catch(e) {
			errorShowingMenu.title("§4§lERROR");
			if(inputedEntityTypeId == "") {
				errorShowingMenu.body("Please specify a type.");
			} else {
				errorShowingMenu.body(`An error occurred while attempting to spawn entity with type identification "§4${inputedEntityTypeId}§r". This entity may do not exist, be not summonable(the peaceful difficulty) or the event you may specify is not vaild.`);
			}
			errorShowingMenu.show(player).then(errorShowingMenuCallback);
			return;
		}
		components = entity.getComponents();
		if(components.length == 0) {
			errorShowingMenu.title("§2§l" + entity.typeId);
			errorShowingMenu.body(`§aEntity "§e${entity.typeId}§a" do not have any components.`);
			errorShowingMenu.show(player).then(errorShowingMenuCallback);
			killEntity();
			return;
		}


		componentsShowerMenu = new ActionFormData();
		componentsShowerMenu.title("§2§l" + entity.typeId);
		for(let component of components) {
			componentsShowerMenu.button(component.typeId);
		}
		componentsShowerMenu.show(player).then(componentsShowerMenuCallback);
	};


	errorShowingMenuCallback = function(response) {
		if(response.canceled || response.selection == 0) return;

		requestTypeMenu = new ModalFormData();
		requestTypeMenu.title("§3§lEntity Components Viewer Menu§r");
		requestTypeMenu.textField("Please enter the type identification of the entity you want to view.",
			"Type of Entity...(e.g. minecraft:pig)",
			inputedEntityTypeId);
		requestTypeMenu.show(player).then(requestTypeMenuCallback);
	};


	requestTypeMenu.show(player).then(requestTypeMenuCallback);
}
world.events.beforeItemUse.subscribe(before_item_use_callback);
world.events.beforeItemUseOn.subscribe(before_item_use_callback);

system.runInterval(() => {
	let players = world.getPlayers();
	let dimensions = new Set();
	for(let player of players) {
		let cooldown = player.getDynamicProperty(entityComponentsViewingCooldownDynPro);
		if(cooldown > 0) --cooldown; else cooldown = 0;
		player.setDynamicProperty(entityComponentsViewingCooldownDynPro, cooldown);

		dimensions.add(player.dimension);

	}

	for(let dimension of dimensions) {
		let specialEntitiesIter = dimension.getEntities();
		for(let entity of specialEntitiesIter) {
			if(!entity[specialSymbolForSpawnedEntity]) continue;
			let pos = entity.location;
			pos.y = -80;
			entity.teleport(pos, dimension, 0, 0);
			let health = entity.getComponent("minecraft:health"); // Might be undefined if the entity does not have a health component
			health && health.resetToMaxValue();
		}
	}
});

world.events.worldInitialize.subscribe((event) => {
	let def = new DynamicPropertiesDefinition();
	def.defineNumber(entityComponentsViewingCooldownDynPro);
	event.propertyRegistry.registerEntityTypeDynamicProperties(def, MinecraftEntityTypes.player);
});
