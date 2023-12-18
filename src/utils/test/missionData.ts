import {MissionRewardType} from "../../battle/missionResult/missionReward";
import {MissionConditionType} from "../../battle/missionResult/missionCondition";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";
import {TargetingShape} from "../../battle/targeting/targetingShapeGenerator";
import {MissionFileFormat} from "../../dataLoader/missionLoader";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {TeamStrategyType} from "../../battle/teamStrategy/teamStrategy";

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
        "actions": [
            {
                "name": "Bite",
                "id": "demon_slither_bite",
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
                "actionPointCost": 1,
                "targetingShape": TargetingShape.SNAKE,
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

    return {
        missionData,
        enemyDemonSlitherTemplate,
        enemyDemonSlitherTemplate2,
    }
}
