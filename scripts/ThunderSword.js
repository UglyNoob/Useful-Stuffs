'use strict'

import {
	world,
	Player
} from '@minecraft/server';

import * as cmd from './CommandRegistry.js';
import {globalCommandEngine} from './global.js';

const requiredTag = "TheChosenOne_ThunderSwordOwner";
const requiredSwordName = "ThunderSword";

const lightningBoltType = "minecraft:lightning_bolt";
const playerType = "minecraft:player";

const lightningSpawnerSymbol = Symbol("lightningSpawnerSymbol");

{
	let commandThunder = new cmd.Command("thunder");
	commandThunder.description = "Become the chosen one of the thunder!";
	commandThunder.setCallback((sender) => {
		if(sender.hasTag(requiredTag)) {
			sender.sendMessage(`§bYou are now ready to follow the power of the god of thunder. Try using a sword with a custom name §1§l"${requiredSwordName}"§r`);
		} else {
			world.sendMessage(`§b${sender.name}§r becomes §1§lthe Chosen One of the Thunder§r!`);
			sender.sendMessage("§9Type \"§3#thunder§9\" again to get help");
			sender.addTag(requiredTag);
		}
	});

	globalCommandEngine.register(commandThunder);
}

world.events.entityHurt.subscribe((event) => {
	if(event.damageSource.damagingEntity !== undefined && event.damageSource.damagingEntity[lightningSpawnerSymbol] == event.hurtEntity) {
		world.sendMessage(`Oh god! ${event.hurtEntity.name}`);
	}
});

world.events.entityHit.subscribe((event) => {
	if(event.entity.typeId != playerType) return;
	/** @type Player */
	let player = event.entity;
	if(player.hasTag(requiredTag)) {
		let location;
		if(event.hitBlock === undefined) {
			location = event.hitEntity.location;
		} else {
			location = event.hitBlock.location;
		}

		let ifMakeLightning = false;
		if (player.typeId == playerType) {
			let inventory = player.getComponent("minecraft:inventory");
			let slot = inventory.container.getSlot(player.selectedSlot);
			let item = slot.getItem();
			if(item.nameTag == requiredSwordName) {
				ifMakeLightning = true;
			}
		} else ifMakeLightning = true;
		if (ifMakeLightning) {
			let lightning = player.dimension.spawnEntity(lightningBoltType, location);
			lightning[lightningSpawnerSymbol] = player;
		}
	}
});
