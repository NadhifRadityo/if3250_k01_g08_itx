"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { login } from "./page.actions";

const labelClassName = "text-sm font-medium text-gray-700";
const inputClassName = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3A8FC1]/40 focus:border-[#3A8FC1] transition";

function Field({
	label,
	children,
	action
}: {
	label: string;
	children: React.ReactNode;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex justify-between items-center">
				<label className={labelClassName}>{label}</label>
				{action}
			</div>
			{children}
		</div>
	);
}

export default function LoginPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleLogin() {
		if(isSubmitting)
			return;
		setErrorMessage(null);
		setIsSubmitting(true);
		try {
			const result = await login(email.trim(), password);
			if(result.success) {
				router.push("/");
				return;
			}
			setErrorMessage(result.error);
		} catch {
			setErrorMessage("Login failed. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		await handleLogin();
	}

	return (
		<div className="login-page flex flex-row h-screen w-full">
			<div className="hidden md:block md:basis-[48%] lg:basis-[62%] shrink-0 relative overflow-hidden">
				<img
					src="/images/Login_bg.png"
					alt="Background"
					className="absolute inset-0 w-full h-full object-cover"
				/>
			</div>

			<div className="flex-1 flex flex-col items-center justify-center bg-[#F0F2F5] px-6">
				<div className="w-full max-w-[480px] flex flex-col gap-6">
					<div className="flex justify-center">
						<img
							src="/images/Logo-eCentrix.png"
							alt="eCentrix logo"
							className="h-12 w-auto"
						/>
					</div>
					<h1 className="text-2xl font-bold text-gray-900 text-center md:text-center">
						Masuk ke Akun
					</h1>

					<form className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5" onSubmit={handleSubmit}>
						<Field label="Email">
							<input
								type="email"
								placeholder="Masukkan email anda"
								value={email}
								onChange={e => setEmail(e.target.value)}
								className={inputClassName}
								autoComplete="email"
							/>
						</Field>

						<Field
							label="Password"
							action={(
								<a href="#" className="text-sm text-[#3A8FC1] hover:underline">
									Forgot password?
								</a>
							)}
						>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Masukkan kata sandi anda"
									value={password}
									onChange={e => setPassword(e.target.value)}
									className={`${inputClassName} pr-10`}
									autoComplete="current-password"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
									aria-label="Toggle password visibility"
								>
									{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</Field>

						{errorMessage != null && (
							<p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{errorMessage}
							</p>
						)}

						<button
							type="submit"
							className="w-full py-2.5 rounded-lg bg-[#3A8FC1] hover:bg-[#2d7aaa] active:bg-[#256690] disabled:bg-[#7ab4d3] text-white text-sm font-semibold transition-colors duration-150"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Loading..." : "Masuk"}
						</button>
					</form>

					<p className="text-sm text-center text-gray-600">
						Belum Punya Akun?{" "}
						<a href="#" className="text-[#3A8FC1] font-medium hover:underline">
							Buat Sekarang.
						</a>
					</p>
				</div>
			</div>

			<style jsx>{`
				.login-page :is(input, textarea)::selection {
					background: rgba(58, 143, 193, 0.35);
					color: #111827;
				}

				.login-page :is(input, textarea)::-moz-selection {
					background: rgba(58, 143, 193, 0.35);
					color: #111827;
				}
			`}</style>
		</div>
	);
}
