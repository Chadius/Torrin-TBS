import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {LoadMissionFromFile, LoadPlayerArmyFromFile, MissionFileFormat} from "../../dataLoader/missionLoader";
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
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {SquaddieTurnService} from "../../squaddie/turn";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {GraphicImage} from "../../utils/graphics/graphicsContext";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {ImageUI} from "../../ui/imageUI";
import {RectAreaService} from "../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {BattleCamera} from "../battleCamera";
import {CutsceneService} from "../../cutscene/cutscene";
import {LoadFileIntoFormat} from "../../dataLoader/dataLoader";
import {PlayerArmy} from "../../campaign/playerArmy";
import {SquaddieResource} from "../../squaddie/resource";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {isValidValue} from "../../utils/validityCheck";
import {DialogueService} from "../../cutscene/dialogue/dialogue";
import {SplashScreenService} from "../../cutscene/splashScreen";

export const MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS: string[] = [
    "map icon move 1 action",
    "map icon move 2 actions",
    "map icon move 3 actions",
    "map icon attack 1 action"
];

export const MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS: string[] = [
    "armor class icon",
];

export interface MissionLoaderCompletionProgress {
    started: boolean;
    loadedFileData: boolean;
}

export interface MissionLoaderContext {
    id: string;
    objectives: MissionObjective[];
    missionMap: MissionMap | undefined;
    resourcesPendingLoading: string[];
    completionProgress: MissionLoaderCompletionProgress;
    squaddieData: {
        teams: BattleSquaddieTeam[];
        teamStrategyById: { [key: string]: TeamStrategy[] };
        templates: { [id: string]: SquaddieTemplate };
    };
    cutsceneInfo: {
        cutsceneCollection: MissionCutsceneCollection,
        cutsceneTriggers: CutsceneTrigger[],
    };
    mapSettings: {
        camera: BattleCamera,
    };
    phaseBannersByAffiliation: { [affiliation in SquaddieAffiliation]?: string };
}

export const MissionLoader = {
    newEmptyMissionLoaderContext: (): MissionLoaderContext => {
        return {
            id: "",
            missionMap: undefined,
            objectives: [],
            resourcesPendingLoading: [],
            completionProgress: {
                started: false,
                loadedFileData: false,
            },
            squaddieData: {
                teams: [],
                teamStrategyById: {},
                templates: {},
            },
            cutsceneInfo: {
                cutsceneCollection: undefined,
                cutsceneTriggers: [],
            },
            mapSettings: {
                camera: undefined,
            },
            phaseBannersByAffiliation: {
                [SquaddieAffiliation.PLAYER]: "",
                [SquaddieAffiliation.ENEMY]: "",
                [SquaddieAffiliation.ALLY]: "",
                [SquaddieAffiliation.NONE]: "",
            },
        }
    },
    loadMissionFromFile: async ({
                                    missionLoaderContext,
                                    missionId,
                                    resourceHandler,
                                    repository,
                                }: {
        missionLoaderContext: MissionLoaderContext;
        missionId: string;
        resourceHandler: ResourceHandler;
        repository: ObjectRepository;
    }) => {
        missionLoaderContext.completionProgress.started = true;
        const missionData: MissionFileFormat = await LoadMissionFromFile(missionId);

        missionLoaderContext.id = missionData.id;

        missionLoaderContext.missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: missionData.terrain,
                resourceHandler,
            })
        });

        resourceHandler.loadResources(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS);
        missionLoaderContext.resourcesPendingLoading = [
            ...missionLoaderContext.resourcesPendingLoading,
            ...MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS,
        ];

        resourceHandler.loadResources(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS);
        missionLoaderContext.resourcesPendingLoading = [
            ...missionLoaderContext.resourcesPendingLoading,
            ...MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
        ];

        missionLoaderContext.objectives = missionData.objectives.map(MissionObjectiveHelper.validateMissionObjective);

        missionLoaderContext.completionProgress.loadedFileData = true;

        missionLoaderContext.squaddieData.templates = {};
        missionData.enemy.templateIds.forEach(id => missionLoaderContext.squaddieData.templates[id] = undefined);

        await loadAndPrepareNPCTemplateData({
            missionLoaderContext: missionLoaderContext,
            resourceHandler,
            repository: repository
        });

        createPlayerSquaddieTeam(missionLoaderContext, missionData);
        deployRequiredPlayerSquaddies(missionLoaderContext, missionData);

        spawnNPCSquaddiesAndAddToMap({missionLoaderContext: missionLoaderContext, repository: repository, missionData});
        createSquaddieTeams({missionLoaderContext, missionData});

        initializeCameraPosition({missionLoaderContext: missionLoaderContext});

        loadPhaseAffiliationBanners(missionLoaderContext, missionData, repository, resourceHandler);
        loadTeamIcons(missionLoaderContext, missionData, repository, resourceHandler);
    },
    loadMissionFromHardcodedData: ({
                                       missionLoaderContext,
                                       squaddieRepository,
                                       resourceHandler,
                                   }: {
        missionLoaderContext: MissionLoaderContext,
        squaddieRepository: ObjectRepository,
        resourceHandler: ResourceHandler,
    }) => {
        loadMissionFromHardcodedData({
            missionLoaderContext,
            squaddieRepository,
            resourceHandler,
        });
    },
    checkResourcesPendingLoading: ({missionLoaderContext, resourceHandler}: {
        missionLoaderContext: MissionLoaderContext,
        resourceHandler: ResourceHandler,
    }) => {
        missionLoaderContext.resourcesPendingLoading = missionLoaderContext.resourcesPendingLoading.filter(
            resourceKey => {
                return resourceHandler.isResourceLoaded(resourceKey) !== true;
            }
        );
    },
    assignResourceHandlerResources: ({
                                         repository,
                                         missionLoaderContext,
                                         resourceHandler,
                                     }: {
        repository: ObjectRepository;
        missionLoaderContext: MissionLoaderContext;
        resourceHandler: ResourceHandler
    }) => {
        initializeCutscenes({missionLoaderContext, resourceHandler});
        initializeSquaddieResources({repository: repository, missionLoaderContext, resourceHandler});
    },
    loadPlayerArmyFromFile: async ({squaddieRepository, resourceHandler, missionLoaderContext}: {
        squaddieRepository: ObjectRepository;
        resourceHandler: ResourceHandler;
        missionLoaderContext: MissionLoaderContext
    }) => {
        const playerArmyData: PlayerArmy = await LoadPlayerArmyFromFile();
        playerArmyData.squaddieTemplates.forEach(template => {
            SquaddieTemplateService.sanitize(template);
            missionLoaderContext.squaddieData.templates[template.squaddieId.templateId] = template;
        });

        playerArmyData.squaddieTemplates.forEach(template => {
            const resources = template.squaddieId.resources;
            loadSquaddieTemplateResources({missionLoaderContext, resources, resourceHandler});
        });

        playerArmyData.squaddieTemplates.forEach(template => {
            const battleSquaddie: BattleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: template.squaddieId.templateId,
                inBattleAttributes: InBattleAttributesHandler.new(template.attributes),
                squaddieTemplate: template,
            })

            ObjectRepositoryService.addSquaddie(squaddieRepository, template, battleSquaddie);
        });
    }
}

const loadSquaddieTemplateResources = ({
                                           missionLoaderContext,
                                           resources,
                                           resourceHandler,
                                       }: {
    missionLoaderContext: MissionLoaderContext,
    resources: SquaddieResource,
    resourceHandler: ResourceHandler,
}) => {
    resourceHandler.loadResources([resources.mapIconResourceKey]);
    missionLoaderContext.resourcesPendingLoading.push(resources.mapIconResourceKey);

    resourceHandler.loadResources(Object.values(resources.actionSpritesByEmotion));
    missionLoaderContext.resourcesPendingLoading.push(...Object.values(resources.actionSpritesByEmotion));
};

const initializeCameraPosition = ({
                                      missionLoaderContext,
                                  }: {
    missionLoaderContext: MissionLoaderContext;
}) => {
    const mapDimensions = missionLoaderContext.missionMap.terrainTileMap.getDimensions();
    missionLoaderContext.mapSettings.camera = new BattleCamera();
    missionLoaderContext.mapSettings.camera.setMapDimensionBoundaries(mapDimensions.widthOfWidestRow, mapDimensions.numberOfRows);
}

const initializeSquaddieResources = ({
                                         repository,
                                         missionLoaderContext,
                                         resourceHandler,
                                     }: {
    repository: ObjectRepository;
    missionLoaderContext: MissionLoaderContext;
    resourceHandler: ResourceHandler
}) => {
    ObjectRepositoryService.getBattleSquaddieIterator(repository).forEach((info) => {
        const {battleSquaddie, battleSquaddieId} = info;
        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId));

        let image: GraphicImage = getResultOrThrowError(
            resourceHandler.getResource(squaddieTemplate.squaddieId.resources.mapIconResourceKey)
        );
        const datum = missionLoaderContext.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

        if (datum.mapLocation !== undefined) {
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                datum.mapLocation.q, datum.mapLocation.r, ...missionLoaderContext.mapSettings.camera.getCoordinates())

            repository.imageUIByBattleSquaddieId[battleSquaddieId] = new ImageUI({
                graphic: image,
                area: RectAreaService.new({
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
                                 missionLoaderContext,
                                 resourceHandler,
                             }: {
    missionLoaderContext: MissionLoaderContext;
    resourceHandler: ResourceHandler;
}) => {
    Object.entries(missionLoaderContext.cutsceneInfo.cutsceneCollection.cutsceneById).forEach(([id, cutscene]) => {
        CutsceneService.setResources(cutscene, resourceHandler);
    });
}

const loadMissionFromHardcodedData = ({
                                          missionLoaderContext,
                                          squaddieRepository,
                                          resourceHandler,
                                      }: {
    missionLoaderContext: MissionLoaderContext,
    squaddieRepository: ObjectRepository,
    resourceHandler: ResourceHandler,
}) => {
    loadCutscenes({
        missionLoaderContext,
        repository: squaddieRepository,
        resourceHandler,
    });
};

const loadCutscenes = ({
                           missionLoaderContext,
                           repository,
                           resourceHandler,
                       }: {
    missionLoaderContext: MissionLoaderContext,
    repository: ObjectRepository,
    resourceHandler: ResourceHandler,
}) => {
    const cutsceneCollection = MissionCutsceneCollectionHelper.new({
        cutsceneById: {
            [DEFAULT_VICTORY_CUTSCENE_ID]: CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "victory_0",
                        speakerName: "Sir Camil",
                        speakerText: "That's the last of them.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "victory_1",
                        speakerName: "Torrin",
                        speakerText: "Yay! We did it!",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "victory_1",
                        speakerName: "Torrin",
                        speakerText: "Yay! We did it!",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "victory_report_0",
                        speakerName: "Mission Report",
                        speakerText: "Turns: $$TURN_COUNT\nTime: $$TIME_ELAPSED",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "victory_report_1",
                        speakerName: "Mission Report",
                        speakerText: "Damage Dealt: $$DAMAGE_DEALT_BY_PLAYER_TEAM\nDamage Taken: $$DAMAGE_TAKEN_BY_PLAYER_TEAM\nHealing: $$HEALING_RECEIVED_BY_PLAYER_TEAM",
                        animationDuration: 0,
                    }),
                    SplashScreenService.new({
                        id: "victory_final",
                        screenImageResourceKey: "splash victory",
                    }),
                ],
            }),
            [DEFAULT_DEFEAT_CUTSCENE_ID]: CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "defeat_0",
                        speakerName: "Torrin",
                        speakerText: "We have to retreat!",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "defeat_1",
                        speakerName: "Sir Camil",
                        speakerText: "Right. When we come back, let me take the lead, and let's take it slow.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    }),
                    SplashScreenService.new({
                        id: "defeat_final",
                        screenImageResourceKey: "splash defeat",
                    }),
                ],
            }),
            "introduction": CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "how_to_play_0",
                        speakerName: "How to play",
                        speakerText: "To move, click on Torrin or Sir Camil. Then click to blue boot to move.\nMore boots cost more action points.",
                        speakerPortraitResourceKey: "tutorial-map",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "how_to_play_1",
                        speakerName: "How to play",
                        speakerText: "Torrin and Sir Camil get 3 Action Points. You can spend them to move and act.",
                        speakerPortraitResourceKey: "tutorial-hud",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "how_to_play_2",
                        speakerName: "How to play",
                        speakerText: "To act, click on the actions on the bottom of the screen and then click on your target.\nClick Confirm and watch the sparks fly.\nYou can always end your turn early by clicking the End Turn action.",
                        speakerPortraitResourceKey: "tutorial-hud",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "how_to_play_3",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        speakerName: "Torrin",
                        speakerText: "Torrin can use her Water Cannon to attack from range.\nHealing Touch will heal herself or Sir Camil for 2, but it costs 2 action points.",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "how_to_play_4",
                        speakerName: "Sir Camil",
                        speakerText: "Sir Camil has more health and armor than Torrin.\nHe has a longsword for melee attacks.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    }),
                ],
            }),
            "turn1": CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "turn1_0",
                        speakerName: "Torrin",
                        speakerText: "How did they breach us so quickly?\nWithout raising an alarm?\nUgh! Let's get rid of them.",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "turn1_1",
                        speakerName: "Sir Camil",
                        speakerText: "I agree. The courtyard must be cleansed.\nI'll take the lead. Stay behind me and heal me if I get hurt.\nIf we fight one at a time we should be alright.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    }),
                ],
            }),
            "turn2": CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "turn2_0",
                        speakerName: "Sir Camil",
                        speakerText: "And all of this sand poured in this morning... I can barely move through it.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "turn2_1",
                        speakerName: "Torrin",
                        speakerText: "Yes, the sand slows everyone down.\nThe demons, too. Let them waste energy coming to us.",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    })
                ],
            }),
            "turn4": CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "turn4_0",
                        speakerName: "Torrin",
                        speakerText: "I can barely see ahead of us. What's going on down there?",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "turn4_1",
                        speakerName: "Sir Camil",
                        speakerText: "If you move the pointer to the edges of the screen, we can move the camera a bit.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    })
                ],
            }),
            "turn5": CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "turn5_0",
                        speakerName: "Sir Camil",
                        speakerText: "What are those demons thinking? I don't know how far they can reach.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "turn5_1",
                        speakerName: "Torrin",
                        speakerText: "I can... tell where they can move. If you just... er, click on them, I can see where they can move.",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "turn5_2",
                        speakerName: "Torrin",
                        speakerText: "Red sword tiles are where they can attack but cannot move to.\nBlue boot tiles show where they can travel or attack.",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    })
                ],
            }),
            "turn7": CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "turn7_0",
                        speakerName: "Torrin",
                        speakerText: "Ah! I missed again!",
                        speakerPortraitResourceKey: "young torrin cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "turn7_1",
                        speakerName: "Sir Camil",
                        speakerText: "The multiple attack penalty adds up quickly.\nYour third attack is usually not worth it.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    }),
                    DialogueService.new({
                        id: "turn7_2",
                        speakerName: "Sir Camil",
                        speakerText: "Sometimes it's better to back away or raise your defenses rather than hope for a critical strike.",
                        speakerPortraitResourceKey: "sir camil cutscene portrait",
                        animationDuration: 0,
                    })
                ],
            }),
        },
    })

    const cutsceneResourceKeys = Object.values(cutsceneCollection.cutsceneById).map((cutscene) => {
        return cutscene.allResourceKeys;
    }).flat();
    resourceHandler.loadResources(cutsceneResourceKeys);
    missionLoaderContext.resourcesPendingLoading = [
        ...missionLoaderContext.resourcesPendingLoading,
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
        {
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            cutsceneId: "turn7",
            turn: 7,
        },
    ];

    missionLoaderContext.cutsceneInfo.cutsceneCollection = cutsceneCollection;
    missionLoaderContext.cutsceneInfo.cutsceneTriggers = cutsceneTriggers;
}

const loadNPCTemplatesFromFile = async (templateIds: string[]): Promise<{ [p: string]: SquaddieTemplate }> => {
    let squaddiesById: { [p: string]: SquaddieTemplate } = {};
    for (const templateId of templateIds) {
        try {
            const squaddieTemplate = await LoadFileIntoFormat<SquaddieTemplate>(`assets/npcData/templates/${templateId}.json`)
            squaddiesById[templateId] = SquaddieTemplateService.sanitize(squaddieTemplate);
        } catch (e) {
            console.error(`Failed to load template: ${templateId}`);
            console.error(e);
            throw e;
        }
    }
    return squaddiesById;
}

const loadAndPrepareNPCTemplateData = async ({
                                                 missionLoaderContext,
                                                 resourceHandler,
                                                 repository,
                                             }: {
    missionLoaderContext: MissionLoaderContext;
    resourceHandler: ResourceHandler
    repository: ObjectRepository;
}) => {
    let loadedTemplatesById: { [p: string]: SquaddieTemplate } = {};
    const loadedNPCTemplatesById = await loadNPCTemplatesFromFile(Object.keys(missionLoaderContext.squaddieData.templates));
    loadedTemplatesById = {...loadedNPCTemplatesById};

    Object.values(loadedTemplatesById).forEach(template => {
        SquaddieTemplateService.sanitize(template);
    });

    Object.assign(missionLoaderContext.squaddieData.templates, loadedTemplatesById);

    Object.values(loadedTemplatesById).forEach(template => {
        resourceHandler.loadResource(template.squaddieId.resources.mapIconResourceKey);
        missionLoaderContext.resourcesPendingLoading.push(template.squaddieId.resources.mapIconResourceKey);

        resourceHandler.loadResources(Object.values(template.squaddieId.resources.actionSpritesByEmotion));
        missionLoaderContext.resourcesPendingLoading.push(
            ...Object.values(template.squaddieId.resources.actionSpritesByEmotion)
        );

        ObjectRepositoryService.addSquaddieTemplate(repository, template);
    });
}

const spawnNPCSquaddiesAndAddToMap = ({
                                          repository,
                                          missionLoaderContext,
                                          missionData
                                      }: {
    repository: ObjectRepository,
    missionLoaderContext: MissionLoaderContext,
    missionData: MissionFileFormat,
}) => {
    missionData.enemy.mapPlacements.forEach(mapPlacement => {
        let {
            location,
            battleSquaddieId,
            squaddieTemplateId,
        } = mapPlacement;
        ObjectRepositoryService.addBattleSquaddie(repository,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId,
                squaddieTemplateId,
                squaddieTurn: SquaddieTurnService.new(),
            })
        );
        missionLoaderContext.missionMap.addSquaddie(squaddieTemplateId, battleSquaddieId, location);
    });
}

const createSquaddieTeams = ({missionData, missionLoaderContext}: {
    missionData: MissionFileFormat;
    missionLoaderContext: MissionLoaderContext
}) => {
    missionData.enemy.teams.forEach(enemyTeam => {
        const team: BattleSquaddieTeam = {
            id: enemyTeam.id,
            name: enemyTeam.name,
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: enemyTeam.battleSquaddieIds,
            iconResourceKey: enemyTeam.iconResourceKey,
        }
        missionLoaderContext.squaddieData.teams ||= [];
        missionLoaderContext.squaddieData.teams.push(team);
        missionLoaderContext.squaddieData.teamStrategyById[team.id] ||= [];
        missionLoaderContext.squaddieData.teamStrategyById[team.id].push(...enemyTeam.strategies);
    });
}

const deployRequiredPlayerSquaddies = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat) => {
    missionLoaderContext.missionMap.playerDeployment = {...missionData.player.deployment};
    missionLoaderContext.missionMap.playerDeployment.required.forEach(requiredDeployment => {
        missionLoaderContext.missionMap.addSquaddie(requiredDeployment.squaddieTemplateId, requiredDeployment.battleSquaddieId, requiredDeployment.location);
    });
}

const createPlayerSquaddieTeam = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat) => {
    missionLoaderContext.squaddieData.teams ||= [];
    missionLoaderContext.squaddieData.teams.push(
        {
            id: missionData.player.teamId,
            name: missionData.player.teamName,
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: missionData.player.deployment.required.map(info => info.battleSquaddieId),
            iconResourceKey: missionData.player.iconResourceKey,
        }
    );
}

const loadPhaseAffiliationBanners = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat, repository: ObjectRepository, resourceHandler: ResourceHandler) => {
    missionLoaderContext.phaseBannersByAffiliation = {...missionData.phaseBannersByAffiliation};
    Object.entries(missionLoaderContext.phaseBannersByAffiliation).forEach(([affiliationKey, resourceKeyName]) => {
        if (!isValidValue(resourceKeyName) || resourceKeyName === "") {
            return;
        }

        const affiliation: SquaddieAffiliation = affiliationKey as SquaddieAffiliation;
        repository.uiElements.phaseBannersByAffiliation[affiliation] = resourceKeyName;

        resourceHandler.loadResource(resourceKeyName);
        missionLoaderContext.resourcesPendingLoading.push(resourceKeyName);
    });
};

const loadTeamIcons = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat, repository: ObjectRepository, resourceHandler: ResourceHandler) => {
    repository.uiElements.teamAffiliationIcons = {};

    const playerTeamIconResourceKey = missionData.player.iconResourceKey;
    if (isValidValue(playerTeamIconResourceKey) && playerTeamIconResourceKey !== "") {
        repository.uiElements.teamAffiliationIcons[missionData.player.teamId] = playerTeamIconResourceKey;
        resourceHandler.loadResource(playerTeamIconResourceKey);
        missionLoaderContext.resourcesPendingLoading.push(playerTeamIconResourceKey);
    }

    missionData.enemy.teams
        .filter(team => isValidValue(team.iconResourceKey) && team.iconResourceKey !== "")
        .forEach(team => {
            const teamIconResourceKey = team.iconResourceKey;
            repository.uiElements.teamAffiliationIcons[team.id] = teamIconResourceKey;
            resourceHandler.loadResource(teamIconResourceKey);
            missionLoaderContext.resourcesPendingLoading.push(teamIconResourceKey);
        });
}
