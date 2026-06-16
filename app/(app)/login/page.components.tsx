"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { unstable_rethrow } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, AlertCircleIcon } from "lucide-react";
import { z } from "zod";

import { uwsa } from "@/utils/actions";
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
	const allowShowPassword = !form.formState.isValidating && !form.formState.disabled && !form.formState.isSubmitting;
	useEffect(() => {
		if(allowShowPassword) return;
		setShowPassword(false);
	}, [allowShowPassword]);
	return (
		<form
			className="space-y-8"
			onSubmit={form.handleSubmit(async ({ email, password }) => {
				try {
					await uwsa(loginAction)(email, password);
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
							<FieldLabel>Email</FieldLabel>
							<Input
								{...field}
								disabled={field.disabled == true || form.formState.isSubmitting}
								aria-invalid={fieldState.invalid}
								placeholder="Enter your email"
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
							<FieldLabel>Password</FieldLabel>
							<InputGroup>
								<InputGroupInput
									{...field}
									disabled={field.disabled == true || form.formState.isSubmitting}
									aria-invalid={fieldState.invalid}
									className="not-noscript:hide-native-password-toggle"
									type={showPassword ? "text" : "password"}
									placeholder="Enter your password"
								/>
								<InputGroupAddon align="inline-end" className="noscript:hidden">
									<InputGroupButton
										onClick={() => setShowPassword(v => !v)}
										disabled={field.disabled}
									>
										{!showPassword ? (
											<EyeIcon className="h-4 w-4" aria-hidden="true" />
										) : (
											<EyeOffIcon className="h-4 w-4" aria-hidden="true" />
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
			<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
				Sign in
			</Button>
		</form>
	);
}
