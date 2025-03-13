import { MissionRewardType } from "../../battle/missionResult/missionReward"
import { MissionConditionType } from "../../battle/missionResult/missionCondition"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { Trait } from "../../trait/traitStatusStorage"
import { DamageType } from "../../squaddie/squaddieService"
import { MissionFileFormat } from "../../dataLoader/missionLoader"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { TeamStrategyType } from "../../battle/teamStrategy/teamStrategy"
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
} from "../../battle/orchestrator/missionCutsceneCollection"
import { TriggeringEvent } from "../../cutscene/cutsceneTrigger"
import { CutsceneActionPlayerType } from "../../cutscene/cutsceneAction"
import {
    ActionEffectTemplateService,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import {
    ActionDecisionType,
    ActionTemplate,
} from "../../action/template/actionTemplate"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { CoordinateGeneratorShape } from "../../battle/targeting/coordinateGenerator"

export const TestMissionData = () => {
    const missionData: MissionFileFormat = {
        id: "test mission",
        terrain: [
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
            "                 1 1 1 x 2 2 2 2 2 2 2 2 2 2 x 1 1 ",
        ],
        objectives: [
            {
                id: "victory",
                reward: {
                    rewardType: MissionRewardType.VICTORY,
                },
                hasGivenReward: false,
                conditions: [
                    {
                        id: "defeat_all_enemies",
                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                    },
                ],
                numberOfRequiredConditionsToComplete: "all",
            },
            {
                id: "defeat",
                reward: {
                    rewardType: MissionRewardType.DEFEAT,
                },
                hasGivenReward: false,
                conditions: [
                    {
                        id: "defeat_all_players",
                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                    },
                ],
                numberOfRequiredConditionsToComplete: "all",
            },
        ],
        player: {
            teamId: "playerCrusaders",
            teamName: "Crusaders",
            iconResourceKey: "affiliate_icon_crusaders",
            deployment: {
                affiliation: SquaddieAffiliation.PLAYER,
                optional: [],
                required: [
                    {
                        squaddieTemplateId: "sir_camil",
                        battleSquaddieId: "sir_camil",
                        coordinate: { q: 1, r: 1 },
                    },
                    {
                        squaddieTemplateId: "young_nahla",
                        battleSquaddieId: "young_nahla",
                        coordinate: { q: 1, r: 0 },
                    },
                ],
            },
        },
        npcDeployments: {
            enemy: {
                templateIds: [
                    "enemy_demon_slither",
                    "enemyDemonSlitherTemplate2_id",
                ],
                mapPlacements: [
                    {
                        squaddieTemplateId: "enemy_demon_slither",
                        battleSquaddieId: "enemy_demon_slither_0",
                        coordinate: { q: 1, r: 5 },
                    },
                    {
                        squaddieTemplateId: "enemy_demon_slither",
                        battleSquaddieId: "enemy_demon_slither_1",
                        coordinate: { q: 1, r: 9 },
                    },
                    {
                        squaddieTemplateId: "enemyDemonSlitherTemplate2_id",
                        battleSquaddieId: "enemy_demon_slither_2",
                        coordinate: { q: 1, r: 12 },
                    },
                ],
                teams: [
                    {
                        id: "enemy0",
                        name: "Infiltrators",
                        iconResourceKey: "affiliate_icon_infiltrators",
                        battleSquaddieIds: [
                            "enemy_demon_slither_0",
                            "enemy_demon_slither_1",
                            "enemy_demon_slither_3",
                            "enemy_demon_slither_4",
                            "enemy_demon_slither_5",
                            "enemy_demon_slither_6",
                        ],
                        strategies: [
                            {
                                type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.PLAYER,
                                },
                            },
                            {
                                type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.PLAYER,
                                },
                            },
                        ],
                    },
                    {
                        id: "enemy follow",
                        name: "Infiltrators",
                        iconResourceKey: "affiliate_icon_infiltrators",
                        battleSquaddieIds: [
                            "enemy_demon_slither_2",
                            "enemy_demon_slither_7",
                        ],
                        strategies: [
                            {
                                type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.PLAYER,
                                },
                            },
                            {
                                type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.PLAYER,
                                },
                            },
                            {
                                type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.PLAYER,
                                },
                            },
                        ],
                    },
                ],
            },
            ally: {
                templateIds: ["ally_guard"],
                mapPlacements: [
                    {
                        squaddieTemplateId: "ally_guard",
                        battleSquaddieId: "ally_guard_0",
                        coordinate: { q: 0, r: 10 },
                    },
                ],
                teams: [
                    {
                        id: "ally0",
                        name: "Allies",
                        iconResourceKey: "affiliate_icon_western",
                        battleSquaddieIds: ["ally_guard_0"],
                        strategies: [
                            {
                                type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.PLAYER,
                                },
                            },
                            {
                                type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.ENEMY,
                                },
                            },
                        ],
                    },
                ],
            },
            noAffiliation: {
                templateIds: ["no_affiliation_living_flame"],
                mapPlacements: [
                    {
                        squaddieTemplateId: "no_affiliation_living_flame",
                        battleSquaddieId: "no_affiliation_living_flame_0",
                        coordinate: { q: 0, r: 11 },
                    },
                ],
                teams: [
                    {
                        id: "no_affiliation0",
                        name: "Living Flames",
                        iconResourceKey: "affiliate_icon_none",
                        battleSquaddieIds: ["no_affiliation_living_flame_0"],
                        strategies: [
                            {
                                type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.ENEMY,
                                },
                            },
                            {
                                type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.PLAYER,
                                },
                            },
                            {
                                type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                options: {
                                    desiredAffiliation:
                                        SquaddieAffiliation.NONE,
                                },
                            },
                        ],
                    },
                ],
            },
        },
        phaseBannersByAffiliation: {
            PLAYER: "phase banner player",
            ENEMY: "phase banner enemy",
        },
        cutscene: {
            cutsceneTriggers: [
                {
                    triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                    cutsceneId: "default_victory",
                    systemReactedToTrigger: false,
                },
                {
                    triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
                    cutsceneId: "default_defeat",
                    systemReactedToTrigger: false,
                },
                {
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                    systemReactedToTrigger: false,
                    cutsceneId: "introduction",
                    turn: 0,
                },
                {
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                    systemReactedToTrigger: false,
                    cutsceneId: "turn1",
                    turn: 1,
                },
                {
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                    systemReactedToTrigger: false,
                    cutsceneId: "turn2",
                    turn: 2,
                },
                {
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                    systemReactedToTrigger: false,
                    cutsceneId: "turn4",
                    turn: 4,
                },
                {
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                    systemReactedToTrigger: false,
                    cutsceneId: "turn5",
                    turn: 5,
                },
                {
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                    systemReactedToTrigger: false,
                    cutsceneId: "turn7",
                    turn: 7,
                },
            ],
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_0",
                            speakerName: "Sir Camil",
                            dialogueText: "That's the last of them.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_1",
                            speakerName: "Nahla",
                            dialogueText: "Yay! We did it!",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_1",
                            speakerName: "Nahla",
                            dialogueText: "Yay! We did it!",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_report_0",
                            speakerName: "Mission Report",
                            dialogueText:
                                "Turns: $$TURN_COUNT\nTime: $$TIME_ELAPSED",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "victory_report_1",
                            speakerName: "Mission Report",
                            dialogueText:
                                "Damage Dealt: $$DAMAGE_DEALT_BY_PLAYER_TEAM\nDamage Taken: $$DAMAGE_TAKEN_BY_PLAYER_TEAM\nHealing: $$HEALING_RECEIVED_BY_PLAYER_TEAM",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.SPLASH_SCREEN,
                            id: "victory_final",
                            screenImageResourceKey: "splash victory",
                            backgroundColor: [10, 11, 12],
                        },
                    ],
                    uiData: undefined,
                    drawUITask: undefined,
                },
                [DEFAULT_DEFEAT_CUTSCENE_ID]: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "defeat_0",
                            speakerName: "Nahla",
                            dialogueText: "We have to retreat!",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "defeat_1",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "Right. When we come back, let me take the lead, and let's take it slow.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.SPLASH_SCREEN,
                            id: "defeat_final",
                            screenImageResourceKey: "splash defeat",
                        },
                    ],
                    uiData: undefined,
                    drawUITask: undefined,
                },
                introduction: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_0",
                            speakerName: "How to play",
                            dialogueText:
                                "To move, click on Nahla or Sir Camil. Then click to blue boot to move.\nMore boots cost more action points.",
                            speakerPortraitResourceKey:
                                "tutorial-confirm-cancel",
                            animationDuration: 0,
                            backgroundColor: [1, 2, 3],
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_1",
                            speakerName: "How to play",
                            dialogueText:
                                "Nahla and Sir Camil get 3 Action Points. You can spend them to move and act.",
                            speakerPortraitResourceKey:
                                "tutorial-spend-action-points",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_2",
                            speakerName: "How to play",
                            dialogueText:
                                "To act, click on the actions on the bottom of the screen and then click on your target.\nClick Confirm and watch the sparks fly.\nYou can always end your turn early by clicking the End Turn action.",
                            speakerPortraitResourceKey:
                                "tutorial-spend-action-points",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_3",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            speakerName: "Nahla",
                            dialogueText:
                                "Nahla can use her Water Cannon to attack from range.\nHealing Touch costs 2 of your 3 action points.\nBut it can heal one target.",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "how_to_play_4",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "Sir Camil has more Health and Armor than Nahla.\nHe has a longsword for melee attacks.\nRaise Shield to improve his Armor until the start of his next turn.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                    uiData: undefined,
                    drawUITask: undefined,
                },
                turn1: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn1_0",
                            speakerName: "Nahla",
                            dialogueText:
                                "How did they breach us so quickly?\nWithout raising an alarm?\nUgh! Let's get rid of them.",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn1_1",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "I'll take the lead.\nI can Raise Shield to briefly my armor.\nHeal me if I get injured.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                    uiData: undefined,
                    drawUITask: undefined,
                },
                turn2: {
                    uiData: undefined,
                    drawUITask: undefined,
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn2_0",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "And all of this sand poured in this morning... I can barely move through it.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn2_1",
                            speakerName: "Nahla",
                            dialogueText:
                                "Yes, the sand slows everyone down.\nThe demons, too. Let them waste energy coming to us.",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                },
                turn4: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn4_0",
                            speakerName: "Nahla",
                            dialogueText:
                                "I can barely see ahead of us. What's going on down there?",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn4_1",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "If you move the pointer to the edges of the screen, we can move the camera a bit.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                    uiData: undefined,
                    drawUITask: undefined,
                },
                turn5: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn5_0",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "What are those demons thinking? I don't know how far they can reach.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn5_1",
                            speakerName: "Nahla",
                            dialogueText:
                                "If you... hover the... mouse over them\nyou can see where they can move.",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn5_2",
                            speakerName: "Nahla",
                            dialogueText:
                                "Red sword tiles are where they can attack but cannot move to.\nBlue boot tiles show where they can travel or attack.",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                    uiData: undefined,
                    drawUITask: undefined,
                },
                turn7: {
                    directions: [
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn7_0",
                            speakerName: "Nahla",
                            dialogueText: "Ah! I missed again!",
                            speakerPortraitResourceKey:
                                "young nahla cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn7_1",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "The multiple attack penalty adds up quickly.\nYour third attack is usually not worth it.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                        {
                            type: CutsceneActionPlayerType.DIALOGUE,
                            id: "turn7_2",
                            speakerName: "Sir Camil",
                            dialogueText:
                                "Sometimes it's better to back away or raise your defenses rather than hope for a critical strike.",
                            speakerPortraitResourceKey:
                                "sir camil cutscene portrait",
                            animationDuration: 0,
                        },
                    ],
                    uiData: undefined,
                    drawUITask: undefined,
                },
            },
        },
    }

    const enemyDemonSlitherTemplate: SquaddieTemplate =
        SquaddieTemplateService.new({
            squaddieId: {
                name: "Slither Demon",
                templateId: "enemy_demon_slither",
                resources: {
                    mapIconResourceKey: "map icon demon slither",
                    actionSpritesByEmotion: {
                        NEUTRAL: "combat-demon-slither-neutral",
                        ATTACK: "combat-demon-slither-attack",
                        TARGETED: "combat-demon-slither-targeted",
                        DAMAGED: "combat-demon-slither-damaged",
                        DEAD: "combat-demon-slither-dead",
                    },
                },
                traits: {
                    booleanTraits: {
                        DEMON: true,
                    },
                },
                affiliation: SquaddieAffiliation.ENEMY,
            },
            attributes: ArmyAttributesService.new({
                maxHitPoints: 3,
                movement: {
                    movementPerAction: 2,
                    passThroughWalls: false,
                    crossOverPits: false,
                    ignoreTerrainCost: false,
                },
            }),
            actionTemplateIds: ["demon_slither_bite"],
        })
    const enemyDemonSlitherTemplate2: SquaddieTemplate =
        SquaddieTemplateService.new({
            ...enemyDemonSlitherTemplate,
            squaddieId: {
                ...enemyDemonSlitherTemplate.squaddieId,
                templateId: "enemyDemonSlitherTemplate2_id",
            },
            actionTemplateIds: ["demon_slither_bite"],
        })
    const allyGuardTemplate: SquaddieTemplate = SquaddieTemplateService.new({
        squaddieId: {
            name: "Guard",
            templateId: "ally_guard",
            resources: {
                mapIconResourceKey: "map icon demon slither",
                actionSpritesByEmotion: {
                    NEUTRAL: "combat-demon-slither-neutral",
                    ATTACK: "combat-demon-slither-attack",
                    TARGETED: "combat-demon-slither-targeted",
                    DAMAGED: "combat-demon-slither-damaged",
                    DEAD: "combat-demon-slither-dead",
                },
            },
            traits: {
                booleanTraits: {},
            },
            affiliation: SquaddieAffiliation.ALLY,
        },
        attributes: ArmyAttributesService.new({
            maxHitPoints: 3,
            movement: {
                movementPerAction: 2,
                passThroughWalls: false,
                crossOverPits: false,
                ignoreTerrainCost: false,
            },
        }),
        actionTemplateIds: ["short_sword"],
    })
    const noAffiliationLivingFlameTemplate: SquaddieTemplate =
        SquaddieTemplateService.new({
            squaddieId: {
                name: "Living Flame",
                templateId: "no_affiliation_living_flame",
                resources: {
                    mapIconResourceKey: "map icon demon slither",
                    actionSpritesByEmotion: {
                        NEUTRAL: "combat-demon-slither-neutral",
                        ATTACK: "combat-demon-slither-attack",
                        TARGETED: "combat-demon-slither-targeted",
                        DAMAGED: "combat-demon-slither-damaged",
                        DEAD: "combat-demon-slither-dead",
                    },
                },
                traits: {
                    booleanTraits: {},
                },
                affiliation: SquaddieAffiliation.ALLY,
            },
            attributes: ArmyAttributesService.new({
                maxHitPoints: 3,
                movement: {
                    movementPerAction: 2,
                    passThroughWalls: false,
                    crossOverPits: false,
                    ignoreTerrainCost: false,
                },
            }),
            actionTemplateIds: ["ignition"],
        })
    const npcActionTemplates: ActionTemplate[] = [
        {
            id: "demon_slither_bite",
            name: "Bite",
            targetConstraints: {
                minimumRange: 0,
                maximumRange: 1,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            },
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            [Trait.ATTACK]: true,
                        },
                    },
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    damageDescriptions: {
                        [DamageType.BODY]: 1,
                    },
                    healingDescriptions: {},
                    actionDecisions: [ActionDecisionType.TARGET_SQUADDIE],
                }),
            ],
            buttonIconResourceKey: "decision-button-sword",
        },
        {
            id: "short_sword",
            name: "Short sword",
            targetConstraints: {
                minimumRange: 0,
                maximumRange: 1,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            },
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            [Trait.ATTACK]: true,
                        },
                    },
                    damageDescriptions: {
                        [DamageType.BODY]: 1,
                    },
                    healingDescriptions: {},
                    actionDecisions: [ActionDecisionType.TARGET_SQUADDIE],
                }),
            ],
            buttonIconResourceKey: "decision-button-sword",
        },
        {
            id: "ignition",
            name: "Ignition",
            targetConstraints: {
                minimumRange: 0,
                maximumRange: 1,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            },
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: {
                        booleanTraits: {
                            [Trait.ATTACK]: true,
                        },
                    },
                    damageDescriptions: {
                        [DamageType.BODY]: 1,
                    },
                    healingDescriptions: {},
                    actionDecisions: [ActionDecisionType.TARGET_SQUADDIE],
                }),
            ],
            buttonIconResourceKey: "decision-button-sword",
        },
    ]

    return {
        missionData,
        enemyDemonSlitherTemplate,
        enemyDemonSlitherTemplate2,
        allyGuardTemplate,
        noAffiliationLivingFlameTemplate,
        npcActionTemplates,
    }
}
