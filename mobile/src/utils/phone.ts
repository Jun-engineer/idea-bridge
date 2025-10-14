export interface CountryDialCode {
  code: string;
  label: string;
  trimLeadingZero: boolean;
}

export const DEFAULT_COUNTRY_DIAL_CODE = "+61";

const TRUNK_ZERO_CODES = new Set<string>(["+61", "+44", "+82"]);

const BASE_DIAL_CODES: Array<{ code: string; label: string }> = [
  { code: "+93", label: "Afghanistan (+93)" },
  { code: "+355", label: "Albania (+355)" },
  { code: "+213", label: "Algeria (+213)" },
  { code: "+1", label: "American Samoa (+1)" },
  { code: "+376", label: "Andorra (+376)" },
  { code: "+244", label: "Angola (+244)" },
  { code: "+1", label: "Anguilla (+1)" },
  { code: "+672", label: "Antarctica (+672)" },
  { code: "+1", label: "Antigua & Barbuda (+1)" },
  { code: "+54", label: "Argentina (+54)" },
  { code: "+374", label: "Armenia (+374)" },
  { code: "+297", label: "Aruba (+297)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+43", label: "Austria (+43)" },
  { code: "+994", label: "Azerbaijan (+994)" },
  { code: "+1", label: "Bahamas (+1)" },
  { code: "+973", label: "Bahrain (+973)" },
  { code: "+880", label: "Bangladesh (+880)" },
  { code: "+1", label: "Barbados (+1)" },
  { code: "+375", label: "Belarus (+375)" },
  { code: "+32", label: "Belgium (+32)" },
  { code: "+501", label: "Belize (+501)" },
  { code: "+229", label: "Benin (+229)" },
  { code: "+1", label: "Bermuda (+1)" },
  { code: "+975", label: "Bhutan (+975)" },
  { code: "+591", label: "Bolivia (+591)" },
  { code: "+387", label: "Bosnia & Herzegovina (+387)" },
  { code: "+267", label: "Botswana (+267)" },
  { code: "+55", label: "Brazil (+55)" },
  { code: "+246", label: "British Indian Ocean Territory (+246)" },
  { code: "+1", label: "British Virgin Islands (+1)" },
  { code: "+673", label: "Brunei (+673)" },
  { code: "+359", label: "Bulgaria (+359)" },
  { code: "+226", label: "Burkina Faso (+226)" },
  { code: "+257", label: "Burundi (+257)" },
  { code: "+855", label: "Cambodia (+855)" },
  { code: "+237", label: "Cameroon (+237)" },
  { code: "+1", label: "Canada (+1)" },
  { code: "+238", label: "Cape Verde (+238)" },
  { code: "+599", label: "Caribbean Netherlands (+599)" },
  { code: "+1", label: "Cayman Islands (+1)" },
  { code: "+236", label: "Central African Republic (+236)" },
  { code: "+235", label: "Chad (+235)" },
  { code: "+56", label: "Chile (+56)" },
  { code: "+86", label: "China (+86)" },
  { code: "+61", label: "Christmas Island (+61)" },
  { code: "+61", label: "Cocos (Keeling) Islands (+61)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+269", label: "Comoros (+269)" },
  { code: "+242", label: "Congo - Brazzaville (+242)" },
  { code: "+243", label: "Congo - Kinshasa (+243)" },
  { code: "+682", label: "Cook Islands (+682)" },
  { code: "+506", label: "Costa Rica (+506)" },
  { code: "+225", label: "Côte d’Ivoire (+225)" },
  { code: "+385", label: "Croatia (+385)" },
  { code: "+53", label: "Cuba (+53)" },
  { code: "+599", label: "Curaçao (+599)" },
  { code: "+357", label: "Cyprus (+357)" },
  { code: "+420", label: "Czechia (+420)" },
  { code: "+45", label: "Denmark (+45)" },
  { code: "+253", label: "Djibouti (+253)" },
  { code: "+1", label: "Dominica (+1)" },
  { code: "+1", label: "Dominican Republic (+1)" },
  { code: "+670", label: "East Timor (+670)" },
  { code: "+593", label: "Ecuador (+593)" },
  { code: "+20", label: "Egypt (+20)" },
  { code: "+503", label: "El Salvador (+503)" },
  { code: "+240", label: "Equatorial Guinea (+240)" },
  { code: "+291", label: "Eritrea (+291)" },
  { code: "+372", label: "Estonia (+372)" },
  { code: "+268", label: "Eswatini (Swaziland) (+268)" },
  { code: "+251", label: "Ethiopia (+251)" },
  { code: "+500", label: "Falkland Islands (+500)" },
  { code: "+298", label: "Faroe Islands (+298)" },
  { code: "+679", label: "Fiji (+679)" },
  { code: "+358", label: "Finland (+358)" },
  { code: "+33", label: "France (+33)" },
  { code: "+594", label: "French Guiana (+594)" },
  { code: "+689", label: "French Polynesia (+689)" },
  { code: "+689", label: "French Southern Territories (+689)" },
  { code: "+241", label: "Gabon (+241)" },
  { code: "+220", label: "Gambia (+220)" },
  { code: "+995", label: "Georgia (+995)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+233", label: "Ghana (+233)" },
  { code: "+350", label: "Gibraltar (+350)" },
  { code: "+30", label: "Greece (+30)" },
  { code: "+299", label: "Greenland (+299)" },
  { code: "+1", label: "Grenada (+1)" },
  { code: "+590", label: "Guadeloupe (+590)" },
  { code: "+1", label: "Guam (+1)" },
  { code: "+502", label: "Guatemala (+502)" },
  { code: "+44", label: "Guernsey (+44)" },
  { code: "+224", label: "Guinea (+224)" },
  { code: "+245", label: "Guinea-Bissau (+245)" },
  { code: "+592", label: "Guyana (+592)" },
  { code: "+509", label: "Haiti (+509)" },
  { code: "+504", label: "Honduras (+504)" },
  { code: "+852", label: "Hong Kong (+852)" },
  { code: "+36", label: "Hungary (+36)" },
  { code: "+354", label: "Iceland (+354)" },
  { code: "+91", label: "India (+91)" },
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+98", label: "Iran (+98)" },
  { code: "+964", label: "Iraq (+964)" },
  { code: "+353", label: "Ireland (+353)" },
  { code: "+44", label: "Isle of Man (+44)" },
  { code: "+972", label: "Israel (+972)" },
  { code: "+39", label: "Italy (+39)" },
  { code: "+1", label: "Jamaica (+1)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+44", label: "Jersey (+44)" },
  { code: "+962", label: "Jordan (+962)" },
  { code: "+7", label: "Kazakhstan (+7)" },
  { code: "+254", label: "Kenya (+254)" },
  { code: "+686", label: "Kiribati (+686)" },
  { code: "+383", label: "Kosovo (+383)" },
  { code: "+965", label: "Kuwait (+965)" },
  { code: "+996", label: "Kyrgyzstan (+996)" },
  { code: "+856", label: "Laos (+856)" },
  { code: "+371", label: "Latvia (+371)" },
  { code: "+961", label: "Lebanon (+961)" },
  { code: "+266", label: "Lesotho (+266)" },
  { code: "+231", label: "Liberia (+231)" },
  { code: "+218", label: "Libya (+218)" },
  { code: "+423", label: "Liechtenstein (+423)" },
  { code: "+370", label: "Lithuania (+370)" },
  { code: "+352", label: "Luxembourg (+352)" },
  { code: "+853", label: "Macau (+853)" },
  { code: "+389", label: "North Macedonia (+389)" },
  { code: "+261", label: "Madagascar (+261)" },
  { code: "+265", label: "Malawi (+265)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+960", label: "Maldives (+960)" },
  { code: "+223", label: "Mali (+223)" },
  { code: "+356", label: "Malta (+356)" },
  { code: "+692", label: "Marshall Islands (+692)" },
  { code: "+596", label: "Martinique (+596)" },
  { code: "+222", label: "Mauritania (+222)" },
  { code: "+230", label: "Mauritius (+230)" },
  { code: "+262", label: "Mayotte (+262)" },
  { code: "+52", label: "Mexico (+52)" },
  { code: "+691", label: "Micronesia (+691)" },
  { code: "+373", label: "Moldova (+373)" },
  { code: "+377", label: "Monaco (+377)" },
  { code: "+976", label: "Mongolia (+976)" },
  { code: "+382", label: "Montenegro (+382)" },
  { code: "+1", label: "Montserrat (+1)" },
  { code: "+212", label: "Morocco (+212)" },
  { code: "+258", label: "Mozambique (+258)" },
  { code: "+95", label: "Myanmar (+95)" },
  { code: "+264", label: "Namibia (+264)" },
  { code: "+674", label: "Nauru (+674)" },
  { code: "+977", label: "Nepal (+977)" },
  { code: "+31", label: "Netherlands (+31)" },
  { code: "+687", label: "New Caledonia (+687)" },
  { code: "+64", label: "New Zealand (+64)" },
  { code: "+505", label: "Nicaragua (+505)" },
  { code: "+227", label: "Niger (+227)" },
  { code: "+234", label: "Nigeria (+234)" },
  { code: "+683", label: "Niue (+683)" },
  { code: "+672", label: "Norfolk Island (+672)" },
  { code: "+850", label: "North Korea (+850)" },
  { code: "+1", label: "Northern Mariana Islands (+1)" },
  { code: "+47", label: "Norway (+47)" },
  { code: "+968", label: "Oman (+968)" },
  { code: "+92", label: "Pakistan (+92)" },
  { code: "+680", label: "Palau (+680)" },
  { code: "+970", label: "Palestinian Territories (+970)" },
  { code: "+507", label: "Panama (+507)" },
  { code: "+675", label: "Papua New Guinea (+675)" },
  { code: "+595", label: "Paraguay (+595)" },
  { code: "+51", label: "Peru (+51)" },
  { code: "+63", label: "Philippines (+63)" },
  { code: "+64", label: "Pitcairn Islands (+64)" },
  { code: "+48", label: "Poland (+48)" },
  { code: "+351", label: "Portugal (+351)" },
  { code: "+1", label: "Puerto Rico (+1)" },
  { code: "+974", label: "Qatar (+974)" },
  { code: "+262", label: "Réunion (+262)" },
  { code: "+40", label: "Romania (+40)" },
  { code: "+7", label: "Russia (+7)" },
  { code: "+250", label: "Rwanda (+250)" },
  { code: "+590", label: "Saint Barthélemy (+590)" },
  { code: "+290", label: "Saint Helena (+290)" },
  { code: "+1", label: "Saint Kitts & Nevis (+1)" },
  { code: "+1", label: "Saint Lucia (+1)" },
  { code: "+590", label: "Saint Martin (+590)" },
  { code: "+508", label: "Saint Pierre & Miquelon (+508)" },
  { code: "+1", label: "Saint Vincent & the Grenadines (+1)" },
  { code: "+685", label: "Samoa (+685)" },
  { code: "+378", label: "San Marino (+378)" },
  { code: "+239", label: "São Tomé & Príncipe (+239)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+221", label: "Senegal (+221)" },
  { code: "+381", label: "Serbia (+381)" },
  { code: "+248", label: "Seychelles (+248)" },
  { code: "+232", label: "Sierra Leone (+232)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+1", label: "Sint Maarten (+1)" },
  { code: "+421", label: "Slovakia (+421)" },
  { code: "+386", label: "Slovenia (+386)" },
  { code: "+677", label: "Solomon Islands (+677)" },
  { code: "+252", label: "Somalia (+252)" },
  { code: "+27", label: "South Africa (+27)" },
  { code: "+82", label: "South Korea (+82)" },
  { code: "+211", label: "South Sudan (+211)" },
  { code: "+34", label: "Spain (+34)" },
  { code: "+94", label: "Sri Lanka (+94)" },
  { code: "+249", label: "Sudan (+249)" },
  { code: "+597", label: "Suriname (+597)" },
  { code: "+47", label: "Svalbard & Jan Mayen (+47)" },
  { code: "+46", label: "Sweden (+46)" },
  { code: "+41", label: "Switzerland (+41)" },
  { code: "+963", label: "Syria (+963)" },
  { code: "+886", label: "Taiwan (+886)" },
  { code: "+992", label: "Tajikistan (+992)" },
  { code: "+255", label: "Tanzania (+255)" },
  { code: "+66", label: "Thailand (+66)" },
  { code: "+228", label: "Togo (+228)" },
  { code: "+690", label: "Tokelau (+690)" },
  { code: "+676", label: "Tonga (+676)" },
  { code: "+1", label: "Trinidad & Tobago (+1)" },
  { code: "+216", label: "Tunisia (+216)" },
  { code: "+90", label: "Turkey (+90)" },
  { code: "+993", label: "Turkmenistan (+993)" },
  { code: "+1", label: "Turks & Caicos Islands (+1)" },
  { code: "+688", label: "Tuvalu (+688)" },
  { code: "+1", label: "U.S. Virgin Islands (+1)" },
  { code: "+256", label: "Uganda (+256)" },
  { code: "+380", label: "Ukraine (+380)" },
  { code: "+971", label: "United Arab Emirates (+971)" },
  { code: "+44", label: "United Kingdom (+44)" },
  { code: "+1", label: "United States (+1)" },
  { code: "+598", label: "Uruguay (+598)" },
  { code: "+998", label: "Uzbekistan (+998)" },
  { code: "+678", label: "Vanuatu (+678)" },
  { code: "+379", label: "Vatican City (+379)" },
  { code: "+58", label: "Venezuela (+58)" },
  { code: "+84", label: "Vietnam (+84)" },
  { code: "+681", label: "Wallis & Futuna (+681)" },
  { code: "+212", label: "Western Sahara (+212)" },
  { code: "+967", label: "Yemen (+967)" },
  { code: "+260", label: "Zambia (+260)" },
  { code: "+263", label: "Zimbabwe (+263)" },
  { code: "+358", label: "Åland Islands (+358)" },
];

export const COUNTRY_DIAL_CODES: CountryDialCode[] = BASE_DIAL_CODES.map((entry) => ({
  ...entry,
  trimLeadingZero: TRUNK_ZERO_CODES.has(entry.code),
}));

export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!digits.startsWith("+") && digits.length > 0) {
    return `+${digits}`;
  }
  return digits;
}

export function composePhoneNumber(countryCode: string, nationalNumber: string): string {
  const normalizedCode = normalizePhoneNumber(countryCode).replace(/[^\d+]/g, "");
  if (!normalizedCode.startsWith("+")) {
    throw new Error("Select a country code");
  }

  const trimmedNational = nationalNumber.replace(/[^\d]/g, "");
  if (!trimmedNational) {
    throw new Error("Enter a phone number");
  }

  const dialMetadata = COUNTRY_DIAL_CODES.find((entry) => entry.code === normalizedCode);
  const shouldTrimLeadingZero = dialMetadata?.trimLeadingZero ?? true;
  const nationalWithoutTrunk = shouldTrimLeadingZero
    ? trimmedNational.replace(/^0+/, "") || trimmedNational
    : trimmedNational;

  return `${normalizedCode}${nationalWithoutTrunk}`;
}

export function splitPhoneNumber(value: string | null | undefined): {
  countryCode: string;
  nationalNumber: string;
} {
  if (!value) {
    const fallback = COUNTRY_DIAL_CODES.find((entry) => entry.code === DEFAULT_COUNTRY_DIAL_CODE);
    return { countryCode: fallback?.code ?? COUNTRY_DIAL_CODES[0].code, nationalNumber: "" };
  }
  const normalized = normalizePhoneNumber(value);
  const match = COUNTRY_DIAL_CODES.find((entry) => normalized.startsWith(entry.code));
  if (!match) {
    const fallback = COUNTRY_DIAL_CODES.find((entry) => entry.code === DEFAULT_COUNTRY_DIAL_CODE);
    return {
      countryCode: fallback?.code ?? COUNTRY_DIAL_CODES[0].code,
      nationalNumber: normalized.replace(/^\+/, ""),
    };
  }
  return {
    countryCode: match.code,
    nationalNumber: normalized.slice(match.code.length),
  };
}

export function sanitizePhoneNumberInput(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return normalizePhoneNumber(trimmed);
}
