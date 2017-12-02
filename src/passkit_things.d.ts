interface PassBundle {
    passJson: PassJson;
}

interface PassJson {
    description: string;
    formatVersion: 1;
    organizationName: string;
    passTypeIdentifier: string;
    serialNumber: string;
    teamIdentifier: string;

    appLaunchURL?: string;
    associatedStoreIdentifiers?: [number];
    userInfo?: any;

    expirationDate?: string;
    voided?: boolean;

    beacons?: [Beacon];
    locations?: [Location];
    maxDistance?: number;
    relevantDate?: string;

    boardingPass?: any;
    coupon?: any;
    eventTicket?: any;
    generic?: any;
    storeCard?: any;

    barcodes?: [Barcode];
    backgroundColor?: string;
    foregroundColor?: string;
    groupingIdentifier?: string;
    labelColor?: string;
    logoText?: string;
    suppressStripShine?: boolean;

    authenticationToken?: string;
    webServiceURL?: string;

    // TODO nfc
}

interface PassStructure {
    auxiliaryFields?: [Field];
    backFields?: [Field];
    headerFields?: [Field];
    primaryFields?: [Field];
    secondaryFields?: [Field];
}

type DataDetectorType = "PKDataDetectorTypePhoneNumber" | "PKDataDetectorTypeLink" | "PKDataDetectorTypeAddress" | "PKDataDetectorTypeCalendarEvent";
type TextAlignment = "PKTextAlignmentLeft" | "PKTextAlignmentCenter" | "PKTextAlignmentRight" | "PKTextAlignmentNatural";

interface Field {
    attributedValue?: string | number;
    changeMessage?: string;
    dataDetectorTypes?: [DataDetectorType];
    key: string;
    label?: string;
    textAlignment?: TextAlignment;
    value: string | number;
}

type BarcodeFormat = "PKBarcodeFormatQR" | "PKBarcodeFormatPDF417" | "PKBarcodeFormatAztec" | "PKBarcodeFormatCode128";
interface Barcode {
    altText?: string;
    format: BarcodeFormat;
    message: string;
    messageEncoding: string;
}

interface Beacon {
    major?: number;
    minor?: number;
    proximityUUID: string;
    relevantText?: string;
}

interface Location {
    altitude?: number;
    latitude: number;
    longitude: number;
    relevantText?: string;
}
