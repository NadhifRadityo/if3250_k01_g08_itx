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

export type RelationCreditApplication = {
	name: string;
	email?: string | null;
};

export type RelationCreditApplicationImport = {
	filename: string;
	filesize: number;
	mimeType: string;
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

export type RelationSurvey = {
	title: string;
};
