export interface TrashRobotWorld {
    trashWasCompacted: boolean
    trashExists: boolean
    trashIsHeld: boolean
    lowPower: boolean
}

export const TrashRobotWorldService = {
    new: (): TrashRobotWorld => ({
        trashExists: false,
        trashIsHeld: false,
        trashWasCompacted: false,
        lowPower: false,
    }),
    dropTrashOnGround: (world: TrashRobotWorld) => {
        world.trashExists = true
    },
    pickUpTrash: (world: TrashRobotWorld) => {
        world.trashExists = false
        world.trashIsHeld = true
    },
    throwTrashInCompactor: (world: TrashRobotWorld) => {
        world.trashExists = false
        world.trashIsHeld = false
        world.trashWasCompacted = true
    },
    compactorFinishesCompacting: (world: TrashRobotWorld) => {
        world.trashWasCompacted = false
    },
    robotIsLowOnPower: (world: TrashRobotWorld) => {
        world.lowPower = true
    },
    robotPowerIsRecharged: (world: TrashRobotWorld) => {
        world.lowPower = false
    },
}
