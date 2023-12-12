import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import * as mocks from "../../utils/test/mocks";
import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionFileFormat} from "../../dataLoader/missionLoader";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionType} from "../missionResult/missionCondition";
import * as DataLoader from "../../dataLoader/dataLoader";
import {
    MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
    MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS,
    MissionLoader,
    MissionLoaderStatus
} from "./missionLoader";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {makeResult} from "../../utils/ResultOrError";
import {DEFAULT_VICTORY_CUTSCENE_ID} from "../orchestrator/missionCutsceneCollection";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";
import {TargetingShape} from "../targeting/targetingShapeGenerator";

describe('Mission Loader', () => {
    let resourceHandler: ResourceHandler;
    let missionData: MissionFileFormat;
    let missionLoadSpy: jest.SpyInstance;
    let missionLoaderStatus: MissionLoaderStatus;
    let squaddieRepository: BattleSquaddieRepository;
    let enemyDemonSlitherTemplate: SquaddieTemplate;
    let enemyDemonSlitherTemplate2: SquaddieTemplate;

    beforeEach(() => {
        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.loadResources = jest.fn();
        resourceHandler.loadResource = jest.fn();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValue(true);

        missionData = {
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
            "enemy": {
                "template_ids": [
                    "enemy template",
                    "another enemy template",
                ]
            },
        }

        enemyDemonSlitherTemplate = {
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
        enemyDemonSlitherTemplate2 = {
            ...enemyDemonSlitherTemplate,
            "squaddieId": {
                ...enemyDemonSlitherTemplate.squaddieId,
                templateId: "enemyDemonSlitherTemplate2_id",
            }
        };

        missionLoadSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockImplementation(async (filename: string): Promise<MissionFileFormat | SquaddieTemplate> => {
            if (filename === "assets/mission/0000.json") {
                return missionData;
            }

            if (filename === "assets/npcData/templates/enemy template.json") {
                return enemyDemonSlitherTemplate;
            }

            if (filename === "assets/npcData/templates/another enemy template.json") {
                return enemyDemonSlitherTemplate2;
            }
        });
        missionLoaderStatus = MissionLoader.newEmptyMissionLoaderStatus();
        squaddieRepository = new BattleSquaddieRepository();
    });

    it('knows it has not started yet', () => {
        expect(missionLoaderStatus.completionProgress.started).toBeFalsy();
        expect(missionLoaderStatus.completionProgress.loadedFileData).toBeFalsy();
    });

    describe('can load mission data from a file', () => {
        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderStatus,
                missionId: "0000",
                resourceHandler,
                squaddieRepository,
            });
        });

        it('calls the loading function', () => {
            expect(missionLoadSpy).toBeCalled();
        });

        it('reports file loading was a success', () => {
            expect(missionLoaderStatus.completionProgress.loadedFileData).toBeTruthy();
        });

        it('loads the mission id', () => {
            expect(missionLoaderStatus.id).toBe("test mission");
        });

        it('loaded the mission map', () => {
            expect(missionLoaderStatus.missionMap.terrainTileMap).toEqual(
                new TerrainTileMap({
                    movementCost: [
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
                    resourceHandler,
                })
            )
        });

        it('tries to load movement resources for the map', () => {
            expect(resourceHandler.loadResources).toBeCalledWith(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS);
            expect(missionLoaderStatus.resourcesPendingLoading).toEqual(
                expect.arrayContaining(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS)
            );
        });

        it('tries to load attribute icons for the map', () => {
            expect(resourceHandler.loadResources).toBeCalledWith(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS);
            expect(missionLoaderStatus.resourcesPendingLoading).toEqual(
                expect.arrayContaining(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS)
            );
        });

        it('can extract and validate objectives', () => {
            const clonedObjectives = missionData.objectives.map(obj => {
                return {...obj}
            });
            expect(clonedObjectives[0]).not.toBe(missionLoaderStatus.objectives[0]);
            expect(clonedObjectives[0]).toEqual(missionLoaderStatus.objectives[0]);
            const validatedMissionObjectives = clonedObjectives.map(MissionObjectiveHelper.validateMissionObjective);
            expect(missionLoaderStatus.objectives).toEqual(validatedMissionObjectives);
        });

        it('initializes the camera', () => {
            expect(missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(missionLoaderStatus.mapSettings.camera.mapDimensionBoundaries.numberOfRows).toBe(18);
        });

        describe('npc squaddie information', () => {
            it('knows the template ids for this map', () => {
                expect(missionLoaderStatus.squaddieData.templates).toHaveProperty("enemy template")
                expect(missionLoaderStatus.squaddieData.templates["enemy template"]).toEqual(enemyDemonSlitherTemplate);

                expect(missionLoaderStatus.squaddieData.templates).toHaveProperty("another enemy template")
                expect(missionLoaderStatus.squaddieData.templates["another enemy template"]).toEqual(enemyDemonSlitherTemplate2);
            });
            it('knows it has to load resources based on the template resources', () => {
                expect(missionLoaderStatus.resourcesPendingLoading).toContain(enemyDemonSlitherTemplate.squaddieId.resources.mapIconResourceKey);
                Object.values(enemyDemonSlitherTemplate.squaddieId.resources.actionSpritesByEmotion).forEach(resourceKey => {
                    expect(missionLoaderStatus.resourcesPendingLoading).toContain(resourceKey);
                });

                expect(resourceHandler.loadResource).toBeCalledWith(enemyDemonSlitherTemplate.squaddieId.resources.mapIconResourceKey);
                expect(resourceHandler.loadResources).toBeCalledWith(Object.values(enemyDemonSlitherTemplate.squaddieId.resources.actionSpritesByEmotion));
            });
            it('knows to add the template to the squaddie repository', () => {
                expect(squaddieRepository.getSquaddieTemplateIterator().length).toBeGreaterThan(0);
                expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate.squaddieId.templateId));
                expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate2.squaddieId.templateId));
            });
        })
    });

    describe('can load mission data from hardcoded assets', () => {

        let initialPendingResourceListLength: number;

        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderStatus,
                missionId: "0000",
                resourceHandler,
                squaddieRepository,
            });

            initialPendingResourceListLength = missionLoaderStatus.resourcesPendingLoading.length;

            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderStatus,
                squaddieRepository,
                resourceHandler,
            });
        });

        it('gets squaddies', () => {
            expect(squaddieRepository.getSquaddieTemplateIterator().length).toBeGreaterThan(0);
            expect(Object.keys(missionLoaderStatus.squaddieData.teamsByAffiliation).length).toBeGreaterThan(0);
            expect(Object.keys(missionLoaderStatus.squaddieData.teamStrategyByAffiliation).length).toBeGreaterThan(0);
            expect(missionLoaderStatus.resourcesPendingLoading.length).toBeGreaterThan(initialPendingResourceListLength);
        });

        it('gets cutscenes', () => {
            expect("cutsceneCollection" in missionLoaderStatus.cutsceneInfo).toBeTruthy();
            expect("cutsceneTriggers" in missionLoaderStatus.cutsceneInfo).toBeTruthy();
        });
    });

    it('can reduce the pending resources', () => {
        missionLoaderStatus.resourcesPendingLoading = ["A", "B", "C"];
        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return false;
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus,
            resourceHandler,
        });
        expect(missionLoaderStatus.resourcesPendingLoading).toEqual(["A", "B", "C"]);

        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return resourceKey === "A";
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus,
            resourceHandler,
        });
        expect(missionLoaderStatus.resourcesPendingLoading).toEqual(["B", "C"]);

        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return true;
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderStatus,
            resourceHandler,
        });
        expect(missionLoaderStatus.resourcesPendingLoading).toEqual([]);
    });

    describe('initializes resources once loading is finished and resources are found', () => {
        beforeEach(async () => {
            resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));

            await MissionLoader.loadMissionFromFile({
                missionLoaderStatus,
                missionId: "0000",
                resourceHandler,
                squaddieRepository,
            });

            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderStatus,
                squaddieRepository,
                resourceHandler,
            });

            jest.spyOn(resourceHandler, "isResourceLoaded").mockReturnValue(true);
            resourceHandler.loadResources(missionLoaderStatus.resourcesPendingLoading);

            MissionLoader.assignResourceHandlerResources({
                missionLoaderStatus,
                resourceHandler,
                squaddieRepository,
            });
        });

        it('initializes squaddie resources', () => {
            expect(Object.keys(squaddieRepository.imageUIByBattleSquaddieId)).toHaveLength(squaddieRepository.getBattleSquaddieIterator().length);
        });

        it('initializes cutscenes', () => {
            expect(missionLoaderStatus.cutsceneInfo.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
        });

        it('has the squaddie templates that were loaded from files', () => {
            expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate.squaddieId.templateId));
            expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate2.squaddieId.templateId));
        });
    });
});
