import {MissionRewardType} from "../../battle/missionResult/missionReward";
import {MissionConditionType} from "../../battle/missionResult/missionCondition";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";
import {TargetingShape} from "../../battle/targeting/targetingShapeGenerator";
import {MissionFileFormat} from "../../dataLoader/missionLoader";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {TeamStrategyType} from "../../battle/teamStrategy/teamStrategy";
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID
} from "../../battle/orchestrator/missionCutsceneCollection";
import {TriggeringEvent} from "../../cutscene/cutsceneTrigger";
import {CutsceneActionPlayerType} from "../../cutscene/cutsceneAction";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";

export const TestMissionData = () => {
    const missionData: MissionFileFormat = {
        "id": "test mission",
        "terrain": [
            "x x x x x 2 2 1 1 1 1 1 2 2 x x x ",
            " 1 1 1 1 2 2 2 1 1 1 1 2 2 1 1 1 1 ",
            "  x x x x 2 2 1 1 1 1 1 2 2 1 1 1 1 ",
            "   x x x x x x x x x x x x x x 1 1 1 ",
            "    1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
            "     1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
            "      1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 ",
            "       1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 1 ",
            "        x x x x x x x x x x x 2 1 1 1 1 1 ",
            "         1 1 1 1 1 1 x 2 2 2 1 1 1 1 2 2 2 ",
            "          1 1 1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 ",
            "           1 1 1 1 x 2 1 1 1 2 2 2 1 1 1 1 2 ",
            "            1 1 1 x 2 1 1 1 1 O O 1 1 1 1 1 2 ",
            "             1 1 1 x 2 1 1 1 O O O 1 1 1 1 1 2 ",
            "              1 1 1 x 2 1 1 1 O O 1 1 1 1 1 1 2 ",
            "               1 1 1 x 2 1 1 1 1 1 1 1 1 1 1 2 x ",
            "                1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 x 1 ",
            "                 1 1 1 x 2 2 2 2 2 2 2 2 2 2 x 1 1 "
        ],
        "objectives": [
            {
                "id": "victory",
                "reward": {
                    "rewardType": MissionRewardType.VICTORY
                },
                "hasGivenReward": false,
                "conditions": [
                    {
                        "id": "defeat_all_enemies",
                        "type": MissionConditionType.DEFEAT_ALL_ENEMIES
                    }
                ],
                "numberOfRequiredConditionsToComplete": "all"
            },
            {
                "id": "defeat",
                "reward": {
                    "rewardType": MissionRewardType.DEFEAT
                },
                "hasGivenReward": false,
                "conditions": [
                    {
                        "id": "defeat_all_players",
                        "type": MissionConditionType.DEFEAT_ALL_PLAYERS
                    }
                ],
                "numberOfRequiredConditionsToComplete": "all"
            }
        ],
        "player": {
            "teamId": "playerCrusaders",
            "teamName": "Crusaders",
            "iconResourceKey": "affiliate_icon_crusaders",
            "deployment": {
                "affiliation": SquaddieAffiliation.PLAYER,
                "optional": [],
                "required": [
                    {
                        "squaddieTemplateId": "player_sir_camil",
                        "battleSquaddieId": "player_sir_camil",
                        "location": {"q": 1, "r": 1}
                    },
                    {
                        "squaddieTemplateId": "player_young_torrin",
                        "battleSquaddieId": "player_young_torrin",
                        "location": {"q": 1, "r": 0}
                    }
                ]
            }
        },
        "npcDeployments": {
            "enemy": {
                "templateIds": [
                    "enemy_demon_slither",
                    "enemyDemonSlitherTemplate2_id",
                ],
                "mapPlacements": [
                    {
                        "squaddieTemplateId": "enemy_demon_slither",
                        "battleSquaddieId": "enemy_demon_slither_0",
                        "location": {"q": 1, "r": 5}
                    },
                    {
                        "squaddieTemplateId": "enemy_demon_slither",
                        "battleSquaddieId": "enemy_demon_slither_1",
                        "location": {"q": 1, "r": 9}
                    },
                    {
                        "squaddieTemplateId": "enemyDemonSlitherTemplate2_id",
                        "battleSquaddieId": "enemy_demon_slither_2",
                        "location": {"q": 1, "r": 12}
                    }
                ],
                "teams": [
                    {
                        "id": "enemy0",
                        "name": "Infiltrators",
                        "iconResourceKey": "affiliate_icon_infiltrators",
                        "battleSquaddieIds": [
                            "enemy_demon_slither_0",
                            "enemy_demon_slither_1",
                            "enemy_demon_slither_3",
                            "enemy_demon_slither_4",
                            "enemy_demon_slither_5",
                            "enemy_demon_slither_6"
                        ],
                        "strategies": [
                            {
                                "type": TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.PLAYER
                                }
                            },
                            {
                                "type": TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.PLAYER
                                }
                            }
                        ]
                    },
                    {
                        "id": "enemy follow",
                        "name": "Infiltrators",
                        "iconResourceKey": "affiliate_icon_infiltrators",
                        "battleSquaddieIds": [
                            "enemy_demon_slither_2",
                            "enemy_demon_slither_7"
                        ],
                        "strategies": [
                            {
                                "type": TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.PLAYER
                                }
                            },
                            {
                                "type": TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.PLAYER
                                }
                            },
                            {
                                "type": TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.PLAYER
                                }
                            }
                        ]
                    }
                ]
            },
            "ally": {
                "templateIds": [
                    "ally_guard",
                ],
                "mapPlacements": [
                    {
                        "squaddieTemplateId": "ally_guard",
                        "battleSquaddieId": "ally_guard_0",
                        "location": {"q": 0, "r": 10}
                    }
                ],
                "teams": [
                    {
                        "id": "ally0",
                        "name": "Allies",
                        "iconResourceKey": "affiliate_icon_western",
                        "battleSquaddieIds": [
                            "ally_guard_0",
                        ],
                        "strategies": [
                            {
                                "type": TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.PLAYER
                                }
                            },
                            {
                                "type": TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.ENEMY
                                }
                            }
                        ]
                    },
                ]
            },
            "noAffiliation": {
                "templateIds": [
                    "no_affiliation_living_flame",
                ],
                "mapPlacements": [
                    {
                        "squaddieTemplateId": "no_affiliation_living_flame",
                        "battleSquaddieId": "no_affiliation_living_flame_0",
                        "location": {"q": 0, "r": 11}
                    }
                ],
                "teams": [
                    {
                        "id": "no_affiliation0",
                        "name": "Living Flames",
                        "iconResourceKey": "affiliate_icon_none",
                        "battleSquaddieIds": [
                            "no_affiliation_living_flame_0",
                        ],
                        "strategies": [
                            {
                                "type": TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.ENEMY
                                }
                            },
                            {
                                "type": TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.PLAYER
                                }
                            },
                            {
                                "type": TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                "options": {
                                    "desiredAffiliation": SquaddieAffiliation.NONE
                                }
                            },
                        ]
                    },
                ]
            },
        },
        "phaseBannersByAffiliation": {
            "PLAYER": "phase banner player",
            "ENEMY": "phase banner enemy"
        },
        "cutscene": {
            "cutsceneTriggers": [
                {
                    "triggeringEvent": TriggeringEvent.MISSION_VICTORY,
                    "cutsceneId": "default_victory",
                    "systemReactedToTrigger": false,
                },
                {
                    "triggeringEvent": TriggeringEvent.MISSION_DEFEAT,
                    "cutsceneId": "default_defeat",
                    "systemReactedToTrigger": false,
                },
                {
                    "triggeringEvent": TriggeringEvent.START_OF_TURN,
                    "systemReactedToTrigger": false,
                    "cutsceneId": "introduction",
                    "turn": 0,
                },
                {
                    "triggeringEvent": TriggeringEvent.START_OF_TURN,
                    "systemReactedToTrigger": false,
                    "cutsceneId": "turn1",
                    "turn": 1,
                },
                {
                    "triggeringEvent": TriggeringEvent.START_OF_TURN,
                    "systemReactedToTrigger": false,
                    "cutsceneId": "turn2",
                    "turn": 2,
                },
                {
                    "triggeringEvent": TriggeringEvent.START_OF_TURN,
                    "systemReactedToTrigger": false,
                    "cutsceneId": "turn4",
                    "turn": 4,
                },
                {
                    "triggeringEvent": TriggeringEvent.START_OF_TURN,
                    "systemReactedToTrigger": false,
                    "cutsceneId": "turn5",
                    "turn": 5,
                },
                {
                    "triggeringEvent": TriggeringEvent.START_OF_TURN,
                    "systemReactedToTrigger": false,
                    "cutsceneId": "turn7",
                    "turn": 7,
                },
            ],
            "cutsceneById": {
                [DEFAULT_VICTORY_CUTSCENE_ID]: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_0",
                            speakerName: "Sir Camil",
                            speakerText: "That's the last of them.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_1",
                            speakerName: "Torrin",
                            speakerText: "Yay! We did it!",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_1",
                            speakerName: "Torrin",
                            speakerText: "Yay! We did it!",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_report_0",
                            speakerName: "Mission Report",
                            speakerText: "Turns: $$TURN_COUNT\nTime: $$TIME_ELAPSED",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_report_1",
                            speakerName: "Mission Report",
                            speakerText: "Damage Dealt: $$DAMAGE_DEALT_BY_PLAYER_TEAM\nDamage Taken: $$DAMAGE_TAKEN_BY_PLAYER_TEAM\nHealing: $$HEALING_RECEIVED_BY_PLAYER_TEAM",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.SPLASH_SCREEN,
                            id: "victory_final",
                            screenImageResourceKey: "splash victory",
                        },
                    ],
                },
                [DEFAULT_DEFEAT_CUTSCENE_ID]: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "defeat_0",
                            speakerName: "Torrin",
                            speakerText: "We have to retreat!",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "defeat_1",
                            speakerName: "Sir Camil",
                            speakerText: "Right. When we come back, let me take the lead, and let's take it slow.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.SPLASH_SCREEN,
                            id: "defeat_final",
                            screenImageResourceKey: "splash defeat",
                        },
                    ],
                },
                "introduction": {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_0",
                            speakerName: "How to play",
                            speakerText: "To move, click on Torrin or Sir Camil. Then click to blue boot to move.\nMore boots cost more action points.",
                            speakerPortraitResourceKey: "tutorial-map",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_1",
                            speakerName: "How to play",
                            speakerText: "Torrin and Sir Camil get 3 Action Points. You can spend them to move and act.",
                            speakerPortraitResourceKey: "tutorial-hud",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_2",
                            speakerName: "How to play",
                            speakerText: "To act, click on the actions on the bottom of the screen and then click on your target.\nClick Confirm and watch the sparks fly.\nYou can always end your turn early by clicking the End Turn action.",
                            speakerPortraitResourceKey: "tutorial-hud",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_3",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            speakerName: "Torrin",
                            speakerText: "Torrin can use her Water Cannon to attack from range.\nHealing Touch will heal herself or Sir Camil for 2, but it costs 2 action points.",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_4",
                            speakerName: "Sir Camil",
                            speakerText: "Sir Camil has more health and armor than Torrin.\nHe has a longsword for melee attacks.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                },
                "turn1": {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn1_0",
                            speakerName: "Torrin",
                            speakerText: "How did they breach us so quickly?\nWithout raising an alarm?\nUgh! Let's get rid of them.",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn1_1",
                            speakerName: "Sir Camil",
                            speakerText: "I agree. The courtyard must be cleansed.\nI'll take the lead. Stay behind me and heal me if I get hurt.\nIf we fight one at a time we should be alright.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                },
                "turn2": {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn2_0",
                            speakerName: "Sir Camil",
                            speakerText: "And all of this sand poured in this morning... I can barely move through it.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn2_1",
                            speakerName: "Torrin",
                            speakerText: "Yes, the sand slows everyone down.\nThe demons, too. Let them waste energy coming to us.",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        }
                    ],
                },
                "turn4": {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn4_0",
                            speakerName: "Torrin",
                            speakerText: "I can barely see ahead of us. What's going on down there?",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn4_1",
                            speakerName: "Sir Camil",
                            speakerText: "If you move the pointer to the edges of the screen, we can move the camera a bit.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        }
                    ],
                },
                "turn5": {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn5_0",
                            speakerName: "Sir Camil",
                            speakerText: "What are those demons thinking? I don't know how far they can reach.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn5_1",
                            speakerName: "Torrin",
                            speakerText: "I can... tell where they can move. If you just... er, click on them, I can see where they can move.",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn5_2",
                            speakerName: "Torrin",
                            speakerText: "Red sword tiles are where they can attack but cannot move to.\nBlue boot tiles show where they can travel or attack.",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        }
                    ],
                },
                "turn7": {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn7_0",
                            speakerName: "Torrin",
                            speakerText: "Ah! I missed again!",
                            speakerPortraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn7_1",
                            speakerName: "Sir Camil",
                            speakerText: "The multiple attack penalty adds up quickly.\nYour third attack is usually not worth it.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn7_2",
                            speakerName: "Sir Camil",
                            speakerText: "Sometimes it's better to back away or raise your defenses rather than hope for a critical strike.",
                            speakerPortraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                        }
                    ],
                },
            },
        }
    }

    const enemyDemonSlitherTemplate: SquaddieTemplate = {
        "squaddieId": {
            "name": "Slither Demon",
            "templateId": "enemy_demon_slither",
            "resources": {
                "mapIconResourceKey": "map icon demon slither",
                "actionSpritesByEmotion": {
                    "NEUTRAL": "combat-demon-slither-neutral",
                    "ATTACK": "combat-demon-slither-attack",
                    "TARGETED": "combat-demon-slither-targeted",
                    "DAMAGED": "combat-demon-slither-damaged",
                    "DEAD": "combat-demon-slither-dead"
                }
            },
            "traits": {
                "booleanTraits": {
                    "DEMON": true
                }
            },
            "affiliation": SquaddieAffiliation.ENEMY,
        },
        "attributes": {
            "maxHitPoints": 3,
            "armorClass": 5,
            "movement": {
                "movementPerAction": 2,
                "passThroughWalls": false,
                "crossOverPits": false,
            }
        },
        "actionTemplates": [
            {
                "id": "demon_slither_bite",
                "name": "Bite",
                "actionPoints": 1,
                "actionEffectTemplates": [
                    {
                        "type": ActionEffectType.SQUADDIE,
                        "minimumRange": 0,
                        "maximumRange": 1,
                        "traits": {
                            "booleanTraits": {
                                [Trait.ATTACK]: true
                            }
                        },
                        "damageDescriptions": {
                            [DamageType.BODY]: 1,
                        },
                        "healingDescriptions": {},
                        "targetingShape": TargetingShape.SNAKE,
                    }
                ],
                "buttonIconResourceKey": "decision-button-sword"
            }
        ]
    };
    const enemyDemonSlitherTemplate2: SquaddieTemplate = {
        ...enemyDemonSlitherTemplate,
        "squaddieId": {
            ...enemyDemonSlitherTemplate.squaddieId,
            templateId: "enemyDemonSlitherTemplate2_id",
        }
    };
    const allyGuardTemplate: SquaddieTemplate = {
        "squaddieId": {
            "name": "Guard",
            "templateId": "ally_guard",
            "resources": {
                "mapIconResourceKey": "map icon demon slither",
                "actionSpritesByEmotion": {
                    "NEUTRAL": "combat-demon-slither-neutral",
                    "ATTACK": "combat-demon-slither-attack",
                    "TARGETED": "combat-demon-slither-targeted",
                    "DAMAGED": "combat-demon-slither-damaged",
                    "DEAD": "combat-demon-slither-dead"
                }
            },
            "traits": {
                "booleanTraits": {}
            },
            "affiliation": SquaddieAffiliation.ALLY,
        },
        "attributes": {
            "maxHitPoints": 3,
            "armorClass": 5,
            "movement": {
                "movementPerAction": 2,
                "passThroughWalls": false,
                "crossOverPits": false,
            }
        },
        "actionTemplates": [
            {
                "id": "short_sword",
                "name": "Short sword",
                "actionPoints": 1,
                "actionEffectTemplates": [
                    {
                        "type": ActionEffectType.SQUADDIE,
                        "minimumRange": 0,
                        "maximumRange": 1,
                        "traits": {
                            "booleanTraits": {
                                [Trait.ATTACK]: true
                            }
                        },
                        "damageDescriptions": {
                            [DamageType.BODY]: 1,
                        },
                        "healingDescriptions": {},
                        "targetingShape": TargetingShape.SNAKE,
                    }
                ],
                "buttonIconResourceKey": "decision-button-sword"
            }
        ]
    };
    const noAffiliationLivingFlameTemplate: SquaddieTemplate = {
        "squaddieId": {
            "name": "Living Flame",
            "templateId": "no_affiliation_living_flame",
            "resources": {
                "mapIconResourceKey": "map icon demon slither",
                "actionSpritesByEmotion": {
                    "NEUTRAL": "combat-demon-slither-neutral",
                    "ATTACK": "combat-demon-slither-attack",
                    "TARGETED": "combat-demon-slither-targeted",
                    "DAMAGED": "combat-demon-slither-damaged",
                    "DEAD": "combat-demon-slither-dead"
                }
            },
            "traits": {
                "booleanTraits": {}
            },
            "affiliation": SquaddieAffiliation.ALLY,
        },
        "attributes": {
            "maxHitPoints": 3,
            "armorClass": 5,
            "movement": {
                "movementPerAction": 2,
                "passThroughWalls": false,
                "crossOverPits": false,
            }
        },
        "actionTemplates": [
            {
                "id": "ignition",
                "name": "Ignition",
                "actionPoints": 1,
                "actionEffectTemplates": [
                    {
                        "type": ActionEffectType.SQUADDIE,
                        "minimumRange": 0,
                        "maximumRange": 1,
                        "traits": {
                            "booleanTraits": {
                                [Trait.ATTACK]: true
                            }
                        },
                        "damageDescriptions": {
                            [DamageType.BODY]: 1,
                        },
                        "healingDescriptions": {},
                        "targetingShape": TargetingShape.SNAKE,
                    }
                ],
                "buttonIconResourceKey": "decision-button-sword"
            }
        ]
    };

    return {
        missionData,
        enemyDemonSlitherTemplate,
        enemyDemonSlitherTemplate2,
        allyGuardTemplate,
        noAffiliationLivingFlameTemplate,
    }
}
