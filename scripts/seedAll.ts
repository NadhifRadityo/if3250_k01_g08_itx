await import("./seedRoles");
await import("./seedUsers");
await import("./seedStagedUsers");
await import("./seedTeams");
await import("./seedCreditApplicationImports");
await import("./seedCreditApplications");
await import("./seedCreditApplicationAssignments");
await import("./seedSurveys");
await import("./seedSatisfactionSurveys");
await import("./seedRecordingLogAudioFiles");
await import("./seedRecordingLogTranscriptions");
await import("./seedRecordingLogs");
await import("./seedLoginLogs");
await import("./seedGPSLogs");
await import("./seedOTPLogs");

console.log("Seeded all requested collections in the required order.");

export {};
