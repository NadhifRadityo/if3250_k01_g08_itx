import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/radix/Card";

export default function TeamManagementPage() {
	return (
		<main className="bg-muted/30 min-h-full p-4 md:p-6">
			<Card className="max-w-3xl">
				<CardHeader>
					<CardTitle>Team Management</CardTitle>
					<CardDescription>Configure team structure, ownership, and member assignments.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Start by defining teams and assigning responsible users for each operational area.</p>
				</CardContent>
			</Card>
		</main>
	);
}
