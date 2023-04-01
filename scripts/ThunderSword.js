'use strict'

import {
	world,
	system,
	Player,
	EntityDamageCause,
	MinecraftEffectTypes
} from '@minecraft/server';

import * as cmd from './CommandRegistry.js';
import {globalCommandEngine} from './Global.js';

const requiredTag = "TheChosenOne_ThunderSwordOwner";
const requiredSwordName = "ThunderSword";

const lightningBoltType = "minecraft:lightning_bolt";
const playerType = "minecraft:player";

/*
 * There two constant is to implement the functionality that a lightning spawner won't be hurt by the lightning bolt caused by himself.
 */
const lightningSpawnerSymbol = Symbol("lightningSpawnerSymbol");
const lightningImmuneTimeout = 5; // 5 ticks

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
	if(event.damageSource.cause == EntityDamageCause.lightning) {
		let p = event.hurtEntity[lightningSpawnerSymbol]
		if(p !== undefined && system.currentTick - p <= lightningImmuneTimeout) {
			event.hurtEntity[lightningSpawnerSymbol] = undefined;

			system.runTimeout(() => {
				let healthComponent = event.hurtEntity.getComponent("minecraft:health");
				healthComponent.setCurrent(healthComponent.current + event.damage);

				let fireComponent = event.hurtEntity.getComponent("minecraft:onfire");
				if(fireComponent !== undefined) {
					event.hurtEntity.addEffect(MinecraftEffectTypes.fireResistance, fireComponent.onFireTicksRemaining, 0, false);
				}
			}, 0);
		}
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
			player.dimension.spawnEntity(lightningBoltType, location);
			player[lightningSpawnerSymbol] = system.currentTick;
		}
	}
});
