export type RelationUser = {
	name: string;
	email: string;
	stagedUserId: string | null;
};

export type RelationStagedUser = {
	name: string;
	email: string;
	userId: string | null;
};

export type RelationRole = {
	name: string;
};

export type RelationCreditApplication = {
	name: string;
	email: string;
	assetId?: string | null;
};

export type RequestDiffPair<T> = [T, T];
