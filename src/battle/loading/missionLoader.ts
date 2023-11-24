import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {LoadMissionFromFile, MissionFileFormat} from "../../dataLoader/missionLoader";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionObjective, MissionObjectiveHelper} from "../missionResult/missionObjective";
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper
} from "../orchestrator/missionCutsceneCollection";
import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TeamStrategy, TeamStrategyType} from "../teamStrategy/teamStrategy";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieEmotion} from "../animation/actionAnimation/actionAnimationConstants";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {SquaddieActionHandler} from "../../squaddie/action";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {BattleSquaddieHelper} from "../battleSquaddie";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {GraphicImage} from "../../utils/graphics/graphicsContext";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {ImageUI} from "../../ui/imageUI";
import {RectArea} from "../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {BattleCamera} from "../battleCamera";
import {Cutscene} from "../../cutscene/cutscene";
import {DialogueBox} from "../../cutscene/dialogue/dialogueBox";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {SplashScreen} from "../../cutscene/splashScreen";

export const MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS: string[] = [
    "map icon move 1 action",
    "map icon move 2 actions",
    "map icon move 3 actions",
    "map icon attack 1 action"
];

export const MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS: string[] = [
    "armor class icon",
    "hit points icon",
];

export interface MissionLoaderCompletionProgress {
    started: boolean;
    loadedFileData: boolean;
}

export interface MissionLoaderStatus {
    objectives: MissionObjective[];
    missionMap: MissionMap | undefined;
    resourcesPendingLoading: string[];
    completionProgress: MissionLoaderCompletionProgress;
    squaddieData: {
        teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam }
        teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] };
    };
    cutsceneInfo: {
        cutsceneCollection: MissionCutsceneCollection,
        cutsceneTriggers: CutsceneTrigger[],
    };
    mapSettings: {
        camera: BattleCamera,
    };
}

export const MissionLoader = {
    newEmptyMissionLoaderStatus: (): MissionLoaderStatus => {
        return {
            missionMap: undefined,
            objectives: [],
            resourcesPendingLoading: [],
            completionProgress: {
                started: false,
                loadedFileData: false,
            },
            squaddieData: {
                teamsByAffiliation: {},
                teamStrategyByAffiliation: {}
            },
            cutsceneInfo: {
                cutsceneCollection: undefined,
                cutsceneTriggers: [],
            },
            mapSettings: {
                camera: undefined,
            },
        }
    },
    loadMissionFromFile: async ({
                                    missionLoaderStatus,
                                    missionId,
                                    resourceHandler,
                                }: {
        missionLoaderStatus: MissionLoaderStatus;
        missionId: string;
        resourceHandler: ResourceHandler;
    }) => {
        missionLoaderStatus.completionProgress.started = true;
        const missionData: MissionFileFormat = await LoadMissionFromFile(missionId);

        missionLoaderStatus.missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: missionData.terrain,
                resourceHandler,
            })
        });

        resourceHandler.loadResources(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS);
        missionLoaderStatus.resourcesPendingLoading = [
            ...missionLoaderStatus.resourcesPendingLoading,
            ...MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS,
        ];

        resourceHandler.loadResources(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS);
        missionLoaderStatus.resourcesPendingLoading = [
            ...missionLoaderStatus.resourcesPendingLoading,
            ...MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
        ];

        missionLoaderStatus.objectives = missionData.objectives.map(MissionObjectiveHelper.validateMissionObjective);

        missionLoaderStatus.completionProgress.loadedFileData = true;

        initializeCameraPosition({missionLoaderStatus});
    },
    loadMissionFromHardcodedData: ({
                                       missionLoaderStatus,
                                       squaddieRepository,
                                       resourceHandler,
                                   }: {
        missionLoaderStatus: MissionLoaderStatus,
        squaddieRepository: BattleSquaddieRepository,
        resourceHandler: ResourceHandler,
    }) => {
        loadMissionFromHardcodedData({
            missionLoaderStatus,
            squaddieRepository,
            resourceHandler,
        });
    },
    checkResourcesPendingLoading: ({missionLoaderStatus, resourceHandler}: {
        missionLoaderStatus: MissionLoaderStatus,
        resourceHandler: ResourceHandler,
    }) => {
        missionLoaderStatus.resourcesPendingLoading = missionLoaderStatus.resourcesPendingLoading.filter(
            resourceKey => {
                return resourceHandler.isResourceLoaded(resourceKey) !== true;
            }
        );
    },
    assignResourceHandlerResources: ({
                                         squaddieRepository,
                                         missionLoaderStatus,
                                         resourceHandler,
                                     }: {
        squaddieRepository: BattleSquaddieRepository;
        missionLoaderStatus: MissionLoaderStatus;
        resourceHandler: ResourceHandler
    }) => {
        initializeCutscenes({missionLoaderStatus});
        initializeSquaddieResources({squaddieRepository, missionLoaderStatus, resourceHandler});
    }
}

const initializeCameraPosition = ({
                                      missionLoaderStatus,
                                  }: {
    missionLoaderStatus: MissionLoaderStatus;
}) => {
    const mapDimensions = missionLoaderStatus.missionMap.terrainTileMap.getDimensions();
    missionLoaderStatus.mapSettings.camera = new BattleCamera();
    missionLoaderStatus.mapSettings.camera.setMapDimensionBoundaries(mapDimensions.widthOfWidestRow, mapDimensions.numberOfRows);
}

const initializeSquaddieResources = ({
                                         squaddieRepository,
                                         missionLoaderStatus,
                                         resourceHandler,
                                     }: {
    squaddieRepository: BattleSquaddieRepository;
    missionLoaderStatus: MissionLoaderStatus;
    resourceHandler: ResourceHandler
}) => {
    squaddieRepository.getBattleSquaddieIterator().forEach((info) => {
        const {battleSquaddie, battleSquaddieId} = info;
        const {squaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

        let image: GraphicImage = getResultOrThrowError(
            resourceHandler.getResource(squaddieTemplate.squaddieId.resources.mapIconResourceKey)
        );
        const datum = missionLoaderStatus.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

        if (datum.mapLocation !== undefined) {
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                datum.mapLocation.q, datum.mapLocation.r, ...missionLoaderStatus.mapSettings.camera.getCoordinates())

            squaddieRepository.imageUIByBattleSquaddieId[battleSquaddieId] = new ImageUI({
                graphic: image,
                area: new RectArea({
                    left: xyCoords[0],
                    top: xyCoords[1],
                    width: image.width,
                    height: image.height,
                    horizAlign: HORIZ_ALIGN_CENTER,
                    vertAlign: VERT_ALIGN_CENTER
                })
            });
        }
    });
}

const initializeCutscenes = ({
                                 missionLoaderStatus,
                             }: {
    missionLoaderStatus: MissionLoaderStatus;
}) => {
    Object.entries(missionLoaderStatus.cutsceneInfo.cutsceneCollection.cutsceneById).forEach(([id, cutscene]) => {
        cutscene.setResources();
    });
}

const loadMissionFromHardcodedData = ({
                                          missionLoaderStatus,
                                          squaddieRepository,
                                          resourceHandler,
                                      }: {
    missionLoaderStatus: MissionLoaderStatus,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    loadTorrin({
        missionLoaderStatus,
        squaddieRepository,
        resourceHandler,
    });

    loadSirCamil({
        missionLoaderStatus,
        squaddieRepository,
        resourceHandler,
    });
    loadSlitherDemons({
        missionLoaderStatus,
        squaddieRepository,
        resourceHandler,
    });
    loadTeamInfo({missionLoaderStatus});

    const affiliateIconResourceKeys = [
        "affiliate_icon_crusaders",
        "affiliate_icon_infiltrators",
        "affiliate_icon_western",
        "affiliate_icon_none",
    ];
    resourceHandler.loadResources(affiliateIconResourceKeys);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        ...affiliateIconResourceKeys,
    ];

    const bannerImageResourceKeys = [
        "phase banner player",
        "phase banner enemy",
    ];
    resourceHandler.loadResources(bannerImageResourceKeys);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        ...bannerImageResourceKeys,
    ];

    loadCutscenes({
        missionLoaderStatus,
        squaddieRepository,
        resourceHandler,
    });
};

const loadCutscenes = ({
                           missionLoaderStatus,
                           squaddieRepository,
                           resourceHandler,
                       }: {
    missionLoaderStatus: MissionLoaderStatus,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    const cutsceneCollection = MissionCutsceneCollectionHelper.new({
        cutsceneById: {
            [DEFAULT_VICTORY_CUTSCENE_ID]: new Cutscene({
                resourceHandler,
                actions: [
                    new DialogueBox({
                        id: "victory_0",
                        name: "Sir Camil",
                        text: "That's the last of them.",
                        portraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "victory_1",
                        name: "Torrin",
                        text: "Yay! We did it!",
                        portraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "victory_report_0",
                        name: "Mission Report",
                        text: "Turns: $$TURN_COUNT\nTime: $$TIME_ELAPSED",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "victory_report_1",
                        name: "Mission Report",
                        text: "Damage Dealt: $$DAMAGE_DEALT_BY_PLAYER_TEAM\nDamage Taken: $$DAMAGE_TAKEN_BY_PLAYER_TEAM\nHealing: $$HEALING_RECEIVED_BY_PLAYER_TEAM",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new SplashScreen({
                        id: "victory_final",
                        screenImageResourceKey: "splash victory",
                    }),
                ],
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
            }),
            [DEFAULT_DEFEAT_CUTSCENE_ID]: new Cutscene({
                resourceHandler: resourceHandler,
                actions: [
                    new DialogueBox({
                        id: "defeat_0",
                        name: "Torrin",
                        text: "We have to retreat!",
                        portraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "defeat_1",
                        name: "Sir Camil",
                        text: "Right. When we come back, let me take the lead, and let's take it slow.",
                        portraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new SplashScreen({
                        id: "defeat_final",
                        screenImageResourceKey: "splash defeat",
                    }),
                ],
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
            }),
            "introduction": new Cutscene({
                resourceHandler: resourceHandler,
                actions: [
                    new DialogueBox({
                        id: "how_to_play_0",
                        name: "How to play",
                        text: "To move, click on Torrin or Sir Camil. Then click to blue boot to move.\nMore boots cost more action points.",
                        portraitResourceKey: "tutorial-map",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "how_to_play_1",
                        name: "How to play",
                        text: "Torrin and Sir Camil get 3 Action Points. You can spend them to move and act.",
                        portraitResourceKey: "tutorial-hud",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "how_to_play_2",
                        name: "How to play",
                        text: "To act, click on the actions on the bottom of the screen and then click on your target.\nClick Confirm and watch the sparks fly.\nYou can always end your turn early by clicking the End Turn action.",
                        portraitResourceKey: "tutorial-hud",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "how_to_play_3",
                        portraitResourceKey: "young torrin cutscene portrait",
                        name: "Torrin",
                        text: "Torrin can use her Water Cannon to attack from range.\nHealing Touch will heal herself or Sir Camil for 2, but it costs 2 action points.",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "how_to_play_4",
                        name: "Sir Camil",
                        text: "Sir Camil has more health.\nHe has a longsword for melee attacks.",
                        portraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                ],
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
            }),
            "turn1": new Cutscene({
                resourceHandler: resourceHandler,
                actions: [
                    new DialogueBox({
                        id: "turn1_0",
                        name: "Torrin",
                        text: "How did they breach us so quickly?\nWithout raising an alarm?\nUgh! Let's get rid of them.",
                        portraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "turn1_1",
                        name: "Sir Camil",
                        text: "I agree. The courtyard must be cleansed.\nI'll take the lead. Stay behind me and heal me if I get hurt.\nIf we fight one at a time we should be alright.",
                        portraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                ],
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
            }),
            "turn2": new Cutscene({
                resourceHandler: resourceHandler,
                actions: [
                    new DialogueBox({
                        id: "turn2_0",
                        name: "Sir Camil",
                        text: "And all of this sand poured in this morning... I can barely move through it.",
                        portraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "turn2_1",
                        name: "Torrin",
                        text: "Yes, the sand slows everyone down.\nThe demons, too. Let them waste energy coming to us.",
                        portraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    })
                ],
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
            }),
            "turn4": new Cutscene({
                resourceHandler: resourceHandler,
                actions: [
                    new DialogueBox({
                        id: "turn4_0",
                        name: "Torrin",
                        text: "I can barely see ahead of us. What's going on down there?",
                        portraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "turn4_1",
                        name: "Sir Camil",
                        text: "If you move the pointer to the edges of the screen, we can move the camera a bit.",
                        portraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    })
                ],
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
            }),
            "turn5": new Cutscene({
                resourceHandler: resourceHandler,
                actions: [
                    new DialogueBox({
                        id: "turn5_0",
                        name: "Sir Camil",
                        text: "What are those demons thinking? I don't know how far they can reach.",
                        portraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    }),
                    new DialogueBox({
                        id: "turn5_1",
                        name: "Torrin",
                        text: "I can... tell where they can move. If you just... er, click on them, I can see it.",
                        portraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                        screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                    })
                ],
                screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
            }),
        },
    })

    const cutsceneResourceKeys = Object.values(cutsceneCollection.cutsceneById).map((cutscene) => {
        return cutscene.allResourceKeys;
    }).flat();
    resourceHandler.loadResources(cutsceneResourceKeys);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        ...cutsceneResourceKeys
    ];

    const cutsceneTriggers: CutsceneTrigger[] = [
        {
            triggeringEvent: TriggeringEvent.MISSION_VICTORY,
            cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
            systemReactedToTrigger: false,
        },
        {
            triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
            cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
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
    ];

    missionLoaderStatus.cutsceneInfo.cutsceneCollection = cutsceneCollection;
    missionLoaderStatus.cutsceneInfo.cutsceneTriggers = cutsceneTriggers;
}

const loadTorrin = ({
                        missionLoaderStatus,
                        squaddieRepository,
                        resourceHandler,
                    }: {
    missionLoaderStatus: MissionLoaderStatus,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    const mapIconResourceKey = "map icon young torrin";
    squaddieRepository.addSquaddie(
        {
            squaddieId: {
                templateId: "player_young_torrin",
                name: "Torrin",
                resources: {
                    mapIconResourceKey,
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "combat-young-torrin-neutral",
                        [SquaddieEmotion.ATTACK]: "combat-young-torrin-attack",
                        [SquaddieEmotion.TARGETED]: "combat-young-torrin-targeted",
                        [SquaddieEmotion.DAMAGED]: "combat-young-torrin-damaged",
                        [SquaddieEmotion.DEAD]: "combat-young-torrin-dead",
                    },
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues({
                    [Trait.HUMANOID]: true,
                    [Trait.MONSU]: true
                }),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: {
                maxHitPoints: 3,
                armorClass: 0,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                }),
            },
            actions: [
                SquaddieActionHandler.new({
                    name: "water cannon",
                    id: "torrin_water_cannon",
                    minimumRange: 0,
                    maximumRange: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.Body]: 2
                    }
                }),
                SquaddieActionHandler.new({
                    name: "healing touch",
                    id: "young_torrin_healing_touch",
                    minimumRange: 0,
                    maximumRange: 1,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.SKIP_ANIMATION]: true,
                        [Trait.TARGETS_ALLIES]: true,
                        [Trait.HEALING]: true,
                    }),
                    actionPointCost: 2,
                    healingDescriptions: {[HealingType.LostHitPoints]: 2}
                })
            ],
        },
        BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player_young_torrin",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: SquaddieTurnHandler.new(),
        })
    );
    missionLoaderStatus.missionMap.addSquaddie("player_young_torrin", "player_young_torrin", {q: 1, r: 0});

    resourceHandler.loadResources([mapIconResourceKey]);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        mapIconResourceKey
    ];
};

const loadSirCamil = ({
                          missionLoaderStatus,
                          squaddieRepository,
                          resourceHandler,
                      }: {
    missionLoaderStatus: MissionLoaderStatus,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    const mapIconResourceKey = "map icon sir camil";
    squaddieRepository.addSquaddie(
        {
            attributes: {
                maxHitPoints: 5,
                armorClass: 2,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                }),
            },
            squaddieId: {
                templateId: "player_sir_camil",
                name: "Sir Camil",
                resources: {
                    mapIconResourceKey,
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "combat-sir-camil-neutral",
                        [SquaddieEmotion.ATTACK]: "combat-sir-camil-attack",
                        [SquaddieEmotion.TARGETED]: "combat-sir-camil-targeted",
                        [SquaddieEmotion.DAMAGED]: "combat-sir-camil-damaged",
                        [SquaddieEmotion.DEAD]: "combat-sir-camil-dead",
                    },
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues({
                    [Trait.HUMANOID]: true,
                }),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            actions: [
                SquaddieActionHandler.new({
                    name: "longsword",
                    id: "sir_camil_longsword",
                    minimumRange: 0,
                    maximumRange: 1,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.Body]: 2
                    }
                })
            ],
        },
        BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player_sir_camil",
            squaddieTemplateId: "player_sir_camil",
            squaddieTurn: SquaddieTurnHandler.new(),
        })
    );
    missionLoaderStatus.missionMap.addSquaddie("player_sir_camil", "player_sir_camil", {q: 1, r: 1});

    resourceHandler.loadResources([mapIconResourceKey]);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        mapIconResourceKey
    ];
};

const loadSlitherDemons = ({
                               missionLoaderStatus,
                               squaddieRepository,
                               resourceHandler,
                           }: {
    missionLoaderStatus: MissionLoaderStatus,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    const mapIconResourceKey = "map icon demon slither";
    resourceHandler.loadResources([mapIconResourceKey]);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        mapIconResourceKey
    ];

    const demonSlitherMold: SquaddieTemplate = {
        attributes: {
            maxHitPoints: 3,
            armorClass: -5,
            movement: CreateNewSquaddieMovementWithTraits({
                movementPerAction: 2,
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
            }),
        },
        squaddieId: {
            templateId: "enemy_demon_slither",
            name: "Slither Demon",
            resources: {
                mapIconResourceKey: "map icon demon slither",
                actionSpritesByEmotion: {
                    [SquaddieEmotion.NEUTRAL]: "combat-demon-slither-neutral",
                    [SquaddieEmotion.ATTACK]: "combat-demon-slither-attack",
                    [SquaddieEmotion.TARGETED]: "combat-demon-slither-targeted",
                    [SquaddieEmotion.DAMAGED]: "combat-demon-slither-damaged",
                    [SquaddieEmotion.DEAD]: "combat-demon-slither-dead",
                },
            },
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.DEMON]: true,
            }),
            affiliation: SquaddieAffiliation.ENEMY,
        },
        actions: [
            SquaddieActionHandler.new({
                name: "Bite",
                id: "demon_slither_bite",
                minimumRange: 0,
                maximumRange: 1,
                traits: TraitStatusStorageHelper.newUsingTraitValues({[Trait.ATTACK]: true}),
                damageDescriptions: {
                    [DamageType.Body]: 1
                }
            })
        ],
    };
    squaddieRepository.addSquaddieTemplate(demonSlitherMold);

    [
        {
            battleSquaddieId: "enemy_demon_slither_0",
            location: {q: 1, r: 5},
        },
        {
            battleSquaddieId: "enemy_demon_slither_1",
            location: {q: 1, r: 9},
        },
        {
            battleSquaddieId: "enemy_demon_slither_2",
            location: {q: 1, r: 12},
        },
        {
            battleSquaddieId: "enemy_demon_slither_3",
            location: {q: 5, r: 15},
        },
        {
            battleSquaddieId: "enemy_demon_slither_4",
            location: {q: 7, r: 13},
        },
        {
            battleSquaddieId: "enemy_demon_slither_5",
            location: {q: 10, r: 14},
        },
        {
            battleSquaddieId: "enemy_demon_slither_6",
            location: {q: 13, r: 7},
        },
        {
            battleSquaddieId: "enemy_demon_slither_7",
            location: {q: 15, r: 10},
        },
    ].forEach(slitherDemonInfo => {
        let {
            location,
            battleSquaddieId,
        } = slitherDemonInfo;

        squaddieRepository.addBattleSquaddie(
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId,
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: SquaddieTurnHandler.new()
            })
        );
        missionLoaderStatus.missionMap.addSquaddie("enemy_demon_slither", battleSquaddieId, location);
    });
};

function loadTeamInfo({missionLoaderStatus}: {
    missionLoaderStatus: MissionLoaderStatus
}) {
    missionLoaderStatus.squaddieData.teamsByAffiliation[SquaddieAffiliation.PLAYER] = {
        affiliation: SquaddieAffiliation.PLAYER,
        name: "Crusaders",
        battleSquaddieIds: [
            "player_young_torrin",
            "player_sir_camil"
        ],
    };
    missionLoaderStatus.squaddieData.teamsByAffiliation[SquaddieAffiliation.ENEMY] = {
        affiliation: SquaddieAffiliation.ENEMY,
        name: "Infiltrators",
        battleSquaddieIds: [
            "enemy_demon_slither_0",
            "enemy_demon_slither_1",
            "enemy_demon_slither_2",
            "enemy_demon_slither_3",
            "enemy_demon_slither_4",
            "enemy_demon_slither_5",
            "enemy_demon_slither_6",
            "enemy_demon_slither_7",
        ],
    };
    missionLoaderStatus.squaddieData.teamStrategyByAffiliation[SquaddieAffiliation.ENEMY] = [
        {
            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
            options: {
                desiredAffiliation: SquaddieAffiliation.PLAYER,
            }
        },
        {
            type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
            options: {
                desiredAffiliation: SquaddieAffiliation.PLAYER,
            }
        },
    ]
}
