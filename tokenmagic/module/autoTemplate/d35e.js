/*
 * Johnsmith <ltual@itwt.fr> d35e system support for autoTemplates.
 * d35e is a fork of pf2e, using an old AbilityTemplate with the static fromItem
 * method. 
 *
 * v0.9 (2023-07-20) : 
 *  - no libwrapper wrapper for fromItem method. This will be the next evolution
 *  - the AbilityTemplate provides the parent object of the template document. 
 *    methods fromCategories and fromConfig updates the template.document.
 *  - the preCreatedMeasuredTemplate hook is dropped.
 *  - todo : the CONFIG.D35E.damageTraits is broken in v2.3.2 d35e system. 
 *    - a change will be send @rugalt (system maintainer) to fix.
 *    - is it possible to have multiple types for a given spell item ?
 */
import { defaultOpacity, emptyPreset } from '../constants.js';
import AbilityTemplate from '../../../../systems/D35E/module/pixi/ability-template.js';

export class AutoTemplateD35E {

	static get defaultConfiguration() {
		const defaultConfig = {
			categories: {},
			overrides: {
				0: {
					target: 'Stinking Cloud',
					opacity: 0.5,
					tint: '#00a80b',
					preset: 'Smoky Area',
					texture: null,
				},
				1: {
					target: 'Sanguine Mist',
					opacity: 0.6,
					tint: '#c41212',
					preset: 'Smoky Area',
				},
				2: {
					target: 'Web',
					opacity: 0.5,
					tint: '#808080',
					preset: 'Spider Web 2',
					texture: null,
				},
				3: {
					target: 'Incendiary Aura',
					opacity: 0.2,
					tint: '#b12910',
					preset: 'Smoke Filaments',
					texture: null,
				},
				4: {
					target: 'Detect Magic',
					opacity: 0.1,
					tint: '#4aacb9',
					preset: 'Watery Surface',
					texture: null,
				},

			},
		};

		Object.keys(CONFIG.D35E.damageTraits).forEach((dmgType) => {
			if (defaultConfig.categories[dmgType] == undefined) {
				const config = { opacity: defaultOpacity, tint: null };
				switch (dmgType.toLowerCase()) {
					case 'acid':
						config.tint = '#2d8000';
						config.opacity = 0.6;
						break;
					case 'cold':
						config.tint = '#47b3ff';
						break;
					case 'electricity':
						break;
					case 'fire':
						break;
					case 'force':
						break;
					case 'mental':
						config.tint = '#8000ff';
						break;
					case 'negative':
						config.tint = '#502673';
						break;
					case 'poison':
						config.tint = '#00a80b';
						break;
					case 'positive':
						break;
					case 'sonic':
						config.tint = '#0060ff';
						break;
					default:
						break;
				}
				defaultConfig.categories[dmgType] = config;
			}

			Object.keys(CONFIG.MeasuredTemplate.types).forEach((tplType) => {
				const config = { preset: emptyPreset, texture: null };
				switch (dmgType.toLowerCase()) {
					case 'acid':
						config.preset = 'Watery Surface 2';
						break;
					case 'cold':
						config.preset = 'Thick Fog';
						break;
					case 'electricity':
						config.preset = 'Shock';
						break;
					case 'fire':
						config.preset = 'Flames';
						break;
					case 'force':
						config.preset = 'Waves 3';
						break;
					case 'mental':
						config.preset = 'Classic Rays';
						break;
					case 'negative':
						config.preset = 'Smoke Filaments';
						break;
					case 'poison':
						config.preset = 'Smoky Area';
						break;
					case 'positive':
						config.preset = 'Annihilating Rays';
						break;
					case 'sonic':
						config.preset = 'Waves';
						break;
					default:
						break;
				}
				defaultConfig.categories[dmgType][tplType] = config;
			});
		});

		return defaultConfig;
	}

	constructor() {
		this._enabled = false;
	}

	get enabled() {
		return this._enabled;
	}

	configure(enabled = false) {
		if (game.system.id !== 'D35E') return;
	  
        // wrap the AbilityTemplate fromItem static method
   		const origFromItem = AbilityTemplate.fromItem;
		AbilityTemplate.fromItem = function () {
		   return fromItem.call(this, origFromItem.bind(this), ...arguments);
	    };

        console.info("autotemplate d35e configured");
		this._enabled = enabled;
	}

    // no use, should be deleted
	set enabled(value) {}

	getData() {
		return {
			hasAutoTemplates: true,
			dmgTypes: CONFIG.D35E.damageTraits,
			templateTypes: CONFIG.D35E.measureTemplateTypes,
		};
	}
}

function fromConfig(config, template) {
	const o = { tokenmagic: { options: {} } };
	if (config.preset && config.preset !== '' && config.preset !== emptyPreset) {
		o.tokenmagic.options.tmfxPreset = config.preset;
	}
	if (config.texture && config.texture !== '') {
		o.tokenmagic.options.tmfxTexture = config.texture;
	}
	if (config.tint && config.tint !== '') {
		o.tokenmagic.options.tmfxTint = config.tint;
	}
	o.tokenmagic.options.tmfxTextureAlpha = config.opacity;

	template.document.updateSource({ flags: { tokenmagic: o.tokenmagic } });
}

function fromOverrides(overrides = [], item, template) {
	const name = item.itemData.name; // eg Burning Hands

    // looking in overrides for element where lowercase target = name.target");
	let config = overrides.find((el) => el.target.toLowerCase() === name?.toLowerCase());
	if (!config) {
		return false;
	}
    // merge tmfx flags in template.document
	fromConfig(config, template);
	return true;
}

function fromCategories(categories = {}, origin, template) {
	//if (!origin.traits?.length) {
	//	return false;
	//}

	let config, dmgSettings;
    let dmgType = origin.itemData.types;  // eg: fire, cold, ...

    // template.t : type of measure template : cone, circle, ray, whatever...

	// some templates may have multiple traits
	// this loop looks over all of them until it finds one with a valid fx preset
	// for (const trait of origin.traits) {
		dmgSettings = categories[dmgType.toLowerCase()] || {};
		config = dmgSettings[template.document.t];

		//if (config && config.preset !== emptyPreset) {
		//	break;
		//}
	//}
	if (!config) {
		return false;
	}

    // merge token magic fx flags in the template.document
	fromConfig(mergeObject(config, { opacity: dmgSettings.opacity, tint: dmgSettings.tint }, true, true), template);
	return true;
}

// wrapper function (AbilityTemplate.fromItem method)
function fromItem (wrapped, ...args) {
    const [item] = args;
    const template = wrapped(...args); // warn : template has a "document" property
                                       // which contains the template data to update
	if (!template) {
		return template;
	}

	let hasPreset = template.hasOwnProperty('tmfxPreset');
	if (hasPreset) {
		return template;
	}

    // get the autoTemplate setting for system
	const settings = game.settings.get('tokenmagic', 'autoTemplateSettings');

    // tries first for an override
	let updated = settings.overrides ? fromOverrides(Object.values(settings.overrides), item, template) : false;

    // no override ? let's look at the categories..
	if (!updated) {
		fromCategories(settings.categories, item, template);
	}

    // return the updated (or not) template for the AbilityTemplate.fromItem to 
    // proceed...
    return template;
}

export const d35eTemplates = new AutoTemplateD35E();

