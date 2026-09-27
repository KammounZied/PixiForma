interface IStateType {
    [key: string]: ICreateState
}
interface ICreateState {
    value: string | string[] | { [key: string]: any } | Date | boolean
    hintText: string
    isValid: boolean
    disabled: boolean
    label?: string | string[]
    required?: boolean
}
interface ISelectionState<T = string> {
    options: T[]
    selected: T[]
}
interface IRightsType {
    userHasEditRights: boolean
    userHasReadRights: boolean
    userHasDeleteRights: boolean
}
export type {
    IStateType,
    ICreateState,
    ISelectionState,
    IRightsType
}