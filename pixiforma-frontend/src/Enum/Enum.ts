enum Elang {
    fr = "fr",
    en = "en",
}

enum EButtonSize {
    small = "small",
    medium = "medium",
    large = "large"
}

enum EActionType {
    get = 'get',
    create = 'create',
    update = 'update',
    delete = 'delete',
}

enum EInputStatus {
    default = 'default',
    success = 'success',
    error = 'error',
}

enum EInputType {
    text = 'text',
    password = 'password',
    number = 'number',
    intNumber = 'intNumber',
    email = 'email',
    radio = 'radio',
    date = 'date',
}

enum EInputSize {
    small = "small",
    medium = "medium",
    large = "large"
}

enum EToggleSize {
    small = "small",
    medium = "medium"
}

enum ESort {
    asc = 'asc',
    desc = 'desc'
}

enum EFontFamily {
    DMSans = 'DM Sans',
    DMMono = 'DM Mono',
}

enum IconComponentsEnum {
    settings = "settings",
    loader = "loader",
    eye = "eye",
    eyeClose = "eyeClose",
    info = "info",
    checkbox = "checkbox",
    squaresFour = "squaresFour",
    bookOpenText = "bookOpenText",
    drop = "drop",
    close = "close",
    user = "user",
    bookOpenTextRotated = "bookOpenTextRotated",
    check = "check",
    bell = "bell",
    clipboardList = "clipboardList",
    mail = "mail",
    userPlus = "userPlus",
    shield = "shield",
    house = "house"
}

enum EButtonType {
    primary = "primary",
    secondary = "secondary",
    tertiary = "tertiary",
    gray = "gray",
    iconButton = "iconButton"
}

enum ETypographyType {
    // Headings
    H1Desktop = 'h1Desktop',
    H1App = 'h1App',
    H2 = 'h2',
    H3 = 'h3',

    // Subtitles
    Subtitle = 'subtitle',

    // Body text (Sans)
    BodyLargeMedium = 'bodyLargeMedium',
    BodyMediumBold = 'bodyMediumBold',
    BodyMedium = 'bodyMedium',
    BodyRegular = 'bodyRegular',
    BodySmallMedium = 'bodySmallMedium',
    BodySmallRegular = 'bodySmallRegular',

    // Buttons and inputs
    Button = 'button',
    Input = 'input',

    // Mono font styles
    MonoSubtitle = 'monoSubtitle',
    MonoCaptionMedium = 'monoCaptionMedium',
    MonoBodyMedium = 'monoBodyMedium',
    MonoBodySmall = 'monoBodySmall',
    MonoCaptionSmall = 'monoCaptionSmall',
}

enum ESizeCheckBox {
    sm = 'min-w-3 min-h-3 max-w-3 max-h-3',
    md = 'min-w-4 min-h-4 max-w-4 max-h-4',
    lg = 'min-w-5 min-h-5 max-w-5 max-h-5'
}

enum ECheckBoxStatus {
    checked = 'checked',
    unchecked = 'unchecked'
}

enum ESizeRadio {
    sm = 'min-w-3 min-h-3 max-w-3 max-h-3',
    md = 'min-w-4 min-h-4 max-w-4 max-h-4',
    lg = 'min-w-5 min-h-5 max-w-5 max-h-5',
}

enum ESize {
    sm = 'sm',
    md = 'md',
    lg = 'lg',
}

enum ERadioStatus {
    checked = 'checked',
    unchecked = 'unchecked',
}

export {
    Elang,
    EButtonSize,
    EActionType,
    EInputStatus,
    EInputType,
    EInputSize,
    ESort,
    EToggleSize,
    EFontFamily,
    ETypographyType,
    IconComponentsEnum,
    EButtonType,
    ECheckBoxStatus,
    ESizeCheckBox,
    ERadioStatus,
    ESizeRadio,
    ESize
}
