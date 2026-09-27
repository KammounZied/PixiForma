
class CommonValidation {
  private static instance: CommonValidation
  public listValidation: any
  constructor() {
    this.listValidation = {
      isNotEmpty: this.hasCharacters.bind(this),
      isMail: this.isMail.bind(this),
      isMailOrEmpty: this.isMailOrEmpty.bind(this),
      hasUperCase: this.hasUperCase.bind(this),
      hasNumber: this.hasNumber.bind(this),
      hasLowerCase: this.hasLowerCase.bind(this),
      isValidPhoneNumber: this.isValidPhoneNumber.bind(this),
      validPassword: this.validPassword.bind(this),
      identicalPassword: this.sameString.bind(this),
      checkIsDate: this.checkIsDate,
      isEmpty: this.isEmpty.bind(this),
      isValidTime: this.isValidTime.bind(this),
      notHaveSpecialCaracter: this.notHaveSpecialCaracter.bind(this),
      hasMinimum8Characters: this.hasMinimum8Characters.bind(this),
      isValidMatriculeFiscale: this.isValidMatriculeFiscale.bind(this),
      isUniqueEmailArrayValues: this.isUniqueEmailArrayValues.bind(this),
      isValidPhonesArray: this.isValidPhonesArray.bind(this)
    }
  }
  public static getInstance(): CommonValidation {
    if (!CommonValidation.instance) {
      CommonValidation.instance = new CommonValidation()
    }
    return CommonValidation.instance
  }
  hasUperCase(str: string) {
    return /[A-Z]/.test(str)
  }
  hasLowerCase(str: string) {
    return /[a-z]/.test(str)
  }
  hasNumber(str: string) {
    return /[0-9]/.test(str)
  }
  hasSpecialCaracter(str: string) {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(str)
  }
  notHaveSpecialCaracter(str: string) {
    return !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(str)
  }
  isMail(str: string) {
    return /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      str
    )
  }
  isMailOrEmpty(str: string): boolean {
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    return str === '' || emailRegex.test(str);
  }
  isValidTime(str: string): boolean {
    const timeRegex = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;
    return timeRegex.test(str);
  }
  validPassword(str: string) {
    return (
      this.hasUperCase(str) &&
      this.hasLowerCase(str) &&
      this.hasSpecialCaracter(str) &&
      this.hasNumber(str) &&
      str.length >= 8
    )
  }
  hasCharacters(str: string | any[]) {
    if (Array.isArray(str)) {
      return str.length > 0 && str.some(item => item.toString().trim() !== '');
    }
    if (str) {
      return str.toString().trim() !== '';
    }
    return false;
  }
  public isValidPhoneNumber(phoneNumber: string) {
    let regex = /^[+\d][\d]*$/ //066666 or +216 066666
    const digitsOnly = phoneNumber.replace(/\s/g, '');
    return regex.test(digitsOnly)
  }
  public sameString(world1: string, world2: string) {
    return world1 === world2
  }
  checkIsDate(value: string): boolean {
    const date = new Date(value)
    if (!isNaN(date?.getTime())) {
      return true
    }
    return false
  }
  isArray(value: Array<any>): boolean {
    if (Array.isArray(value)) {
      if (value.length) {
        return true
      }
    }
    return false
  }
  isTrue(bool: boolean): boolean {
    return bool === true
  }
  isEmpty(value: string): boolean {
    return value === ""
  }
  hasMinimum8Characters(input: string): boolean {
    return input.length >= 8;
  }

  /**
   * Validates a Tunisian "matricule fiscale" (VAT number) format.
   * Expected format: 7 digits, followed by 3 uppercase letters separated by slashes, and ending with 3 digits.
   * Example: `1324993H/A/M/000`
  */
  isValidMatriculeFiscale(vatNumber: string): boolean {
    const regex = /^\d{6,7}[A-Z]\/[A-Z]\/[A-Z]\/\d{3}$/;
    return regex.test(vatNumber.trim());
  }
  private validateUniqueArray(
    arr: any[],
    errorMsg: string,
    validatorFn: (value: string) => boolean
  ): { isValid: boolean, newValue: any[] } {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    const values = arr.map(item => item?.value ?? item);

    // Identify duplicates
    values.forEach(val => {
      if (seen.has(val)) duplicates.add(val);
      seen.add(val);
    });

    // Validate each item
    const newValue = arr.map(item => {
      const val = item?.value ?? item;
      const notEmty = this.hasCharacters(val)
      const isValid = validatorFn(val);
      const isDuplicate = duplicates.has(val);
      if (!notEmty || isDuplicate || !isValid) {
        return { ...item, isValid: false, hintText: errorMsg };
      }
      return item;
    });

    const isValid = newValue.every(item => item.isValid !== false);
    return { isValid, newValue };
  }

  isUniqueEmailArrayValues(arr: any[], errorMsg: string) {
    return this.validateUniqueArray(arr, errorMsg, (val) => this.isMail(val));
  }

  isValidPhonesArray(arr: any[], errorMsg: string) {
    return this.validateUniqueArray(arr, errorMsg, (val) =>
      this.isValidPhoneNumber((val as string).trim())
    );
  }
}

export { CommonValidation }

