import { Image } from "@/components/Image";
import { Card, CardContent } from "@/components/radix/Card";

import loginBg from "./Login_bg.png";
import logoEcentrix from "./Logo-eCentrix.png";
import { LoginForm } from "./page.components";

export default function LoginPage() {
	return (
		<div className="login-page flex flex-row h-screen w-full">
			<div className="hidden md:block md:basis-[48%] lg:basis-[62%] shrink-0 relative overflow-hidden">
				<Image src={loginBg} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
			</div>
			<div className="flex-1 flex flex-col items-center justify-center bg-[#f6f7f8] px-20">
				<div className="w-full max-w-120 flex flex-col gap-6">
					<div className="flex justify-center">
						<Image src={logoEcentrix} alt="eCentrix logo" className="h-12 w-auto" />
					</div>
					<h1 className="text-center font-sans text-[30px] font-bold leading-none text-[#334155] tracking-tight">
						Masuk ke Akun
					</h1>
					<Card className="border border-[#d5dde8] rounded-3xl bg-white py-7 shadow-[0_6px_20px_rgba(28,63,110,0.08)]">
						<CardContent className="px-6 sm:px-8">
							<LoginForm />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
