'use strict'

import {
	world,
	system,
	GameMode,
	DynamicPropertiesDefinition,
	MinecraftEntityTypes,
	BeforeItemUseEvent,
	Player
} from '@minecraft/server';

const fireballTag = "GENERATED_BY_LAUNCHABLE_FIREBALL";
const fireballType = "minecraft:fireball";
const fireballLastingTicks = 60; // 3 seconds
const fireballCooldown = 20; // 1 second

const playerCooldownDynProID = "launchableFireballCooldown";

/** @param {BeforeItemUseEvent} event*/
function item_use_on_callback(event) {
	if(event.item.typeId == "minecraft:fire_charge" && event.source.typeId == "minecraft:player") {
		event.cancel = true;

		/** @type Player */
		let player = event.source;

		let cooldown = player.getDynamicProperty(playerCooldownDynProID);
		// CHECK COOLDOWN
		if(cooldown != 0) return;

		const head = player.getHeadLocation();
		const view = player.getViewDirection();
		const spawn_location = {
			x: head.x + view.x * 1.7,
			y: head.y + view.y * 1.7,
			z: head.z + view.z * 1.7
		};
		const velocity = {
			x: view.x * 1.5,
			y: view.y * 1.5,
			z: view.z * 1.5
		};

		let fireball = player.dimension.spawnEntity(fireballType, spawn_location);
		fireball.clearVelocity();
		fireball.applyImpulse(velocity);
		fireball.addTag(fireballTag);
		fireball.age = fireballLastingTicks;

		// Reset cooldown
		player.setDynamicProperty(playerCooldownDynProID, fireballCooldown);

		// Player not in creative mode
		if(![...world.getPlayers({gameMode: GameMode.creative})].includes(player)) {
			let container = player.getComponent("minecraft:inventory").container;
			let slot = container.getSlot(player.selectedSlot);
			--slot.amount;
		}
	}
}

system.runInterval(() => {
	// get all dimensions
	let dimensions = new Set();

	for (let player of world.getAllPlayers()) {
		dimensions.add(player.dimension);
		let cooldown = player.getDynamicProperty(playerCooldownDynProID);
		if(cooldown > 0) player.setDynamicProperty(playerCooldownDynProID, cooldown - 1);
		else player.setDynamicProperty(playerCooldownDynProID, 0);
	}

	for(const dimension of dimensions) {
		let fireballs = dimension.getEntities({
			tags: [fireballTag]
		});
		for(let fireball of fireballs) {
			--fireball.age;
			if(fireball.age <= 0) fireball.kill();
		}

	}
});

world.events.beforeItemUse.subscribe(item_use_on_callback);
world.events.beforeItemUseOn.subscribe(item_use_on_callback);
world.events.worldInitialize.subscribe((event) => {
	let def = new DynamicPropertiesDefinition();
	def.defineNumber(playerCooldownDynProID);
	event.propertyRegistry.registerEntityTypeDynamicProperties(def, MinecraftEntityTypes.player);
});
