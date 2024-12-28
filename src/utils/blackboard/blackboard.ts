export interface Blackboard {
    data: {
        [key: string]: any
    }
}

export const BlackboardService = {
    new: (): Blackboard => ({ data: {} }),
    add: <T>(blackboard: Blackboard, key: string, value: T): void => {
        blackboard.data[key] = value
    },
    get: <T>(blackboard: Blackboard, key: string): T => {
        return blackboard.data[key]
    },
}
