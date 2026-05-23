export const tabMenuKeys = Object.freeze([
	"user-management",
	"role-management",
	"team-management",
	"credit-application-assignment",
	"credit-application-management",
	"survey-management",
	"survey-result",
	"satisfaction-survey-management",
	"login-activity-log",
	"gps-log",
	"otp-log",
	"recording-log"
] as const);

export const tabMenuLabels = Object.freeze({
	"user-management": "User",
	"role-management": "Role",
	"team-management": "Team",
	"credit-application-assignment": "Credit Application Assignment",
	"credit-application-management": "Credit Application",
	"survey-management": "Survey",
	"survey-result": "Survey Result",
	"satisfaction-survey-management": "Satisfaction Survey",
	"login-activity-log": "Login Log",
	"gps-log": "GPS Log",
	"otp-log": "OTP Log",
	"recording-log": "Recording Log"
} as const);

const genericMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "show", label: "Show" }
];
const nameMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirstNameOnly", label: "Show First Name Only" },
	{ value: "showMiddleNameOnly", label: "Show Middle Name Only" },
	{ value: "showLastNameOnly", label: "Show Last Name Only" },
	{ value: "showFirstNameAndLastNameOnly", label: "Show First Name and Last Name Only" },
	{ value: "showFirstNameAndMiddleNameOnly", label: "Show First Name and Middle Name Only" },
	{ value: "showMiddleNameAndLastNameOnly", label: "Show Middle Name and Last Name Only" },
	{ value: "show1CharacterFirstName", label: "Show 1 Character of First Name" },
	{ value: "show2CharactersFirstName", label: "Show 2 Characters of First Name" },
	{ value: "show3CharactersFirstName", label: "Show 3 Characters of First Name" },
	{ value: "show1CharacterMiddleName", label: "Show 1 Character of Middle Name" },
	{ value: "show2CharactersMiddleName", label: "Show 2 Characters of Middle Name" },
	{ value: "show3CharactersMiddleName", label: "Show 3 Characters of Middle Name" },
	{ value: "show1CharacterLastName", label: "Show 1 Character of Last Name" },
	{ value: "show2CharactersLastName", label: "Show 2 Characters of Last Name" },
	{ value: "show3CharactersLastName", label: "Show 3 Characters of Last Name" },
	{ value: "showFirstNameAnd1CharacterLastName", label: "Show First Name and 1 Character of Last Name" },
	{ value: "showFirstNameAnd2CharactersLastName", label: "Show First Name and 2 Characters of Last Name" },
	{ value: "showFirstNameAnd3CharactersLastName", label: "Show First Name and 3 Characters of Last Name" },
	{ value: "show1CharacterFirstNameAndLastName", label: "Show 1 Character of First Name and Last Name" },
	{ value: "show2CharactersFirstNameAndLastName", label: "Show 2 Characters of First Name and Last Name" },
	{ value: "show3CharactersFirstNameAndLastName", label: "Show 3 Characters of First Name and Last Name" },
	{ value: "show", label: "Show" }
];
const emailMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showUsernameOnly", label: "Show Username Only" },
	{ value: "showDomainOnly", label: "Show Domain Only" },
	{ value: "show1CharacterUsername", label: "Show 1 Character of Username" },
	{ value: "show2CharactersUsername", label: "Show 2 Characters of Username" },
	{ value: "show3CharactersUsername", label: "Show 3 Characters of Username" },
	{ value: "showLast1CharacterUsername", label: "Show Last 1 Character of Username" },
	{ value: "showLast2CharactersUsername", label: "Show Last 2 Characters of Username" },
	{ value: "showLast3CharactersUsername", label: "Show Last 3 Characters of Username" },
	{ value: "show1CharacterDomain", label: "Show 1 Character of Domain" },
	{ value: "show2CharactersDomain", label: "Show 2 Characters of Domain" },
	{ value: "show3CharactersDomain", label: "Show 3 Characters of Domain" },
	{ value: "showLast1CharacterDomain", label: "Show Last 1 Character of Domain" },
	{ value: "showLast2CharactersDomain", label: "Show Last 2 Characters of Domain" },
	{ value: "showLast3CharactersDomain", label: "Show Last 3 Characters of Domain" },
	{ value: "show1CharacterUsernameAndDomain", label: "Show 1 Character of Username and Domain" },
	{ value: "show2CharactersUsernameAndDomain", label: "Show 2 Characters of Username and Domain" },
	{ value: "show3CharactersUsernameAndDomain", label: "Show 3 Characters of Username and Domain" },
	{ value: "show", label: "Show" }
];
const textMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirst1Character", label: "Show First 1 Character" },
	{ value: "showFirst2Characters", label: "Show First 2 Characters" },
	{ value: "showFirst3Characters", label: "Show First 3 Characters" },
	{ value: "showFirst5Characters", label: "Show First 5 Characters" },
	{ value: "showFirst10Characters", label: "Show First 10 Characters" },
	{ value: "showLast1Character", label: "Show Last 1 Character" },
	{ value: "showLast2Characters", label: "Show Last 2 Characters" },
	{ value: "showLast3Characters", label: "Show Last 3 Characters" },
	{ value: "showLast5Characters", label: "Show Last 5 Characters" },
	{ value: "showLast10Characters", label: "Show Last 10 Characters" },
	{ value: "showFirst1CharacterAndLast1Character", label: "Show First 1 Character and Last 1 Character" },
	{ value: "showFirst2CharactersAndLast2Characters", label: "Show First 2 Characters and Last 2 Characters" },
	{ value: "showFirst3CharactersAndLast3Characters", label: "Show First 3 Characters and Last 3 Characters" },
	{ value: "showFirst5CharactersAndLast5Characters", label: "Show First 5 Characters and Last 5 Characters" },
	{ value: "showFirst10CharactersAndLast10Characters", label: "Show First 10 Characters and Last 10 Characters" },
	{ value: "showFirstWordOnly", label: "Show First Word Only" },
	{ value: "showLastWordOnly", label: "Show Last Word Only" },
	{ value: "showFirst2Words", label: "Show First 2 Words" },
	{ value: "showLast2Words", label: "Show Last 2 Words" },
	{ value: "showFirst3Words", label: "Show First 3 Words" },
	{ value: "showLast3Words", label: "Show Last 3 Words" },
	{ value: "showFirst5Words", label: "Show First 5 Words" },
	{ value: "showLast5Words", label: "Show Last 5 Words" },
	{ value: "showFirst10Words", label: "Show First 10 Words" },
	{ value: "showLast10Words", label: "Show Last 10 Words" },
	{ value: "showCharacterCountOnly", label: "Show Character Count Only" },
	{ value: "showWordCountOnly", label: "Show Word Count Only" },
	{ value: "showFirstSentenceOnly", label: "Show First Sentence Only" },
	{ value: "showLastSentenceOnly", label: "Show Last Sentence Only" },
	{ value: "show", label: "Show" }
];
const numberMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirst1Digit", label: "Show First 1 Digit" },
	{ value: "showFirst2Digits", label: "Show First 2 Digits" },
	{ value: "showFirst3Digits", label: "Show First 3 Digits" },
	{ value: "showLast1Digit", label: "Show Last 1 Digit" },
	{ value: "showLast2Digits", label: "Show Last 2 Digits" },
	{ value: "showLast3Digits", label: "Show Last 3 Digits" },
	{ value: "showRoundedTens", label: "Show Rounded Tens" },
	{ value: "showRoundedHundreds", label: "Show Rounded Hundreds" },
	{ value: "showRoundedThousands", label: "Show Rounded Thousands" },
	{ value: "showDigitCountOnly", label: "Show Digit Count Only" },
	{ value: "show", label: "Show" }
];
const phoneNumberMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirst3Digits", label: "Show First 3 Digits" },
	{ value: "showFirst4Digits", label: "Show First 4 Digits" },
	{ value: "showFirst5Digits", label: "Show First 5 Digits" },
	{ value: "showLast3Digits", label: "Show Last 3 Digits" },
	{ value: "showLast4Digits", label: "Show Last 4 Digits" },
	{ value: "showLast5Digits", label: "Show Last 5 Digits" },
	{ value: "showCountryCodeOnly", label: "Show Country Code Only" },
	{ value: "showCountryCodeAndLast3Digits", label: "Show Country Code and Last 3 Digits" },
	{ value: "showCountryCodeAndLast4Digits", label: "Show Country Code and Last 4 Digits" },
	{ value: "showCountryCodeAndFirst3Digits", label: "Show Country Code and First 3 Digits" },
	{ value: "showCountryCodeAndFirst4Digits", label: "Show Country Code and First 4 Digits" },
	{ value: "show", label: "Show" }
];
const dateMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showYearOnly", label: "Show Year Only" },
	{ value: "showMonthOnly", label: "Show Month Only" },
	{ value: "showDayOnly", label: "Show Day Only" },
	{ value: "showMonthAndYear", label: "Show Month and Year" },
	{ value: "showDayAndMonth", label: "Show Day and Month" },
	{ value: "showQuarterOnly", label: "Show Quarter Only" },
	{ value: "showWeekOnly", label: "Show Week Only" },
	{ value: "showAgeOnly", label: "Show Age Only" },
	{ value: "showYearsOnly", label: "Show Years Only" },
	{ value: "show", label: "Show" }
];
export const maskOptions = Object.freeze({
	generic: genericMaskOptions,
	name: nameMaskOptions,
	email: emailMaskOptions,
	text: textMaskOptions,
	number: numberMaskOptions,
	phoneNumber: phoneNumberMaskOptions,
	date: dateMaskOptions
});

export type MaskFields = [string, string, "generic" | "name" | "email" | "text" | "number" | "phoneNumber" | "date"][];
export const menuMaskFields = Object.freeze({
	"user-management": [
		["maskEmail", "Mask Email", "email"],
		["maskRole", "Mask Role", "generic"],
		["maskName", "Mask Name", "text"],
		["maskEmployeeId", "Mask Employee ID", "text"],
		["maskSupervisor", "Mask Supervisor", "generic"]
	] as MaskFields,
	"role-management": [
		["maskName", "Mask Name", "text"],
		["maskLevel", "Mask Level", "generic"],
		["maskMenus", "Mask Menus", "generic"]
	] as MaskFields,
	"team-management": [
		["maskName", "Mask Name", "text"],
		["maskSupervisor", "Mask Supervisor", "generic"],
		["maskOfficers", "Mask Officers", "generic"]
	] as MaskFields,
	"credit-application-assignment": [
		["maskCreditApplication", "Mask Credit Application", "generic"],
		["maskOfficer", "Mask Officer", "generic"]
	] as MaskFields,
	"credit-application-management": [
		["maskImport", "Mask Import", "generic"],
		["maskName", "Mask Name", "name"],
		["maskEmail", "Mask Email", "email"],
		["maskAddresses", "Mask Addresses", "text"],
		["maskPhoneNumbers", "Mask Phone Numbers", "phoneNumber"],
		["maskWhatsappNumber", "Mask Whatsapp Number", "phoneNumber"],
		["maskSmsNumber", "Mask SMS Number", "phoneNumber"],
		["maskCollateralRegistryName", "Mask Collateral Registry Name", "text"],
		["maskCollateralName", "Mask Collateral Name", "text"],
		["maskCollateralDescription", "Mask Collateral Description", "generic"],
		["maskAssetId", "Mask Asset Id", "text"],
		["maskAssetName", "Mask Asset Name", "text"],
		["maskAssetDescription", "Mask Asset Description", "generic"],
		["maskPeriod", "Mask Period", "number"],
		["maskInstallment", "Mask Installment", "number"],
		["maskDownPayment", "Mask Down Payment", "number"],
		["maskPlafond", "Mask Plafond", "number"],
		["maskVendor", "Mask Vendor", "text"],
		["maskRemarks", "Mask Remarks", "generic"],
		["maskOtherText1", "Mask Other Text 1", "text"],
		["maskOtherText2", "Mask Other Text 2", "text"],
		["maskOtherNumber1", "Mask Other Number 1", "number"],
		["maskOtherNumber2", "Mask Other Number 2", "number"],
		["maskOtherDate1", "Mask Other Date 1", "date"],
		["maskOtherDate2", "Mask Other Date 2", "date"],
		["maskOthers", "Mask Others", "generic"]
	] as MaskFields,
	"survey-management": [
		["maskTitle", "Mask Title", "text"],
		["maskDescription", "Mask Description", "generic"],
		["maskContent", "Mask Content", "generic"]
	] as MaskFields,
	"survey-result": [
		["maskSurvey", "Mask Survey", "generic"],
		["maskSurveyVersion", "Mask Survey Version", "generic"],
		["maskCreditApplication", "Mask Credit Application", "generic"],
		["maskOfficer", "Mask Officer", "generic"],
		["maskAnswers", "Mask Answers", "generic"]
	] as MaskFields,
	"satisfaction-survey-management": [
		["maskTitle", "Mask Title", "text"],
		["maskDescription", "Mask Description", "generic"],
		["maskContent", "Mask Content", "generic"]
	] as MaskFields,
	"login-activity-log": [
		["maskIpAddress", "Mask IP Address", "text"],
		["maskUser", "Mask User", "generic"],
		["maskEvent", "Mask Event", "generic"],
		["maskOutcome", "Mask Outcome", "generic"]
	] as MaskFields,
	"gps-log": [
		["maskOfficer", "Mask Officer", "generic"],
		["maskSessionId", "Mask Session Id", "text"],
		["maskCreditApplication", "Mask Credit Application", "generic"],
		["maskLatitude", "Mask Latitude", "number"],
		["maskLongitude", "Mask Longitude", "number"]
	] as MaskFields,
	"otp-log": [
		["maskCreditApplication", "Mask Credit Application", "generic"],
		["maskContent", "Mask Content", "text"],
		["maskEmail", "Mask Email", "email"],
		["maskWhatsappNumber", "Mask WhatsApp Number", "phoneNumber"],
		["maskSmsNumber", "Mask SMS Number", "phoneNumber"],
		["maskEmailDeliveryStatus", "Mask Email Delivery Status", "generic"],
		["maskWhatsappDeliveryStatus", "Mask WhatsApp Delivery Status", "generic"],
		["maskSmsDeliveryStatus", "Mask SMS Delivery Status", "generic"]
	] as MaskFields,
	"recording-log": [
		["maskCreditApplication", "Mask Credit Application", "generic"],
		["maskOfficer", "Mask Officer", "generic"],
		["maskPhoneNumber", "Mask Phone Number", "phoneNumber"],
		["maskAudioFile", "Mask Audio File", "generic"],
		["maskTranscription", "Mask Transcription", "generic"]
	] as MaskFields
});

export const slugCollectionMap = Object.freeze({
	"user-management": "staged-users",
	"role-management": "roles",
	"team-management": "teams",
	"credit-application-assignment": "credit-application-assignments",
	"credit-application-management": "credit-applications",
	"survey-management": "surveys",
	"survey-result": "survey-results",
	"satisfaction-survey-management": "satsifaction-surveys",
	"login-activity-log": "login-logs",
	"gps-log": "gps-logs",
	"otp-log": "otp-logs",
	"recording-log": "recording-logs"
});

export const slugAccessCollectionMap = Object.freeze({
	"user-management": "staged-users-accesses",
	"role-management": "roles-accesses",
	"team-management": "teams-accesses",
	"credit-application-assignment": "credit-application-assignments-accesses",
	"credit-application-management": "credit-applications-accesses",
	"survey-management": "surveys-accesses",
	"survey-result": "survey-results-accesses",
	"satisfaction-survey-management": "satsifaction-surveys-accesses",
	"login-activity-log": "login-logs-accesses",
	"gps-log": "gps-logs-accesses",
	"otp-log": "otp-logs-accesses",
	"recording-log": "recording-logs-accesses"
});

export const slugAccessMaskCollectionMap = Object.freeze({
	"user-management": "staged-users-access-masks",
	"role-management": "roles-access-masks",
	"team-management": "teams-access-masks",
	"credit-application-assignment": "credit-application-assignments-access-masks",
	"credit-application-management": "credit-applications-access-masks",
	"survey-management": "surveys-access-masks",
	"survey-result": "survey-results-access-masks",
	"satisfaction-survey-management": "satsifaction-surveys-access-masks",
	"login-activity-log": "login-logs-access-masks",
	"gps-log": "gps-logs-access-masks",
	"otp-log": "otp-logs-access-masks",
	"recording-log": "recording-logs-access-masks"
});
