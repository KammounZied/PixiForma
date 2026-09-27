import { IAtomIcon } from "../IAtomIcon/IAtomIcon";

export interface IAtomSpinner extends Omit<IAtomIcon, 'name' | 'handleClick'> { }