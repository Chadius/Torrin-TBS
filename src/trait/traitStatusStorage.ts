import { isValidValue } from "../utils/objectValidityCheck"

export const Trait = {
    UNKNOWN: "UNKNOWN",
    ATTACK: "ATTACK",
    HEALING: "HEALING",
    MOVEMENT: "MOVEMENT",
    HUMANOID: "HUMANOID",
    MONSU: "MONSU",
    TERRAN: "TERRAN",
    DEMON: "DEMON",
    CROSS_OVER_PITS: "CROSS_OVER_PITS",
    PASS_THROUGH_WALLS: "PASS_THROUGH_WALLS",
    SKIP_ANIMATION: "SKIP_ANIMATION",
    ALWAYS_SUCCEEDS: "ALWAYS_SUCCEEDS",
    CANNOT_CRITICALLY_SUCCEED: "CANNOT_CRITICALLY_SUCCEED",
    CANNOT_CRITICALLY_FAIL: "CANNOT_CRITICALLY_FAIL",
    NO_MULTIPLE_ATTACK_PENALTY: "NO_MULTIPLE_ATTACK_PENALTY",
    HUSTLE: "HUSTLE",
    ELUSIVE: "ELUSIVE",
} as const satisfies Record<string, string>

export type TTrait = EnumLike<typeof Trait>

export const TraitCategory = {
    UNKNOWN: "UNKNOWN",
    ACTION: "ACTION",
    CREATURE: "CREATURE",
    MOVEMENT: "MOVEMENT",
    ANIMATION: "ANIMATION",
} as const satisfies Record<string, string>

export type TTraitCategory = EnumLike<typeof TraitCategory>

const traitInformation: {
    [key in TTrait]: {
        description: string
        categories: TTraitCategory[]
    }
} = {
    [Trait.UNKNOWN]: {
        description: "Should never be used.",
        categories: [TraitCategory.UNKNOWN],
    },
    [Trait.ATTACK]: {
        description:
            "Damage and negatively affect the target. Subject to a multiple attack penalty over repeated use.",
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
        description:
            "Creatures have two legs, two arms to manipulate tools and have bilateral symmetry.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.MONSU]: {
        description:
            "Water djinn, able to manipulate primal forces and thirst.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.TERRAN]: {
        description:
            "Earth djinn, creatures of sand and stone. Skilled builders.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.DEMON]: {
        description:
            "Demons are an almost extinct race who feast on the sins of mortals.",
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
    [Trait.HUSTLE]: {
        description: "All terrain costs 1 movement.",
        categories: [TraitCategory.MOVEMENT],
    },
    [Trait.SKIP_ANIMATION]: {
        description: "Action does not require animation",
        categories: [TraitCategory.ACTION, TraitCategory.ANIMATION],
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
    [Trait.ELUSIVE]: {
        description:
            "You can move through squaddies, even if they are not your ally",
        categories: [TraitCategory.MOVEMENT],
    },
}

export interface TraitStatusStorage {
    booleanTraits: { [key in TTrait]?: boolean }
}

export const TraitStatusStorageService = {
    newUsingTraitValues: (initialTraitValues?: {
        [key in TTrait]?: boolean
    }): TraitStatusStorage => {
        const newStorage: TraitStatusStorage = {
            booleanTraits: {},
        }
        if (initialTraitValues === undefined) {
            return newStorage
        }

        Object.entries(initialTraitValues).forEach(([traitName, value]) => {
            const trait: TTrait = Trait[traitName as keyof typeof Trait]
            if (trait && trait !== Trait.UNKNOWN) {
                setStatus(newStorage, trait, value)
                return
            }
            console.log(
                `[TraitStatusStorageService] ${traitName} is not a trait, ignoring`
            )
        })
        return newStorage
    },
    clone: (original: TraitStatusStorage): TraitStatusStorage => {
        return clone(original)
    },
    getStatus: (data: TraitStatusStorage, trait: TTrait): boolean => {
        return data.booleanTraits[trait]
    },
    setStatus: (
        data: TraitStatusStorage,
        trait: TTrait,
        value: boolean
    ): void => {
        setStatus(data, trait, value)
    },
    filterCategory(
        data: TraitStatusStorage,
        category: TTraitCategory
    ): TraitStatusStorage {
        return clone({
            ...data,
            booleanTraits: Object.fromEntries(
                Object.keys(data.booleanTraits)
                    .filter((traitName: TTrait) =>
                        traitInformation[traitName].categories.includes(
                            category
                        )
                    )
                    .map((traitName: TTrait) => [
                        traitName,
                        data.booleanTraits[traitName],
                    ])
            ),
        })
    },
    sanitize: (traits: TraitStatusStorage): TraitStatusStorage => {
        return sanitize(traits)
    },
}

const setStatus = (
    data: TraitStatusStorage,
    trait: TTrait,
    value: boolean
): void => {
    data.booleanTraits[trait] = value
}

const clone = (original: TraitStatusStorage): TraitStatusStorage => {
    return {
        booleanTraits: { ...original.booleanTraits },
    }
}

const sanitize = (traits: TraitStatusStorage): TraitStatusStorage => {
    if (!isValidValue(traits)) {
        return traits
    }

    const traitIsInvalid = (traitName: string) =>
        traitName === undefined ||
        (traitName as TTrait) == Trait.UNKNOWN ||
        !Object.values(Trait).includes(traitName as TTrait)

    if (!isValidValue(traits.booleanTraits)) {
        traits.booleanTraits = {}
    }

    Object.keys(traits.booleanTraits).forEach((traitName) => {
        if (traitIsInvalid(traitName)) {
            console.log(
                `[TraitStatusStorageService] ${traitName} is not a trait, ignoring`
            )
        }
    })

    const invalidKeys = Object.keys(traits.booleanTraits)
        .filter(isValidValue)
        .filter(traitIsInvalid)
    invalidKeys.forEach((traitName) => {
        delete traits.booleanTraits[traitName as TTrait]
    })

    return traits
}
