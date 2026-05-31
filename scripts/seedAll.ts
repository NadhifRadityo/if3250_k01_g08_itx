await import("./seedRoles");
await import("./seedUsers");
await import("./seedStagedUsers");
await import("./seedTeams");
await import("./seedAccesses");
await import("./seedCreditApplicationImports");
await import("./seedCreditApplications");
await import("./seedSurveys");
await import("./seedSatisfactionSurveys");
await import("./seedCreditApplicationAssignments");
await import("./seedLoginLogs");
await import("./seedGPSLogs");
await import("./seedMessageLogs");
await import("./seedRecordingLogs");

console.log("Seeded all requested collections in the required order.");

export {};
