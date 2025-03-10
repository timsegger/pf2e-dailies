import { DailiesInterface } from './apps/interface'
import { createWatchChatMessage } from './chat'
import { capitalize, getFlag, getSetting, localize, sequenceArray, warn } from './module'
import { createSpellScroll } from './pf2e/spell'

const halfLevelString = 'max(1,floor(@actor.level/2))'

const RUNE_PROPERTY_KEYS = ['propertyRune1', 'propertyRune2', 'propertyRune3', 'propertyRune4']

let SKILLNAMES
let LANGUAGES

export const utils = {
    // Skills
    get skillNames() {
        SKILLNAMES ??= Object.keys(CONFIG.PF2E.skillList).filter(s => s !== 'lore')
        return SKILLNAMES.slice()
    },
    skillLabel: skill => {
        return game.i18n.localize(CONFIG.PF2E.skillList[skill])
    },
    createSkillRuleElement: ({ skill, value, mode = 'upgrade', predicate }) => {
        const rule = {
            key: 'ActiveEffectLike',
            mode,
            path: `system.skills.${skill}.rank`,
            value,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    createLoreSource: ({ name, rank }) => {
        const data = {
            type: 'lore',
            img: 'systems/pf2e/icons/default-icons/lore.svg',
            name,
            system: { proficient: { value: rank } },
        }
        return data
    },
    // Languages
    get languageNames() {
        LANGUAGES ??= Object.keys(CONFIG.PF2E.languages)
        return LANGUAGES.slice()
    },
    languageLabel: language => {
        return game.i18n.localize(CONFIG.PF2E.languages[language])
    },
    createLanguageRuleElement: ({ language, mode = 'add', predicate }) => {
        const rule = {
            key: 'ActiveEffectLike',
            mode,
            path: 'system.traits.languages.value',
            value: language,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    // resistances
    resistanceLabel: (resistance, value) => {
        let str = game.i18n.localize(`PF2E.Trait${capitalize(resistance)}`)
        if (value) str += ` ${value}`
        return str
    },
    createResistanceRuleElement: ({ type, value, predicate }) => {
        if (value === 'half') value = halfLevelString
        const rule = {
            key: 'Resistance',
            type,
            value,
        }
        if (predicate && predicate.length) rule.predicate = predicate
        return rule
    },
    // feats
    createFeatSource: async uuid => {
        const source = (await fromUuid(uuid))?.toObject()
        if (!source) throw new Error(`An error occured while trying to create a feat source with uuid: ${uuid}`)
        return source
    },
    // spells
    createSpellScrollSource: async ({ uuid, level }) => {
        const source = await createSpellScroll(uuid, level ?? false, true)
        if (!source) throw new Error(`An error occured while trying to create a spell scroll source with uuid: ${uuid}`)
        return source
    },
    createSpellSource: async uuid => {
        const source = (await fromUuid(uuid))?.toObject()
        if (!source) throw new Error(`An error occured while trying to create a spell source with uuid: ${uuid}`)
        return source
    },
    // Rule Elements
    get halfLevelString() {
        return halfLevelString
    },
    getChoiSetRuleSelection: (item, option) => {
        const rules = item._source.system.rules
        const rule = rules.find(rule => rule.key === 'ChoiceSet' && rule.rollOption === option)
        return rule?.selection
    },
    //
    proficiencyLabel: rank => {
        return game.i18n.localize(CONFIG.PF2E.proficiencyLevels[rank])
    },
    randomOption: async options => {
        const roll = (await new Roll(`1d${options.length}`).evaluate({ async: true })).total
        const result = options[roll - 1]
        if (typeof result === 'string') return result
        return result.value
    },
    halfLevelValue: actor => Math.max(1, Math.floor(actor.level / 2)),
    sequenceArray,
    // equipment
    damageLabel: damage => {
        return game.i18n.localize(CONFIG.PF2E.damageTypes[damage])
    },
    weaponTraitLabel: trait => {
        return game.i18n.localize(CONFIG.PF2E.weaponTraits[trait])
    },
    weaponPropertyRunesLabel: rune => {
        const key = `PF2E.WeaponPropertyRune.${rune}.Name`
        return game.i18n.localize(key)
    },
    hasFreePropertySlot: item => {
        const potency = item.system.runes.potency
        return potency > 0 && item.system.runes.property.length < potency
    },
    getFreePropertyRuneSlot: item => {
        const potency = item.system.potencyRune.value
        if (potency === null) return null

        for (let i = 0; i < potency; i++) {
            const property = RUNE_PROPERTY_KEYS[i]
            if (!item.system[property].value) return property
        }

        return null
    },
    // actor
    getPlayersActors: (member, ...types) => {
        if (!types.length) types = ['creature']

        let actors = game.actors

        if (member) {
            const members = getSetting('members') ? Array.from(member.parties ?? []).flatMap(p => p.members) : null

            if (members) actors = members
            else actors = actors.filter(a => a.hasPlayerOwner)

            if (member instanceof Actor) actors = actors.filter(a => a !== member)
        } else actors = actors.filter(a => a.hasPlayerOwner)

        return actors.filter(a => a.isOfType(...types))
    },
}

export function openDailiesInterface(actor) {
    if (!actor || !actor.isOfType('character') || !actor.isOwner) {
        const controlled = canvas.tokens.controlled
        actor = controlled.find(token => token.actor?.isOfType('character') && token.actor.isOwner)?.actor
        if (!actor) actor = game.user.character
    }

    if (!actor || !actor.isOfType('character') || !actor.isOwner) return warn('error.noCharacterSelected')

    if (getFlag(actor, 'rested') !== true) return warn('error.unrested')

    new DailiesInterface(actor, { title: localize('interface.title', { name: actor.name }) }).render(true)
}

export function requestDailies() {
    if (!game.user.isGM) return warn('error.notGM')
    createWatchChatMessage()
}

export function createUpdateCollection() {
    const collection = new Collection()
    return [
        collection,
        data => {
            const id = data._id
            if (!id) return
            const update = collection.get(id) ?? {}
            collection.set(id, mergeObject(update, data))
        },
    ]
}
