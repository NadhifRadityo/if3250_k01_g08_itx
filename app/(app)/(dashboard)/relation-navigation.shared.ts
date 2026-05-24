export type RelationUser = {
	name: string;
	email: string;
	stagedUserId?: string | null;
};

export type RelationStagedUser = {
	name: string;
	email: string;
	userId?: string | null;
};

export type RelationRole = {
	name: string;
};

export type RelationTeam = {
	name: string;
};

export type RelationCreditApplication = {
	name: string;
	email?: string | null;
};

export type RelationCreditApplicationImport = {
	filename: string;
	filesize: number;
	mimeType: string;
};

export type RelationCreditApplicationAssignment = {
	_: null;
};

export type RelationSurvey = {
	title: string;
};

export type RelationSurveyResult = {
	_: null;
};

export type RelationSatisfactionSurvey = {
	title: string;
};

export type RelationLoginLog = {
	createdAt: string;
};

export type RelationGpsLog = {
	createdAt: string;
};

export type RelationOtpLog = {
	createdAt: string;
};

export type RelationRecordingLog = {
	createdAt: string;
};

export type RelationRecordingLogAudioFile = {
	filename: string;
	filesize: number | null;
	mimeType: string | null;
	url?: string | null;
};

export type RelationRecordingLogTranscription = {
	filename: string;
	filesize: number | null;
	mimeType: string | null;
	url?: string | null;
};

export type RelationAccess = {
	name: string;
};

export type RelationAccessMask = {
	name: string;
};
