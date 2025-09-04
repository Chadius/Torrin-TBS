type EnumLike<T> = T[keyof T]
type EnumPick<T, K extends keyof T> = T[K]
