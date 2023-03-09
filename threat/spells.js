let DEBUGMODE = false;

let borders = {
    taunt: [3, "#ffa500"],
}

function getThreatCoefficient(values) {
    if (typeof values === "number") {
        values = {0: values};
    }
    if (!(0 in values)) values[0] = 1;
    return function (spellSchool = 0) {
        if (spellSchool in values) return values[spellSchool];
        return values[0];
    }
}

const preferredSpellSchools = {
    Mage: 16,		// Frost
    //Mage: 4,		// Fire
    //Mage: 62,		// Arcane
    Priest: 2,		// Holy
    Paladin: 2,		// Holy
    Warlock: 32,	// Shadow
    //Boomkin: 8,   // Nature
    // Others will be defaulted to 1 = physical
}

const baseThreatCoefficients = {
    Rogue: getThreatCoefficient(0.71),
    // Others will be defaulted to 1
}

const buffNames = {
    1308: "Hand of Salvation",
    71: "Defensive Stance",
    2457: "Battle Stance",
    2458: "Berserker Stance",
    5487: "Bear Form",
    9634: "Dire Bear Form",
    768: "Cat Form",
    25780: "Righteous Fury",
    48236: "Frost Presence",
    48266: "Blood Presence",
    48265: "Unholy Presence",
    35079: "Misdirection",
    2613: "Enchant : Threat on gloves",
    2621: "Enchant : Subtlety",
    50720: "Vigilance",
}

const buffMultipliers = {
    71: getThreatCoefficient(2.0735),	    // Defensive Stance
    2457: getThreatCoefficient(0.8),		// Battle Stance
    2458: getThreatCoefficient(0.8),		// Berserker Stance
    48236: getThreatCoefficient(2.0735),	// Frost Presence
    48266: getThreatCoefficient(0.8),		// Blood Presence
    48265: getThreatCoefficient(0.8),		// Unholy Presence
    5487: getThreatCoefficient(2.07),		// Bear Form
    9634: getThreatCoefficient(2.07),		// Dire Bear Form
    768: getThreatCoefficient(0.71),		// Cat Form
    25780: getThreatCoefficient(1.43),	    // Righteous Fury
    26400: getThreatCoefficient(0.3),		// Fetish of the Sand Reaver
    2613: getThreatCoefficient(1.02),		// gloves enchants
    2621: getThreatCoefficient(0.98),		// subtlety enchants
    292322: getThreatCoefficient(0),        // Loatheb fungal creep
    50720: getThreatCoefficient(0.9)        // Vigilance
}

// The leaf elements are functions (buffs,rank) => threatCoefficient
const talents = {
    Warrior: {
        "Improved Berserker Stance": {
            maxRank: 5,
            coeff: function (buffs, rank = 5) {
                if (!(2458 in buffs)) return getThreatCoefficient(1);
                return getThreatCoefficient(1 - 0.02 * rank * ((2458 in buffs)));
            }
        },
        "Tactical Mastery": {
            maxRank: 3,
            coeff: function (buffs, rank = 3, spellId) {
                if (!(71 in buffs)) return getThreatCoefficient(1);
                return getThreatCoefficient(
                    1 + 0.21 * rank * (spellId in {
                        23881: true, 23892: true, 23893: true, 23894: true, 23888: true, 23885: true, 23891: true, // Bloodthirst
                        12294: true, 21551: true, 21552: true, 21553: true, 25248: true, 30330: true, // Mortal Strike
                    }))
            }
        },
    },
    Druid: {
        "Subtlety": {
            maxRank: 5,
            coeff: (_, rank = 5, spellId) => getThreatCoefficient(1 - 0.04 * rank * (spellId in {
                48443: true, // Regrowth
                48441: true, // Rejuv
                48378: true, // Healing Touch
                48447: true, // Tranquility
                48451: true, // Lifebloom
                53251: true, // Wild Growth
                50464: true, // Nourish
            })),
        }, 
        "Nature's Reach": {
            maxRank: 2,
            coeff: (_, rank = 2, spellId) => getThreatCoefficient(1 - 0.15 * rank * (spellId in {
                48463: true, // Moonfire
                53201: true, // Starfall talent spell
                53190: true, // Starfall glyphed?
                53195: true, // Starfall unglyphed?
                48465: true, // Starfire
            })),
        }
    },
    Mage: {
        "Arcane Subtlety": {
            maxRank: 2,
            coeff: (_, rank = 2) => getThreatCoefficient({64: 1 - 0.2 * rank}),
        },
        "Burning Soul": {
            maxRank: 2,
            coeff: (_, rank = 2) => getThreatCoefficient({4: 1 - 0.1 * rank}),
        },
        "Frost Channeling": {
            maxRank: 3,
            coeff: (_, rank = 3) => getThreatCoefficient({16: 1 - 0.033333 * rank}),
        }
    },
    Paladin: {
        "Fanaticism": {
            maxRank: 3,
            coeff: function (buffs, rank = 0) {
                // Not modifying when righteous fury is up
                if ((25780 in buffs)) return getThreatCoefficient(1);
                return getThreatCoefficient(1 - (0.1 * rank));
            }
        }
    },

    Priest: {
        "Silent Resolve": {
            maxRank: 3,
            coeff: (_, rank = 5) => getThreatCoefficient(1 - 0.20/3 * rank),
        },
        "Shadow Affinity": {
            maxRank: 3,
            coeff: (_, rank = 3) => getThreatCoefficient({32: 1 - Math.floor(rank * 25 / 3) / 100}),
        }
    },
    Shaman: {
        "Healing Grace": {
            maxRank: 3,
            coeff: (_, rank = 3, spellId) => getThreatCoefficient(1 - 0.05 * rank * (spellId in {
                8004: true,
                8008: true,
                8010: true,
                10466: true,
                10467: true,
                10468: true, // Lesser Healing Wave
                331: true,
                332: true,
                547: true,
                913: true,
                939: true,
                959: true,
                8005: true,
                10395: true,
                10396: true,
                25357: true, // Healing Wave
                1064: true,
                10622: true,
                10623: true, // Chain Heal
            })),
        },
        "Spirit Weapons": {
            maxRank: 1,
            // Only for melee (1) attacks
            coeff: (_, rank = 1) => getThreatCoefficient({1: 1 - 0.3 * rank}),
        },
        "Elemental Precision (fire)": {
            maxRank: 3,
            // Fire (4), Nature (8), Frost (16)
            // TODO use for all schools
            coeff: (_, rank = 3) => getThreatCoefficient({4: 1 - 0.033333 * rank}),
        },
        "Elemental Precision (nature)": {
            maxRank: 3,
            // Fire (4), Nature (8), Frost (16)
            // TODO use for all schools
            coeff: (_, rank = 3) => getThreatCoefficient({8: 1 - 0.033333 * rank}),
        },
        "Elemental Precision (frost)": {
            maxRank: 3,
            // Fire (4), Nature (8), Frost (16)
            // TODO use for all schools
            coeff: (_, rank = 3) => getThreatCoefficient({16: 1 - 0.033333 * rank}),
        }
    },
    Warlock: {
        "Destructive Reach": {
            maxRank: 2,
            coeff: (_, rank = 2) => getThreatCoefficient(1 - 0.10 * rank),
        },
        "Improved Drain Soul": {
            maxRank: 2,
            coeff: (_, rank = 2) => getThreatCoefficient(1 - 0.10 * rank),
        }
    },
    DeathKnight: {
        "Subversion": {
            maxRank: 3,
            coeff: (buffs, rank = 3) => getThreatCoefficient(1 - 0.25/3 * rank * ((48265 in buffs) || (48266 in buffs))),
        }
    }
}

// These make dots green-bordered
const invulnerabilityBuffs = {
    642: "Divine Shield",
    10278: "Hand of Protection",
    11958: "Ice Block",
    19752: "Divine Intervention",
    6724: "Light of Elune",
    586: "Fade",
    55342: "Mirror Image",
    19263: "Deterrence",
}
// These make dots yellow-bordered
const aggroLossBuffs = {
    118: true, 12824: true, 12825: true, 28272: true, 28271: true, 12826: true, // Mages' Polymorph
    23023: true, // Razorgore Conflagrate
    23310: true, 23311: true, 23312: true, // Chromaggus Time Lapse
    22289: true, // Brood Power: Green
    20604: true, // Lucifron Dominate Mind
    24327: true, // Hakkar's Cause Insanity
    23603: true, // Nefarian: Wild Polymorph
    26580: true, // Princess Yauj: Fear
    28410: true, // Chains of Kel'Thuzad
    1038:  true, // Hand of Salvation,
}
// These make dots orange
const fixateBuffs = {
    355: true, // Taunt
    1161: true, // Challenging Shout
    5209: true, // Challenging Roar
    6795: true, // Growl
    694: true, 7400: true, 7402: true, 20559: true, 20560: true, // Mocking Blow
    29060: true, // Deathknight Understudy Taunt
    20736: true, // Distracting Shot
    56222: true, // Dark Command
    49576: true, // Death Grip
    62124: true, // Hand of Reckoning

}
// These make a dot in the graph on application and removal
// Also used for event filtering in fetchWCLreport
const notableBuffs = {
    29232: true, // Loatheb's fungal creep
    28410: true, // Chains of Kel'Thuzad
};

const stanceBuffs = {
    48236: true,  // Frost Presence,
    48266: true,  // Blood Presence,
    48265: true,  // Unholy Presence,
    71:    true,  // Defensive Stance
    2457:  true,  // Battle Stance
    2458:  true,  // Berserker Stance
    9634:  true,  // Dire Bear Form
    768:   true,  // Cat Form
}

for (let k in buffMultipliers) notableBuffs[k] = true;
for (let k in invulnerabilityBuffs) notableBuffs[k] = true;
for (let k in aggroLossBuffs) notableBuffs[k] = true;
for (let k in fixateBuffs) notableBuffs[k] = true;
for (let k in stanceBuffs) notableBuffs[k] = true;

const auraImplications = {
    Warrior: {
        7384: 2457, 7887: 2457, 11584: 2457, 11585: 2457, //Overpower
        100: 2457, 6178: 2457, 11578: 2457, //Charge
        694: 2457, 7400: 2457, 7402: 2457, 20559: 2457, 20560: 2457, //Mocking Blow
        20230: 2457, //Retaliation
        20252: 2458, 20617: 2458, 20616: 2458, //Intercept
        1680: 2458, //Whirlwind
        1719: 2458, //Recklessness
        6552: 2458, 6554: 2458, //Pummel
        355: 71, //Taunt
        676: 71, //Disarm
        6572: 71, 6574: 71, 7379: 71, 11600: 71, 11601: 71, 25288: 71, 25269: 71, 30357: 71, //Revenge
        2565: 71, //Shield Block
        871: 71, //Shield Wall
        
    },
    Druid: {
        26996: 9634, //Maul
        26997: 9634, // Bear Swipe
        26998: 9634, //Demoralizing Roar
        48564: 9634, // mangle bear
        48566: 768,  // mangle cat
        33745: 9634, // lacerate
        6795:  9634, //Growl
        5229:  9634, //Enrage
        17057: 9634, //Furor
        8983:  9634, //Bash
        48570: 768, //Claw
        48572: 768,  //Shred
        48574: 768, //Rake
        48577: 768, //Ferocious Bite
        48579: 768, //Ravage
        49800: 768, //Rip
        49803: 768, //Pounce
        9913:  768, //Prowl
        9846:  768, //Tiger's Fury
        36589: 768, //Dash
    },
    DeathKnight: {
        48236: 48236, // Frost Presence,
        48266: 48266, // Blood Presence,
        48265: 48265, // Unholy Presence,
        50475: 48266, // Blood presence self-heal
        49206: 48265, // Assume gary is cast in unholy presence to detect permanent UH stance
    }
}

const threatFunctions = {
    sourceThreatenTarget(ev, fight, amount, useThreatCoeffs = true, extraCoeff = 1) { // extraCoeff is only used for tooltip text
        let a = fight.eventToUnit(ev, "source");
        let b = fight.eventToUnit(ev, "target");
        if (!a || !b) {
            return;
        }
        let coeff = (useThreatCoeffs ? a.threatCoeff(ev.ability) : 1) * extraCoeff;
        let source = fight.units[ev.sourceID];
        if ((source instanceof Player) && (source.type == "Paladin")) { // Workaround to fix RF paladins for holy spells
            if (25780 in fight.units[ev.sourceID].buffs) {
                if (ev.ability.type == 2) {
                    coeff = 2.534;
                }
                else {
                    coeff = 1.43;
                }
            }
        }
        b.addThreat(a.key, amount, ev.timestamp, ev.ability.name, coeff);
    },
    unitThreatenEnemiesSplit(ev, unit, fight, amount, useThreatCoeffs = true) {
        let u = fight.eventToUnit(ev, unit);
        if (!u) return;
        let coeff = useThreatCoeffs ? u.threatCoeff(ev.ability) : 1;
        let [_, enemies] = fight.eventToFriendliesAndEnemies(ev, unit);
        let numEnemies = 0;

        if (splitHealingThreatOption) {
            for (let k in enemies) {
                if (enemies[k].alive) numEnemies += 1;
            }
            for (let k in enemies) {
                enemies[k].addThreat(u.key, amount / numEnemies, ev.timestamp, ev.ability.name, coeff);
            }
        } else {
            for (let k in enemies) {
                enemies[k].addThreat(u.key, amount, ev.timestamp, ev.ability.name, coeff);
            }
        }
    },
    unitThreatenEnemiesSplitOnHealRedirect(ev, unit, fight, amount) {
        let u = fight.eventToUnit(ev, unit);
        if (!u) return;
        let coeff;
        if (u.type === "Paladin") {
            // Only holy abilities (prayer of mending here) have coef
            coeff = u.threatCoeff(ev.ability);
        } else {
            coeff = u.threatCoeff();
        }
        let [_, enemies] = fight.eventToFriendliesAndEnemies(ev, unit);


        if (splitHealingThreatOption) {
            let numEnemies = 0;
            for (let k in enemies) {
                if (enemies[k].alive) numEnemies += 1;
            }
            for (let k in enemies) {
                enemies[k].addThreat(u.key, amount / numEnemies, ev.timestamp, ev.ability.name, coeff);
            }
        } else {
            for (let k in enemies) {
                enemies[k].addThreat(u.key, amount, ev.timestamp, ev.ability.name, coeff);
            }
        }
    },
    unitThreatenEnemies(ev, unit, fight, amount, useThreatCoeffs = true) {
        let u = fight.eventToUnit(ev, unit);
        if (!u) return;
        let coeff = useThreatCoeffs ? u.threatCoeff(ev.ability) : 1;
        let [_, enemies] = fight.eventToFriendliesAndEnemies(ev, unit);
        for (let k in enemies) {
            enemies[k].addThreat(u.key, amount, ev.timestamp, ev.ability.name, coeff);
        }
    },
    unitLeaveCombat(ev, unit, fight, text) {
        let u = fight.eventToUnit(ev, unit);
        if (!u) return;
        for (let k in fight.units) {
            if (!("threat" in fight.units[k]) || !(u.key in fight.units[k].threat)) continue;
            fight.units[k].setThreat(u.key, 0, ev.timestamp, text);
        }
    },
    threatWipe(sources, targets, time, text) {
        for (let a in sources) {
            let source = sources[a];
            for (let targetKey in targets) {
                source.setThreat(targetKey, 0, time, text);
            }
        }
    },
    concat() {
        return (ev, fight) => {
            for (let i = 0; i < arguments.length; ++i) { // Arguments is from outer func
                arguments[i](ev, fight);
            }
        };
    }
}

function handler_vanish(ev, fight) {
    if (ev.type !== "cast") return;
    threatFunctions.unitLeaveCombat(ev, "source", fight, ev.ability.name);
}

function handler_mindcontrol(ev, fight) {
    // Event target resets threat on everything on debuff apply and deapply.
    // Not sure if this is the real behaviour...
    if (ev.type === "applydebuff") {
        threatFunctions.unitLeaveCombat(ev, "target", fight, ev.ability.name);
    } else if (ev.type === "removedebuff") {
        threatFunctions.unitLeaveCombat(ev, "target", fight, ev.ability.name + " fades");
    }
}

function handler_resourcechange(ev, fight) {

    if (ev.type !== "resourcechange") return;
    let diff = ev.resourceChange - ev.waste;
    // Not sure if threat should be given to "target" instead...
    threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, (ev.resourceChangeType === 0) ? (diff / 2) : (diff * 5), false);
}

function handler_resourcechangeCoeff(ev, fight) {
    if (ev.type !== "resourcechange") return;
    let diff = ev.resourceChange - ev.waste;
    // Not sure if threat should be given to "target" instead...
    threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, (ev.resourceChangeType === 0) ? (diff / 2) : (diff * 5), true);
}

function handler_basic(ev, fight) {
    switch (ev.type) {
        case "damage":
            let source = fight.eventToUnit(ev, "source");
            if (source) {
                if (ev.sourceIsFriendly && source.handleMisdirectionDamage(ev.amount, ev, fight)) {} 
                else {
                    threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0));
                }
            }
            break;
        case "heal":
            if (ev.sourceIsFriendly !== ev.targetIsFriendly) return;
            threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, ev.amount / 2);
            break;
        case "resourcechange":
            if (DEBUGMODE) console.log("Unhandled resourcechange.", ev);
            handler_resourcechange(ev, fight);
            break;
        case "applybuff":
        case "refreshbuff":
        case "applybuffstack":
            if (DEBUGMODE) console.log("Unhandled buff.", ev);
            if (ev.sourceIsFriendly !== ev.targetIsFriendly) return;
            threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, 60);
            break;
        case "applydebuff":
        case "applydebuffstack":
        case "refreshdebuff":
            if (DEBUGMODE) console.log("Unhandled buff.", ev);
            if (ev.sourceIsFriendly !== ev.targetIsFriendly) return;
            threatFunctions.sourceThreatenTarget(ev, fight, 120);
            break;
        case "death":
        case "combatantinfo":
        case "encounterstart":
        case "encounterend":
        case "begincast":
        case "removebuffstack":
        case "removedebuffstack":
        case "extraattacks":
            break;
        default:
            if (DEBUGMODE) console.log("Unhandled event.", ev);
    }
}

function handler_mark(ev, fight) {
    if (ev.type !== "cast") return;
    if ("target" in ev && ev.target.id === -1) return; // Target is environment
    let a = fight.eventToUnit(ev, "source");
    let b = fight.eventToUnit(ev, "target");
    if (ev.ability.guid === 1) {
        a.lastTarget = b;
    }
    if (!a || !b) return;
    a.targetAttack(b.key, ev.timestamp, ev.ability.name);
    if (ev.ability.guid === 1 || ev.ability.guid < 0) {
        a.target = b;
    }
}

function handler_markSourceOnMiss(border) {
    return (ev, fight) => {
        if (ev.type !== "damage") return;
        if (ev.hitType !== 0 && ev.hitType <= 6) return;
        let a = fight.eventToUnit(ev, "source");
        let b = fight.eventToUnit(ev, "target");
        if (!a || !b) return;
        b.addMark(a.key, ev.timestamp, "Missed " + ev.ability.name, border);
    }
}

function handler_markSourceOnDebuff(border) {
    return (ev, fight) => {
        if (!["applydebuff", "applydebuffstack", "refreshdebuff"].includes(ev.type)) return;
        let a = fight.eventToUnit(ev, "source");
        let b = fight.eventToUnit(ev, "target");
        if (!a || !b) return;
        let s = ev.ability.name;
        //if (ev.type === "removedebuff") s += " fades";
        b.addMark(a.key, ev.timestamp, s, border);
    }
}

function handler_zero() {
}

function handler_castCanMiss(threatValue) {
    return (ev, fight) => {
        let t = ev.type;
        if (t === "cast") {
            threatFunctions.sourceThreatenTarget(ev, fight, threatValue);
        } else if (t === "damage") {
            threatFunctions.sourceThreatenTarget(ev, fight, -threatValue);
        }
    }
}

function handler_castCanMissNoCoefficient(threatValue) {
    return (ev, fight) => {
        let t = ev.type;
        if (t === "cast") {
            threatFunctions.sourceThreatenTarget(ev, fight, threatValue, false);
        } else if (t === "damage") {
            threatFunctions.sourceThreatenTarget(ev, fight, -threatValue, false);
        }
    }
}

function handler_modDamage(multiplier) {
    return (ev, fight) => {
        if (ev.type !== "damage") return;
        threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0), true, multiplier);
    }
}

function handler_mangleModDamage() {
    return (ev, fight) => {
        if (ev.type !== "damage") return;
        let source = fight.eventToUnit(ev, "source");
        let multiplier = (1 + (1.5 - 1.15) / 1.15);
        if (source.nbDruidT6Part >= 2) {
            multiplier = 1.5;
        }
        threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0), true, multiplier);
    }
}

function handler_modHeal(multiplier) {
    return (ev, fight) => {
        if (ev.type !== "heal") return;
        threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, multiplier * ev.amount / 2);
    }
}

function handler_modHealPlusThreat(multiplier, bonus) {
    return (ev, fight) => {
        if (ev.type !== "heal") return;
        threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, multiplier * ev.amount / 2);
        threatFunctions.sourceThreatenTarget(ev, fight, bonus);
    }
}

function handler_modDamagePlusThreat(multiplier, bonus) {
    return (ev, fight) => {
        if (ev.type !== "damage" || ev.hitType > 6 || ev.hitType === 0) return;
        threatFunctions.sourceThreatenTarget(ev, fight, multiplier * (ev.amount + (ev.absorbed || 0)) + bonus);
    }
}

function handler_damage(ev, fight) {
    if (ev.type !== "damage") return;
    let source = fight.eventToUnit(ev, "source");
    let MD = source.handleMisdirectionDamage(ev.amount, ev, fight);
    if (!MD) {
        threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0))
    }
}

function handler_heal(ev, fight) {
    if (ev.type !== "heal") return;
    threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, ev.amount / 2);
}

function handler_threatOnHit(threatValue) {
    return (ev, fight) => {
        if (ev.type !== "damage" || ev.hitType > 6 || ev.hitType === 0) return;
        threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0) + threatValue);
    }
}

function getAttackPower(sourceUnit) {
    if (sourceUnit.lastAttackPower)
        return sourceUnit.lastAttackPower;
    else return 5200; // Major fix required here, pending some decent way to query AP
}

function setAttackPower(sourceUnit, ev) {
    if (ev.attackPower != 0 && ev.type != 'damage') // Shockwave event has 0 AP if it's a damage event
        sourceUnit.lastAttackPower = ev.attackPower;
}


function handler_sunderArmor(threatValue) {
    return (ev, fight) => {
        if (ev.type === "cast") {
            let sunderThreat = getAttackPower(fight.friendlies[ev.sourceID])  * .05 + threatValue; // Needs fix to query AP
            threatFunctions.sourceThreatenTarget(ev, fight, sunderThreat);
            return;
        }
    }
}

function handler_bloodthirst(ev, fight) {
    if (ev.type === "cast") 
        setAttackPower(fight.friendlies[ev.sourceID], ev);
    else if (ev.type == "damage")
        threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0));
}

function handler_shockwave(ev, fight) {
    if (ev.type == 'cast') 
        setAttackPower(fight.friendlies[ev.sourceID], ev);
    else {
        threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0));
    }
}

function handler_devastate(devastateValue) {
    return (ev, fight) => {
        if (ev.type !== "damage" || ev.hitType > 6 || ev.hitType === 0) return;
        let devThreat = getAttackPower(fight.friendlies[ev.sourceID])  * .05 + ev.amount + (ev.absorbed || 0) + devastateValue;
        threatFunctions.sourceThreatenTarget(ev, fight, devThreat);
    }
}



function handler_icy_touch(ev, fight) {
        let source = fight.eventToUnit(ev, "source");
        let coeff = 1.0;
        if (source.buffs[48236] && (source.buffs[48236] == true)) {
            coeff = 7.0;
        }
        threatFunctions.sourceThreatenTarget(ev, fight, ((ev.amount + (ev.absorbed || 0)) || 0), true, coeff);
}

function handler_frost_presence(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[48236] = true; // Frost Presence
    source.buffs[48266] = false; // Blood Presence
    source.buffs[48265] = false; // Unholy Presence
}

function handler_blood_presence(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[48236] = false; // Frost Presence
    source.buffs[48266] = true; // Blood Presence
    source.buffs[48265] = false; // Unholy Presence
}

function handler_unholy_presence(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[48236] = false; // Frost Presence
    source.buffs[48266] = false; // Blood Presence
    source.buffs[48265] = true; // Unholy Presence
}

function handler_dire_bear_form(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[9634] = true;
    source.buffs[768] = false;
}

function handler_cat_form(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[9634] = false;
    source.buffs[768] = true;
}

function handler_dire_bear_form(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[9634] = true;
    source.buffs[768] = false;
}

function handler_cancel_form(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[9364] = false;
    source.buffs[768] = false;
    if (ev.type !== "damage") return;
    threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0));
}

function handler_defensive_stance(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[71] = true; // Defensive Stance
    source.buffs[2457] = false; // Battle Stance
    source.buffs[2458] = false; // Berserker Stance
}

function handler_battle_stance(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[71] = false; // Defensive Stance
    source.buffs[2457] = true; // Battle Stance
    source.buffs[2458] = false; // Berserker Stance
}

function handler_berserker_stance(ev, fight) {
    let source = fight.eventToUnit(ev, "source");
    source.buffs[71] = false; // Defensive Stance
    source.buffs[2457] = false; // Battle Stance
    source.buffs[2458] = true; // Berserker Stance
}

function handler_threatAsTargetHealed(ev, fight) {
    if (ev.type === "cast") return;
    threatFunctions.unitThreatenEnemiesSplitOnHealRedirect(ev, "target", fight, ev.amount / 2);
}

function handler_bossDropThreatOnHit(pct) {
    return (ev, fight) => {
        // hitType 0=miss, 7=dodge, 8=parry, 10 = immune, 14=resist, ...
        // https://discordapp.com/channels/383596811517952002/673932163736928256/714590608819486740
        // [00:27] ResultsMayVary: Just to expand on this. Spell threat drops (resists) cause threat loss. Physical misses (dodges/parries) do not cause threat drops.
        if (ev.type !== "damage" || (ev.hitType > 6 && ev.hitType !== 10 && ev.hitType !== 14) || ev.hitType === 0) return;
        let a = fight.eventToUnit(ev, "source");
        let b = fight.eventToUnit(ev, "target");
        if (!a || !b) return;
        a.checkTargetExists(b.key, ev.timestamp);
        a.setThreat(b.key, a.threat[b.key].currentThreat * pct, ev.timestamp, ev.ability.name);
    }
}

function handler_ChainsOfKelThuzad(ev, fight) {
    let a = fight.eventToUnit(ev, "source");
    let b = fight.eventToUnit(ev, "target");
    if (!a || !b) return;
    a.checkTargetExists(b.key, ev.timestamp);
    a.setThreat(b.key, 0, ev.timestamp, ev.ability.name);
}

function handler_BlackHole(ev, fight) {
    
    let a = fight.eventToUnit(ev, "source");
    let b = fight.eventToUnit(ev, "target");
    if (!b || b.type == "Pet") return;

    let [_, enemies] = fight.eventToFriendliesAndEnemies(ev, "source");

    for (let k in enemies) {
        enemies[k].setThreat(b.key, 0, ev.timestamp, ev.ability.name);
    }
}

let lastSpellReflectEvent;

function handler_spellReflectCast(ev) {
    lastSpellReflectEvent = ev;
}

function handler_selfDamageOnSpellReflect() {
    return (ev, fight) => {

        if (ev.targetIsFriendly === false) {
            let a = fight.eventToUnit(ev, "source");
            let b = fight.eventToUnit(ev, "target");
            if (!a || !b) return;

            if (lastSpellReflectEvent) {
                if ((ev.timestamp - lastSpellReflectEvent.timestamp) < 5000) {
                    let source = fight.eventToUnit(lastSpellReflectEvent, "source");
                    let target = fight.eventToUnit(ev, "target");

                    target.addThreat(source.key, ev.amount, ev.timestamp, ev.ability.name + " (Spell Reflect)", source.threatCoeff(ev.ability));
                }
            }
        }
    }
}

function handler_hatefulstrike(mainTankThreat) {
    return (ev, fight) => {
        // hitType 0=miss, 7=dodge, 8=parry, 10 = immune, 14=resist, ...
        if ((ev.type !== "damage") || (ev.hitType > 6 && ev.hitType !== 10 && ev.hitType !== 14) || ev.hitType === 0) return;
        let source = fight.eventToUnit(ev, "source");
        let target = fight.eventToUnit(ev, "target");
        if (!source || !target) return;

        let meleeRangedThreat = [];
        let [friendlies, enemies] = fight.eventToFriendliesAndEnemies(ev, "target");
        for (k in friendlies) {

            let x1 = ev.x - friendlies[k].lastX;
            let y1 = ev.y - friendlies[k].lastY;

            let c = Math.sqrt(x1 * x1 + y1 * y1);

            if (c < 1400) {
                // Arbitraty distance of 1400, we don't really know the exact
                //console.log(friendlies[k].name + " is in melee range of patchwerk")

                // Order patchwerk threat list, take the first 4th in this condition

                if (source.threat[k]) {
                    let threat = {};
                    threat = {
                        'threat': source.threat[k].currentThreat,
                        'unit': friendlies[k]
                    }
                    meleeRangedThreat.push(threat);
                }
            }
        }
        sortByKey(meleeRangedThreat, 'threat');
        let topThreeThreatInMelee = meleeRangedThreat.slice(-3)

        for (let top in topThreeThreatInMelee) {
            source.addThreat(topThreeThreatInMelee[top].unit.key, mainTankThreat, ev.timestamp, ev.ability.name, 1);
        }
    }
}

function sortByKey(array, key) {
    return array.sort(function (a, b) {
        var x = a[key];
        var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function handler_bossDropThreatOnDebuff(pct) {
    return (ev, fight) => {
        if (ev.type !== "applydebuff") return;
        let a = fight.eventToUnit(ev, "source");
        let b = fight.eventToUnit(ev, "target");
        if (!a || !b) return;
        a.checkTargetExists(b.key, ev.timestamp);
        a.setThreat(b.key, a.threat[b.key].currentThreat * pct, ev.timestamp, ev.ability.name);
    }
}

function handler_bossDropThreatOnCast(pct) {
    return (ev, fight) => {
        if (ev.type !== "cast") return;
        let a = fight.eventToUnit(ev, "source");
        let b = fight.eventToUnit(ev, "target");
        if (!a || !b) return;
        a.checkTargetExists(b.key, ev.timestamp);
        a.setThreat(b.key, a.threat[b.key].currentThreat * pct, ev.timestamp, ev.ability.name);
    }
}

function handler_bossThreatWipeOnCast(ev, fight) {
    if (ev.type !== "cast") return;
    let u = fight.eventToUnit(ev, "source");
    if (!u) return;
    for (let k in u.threat) {
        u.setThreat(k, 0, ev.timestamp, ev.ability.name);
    }
}

function handler_hydrossThreatWipeOnCast(ev, fight) {
    if (ev.type !== "cast") return;
    let u = fight.eventToUnit(ev, "source");

    let [enemies, _] = fight.eventToFriendliesAndEnemies(ev, u);

    for (let i in enemies) {
        if (enemies[i].alive) {
            for (let k in enemies[i].threat) {
                enemies[i].setThreat(k, 0, ev.timestamp, "Change phase");
            }
        }
    }
}

function handler_leotherasWhirlwind(ev, fight) {

    if (ev.type !== "applybuff" && ev.type !== "removebuff") return;
    let u = fight.eventToUnit(ev, "source");

    let [enemies, _] = fight.eventToFriendliesAndEnemies(ev, u);

    for (let i in enemies) {
        if (enemies[i].alive) {
            for (let k in enemies[i].threat) {
                enemies[i].setThreat(k, 0, ev.timestamp, "Whirlwind threat reset");
            }
        }
    }
}

function handler_VashjBarrier(ev, fight) {

    if (ev.type !== "applybuff" && ev.type !== "removebuff") return;
    let t = fight.eventToUnit(ev, "target");

    for (let k in t.threat) {
        t.setThreat(k, 0, ev.timestamp, "Barrier threat reset");
    }
}

function handler_nightbaneThreatWipeOnCast(delay) {
    return (ev, fight) => {
        if (ev.type !== "cast") return;
        let u = fight.eventToUnit(ev, "source");
        nightBaneNextLanding = (ev.timestamp + delay);
        if (!u) return;
        for (let k in u.threat) {
            u.setThreat(k, 0, ev.timestamp, ev.ability.name);
        }
    }
}

function handler_illidanEndP2ThreatWipeOnCast(ev, fight) {
    if (ev.type !== "cast") return;
    let u = fight.eventToUnit(ev, "source");

    let [enemies, _] = fight.eventToFriendliesAndEnemies(ev, u);

    for (let i in enemies) {
        if (enemies[i].alive) {
            for (let k in enemies[i].threat) {
                enemies[i].setThreat(k, 0, ev.timestamp, "Change phase");
            }
        }
    }
}

function handler_bossPartialThreatWipeOnCast(pct) {
    return (ev, fight) => {
        if (ev.type !== "cast") return;
        let u = fight.eventToUnit(ev, "source");
        if (!u) return;
        for (let k in u.threat) {
            u.setThreat(k, u.threat[k].currentThreat * pct, ev.timestamp, ev.ability.name);
        }
    }
}

function handler_partialThreatWipeOnCast(pct) {
    return (ev, fight) => {
        if (ev.type !== "cast") return;
        let u = fight.eventToUnit(ev, "source");
        if (!u) return;
        let [_, enemies] = fight.eventToFriendliesAndEnemies(ev, "source");
        for (let k in enemies) {
            // Double check if units are still valid
            if (enemies[k].threat) {
                if (enemies[k].threat[u.key]) {
                    enemies[k].setThreat(u.key, enemies[k].threat[u.key].currentThreat * pct, ev.timestamp, ev.ability.name);
                }
            }
        }
    }
}

function handler_partialThreatWipeOnEvent(pct) {
    return (ev, fight) => {
        if (ev.type !== "applybuff" && ev.type !== "removebuff") return;
        let u = fight.eventToUnit(ev, "target");
        if (!u) return;

        let [_, enemies] = fight.eventToFriendliesAndEnemies(ev, "source");

        for (let k in enemies) {
            if (enemies[k].threat) {
                if (enemies[k].threat[u.key]) {
                    if (ev.type === "applybuff") {
                        u.setLastInvisibility(ev.timestamp);
                        enemies[k].setThreat(u.key, enemies[k].threat[u.key].currentThreat * (1 - pct), ev.timestamp, ev.ability.name);
                    } else if (ev.type === "removebuff") {

                        let timeElapsed = ev.timestamp - u.lastInvisibility;
                        let nbSecondElapsed = Math.floor(timeElapsed / 1000);
                        let currentThreat = enemies[k].threat[u.key].currentThreat;

                        let timeToFade = 0.0;
                        if (ev.ability.name == "Invisibility")
                            timeToFade = 3.0;
                        else if (ev.ability.name == "Hand of Salvation") 
                            timeToFade = 10.0;
                        else 
                            console.log("Unknown invisibility type: " + ev.name);

                        // scale up by x%
                        currentThreat = currentThreat * (1 + (pct / (1 - pct)));
                        // Then remove threat for the amount of time spent in invis
                        currentThreat = currentThreat * (1-(pct * timeToFade * nbSecondElapsed / timeToFade));

                        enemies[k].setThreat(u.key, currentThreat, ev.timestamp, ev.ability.name);
                    }
                }
            }
        }
    }
}

function handler_threatOnDebuff(threatValue) {
    return (ev, fight) => {
        let t = ev.type;
        if (t !== "applydebuff" && t !== "refreshdebuff") return;
        threatFunctions.sourceThreatenTarget(ev, fight, threatValue);
    }
}

function handler_threatOnDebuffOrDamage(threatValue) {
    return (ev, fight) => {
        let t = ev.type;
        if (t === "applydebuff") {
            threatFunctions.sourceThreatenTarget(ev, fight, threatValue);
        } else if (t === "damage") {
            threatFunctions.sourceThreatenTarget(ev, fight, ev.amount + (ev.absorbed || 0));
        }
    }
}


// https://zidnae.gitlab.io/tbc-armor-penetration-calc/tbc_bear_tc.html
function handler_lacerate(threatValue, tickMultiplier) {
    return (ev, fight) => {

        // miss dodge ect
        if (ev.type !== "damage" || ev.hitType > 6 || ev.hitType === 0) return;

        if (ev.tick) {
            threatFunctions.sourceThreatenTarget(ev, fight, (ev.amount + (ev.absorbed || 0)) * tickMultiplier);
            return;
        }
        threatFunctions.sourceThreatenTarget(ev, fight, (ev.amount + (ev.absorbed || 0)) + threatValue);
    }
}

function handler_threatOnBuff(threatValue) {
    return (ev, fight) => {
        let t = ev.type;
        if (t !== "applybuff" && t !== "refreshbuff") return;
        let useCoeff = true;
        threatFunctions.unitThreatenEnemiesSplit(ev, "source", fight, threatValue, useCoeff);
    }
}

// From my testing, battle and commanding shout aren't splitting threat on tbc anymore
// Also used for pet food bug
function handler_threatOnBuffUnsplit(threatValue, useCoeff) {
    return (ev, fight) => {
        let t = ev.type;
        if (t !== "applybuff" && t !== "refreshbuff") return;
        threatFunctions.unitThreatenEnemies(ev, "source", fight, threatValue, useCoeff);
    }
}

function handler_righteousDefense(ev, fight) {

    let target = fight.eventToUnit(ev, "target");
    let source = fight.eventToUnit(ev, "source");


    if (!target || !source) return;

    let maxThreat = 0;

    let [enemies, _] = fight.eventToFriendliesAndEnemies(ev, source);
    for (let j in enemies) {

        if (enemies[j].alive === false || enemies[j].lastTarget == null){
            continue;
        }
        if ((enemies[j].lastTarget.global != null) && enemies[j].threat[enemies[j].lastTarget.global.id] != null) {
            maxThreat = Math.max(maxThreat, enemies[j].threat[enemies[j].lastTarget.global.id].currentThreat);
        }
        if (maxThreat !== 0) {
            enemies[j].setThreat(source.key, maxThreat, ev.timestamp, ev.ability.name);
            enemies[j].target = source;
        }
    }
}

function handler_taunt(ev, fight) {
    if (ev.type !== "applydebuff") return;
    let u = fight.eventToUnit(ev, "target");
    let v = fight.eventToUnit(ev, "source");
    if (!u || !v) return;
    if (!("threat" in u)) return;
    let maxThreat = 0;
    for (let k in u.threat) {
        maxThreat = Math.max(maxThreat, u.threat[k].currentThreat);
    }
    u.setThreat(v.key, maxThreat, ev.timestamp, ev.ability.name);
    u.target = v;
}

function handler_timelapse(ev, fight) {
    if (ev.type !== "applydebuff") return;
    let u = fight.eventToUnit(ev, "source");
    let v = fight.eventToUnit(ev, "target");
    if (!u || !v) return;
    u.setThreat(v.key, u.threat[v.key].currentThreat * v.threatCoeff(), ev.timestamp, ev.ability.name);
}

const spellFunctions = {

    18670: handler_bossDropThreatOnHit(0.5), // Broodlord Knock Away

    10101: handler_bossDropThreatOnHit(0.5), // Knock Away variants
    18813: handler_bossDropThreatOnHit(0.5),
    18945: handler_bossDropThreatOnHit(0.5),
    20686: handler_bossDropThreatOnHit(0.5),
    23382: handler_bossDropThreatOnHit(0.5),
    30121: handler_bossDropThreatOnHit(0.5),
    32077: handler_bossDropThreatOnHit(0.5),
    32959: handler_bossDropThreatOnHit(0.5),
    37597: handler_bossDropThreatOnHit(0.5),
    23339: handler_bossDropThreatOnHit(0.5), // BWL Wing Buffet
    18392: handler_bossDropThreatOnCast(0), // Onyxia Fireball
    19633: handler_bossDropThreatOnHit(.75), // Onyxia Knock Away
    25778: handler_bossDropThreatOnHit(.75), // Void Reaver, Fathom Lurker, Fathom Sporebat, Underbog Lord, Knock Away
    31389: handler_bossDropThreatOnHit(.75), // Knock Away Generic
    37102: handler_bossDropThreatOnHit(.75), // Crystalcore Devastator (TK) Knock Away
    30013: handler_bossThreatWipeOnCast, // Disarm (etheral thief in kara) removes threat
    20534: handler_bossDropThreatOnCast(0), // Majordomo Teleport
    20566: handler_bossThreatWipeOnCast, // Wrath of Ragnaros
    23138: handler_bossThreatWipeOnCast, // Gate of Shazzrah
    22289: handler_bossDropThreatOnDebuff(0.5), // Brood Power: Green
    24408: handler_bossThreatWipeOnCast, // Bloodlord Mandokir's Charge
    24690: handler_bossDropThreatOnDebuff(0), // Hakkar's Aspect of Arlokk
//20604: handler_mindcontrol, // Lucifron Dominate Mind
    "-1": handler_bossThreatWipeOnCast, // Custom threat drop, currently for High Priestess Arlokk
    23310: handler_timelapse,
    23311: handler_timelapse,
    23312: handler_timelapse,
    800: function (ev, fight) { // Twin Emperors' Twin Teleport
        if (ev.type !== "applybuff") return;
        let u = fight.eventToUnit(ev, "source");
        for (let k in u.threat) {
            u.setThreat(k, 0, ev.timestamp, ev.ability.name);
        }
    },
    26102: handler_bossDropThreatOnHit(0), // Ouro's Sand Blast
    26580: handler_bossDropThreatOnHit(0), // Yauj's Fear
    26561: handler_bossThreatWipeOnCast, // Vem's Berserker Charge
    11130: handler_bossDropThreatOnHit(0.5), // Qiraji Champion's Knock Away, need to confirm pct
    28410: handler_ChainsOfKelThuzad, // Kel'Thuzad's Chains of Kel'Thuzad
    62169: handler_BlackHole,         // Algalon Black Hole
    33237: handler_bossThreatWipeOnCast, // Kiggler the Crazed arcane explosion - HKM fight
    //37676: handler_nightbaneThreatWipeOnCast((43 * 1000)), // Leotheras demon form
    37098: handler_nightbaneThreatWipeOnCast((43 * 1000)), // Nightbane's Rain of Bones. delay : 43 sec is the timer according to DBM
    29060: handler_taunt, // Deathknight Understudy Taunt
    //28835: handler_bossPartialThreatWipeOnCast(.5), // Mark of Zeliek - no threat drop in WOTLK
    //28834: handler_bossPartialThreatWipeOnCast(.5), // Mark of Mograine - no threat drop in WOTLK
    //28833: handler_bossPartialThreatWipeOnCast(.5), // Mark of Blaumeux - no threat drop in WOTLK
    //28832: handler_bossPartialThreatWipeOnCast(.5), // Mark of Korth'azz - no threat drop in WOTLK

    /*  SSC */
    25035: handler_hydrossThreatWipeOnCast, // Hydross invoc spawns
    37640: handler_leotherasWhirlwind, // Leotheras WW
    38112: handler_VashjBarrier, // Vashj Barrier

    /* BT */
    41470: handler_selfDamageOnSpellReflect, // Council, for spell reflect
    40486: handler_bossDropThreatOnHit(0.75), // Gurtog Bloodboil
    40597: handler_bossDropThreatOnHit(0.75), // Gurtog Bloodboil - Eject

    40618: handler_zero, // Gurtog Bloodboil insignificance
    41476: handler_bossThreatWipeOnCast, // Veras (Council)
    39635: handler_bossThreatWipeOnCast, // Illidan Throw glaive (P2)
    39873: handler_illidanEndP2ThreatWipeOnCast, // Illidan Glaive return (End of P2)
    // 40683: handler_bossThreatWipeOnCast, // Illidan enrage
    40647: handler_bossThreatWipeOnCast, // Illidan Shadow prison
    29208: handler_bossThreatWipeOnCast, // Noth blink (first spell id)
    29210: handler_bossThreatWipeOnCast, // Noth blink (second spell id)

    59192: handler_hatefulstrike(0), // Patchwerk's hateful strike. TODO: Check WOTLK threat value, just an approximation now

    //17624: handler_vanish, // Flask of Petrification

    // Trinkets
    35163: handler_zero, // Blessing of the Silver Crescent
    34106: handler_zero, // Arpen from bloodfurnance
    35166: handler_zero, // Bloodlust brooch
    28866: handler_zero, // Kiss of the spider
    26480: handler_zero, // Badge of the Swarmguard
    26481: handler_zero, // Badge of the Swarmguard - arpen
    33649: handler_zero, // Hourglass of the Unraveller - GT2 trinket
    51955: handler_zero, // Dire Drunkard

    // Gear proc
    21165: handler_zero, // Blacksmith mace

    // Enchant proc
    28093: handler_zero, // Lightning speed - mongoose weapon

// Paladin
    20217: handler_threatOnBuff(20), // BoK
    43223: handler_threatOnBuff(60), // GBoK
    48932: handler_threatOnBuff(79), // BOM
    48934: handler_threatOnBuff(79), // GBoM
    6940: handler_threatOnBuff(60), // Hand of Sac //TODO: Check threat value
    20911: handler_threatOnBuff(60), // BoSanc //TODO: Check threat value
    25899: handler_threatOnBuff(60), // GBoSanc //TODO: Check threat value
    48936: handler_threatOnBuff(54), // BoW
    48938: handler_threatOnBuff(54), // GBoW
    53601: handler_threatOnBuff(28), // Sacred Shield
    21084: threatFunctions.concat(handler_threatOnBuff(0), handler_damage), // Seal of Righteousness
    20424: threatFunctions.concat(handler_threatOnBuff(14), handler_damage), // Seal of Command
    20286: handler_damage, // Judgement of Righteousness
    20467: handler_damage, // Judgement of Command
    48819: handler_damage, // Consecration
    48806: handler_damage, // Hammer of Wrath
    48801: handler_damage, // Exorcism
    61411: handler_damage, // Shield of Righteousness
    53595: handler_damage, // Hammer of the Righteous
    48952: handler_damage, // Holy Shield
    20424: handler_damage, // Seal of Command
    48952: handler_damage, // Holy Shield
    48827: handler_damage, // Avenger's Shield
    1038: handler_partialThreatWipeOnEvent(0.02), // hand of salv; 2% per threat for 10s untalented

    31789: threatFunctions.concat(handler_righteousDefense, handler_markSourceOnMiss(borders.taunt)), // Righteous Defense
    62124: threatFunctions.concat(handler_taunt, handler_damage, handler_markSourceOnMiss(borders.taunt)), // Hand of Reckoning
    53409: handler_zero, // Mana from Judgement of Wisdom

    48942: handler_zero, // Devotion Aura
    19746: handler_zero, // Concentration Aura
    48947: handler_zero, // Fire Resistance Aura
    48945: handler_zero, // Frost Resistance Aura
    48943: handler_zero, // Shadow Resistance Aura
    54043: handler_zero, // Retribution Aura
    31821: handler_zero, // Aura Mastery

    48782: handler_modHeal(.5), // Holy Light
    48785: handler_modHeal(.5), // Flash of Light
    53652: handler_modHeal(.5), // Beacon of Light
    48788: handler_modHeal(.5), // Lay on Hands
    54968: handler_modHeal(.5), // Glyph of Holy Light
    48821: handler_modHeal(.5), // Holy Shock
    66922: handler_modHeal(.5), // Flash of Light HoT
    19968: handler_modHeal(.5), // Holy Light that appears in logs
    19993: handler_modHeal(.5), // Flash of Light that appears in logs

// Mage
    10181: handler_damage, // Frostbolt
    66: handler_partialThreatWipeOnEvent(.333333), // invisibility : 20% per second of buff

// Rogue
    1856: handler_vanish,
    1857: handler_vanish, // Vanish
    26889: handler_vanish, // Vanish
    25302: handler_castCanMissNoCoefficient(-1535), // Feint; Wowhead value is 2162, supposedly still modded by 0.71

// Priest
    6788: handler_zero, // Weakened Soul

    48127: handler_damage, // Mind Blast

    48076: handler_zero, // Holy Nova heal
    48078: handler_zero, // Holy Nova damage
    // TODO: fade suspension

// Warlock
    47867: handler_threatOnDebuffOrDamage(160), // Curse of Doom
    18223: handler_zero, // Curse of Exhaustion
    50511: handler_threatOnDebuff(142), // Curse of Weakness
    17937: handler_threatOnDebuff(112), // Curse of Elements
    11719: handler_threatOnDebuff(100), // Curse of Tongues
    1454: handler_zero, // Life Tap r1
    1455: handler_zero, // Life Tap r2
    1456: handler_zero, // Life Tap r3
    11687: handler_zero, // Life Tap r4
    11688: handler_zero, // Life Tap r5
    11689: handler_zero, // Life Tap r6
    27222: handler_zero, // Life Tap r7
    57946: handler_zero, // Life Tap r8
    31818: handler_zero, // Life Tap script
    5138: handler_zero, // Drain Mana
    689: handler_damage, // Drain Life r1
    699: handler_damage, // Drain Life r2
    709: handler_damage, // Drain Life r3
    7651: handler_damage, // Drain Life r4
    11699: handler_damage, // Drain Life r5
    11700: handler_damage, // Drain Life r6
    11700: handler_damage, // Drain Life r7
    63106: handler_modHeal(.5), //Siphon Life
    47856: handler_modHeal(.5), //Blood Funnel
    47893: handler_modHeal(0.0), //Fel Armor
    54181: handler_modHeal(0.0), //Fel Synergy
    710: handler_threatOnDebuff(56), // Banish r1
    18647: handler_threatOnDebuff(56), // Banish r2
    6215: handler_threatOnDebuff(112), // Fear
    172: handler_damage, // Corruption r1
    6222: handler_damage, // Corruption r2
    6223: handler_damage, // Corruption r3
    7648: handler_damage, // Corruption r4
    11671: handler_damage, // Corruption r5
    11672: handler_damage, // Corruption r6
    25311: handler_damage, // Corruption r7
    47812: handler_damage, // Corruption r8
    47813: handler_damage, // Corruption r9
    980: handler_damage, // CoA r1
    1014: handler_damage, // CoA r2
    6217: handler_damage, // CoA r3
    11711: handler_damage, // CoA r4
    11712: handler_damage, // CoA r5
    11713: handler_damage, // CoA r6
    27218: handler_damage, // CoA r7
    47863: handler_damage, // CoA r8
    47864: handler_damage, // CoA r9
    47860: handler_damage, // Death Coil - healing does 0 threat
    1120: handler_damage, // Drain Soul r1
    8288: handler_damage, // Drain Soul r2
    8289: handler_damage, // Drain Soul r3
    11675: handler_damage, // Drain Soul r4
    27217: handler_damage, // Drain Soul r5
    47855: handler_damage, // Drain Soul r6
    50577: handler_threatOnDebuff(2 * 40), // Howl of Terror r1
    17928: handler_threatOnDebuff(2 * 54), // Howl of Terror r2
    47815: handler_modDamage(2), // Searing Pain r10


    //29858: handler_bossDropThreatOnCast(0.5),// Soulshatter
    29858: handler_partialThreatWipeOnCast(.5),// Soulshatter

    //hunter
    // 43771: handler_threatOnBuffUnsplit(5000, false, "Pet Feeding"), // Pet food (bugged?) in current tbc - 20 str
    // 33272: handler_threatOnBuffUnsplit(5000, false, "Pet Feeding"), // Pet food (bugged?) in current tbc - Sporeggar
    // Bug fixed https://tbc.wowhead.com/news/burning-crusade-classic-hotfixes-for-october-4th-2021-kiblers-bits-threat-324414

// Shaman
    8042: handler_modDamage(1), // Earth Shock r1
    8044: handler_modDamage(1), // Earth Shock r2
    8045: handler_modDamage(1), // Earth Shock r3
    8046: handler_modDamage(1), // Earth Shock r4
    10412: handler_modDamage(1), // Earth Shock r5
    10413: handler_modDamage(1), // Earth Shock r6
    10414: handler_modDamage(1), // Earth Shock r7
    25454: handler_modDamage(1), // Earth Shock r8
    49230: handler_modDamage(1), // Earth Shock r9
    49231: handler_modDamage(1), // Earth Shock r10
    193796: handler_modDamage(1), // Flametongue Attack
    61654: handler_modDamage(1), // Fire Nova


    8056: handler_modDamage(2), // Frost Shock r1
    8058: handler_modDamage(2), // Frost Shock r2
    10472: handler_modDamage(2), // Frost Shock r3
    10473: handler_modDamage(2), // Frost Shock r4
    25464: handler_modDamage(2), // Frost Shock r5
    49235: handler_modDamage(2), // Frost Shock r6
    49236: handler_modDamage(2), // Frost Shock r7


    16246: handler_zero, // Clearcasting
    8516: handler_zero, // Windfury Attack (buff only) R1
    10608: handler_zero, // Windfury Attack (buff only) R2
    10610: handler_zero, // Windfury Attack (buff only) R3
    25584: handler_zero, // Windfury Attack (buff only)
    30802: handler_zero, // Unleashed rage
    30807: handler_zero, // Unleashed rage
    30823: handler_zero, // Shamanistic Rage - cast
    30824: handler_resourcechange, // Shamanistic Rage - buff
    // 43339: handler_zero, // Focused
    16280: handler_zero, // Flurry

    24398: handler_zero, // Water Shield cast R1
    33736: handler_zero, // Water shield cast R2

    23575: handler_zero, // Water shield mana R2
    33737: handler_zero, // Water shield mana R2

    39104: handler_resourcechange, // Totem recall


    // Lightning Bolt from https://tbc.wowhead.com/spell=30681/lightning-overload makes 0 threat
    45284: handler_zero, // Rank 1
    45286: handler_zero, // Rank 2
    45287: handler_zero, // Rank 3
    45288: handler_zero, // Rank 4
    45289: handler_zero, // Rank 5
    45290: handler_zero, // Rank 6
    45291: handler_zero, // Rank 7
    45292: handler_zero, // Rank 8
    45293: handler_zero, // Rank 9
    45294: handler_zero, // Rank 10
    45295: handler_zero, // Rank 11
    45296: handler_zero, // Rank 12
    49237: handler_zero, // Rank 13
    49238: handler_zero, // Rank 14

    // Chain lightnings
    45297: handler_zero, // Rank 1
    45298: handler_zero, // Rank 2
    45299: handler_zero, // Rank 3
    45300: handler_zero, // Rank 4
    45301: handler_zero, // Rank 5
    45302: handler_zero, // Rank 6
    49270: handler_zero, // Rank 7
    49271: handler_zero, // Rank 8


    // Elemental mastery
    64701: handler_zero, // EM

// From ResultsMayVary https://resultsmayvary.github.io/ClassicThreatPerSecond/
    1: handler_damage,
    /* Consumables */
    11374: handler_threatOnDebuff(90, "Gift of Arthas"),
    /* Damage/Weapon Procs */
    20007: handler_zero, //("Heroic Strength (Crusader)"),
    18138: handler_damage, //("Shadow Bolt (Deathbringer Proc)"),
    24388: handler_damage, //("Brain Damage (Lobotomizer Proc)"),
    23267: handler_damage, //("Firebolt (Perdition's Proc)"),
    18833: handler_damage, //("Firebolt (Alcor's Proc)"),

    21992: handler_modDamagePlusThreat(.5, 63), // Thunderfury
    27648: handler_zero,

    /* Thorn Effects */
    9910: handler_damage, //("Thorns"),  //Thorns (Rank 6)
    26992: handler_damage, //("Thorns"),  //Thorns (Rank 7)
    17275: handler_damage, //("Heart of the Scale"), //Heart of the Scale
    22600: handler_damage, //("Force Reactive Disk"), //Force Reactive
    11350: handler_zero, //("Oil of Immolation"),   //Oil of Immolation (buff)
    11351: handler_damage, //("Oil of Immolation"), //Oil of Immolation (dmg)

    /* Explosives */
    13241: handler_damage, //("Goblin Sapper Charge"), //Goblin Sapper Charge
    30486: handler_damage, //Super Sapper Charge
    39965: handler_damage, //Frost Grenades
    30217: handler_damage, //Adamantite Grenade
    30461: handler_damage, //The Bigger One
    19821: handler_damage, //Arcane Bomb
    30216: handler_damage, //Fel Iron Bomb
    46567: handler_damage, //Rocket Launch
    // TODO : Need to double check if slow/stun effects add threat modifier on some explosives

    /* Zero Threat Abilities */
    71: handler_zero,		// Defensive Stance
    2457: handler_zero,		// Battle Stance
    2458: handler_zero,		// Berserker Stance
    20572: handler_zero, //("Blood Fury"), //Blood Fury
    26296: handler_zero, //("Berserking (Troll racial)"), //Berserking (Troll racial)
    26635: handler_zero, //("Berserking (Troll racial)"), //Berserking (Troll racial)
    22850: handler_zero, //("Sanctuary"), //Sanctuary
    9515: handler_zero, //("Summon Tracking Hound"), //Summon Tracking Hound

    /* Consumable Buffs (zero-threat) */
    10667: handler_zero, //("Rage of Ages"), //Rage of Ages
    25804: handler_zero, //("Rumsey Rum Black Label"), //Rumsey Rum Black Label
    17038: handler_zero, //("Winterfall Firewater"), //Winterfall Firewater
    8220: handler_zero, //("Savory Deviate Delight (Flip Out)"), //Savory Deviate Delight (Flip Out)
    17543: handler_zero, //("Fire Protection"), //Fire Protection
    17548: handler_zero, //("Greater Shadow Protection Potion"), //Greater Shadow Protection Potion
    18125: handler_zero, //("Blessed Sunfruit"), //Blessed Sunfruit
    17538: handler_zero, //("Elixir of the Mongoose"), //Elixir of the Mongoose
    11359: handler_zero, //("Restorative Potion (Restoration) Buff"), //Restorative Potion (Restoration) Buff
    23396: handler_zero, //("Restorative Potion (Restoration) Dispel"), //Restorative Potion (Restoration) Dispel
    28508: handler_zero, // Destruction pot
    28507: handler_zero, // Haste pot
    22838: handler_zero, // Haste pot
    29529: handler_zero, // Drums of battle
    35476: handler_zero, // Drums of battle
    185848: handler_zero, // Greater Drums of battle

    32182: handler_zero, // Heroism
    2825: handler_zero, // Bloodlust

    /* Warrior: https://github.com/magey/wotlk-warrior/issues/21 */
    12721: handler_damage, //("Deep Wounds"),
    46968: handler_shockwave, // Shockwave
    
    //TODO : Add tactical mastery talent threat modifier
    23881: handler_bloodthirst, //("Bloodthirst")
    23888: handler_zero, //("Bloodthirst"),   //Buff
    23885: handler_zero, //("Bloodthirst"),   //Buff
    23891: handler_heal, // BT heal buff

    // Heroic strike
    47450: handler_threatOnHit(259, "Heroic Strike"), 

    // Heroic Throw
    57755: handler_modDamage(1.5),

    //Shield Slam
    47488: handler_modDamagePlusThreat(1.3, 770), // Shield Slam

    //Devastate
    47498: handler_devastate(315), // Devastate threat = 315 + 5% of AP + dam

    // Shield Bash
    72: handler_threatOnHit(36),

    //Revenge
    6572: handler_threatOnHit(121),
    12798: handler_threatOnHit(20), //("Revenge Stun"),           //Revenge Stun - now +20 threat on tbcc, boss are imumune more often than not

    //Cleave
    47520: handler_threatOnHit(225, "Cleave"),

    //Whirlwind
    1680: handler_modDamage(1.25), //("Whirlwind"), //Whirlwind

    // Thunderclap
    47502: handler_modDamage(1.85), 

    //Hamstring
    1715: handler_threatOnHit(181, "Hamstring"),

    // Slam
    47475: handler_threatOnHit(140),

    //Intercept
    20252: handler_modDamage(2), //Intercept
    20253: handler_zero, //("Intercept Stun"),     
    
    //Execute
    20658: handler_modDamage(1.25, "Execute"),

    /* Abilities */
    //Sunder Armor
    7386: handler_sunderArmor(360, "Sunder Armor"),

    //Battleshout
    47436: handler_threatOnBuffUnsplit(78, true, "Battle Shout"), 

    //Demo Shout
    59613: handler_threatOnDebuff(63, "Demoralizing Shout"), 

    // Commanding shout
    469: handler_threatOnBuffUnsplit(80, true, "Commanding Shout"),

    //Mocking Blow
    20560: threatFunctions.concat(handler_modDamage(3.0), handler_markSourceOnMiss(borders.taunt)), //("Mocking Blow"),

    //Overpower
    7384: handler_damage, //("Overpower"),

    //Rend
    47465: handler_damage, //("Rend"),

    // Spell reflect
    23920: handler_spellReflectCast,

    // Concussion blow
    12809: handler_modDamage(2.0),

    // Stances
    71: handler_defensive_stance,
    2457: handler_battle_stance,
    2458: handler_berserker_stance,


    /* Zero threat abilities */
    355: threatFunctions.concat(handler_taunt, handler_markSourceOnMiss(borders.taunt)), //("Taunt"), //Taunt
    1161: handler_markSourceOnMiss(borders.taunt), //("Challenging Shout"), //Challenging Shout
    2687: handler_resourcechangeCoeff, //("Bloodrage"), //Bloodrage (cast)
    29131: handler_resourcechange, //("Bloodrage"), //Bloodrage (buff)
    23602: handler_zero, //("Shield Specialization"), //Shield Specialization
    12964: handler_resourcechange, //("Unbridled Wrath"), //Unbridled Wrath
    11578: handler_zero, //("Charge"), //Charge
    7922: handler_zero, //("Charge Stun"), //Charge Stun
    18499: handler_zero, //("Berserker Rage"), //Berserker Rage
    12966: handler_zero, //("Flurry (Rank 1)"), //Flurry (Rank 1)
    12967: handler_zero, //("Flurry (Rank 2)"), //Flurry (Rank 2)
    12968: handler_zero, //("Flurry (Rank 3)"), //Flurry (Rank 3)
    12969: handler_zero, //("Flurry (Rank 4)"), //Flurry (Rank 4)
    12970: handler_zero, //("Flurry (Rank 5)"), //Flurry (Rank 5)
    12328: handler_zero, //("Death Wish"), //Death Wish
    12292: handler_zero, //("Death Wish"), //Death Wish tbcc rank ?
    871: handler_zero, //("Shield Wall"),
    1719: handler_zero, //("Recklessness"), //Recklessness
    12323: handler_zero, //("Piercing Howl"), //Piercing Howl
    14204: handler_zero, //("Enrage"), //Enrage
    12975: handler_zero, //("Last Stand (cast)"), //Last Stand (cast)
    12976: handler_zero, //("Last Stand (buff)"), //Last Stand (buff)
    2565: handler_zero, //("Shield Block"), //Shield Block


    /* Consumable */
    6613: handler_zero, //("Great Rage Potion"), //Great Rage Potion
    17528: handler_zero, //("Mighty Rage Potion"), //Mighty Rage Potion
    28515: handler_zero, // Iron shield pot
    13455: handler_zero, // Greater stoneshield pot
    4623: handler_zero, // Lesser stoneshield pot
    40093: handler_zero, // Indestructible potion


    /* Cancelform triggers */
    48463: handler_cancel_form, // Moonfire
    53201: handler_cancel_form, // Starfall
    48465: handler_cancel_form, // Starfire
    48443: handler_cancel_form, // Regrowth
    48441: handler_cancel_form, // Rejuv
    48378: handler_cancel_form, // Healing Touch
    48447: handler_cancel_form, // Tranquility
    48451: handler_cancel_form, // Lifebloom
    53251: handler_cancel_form, // Wild Growth
    50464: handler_cancel_form, // Nourish
    48470: handler_cancel_form, // GOTW

    /* Forms */
    9634: handler_dire_bear_form, //("Dire Bear Form"),
    768: handler_cat_form, //("Cat Form"),

    /* Bear */
    5209: handler_markSourceOnMiss(borders.taunt), // Challenging Roar

    26996: handler_threatOnHit(424), // Maul
    26997: handler_modDamage(1), // Swipe
    33745: handler_lacerate(515.5, 0.5), // 515.5 static on application, 0.5x initial and dot damage (before bear mod)
    48564: handler_damage, // No mangle threat mod in wotlk
    26998: handler_threatOnDebuff(132), // Demoralizing roar
    16959: handler_zero, // Primal Fury
    17057: handler_zero, // Furor
    5229: handler_zero, // Enrage

    6795: threatFunctions.concat(handler_taunt, handler_markSourceOnMiss(borders.taunt)), //("Growl"),
    5229: handler_resourcechange, //("Enrage"),

    31786: handler_resourcechange, // Spiritual Attunement

    8983: handler_zero, //("Bash"), //TODO test bash threat

    /* Cat */
    48566: handler_damage, //("Mangle (Cat)"),
    48570: handler_damage, //("Claw"),
    48572: handler_damage, //("Shred"),
    48574: handler_damage, //("Rake"),
    48577: handler_damage, //("Ferocious Bite"),
    48579: handler_damage, //("Ravage"),
    49800: handler_damage, //("Rip"),
    49803: handler_damage, //("Pounce"),
    9913: handler_zero, //("Prowl"),
    9846: handler_zero, //("Tiger's Fury"),
    9846: handler_zero, //("Tiger's Fury"),
    36589: handler_zero, //("Dash"),
    36589: handler_zero, //("Berserk"),

    27004: handler_castCanMiss(-3474, "Cower"),

    // Death Knight
    48236: handler_frost_presence, // Frost Presence
    48266: handler_blood_presence, // Blood Presence
    48265: handler_unholy_presence, // Unholy Presence

    49909: handler_icy_touch,    // IT is 7x threat in Frost, 1x in Blood/Unholy (before stance multipliers)
    52212: handler_modDamage(1.9),  // Death and Decay
    66217: handler_modDamage(1.75),  // Rune Strike

    49895: handler_modDamagePlusThreat(1.0, 100), // Death Coil
    49924: handler_modDamagePlusThreat(1.0, 164), // Death Strike; heal has 164 base threat component
    55271: handler_modDamagePlusThreat(1.0, 120), // Scourge Strike

    45524: handler_threatOnDebuffOrDamage(116), // Chains of Ice
    49203: handler_threatOnDebuffOrDamage(110), // Hungering Cold
    49916: handler_threatOnDebuffOrDamage(138), // Strangulate
    49016: handler_threatOnDebuffOrDamage(55), // Unholy Frenzy

    49182: handler_threatOnBuff(20), // Blade Barrier 1/5
    49500: handler_threatOnBuff(20), // Blade Barrier 2/5
    49501: handler_threatOnBuff(20), // Blade Barrier 3/5
    55255: handler_threatOnBuff(20), // Blade Barrier 4/5
    55226: handler_threatOnBuff(20), // Blade Barrier 5/5
    57330: handler_threatOnBuff(75), // HoW R1
    57263: handler_threatOnBuff(75), // HoW R2
    49796: handler_threatOnBuff(55), // Deathchill
    49206: handler_threatOnBuff(220), // Summon Gargoyle
    46584: handler_threatOnBuff(1), // Raise Dead

    49576: threatFunctions.concat(handler_damage, handler_markSourceOnMiss(borders.taunt)), // Death Grip
    49576: handler_threatOnDebuffOrDamage(110), // Grip generates 110 threat pre-stance mod after taunt effect

    45470: handler_modHeal(.55), // Death Strike
    48982: handler_modHealPlusThreat(.55, 55), // Rune Tap

    // TODO: deal with 1x multiplier in unholy/blood for IT
    // TODO: deal with dancing rune weapon threat transfer (maybe)

    /* Healing */
    // As of mars 30 2022, blizzard apparently changed final tick of life bloom's behaviour
    // 33778: handler_threatAsTargetHealed, // Final tick of life bloom
    379: handler_threatAsTargetHealed, // Earth shield = threat to player healed
    33110: handler_threatAsTargetHealed, // Prayer of mending

    /* Abilities */
    770:   handler_threatOnDebuffOrDamage(132), // Faerie Fire
    16857: handler_threatOnDebuff(132, "Faerie Fire (Feral)"), // Cat Faerie Fire
    60089: handler_modDamagePlusThreat(1.0, 132, "Faerie Fire (Feral)"), // Bearie Fire

    16870: handler_zero, //("Clearcasting"),
    29166: handler_zero, //("Innervate"),

    22842: handler_heal, //("Frienzed Regeneration (Rank 1)"),
    22895: handler_heal, //("Frienzed Regeneration (Rank 2)"),
    22896: handler_heal, //("Frienzed Regeneration"),

    24932: handler_zero, //("Leader of the Pack"),
    // No threat since 2.1 https://wowpedia.fandom.com/wiki/Improved_Leader_of_the_Pack
    34299: handler_zero, //("Improved Leader of the Pack"),

    /* Items */
    13494: handler_zero, //("Manual Crowd Pummeler"),

    // End known spells
    1000000: handler_damage // Default damage handler
}

let zeroThreatSpells = [];
for (let i in spellFunctions) {
    if (i >= 0 && spellFunctions[i] === handler_zero) {
        zeroThreatSpells.push(i);
    }
}
