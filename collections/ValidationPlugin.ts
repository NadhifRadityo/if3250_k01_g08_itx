import { Field, Config, validations, PayloadRequest, getDefaultValue } from "payload";

const optionalPromise = <T, R>(value: Promise<T> | T, callback: (value: T) => R) => {
	if(value instanceof Promise)
		return value.then(callback);
	return callback(value);
};
const traverseFields = (field: Field, callback: (field: Field) => boolean) => {
	if(!callback(field))
		return;
	if("fields" in field) {
		for(const childField of field.fields)
			traverseFields(childField, callback);
	}
};

export const EmptyableRequiredFieldValidationPlugin = () => {
	return (config: Config) => {
		const modifyField = (field: Field) => {
			if(
				("required" in field && field.required == true) &&
				(("hasMany" in field && field.hasMany == true) || field.type == "array" || field.type == "blocks") &&
				("minRows" in field && field.minRows != null && field.minRows <= 0)
			) {
				const nextValidation = field.validate ?? validations[field.type];
				if(nextValidation != null) {
					field.validate = (value: any, options: any) => {
						return optionalPromise(nextValidation(value, options), validation => {
							const t = (options.req as PayloadRequest).t;
							if(value != null && validation == t("validation:required"))
								return true;
							if(value != null && validation == t("validation:requiresAtLeast", { count: 1, label: t("general:row") }))
								return true;
							return validation;
						});
					};
				}
			}
			if(
				("required" in field && field.required == true) &&
				field.type == "richText"
			) {
				if(typeof field.defaultValue != "undefined") {
					field.hooks = {
						beforeValidate: [
							async ({ value, req }) => {
								if(value != null)
									return;
								return await getDefaultValue({
									defaultValue: field.defaultValue!,
									locale: req.locale ?? "",
									req: req,
									user: req.user
								});
							},
							...(field.hooks?.beforeValidate ?? [])
						],
						...field.hooks
					};
				}
				const nextValidation = field.validate ?? validations[field.type];
				if(nextValidation != null) {
					field.validate = (value: any, options: any) => {
						return optionalPromise(nextValidation(value, options), validation => {
							const t = (options.req as PayloadRequest).t;
							if(value != null && validation == t("validation:required"))
								return true;
							return validation;
						});
					};
				}
			}
			return true;
		};
		if(config.collections != null) {
			for(const collection of config.collections) {
				for(const field of collection.fields)
					traverseFields(field, modifyField);
			}
		}
		if(config.globals != null) {
			for(const global of config.globals) {
				for(const field of global.fields)
					traverseFields(field, modifyField);
			}
		}
		return config;
	};
};

export const SkipVirtualFieldValidationPlugin = () => {
	return (config: Config) => {
		const modifyField = (field: Field) => {
			if(
				("virtual" in field && field.virtual == true) &&
				(!("validate" in field) || field.validate == null)
			)
				field.validate = () => true as const;
			return true;
		};
		if(config.collections != null) {
			for(const collection of config.collections) {
				for(const field of collection.fields)
					traverseFields(field, modifyField);
			}
		}
		if(config.globals != null) {
			for(const global of config.globals) {
				for(const field of global.fields)
					traverseFields(field, modifyField);
			}
		}
		return config;
	};
};
