"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { unstable_rethrow } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "lucide-react";
import { z } from "zod";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/radix/Field";
import { Input } from "@/components/radix/Input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/radix/InputGroup";
import { VisuallyHidden } from "@/components/radix/VisuallyHidden";

import { loginAction } from "./page.actions";

const loginFormSchema = z.object({
	email: z.email(),
	password: z.string()
});

export function LoginForm() {
	const form = useForm<z.infer<typeof loginFormSchema>>({
		resolver: zodResolver(loginFormSchema),
		defaultValues: {
			email: "",
			password: ""
		}
	});
	const [showPassword, setShowPassword] = useState(false);
	useEffect(() => {
		if(!showPassword) return;
		const handle = setTimeout(() => setShowPassword(false), 1000 * 30);
		return () => clearTimeout(handle);
	}, [showPassword]);
	const allowShowPassword = !form.formState.isValidating && !form.formState.disabled;
	useEffect(() => {
		if(allowShowPassword) return;
		setShowPassword(false);
	}, [allowShowPassword]);
	return (
		<form
			className="space-y-8"
			onSubmit={form.handleSubmit(async ({ email, password }) => {
				try {
					await loginAction(email, password);
				} catch(error) {
					unstable_rethrow(error);
					form.setError("root", { type: error?.name, message: error?.message });
				}
			})}
		>
			{form.formState.errors?.root != null ? (
				<Alert variant="destructive">
					<AlertCircleIcon />
					<AlertTitle>{form.formState.errors.root.type}</AlertTitle>
					<AlertDescription>{form.formState.errors.root.message}</AlertDescription>
				</Alert>
			) : null}
			<FieldGroup>
				<Controller
					name="email"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel className="font-semibold text-[#334155]">Email</FieldLabel>
							<Input
								{...field}
								aria-invalid={fieldState.invalid}
								className="h-13 rounded-2xl border-[#E2E8F0] bg-[#f8fafc] px-5 text-base text-[#181934] placeholder:text-[#94A3B8]"
								placeholder="Masukkan email anda"
								autoComplete="email"
								required
							/>
							{fieldState.invalid ? (
								<FieldError errors={[fieldState.error]} />
							) : null}
						</Field>
					)}
				/>
				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							{/* <div className="flex items-center justify-between gap-4"> */}
							<FieldLabel className="font-semibold text-[#334155]">Password</FieldLabel>
							{/* <button
									type="button"
									className="font-semibold text-[#4796BD]"
								>
									Forgot password?
								</button> */}
							{/* </div> */}
							<InputGroup className="h-13 rounded-2xl border-[#E2E8F0] bg-[#f8fafc] px-2.5 text-base text-[#181934] placeholder:text-[#94A3B8]">
								<InputGroupInput
									{...field}
									aria-invalid={fieldState.invalid}
									className="not-noscript:hide-native-password-toggle"
									type={showPassword ? "text" : "password"}
									placeholder="Masukkan kata sandi anda"
								/>
								<InputGroupAddon align="inline-end" className="noscript:hidden">
									<InputGroupButton
										onClick={() => setShowPassword(v => !v)}
										disabled={field.disabled}
									>
										{!showPassword ? (
											<EyeIcon />
										) : (
											<EyeOffIcon />
										)}
										<VisuallyHidden>
											{showPassword ? "Hide password" : "Show password"}
										</VisuallyHidden>
									</InputGroupButton>
								</InputGroupAddon>
							</InputGroup>
							{fieldState.invalid ? (
								<FieldError errors={[fieldState.error]} />
							) : null}
						</Field>
					)}
				/>
			</FieldGroup>
			<Button
				type="submit"
				className="h-13 w-full rounded-2xl bg-[#4f9bc3] font-bold text-white shadow-[0_10px_20px_rgba(79,155,195,0.28)] hover:bg-[#468eb5]"
			>
				Masuk
			</Button>
		</form>
	);
}
