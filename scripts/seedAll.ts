await import("./seedRoles");
await import("./seedUsers");
await import("./seedStagedUsers");
await import("./seedTeams");
await import("./seedCreditApplicationImports");
await import("./seedCreditApplications");
await import("./seedCreditApplicationAssignments");
await import("./seedSurveys");
await import("./seedSatisfactionSurveys");
await import("./seedLoginLogs");
await import("./seedGPSLogs");
await import("./seedMessageLogs");
await import("./seedRecordingLogAudioFiles");
await import("./seedRecordingLogTranscriptions");
await import("./seedRecordingLogs");

console.log("Seeded all requested collections in the required order.");

export {};
