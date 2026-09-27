import { ICreateState } from "@/interfaces";

type functionType = (str: string) => boolean;
type functionPasswordType = (str: string, str2: string) => boolean
type functionArrayType = (str: Array<any>) => boolean;
type functionBoolType = (bool: boolean) => boolean;
export type Local = 'fr' | 'en';
export type listValidationType = 'isNotEmpty' | 'isEmpty' | 'isMail' | 'isMailOrEmpty' | 'isNumber' | 'hasUperCase' | 'hasNumber' | 'hasLowerCase' | 'isDate' | 'isUrl' | 'isDateValidation' | 'hasAlpha' | 'hasSpecial' | 'hasSpecialDate' | 'checkIsDate' | 'isValidTime' | 'validPassword' | 'notHaveSpecialCaracter' | 'hasMinimum8Characters' | 'isValidMatriculeFiscale' | 'isUniqueEmailArrayValues' | 'isValidPhonesArray'
type listArrayValidationType = 'isArray';
type listBooleanValidationType = 'isTrue';
export type ListValidation = {
  isEmpty: functionType;
  isNotEmpty: functionType;
  isMail: functionType;
  isMailOrEmpty: functionType;
  isNumber: functionType;
  hasUperCase: functionType;
  hasNumber: functionType;
  hasLowerCase: functionType;
  isDate: functionType
  isUrl: functionType
  isDateValidation: functionType
  hasAlpha: functionType
  hasSpecial: functionType
  hasSpecialDate: functionType
  checkIsDate: functionType
  checkLenghtNumber: functionType
  checkLenghtCvc: functionType
  checkLenghtPassword: functionType
  checkLenghtCodeConfirmation: functionType
  isPhoneNumber: functionType
  isNumberSpace: functionType
  isDateValid: functionType
  checkLenghtMessage: functionType
  isPasswordValid: functionType
  validPassword: functionType
  isIdenticalPassword: functionPasswordType
  isLink: functionType
  checkTimeLenght: functionType
  isValidUUID: functionType
  hasMinimum8Characters: functionType
  isValidMatriculeFiscale: functionType
  isUniqueEmailArrayValues: functionType
  isValidPhonesArray: functionType

};
export type ListArrayValidation = {
  isArray: functionArrayType
};
export type ListBooleanValidation = {
  isTrue: functionBoolType
};
export interface ValidationElement {
  type: string;
  hintText: string;
}
export type FormValidationInput = {
  list: {
    validation:
    {
      hintText: string;
      type: listValidationType | listArrayValidationType | listBooleanValidationType;
    }[];
    value: string;
  }[];
  state: {
    [key: string]: ICreateState;
  };
};
export type FormValidationRes = {
  [key: string]: {
    value: string | string[] | { [key: string]: any } | Date;
    isValid: boolean;
    hintText: string;
    disabled: boolean;
    label?: string;
  };
};
export type FormValidationOutput = {
  res: FormValidationRes;
  verif: boolean;
};