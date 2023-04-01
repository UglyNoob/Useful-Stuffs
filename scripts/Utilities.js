import {
	Player,
	world
} from '@minecraft/server';

import * as ui from '@minecraft/server-ui'

/**
 * @param {Player} player
 * @param {String} title
 * @param {String} message
 *
 * @return {Promise<ui.MessageFormResponse>}
 */
export function alert(player, title, message) {
	let menu = new ui.MessageFormData();
	menu.title(title);
	menu.body(message);
	menu.button1("§3Confirm");
	menu.button2("§4Cancel");

	let resolve;
	let promise = new Promise((resolve_) => {resolve = resolve_;});
	function callback(response) {
		if(response.canceled && response.cancelationReason == ui.FormCancelationReason.userBusy) {
			menu.show(player).then(callback); // Busy repeat
			return;
		}
		resolve(response);
	}
	menu.show(player).then(callback);

	return promise;
}

/**
 * @param {Player} player
 */
export function alertPermissionDenied(player) {
	return alert(player, "§c§lPermission Denied", "§6I'm sorry, but you do not have the permission to perform this command. Please contact server administrators if you believe that this is in error.");
}

/**
 * @param {String} name
 */
export function getPlayerFromName(name) {
	let p = [...world.getPlayers({name: name})];
	if(p.length == 1) {
		return p[0];
	}
	return undefined;
}

export class Vector3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}
