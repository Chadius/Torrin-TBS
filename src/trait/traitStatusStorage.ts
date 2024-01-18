export enum Trait {
    UNKNOWN = "UNKNOWN",
    ATTACK = "ATTACK",
    HEALING = "HEALING",
    MOVEMENT = "MOVEMENT",
    HUMANOID = "HUMANOID",
    MONSU = "MONSU",
    TERRAN = "TERRAN",
    DEMON = "DEMON",
    CROSS_OVER_PITS = "CROSS_OVER_PITS",
    PASS_THROUGH_WALLS = "PASS_THROUGH_WALLS",
    TARGET_ARMOR = "TARGET_ARMOR",
    SKIP_ANIMATION = "SKIP_ANIMATION",
    TARGETS_SELF = "TARGETS_SELF",
    TARGETS_FOE = "TARGETS_FOE",
    TARGETS_ALLIES = "TARGETS_ALLIES",
    ALWAYS_SUCCEEDS = "ALWAYS_SUCCEEDS",
    CANNOT_CRITICALLY_SUCCEED = "CANNOT_CRITICALLY_SUCCEED",
    CANNOT_CRITICALLY_FAIL = "CANNOT_CRITICALLY_FAIL",
    NO_MULTIPLE_ATTACK_PENALTY = "NO_MULTIPLE_ATTACK_PENALTY",
}

export enum TraitCategory {
    UNKNOWN = "UNKNOWN",
    ACTION = "ACTION",
    CREATURE = "CREATURE",
    MOVEMENT = "MOVEMENT",
    ANIMATION = "ANIMATION",
}

const traitInformation: {
    [key in Trait]: {
        description: string,
        categories: TraitCategory[],
    }
} = {
    [Trait.UNKNOWN]: {
        description: "Should never be used.",
        categories: [TraitCategory.UNKNOWN],
    },
    [Trait.ATTACK]: {
        description: "Damage and negatively affect the target. Subject to a multiple attack penalty over repeated use.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.NO_MULTIPLE_ATTACK_PENALTY]: {
        description: "Attack Actions ",
        categories: [TraitCategory.ACTION],
    },
    [Trait.HEALING]: {
        description: "Positively affect the target by restoring hit points.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.MOVEMENT]: {
        description: "Moves the target across the map.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.HUMANOID]: {
        description: "Creatures have two legs, two arms to manipulate tools and have bilateral symmetry.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.MONSU]: {
        description: "Water djinn, able to manipulate primal forces and thirst.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.TERRAN]: {
        description: "Earth djinn, creatures of sand and stone. Skilled builders.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.DEMON]: {
        description: "Demons are an almost extinct race who feast on the sins of mortals.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.CROSS_OVER_PITS]: {
        description: "Can cross over but not stop on pits.",
        categories: [TraitCategory.MOVEMENT],
    },
    [Trait.PASS_THROUGH_WALLS]: {
        description: "Can cross over but not stop on walls.",
        categories: [TraitCategory.MOVEMENT],
    },
    [Trait.TARGET_ARMOR]: {
        description: "These actions succeed based on the target's armor.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.SKIP_ANIMATION]: {
        description: "Action does not require animation",
        categories: [TraitCategory.ACTION, TraitCategory.ANIMATION]
    },
    [Trait.TARGETS_SELF]: {
        description: "The acting Squaddie can target themself.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.TARGETS_FOE]: {
        description: "The acting Squaddie can target foes with this action.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.TARGETS_ALLIES]: {
        description: "The acting Squaddie can target allies with this action.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.ALWAYS_SUCCEEDS]: {
        description: "This ability always hits the target.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.CANNOT_CRITICALLY_SUCCEED]: {
        description: "This ability cannot critically succeed.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.CANNOT_CRITICALLY_FAIL]: {
        description: "This ability cannot critically fail.",
        categories: [TraitCategory.ACTION],
    },
}

export interface TraitStatusStorage {
    booleanTraits: { [key in Trait]?: boolean };
}

export const TraitStatusStorageHelper = {
    newUsingTraitValues: (initialTraitValues?: { [key in Trait]?: boolean }): TraitStatusStorage => {
        const newStorage: TraitStatusStorage = {
            booleanTraits: {}
        };
        if (initialTraitValues === undefined) {
            return newStorage;
        }

        Object.entries(initialTraitValues).forEach(([traitName, value]) => {
            const trait: Trait = Trait[traitName as keyof typeof Trait];
            if (trait && trait !== Trait.UNKNOWN) {
                setStatus(newStorage, trait, value);
            }
        })
        return newStorage;
    },
    clone: (original: TraitStatusStorage): TraitStatusStorage => {
        return clone(original);
    },
    getStatus: (data: TraitStatusStorage, trait: Trait): boolean => {
        return data.booleanTraits[trait];
    },
    setStatus: (data: TraitStatusStorage, trait: Trait, value: boolean): void => {
        setStatus(data, trait, value);
    },
    filterCategory(data: TraitStatusStorage, category: TraitCategory): TraitStatusStorage {
        return clone({
            ...data,
            booleanTraits: Object.fromEntries(
                Object.keys(data.booleanTraits)
                    .filter((traitName: Trait) =>
                        traitInformation[traitName].categories.includes(category)
                    )
                    .map((traitName: Trait) => [traitName, data.booleanTraits[traitName]])
            )
        });
    }
}

const setStatus = (data: TraitStatusStorage, trait: Trait, value: boolean): void => {
    data.booleanTraits[trait] = value;
};

const clone = (original: TraitStatusStorage): TraitStatusStorage => {
    return {
        booleanTraits: {...original.booleanTraits}
    };
};
