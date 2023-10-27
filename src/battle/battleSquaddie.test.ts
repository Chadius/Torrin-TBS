import {BattleSquaddie} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {SquaddieId} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {InBattleAttributes} from "./stats/inBattleAttributes";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {CreateNewSquaddieMovementWithTraits} from "../squaddie/movement";

describe('BattleSquaddie', () => {
    it('throws an error if battle squaddie has no template Id', () => {
        const shouldThrowError = () => {
            new BattleSquaddie({
                battleSquaddieId: "battleSquaddieId",
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Battle Squaddie has no Squaddie Template Id");
    });
    it('throws an error if battle squaddie has no battle Id', () => {
        const shouldThrowError = () => {
            const badBattleSquaddie: BattleSquaddie = new BattleSquaddie({
                squaddieTemplateId: "squaddieTemplateId",
                battleSquaddieId: "",
                squaddieTurn: new SquaddieTurn({}),
            })
            badBattleSquaddie.assertBattleSquaddie();
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Battle Squaddie has no Id");
    });
    describe('attributes', () => {
        let soldierTemplate: SquaddieTemplate;
        let battleSoldier: BattleSquaddie;

        beforeEach(() => {
            soldierTemplate = new SquaddieTemplate({
                squaddieId: new SquaddieId({
                    templateId: "soldier_static",
                    name: "Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                attributes: {
                    maxHitPoints: 5,
                    armorClass: 2,
                    movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                }
            });
        });

        it('will give battle squaddie defaults', () => {
            battleSoldier = new BattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplateId: soldierTemplate.squaddieId.templateId,
            });

            const defaultInBattleAttributes: InBattleAttributes = new InBattleAttributes();

            expect(battleSoldier.inBattleAttributes).toStrictEqual(defaultInBattleAttributes);
        });

        it('will create in battle attributes based on the army attributes given', () => {
            expect(soldierTemplate.attributes.maxHitPoints).toBe(5);
            expect(soldierTemplate.attributes.armorClass).toBe(2);

            battleSoldier = new BattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplateId: soldierTemplate.squaddieId.templateId,
            });

            battleSoldier.initializeInBattleAttributes(soldierTemplate.attributes);

            expect(battleSoldier.squaddieTemplateId).toBe(soldierTemplate.squaddieId.templateId);
            expect(battleSoldier.inBattleAttributes.currentHitPoints).toBe(soldierTemplate.attributes.maxHitPoints);
        });

        it('will create in battle attributes based on the static squaddie army attributes upon creation', () => {
            expect(soldierTemplate.attributes.maxHitPoints).toBe(5);
            expect(soldierTemplate.attributes.armorClass).toBe(2);

            battleSoldier = new BattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplate: soldierTemplate,
            });

            expect(battleSoldier.squaddieTemplateId).toBe(soldierTemplate.squaddieId.templateId);
            expect(battleSoldier.inBattleAttributes.currentHitPoints).toBe(soldierTemplate.attributes.maxHitPoints);
        });

        it('Can be created with inBattleAttributes', () => {
            const newBattleSoldier = new BattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplateId: soldierTemplate.squaddieId.templateId,
                inBattleAttributes: new InBattleAttributes(
                    {
                        maxHitPoints: 9001,
                        movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                        armorClass: 0,
                    }
                )
            });

            expect(newBattleSoldier.inBattleAttributes.armyAttributes.maxHitPoints).toBe(9001);
        });
    });
});
