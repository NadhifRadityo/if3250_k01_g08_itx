import { Image } from "@/components/Image";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/radix/Card";

import loginBg from "./Login_bg.png";
import logoEcentrix from "./Logo-eCentrix.png";
import { LoginForm } from "./page.components";

export default function LoginPage() {
	return (
		<div className="login-page flex flex-row h-screen w-full">
			<div className="hidden md:block md:basis-[48%] lg:basis-[62%] shrink-0 relative overflow-hidden">
				<Image src={loginBg} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
			</div>
			<div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] px-6">
				<div className="w-full max-w-120 flex flex-col gap-6">
					<div className="flex justify-center">
						<Image src={logoEcentrix} alt="eCentrix logo" className="h-12 w-auto" />
					</div>
					<Card className="border-border/70 bg-card shadow-sm">
						<CardHeader>
							<CardTitle className="text-center text-2xl">Masuk ke Akun</CardTitle>
						</CardHeader>
						<CardContent>
							<LoginForm />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
