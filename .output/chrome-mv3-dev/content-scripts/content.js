var content = (function() {
	//#region \0rolldown/runtime.js
	var __defProp = Object.defineProperty;
	var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
	var __exportAll = (all, no_symbols) => {
		let target = {};
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
		if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
		return target;
	};
	//#endregion
	//#region node_modules/wxt/dist/utils/define-content-script.mjs
	function defineContentScript(definition) {
		return definition;
	}
	//#endregion
	//#region node_modules/zod/v3/helpers/util.js
	var util, objectUtil, ZodParsedType, getParsedType;
	var init_util = __esmMin((() => {
		(function(util) {
			util.assertEqual = (_) => {};
			function assertIs(_arg) {}
			util.assertIs = assertIs;
			function assertNever(_x) {
				throw new Error();
			}
			util.assertNever = assertNever;
			util.arrayToEnum = (items) => {
				const obj = {};
				for (const item of items) obj[item] = item;
				return obj;
			};
			util.getValidEnumValues = (obj) => {
				const validKeys = util.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
				const filtered = {};
				for (const k of validKeys) filtered[k] = obj[k];
				return util.objectValues(filtered);
			};
			util.objectValues = (obj) => {
				return util.objectKeys(obj).map(function(e) {
					return obj[e];
				});
			};
			util.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
				const keys = [];
				for (const key in object) if (Object.prototype.hasOwnProperty.call(object, key)) keys.push(key);
				return keys;
			};
			util.find = (arr, checker) => {
				for (const item of arr) if (checker(item)) return item;
			};
			util.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
			function joinValues(array, separator = " | ") {
				return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
			}
			util.joinValues = joinValues;
			util.jsonStringifyReplacer = (_, value) => {
				if (typeof value === "bigint") return value.toString();
				return value;
			};
		})(util || (util = {}));
		(function(objectUtil) {
			objectUtil.mergeShapes = (first, second) => {
				return {
					...first,
					...second
				};
			};
		})(objectUtil || (objectUtil = {}));
		ZodParsedType = util.arrayToEnum([
			"string",
			"nan",
			"number",
			"integer",
			"float",
			"boolean",
			"date",
			"bigint",
			"symbol",
			"function",
			"undefined",
			"null",
			"array",
			"object",
			"unknown",
			"promise",
			"void",
			"never",
			"map",
			"set"
		]);
		getParsedType = (data) => {
			switch (typeof data) {
				case "undefined": return ZodParsedType.undefined;
				case "string": return ZodParsedType.string;
				case "number": return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
				case "boolean": return ZodParsedType.boolean;
				case "function": return ZodParsedType.function;
				case "bigint": return ZodParsedType.bigint;
				case "symbol": return ZodParsedType.symbol;
				case "object":
					if (Array.isArray(data)) return ZodParsedType.array;
					if (data === null) return ZodParsedType.null;
					if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") return ZodParsedType.promise;
					if (typeof Map !== "undefined" && data instanceof Map) return ZodParsedType.map;
					if (typeof Set !== "undefined" && data instanceof Set) return ZodParsedType.set;
					if (typeof Date !== "undefined" && data instanceof Date) return ZodParsedType.date;
					return ZodParsedType.object;
				default: return ZodParsedType.unknown;
			}
		};
	}));
	//#endregion
	//#region node_modules/zod/v3/ZodError.js
	var ZodIssueCode, ZodError;
	var init_ZodError = __esmMin((() => {
		init_util();
		ZodIssueCode = util.arrayToEnum([
			"invalid_type",
			"invalid_literal",
			"custom",
			"invalid_union",
			"invalid_union_discriminator",
			"invalid_enum_value",
			"unrecognized_keys",
			"invalid_arguments",
			"invalid_return_type",
			"invalid_date",
			"invalid_string",
			"too_small",
			"too_big",
			"invalid_intersection_types",
			"not_multiple_of",
			"not_finite"
		]);
		ZodError = class ZodError extends Error {
			get errors() {
				return this.issues;
			}
			constructor(issues) {
				super();
				this.issues = [];
				this.addIssue = (sub) => {
					this.issues = [...this.issues, sub];
				};
				this.addIssues = (subs = []) => {
					this.issues = [...this.issues, ...subs];
				};
				const actualProto = new.target.prototype;
				if (Object.setPrototypeOf) Object.setPrototypeOf(this, actualProto);
				else this.__proto__ = actualProto;
				this.name = "ZodError";
				this.issues = issues;
			}
			format(_mapper) {
				const mapper = _mapper || function(issue) {
					return issue.message;
				};
				const fieldErrors = { _errors: [] };
				const processError = (error) => {
					for (const issue of error.issues) if (issue.code === "invalid_union") issue.unionErrors.map(processError);
					else if (issue.code === "invalid_return_type") processError(issue.returnTypeError);
					else if (issue.code === "invalid_arguments") processError(issue.argumentsError);
					else if (issue.path.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < issue.path.length) {
							const el = issue.path[i];
							if (!(i === issue.path.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				};
				processError(this);
				return fieldErrors;
			}
			static assert(value) {
				if (!(value instanceof ZodError)) throw new Error(`Not a ZodError: ${value}`);
			}
			toString() {
				return this.message;
			}
			get message() {
				return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
			}
			get isEmpty() {
				return this.issues.length === 0;
			}
			flatten(mapper = (issue) => issue.message) {
				const fieldErrors = {};
				const formErrors = [];
				for (const sub of this.issues) if (sub.path.length > 0) {
					const firstEl = sub.path[0];
					fieldErrors[firstEl] = fieldErrors[firstEl] || [];
					fieldErrors[firstEl].push(mapper(sub));
				} else formErrors.push(mapper(sub));
				return {
					formErrors,
					fieldErrors
				};
			}
			get formErrors() {
				return this.flatten();
			}
		};
		ZodError.create = (issues) => {
			return new ZodError(issues);
		};
	}));
	//#endregion
	//#region node_modules/zod/v3/locales/en.js
	var errorMap;
	var init_en = __esmMin((() => {
		init_ZodError();
		init_util();
		errorMap = (issue, _ctx) => {
			let message;
			switch (issue.code) {
				case ZodIssueCode.invalid_type:
					if (issue.received === ZodParsedType.undefined) message = "Required";
					else message = `Expected ${issue.expected}, received ${issue.received}`;
					break;
				case ZodIssueCode.invalid_literal:
					message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
					break;
				case ZodIssueCode.unrecognized_keys:
					message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
					break;
				case ZodIssueCode.invalid_union:
					message = `Invalid input`;
					break;
				case ZodIssueCode.invalid_union_discriminator:
					message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
					break;
				case ZodIssueCode.invalid_enum_value:
					message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
					break;
				case ZodIssueCode.invalid_arguments:
					message = `Invalid function arguments`;
					break;
				case ZodIssueCode.invalid_return_type:
					message = `Invalid function return type`;
					break;
				case ZodIssueCode.invalid_date:
					message = `Invalid date`;
					break;
				case ZodIssueCode.invalid_string:
					if (typeof issue.validation === "object") if ("includes" in issue.validation) {
						message = `Invalid input: must include "${issue.validation.includes}"`;
						if (typeof issue.validation.position === "number") message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
					} else if ("startsWith" in issue.validation) message = `Invalid input: must start with "${issue.validation.startsWith}"`;
					else if ("endsWith" in issue.validation) message = `Invalid input: must end with "${issue.validation.endsWith}"`;
					else util.assertNever(issue.validation);
					else if (issue.validation !== "regex") message = `Invalid ${issue.validation}`;
					else message = "Invalid";
					break;
				case ZodIssueCode.too_small:
					if (issue.type === "array") message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
					else if (issue.type === "string") message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
					else if (issue.type === "number") message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
					else if (issue.type === "bigint") message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
					else if (issue.type === "date") message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
					else message = "Invalid input";
					break;
				case ZodIssueCode.too_big:
					if (issue.type === "array") message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
					else if (issue.type === "string") message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
					else if (issue.type === "number") message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
					else if (issue.type === "bigint") message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
					else if (issue.type === "date") message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
					else message = "Invalid input";
					break;
				case ZodIssueCode.custom:
					message = `Invalid input`;
					break;
				case ZodIssueCode.invalid_intersection_types:
					message = `Intersection results could not be merged`;
					break;
				case ZodIssueCode.not_multiple_of:
					message = `Number must be a multiple of ${issue.multipleOf}`;
					break;
				case ZodIssueCode.not_finite:
					message = "Number must be finite";
					break;
				default:
					message = _ctx.defaultError;
					util.assertNever(issue);
			}
			return { message };
		};
	}));
	//#endregion
	//#region node_modules/zod/v3/errors.js
	function getErrorMap() {
		return overrideErrorMap;
	}
	var overrideErrorMap;
	var init_errors = __esmMin((() => {
		init_en();
		overrideErrorMap = errorMap;
	}));
	//#endregion
	//#region node_modules/zod/v3/helpers/parseUtil.js
	function addIssueToContext(ctx, issueData) {
		const overrideMap = getErrorMap();
		const issue = makeIssue({
			issueData,
			data: ctx.data,
			path: ctx.path,
			errorMaps: [
				ctx.common.contextualErrorMap,
				ctx.schemaErrorMap,
				overrideMap,
				overrideMap === errorMap ? void 0 : errorMap
			].filter((x) => !!x)
		});
		ctx.common.issues.push(issue);
	}
	var makeIssue, ParseStatus, INVALID, DIRTY, OK, isAborted, isDirty, isValid, isAsync;
	var init_parseUtil = __esmMin((() => {
		init_errors();
		init_en();
		makeIssue = (params) => {
			const { data, path, errorMaps, issueData } = params;
			const fullPath = [...path, ...issueData.path || []];
			const fullIssue = {
				...issueData,
				path: fullPath
			};
			if (issueData.message !== void 0) return {
				...issueData,
				path: fullPath,
				message: issueData.message
			};
			let errorMessage = "";
			const maps = errorMaps.filter((m) => !!m).slice().reverse();
			for (const map of maps) errorMessage = map(fullIssue, {
				data,
				defaultError: errorMessage
			}).message;
			return {
				...issueData,
				path: fullPath,
				message: errorMessage
			};
		};
		ParseStatus = class ParseStatus {
			constructor() {
				this.value = "valid";
			}
			dirty() {
				if (this.value === "valid") this.value = "dirty";
			}
			abort() {
				if (this.value !== "aborted") this.value = "aborted";
			}
			static mergeArray(status, results) {
				const arrayValue = [];
				for (const s of results) {
					if (s.status === "aborted") return INVALID;
					if (s.status === "dirty") status.dirty();
					arrayValue.push(s.value);
				}
				return {
					status: status.value,
					value: arrayValue
				};
			}
			static async mergeObjectAsync(status, pairs) {
				const syncPairs = [];
				for (const pair of pairs) {
					const key = await pair.key;
					const value = await pair.value;
					syncPairs.push({
						key,
						value
					});
				}
				return ParseStatus.mergeObjectSync(status, syncPairs);
			}
			static mergeObjectSync(status, pairs) {
				const finalObject = {};
				for (const pair of pairs) {
					const { key, value } = pair;
					if (key.status === "aborted") return INVALID;
					if (value.status === "aborted") return INVALID;
					if (key.status === "dirty") status.dirty();
					if (value.status === "dirty") status.dirty();
					if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) finalObject[key.value] = value.value;
				}
				return {
					status: status.value,
					value: finalObject
				};
			}
		};
		INVALID = Object.freeze({ status: "aborted" });
		DIRTY = (value) => ({
			status: "dirty",
			value
		});
		OK = (value) => ({
			status: "valid",
			value
		});
		isAborted = (x) => x.status === "aborted";
		isDirty = (x) => x.status === "dirty";
		isValid = (x) => x.status === "valid";
		isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
	}));
	//#endregion
	//#region node_modules/zod/v3/helpers/typeAliases.js
	var init_typeAliases = __esmMin((() => {}));
	//#endregion
	//#region node_modules/zod/v3/helpers/errorUtil.js
	var errorUtil;
	var init_errorUtil = __esmMin((() => {
		(function(errorUtil) {
			errorUtil.errToObj = (message) => typeof message === "string" ? { message } : message || {};
			errorUtil.toString = (message) => typeof message === "string" ? message : message?.message;
		})(errorUtil || (errorUtil = {}));
	}));
	//#endregion
	//#region node_modules/zod/v3/types.js
	function processCreateParams(params) {
		if (!params) return {};
		const { errorMap, invalid_type_error, required_error, description } = params;
		if (errorMap && (invalid_type_error || required_error)) throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
		if (errorMap) return {
			errorMap,
			description
		};
		const customMap = (iss, ctx) => {
			const { message } = params;
			if (iss.code === "invalid_enum_value") return { message: message ?? ctx.defaultError };
			if (typeof ctx.data === "undefined") return { message: message ?? required_error ?? ctx.defaultError };
			if (iss.code !== "invalid_type") return { message: ctx.defaultError };
			return { message: message ?? invalid_type_error ?? ctx.defaultError };
		};
		return {
			errorMap: customMap,
			description
		};
	}
	function timeRegexSource(args) {
		let secondsRegexSource = `[0-5]\\d`;
		if (args.precision) secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
		else if (args.precision == null) secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
		const secondsQuantifier = args.precision ? "+" : "?";
		return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
	}
	function timeRegex(args) {
		return new RegExp(`^${timeRegexSource(args)}$`);
	}
	function datetimeRegex(args) {
		let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
		const opts = [];
		opts.push(args.local ? `Z?` : `Z`);
		if (args.offset) opts.push(`([+-]\\d{2}:?\\d{2})`);
		regex = `${regex}(${opts.join("|")})`;
		return new RegExp(`^${regex}$`);
	}
	function isValidIP(ip, version) {
		if ((version === "v4" || !version) && ipv4Regex.test(ip)) return true;
		if ((version === "v6" || !version) && ipv6Regex.test(ip)) return true;
		return false;
	}
	function isValidJWT(jwt, alg) {
		if (!jwtRegex.test(jwt)) return false;
		try {
			const [header] = jwt.split(".");
			if (!header) return false;
			const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
			const decoded = JSON.parse(atob(base64));
			if (typeof decoded !== "object" || decoded === null) return false;
			if ("typ" in decoded && decoded?.typ !== "JWT") return false;
			if (!decoded.alg) return false;
			if (alg && decoded.alg !== alg) return false;
			return true;
		} catch {
			return false;
		}
	}
	function isValidCidr(ip, version) {
		if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) return true;
		if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) return true;
		return false;
	}
	function floatSafeRemainder(val, step) {
		const valDecCount = (val.toString().split(".")[1] || "").length;
		const stepDecCount = (step.toString().split(".")[1] || "").length;
		const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
		return Number.parseInt(val.toFixed(decCount).replace(".", "")) % Number.parseInt(step.toFixed(decCount).replace(".", "")) / 10 ** decCount;
	}
	function deepPartialify(schema) {
		if (schema instanceof ZodObject) {
			const newShape = {};
			for (const key in schema.shape) {
				const fieldSchema = schema.shape[key];
				newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
			}
			return new ZodObject({
				...schema._def,
				shape: () => newShape
			});
		} else if (schema instanceof ZodArray) return new ZodArray({
			...schema._def,
			type: deepPartialify(schema.element)
		});
		else if (schema instanceof ZodOptional) return ZodOptional.create(deepPartialify(schema.unwrap()));
		else if (schema instanceof ZodNullable) return ZodNullable.create(deepPartialify(schema.unwrap()));
		else if (schema instanceof ZodTuple) return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
		else return schema;
	}
	function mergeValues(a, b) {
		const aType = getParsedType(a);
		const bType = getParsedType(b);
		if (a === b) return {
			valid: true,
			data: a
		};
		else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
			const bKeys = util.objectKeys(b);
			const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
			const newObj = {
				...a,
				...b
			};
			for (const key of sharedKeys) {
				const sharedValue = mergeValues(a[key], b[key]);
				if (!sharedValue.valid) return { valid: false };
				newObj[key] = sharedValue.data;
			}
			return {
				valid: true,
				data: newObj
			};
		} else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
			if (a.length !== b.length) return { valid: false };
			const newArray = [];
			for (let index = 0; index < a.length; index++) {
				const itemA = a[index];
				const itemB = b[index];
				const sharedValue = mergeValues(itemA, itemB);
				if (!sharedValue.valid) return { valid: false };
				newArray.push(sharedValue.data);
			}
			return {
				valid: true,
				data: newArray
			};
		} else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) return {
			valid: true,
			data: a
		};
		else return { valid: false };
	}
	function createZodEnum(values, params) {
		return new ZodEnum({
			values,
			typeName: ZodFirstPartyTypeKind.ZodEnum,
			...processCreateParams(params)
		});
	}
	var ParseInputLazyPath, handleResult, ZodType, cuidRegex, cuid2Regex, ulidRegex, uuidRegex, nanoidRegex, jwtRegex, durationRegex, emailRegex, _emojiRegex, emojiRegex, ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex, base64Regex, base64urlRegex, dateRegexSource, dateRegex, ZodString, ZodNumber, ZodBigInt, ZodBoolean, ZodDate, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodArray, ZodObject, ZodUnion, getDiscriminator, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodFunction, ZodLazy, ZodLiteral, ZodEnum, ZodNativeEnum, ZodPromise, ZodEffects, ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodNaN, ZodBranded, ZodPipeline, ZodReadonly, ZodFirstPartyTypeKind, stringType, numberType, booleanType, unknownType, arrayType, objectType, recordType, enumType;
	var init_types = __esmMin((() => {
		init_ZodError();
		init_errors();
		init_errorUtil();
		init_parseUtil();
		init_util();
		ParseInputLazyPath = class {
			constructor(parent, value, path, key) {
				this._cachedPath = [];
				this.parent = parent;
				this.data = value;
				this._path = path;
				this._key = key;
			}
			get path() {
				if (!this._cachedPath.length) if (Array.isArray(this._key)) this._cachedPath.push(...this._path, ...this._key);
				else this._cachedPath.push(...this._path, this._key);
				return this._cachedPath;
			}
		};
		handleResult = (ctx, result) => {
			if (isValid(result)) return {
				success: true,
				data: result.value
			};
			else {
				if (!ctx.common.issues.length) throw new Error("Validation failed but no issues detected.");
				return {
					success: false,
					get error() {
						if (this._error) return this._error;
						const error = new ZodError(ctx.common.issues);
						this._error = error;
						return this._error;
					}
				};
			}
		};
		ZodType = class {
			get description() {
				return this._def.description;
			}
			_getType(input) {
				return getParsedType(input.data);
			}
			_getOrReturnCtx(input, ctx) {
				return ctx || {
					common: input.parent.common,
					data: input.data,
					parsedType: getParsedType(input.data),
					schemaErrorMap: this._def.errorMap,
					path: input.path,
					parent: input.parent
				};
			}
			_processInputParams(input) {
				return {
					status: new ParseStatus(),
					ctx: {
						common: input.parent.common,
						data: input.data,
						parsedType: getParsedType(input.data),
						schemaErrorMap: this._def.errorMap,
						path: input.path,
						parent: input.parent
					}
				};
			}
			_parseSync(input) {
				const result = this._parse(input);
				if (isAsync(result)) throw new Error("Synchronous parse encountered promise.");
				return result;
			}
			_parseAsync(input) {
				const result = this._parse(input);
				return Promise.resolve(result);
			}
			parse(data, params) {
				const result = this.safeParse(data, params);
				if (result.success) return result.data;
				throw result.error;
			}
			safeParse(data, params) {
				const ctx = {
					common: {
						issues: [],
						async: params?.async ?? false,
						contextualErrorMap: params?.errorMap
					},
					path: params?.path || [],
					schemaErrorMap: this._def.errorMap,
					parent: null,
					data,
					parsedType: getParsedType(data)
				};
				return handleResult(ctx, this._parseSync({
					data,
					path: ctx.path,
					parent: ctx
				}));
			}
			"~validate"(data) {
				const ctx = {
					common: {
						issues: [],
						async: !!this["~standard"].async
					},
					path: [],
					schemaErrorMap: this._def.errorMap,
					parent: null,
					data,
					parsedType: getParsedType(data)
				};
				if (!this["~standard"].async) try {
					const result = this._parseSync({
						data,
						path: [],
						parent: ctx
					});
					return isValid(result) ? { value: result.value } : { issues: ctx.common.issues };
				} catch (err) {
					if (err?.message?.toLowerCase()?.includes("encountered")) this["~standard"].async = true;
					ctx.common = {
						issues: [],
						async: true
					};
				}
				return this._parseAsync({
					data,
					path: [],
					parent: ctx
				}).then((result) => isValid(result) ? { value: result.value } : { issues: ctx.common.issues });
			}
			async parseAsync(data, params) {
				const result = await this.safeParseAsync(data, params);
				if (result.success) return result.data;
				throw result.error;
			}
			async safeParseAsync(data, params) {
				const ctx = {
					common: {
						issues: [],
						contextualErrorMap: params?.errorMap,
						async: true
					},
					path: params?.path || [],
					schemaErrorMap: this._def.errorMap,
					parent: null,
					data,
					parsedType: getParsedType(data)
				};
				const maybeAsyncResult = this._parse({
					data,
					path: ctx.path,
					parent: ctx
				});
				return handleResult(ctx, await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult)));
			}
			refine(check, message) {
				const getIssueProperties = (val) => {
					if (typeof message === "string" || typeof message === "undefined") return { message };
					else if (typeof message === "function") return message(val);
					else return message;
				};
				return this._refinement((val, ctx) => {
					const result = check(val);
					const setError = () => ctx.addIssue({
						code: ZodIssueCode.custom,
						...getIssueProperties(val)
					});
					if (typeof Promise !== "undefined" && result instanceof Promise) return result.then((data) => {
						if (!data) {
							setError();
							return false;
						} else return true;
					});
					if (!result) {
						setError();
						return false;
					} else return true;
				});
			}
			refinement(check, refinementData) {
				return this._refinement((val, ctx) => {
					if (!check(val)) {
						ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
						return false;
					} else return true;
				});
			}
			_refinement(refinement) {
				return new ZodEffects({
					schema: this,
					typeName: ZodFirstPartyTypeKind.ZodEffects,
					effect: {
						type: "refinement",
						refinement
					}
				});
			}
			superRefine(refinement) {
				return this._refinement(refinement);
			}
			constructor(def) {
				/** Alias of safeParseAsync */
				this.spa = this.safeParseAsync;
				this._def = def;
				this.parse = this.parse.bind(this);
				this.safeParse = this.safeParse.bind(this);
				this.parseAsync = this.parseAsync.bind(this);
				this.safeParseAsync = this.safeParseAsync.bind(this);
				this.spa = this.spa.bind(this);
				this.refine = this.refine.bind(this);
				this.refinement = this.refinement.bind(this);
				this.superRefine = this.superRefine.bind(this);
				this.optional = this.optional.bind(this);
				this.nullable = this.nullable.bind(this);
				this.nullish = this.nullish.bind(this);
				this.array = this.array.bind(this);
				this.promise = this.promise.bind(this);
				this.or = this.or.bind(this);
				this.and = this.and.bind(this);
				this.transform = this.transform.bind(this);
				this.brand = this.brand.bind(this);
				this.default = this.default.bind(this);
				this.catch = this.catch.bind(this);
				this.describe = this.describe.bind(this);
				this.pipe = this.pipe.bind(this);
				this.readonly = this.readonly.bind(this);
				this.isNullable = this.isNullable.bind(this);
				this.isOptional = this.isOptional.bind(this);
				this["~standard"] = {
					version: 1,
					vendor: "zod",
					validate: (data) => this["~validate"](data)
				};
			}
			optional() {
				return ZodOptional.create(this, this._def);
			}
			nullable() {
				return ZodNullable.create(this, this._def);
			}
			nullish() {
				return this.nullable().optional();
			}
			array() {
				return ZodArray.create(this);
			}
			promise() {
				return ZodPromise.create(this, this._def);
			}
			or(option) {
				return ZodUnion.create([this, option], this._def);
			}
			and(incoming) {
				return ZodIntersection.create(this, incoming, this._def);
			}
			transform(transform) {
				return new ZodEffects({
					...processCreateParams(this._def),
					schema: this,
					typeName: ZodFirstPartyTypeKind.ZodEffects,
					effect: {
						type: "transform",
						transform
					}
				});
			}
			default(def) {
				const defaultValueFunc = typeof def === "function" ? def : () => def;
				return new ZodDefault({
					...processCreateParams(this._def),
					innerType: this,
					defaultValue: defaultValueFunc,
					typeName: ZodFirstPartyTypeKind.ZodDefault
				});
			}
			brand() {
				return new ZodBranded({
					typeName: ZodFirstPartyTypeKind.ZodBranded,
					type: this,
					...processCreateParams(this._def)
				});
			}
			catch(def) {
				const catchValueFunc = typeof def === "function" ? def : () => def;
				return new ZodCatch({
					...processCreateParams(this._def),
					innerType: this,
					catchValue: catchValueFunc,
					typeName: ZodFirstPartyTypeKind.ZodCatch
				});
			}
			describe(description) {
				const This = this.constructor;
				return new This({
					...this._def,
					description
				});
			}
			pipe(target) {
				return ZodPipeline.create(this, target);
			}
			readonly() {
				return ZodReadonly.create(this);
			}
			isOptional() {
				return this.safeParse(void 0).success;
			}
			isNullable() {
				return this.safeParse(null).success;
			}
		};
		cuidRegex = /^c[^\s-]{8,}$/i;
		cuid2Regex = /^[0-9a-z]+$/;
		ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
		uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
		nanoidRegex = /^[a-z0-9_-]{21}$/i;
		jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
		durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
		emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
		_emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
		ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
		ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
		base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
		dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
		dateRegex = new RegExp(`^${dateRegexSource}$`);
		ZodString = class ZodString extends ZodType {
			_parse(input) {
				if (this._def.coerce) input.data = String(input.data);
				if (this._getType(input) !== ZodParsedType.string) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.string,
						received: ctx.parsedType
					});
					return INVALID;
				}
				const status = new ParseStatus();
				let ctx = void 0;
				for (const check of this._def.checks) if (check.kind === "min") {
					if (input.data.length < check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_small,
							minimum: check.value,
							type: "string",
							inclusive: true,
							exact: false,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "max") {
					if (input.data.length > check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_big,
							maximum: check.value,
							type: "string",
							inclusive: true,
							exact: false,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "length") {
					const tooBig = input.data.length > check.value;
					const tooSmall = input.data.length < check.value;
					if (tooBig || tooSmall) {
						ctx = this._getOrReturnCtx(input, ctx);
						if (tooBig) addIssueToContext(ctx, {
							code: ZodIssueCode.too_big,
							maximum: check.value,
							type: "string",
							inclusive: true,
							exact: true,
							message: check.message
						});
						else if (tooSmall) addIssueToContext(ctx, {
							code: ZodIssueCode.too_small,
							minimum: check.value,
							type: "string",
							inclusive: true,
							exact: true,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "email") {
					if (!emailRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "email",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "emoji") {
					if (!emojiRegex) emojiRegex = new RegExp(_emojiRegex, "u");
					if (!emojiRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "emoji",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "uuid") {
					if (!uuidRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "uuid",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "nanoid") {
					if (!nanoidRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "nanoid",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "cuid") {
					if (!cuidRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "cuid",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "cuid2") {
					if (!cuid2Regex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "cuid2",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "ulid") {
					if (!ulidRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "ulid",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "url") try {
					new URL(input.data);
				} catch {
					ctx = this._getOrReturnCtx(input, ctx);
					addIssueToContext(ctx, {
						validation: "url",
						code: ZodIssueCode.invalid_string,
						message: check.message
					});
					status.dirty();
				}
				else if (check.kind === "regex") {
					check.regex.lastIndex = 0;
					if (!check.regex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "regex",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "trim") input.data = input.data.trim();
				else if (check.kind === "includes") {
					if (!input.data.includes(check.value, check.position)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.invalid_string,
							validation: {
								includes: check.value,
								position: check.position
							},
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "toLowerCase") input.data = input.data.toLowerCase();
				else if (check.kind === "toUpperCase") input.data = input.data.toUpperCase();
				else if (check.kind === "startsWith") {
					if (!input.data.startsWith(check.value)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.invalid_string,
							validation: { startsWith: check.value },
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "endsWith") {
					if (!input.data.endsWith(check.value)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.invalid_string,
							validation: { endsWith: check.value },
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "datetime") {
					if (!datetimeRegex(check).test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.invalid_string,
							validation: "datetime",
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "date") {
					if (!dateRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.invalid_string,
							validation: "date",
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "time") {
					if (!timeRegex(check).test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.invalid_string,
							validation: "time",
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "duration") {
					if (!durationRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "duration",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "ip") {
					if (!isValidIP(input.data, check.version)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "ip",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "jwt") {
					if (!isValidJWT(input.data, check.alg)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "jwt",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "cidr") {
					if (!isValidCidr(input.data, check.version)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "cidr",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "base64") {
					if (!base64Regex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "base64",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "base64url") {
					if (!base64urlRegex.test(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							validation: "base64url",
							code: ZodIssueCode.invalid_string,
							message: check.message
						});
						status.dirty();
					}
				} else util.assertNever(check);
				return {
					status: status.value,
					value: input.data
				};
			}
			_regex(regex, validation, message) {
				return this.refinement((data) => regex.test(data), {
					validation,
					code: ZodIssueCode.invalid_string,
					...errorUtil.errToObj(message)
				});
			}
			_addCheck(check) {
				return new ZodString({
					...this._def,
					checks: [...this._def.checks, check]
				});
			}
			email(message) {
				return this._addCheck({
					kind: "email",
					...errorUtil.errToObj(message)
				});
			}
			url(message) {
				return this._addCheck({
					kind: "url",
					...errorUtil.errToObj(message)
				});
			}
			emoji(message) {
				return this._addCheck({
					kind: "emoji",
					...errorUtil.errToObj(message)
				});
			}
			uuid(message) {
				return this._addCheck({
					kind: "uuid",
					...errorUtil.errToObj(message)
				});
			}
			nanoid(message) {
				return this._addCheck({
					kind: "nanoid",
					...errorUtil.errToObj(message)
				});
			}
			cuid(message) {
				return this._addCheck({
					kind: "cuid",
					...errorUtil.errToObj(message)
				});
			}
			cuid2(message) {
				return this._addCheck({
					kind: "cuid2",
					...errorUtil.errToObj(message)
				});
			}
			ulid(message) {
				return this._addCheck({
					kind: "ulid",
					...errorUtil.errToObj(message)
				});
			}
			base64(message) {
				return this._addCheck({
					kind: "base64",
					...errorUtil.errToObj(message)
				});
			}
			base64url(message) {
				return this._addCheck({
					kind: "base64url",
					...errorUtil.errToObj(message)
				});
			}
			jwt(options) {
				return this._addCheck({
					kind: "jwt",
					...errorUtil.errToObj(options)
				});
			}
			ip(options) {
				return this._addCheck({
					kind: "ip",
					...errorUtil.errToObj(options)
				});
			}
			cidr(options) {
				return this._addCheck({
					kind: "cidr",
					...errorUtil.errToObj(options)
				});
			}
			datetime(options) {
				if (typeof options === "string") return this._addCheck({
					kind: "datetime",
					precision: null,
					offset: false,
					local: false,
					message: options
				});
				return this._addCheck({
					kind: "datetime",
					precision: typeof options?.precision === "undefined" ? null : options?.precision,
					offset: options?.offset ?? false,
					local: options?.local ?? false,
					...errorUtil.errToObj(options?.message)
				});
			}
			date(message) {
				return this._addCheck({
					kind: "date",
					message
				});
			}
			time(options) {
				if (typeof options === "string") return this._addCheck({
					kind: "time",
					precision: null,
					message: options
				});
				return this._addCheck({
					kind: "time",
					precision: typeof options?.precision === "undefined" ? null : options?.precision,
					...errorUtil.errToObj(options?.message)
				});
			}
			duration(message) {
				return this._addCheck({
					kind: "duration",
					...errorUtil.errToObj(message)
				});
			}
			regex(regex, message) {
				return this._addCheck({
					kind: "regex",
					regex,
					...errorUtil.errToObj(message)
				});
			}
			includes(value, options) {
				return this._addCheck({
					kind: "includes",
					value,
					position: options?.position,
					...errorUtil.errToObj(options?.message)
				});
			}
			startsWith(value, message) {
				return this._addCheck({
					kind: "startsWith",
					value,
					...errorUtil.errToObj(message)
				});
			}
			endsWith(value, message) {
				return this._addCheck({
					kind: "endsWith",
					value,
					...errorUtil.errToObj(message)
				});
			}
			min(minLength, message) {
				return this._addCheck({
					kind: "min",
					value: minLength,
					...errorUtil.errToObj(message)
				});
			}
			max(maxLength, message) {
				return this._addCheck({
					kind: "max",
					value: maxLength,
					...errorUtil.errToObj(message)
				});
			}
			length(len, message) {
				return this._addCheck({
					kind: "length",
					value: len,
					...errorUtil.errToObj(message)
				});
			}
			/**
			* Equivalent to `.min(1)`
			*/
			nonempty(message) {
				return this.min(1, errorUtil.errToObj(message));
			}
			trim() {
				return new ZodString({
					...this._def,
					checks: [...this._def.checks, { kind: "trim" }]
				});
			}
			toLowerCase() {
				return new ZodString({
					...this._def,
					checks: [...this._def.checks, { kind: "toLowerCase" }]
				});
			}
			toUpperCase() {
				return new ZodString({
					...this._def,
					checks: [...this._def.checks, { kind: "toUpperCase" }]
				});
			}
			get isDatetime() {
				return !!this._def.checks.find((ch) => ch.kind === "datetime");
			}
			get isDate() {
				return !!this._def.checks.find((ch) => ch.kind === "date");
			}
			get isTime() {
				return !!this._def.checks.find((ch) => ch.kind === "time");
			}
			get isDuration() {
				return !!this._def.checks.find((ch) => ch.kind === "duration");
			}
			get isEmail() {
				return !!this._def.checks.find((ch) => ch.kind === "email");
			}
			get isURL() {
				return !!this._def.checks.find((ch) => ch.kind === "url");
			}
			get isEmoji() {
				return !!this._def.checks.find((ch) => ch.kind === "emoji");
			}
			get isUUID() {
				return !!this._def.checks.find((ch) => ch.kind === "uuid");
			}
			get isNANOID() {
				return !!this._def.checks.find((ch) => ch.kind === "nanoid");
			}
			get isCUID() {
				return !!this._def.checks.find((ch) => ch.kind === "cuid");
			}
			get isCUID2() {
				return !!this._def.checks.find((ch) => ch.kind === "cuid2");
			}
			get isULID() {
				return !!this._def.checks.find((ch) => ch.kind === "ulid");
			}
			get isIP() {
				return !!this._def.checks.find((ch) => ch.kind === "ip");
			}
			get isCIDR() {
				return !!this._def.checks.find((ch) => ch.kind === "cidr");
			}
			get isBase64() {
				return !!this._def.checks.find((ch) => ch.kind === "base64");
			}
			get isBase64url() {
				return !!this._def.checks.find((ch) => ch.kind === "base64url");
			}
			get minLength() {
				let min = null;
				for (const ch of this._def.checks) if (ch.kind === "min") {
					if (min === null || ch.value > min) min = ch.value;
				}
				return min;
			}
			get maxLength() {
				let max = null;
				for (const ch of this._def.checks) if (ch.kind === "max") {
					if (max === null || ch.value < max) max = ch.value;
				}
				return max;
			}
		};
		ZodString.create = (params) => {
			return new ZodString({
				checks: [],
				typeName: ZodFirstPartyTypeKind.ZodString,
				coerce: params?.coerce ?? false,
				...processCreateParams(params)
			});
		};
		ZodNumber = class ZodNumber extends ZodType {
			constructor() {
				super(...arguments);
				this.min = this.gte;
				this.max = this.lte;
				this.step = this.multipleOf;
			}
			_parse(input) {
				if (this._def.coerce) input.data = Number(input.data);
				if (this._getType(input) !== ZodParsedType.number) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.number,
						received: ctx.parsedType
					});
					return INVALID;
				}
				let ctx = void 0;
				const status = new ParseStatus();
				for (const check of this._def.checks) if (check.kind === "int") {
					if (!util.isInteger(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.invalid_type,
							expected: "integer",
							received: "float",
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "min") {
					if (check.inclusive ? input.data < check.value : input.data <= check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_small,
							minimum: check.value,
							type: "number",
							inclusive: check.inclusive,
							exact: false,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "max") {
					if (check.inclusive ? input.data > check.value : input.data >= check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_big,
							maximum: check.value,
							type: "number",
							inclusive: check.inclusive,
							exact: false,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "multipleOf") {
					if (floatSafeRemainder(input.data, check.value) !== 0) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.not_multiple_of,
							multipleOf: check.value,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "finite") {
					if (!Number.isFinite(input.data)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.not_finite,
							message: check.message
						});
						status.dirty();
					}
				} else util.assertNever(check);
				return {
					status: status.value,
					value: input.data
				};
			}
			gte(value, message) {
				return this.setLimit("min", value, true, errorUtil.toString(message));
			}
			gt(value, message) {
				return this.setLimit("min", value, false, errorUtil.toString(message));
			}
			lte(value, message) {
				return this.setLimit("max", value, true, errorUtil.toString(message));
			}
			lt(value, message) {
				return this.setLimit("max", value, false, errorUtil.toString(message));
			}
			setLimit(kind, value, inclusive, message) {
				return new ZodNumber({
					...this._def,
					checks: [...this._def.checks, {
						kind,
						value,
						inclusive,
						message: errorUtil.toString(message)
					}]
				});
			}
			_addCheck(check) {
				return new ZodNumber({
					...this._def,
					checks: [...this._def.checks, check]
				});
			}
			int(message) {
				return this._addCheck({
					kind: "int",
					message: errorUtil.toString(message)
				});
			}
			positive(message) {
				return this._addCheck({
					kind: "min",
					value: 0,
					inclusive: false,
					message: errorUtil.toString(message)
				});
			}
			negative(message) {
				return this._addCheck({
					kind: "max",
					value: 0,
					inclusive: false,
					message: errorUtil.toString(message)
				});
			}
			nonpositive(message) {
				return this._addCheck({
					kind: "max",
					value: 0,
					inclusive: true,
					message: errorUtil.toString(message)
				});
			}
			nonnegative(message) {
				return this._addCheck({
					kind: "min",
					value: 0,
					inclusive: true,
					message: errorUtil.toString(message)
				});
			}
			multipleOf(value, message) {
				return this._addCheck({
					kind: "multipleOf",
					value,
					message: errorUtil.toString(message)
				});
			}
			finite(message) {
				return this._addCheck({
					kind: "finite",
					message: errorUtil.toString(message)
				});
			}
			safe(message) {
				return this._addCheck({
					kind: "min",
					inclusive: true,
					value: Number.MIN_SAFE_INTEGER,
					message: errorUtil.toString(message)
				})._addCheck({
					kind: "max",
					inclusive: true,
					value: Number.MAX_SAFE_INTEGER,
					message: errorUtil.toString(message)
				});
			}
			get minValue() {
				let min = null;
				for (const ch of this._def.checks) if (ch.kind === "min") {
					if (min === null || ch.value > min) min = ch.value;
				}
				return min;
			}
			get maxValue() {
				let max = null;
				for (const ch of this._def.checks) if (ch.kind === "max") {
					if (max === null || ch.value < max) max = ch.value;
				}
				return max;
			}
			get isInt() {
				return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
			}
			get isFinite() {
				let max = null;
				let min = null;
				for (const ch of this._def.checks) if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") return true;
				else if (ch.kind === "min") {
					if (min === null || ch.value > min) min = ch.value;
				} else if (ch.kind === "max") {
					if (max === null || ch.value < max) max = ch.value;
				}
				return Number.isFinite(min) && Number.isFinite(max);
			}
		};
		ZodNumber.create = (params) => {
			return new ZodNumber({
				checks: [],
				typeName: ZodFirstPartyTypeKind.ZodNumber,
				coerce: params?.coerce || false,
				...processCreateParams(params)
			});
		};
		ZodBigInt = class ZodBigInt extends ZodType {
			constructor() {
				super(...arguments);
				this.min = this.gte;
				this.max = this.lte;
			}
			_parse(input) {
				if (this._def.coerce) try {
					input.data = BigInt(input.data);
				} catch {
					return this._getInvalidInput(input);
				}
				if (this._getType(input) !== ZodParsedType.bigint) return this._getInvalidInput(input);
				let ctx = void 0;
				const status = new ParseStatus();
				for (const check of this._def.checks) if (check.kind === "min") {
					if (check.inclusive ? input.data < check.value : input.data <= check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_small,
							type: "bigint",
							minimum: check.value,
							inclusive: check.inclusive,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "max") {
					if (check.inclusive ? input.data > check.value : input.data >= check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_big,
							type: "bigint",
							maximum: check.value,
							inclusive: check.inclusive,
							message: check.message
						});
						status.dirty();
					}
				} else if (check.kind === "multipleOf") {
					if (input.data % check.value !== BigInt(0)) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.not_multiple_of,
							multipleOf: check.value,
							message: check.message
						});
						status.dirty();
					}
				} else util.assertNever(check);
				return {
					status: status.value,
					value: input.data
				};
			}
			_getInvalidInput(input) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.bigint,
					received: ctx.parsedType
				});
				return INVALID;
			}
			gte(value, message) {
				return this.setLimit("min", value, true, errorUtil.toString(message));
			}
			gt(value, message) {
				return this.setLimit("min", value, false, errorUtil.toString(message));
			}
			lte(value, message) {
				return this.setLimit("max", value, true, errorUtil.toString(message));
			}
			lt(value, message) {
				return this.setLimit("max", value, false, errorUtil.toString(message));
			}
			setLimit(kind, value, inclusive, message) {
				return new ZodBigInt({
					...this._def,
					checks: [...this._def.checks, {
						kind,
						value,
						inclusive,
						message: errorUtil.toString(message)
					}]
				});
			}
			_addCheck(check) {
				return new ZodBigInt({
					...this._def,
					checks: [...this._def.checks, check]
				});
			}
			positive(message) {
				return this._addCheck({
					kind: "min",
					value: BigInt(0),
					inclusive: false,
					message: errorUtil.toString(message)
				});
			}
			negative(message) {
				return this._addCheck({
					kind: "max",
					value: BigInt(0),
					inclusive: false,
					message: errorUtil.toString(message)
				});
			}
			nonpositive(message) {
				return this._addCheck({
					kind: "max",
					value: BigInt(0),
					inclusive: true,
					message: errorUtil.toString(message)
				});
			}
			nonnegative(message) {
				return this._addCheck({
					kind: "min",
					value: BigInt(0),
					inclusive: true,
					message: errorUtil.toString(message)
				});
			}
			multipleOf(value, message) {
				return this._addCheck({
					kind: "multipleOf",
					value,
					message: errorUtil.toString(message)
				});
			}
			get minValue() {
				let min = null;
				for (const ch of this._def.checks) if (ch.kind === "min") {
					if (min === null || ch.value > min) min = ch.value;
				}
				return min;
			}
			get maxValue() {
				let max = null;
				for (const ch of this._def.checks) if (ch.kind === "max") {
					if (max === null || ch.value < max) max = ch.value;
				}
				return max;
			}
		};
		ZodBigInt.create = (params) => {
			return new ZodBigInt({
				checks: [],
				typeName: ZodFirstPartyTypeKind.ZodBigInt,
				coerce: params?.coerce ?? false,
				...processCreateParams(params)
			});
		};
		ZodBoolean = class extends ZodType {
			_parse(input) {
				if (this._def.coerce) input.data = Boolean(input.data);
				if (this._getType(input) !== ZodParsedType.boolean) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.boolean,
						received: ctx.parsedType
					});
					return INVALID;
				}
				return OK(input.data);
			}
		};
		ZodBoolean.create = (params) => {
			return new ZodBoolean({
				typeName: ZodFirstPartyTypeKind.ZodBoolean,
				coerce: params?.coerce || false,
				...processCreateParams(params)
			});
		};
		ZodDate = class ZodDate extends ZodType {
			_parse(input) {
				if (this._def.coerce) input.data = new Date(input.data);
				if (this._getType(input) !== ZodParsedType.date) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.date,
						received: ctx.parsedType
					});
					return INVALID;
				}
				if (Number.isNaN(input.data.getTime())) {
					addIssueToContext(this._getOrReturnCtx(input), { code: ZodIssueCode.invalid_date });
					return INVALID;
				}
				const status = new ParseStatus();
				let ctx = void 0;
				for (const check of this._def.checks) if (check.kind === "min") {
					if (input.data.getTime() < check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_small,
							message: check.message,
							inclusive: true,
							exact: false,
							minimum: check.value,
							type: "date"
						});
						status.dirty();
					}
				} else if (check.kind === "max") {
					if (input.data.getTime() > check.value) {
						ctx = this._getOrReturnCtx(input, ctx);
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_big,
							message: check.message,
							inclusive: true,
							exact: false,
							maximum: check.value,
							type: "date"
						});
						status.dirty();
					}
				} else util.assertNever(check);
				return {
					status: status.value,
					value: new Date(input.data.getTime())
				};
			}
			_addCheck(check) {
				return new ZodDate({
					...this._def,
					checks: [...this._def.checks, check]
				});
			}
			min(minDate, message) {
				return this._addCheck({
					kind: "min",
					value: minDate.getTime(),
					message: errorUtil.toString(message)
				});
			}
			max(maxDate, message) {
				return this._addCheck({
					kind: "max",
					value: maxDate.getTime(),
					message: errorUtil.toString(message)
				});
			}
			get minDate() {
				let min = null;
				for (const ch of this._def.checks) if (ch.kind === "min") {
					if (min === null || ch.value > min) min = ch.value;
				}
				return min != null ? new Date(min) : null;
			}
			get maxDate() {
				let max = null;
				for (const ch of this._def.checks) if (ch.kind === "max") {
					if (max === null || ch.value < max) max = ch.value;
				}
				return max != null ? new Date(max) : null;
			}
		};
		ZodDate.create = (params) => {
			return new ZodDate({
				checks: [],
				coerce: params?.coerce || false,
				typeName: ZodFirstPartyTypeKind.ZodDate,
				...processCreateParams(params)
			});
		};
		ZodSymbol = class extends ZodType {
			_parse(input) {
				if (this._getType(input) !== ZodParsedType.symbol) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.symbol,
						received: ctx.parsedType
					});
					return INVALID;
				}
				return OK(input.data);
			}
		};
		ZodSymbol.create = (params) => {
			return new ZodSymbol({
				typeName: ZodFirstPartyTypeKind.ZodSymbol,
				...processCreateParams(params)
			});
		};
		ZodUndefined = class extends ZodType {
			_parse(input) {
				if (this._getType(input) !== ZodParsedType.undefined) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.undefined,
						received: ctx.parsedType
					});
					return INVALID;
				}
				return OK(input.data);
			}
		};
		ZodUndefined.create = (params) => {
			return new ZodUndefined({
				typeName: ZodFirstPartyTypeKind.ZodUndefined,
				...processCreateParams(params)
			});
		};
		ZodNull = class extends ZodType {
			_parse(input) {
				if (this._getType(input) !== ZodParsedType.null) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.null,
						received: ctx.parsedType
					});
					return INVALID;
				}
				return OK(input.data);
			}
		};
		ZodNull.create = (params) => {
			return new ZodNull({
				typeName: ZodFirstPartyTypeKind.ZodNull,
				...processCreateParams(params)
			});
		};
		ZodAny = class extends ZodType {
			constructor() {
				super(...arguments);
				this._any = true;
			}
			_parse(input) {
				return OK(input.data);
			}
		};
		ZodAny.create = (params) => {
			return new ZodAny({
				typeName: ZodFirstPartyTypeKind.ZodAny,
				...processCreateParams(params)
			});
		};
		ZodUnknown = class extends ZodType {
			constructor() {
				super(...arguments);
				this._unknown = true;
			}
			_parse(input) {
				return OK(input.data);
			}
		};
		ZodUnknown.create = (params) => {
			return new ZodUnknown({
				typeName: ZodFirstPartyTypeKind.ZodUnknown,
				...processCreateParams(params)
			});
		};
		ZodNever = class extends ZodType {
			_parse(input) {
				const ctx = this._getOrReturnCtx(input);
				addIssueToContext(ctx, {
					code: ZodIssueCode.invalid_type,
					expected: ZodParsedType.never,
					received: ctx.parsedType
				});
				return INVALID;
			}
		};
		ZodNever.create = (params) => {
			return new ZodNever({
				typeName: ZodFirstPartyTypeKind.ZodNever,
				...processCreateParams(params)
			});
		};
		ZodVoid = class extends ZodType {
			_parse(input) {
				if (this._getType(input) !== ZodParsedType.undefined) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.void,
						received: ctx.parsedType
					});
					return INVALID;
				}
				return OK(input.data);
			}
		};
		ZodVoid.create = (params) => {
			return new ZodVoid({
				typeName: ZodFirstPartyTypeKind.ZodVoid,
				...processCreateParams(params)
			});
		};
		ZodArray = class ZodArray extends ZodType {
			_parse(input) {
				const { ctx, status } = this._processInputParams(input);
				const def = this._def;
				if (ctx.parsedType !== ZodParsedType.array) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.array,
						received: ctx.parsedType
					});
					return INVALID;
				}
				if (def.exactLength !== null) {
					const tooBig = ctx.data.length > def.exactLength.value;
					const tooSmall = ctx.data.length < def.exactLength.value;
					if (tooBig || tooSmall) {
						addIssueToContext(ctx, {
							code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
							minimum: tooSmall ? def.exactLength.value : void 0,
							maximum: tooBig ? def.exactLength.value : void 0,
							type: "array",
							inclusive: true,
							exact: true,
							message: def.exactLength.message
						});
						status.dirty();
					}
				}
				if (def.minLength !== null) {
					if (ctx.data.length < def.minLength.value) {
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_small,
							minimum: def.minLength.value,
							type: "array",
							inclusive: true,
							exact: false,
							message: def.minLength.message
						});
						status.dirty();
					}
				}
				if (def.maxLength !== null) {
					if (ctx.data.length > def.maxLength.value) {
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_big,
							maximum: def.maxLength.value,
							type: "array",
							inclusive: true,
							exact: false,
							message: def.maxLength.message
						});
						status.dirty();
					}
				}
				if (ctx.common.async) return Promise.all([...ctx.data].map((item, i) => {
					return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
				})).then((result) => {
					return ParseStatus.mergeArray(status, result);
				});
				const result = [...ctx.data].map((item, i) => {
					return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
				});
				return ParseStatus.mergeArray(status, result);
			}
			get element() {
				return this._def.type;
			}
			min(minLength, message) {
				return new ZodArray({
					...this._def,
					minLength: {
						value: minLength,
						message: errorUtil.toString(message)
					}
				});
			}
			max(maxLength, message) {
				return new ZodArray({
					...this._def,
					maxLength: {
						value: maxLength,
						message: errorUtil.toString(message)
					}
				});
			}
			length(len, message) {
				return new ZodArray({
					...this._def,
					exactLength: {
						value: len,
						message: errorUtil.toString(message)
					}
				});
			}
			nonempty(message) {
				return this.min(1, message);
			}
		};
		ZodArray.create = (schema, params) => {
			return new ZodArray({
				type: schema,
				minLength: null,
				maxLength: null,
				exactLength: null,
				typeName: ZodFirstPartyTypeKind.ZodArray,
				...processCreateParams(params)
			});
		};
		ZodObject = class ZodObject extends ZodType {
			constructor() {
				super(...arguments);
				this._cached = null;
				/**
				* @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
				* If you want to pass through unknown properties, use `.passthrough()` instead.
				*/
				this.nonstrict = this.passthrough;
				/**
				* @deprecated Use `.extend` instead
				*  */
				this.augment = this.extend;
			}
			_getCached() {
				if (this._cached !== null) return this._cached;
				const shape = this._def.shape();
				const keys = util.objectKeys(shape);
				this._cached = {
					shape,
					keys
				};
				return this._cached;
			}
			_parse(input) {
				if (this._getType(input) !== ZodParsedType.object) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.object,
						received: ctx.parsedType
					});
					return INVALID;
				}
				const { status, ctx } = this._processInputParams(input);
				const { shape, keys: shapeKeys } = this._getCached();
				const extraKeys = [];
				if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
					for (const key in ctx.data) if (!shapeKeys.includes(key)) extraKeys.push(key);
				}
				const pairs = [];
				for (const key of shapeKeys) {
					const keyValidator = shape[key];
					const value = ctx.data[key];
					pairs.push({
						key: {
							status: "valid",
							value: key
						},
						value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
						alwaysSet: key in ctx.data
					});
				}
				if (this._def.catchall instanceof ZodNever) {
					const unknownKeys = this._def.unknownKeys;
					if (unknownKeys === "passthrough") for (const key of extraKeys) pairs.push({
						key: {
							status: "valid",
							value: key
						},
						value: {
							status: "valid",
							value: ctx.data[key]
						}
					});
					else if (unknownKeys === "strict") {
						if (extraKeys.length > 0) {
							addIssueToContext(ctx, {
								code: ZodIssueCode.unrecognized_keys,
								keys: extraKeys
							});
							status.dirty();
						}
					} else if (unknownKeys === "strip") {} else throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
				} else {
					const catchall = this._def.catchall;
					for (const key of extraKeys) {
						const value = ctx.data[key];
						pairs.push({
							key: {
								status: "valid",
								value: key
							},
							value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
							alwaysSet: key in ctx.data
						});
					}
				}
				if (ctx.common.async) return Promise.resolve().then(async () => {
					const syncPairs = [];
					for (const pair of pairs) {
						const key = await pair.key;
						const value = await pair.value;
						syncPairs.push({
							key,
							value,
							alwaysSet: pair.alwaysSet
						});
					}
					return syncPairs;
				}).then((syncPairs) => {
					return ParseStatus.mergeObjectSync(status, syncPairs);
				});
				else return ParseStatus.mergeObjectSync(status, pairs);
			}
			get shape() {
				return this._def.shape();
			}
			strict(message) {
				errorUtil.errToObj;
				return new ZodObject({
					...this._def,
					unknownKeys: "strict",
					...message !== void 0 ? { errorMap: (issue, ctx) => {
						const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
						if (issue.code === "unrecognized_keys") return { message: errorUtil.errToObj(message).message ?? defaultError };
						return { message: defaultError };
					} } : {}
				});
			}
			strip() {
				return new ZodObject({
					...this._def,
					unknownKeys: "strip"
				});
			}
			passthrough() {
				return new ZodObject({
					...this._def,
					unknownKeys: "passthrough"
				});
			}
			extend(augmentation) {
				return new ZodObject({
					...this._def,
					shape: () => ({
						...this._def.shape(),
						...augmentation
					})
				});
			}
			/**
			* Prior to zod@1.0.12 there was a bug in the
			* inferred type of merged objects. Please
			* upgrade if you are experiencing issues.
			*/
			merge(merging) {
				return new ZodObject({
					unknownKeys: merging._def.unknownKeys,
					catchall: merging._def.catchall,
					shape: () => ({
						...this._def.shape(),
						...merging._def.shape()
					}),
					typeName: ZodFirstPartyTypeKind.ZodObject
				});
			}
			setKey(key, schema) {
				return this.augment({ [key]: schema });
			}
			catchall(index) {
				return new ZodObject({
					...this._def,
					catchall: index
				});
			}
			pick(mask) {
				const shape = {};
				for (const key of util.objectKeys(mask)) if (mask[key] && this.shape[key]) shape[key] = this.shape[key];
				return new ZodObject({
					...this._def,
					shape: () => shape
				});
			}
			omit(mask) {
				const shape = {};
				for (const key of util.objectKeys(this.shape)) if (!mask[key]) shape[key] = this.shape[key];
				return new ZodObject({
					...this._def,
					shape: () => shape
				});
			}
			/**
			* @deprecated
			*/
			deepPartial() {
				return deepPartialify(this);
			}
			partial(mask) {
				const newShape = {};
				for (const key of util.objectKeys(this.shape)) {
					const fieldSchema = this.shape[key];
					if (mask && !mask[key]) newShape[key] = fieldSchema;
					else newShape[key] = fieldSchema.optional();
				}
				return new ZodObject({
					...this._def,
					shape: () => newShape
				});
			}
			required(mask) {
				const newShape = {};
				for (const key of util.objectKeys(this.shape)) if (mask && !mask[key]) newShape[key] = this.shape[key];
				else {
					let newField = this.shape[key];
					while (newField instanceof ZodOptional) newField = newField._def.innerType;
					newShape[key] = newField;
				}
				return new ZodObject({
					...this._def,
					shape: () => newShape
				});
			}
			keyof() {
				return createZodEnum(util.objectKeys(this.shape));
			}
		};
		ZodObject.create = (shape, params) => {
			return new ZodObject({
				shape: () => shape,
				unknownKeys: "strip",
				catchall: ZodNever.create(),
				typeName: ZodFirstPartyTypeKind.ZodObject,
				...processCreateParams(params)
			});
		};
		ZodObject.strictCreate = (shape, params) => {
			return new ZodObject({
				shape: () => shape,
				unknownKeys: "strict",
				catchall: ZodNever.create(),
				typeName: ZodFirstPartyTypeKind.ZodObject,
				...processCreateParams(params)
			});
		};
		ZodObject.lazycreate = (shape, params) => {
			return new ZodObject({
				shape,
				unknownKeys: "strip",
				catchall: ZodNever.create(),
				typeName: ZodFirstPartyTypeKind.ZodObject,
				...processCreateParams(params)
			});
		};
		ZodUnion = class extends ZodType {
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				const options = this._def.options;
				function handleResults(results) {
					for (const result of results) if (result.result.status === "valid") return result.result;
					for (const result of results) if (result.result.status === "dirty") {
						ctx.common.issues.push(...result.ctx.common.issues);
						return result.result;
					}
					const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_union,
						unionErrors
					});
					return INVALID;
				}
				if (ctx.common.async) return Promise.all(options.map(async (option) => {
					const childCtx = {
						...ctx,
						common: {
							...ctx.common,
							issues: []
						},
						parent: null
					};
					return {
						result: await option._parseAsync({
							data: ctx.data,
							path: ctx.path,
							parent: childCtx
						}),
						ctx: childCtx
					};
				})).then(handleResults);
				else {
					let dirty = void 0;
					const issues = [];
					for (const option of options) {
						const childCtx = {
							...ctx,
							common: {
								...ctx.common,
								issues: []
							},
							parent: null
						};
						const result = option._parseSync({
							data: ctx.data,
							path: ctx.path,
							parent: childCtx
						});
						if (result.status === "valid") return result;
						else if (result.status === "dirty" && !dirty) dirty = {
							result,
							ctx: childCtx
						};
						if (childCtx.common.issues.length) issues.push(childCtx.common.issues);
					}
					if (dirty) {
						ctx.common.issues.push(...dirty.ctx.common.issues);
						return dirty.result;
					}
					const unionErrors = issues.map((issues) => new ZodError(issues));
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_union,
						unionErrors
					});
					return INVALID;
				}
			}
			get options() {
				return this._def.options;
			}
		};
		ZodUnion.create = (types, params) => {
			return new ZodUnion({
				options: types,
				typeName: ZodFirstPartyTypeKind.ZodUnion,
				...processCreateParams(params)
			});
		};
		getDiscriminator = (type) => {
			if (type instanceof ZodLazy) return getDiscriminator(type.schema);
			else if (type instanceof ZodEffects) return getDiscriminator(type.innerType());
			else if (type instanceof ZodLiteral) return [type.value];
			else if (type instanceof ZodEnum) return type.options;
			else if (type instanceof ZodNativeEnum) return util.objectValues(type.enum);
			else if (type instanceof ZodDefault) return getDiscriminator(type._def.innerType);
			else if (type instanceof ZodUndefined) return [void 0];
			else if (type instanceof ZodNull) return [null];
			else if (type instanceof ZodOptional) return [void 0, ...getDiscriminator(type.unwrap())];
			else if (type instanceof ZodNullable) return [null, ...getDiscriminator(type.unwrap())];
			else if (type instanceof ZodBranded) return getDiscriminator(type.unwrap());
			else if (type instanceof ZodReadonly) return getDiscriminator(type.unwrap());
			else if (type instanceof ZodCatch) return getDiscriminator(type._def.innerType);
			else return [];
		};
		ZodDiscriminatedUnion = class ZodDiscriminatedUnion extends ZodType {
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				if (ctx.parsedType !== ZodParsedType.object) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.object,
						received: ctx.parsedType
					});
					return INVALID;
				}
				const discriminator = this.discriminator;
				const discriminatorValue = ctx.data[discriminator];
				const option = this.optionsMap.get(discriminatorValue);
				if (!option) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_union_discriminator,
						options: Array.from(this.optionsMap.keys()),
						path: [discriminator]
					});
					return INVALID;
				}
				if (ctx.common.async) return option._parseAsync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				});
				else return option._parseSync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				});
			}
			get discriminator() {
				return this._def.discriminator;
			}
			get options() {
				return this._def.options;
			}
			get optionsMap() {
				return this._def.optionsMap;
			}
			/**
			* The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
			* However, it only allows a union of objects, all of which need to share a discriminator property. This property must
			* have a different value for each object in the union.
			* @param discriminator the name of the discriminator property
			* @param types an array of object schemas
			* @param params
			*/
			static create(discriminator, options, params) {
				const optionsMap = /* @__PURE__ */ new Map();
				for (const type of options) {
					const discriminatorValues = getDiscriminator(type.shape[discriminator]);
					if (!discriminatorValues.length) throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
					for (const value of discriminatorValues) {
						if (optionsMap.has(value)) throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
						optionsMap.set(value, type);
					}
				}
				return new ZodDiscriminatedUnion({
					typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
					discriminator,
					options,
					optionsMap,
					...processCreateParams(params)
				});
			}
		};
		ZodIntersection = class extends ZodType {
			_parse(input) {
				const { status, ctx } = this._processInputParams(input);
				const handleParsed = (parsedLeft, parsedRight) => {
					if (isAborted(parsedLeft) || isAborted(parsedRight)) return INVALID;
					const merged = mergeValues(parsedLeft.value, parsedRight.value);
					if (!merged.valid) {
						addIssueToContext(ctx, { code: ZodIssueCode.invalid_intersection_types });
						return INVALID;
					}
					if (isDirty(parsedLeft) || isDirty(parsedRight)) status.dirty();
					return {
						status: status.value,
						value: merged.data
					};
				};
				if (ctx.common.async) return Promise.all([this._def.left._parseAsync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				}), this._def.right._parseAsync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				})]).then(([left, right]) => handleParsed(left, right));
				else return handleParsed(this._def.left._parseSync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				}), this._def.right._parseSync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				}));
			}
		};
		ZodIntersection.create = (left, right, params) => {
			return new ZodIntersection({
				left,
				right,
				typeName: ZodFirstPartyTypeKind.ZodIntersection,
				...processCreateParams(params)
			});
		};
		ZodTuple = class ZodTuple extends ZodType {
			_parse(input) {
				const { status, ctx } = this._processInputParams(input);
				if (ctx.parsedType !== ZodParsedType.array) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.array,
						received: ctx.parsedType
					});
					return INVALID;
				}
				if (ctx.data.length < this._def.items.length) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_small,
						minimum: this._def.items.length,
						inclusive: true,
						exact: false,
						type: "array"
					});
					return INVALID;
				}
				if (!this._def.rest && ctx.data.length > this._def.items.length) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.too_big,
						maximum: this._def.items.length,
						inclusive: true,
						exact: false,
						type: "array"
					});
					status.dirty();
				}
				const items = [...ctx.data].map((item, itemIndex) => {
					const schema = this._def.items[itemIndex] || this._def.rest;
					if (!schema) return null;
					return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
				}).filter((x) => !!x);
				if (ctx.common.async) return Promise.all(items).then((results) => {
					return ParseStatus.mergeArray(status, results);
				});
				else return ParseStatus.mergeArray(status, items);
			}
			get items() {
				return this._def.items;
			}
			rest(rest) {
				return new ZodTuple({
					...this._def,
					rest
				});
			}
		};
		ZodTuple.create = (schemas, params) => {
			if (!Array.isArray(schemas)) throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
			return new ZodTuple({
				items: schemas,
				typeName: ZodFirstPartyTypeKind.ZodTuple,
				rest: null,
				...processCreateParams(params)
			});
		};
		ZodRecord = class ZodRecord extends ZodType {
			get keySchema() {
				return this._def.keyType;
			}
			get valueSchema() {
				return this._def.valueType;
			}
			_parse(input) {
				const { status, ctx } = this._processInputParams(input);
				if (ctx.parsedType !== ZodParsedType.object) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.object,
						received: ctx.parsedType
					});
					return INVALID;
				}
				const pairs = [];
				const keyType = this._def.keyType;
				const valueType = this._def.valueType;
				for (const key in ctx.data) pairs.push({
					key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
					value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
					alwaysSet: key in ctx.data
				});
				if (ctx.common.async) return ParseStatus.mergeObjectAsync(status, pairs);
				else return ParseStatus.mergeObjectSync(status, pairs);
			}
			get element() {
				return this._def.valueType;
			}
			static create(first, second, third) {
				if (second instanceof ZodType) return new ZodRecord({
					keyType: first,
					valueType: second,
					typeName: ZodFirstPartyTypeKind.ZodRecord,
					...processCreateParams(third)
				});
				return new ZodRecord({
					keyType: ZodString.create(),
					valueType: first,
					typeName: ZodFirstPartyTypeKind.ZodRecord,
					...processCreateParams(second)
				});
			}
		};
		ZodMap = class extends ZodType {
			get keySchema() {
				return this._def.keyType;
			}
			get valueSchema() {
				return this._def.valueType;
			}
			_parse(input) {
				const { status, ctx } = this._processInputParams(input);
				if (ctx.parsedType !== ZodParsedType.map) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.map,
						received: ctx.parsedType
					});
					return INVALID;
				}
				const keyType = this._def.keyType;
				const valueType = this._def.valueType;
				const pairs = [...ctx.data.entries()].map(([key, value], index) => {
					return {
						key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
						value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
					};
				});
				if (ctx.common.async) {
					const finalMap = /* @__PURE__ */ new Map();
					return Promise.resolve().then(async () => {
						for (const pair of pairs) {
							const key = await pair.key;
							const value = await pair.value;
							if (key.status === "aborted" || value.status === "aborted") return INVALID;
							if (key.status === "dirty" || value.status === "dirty") status.dirty();
							finalMap.set(key.value, value.value);
						}
						return {
							status: status.value,
							value: finalMap
						};
					});
				} else {
					const finalMap = /* @__PURE__ */ new Map();
					for (const pair of pairs) {
						const key = pair.key;
						const value = pair.value;
						if (key.status === "aborted" || value.status === "aborted") return INVALID;
						if (key.status === "dirty" || value.status === "dirty") status.dirty();
						finalMap.set(key.value, value.value);
					}
					return {
						status: status.value,
						value: finalMap
					};
				}
			}
		};
		ZodMap.create = (keyType, valueType, params) => {
			return new ZodMap({
				valueType,
				keyType,
				typeName: ZodFirstPartyTypeKind.ZodMap,
				...processCreateParams(params)
			});
		};
		ZodSet = class ZodSet extends ZodType {
			_parse(input) {
				const { status, ctx } = this._processInputParams(input);
				if (ctx.parsedType !== ZodParsedType.set) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.set,
						received: ctx.parsedType
					});
					return INVALID;
				}
				const def = this._def;
				if (def.minSize !== null) {
					if (ctx.data.size < def.minSize.value) {
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_small,
							minimum: def.minSize.value,
							type: "set",
							inclusive: true,
							exact: false,
							message: def.minSize.message
						});
						status.dirty();
					}
				}
				if (def.maxSize !== null) {
					if (ctx.data.size > def.maxSize.value) {
						addIssueToContext(ctx, {
							code: ZodIssueCode.too_big,
							maximum: def.maxSize.value,
							type: "set",
							inclusive: true,
							exact: false,
							message: def.maxSize.message
						});
						status.dirty();
					}
				}
				const valueType = this._def.valueType;
				function finalizeSet(elements) {
					const parsedSet = /* @__PURE__ */ new Set();
					for (const element of elements) {
						if (element.status === "aborted") return INVALID;
						if (element.status === "dirty") status.dirty();
						parsedSet.add(element.value);
					}
					return {
						status: status.value,
						value: parsedSet
					};
				}
				const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
				if (ctx.common.async) return Promise.all(elements).then((elements) => finalizeSet(elements));
				else return finalizeSet(elements);
			}
			min(minSize, message) {
				return new ZodSet({
					...this._def,
					minSize: {
						value: minSize,
						message: errorUtil.toString(message)
					}
				});
			}
			max(maxSize, message) {
				return new ZodSet({
					...this._def,
					maxSize: {
						value: maxSize,
						message: errorUtil.toString(message)
					}
				});
			}
			size(size, message) {
				return this.min(size, message).max(size, message);
			}
			nonempty(message) {
				return this.min(1, message);
			}
		};
		ZodSet.create = (valueType, params) => {
			return new ZodSet({
				valueType,
				minSize: null,
				maxSize: null,
				typeName: ZodFirstPartyTypeKind.ZodSet,
				...processCreateParams(params)
			});
		};
		ZodFunction = class ZodFunction extends ZodType {
			constructor() {
				super(...arguments);
				this.validate = this.implement;
			}
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				if (ctx.parsedType !== ZodParsedType.function) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.function,
						received: ctx.parsedType
					});
					return INVALID;
				}
				function makeArgsIssue(args, error) {
					return makeIssue({
						data: args,
						path: ctx.path,
						errorMaps: [
							ctx.common.contextualErrorMap,
							ctx.schemaErrorMap,
							getErrorMap(),
							errorMap
						].filter((x) => !!x),
						issueData: {
							code: ZodIssueCode.invalid_arguments,
							argumentsError: error
						}
					});
				}
				function makeReturnsIssue(returns, error) {
					return makeIssue({
						data: returns,
						path: ctx.path,
						errorMaps: [
							ctx.common.contextualErrorMap,
							ctx.schemaErrorMap,
							getErrorMap(),
							errorMap
						].filter((x) => !!x),
						issueData: {
							code: ZodIssueCode.invalid_return_type,
							returnTypeError: error
						}
					});
				}
				const params = { errorMap: ctx.common.contextualErrorMap };
				const fn = ctx.data;
				if (this._def.returns instanceof ZodPromise) {
					const me = this;
					return OK(async function(...args) {
						const error = new ZodError([]);
						const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
							error.addIssue(makeArgsIssue(args, e));
							throw error;
						});
						const result = await Reflect.apply(fn, this, parsedArgs);
						return await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
							error.addIssue(makeReturnsIssue(result, e));
							throw error;
						});
					});
				} else {
					const me = this;
					return OK(function(...args) {
						const parsedArgs = me._def.args.safeParse(args, params);
						if (!parsedArgs.success) throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
						const result = Reflect.apply(fn, this, parsedArgs.data);
						const parsedReturns = me._def.returns.safeParse(result, params);
						if (!parsedReturns.success) throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
						return parsedReturns.data;
					});
				}
			}
			parameters() {
				return this._def.args;
			}
			returnType() {
				return this._def.returns;
			}
			args(...items) {
				return new ZodFunction({
					...this._def,
					args: ZodTuple.create(items).rest(ZodUnknown.create())
				});
			}
			returns(returnType) {
				return new ZodFunction({
					...this._def,
					returns: returnType
				});
			}
			implement(func) {
				return this.parse(func);
			}
			strictImplement(func) {
				return this.parse(func);
			}
			static create(args, returns, params) {
				return new ZodFunction({
					args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
					returns: returns || ZodUnknown.create(),
					typeName: ZodFirstPartyTypeKind.ZodFunction,
					...processCreateParams(params)
				});
			}
		};
		ZodLazy = class extends ZodType {
			get schema() {
				return this._def.getter();
			}
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				return this._def.getter()._parse({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				});
			}
		};
		ZodLazy.create = (getter, params) => {
			return new ZodLazy({
				getter,
				typeName: ZodFirstPartyTypeKind.ZodLazy,
				...processCreateParams(params)
			});
		};
		ZodLiteral = class extends ZodType {
			_parse(input) {
				if (input.data !== this._def.value) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						received: ctx.data,
						code: ZodIssueCode.invalid_literal,
						expected: this._def.value
					});
					return INVALID;
				}
				return {
					status: "valid",
					value: input.data
				};
			}
			get value() {
				return this._def.value;
			}
		};
		ZodLiteral.create = (value, params) => {
			return new ZodLiteral({
				value,
				typeName: ZodFirstPartyTypeKind.ZodLiteral,
				...processCreateParams(params)
			});
		};
		ZodEnum = class ZodEnum extends ZodType {
			_parse(input) {
				if (typeof input.data !== "string") {
					const ctx = this._getOrReturnCtx(input);
					const expectedValues = this._def.values;
					addIssueToContext(ctx, {
						expected: util.joinValues(expectedValues),
						received: ctx.parsedType,
						code: ZodIssueCode.invalid_type
					});
					return INVALID;
				}
				if (!this._cache) this._cache = new Set(this._def.values);
				if (!this._cache.has(input.data)) {
					const ctx = this._getOrReturnCtx(input);
					const expectedValues = this._def.values;
					addIssueToContext(ctx, {
						received: ctx.data,
						code: ZodIssueCode.invalid_enum_value,
						options: expectedValues
					});
					return INVALID;
				}
				return OK(input.data);
			}
			get options() {
				return this._def.values;
			}
			get enum() {
				const enumValues = {};
				for (const val of this._def.values) enumValues[val] = val;
				return enumValues;
			}
			get Values() {
				const enumValues = {};
				for (const val of this._def.values) enumValues[val] = val;
				return enumValues;
			}
			get Enum() {
				const enumValues = {};
				for (const val of this._def.values) enumValues[val] = val;
				return enumValues;
			}
			extract(values, newDef = this._def) {
				return ZodEnum.create(values, {
					...this._def,
					...newDef
				});
			}
			exclude(values, newDef = this._def) {
				return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
					...this._def,
					...newDef
				});
			}
		};
		ZodEnum.create = createZodEnum;
		ZodNativeEnum = class extends ZodType {
			_parse(input) {
				const nativeEnumValues = util.getValidEnumValues(this._def.values);
				const ctx = this._getOrReturnCtx(input);
				if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
					const expectedValues = util.objectValues(nativeEnumValues);
					addIssueToContext(ctx, {
						expected: util.joinValues(expectedValues),
						received: ctx.parsedType,
						code: ZodIssueCode.invalid_type
					});
					return INVALID;
				}
				if (!this._cache) this._cache = new Set(util.getValidEnumValues(this._def.values));
				if (!this._cache.has(input.data)) {
					const expectedValues = util.objectValues(nativeEnumValues);
					addIssueToContext(ctx, {
						received: ctx.data,
						code: ZodIssueCode.invalid_enum_value,
						options: expectedValues
					});
					return INVALID;
				}
				return OK(input.data);
			}
			get enum() {
				return this._def.values;
			}
		};
		ZodNativeEnum.create = (values, params) => {
			return new ZodNativeEnum({
				values,
				typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
				...processCreateParams(params)
			});
		};
		ZodPromise = class extends ZodType {
			unwrap() {
				return this._def.type;
			}
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.promise,
						received: ctx.parsedType
					});
					return INVALID;
				}
				return OK((ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data)).then((data) => {
					return this._def.type.parseAsync(data, {
						path: ctx.path,
						errorMap: ctx.common.contextualErrorMap
					});
				}));
			}
		};
		ZodPromise.create = (schema, params) => {
			return new ZodPromise({
				type: schema,
				typeName: ZodFirstPartyTypeKind.ZodPromise,
				...processCreateParams(params)
			});
		};
		ZodEffects = class extends ZodType {
			innerType() {
				return this._def.schema;
			}
			sourceType() {
				return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
			}
			_parse(input) {
				const { status, ctx } = this._processInputParams(input);
				const effect = this._def.effect || null;
				const checkCtx = {
					addIssue: (arg) => {
						addIssueToContext(ctx, arg);
						if (arg.fatal) status.abort();
						else status.dirty();
					},
					get path() {
						return ctx.path;
					}
				};
				checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
				if (effect.type === "preprocess") {
					const processed = effect.transform(ctx.data, checkCtx);
					if (ctx.common.async) return Promise.resolve(processed).then(async (processed) => {
						if (status.value === "aborted") return INVALID;
						const result = await this._def.schema._parseAsync({
							data: processed,
							path: ctx.path,
							parent: ctx
						});
						if (result.status === "aborted") return INVALID;
						if (result.status === "dirty") return DIRTY(result.value);
						if (status.value === "dirty") return DIRTY(result.value);
						return result;
					});
					else {
						if (status.value === "aborted") return INVALID;
						const result = this._def.schema._parseSync({
							data: processed,
							path: ctx.path,
							parent: ctx
						});
						if (result.status === "aborted") return INVALID;
						if (result.status === "dirty") return DIRTY(result.value);
						if (status.value === "dirty") return DIRTY(result.value);
						return result;
					}
				}
				if (effect.type === "refinement") {
					const executeRefinement = (acc) => {
						const result = effect.refinement(acc, checkCtx);
						if (ctx.common.async) return Promise.resolve(result);
						if (result instanceof Promise) throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
						return acc;
					};
					if (ctx.common.async === false) {
						const inner = this._def.schema._parseSync({
							data: ctx.data,
							path: ctx.path,
							parent: ctx
						});
						if (inner.status === "aborted") return INVALID;
						if (inner.status === "dirty") status.dirty();
						executeRefinement(inner.value);
						return {
							status: status.value,
							value: inner.value
						};
					} else return this._def.schema._parseAsync({
						data: ctx.data,
						path: ctx.path,
						parent: ctx
					}).then((inner) => {
						if (inner.status === "aborted") return INVALID;
						if (inner.status === "dirty") status.dirty();
						return executeRefinement(inner.value).then(() => {
							return {
								status: status.value,
								value: inner.value
							};
						});
					});
				}
				if (effect.type === "transform") if (ctx.common.async === false) {
					const base = this._def.schema._parseSync({
						data: ctx.data,
						path: ctx.path,
						parent: ctx
					});
					if (!isValid(base)) return INVALID;
					const result = effect.transform(base.value, checkCtx);
					if (result instanceof Promise) throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
					return {
						status: status.value,
						value: result
					};
				} else return this._def.schema._parseAsync({
					data: ctx.data,
					path: ctx.path,
					parent: ctx
				}).then((base) => {
					if (!isValid(base)) return INVALID;
					return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
						status: status.value,
						value: result
					}));
				});
				util.assertNever(effect);
			}
		};
		ZodEffects.create = (schema, effect, params) => {
			return new ZodEffects({
				schema,
				typeName: ZodFirstPartyTypeKind.ZodEffects,
				effect,
				...processCreateParams(params)
			});
		};
		ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
			return new ZodEffects({
				schema,
				effect: {
					type: "preprocess",
					transform: preprocess
				},
				typeName: ZodFirstPartyTypeKind.ZodEffects,
				...processCreateParams(params)
			});
		};
		ZodOptional = class extends ZodType {
			_parse(input) {
				if (this._getType(input) === ZodParsedType.undefined) return OK(void 0);
				return this._def.innerType._parse(input);
			}
			unwrap() {
				return this._def.innerType;
			}
		};
		ZodOptional.create = (type, params) => {
			return new ZodOptional({
				innerType: type,
				typeName: ZodFirstPartyTypeKind.ZodOptional,
				...processCreateParams(params)
			});
		};
		ZodNullable = class extends ZodType {
			_parse(input) {
				if (this._getType(input) === ZodParsedType.null) return OK(null);
				return this._def.innerType._parse(input);
			}
			unwrap() {
				return this._def.innerType;
			}
		};
		ZodNullable.create = (type, params) => {
			return new ZodNullable({
				innerType: type,
				typeName: ZodFirstPartyTypeKind.ZodNullable,
				...processCreateParams(params)
			});
		};
		ZodDefault = class extends ZodType {
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				let data = ctx.data;
				if (ctx.parsedType === ZodParsedType.undefined) data = this._def.defaultValue();
				return this._def.innerType._parse({
					data,
					path: ctx.path,
					parent: ctx
				});
			}
			removeDefault() {
				return this._def.innerType;
			}
		};
		ZodDefault.create = (type, params) => {
			return new ZodDefault({
				innerType: type,
				typeName: ZodFirstPartyTypeKind.ZodDefault,
				defaultValue: typeof params.default === "function" ? params.default : () => params.default,
				...processCreateParams(params)
			});
		};
		ZodCatch = class extends ZodType {
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				const newCtx = {
					...ctx,
					common: {
						...ctx.common,
						issues: []
					}
				};
				const result = this._def.innerType._parse({
					data: newCtx.data,
					path: newCtx.path,
					parent: { ...newCtx }
				});
				if (isAsync(result)) return result.then((result) => {
					return {
						status: "valid",
						value: result.status === "valid" ? result.value : this._def.catchValue({
							get error() {
								return new ZodError(newCtx.common.issues);
							},
							input: newCtx.data
						})
					};
				});
				else return {
					status: "valid",
					value: result.status === "valid" ? result.value : this._def.catchValue({
						get error() {
							return new ZodError(newCtx.common.issues);
						},
						input: newCtx.data
					})
				};
			}
			removeCatch() {
				return this._def.innerType;
			}
		};
		ZodCatch.create = (type, params) => {
			return new ZodCatch({
				innerType: type,
				typeName: ZodFirstPartyTypeKind.ZodCatch,
				catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
				...processCreateParams(params)
			});
		};
		ZodNaN = class extends ZodType {
			_parse(input) {
				if (this._getType(input) !== ZodParsedType.nan) {
					const ctx = this._getOrReturnCtx(input);
					addIssueToContext(ctx, {
						code: ZodIssueCode.invalid_type,
						expected: ZodParsedType.nan,
						received: ctx.parsedType
					});
					return INVALID;
				}
				return {
					status: "valid",
					value: input.data
				};
			}
		};
		ZodNaN.create = (params) => {
			return new ZodNaN({
				typeName: ZodFirstPartyTypeKind.ZodNaN,
				...processCreateParams(params)
			});
		};
		ZodBranded = class extends ZodType {
			_parse(input) {
				const { ctx } = this._processInputParams(input);
				const data = ctx.data;
				return this._def.type._parse({
					data,
					path: ctx.path,
					parent: ctx
				});
			}
			unwrap() {
				return this._def.type;
			}
		};
		ZodPipeline = class ZodPipeline extends ZodType {
			_parse(input) {
				const { status, ctx } = this._processInputParams(input);
				if (ctx.common.async) {
					const handleAsync = async () => {
						const inResult = await this._def.in._parseAsync({
							data: ctx.data,
							path: ctx.path,
							parent: ctx
						});
						if (inResult.status === "aborted") return INVALID;
						if (inResult.status === "dirty") {
							status.dirty();
							return DIRTY(inResult.value);
						} else return this._def.out._parseAsync({
							data: inResult.value,
							path: ctx.path,
							parent: ctx
						});
					};
					return handleAsync();
				} else {
					const inResult = this._def.in._parseSync({
						data: ctx.data,
						path: ctx.path,
						parent: ctx
					});
					if (inResult.status === "aborted") return INVALID;
					if (inResult.status === "dirty") {
						status.dirty();
						return {
							status: "dirty",
							value: inResult.value
						};
					} else return this._def.out._parseSync({
						data: inResult.value,
						path: ctx.path,
						parent: ctx
					});
				}
			}
			static create(a, b) {
				return new ZodPipeline({
					in: a,
					out: b,
					typeName: ZodFirstPartyTypeKind.ZodPipeline
				});
			}
		};
		ZodReadonly = class extends ZodType {
			_parse(input) {
				const result = this._def.innerType._parse(input);
				const freeze = (data) => {
					if (isValid(data)) data.value = Object.freeze(data.value);
					return data;
				};
				return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
			}
			unwrap() {
				return this._def.innerType;
			}
		};
		ZodReadonly.create = (type, params) => {
			return new ZodReadonly({
				innerType: type,
				typeName: ZodFirstPartyTypeKind.ZodReadonly,
				...processCreateParams(params)
			});
		};
		ZodObject.lazycreate;
		(function(ZodFirstPartyTypeKind) {
			ZodFirstPartyTypeKind["ZodString"] = "ZodString";
			ZodFirstPartyTypeKind["ZodNumber"] = "ZodNumber";
			ZodFirstPartyTypeKind["ZodNaN"] = "ZodNaN";
			ZodFirstPartyTypeKind["ZodBigInt"] = "ZodBigInt";
			ZodFirstPartyTypeKind["ZodBoolean"] = "ZodBoolean";
			ZodFirstPartyTypeKind["ZodDate"] = "ZodDate";
			ZodFirstPartyTypeKind["ZodSymbol"] = "ZodSymbol";
			ZodFirstPartyTypeKind["ZodUndefined"] = "ZodUndefined";
			ZodFirstPartyTypeKind["ZodNull"] = "ZodNull";
			ZodFirstPartyTypeKind["ZodAny"] = "ZodAny";
			ZodFirstPartyTypeKind["ZodUnknown"] = "ZodUnknown";
			ZodFirstPartyTypeKind["ZodNever"] = "ZodNever";
			ZodFirstPartyTypeKind["ZodVoid"] = "ZodVoid";
			ZodFirstPartyTypeKind["ZodArray"] = "ZodArray";
			ZodFirstPartyTypeKind["ZodObject"] = "ZodObject";
			ZodFirstPartyTypeKind["ZodUnion"] = "ZodUnion";
			ZodFirstPartyTypeKind["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
			ZodFirstPartyTypeKind["ZodIntersection"] = "ZodIntersection";
			ZodFirstPartyTypeKind["ZodTuple"] = "ZodTuple";
			ZodFirstPartyTypeKind["ZodRecord"] = "ZodRecord";
			ZodFirstPartyTypeKind["ZodMap"] = "ZodMap";
			ZodFirstPartyTypeKind["ZodSet"] = "ZodSet";
			ZodFirstPartyTypeKind["ZodFunction"] = "ZodFunction";
			ZodFirstPartyTypeKind["ZodLazy"] = "ZodLazy";
			ZodFirstPartyTypeKind["ZodLiteral"] = "ZodLiteral";
			ZodFirstPartyTypeKind["ZodEnum"] = "ZodEnum";
			ZodFirstPartyTypeKind["ZodEffects"] = "ZodEffects";
			ZodFirstPartyTypeKind["ZodNativeEnum"] = "ZodNativeEnum";
			ZodFirstPartyTypeKind["ZodOptional"] = "ZodOptional";
			ZodFirstPartyTypeKind["ZodNullable"] = "ZodNullable";
			ZodFirstPartyTypeKind["ZodDefault"] = "ZodDefault";
			ZodFirstPartyTypeKind["ZodCatch"] = "ZodCatch";
			ZodFirstPartyTypeKind["ZodPromise"] = "ZodPromise";
			ZodFirstPartyTypeKind["ZodBranded"] = "ZodBranded";
			ZodFirstPartyTypeKind["ZodPipeline"] = "ZodPipeline";
			ZodFirstPartyTypeKind["ZodReadonly"] = "ZodReadonly";
		})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
		stringType = ZodString.create;
		numberType = ZodNumber.create;
		ZodNaN.create;
		ZodBigInt.create;
		booleanType = ZodBoolean.create;
		ZodDate.create;
		ZodSymbol.create;
		ZodUndefined.create;
		ZodNull.create;
		ZodAny.create;
		unknownType = ZodUnknown.create;
		ZodNever.create;
		ZodVoid.create;
		arrayType = ZodArray.create;
		objectType = ZodObject.create;
		ZodObject.strictCreate;
		ZodUnion.create;
		ZodDiscriminatedUnion.create;
		ZodIntersection.create;
		ZodTuple.create;
		recordType = ZodRecord.create;
		ZodMap.create;
		ZodSet.create;
		ZodFunction.create;
		ZodLazy.create;
		ZodLiteral.create;
		enumType = ZodEnum.create;
		ZodNativeEnum.create;
		ZodPromise.create;
		ZodEffects.create;
		ZodOptional.create;
		ZodNullable.create;
		ZodEffects.createWithPreprocess;
		ZodPipeline.create;
	}));
	//#endregion
	//#region node_modules/zod/v3/external.js
	var init_external = __esmMin((() => {
		init_errors();
		init_parseUtil();
		init_typeAliases();
		init_util();
		init_types();
		init_ZodError();
	}));
	//#endregion
	//#region node_modules/zod/index.js
	var init_zod = __esmMin((() => {
		init_external();
		init_external();
	}));
	//#endregion
	//#region src/lib/prompts.ts
	var DEFAULT_GLOBAL_PROMPT;
	var init_prompts = __esmMin((() => {
		DEFAULT_GLOBAL_PROMPT = `You are a professional, authentic machine translation engine.

Rules:
1. Translate the following text from {{sourceLang}} to {{targetLang}}.
2. Output ONLY the translated text. No markdown code blocks, no explanations, no notes.
3. Preserve all HTML tags, placeholders, format symbols, and whitespace exactly as they appear. Only translate the inner text content.
4. Do NOT translate content inside <code>, <pre>, <samp>, <kbd>, <var> tags, text enclosed in backticks (\`code\`), file paths, URLs, variable names, or placeholders like {1}, {{1}}, [1], [[1]], #1#, #2#.
5. Maintain the original tone and style of the text.`;
	}));
	//#endregion
	//#region src/lib/schema.ts
	var providerConfigSchema, modelQueueItemSchema, langDetectProviderSchema, globalSettingsSchema;
	var init_schema = __esmMin((() => {
		init_zod();
		init_prompts();
		providerConfigSchema = objectType({
			id: stringType().min(1),
			name: stringType().min(1),
			baseURL: stringType().url(),
			apiKey: stringType().default(""),
			headers: recordType(stringType()).default({}),
			query: recordType(stringType()).default({}),
			body: recordType(unknownType()).default({}),
			prompt: stringType().optional(),
			temperature: numberType().min(0).max(2).optional(),
			topP: numberType().gt(0).max(1).optional(),
			maxTokens: numberType().int().positive().optional(),
			stream: booleanType().optional(),
			models: arrayType(objectType({
				id: stringType().min(1),
				name: stringType().min(1)
			})).min(1, "At least one model is required")
		});
		modelQueueItemSchema = objectType({
			providerId: stringType().min(1),
			modelId: stringType().min(1),
			enabled: booleanType().default(true)
		});
		langDetectProviderSchema = objectType({
			id: stringType().min(1),
			name: stringType().min(1),
			type: enumType([
				"franc",
				"api",
				"google_free"
			]),
			endpoint: stringType().url().optional(),
			apiKey: stringType().optional(),
			headers: recordType(stringType()).optional(),
			timeout: numberType().int().min(1e3).max(6e4).optional()
		});
		globalSettingsSchema = objectType({
			providers: arrayType(providerConfigSchema).min(1, "At least one provider is required"),
			modelQueue: arrayType(modelQueueItemSchema).min(1, "At least one model queue item is required"),
			nativeLanguage: stringType().min(2).max(10).default("zh-CN"),
			defaultSourceLanguage: stringType().min(2).max(10).default("en"),
			uiLanguage: stringType().min(2).max(10).default("zh-CN"),
			defaultStyle: enumType([
				"original",
				"bilingual",
				"underline",
				"clean"
			]).default("original"),
			globalPrompt: stringType().min(1).default(DEFAULT_GLOBAL_PROMPT),
			detectLangProviders: arrayType(langDetectProviderSchema).default([{
				id: "franc",
				name: "franc-min",
				type: "franc"
			}]),
			shortcutKey: stringType().default("Alt+W"),
			aggregateEnabled: booleanType().default(true),
			maxParagraphsPerRequest: numberType().int().min(1).max(20).default(5),
			maxTextLengthPerRequest: numberType().int().min(100).max(1e4).default(2e3),
			maxConcurrentRequests: numberType().int().min(1).max(10).default(3),
			requestTimeout: numberType().int().min(5e3).max(12e4).default(3e4)
		});
	}));
	//#endregion
	//#region src/lib/crypto.ts
	function randomBuffer(length) {
		const buf = new ArrayBuffer(length);
		crypto.getRandomValues(new Uint8Array(buf));
		return buf;
	}
	function bufferToBase64(buf) {
		const bytes = new Uint8Array(buf);
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	function base64ToBuffer(b64) {
		const binary = atob(b64);
		const buf = new ArrayBuffer(binary.length);
		const bytes = new Uint8Array(buf);
		for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
		return buf;
	}
	function utf8Encode(text) {
		const bytes = new TextEncoder().encode(text);
		const buf = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(buf).set(bytes);
		return buf;
	}
	async function deriveAesKey(passphrase, salt, iterations) {
		const baseKey = await crypto.subtle.importKey("raw", utf8Encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]);
		return crypto.subtle.deriveKey({
			name: "PBKDF2",
			salt,
			iterations,
			hash: "SHA-256"
		}, baseKey, {
			name: "AES-GCM",
			length: KEY_BITS
		}, false, ["encrypt", "decrypt"]);
	}
	async function encryptJSON(plaintext, passphrase) {
		if (!passphrase) throw new Error("PASSPHRASE_REQUIRED");
		const salt = randomBuffer(SALT_BYTES);
		const iv = randomBuffer(IV_BYTES);
		const key = await deriveAesKey(passphrase, salt, PBKDF2_ITERATIONS);
		const cipherBuf = await crypto.subtle.encrypt({
			name: "AES-GCM",
			iv
		}, key, utf8Encode(plaintext));
		const payload = {
			format: ENCRYPTED_FORMAT,
			kdf: KDF_NAME,
			iterations: PBKDF2_ITERATIONS,
			salt: bufferToBase64(salt),
			iv: bufferToBase64(iv),
			ciphertext: bufferToBase64(cipherBuf)
		};
		return JSON.stringify(payload, null, 2);
	}
	async function decryptJSON(ciphertext, passphrase) {
		if (!passphrase) throw new Error("PASSPHRASE_REQUIRED");
		let payload;
		try {
			payload = JSON.parse(ciphertext);
		} catch {
			throw new Error("UNSUPPORTED_ENCRYPTED_FORMAT");
		}
		if (payload.format !== "translator-encrypted-v1" || payload.kdf !== KDF_NAME) throw new Error("UNSUPPORTED_ENCRYPTED_FORMAT");
		const salt = base64ToBuffer(payload.salt);
		const iv = base64ToBuffer(payload.iv);
		const data = base64ToBuffer(payload.ciphertext);
		const key = await deriveAesKey(passphrase, salt, Number.isInteger(payload.iterations) && payload.iterations > 0 ? payload.iterations : PBKDF2_ITERATIONS);
		let plainBuf;
		try {
			plainBuf = await crypto.subtle.decrypt({
				name: "AES-GCM",
				iv
			}, key, data);
		} catch {
			throw new Error("DECRYPT_FAILED");
		}
		return new TextDecoder().decode(plainBuf);
	}
	function isEncryptedPayload(parsed) {
		return Boolean(parsed && typeof parsed === "object" && parsed.format === "translator-encrypted-v1");
	}
	var ENCRYPTED_FORMAT, KDF_NAME, PBKDF2_ITERATIONS, SALT_BYTES, IV_BYTES, KEY_BITS;
	var init_crypto = __esmMin((() => {
		ENCRYPTED_FORMAT = "translator-encrypted-v1";
		KDF_NAME = "PBKDF2-SHA256";
		PBKDF2_ITERATIONS = 2e5;
		SALT_BYTES = 16;
		IV_BYTES = 12;
		KEY_BITS = 256;
	}));
	//#endregion
	//#region src/lib/storage.ts
	var storage_exports = /* @__PURE__ */ __exportAll({
		DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
		exportSettings: () => exportSettings,
		getSettings: () => getSettings,
		importSettings: () => importSettings,
		isEncryptedExport: () => isEncryptedExport,
		saveSettings: () => saveSettings
	});
	function normalizeProvider(provider) {
		const body = { ...provider.body };
		const headers = { ...provider.headers };
		for (const headerKey of Object.keys(headers)) if (headerKey.toLowerCase() === "content-type" && headers[headerKey].toLowerCase() === "application/json") delete headers[headerKey];
		let temperature = provider.temperature;
		let topP = provider.topP;
		let maxTokens = provider.maxTokens;
		let stream = provider.stream;
		if (temperature === void 0 && typeof body.temperature === "number") temperature = body.temperature;
		if (typeof body.temperature === "number") delete body.temperature;
		if (topP === void 0 && typeof body.top_p === "number") topP = body.top_p;
		if (typeof body.top_p === "number") delete body.top_p;
		if (maxTokens === void 0 && typeof body.max_tokens === "number") maxTokens = body.max_tokens;
		if (typeof body.max_tokens === "number") delete body.max_tokens;
		if (stream === void 0 && typeof body.stream === "boolean") stream = body.stream;
		if (typeof body.stream === "boolean") delete body.stream;
		return {
			...provider,
			headers,
			body,
			temperature,
			topP,
			maxTokens,
			stream: stream ?? false
		};
	}
	function normalizeSettings(settings) {
		return {
			...settings,
			providers: settings.providers.map(normalizeProvider)
		};
	}
	function validateSettings(data) {
		const parsed = globalSettingsSchema.safeParse(data);
		if (parsed.success) return normalizeSettings(parsed.data);
		console.warn("Invalid settings, using defaults:", parsed.error.format());
		return normalizeSettings(globalSettingsSchema.parse(DEFAULT_SETTINGS));
	}
	async function getSettings() {
		const data = (await chrome.storage.sync.get(SETTINGS_KEY))[SETTINGS_KEY];
		if (data) return validateSettings(data);
		return validateSettings(DEFAULT_SETTINGS);
	}
	async function saveSettings(settings) {
		const validated = validateSettings(settings);
		await chrome.storage.sync.set({ [SETTINGS_KEY]: validated });
	}
	async function exportSettings(passphrase) {
		const settings = await getSettings();
		const exportData = {
			version: 1,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			settings
		};
		const plaintext = JSON.stringify(exportData, null, 2);
		if (passphrase && passphrase.length > 0) return await encryptJSON(plaintext, passphrase);
		return plaintext;
	}
	async function importSettings(text, passphrase) {
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch {
			throw new Error("Invalid JSON");
		}
		let payload = parsed;
		if (isEncryptedPayload(parsed)) {
			if (!passphrase) throw new Error("PASSPHRASE_REQUIRED");
			const decrypted = await decryptJSON(text, passphrase);
			try {
				payload = JSON.parse(decrypted);
			} catch {
				throw new Error("DECRYPT_FAILED");
			}
		}
		const wrapper = payload;
		await saveSettings(globalSettingsSchema.parse(wrapper?.settings));
	}
	function isEncryptedExport(text) {
		try {
			return JSON.parse(text)?.format === ENCRYPTED_FORMAT;
		} catch {
			return false;
		}
	}
	var SETTINGS_KEY, DEFAULT_SETTINGS;
	var init_storage = __esmMin((() => {
		init_schema();
		init_prompts();
		init_crypto();
		SETTINGS_KEY = "translator_settings_v1";
		DEFAULT_SETTINGS = {
			providers: [{
				id: "default-openai",
				name: "OpenAI Compatible",
				baseURL: "https://api.openai.com/v1/chat/completions",
				apiKey: "",
				headers: {},
				query: {},
				body: {},
				temperature: .3,
				stream: false,
				models: [{
					id: "gpt-4o",
					name: "GPT-4o"
				}, {
					id: "gpt-4o-mini",
					name: "GPT-4o Mini"
				}]
			}],
			modelQueue: [{
				providerId: "default-openai",
				modelId: "gpt-4o",
				enabled: true
			}, {
				providerId: "default-openai",
				modelId: "gpt-4o-mini",
				enabled: true
			}],
			nativeLanguage: "zh-CN",
			defaultSourceLanguage: "en",
			uiLanguage: "zh-CN",
			defaultStyle: "original",
			globalPrompt: DEFAULT_GLOBAL_PROMPT,
			detectLangProviders: [{
				id: "franc",
				name: "franc-min",
				type: "franc"
			}],
			shortcutKey: "Alt+W",
			aggregateEnabled: true,
			maxParagraphsPerRequest: 5,
			maxTextLengthPerRequest: 2e3,
			maxConcurrentRequests: 3,
			requestTimeout: 3e4
		};
	}));
	//#endregion
	//#region src/lib/lang-detect.ts
	init_storage();
	function shouldSkipTranslation(detectedLang, nativeLanguage) {
		if (!detectedLang) return false;
		return detectedLang.toLowerCase().split("-")[0] === nativeLanguage.toLowerCase().split("-")[0];
	}
	//#endregion
	//#region src/lib/block-detect.ts
	/**
	* 段落识别引擎：决定页面上哪些元素可作为"翻译单元"。
	*
	* 设计要点（详见 .agent-context/default/plan-2/plan.md）：
	* - 白名单（必走）+ 灰名单（条件走：直接文本占比 ≥ 50%）+ 硬/软排除。
	* - 父子去重：若某候选的"可翻译祖先"已经入选，则跳过该候选，保留最外层。
	* - 允许含 inline code 的段落通过（后续由占位符机制处理）。
	*/
	var WHITELIST_TAGS = new Set([
		"P",
		"LI",
		"H1",
		"H2",
		"H3",
		"H4",
		"H5",
		"H6",
		"DT",
		"DD",
		"FIGCAPTION",
		"SUMMARY",
		"CAPTION",
		"TD",
		"TH"
	]);
	var GRAYLIST_TAGS = new Set([
		"DIV",
		"SECTION",
		"ARTICLE",
		"ASIDE",
		"MAIN",
		"BLOCKQUOTE"
	]);
	var HARD_EXCLUDE_TAGS = new Set([
		"SCRIPT",
		"STYLE",
		"NOSCRIPT",
		"IFRAME",
		"TEXTAREA",
		"INPUT",
		"BUTTON",
		"SELECT",
		"SVG",
		"CANVAS",
		"VIDEO",
		"AUDIO",
		"PRE",
		"CODE"
	]);
	var DIRECT_TEXT_RATIO_THRESHOLD = .5;
	var MIN_TEXT_LENGTH = 5;
	var CANDIDATE_SELECTOR = [...WHITELIST_TAGS, ...GRAYLIST_TAGS].map((tag) => tag.toLowerCase()).join(",");
	/** 供外部（如 Ctrl+hover）快速判定"是不是一个段落级元素"。 */
	var BLOCK_SELECTOR = CANDIDATE_SELECTOR;
	function getDirectTextLength(el) {
		let len = 0;
		for (const node of Array.from(el.childNodes)) if (node.nodeType === Node.TEXT_NODE) len += (node.textContent ?? "").trim().length;
		return len;
	}
	function hasExcludedAncestor(el) {
		let cur = el;
		while (cur) {
			if (cur.isContentEditable) return true;
			if (cur.getAttribute?.("contenteditable") === "true") return true;
			if (cur.getAttribute?.("translate") === "no") return true;
			if (cur.classList?.contains("notranslate")) return true;
			if (cur.getAttribute?.("aria-hidden") === "true") return true;
			const role = cur.getAttribute?.("role");
			if (role === "code" || role === "math") return true;
			if (cur.hasAttribute?.("data-translator-processed")) return true;
			if (cur.hasAttribute?.("data-translator-clone")) return true;
			cur = cur.parentElement;
		}
		return false;
	}
	function isVisible(el) {
		if (el.offsetParent === null) {
			const style = window.getComputedStyle(el);
			if (style.display === "none" || style.visibility === "hidden") return false;
			if (style.position !== "fixed") return false;
		}
		const rect = el.getBoundingClientRect();
		return rect.width > 0 || rect.height > 0;
	}
	function isTranslatableBlock(el) {
		if (!el) return false;
		const tag = el.tagName;
		if (HARD_EXCLUDE_TAGS.has(tag)) return false;
		const isWhitelist = WHITELIST_TAGS.has(tag);
		const isGraylist = GRAYLIST_TAGS.has(tag);
		if (!isWhitelist && !isGraylist) return false;
		if (hasExcludedAncestor(el)) return false;
		const text = el.textContent?.trim() ?? "";
		if (text.length < MIN_TEXT_LENGTH) return false;
		if (!isVisible(el)) return false;
		if (isGraylist) {
			const directLen = getDirectTextLength(el);
			const totalLen = text.length;
			if (totalLen === 0) return false;
			if (directLen / totalLen < DIRECT_TEXT_RATIO_THRESHOLD) return false;
		}
		return true;
	}
	/**
	* 从 root 起收集所有可翻译段落，并对父子同时命中的情况保留最外层。
	*/
	function collectBlocks(root = document) {
		const scope = root instanceof Document ? root.documentElement : root;
		if (!scope) return [];
		const all = Array.from(scope.querySelectorAll(CANDIDATE_SELECTOR));
		if (scope instanceof HTMLElement && scope.matches(CANDIDATE_SELECTOR)) all.unshift(scope);
		const passed = [];
		for (const el of all) if (isTranslatableBlock(el)) passed.push(el);
		if (passed.length === 0) return [];
		const passedSet = new Set(passed);
		const survivors = [];
		for (const el of passed) {
			let hasAncestorInSet = false;
			let parent = el.parentElement;
			while (parent) {
				if (passedSet.has(parent)) {
					hasAncestorInSet = true;
					break;
				}
				parent = parent.parentElement;
			}
			if (!hasAncestorInSet) survivors.push(el);
		}
		return survivors;
	}
	//#endregion
	//#region src/lib/inline-placeholder.ts
	var INLINE_FLATTEN_TAGS = new Set([
		"STRONG",
		"B",
		"EM",
		"I",
		"U",
		"SMALL",
		"SPAN"
	]);
	var PLACEHOLDER_REGEX = /#(\d+)#/g;
	function isMathLikeSpan(el) {
		if (el.tagName !== "SPAN") return false;
		const cls = el.getAttribute("class") ?? "";
		return cls.includes("math") || cls.includes("katex");
	}
	function wrapAsFragment(node) {
		const frag = document.createDocumentFragment();
		frag.appendChild(node);
		return frag;
	}
	function encodeNode(ctx, node) {
		if (node.nodeType === Node.TEXT_NODE) {
			ctx.parts.push(node.textContent ?? "");
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return;
		const el = node;
		const tag = el.tagName;
		if (tag === "BR") {
			ctx.parts.push("\n");
			return;
		}
		if (INLINE_FLATTEN_TAGS.has(tag) && !isMathLikeSpan(el)) {
			for (const child of Array.from(el.childNodes)) encodeNode(ctx, child);
			return;
		}
		ctx.fragments.push(wrapAsFragment(el.cloneNode(true)));
		ctx.parts.push(`#${ctx.fragments.length}#`);
	}
	/** 把块级元素的子孙编码为 `#N#` 占位文本与对应 DOM 片段。 */
	function encodeInline(el) {
		const ctx = {
			fragments: [],
			parts: []
		};
		for (const child of Array.from(el.childNodes)) encodeNode(ctx, child);
		return {
			placeholderText: ctx.parts.join("").trim(),
			fragments: ctx.fragments
		};
	}
	function appendTextPreservingBr(container, text) {
		if (!text) return;
		text.split("\n").forEach((line, i) => {
			if (i > 0) container.appendChild(document.createElement("br"));
			if (line) container.appendChild(document.createTextNode(line));
		});
	}
	/** 按 `#N#` 还原译文为 DocumentFragment；缺失的占位符保留文本并告警，便于发现而非静默丢失。 */
	function decodeInline(translated, fragments) {
		const out = document.createDocumentFragment();
		let lastIndex = 0;
		PLACEHOLDER_REGEX.lastIndex = 0;
		let match;
		while ((match = PLACEHOLDER_REGEX.exec(translated)) !== null) {
			appendTextPreservingBr(out, translated.slice(lastIndex, match.index));
			const frag = fragments[Number(match[1]) - 1];
			if (!frag) {
				console.warn("[translator] placeholder not found in fragments:", match[0]);
				out.appendChild(document.createTextNode(match[0]));
			} else out.appendChild(frag.cloneNode(true));
			lastIndex = PLACEHOLDER_REGEX.lastIndex;
		}
		appendTextPreservingBr(out, translated.slice(lastIndex));
		return out;
	}
	//#endregion
	//#region src/lib/batch-protocol.ts
	var MARKER_RE = /^<<<(\d+)>>>\s*$/gm;
	function encodeBatch(items) {
		return items.map(({ id, text }) => `<<<${id}>>>\n${text}`).join("\n");
	}
	function decodeBatch(raw, expected) {
		const markers = [];
		MARKER_RE.lastIndex = 0;
		let m;
		while ((m = MARKER_RE.exec(raw)) !== null) markers.push({
			id: Number(m[1]),
			start: m.index,
			end: m.index + m[0].length
		});
		const translations = /* @__PURE__ */ new Map();
		const counts = /* @__PURE__ */ new Map();
		for (let i = 0; i < markers.length; i++) {
			const cur = markers[i];
			const next = markers[i + 1];
			const segment = raw.slice(cur.end, next ? next.start : raw.length).trim();
			translations.set(cur.id, segment);
			counts.set(cur.id, (counts.get(cur.id) ?? 0) + 1);
		}
		const missing = [];
		for (let id = 1; id <= expected; id++) if (!translations.has(id)) missing.push(id);
		const duplicated = [];
		for (const [id, count] of counts) if (count > 1) duplicated.push(id);
		duplicated.sort((a, b) => a - b);
		return {
			translations,
			missing,
			duplicated
		};
	}
	//#endregion
	//#region src/lib/messaging.ts
	function sendBgMessage(message) {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(message, (response) => {
				if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
				else if (response?.success) resolve(response.data);
				else reject(new Error(response?.error ?? "Unknown error"));
			});
		});
	}
	//#endregion
	//#region src/entrypoints/content/index.ts
	var wrapperToOriginal = /* @__PURE__ */ new WeakMap();
	var mutationFlushTimer = null;
	var pendingMutationNodes = /* @__PURE__ */ new Set();
	var MUTATION_FLUSH_DELAY_MS = 200;
	var state = {
		isActive: false,
		style: "original",
		nativeLanguage: "zh-CN",
		targetLang: "zh-CN",
		observer: null,
		elementMap: /* @__PURE__ */ new Map(),
		aggregate: {
			aggregateEnabled: true,
			maxParagraphsPerRequest: 5,
			maxTextLengthPerRequest: 2e3,
			maxConcurrentRequests: 3,
			requestTimeout: 3e4
		},
		pendingAggregateElements: /* @__PURE__ */ new Set(),
		aggregateDebounceTimer: null
	};
	function isValidPage() {
		const url = location.href;
		return !url.startsWith("chrome://") && !url.startsWith("chrome-extension://") && !url.startsWith("devtools://");
	}
	function getTranslatableElements(root = document) {
		return collectBlocks(root);
	}
	function cloneAsWrapper(el) {
		const wrapper = el.cloneNode(false);
		if (wrapper.id) wrapper.removeAttribute("id");
		return wrapper;
	}
	var BLOCK_TAGS = new Set([
		"P",
		"LI",
		"H1",
		"H2",
		"H3",
		"H4",
		"H5",
		"H6",
		"BLOCKQUOTE",
		"DIV",
		"ARTICLE",
		"SECTION",
		"FIGCAPTION",
		"DT",
		"DD",
		"CAPTION",
		"TD",
		"TH"
	]);
	function isBlockElement(el) {
		return BLOCK_TAGS.has(el.tagName);
	}
	function applyOriginalStyle(el, translatedText, fragments) {
		const originalHTML = el.innerHTML;
		const wrapper = cloneAsWrapper(el);
		wrapper.appendChild(decodeInline(translatedText, fragments));
		wrapper.classList.add("translator-ext-wrapper");
		wrapper.setAttribute("data-translator-clone", "true");
		wrapper.setAttribute("data-translator-processed", "true");
		wrapperToOriginal.set(wrapper, el);
		el.replaceWith(wrapper);
		state.elementMap.set(el, {
			originalHTML,
			translatedText,
			status: "translated",
			cloneEl: wrapper
		});
	}
	function applyCleanStyle(el, translatedText, fragments) {
		const originalHTML = el.innerHTML;
		const wrapper = cloneAsWrapper(el);
		wrapper.appendChild(decodeInline(translatedText, fragments));
		wrapper.classList.add("translator-ext-wrapper");
		wrapper.setAttribute("data-translator-clone", "true");
		wrapperToOriginal.set(wrapper, el);
		el.replaceWith(wrapper);
		state.elementMap.set(el, {
			originalHTML,
			translatedText,
			status: "translated",
			cloneEl: wrapper
		});
	}
	function applyBilingualStyle(el, translatedText, fragments) {
		const originalHTML = el.innerHTML;
		const br = document.createElement("br");
		br.setAttribute("data-translator-br", "true");
		const span = document.createElement("span");
		span.classList.add("translator-ext-wrapper");
		span.setAttribute("data-translator-bilingual", "true");
		span.dataset.display = isBlockElement(el) ? "block" : "inline";
		span.appendChild(decodeInline(translatedText, fragments));
		el.appendChild(br);
		el.appendChild(span);
		el.setAttribute("data-translator-processed", "true");
		state.elementMap.set(el, {
			originalHTML,
			translatedText,
			status: "translated"
		});
	}
	function applyUnderlineStyle(el, translatedText, fragments) {
		const originalHTML = el.innerHTML;
		const originalText = el.textContent?.trim() ?? "";
		const wrapper = document.createElement("span");
		wrapper.classList.add("translator-ext-wrapper");
		wrapper.setAttribute("data-translator-underline", "true");
		wrapper.title = originalText;
		wrapper.appendChild(decodeInline(translatedText, fragments));
		el.innerHTML = "";
		el.appendChild(wrapper);
		el.setAttribute("data-translator-processed", "true");
		state.elementMap.set(el, {
			originalHTML,
			translatedText,
			status: "translated"
		});
	}
	function applyTranslation(el, translatedText, fragments) {
		if (state.elementMap.has(el)) return;
		switch (state.style) {
			case "original":
				applyOriginalStyle(el, translatedText, fragments);
				break;
			case "clean":
				applyCleanStyle(el, translatedText, fragments);
				break;
			case "bilingual":
				applyBilingualStyle(el, translatedText, fragments);
				break;
			case "underline":
				applyUnderlineStyle(el, translatedText, fragments);
				break;
		}
	}
	function restoreElement(el) {
		const elState = state.elementMap.get(el);
		if (!elState) return;
		switch (state.style) {
			case "original":
			case "clean": {
				const wrapper = elState.cloneEl;
				if (wrapper && wrapper.parentNode) {
					wrapper.replaceWith(el);
					wrapperToOriginal.delete(wrapper);
				}
				break;
			}
			case "bilingual":
				el.innerHTML = elState.originalHTML;
				el.removeAttribute("data-translator-processed");
				break;
			case "underline":
				el.innerHTML = elState.originalHTML;
				el.removeAttribute("data-translator-processed");
				break;
		}
		state.elementMap.delete(el);
	}
	function restoreAll() {
		const keys = Array.from(state.elementMap.keys());
		for (const el of keys) restoreElement(el);
		state.elementMap.clear();
	}
	function cleanupRemovedSubtree(root) {
		const victims = [];
		state.elementMap.forEach((entry, key) => {
			const inByKey = key === root || root.contains(key);
			const inByClone = entry.cloneEl !== void 0 && (entry.cloneEl === root || root.contains(entry.cloneEl));
			if (inByKey || inByClone) victims.push(key);
		});
		for (const el of victims) {
			state.elementMap.delete(el);
			state.observer?.unobserve(el);
			state.pendingAggregateElements.delete(el);
		}
	}
	async function translateSingleElement(el, force = false) {
		if (!force && state.elementMap.has(el)) return;
		if (el.hasAttribute("data-translator-pending")) return;
		const rawText = el.textContent?.trim();
		if (!rawText || rawText.length < 5) return;
		const { placeholderText, fragments } = encodeInline(el);
		if (!placeholderText) return;
		el.setAttribute("data-translator-pending", "true");
		try {
			const detectedLang = (await sendBgMessage({
				type: "DETECT_LANG",
				payload: { text: rawText }
			})).lang;
			if (detectedLang && shouldSkipTranslation(detectedLang, state.nativeLanguage)) {
				el.removeAttribute("data-translator-pending");
				return;
			}
			const result = await sendBgMessage({
				type: "TRANSLATE",
				payload: {
					text: placeholderText,
					sourceLang: detectedLang || void 0,
					targetLang: state.targetLang
				}
			});
			el.removeAttribute("data-translator-pending");
			applyTranslation(el, result.text, fragments);
		} catch (error) {
			console.error("Translation failed:", error);
			el.removeAttribute("data-translator-pending");
			state.elementMap.set(el, {
				originalHTML: el.innerHTML,
				translatedText: "",
				status: "error"
			});
		}
	}
	function createBatches(elements) {
		const batches = [];
		let currentBatch = [];
		let currentLength = 0;
		for (const el of elements) {
			const text = el.textContent?.trim() || "";
			if (!text) continue;
			const wouldExceedParagraphs = currentBatch.length >= state.aggregate.maxParagraphsPerRequest;
			const wouldExceedLength = currentLength + text.length > state.aggregate.maxTextLengthPerRequest;
			if (wouldExceedParagraphs || wouldExceedLength) {
				if (currentBatch.length > 0) batches.push(currentBatch);
				currentBatch = [el];
				currentLength = text.length;
			} else {
				currentBatch.push(el);
				currentLength += text.length;
			}
		}
		if (currentBatch.length > 0) batches.push(currentBatch);
		return batches;
	}
	async function translateBatchWithFallback(batch) {
		const placeholderTexts = [];
		const fragmentsList = [];
		const validElements = [];
		for (const el of batch) {
			const rawText = el.textContent?.trim();
			if (!rawText || rawText.length < 5) continue;
			const encoded = encodeInline(el);
			if (!encoded.placeholderText) continue;
			placeholderTexts.push(encoded.placeholderText);
			fragmentsList.push(encoded.fragments);
			validElements.push(el);
		}
		if (validElements.length === 0) return;
		const expected = validElements.length;
		validElements.forEach((el) => el.setAttribute("data-translator-pending", "true"));
		const clearPending = () => {
			validElements.forEach((el) => el.removeAttribute("data-translator-pending"));
		};
		const fullFallback = async () => {
			clearPending();
			await limitConcurrency(validElements.map((el) => () => translateSingleElement(el, true)), state.aggregate.maxConcurrentRequests);
		};
		try {
			const { translations, missing, duplicated } = decodeBatch((await sendBgMessage({
				type: "TRANSLATE",
				payload: {
					text: encodeBatch(placeholderTexts.map((text, idx) => ({
						id: idx + 1,
						text
					}))),
					targetLang: state.targetLang,
					isAggregate: true
				}
			})).text, expected);
			if (translations.size === 0 || missing.length >= Math.ceil(expected / 2)) {
				console.warn("Batch protocol failed, full fallback", {
					expected,
					got: translations.size,
					missing,
					duplicated
				});
				await fullFallback();
				return;
			}
			if (missing.length > 0 || duplicated.length > 0) console.warn("Batch protocol partial mismatch, retrying missing only", {
				expected,
				missing,
				duplicated
			});
			const retryElements = [];
			validElements.forEach((el, index) => {
				el.removeAttribute("data-translator-pending");
				const translated = translations.get(index + 1);
				if (translated) applyTranslation(el, translated, fragmentsList[index]);
				else retryElements.push(el);
			});
			if (retryElements.length > 0) await limitConcurrency(retryElements.map((el) => () => translateSingleElement(el, true)), state.aggregate.maxConcurrentRequests);
		} catch (error) {
			console.warn("Aggregate translation failed, falling back to single:", error);
			await fullFallback();
		}
	}
	async function limitConcurrency(tasks, limit) {
		const results = new Array(tasks.length);
		let index = 0;
		async function worker() {
			while (index < tasks.length) {
				const i = index++;
				try {
					results[i] = await tasks[i]();
				} catch (error) {
					console.error("Task error:", error);
				}
			}
		}
		const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
		await Promise.all(workers);
		return results;
	}
	async function flushAggregateQueue() {
		if (state.pendingAggregateElements.size === 0) return;
		const elements = Array.from(state.pendingAggregateElements);
		state.pendingAggregateElements.clear();
		const eligible = elements.filter((el) => {
			if (state.elementMap.has(el)) return false;
			if (el.hasAttribute("data-translator-pending")) return false;
			return true;
		});
		if (eligible.length === 0) return;
		await limitConcurrency(createBatches(eligible).map((batch) => () => translateBatchWithFallback(batch)), state.aggregate.maxConcurrentRequests);
	}
	function scheduleAggregateFlush() {
		if (state.aggregateDebounceTimer) window.clearTimeout(state.aggregateDebounceTimer);
		state.aggregateDebounceTimer = window.setTimeout(() => {
			state.aggregateDebounceTimer = null;
			flushAggregateQueue();
		}, 300);
	}
	function createObserver() {
		const pending = /* @__PURE__ */ new Set();
		return new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				const el = entry.target;
				if (!entry.isIntersecting) {
					pending.delete(el);
					return;
				}
				if (pending.has(el)) return;
				if (state.elementMap.has(el)) return;
				if (state.aggregate.aggregateEnabled) {
					state.pendingAggregateElements.add(el);
					scheduleAggregateFlush();
				} else {
					pending.add(el);
					window.setTimeout(() => {
						pending.delete(el);
						if (state.elementMap.has(el)) return;
						const rect = el.getBoundingClientRect();
						if (rect.top < window.innerHeight && rect.bottom > 0) translateSingleElement(el);
					}, 200);
				}
			});
		}, {
			threshold: 0,
			rootMargin: "100px"
		});
	}
	function startTranslation() {
		if (!isValidPage()) return;
		const elements = getTranslatableElements();
		if (!state.observer) state.observer = createObserver();
		elements.forEach((el) => {
			state.observer.observe(el);
		});
		if (state.aggregate.aggregateEnabled) {
			elements.filter((el) => {
				const rect = el.getBoundingClientRect();
				return rect.top < window.innerHeight && rect.bottom > 0;
			}).forEach((el) => state.pendingAggregateElements.add(el));
			scheduleAggregateFlush();
		}
	}
	function stopTranslation() {
		state.observer?.disconnect();
		state.observer = null;
		restoreAll();
		state.pendingAggregateElements.clear();
		if (state.aggregateDebounceTimer !== null) {
			window.clearTimeout(state.aggregateDebounceTimer);
			state.aggregateDebounceTimer = null;
		}
		pendingMutationNodes.clear();
		if (mutationFlushTimer !== null) {
			window.clearTimeout(mutationFlushTimer);
			mutationFlushTimer = null;
		}
	}
	var spaceCount = 0;
	var inputDebounceTimer = null;
	async function translateInput(el) {
		const text = el.value.trim();
		if (!text || text.length < 2) return;
		try {
			const detectedLang = (await sendBgMessage({
				type: "DETECT_LANG",
				payload: { text }
			})).lang;
			if (detectedLang && shouldSkipTranslation(detectedLang, state.nativeLanguage)) return;
			el.value = (await sendBgMessage({
				type: "TRANSLATE",
				payload: {
					text,
					sourceLang: detectedLang || void 0,
					targetLang: state.targetLang
				}
			})).text;
		} catch (error) {
			console.error("Input translation failed:", error);
		}
	}
	function setupInputListeners() {
		document.addEventListener("keydown", (e) => {
			const target = e.target;
			if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
			if (e.key === " ") {
				spaceCount++;
				if (spaceCount >= 3) {
					spaceCount = 0;
					if (inputDebounceTimer) window.clearTimeout(inputDebounceTimer);
					inputDebounceTimer = window.setTimeout(() => {
						translateInput(target);
					}, 300);
				}
			} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) spaceCount = 0;
		});
	}
	var HOVER_HIGHLIGHT_ATTR = "data-translator-hover-target";
	var HOVER_DEBOUNCE_MS = 200;
	var HOVER_MIN_VISIBLE_MS = 250;
	var ctrlHoverSettingsLoaded = false;
	var hoverTarget = null;
	var hoverTimer = null;
	var lastMouseX = -1;
	var lastMouseY = -1;
	var ctrlPressed = false;
	async function ensureCtrlHoverSettings() {
		if (ctrlHoverSettingsLoaded || state.isActive) return;
		try {
			const { getSettings } = await Promise.resolve().then(() => (init_storage(), storage_exports));
			const s = await getSettings();
			state.style = s.defaultStyle;
			state.nativeLanguage = s.nativeLanguage;
			state.targetLang = s.nativeLanguage;
			state.aggregate = {
				aggregateEnabled: s.aggregateEnabled,
				maxParagraphsPerRequest: s.maxParagraphsPerRequest,
				maxTextLengthPerRequest: s.maxTextLengthPerRequest,
				maxConcurrentRequests: s.maxConcurrentRequests,
				requestTimeout: s.requestTimeout
			};
			ctrlHoverSettingsLoaded = true;
		} catch (error) {
			console.error("Failed to load settings for Ctrl+hover:", error);
		}
	}
	function findNearestTranslatableBlock(el) {
		let cur = el;
		while (cur) {
			if (cur.matches?.(BLOCK_SELECTOR) && isTranslatableBlock(cur)) return cur;
			cur = cur.parentElement;
		}
		return null;
	}
	function findToggleTarget(target) {
		let cur = target;
		while (cur) {
			if (cur.dataset?.translatorClone === "true") return wrapperToOriginal.get(cur) ?? null;
			if (state.elementMap.has(cur)) return cur;
			cur = cur.parentElement;
		}
		return null;
	}
	function tryToggleRestore(target) {
		const toggleEl = findToggleTarget(target);
		if (!toggleEl || !state.elementMap.has(toggleEl)) return false;
		if (hoverTarget === toggleEl) cancelHoverDebounce();
		restoreElement(toggleEl);
		return true;
	}
	function cancelHoverDebounce() {
		if (hoverTimer === null) return;
		if (hoverTarget) {
			hoverTarget.removeAttribute(HOVER_HIGHLIGHT_ATTR);
			hoverTarget = null;
		}
		window.clearTimeout(hoverTimer);
		hoverTimer = null;
	}
	function tryStartHoverFor(target) {
		if (!target) return;
		const paragraph = findNearestTranslatableBlock(target);
		if (!paragraph) {
			cancelHoverDebounce();
			return;
		}
		if (state.elementMap.has(paragraph)) return;
		if (paragraph.hasAttribute("data-translator-pending")) return;
		if (hoverTarget === paragraph) return;
		if (hoverTarget) hoverTarget.removeAttribute(HOVER_HIGHLIGHT_ATTR);
		if (hoverTimer !== null) window.clearTimeout(hoverTimer);
		hoverTarget = paragraph;
		paragraph.setAttribute(HOVER_HIGHLIGHT_ATTR, "true");
		const startedAt = performance.now();
		hoverTimer = window.setTimeout(async () => {
			hoverTimer = null;
			if (hoverTarget !== paragraph) return;
			if (state.elementMap.has(paragraph) || paragraph.hasAttribute("data-translator-pending")) {
				paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR);
				if (hoverTarget === paragraph) hoverTarget = null;
				return;
			}
			try {
				await ensureCtrlHoverSettings();
				await translateSingleElement(paragraph, true);
			} finally {
				const elapsed = performance.now() - startedAt;
				const wait = Math.max(0, HOVER_MIN_VISIBLE_MS - elapsed);
				if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
				paragraph.removeAttribute(HOVER_HIGHLIGHT_ATTR);
				(state.elementMap.get(paragraph)?.cloneEl)?.removeAttribute(HOVER_HIGHLIGHT_ATTR);
				if (hoverTarget === paragraph) hoverTarget = null;
			}
		}, HOVER_DEBOUNCE_MS);
	}
	function setupCtrlHover() {
		document.addEventListener("mousemove", (e) => {
			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
		}, { passive: true });
		document.addEventListener("mouseover", (e) => {
			if (!e.ctrlKey) return;
			tryStartHoverFor(e.target);
		});
		document.addEventListener("keydown", (e) => {
			if (e.key !== "Control") return;
			if (ctrlPressed || e.repeat) return;
			ctrlPressed = true;
			if (lastMouseX < 0 || lastMouseY < 0) return;
			const el = document.elementFromPoint(lastMouseX, lastMouseY);
			if (tryToggleRestore(el)) return;
			tryStartHoverFor(el);
		});
		document.addEventListener("mouseout", (e) => {
			if (!hoverTarget) return;
			const related = e.relatedTarget;
			if (related && hoverTarget.contains(related)) return;
			cancelHoverDebounce();
		});
		document.addEventListener("keyup", (e) => {
			if (e.key !== "Control") return;
			ctrlPressed = false;
		});
		window.addEventListener("blur", () => {
			ctrlPressed = false;
			cancelHoverDebounce();
		});
	}
	function handleRouteChange() {
		if (state.isActive) {
			stopTranslation();
			window.setTimeout(() => {
				if (state.isActive) startTranslation();
			}, 500);
		}
	}
	function setupSPADetection() {
		const originalPushState = history.pushState;
		const originalReplaceState = history.replaceState;
		history.pushState = function(...args) {
			originalPushState.apply(this, args);
			window.dispatchEvent(new Event("translator-pushstate"));
		};
		history.replaceState = function(...args) {
			originalReplaceState.apply(this, args);
			window.dispatchEvent(new Event("translator-replacestate"));
		};
		window.addEventListener("popstate", handleRouteChange);
		window.addEventListener("translator-pushstate", handleRouteChange);
		window.addEventListener("translator-replacestate", handleRouteChange);
	}
	function scheduleMutationFlush() {
		if (mutationFlushTimer !== null) return;
		mutationFlushTimer = window.setTimeout(() => {
			mutationFlushTimer = null;
			flushMutationQueue();
		}, MUTATION_FLUSH_DELAY_MS);
	}
	function flushMutationQueue() {
		if (!state.isActive || !state.observer) {
			pendingMutationNodes.clear();
			return;
		}
		const nodes = Array.from(pendingMutationNodes);
		pendingMutationNodes.clear();
		const roots = nodes.filter((n) => !nodes.some((m) => m !== n && m.contains(n)));
		const newElements = [];
		for (const root of roots) {
			if (!root.isConnected) continue;
			newElements.push(...getTranslatableElements(root));
		}
		for (const el of newElements) if (!state.elementMap.has(el)) state.observer.observe(el);
	}
	function setupMutationObserver() {
		new MutationObserver((mutations) => {
			if (!state.isActive || !state.observer) return;
			for (const m of mutations) m.removedNodes.forEach((node) => {
				if (node instanceof HTMLElement) cleanupRemovedSubtree(node);
			});
			let added = false;
			for (const m of mutations) m.addedNodes.forEach((node) => {
				if (node instanceof HTMLElement && node.isConnected) {
					pendingMutationNodes.add(node);
					added = true;
				}
			});
			if (added) scheduleMutationFlush();
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
	}
	async function toggleTranslation() {
		if (state.isActive) {
			state.isActive = false;
			stopTranslation();
		} else try {
			await sendBgMessage({ type: "PING" }).catch(() => null);
			const { getSettings } = await Promise.resolve().then(() => (init_storage(), storage_exports));
			const s = await getSettings();
			state.style = s.defaultStyle;
			state.nativeLanguage = s.nativeLanguage;
			state.targetLang = s.nativeLanguage;
			state.aggregate = {
				aggregateEnabled: s.aggregateEnabled,
				maxParagraphsPerRequest: s.maxParagraphsPerRequest,
				maxTextLengthPerRequest: s.maxTextLengthPerRequest,
				maxConcurrentRequests: s.maxConcurrentRequests,
				requestTimeout: s.requestTimeout
			};
			state.isActive = true;
			startTranslation();
		} catch (error) {
			console.error("Failed to start translation:", error);
		}
	}
	var content_default = defineContentScript({
		matches: ["<all_urls>"],
		runAt: "document_idle",
		main() {
			if (!isValidPage()) return;
			chrome.runtime.onMessage.addListener((message) => {
				if (message.type === "TOGGLE_TRANSLATION") toggleTranslation();
			});
			setupInputListeners();
			setupCtrlHover();
			setupSPADetection();
			setupMutationObserver();
			console.log("Translator content script loaded");
		}
	});
	//#endregion
	//#region node_modules/wxt/dist/utils/internal/logger.mjs
	function print$1(method, ...args) {
		if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
		else method("[wxt]", ...args);
	}
	/** Wrapper around `console` with a "[wxt]" prefix */
	var logger$1 = {
		debug: (...args) => print$1(console.debug, ...args),
		log: (...args) => print$1(console.log, ...args),
		warn: (...args) => print$1(console.warn, ...args),
		error: (...args) => print$1(console.error, ...args)
	};
	//#endregion
	//#region node_modules/wxt/dist/browser.mjs
	/**
	* Contains the `browser` export which you should use to access the extension
	* APIs in your project:
	*
	* ```ts
	* import { browser } from 'wxt/browser';
	*
	* browser.runtime.onInstalled.addListener(() => {
	*   // ...
	* });
	* ```
	*
	* @module wxt/browser
	*/
	var browser = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;
	//#endregion
	//#region node_modules/wxt/dist/utils/internal/custom-events.mjs
	var WxtLocationChangeEvent = class WxtLocationChangeEvent extends Event {
		static EVENT_NAME = getUniqueEventName("wxt:locationchange");
		constructor(newUrl, oldUrl) {
			super(WxtLocationChangeEvent.EVENT_NAME, {});
			this.newUrl = newUrl;
			this.oldUrl = oldUrl;
		}
	};
	/**
	* Returns an event name unique to the extension and content script that's
	* running.
	*/
	function getUniqueEventName(eventName) {
		return `${browser?.runtime?.id}:content:${eventName}`;
	}
	//#endregion
	//#region node_modules/wxt/dist/utils/internal/location-watcher.mjs
	var supportsNavigationApi = typeof globalThis.navigation?.addEventListener === "function";
	/**
	* Create a util that watches for URL changes, dispatching the custom event when
	* detected. Stops watching when content script is invalidated. Uses Navigation
	* API when available, otherwise falls back to polling.
	*/
	function createLocationWatcher(ctx) {
		let lastUrl;
		let watching = false;
		return { run() {
			if (watching) return;
			watching = true;
			lastUrl = new URL(location.href);
			if (supportsNavigationApi) globalThis.navigation.addEventListener("navigate", (event) => {
				const newUrl = new URL(event.destination.url);
				if (newUrl.href === lastUrl.href) return;
				window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
				lastUrl = newUrl;
			}, { signal: ctx.signal });
			else ctx.setInterval(() => {
				const newUrl = new URL(location.href);
				if (newUrl.href !== lastUrl.href) {
					window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
					lastUrl = newUrl;
				}
			}, 1e3);
		} };
	}
	//#endregion
	//#region node_modules/wxt/dist/utils/content-script-context.mjs
	/**
	* Implements
	* [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
	* Used to detect and stop content script code when the script is invalidated.
	*
	* It also provides several utilities like `ctx.setTimeout` and
	* `ctx.setInterval` that should be used in content scripts instead of
	* `window.setTimeout` or `window.setInterval`.
	*
	* To create context for testing, you can use the class's constructor:
	*
	* ```ts
	* import { ContentScriptContext } from 'wxt/utils/content-scripts-context';
	*
	* test('storage listener should be removed when context is invalidated', () => {
	*   const ctx = new ContentScriptContext('test');
	*   const item = storage.defineItem('local:count', { defaultValue: 0 });
	*   const watcher = vi.fn();
	*
	*   const unwatch = item.watch(watcher);
	*   ctx.onInvalidated(unwatch); // Listen for invalidate here
	*
	*   await item.setValue(1);
	*   expect(watcher).toBeCalledTimes(1);
	*   expect(watcher).toBeCalledWith(1, 0);
	*
	*   ctx.notifyInvalidated(); // Use this function to invalidate the context
	*   await item.setValue(2);
	*   expect(watcher).toBeCalledTimes(1);
	* });
	* ```
	*/
	var ContentScriptContext = class ContentScriptContext {
		static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName("wxt:content-script-started");
		id;
		abortController;
		locationWatcher = createLocationWatcher(this);
		constructor(contentScriptName, options) {
			this.contentScriptName = contentScriptName;
			this.options = options;
			this.id = Math.random().toString(36).slice(2);
			this.abortController = new AbortController();
			this.stopOldScripts();
			this.listenForNewerScripts();
		}
		get signal() {
			return this.abortController.signal;
		}
		abort(reason) {
			return this.abortController.abort(reason);
		}
		get isInvalid() {
			if (browser.runtime?.id == null) this.notifyInvalidated();
			return this.signal.aborted;
		}
		get isValid() {
			return !this.isInvalid;
		}
		/**
		* Add a listener that is called when the content script's context is
		* invalidated.
		*
		* @example
		*   browser.runtime.onMessage.addListener(cb);
		*   const removeInvalidatedListener = ctx.onInvalidated(() => {
		*     browser.runtime.onMessage.removeListener(cb);
		*   });
		*   // ...
		*   removeInvalidatedListener();
		*
		* @returns A function to remove the listener.
		*/
		onInvalidated(cb) {
			this.signal.addEventListener("abort", cb);
			return () => this.signal.removeEventListener("abort", cb);
		}
		/**
		* Return a promise that never resolves. Useful if you have an async function
		* that shouldn't run after the context is expired.
		*
		* @example
		*   const getValueFromStorage = async () => {
		*     if (ctx.isInvalid) return ctx.block();
		*
		*     // ...
		*   };
		*/
		block() {
			return new Promise(() => {});
		}
		/**
		* Wrapper around `window.setInterval` that automatically clears the interval
		* when invalidated.
		*
		* Intervals can be cleared by calling the normal `clearInterval` function.
		*/
		setInterval(handler, timeout) {
			const id = setInterval(() => {
				if (this.isValid) handler();
			}, timeout);
			this.onInvalidated(() => clearInterval(id));
			return id;
		}
		/**
		* Wrapper around `window.setTimeout` that automatically clears the interval
		* when invalidated.
		*
		* Timeouts can be cleared by calling the normal `setTimeout` function.
		*/
		setTimeout(handler, timeout) {
			const id = setTimeout(() => {
				if (this.isValid) handler();
			}, timeout);
			this.onInvalidated(() => clearTimeout(id));
			return id;
		}
		/**
		* Wrapper around `window.requestAnimationFrame` that automatically cancels
		* the request when invalidated.
		*
		* Callbacks can be canceled by calling the normal `cancelAnimationFrame`
		* function.
		*/
		requestAnimationFrame(callback) {
			const id = requestAnimationFrame((...args) => {
				if (this.isValid) callback(...args);
			});
			this.onInvalidated(() => cancelAnimationFrame(id));
			return id;
		}
		/**
		* Wrapper around `window.requestIdleCallback` that automatically cancels the
		* request when invalidated.
		*
		* Callbacks can be canceled by calling the normal `cancelIdleCallback`
		* function.
		*/
		requestIdleCallback(callback, options) {
			const id = requestIdleCallback((...args) => {
				if (!this.signal.aborted) callback(...args);
			}, options);
			this.onInvalidated(() => cancelIdleCallback(id));
			return id;
		}
		addEventListener(target, type, handler, options) {
			if (type === "wxt:locationchange") {
				if (this.isValid) this.locationWatcher.run();
			}
			target.addEventListener?.(type.startsWith("wxt:") ? getUniqueEventName(type) : type, handler, {
				...options,
				signal: this.signal
			});
		}
		/**
		* @internal
		* Abort the abort controller and execute all `onInvalidated` listeners.
		*/
		notifyInvalidated() {
			this.abort("Content script context invalidated");
			logger$1.debug(`Content script "${this.contentScriptName}" context invalidated`);
		}
		stopOldScripts() {
			document.dispatchEvent(new CustomEvent(ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE, { detail: {
				contentScriptName: this.contentScriptName,
				messageId: this.id
			} }));
			window.postMessage({
				type: ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
				contentScriptName: this.contentScriptName,
				messageId: this.id
			}, "*");
		}
		verifyScriptStartedEvent(event) {
			const isSameContentScript = event.detail?.contentScriptName === this.contentScriptName;
			const isFromSelf = event.detail?.messageId === this.id;
			return isSameContentScript && !isFromSelf;
		}
		listenForNewerScripts() {
			const cb = (event) => {
				if (!(event instanceof CustomEvent) || !this.verifyScriptStartedEvent(event)) return;
				this.notifyInvalidated();
			};
			document.addEventListener(ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE, cb);
			this.onInvalidated(() => document.removeEventListener(ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE, cb));
		}
	};
	//#endregion
	//#region \0virtual:wxt-content-script-isolated-world-entrypoint?/Users/whj/codes/translator/src/entrypoints/content/index.ts
	function print(method, ...args) {
		if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
		else method("[wxt]", ...args);
	}
	/** Wrapper around `console` with a "[wxt]" prefix */
	var logger = {
		debug: (...args) => print(console.debug, ...args),
		log: (...args) => print(console.log, ...args),
		warn: (...args) => print(console.warn, ...args),
		error: (...args) => print(console.error, ...args)
	};
	//#endregion
	return (async () => {
		try {
			const { main, ...options } = content_default;
			return await main(new ContentScriptContext("content", options));
		} catch (err) {
			logger.error(`The content script "content" crashed on startup!`, err);
			throw err;
		}
	})();
})();

content;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsIm5hbWVzIjpbImRlZmF1bHRFcnJvck1hcCIsImRlZmF1bHRFcnJvck1hcCIsInJlZ2V4IiwiZGVmYXVsdEVycm9yTWFwIiwicHJpbnQiLCJsb2dnZXIiLCJicm93c2VyIl0sInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvem9kL3YzL2hlbHBlcnMvdXRpbC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy96b2QvdjMvWm9kRXJyb3IuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvem9kL3YzL2xvY2FsZXMvZW4uanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvem9kL3YzL2Vycm9ycy5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy96b2QvdjMvaGVscGVycy9wYXJzZVV0aWwuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvem9kL3YzL2hlbHBlcnMvdHlwZUFsaWFzZXMuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvem9kL3YzL2hlbHBlcnMvZXJyb3JVdGlsLmpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3pvZC92My90eXBlcy5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy96b2QvdjMvZXh0ZXJuYWwuanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvem9kL2luZGV4LmpzIiwiLi4vLi4vLi4vc3JjL2xpYi9wcm9tcHRzLnRzIiwiLi4vLi4vLi4vc3JjL2xpYi9zY2hlbWEudHMiLCIuLi8uLi8uLi9zcmMvbGliL2NyeXB0by50cyIsIi4uLy4uLy4uL3NyYy9saWIvc3RvcmFnZS50cyIsIi4uLy4uLy4uL3NyYy9saWIvbGFuZy1kZXRlY3QudHMiLCIuLi8uLi8uLi9zcmMvbGliL2Jsb2NrLWRldGVjdC50cyIsIi4uLy4uLy4uL3NyYy9saWIvaW5saW5lLXBsYWNlaG9sZGVyLnRzIiwiLi4vLi4vLi4vc3JjL2xpYi9iYXRjaC1wcm90b2NvbC50cyIsIi4uLy4uLy4uL3NyYy9saWIvbWVzc2FnaW5nLnRzIiwiLi4vLi4vLi4vc3JjL2VudHJ5cG9pbnRzL2NvbnRlbnQvaW5kZXgudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIHNyYy91dGlscy9kZWZpbmUtY29udGVudC1zY3JpcHQudHNcbmZ1bmN0aW9uIGRlZmluZUNvbnRlbnRTY3JpcHQoZGVmaW5pdGlvbikge1xuXHRyZXR1cm4gZGVmaW5pdGlvbjtcbn1cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgZGVmaW5lQ29udGVudFNjcmlwdCB9O1xuIiwiZXhwb3J0IHZhciB1dGlsO1xuKGZ1bmN0aW9uICh1dGlsKSB7XG4gICAgdXRpbC5hc3NlcnRFcXVhbCA9IChfKSA9PiB7IH07XG4gICAgZnVuY3Rpb24gYXNzZXJ0SXMoX2FyZykgeyB9XG4gICAgdXRpbC5hc3NlcnRJcyA9IGFzc2VydElzO1xuICAgIGZ1bmN0aW9uIGFzc2VydE5ldmVyKF94KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgICB1dGlsLmFzc2VydE5ldmVyID0gYXNzZXJ0TmV2ZXI7XG4gICAgdXRpbC5hcnJheVRvRW51bSA9IChpdGVtcykgPT4ge1xuICAgICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgICAgICAgICBvYmpbaXRlbV0gPSBpdGVtO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcbiAgICB1dGlsLmdldFZhbGlkRW51bVZhbHVlcyA9IChvYmopID0+IHtcbiAgICAgICAgY29uc3QgdmFsaWRLZXlzID0gdXRpbC5vYmplY3RLZXlzKG9iaikuZmlsdGVyKChrKSA9PiB0eXBlb2Ygb2JqW29ialtrXV0gIT09IFwibnVtYmVyXCIpO1xuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGsgb2YgdmFsaWRLZXlzKSB7XG4gICAgICAgICAgICBmaWx0ZXJlZFtrXSA9IG9ialtrXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXRpbC5vYmplY3RWYWx1ZXMoZmlsdGVyZWQpO1xuICAgIH07XG4gICAgdXRpbC5vYmplY3RWYWx1ZXMgPSAob2JqKSA9PiB7XG4gICAgICAgIHJldHVybiB1dGlsLm9iamVjdEtleXMob2JqKS5tYXAoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmpbZV07XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdXRpbC5vYmplY3RLZXlzID0gdHlwZW9mIE9iamVjdC5rZXlzID09PSBcImZ1bmN0aW9uXCIgLy8gZXNsaW50LWRpc2FibGUtbGluZSBiYW4vYmFuXG4gICAgICAgID8gKG9iaikgPT4gT2JqZWN0LmtleXMob2JqKSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGJhbi9iYW5cbiAgICAgICAgOiAob2JqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgICAgfTtcbiAgICB1dGlsLmZpbmQgPSAoYXJyLCBjaGVja2VyKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBhcnIpIHtcbiAgICAgICAgICAgIGlmIChjaGVja2VyKGl0ZW0pKVxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICB1dGlsLmlzSW50ZWdlciA9IHR5cGVvZiBOdW1iZXIuaXNJbnRlZ2VyID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgPyAodmFsKSA9PiBOdW1iZXIuaXNJbnRlZ2VyKHZhbCkgLy8gZXNsaW50LWRpc2FibGUtbGluZSBiYW4vYmFuXG4gICAgICAgIDogKHZhbCkgPT4gdHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIiAmJiBOdW1iZXIuaXNGaW5pdGUodmFsKSAmJiBNYXRoLmZsb29yKHZhbCkgPT09IHZhbDtcbiAgICBmdW5jdGlvbiBqb2luVmFsdWVzKGFycmF5LCBzZXBhcmF0b3IgPSBcIiB8IFwiKSB7XG4gICAgICAgIHJldHVybiBhcnJheS5tYXAoKHZhbCkgPT4gKHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIgPyBgJyR7dmFsfSdgIDogdmFsKSkuam9pbihzZXBhcmF0b3IpO1xuICAgIH1cbiAgICB1dGlsLmpvaW5WYWx1ZXMgPSBqb2luVmFsdWVzO1xuICAgIHV0aWwuanNvblN0cmluZ2lmeVJlcGxhY2VyID0gKF8sIHZhbHVlKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYmlnaW50XCIpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xufSkodXRpbCB8fCAodXRpbCA9IHt9KSk7XG5leHBvcnQgdmFyIG9iamVjdFV0aWw7XG4oZnVuY3Rpb24gKG9iamVjdFV0aWwpIHtcbiAgICBvYmplY3RVdGlsLm1lcmdlU2hhcGVzID0gKGZpcnN0LCBzZWNvbmQpID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLmZpcnN0LFxuICAgICAgICAgICAgLi4uc2Vjb25kLCAvLyBzZWNvbmQgb3ZlcndyaXRlcyBmaXJzdFxuICAgICAgICB9O1xuICAgIH07XG59KShvYmplY3RVdGlsIHx8IChvYmplY3RVdGlsID0ge30pKTtcbmV4cG9ydCBjb25zdCBab2RQYXJzZWRUeXBlID0gdXRpbC5hcnJheVRvRW51bShbXG4gICAgXCJzdHJpbmdcIixcbiAgICBcIm5hblwiLFxuICAgIFwibnVtYmVyXCIsXG4gICAgXCJpbnRlZ2VyXCIsXG4gICAgXCJmbG9hdFwiLFxuICAgIFwiYm9vbGVhblwiLFxuICAgIFwiZGF0ZVwiLFxuICAgIFwiYmlnaW50XCIsXG4gICAgXCJzeW1ib2xcIixcbiAgICBcImZ1bmN0aW9uXCIsXG4gICAgXCJ1bmRlZmluZWRcIixcbiAgICBcIm51bGxcIixcbiAgICBcImFycmF5XCIsXG4gICAgXCJvYmplY3RcIixcbiAgICBcInVua25vd25cIixcbiAgICBcInByb21pc2VcIixcbiAgICBcInZvaWRcIixcbiAgICBcIm5ldmVyXCIsXG4gICAgXCJtYXBcIixcbiAgICBcInNldFwiLFxuXSk7XG5leHBvcnQgY29uc3QgZ2V0UGFyc2VkVHlwZSA9IChkYXRhKSA9PiB7XG4gICAgY29uc3QgdCA9IHR5cGVvZiBkYXRhO1xuICAgIHN3aXRjaCAodCkge1xuICAgICAgICBjYXNlIFwidW5kZWZpbmVkXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS51bmRlZmluZWQ7XG4gICAgICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLnN0cmluZztcbiAgICAgICAgY2FzZSBcIm51bWJlclwiOlxuICAgICAgICAgICAgcmV0dXJuIE51bWJlci5pc05hTihkYXRhKSA/IFpvZFBhcnNlZFR5cGUubmFuIDogWm9kUGFyc2VkVHlwZS5udW1iZXI7XG4gICAgICAgIGNhc2UgXCJib29sZWFuXCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5ib29sZWFuO1xuICAgICAgICBjYXNlIFwiZnVuY3Rpb25cIjpcbiAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLmZ1bmN0aW9uO1xuICAgICAgICBjYXNlIFwiYmlnaW50XCI6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5iaWdpbnQ7XG4gICAgICAgIGNhc2UgXCJzeW1ib2xcIjpcbiAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLnN5bWJvbDtcbiAgICAgICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5hcnJheTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUubnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLnRoZW4gJiYgdHlwZW9mIGRhdGEudGhlbiA9PT0gXCJmdW5jdGlvblwiICYmIGRhdGEuY2F0Y2ggJiYgdHlwZW9mIGRhdGEuY2F0Y2ggPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLnByb21pc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIE1hcCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkYXRhIGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFpvZFBhcnNlZFR5cGUubWFwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBTZXQgIT09IFwidW5kZWZpbmVkXCIgJiYgZGF0YSBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLnNldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRGF0ZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkYXRhIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBab2RQYXJzZWRUeXBlLmRhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS5vYmplY3Q7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gWm9kUGFyc2VkVHlwZS51bmtub3duO1xuICAgIH1cbn07XG4iLCJpbXBvcnQgeyB1dGlsIH0gZnJvbSBcIi4vaGVscGVycy91dGlsLmpzXCI7XG5leHBvcnQgY29uc3QgWm9kSXNzdWVDb2RlID0gdXRpbC5hcnJheVRvRW51bShbXG4gICAgXCJpbnZhbGlkX3R5cGVcIixcbiAgICBcImludmFsaWRfbGl0ZXJhbFwiLFxuICAgIFwiY3VzdG9tXCIsXG4gICAgXCJpbnZhbGlkX3VuaW9uXCIsXG4gICAgXCJpbnZhbGlkX3VuaW9uX2Rpc2NyaW1pbmF0b3JcIixcbiAgICBcImludmFsaWRfZW51bV92YWx1ZVwiLFxuICAgIFwidW5yZWNvZ25pemVkX2tleXNcIixcbiAgICBcImludmFsaWRfYXJndW1lbnRzXCIsXG4gICAgXCJpbnZhbGlkX3JldHVybl90eXBlXCIsXG4gICAgXCJpbnZhbGlkX2RhdGVcIixcbiAgICBcImludmFsaWRfc3RyaW5nXCIsXG4gICAgXCJ0b29fc21hbGxcIixcbiAgICBcInRvb19iaWdcIixcbiAgICBcImludmFsaWRfaW50ZXJzZWN0aW9uX3R5cGVzXCIsXG4gICAgXCJub3RfbXVsdGlwbGVfb2ZcIixcbiAgICBcIm5vdF9maW5pdGVcIixcbl0pO1xuZXhwb3J0IGNvbnN0IHF1b3RlbGVzc0pzb24gPSAob2JqKSA9PiB7XG4gICAgY29uc3QganNvbiA9IEpTT04uc3RyaW5naWZ5KG9iaiwgbnVsbCwgMik7XG4gICAgcmV0dXJuIGpzb24ucmVwbGFjZSgvXCIoW15cIl0rKVwiOi9nLCBcIiQxOlwiKTtcbn07XG5leHBvcnQgY2xhc3MgWm9kRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgZ2V0IGVycm9ycygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNzdWVzO1xuICAgIH1cbiAgICBjb25zdHJ1Y3Rvcihpc3N1ZXMpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5pc3N1ZXMgPSBbXTtcbiAgICAgICAgdGhpcy5hZGRJc3N1ZSA9IChzdWIpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaXNzdWVzID0gWy4uLnRoaXMuaXNzdWVzLCBzdWJdO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmFkZElzc3VlcyA9IChzdWJzID0gW10pID0+IHtcbiAgICAgICAgICAgIHRoaXMuaXNzdWVzID0gWy4uLnRoaXMuaXNzdWVzLCAuLi5zdWJzXTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgYWN0dWFsUHJvdG8gPSBuZXcudGFyZ2V0LnByb3RvdHlwZTtcbiAgICAgICAgaWYgKE9iamVjdC5zZXRQcm90b3R5cGVPZikge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGJhbi9iYW5cbiAgICAgICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBhY3R1YWxQcm90byk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9fcHJvdG9fXyA9IGFjdHVhbFByb3RvO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubmFtZSA9IFwiWm9kRXJyb3JcIjtcbiAgICAgICAgdGhpcy5pc3N1ZXMgPSBpc3N1ZXM7XG4gICAgfVxuICAgIGZvcm1hdChfbWFwcGVyKSB7XG4gICAgICAgIGNvbnN0IG1hcHBlciA9IF9tYXBwZXIgfHxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChpc3N1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpc3N1ZS5tZXNzYWdlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZmllbGRFcnJvcnMgPSB7IF9lcnJvcnM6IFtdIH07XG4gICAgICAgIGNvbnN0IHByb2Nlc3NFcnJvciA9IChlcnJvcikgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBpc3N1ZSBvZiBlcnJvci5pc3N1ZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNzdWUuY29kZSA9PT0gXCJpbnZhbGlkX3VuaW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNzdWUudW5pb25FcnJvcnMubWFwKHByb2Nlc3NFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLmNvZGUgPT09IFwiaW52YWxpZF9yZXR1cm5fdHlwZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3NFcnJvcihpc3N1ZS5yZXR1cm5UeXBlRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS5jb2RlID09PSBcImludmFsaWRfYXJndW1lbnRzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc0Vycm9yKGlzc3VlLmFyZ3VtZW50c0Vycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoaXNzdWUucGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZmllbGRFcnJvcnMuX2Vycm9ycy5wdXNoKG1hcHBlcihpc3N1ZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnIgPSBmaWVsZEVycm9ycztcbiAgICAgICAgICAgICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaSA8IGlzc3VlLnBhdGgubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbCA9IGlzc3VlLnBhdGhbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXJtaW5hbCA9IGkgPT09IGlzc3VlLnBhdGgubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGVybWluYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyW2VsXSA9IGN1cnJbZWxdIHx8IHsgX2Vycm9yczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiAodHlwZW9mIGVsID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICBjdXJyW2VsXSA9IGN1cnJbZWxdIHx8IHsgX2Vycm9yczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB9IGVsc2UgaWYgKHR5cGVvZiBlbCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgY29uc3QgZXJyb3JBcnJheTogYW55ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICBlcnJvckFycmF5Ll9lcnJvcnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIGN1cnJbZWxdID0gY3VycltlbF0gfHwgZXJyb3JBcnJheTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyW2VsXSA9IGN1cnJbZWxdIHx8IHsgX2Vycm9yczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyW2VsXS5fZXJyb3JzLnB1c2gobWFwcGVyKGlzc3VlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyID0gY3VycltlbF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHByb2Nlc3NFcnJvcih0aGlzKTtcbiAgICAgICAgcmV0dXJuIGZpZWxkRXJyb3JzO1xuICAgIH1cbiAgICBzdGF0aWMgYXNzZXJ0KHZhbHVlKSB7XG4gICAgICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgWm9kRXJyb3IpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vdCBhIFpvZEVycm9yOiAke3ZhbHVlfWApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlO1xuICAgIH1cbiAgICBnZXQgbWVzc2FnZSgpIHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMuaXNzdWVzLCB1dGlsLmpzb25TdHJpbmdpZnlSZXBsYWNlciwgMik7XG4gICAgfVxuICAgIGdldCBpc0VtcHR5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc3N1ZXMubGVuZ3RoID09PSAwO1xuICAgIH1cbiAgICBmbGF0dGVuKG1hcHBlciA9IChpc3N1ZSkgPT4gaXNzdWUubWVzc2FnZSkge1xuICAgICAgICBjb25zdCBmaWVsZEVycm9ycyA9IHt9O1xuICAgICAgICBjb25zdCBmb3JtRXJyb3JzID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuaXNzdWVzKSB7XG4gICAgICAgICAgICBpZiAoc3ViLnBhdGgubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0RWwgPSBzdWIucGF0aFswXTtcbiAgICAgICAgICAgICAgICBmaWVsZEVycm9yc1tmaXJzdEVsXSA9IGZpZWxkRXJyb3JzW2ZpcnN0RWxdIHx8IFtdO1xuICAgICAgICAgICAgICAgIGZpZWxkRXJyb3JzW2ZpcnN0RWxdLnB1c2gobWFwcGVyKHN1YikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9ybUVycm9ycy5wdXNoKG1hcHBlcihzdWIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBmb3JtRXJyb3JzLCBmaWVsZEVycm9ycyB9O1xuICAgIH1cbiAgICBnZXQgZm9ybUVycm9ycygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZmxhdHRlbigpO1xuICAgIH1cbn1cblpvZEVycm9yLmNyZWF0ZSA9IChpc3N1ZXMpID0+IHtcbiAgICBjb25zdCBlcnJvciA9IG5ldyBab2RFcnJvcihpc3N1ZXMpO1xuICAgIHJldHVybiBlcnJvcjtcbn07XG4iLCJpbXBvcnQgeyBab2RJc3N1ZUNvZGUgfSBmcm9tIFwiLi4vWm9kRXJyb3IuanNcIjtcbmltcG9ydCB7IHV0aWwsIFpvZFBhcnNlZFR5cGUgfSBmcm9tIFwiLi4vaGVscGVycy91dGlsLmpzXCI7XG5jb25zdCBlcnJvck1hcCA9IChpc3N1ZSwgX2N0eCkgPT4ge1xuICAgIGxldCBtZXNzYWdlO1xuICAgIHN3aXRjaCAoaXNzdWUuY29kZSkge1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGU6XG4gICAgICAgICAgICBpZiAoaXNzdWUucmVjZWl2ZWQgPT09IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiUmVxdWlyZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgRXhwZWN0ZWQgJHtpc3N1ZS5leHBlY3RlZH0sIHJlY2VpdmVkICR7aXNzdWUucmVjZWl2ZWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX2xpdGVyYWw6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgbGl0ZXJhbCB2YWx1ZSwgZXhwZWN0ZWQgJHtKU09OLnN0cmluZ2lmeShpc3N1ZS5leHBlY3RlZCwgdXRpbC5qc29uU3RyaW5naWZ5UmVwbGFjZXIpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUudW5yZWNvZ25pemVkX2tleXM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYFVucmVjb2duaXplZCBrZXkocykgaW4gb2JqZWN0OiAke3V0aWwuam9pblZhbHVlcyhpc3N1ZS5rZXlzLCBcIiwgXCIpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbjpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dGA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF91bmlvbl9kaXNjcmltaW5hdG9yOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGRpc2NyaW1pbmF0b3IgdmFsdWUuIEV4cGVjdGVkICR7dXRpbC5qb2luVmFsdWVzKGlzc3VlLm9wdGlvbnMpfWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9lbnVtX3ZhbHVlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGVudW0gdmFsdWUuIEV4cGVjdGVkICR7dXRpbC5qb2luVmFsdWVzKGlzc3VlLm9wdGlvbnMpfSwgcmVjZWl2ZWQgJyR7aXNzdWUucmVjZWl2ZWR9J2A7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9hcmd1bWVudHM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgZnVuY3Rpb24gYXJndW1lbnRzYDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX3JldHVybl90eXBlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGZ1bmN0aW9uIHJldHVybiB0eXBlYDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5pbnZhbGlkX2RhdGU6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludmFsaWQgZGF0ZWA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmc6XG4gICAgICAgICAgICBpZiAodHlwZW9mIGlzc3VlLnZhbGlkYXRpb24gPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoXCJpbmNsdWRlc1wiIGluIGlzc3VlLnZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGlucHV0OiBtdXN0IGluY2x1ZGUgXCIke2lzc3VlLnZhbGlkYXRpb24uaW5jbHVkZXN9XCJgO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGlzc3VlLnZhbGlkYXRpb24ucG9zaXRpb24gPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgJHttZXNzYWdlfSBhdCBvbmUgb3IgbW9yZSBwb3NpdGlvbnMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvICR7aXNzdWUudmFsaWRhdGlvbi5wb3NpdGlvbn1gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwic3RhcnRzV2l0aFwiIGluIGlzc3VlLnZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBJbnZhbGlkIGlucHV0OiBtdXN0IHN0YXJ0IHdpdGggXCIke2lzc3VlLnZhbGlkYXRpb24uc3RhcnRzV2l0aH1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFwiZW5kc1dpdGhcIiBpbiBpc3N1ZS52YWxpZGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dDogbXVzdCBlbmQgd2l0aCBcIiR7aXNzdWUudmFsaWRhdGlvbi5lbmRzV2l0aH1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGlzc3VlLnZhbGlkYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnZhbGlkYXRpb24gIT09IFwicmVnZXhcIikge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCAke2lzc3VlLnZhbGlkYXRpb259YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkludmFsaWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS50b29fc21hbGw6XG4gICAgICAgICAgICBpZiAoaXNzdWUudHlwZSA9PT0gXCJhcnJheVwiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgQXJyYXkgbXVzdCBjb250YWluICR7aXNzdWUuZXhhY3QgPyBcImV4YWN0bHlcIiA6IGlzc3VlLmluY2x1c2l2ZSA/IGBhdCBsZWFzdGAgOiBgbW9yZSB0aGFuYH0gJHtpc3N1ZS5taW5pbXVtfSBlbGVtZW50KHMpYDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBTdHJpbmcgbXVzdCBjb250YWluICR7aXNzdWUuZXhhY3QgPyBcImV4YWN0bHlcIiA6IGlzc3VlLmluY2x1c2l2ZSA/IGBhdCBsZWFzdGAgOiBgb3ZlcmB9ICR7aXNzdWUubWluaW11bX0gY2hhcmFjdGVyKHMpYDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBOdW1iZXIgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHkgZXF1YWwgdG8gYCA6IGlzc3VlLmluY2x1c2l2ZSA/IGBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYCA6IGBncmVhdGVyIHRoYW4gYH0ke2lzc3VlLm1pbmltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiYmlnaW50XCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBOdW1iZXIgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHkgZXF1YWwgdG8gYCA6IGlzc3VlLmluY2x1c2l2ZSA/IGBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gYCA6IGBncmVhdGVyIHRoYW4gYH0ke2lzc3VlLm1pbmltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiZGF0ZVwiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgRGF0ZSBtdXN0IGJlICR7aXNzdWUuZXhhY3QgPyBgZXhhY3RseSBlcXVhbCB0byBgIDogaXNzdWUuaW5jbHVzaXZlID8gYGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byBgIDogYGdyZWF0ZXIgdGhhbiBgfSR7bmV3IERhdGUoTnVtYmVyKGlzc3VlLm1pbmltdW0pKX1gO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkludmFsaWQgaW5wdXRcIjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS50b29fYmlnOlxuICAgICAgICAgICAgaWYgKGlzc3VlLnR5cGUgPT09IFwiYXJyYXlcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYEFycmF5IG11c3QgY29udGFpbiAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGF0IG1vc3RgIDogYGxlc3MgdGhhbmB9ICR7aXNzdWUubWF4aW11bX0gZWxlbWVudChzKWA7XG4gICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS50eXBlID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBgU3RyaW5nIG11c3QgY29udGFpbiAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGF0IG1vc3RgIDogYHVuZGVyYH0gJHtpc3N1ZS5tYXhpbXVtfSBjaGFyYWN0ZXIocylgO1xuICAgICAgICAgICAgZWxzZSBpZiAoaXNzdWUudHlwZSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYE51bWJlciBtdXN0IGJlICR7aXNzdWUuZXhhY3QgPyBgZXhhY3RseWAgOiBpc3N1ZS5pbmNsdXNpdmUgPyBgbGVzcyB0aGFuIG9yIGVxdWFsIHRvYCA6IGBsZXNzIHRoYW5gfSAke2lzc3VlLm1heGltdW19YDtcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzc3VlLnR5cGUgPT09IFwiYmlnaW50XCIpXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IGBCaWdJbnQgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYGxlc3MgdGhhbiBvciBlcXVhbCB0b2AgOiBgbGVzcyB0aGFuYH0gJHtpc3N1ZS5tYXhpbXVtfWA7XG4gICAgICAgICAgICBlbHNlIGlmIChpc3N1ZS50eXBlID09PSBcImRhdGVcIilcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gYERhdGUgbXVzdCBiZSAke2lzc3VlLmV4YWN0ID8gYGV4YWN0bHlgIDogaXNzdWUuaW5jbHVzaXZlID8gYHNtYWxsZXIgdGhhbiBvciBlcXVhbCB0b2AgOiBgc21hbGxlciB0aGFuYH0gJHtuZXcgRGF0ZShOdW1iZXIoaXNzdWUubWF4aW11bSkpfWA7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IFwiSW52YWxpZCBpbnB1dFwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgWm9kSXNzdWVDb2RlLmN1c3RvbTpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgSW52YWxpZCBpbnB1dGA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBab2RJc3N1ZUNvZGUuaW52YWxpZF9pbnRlcnNlY3Rpb25fdHlwZXM6XG4gICAgICAgICAgICBtZXNzYWdlID0gYEludGVyc2VjdGlvbiByZXN1bHRzIGNvdWxkIG5vdCBiZSBtZXJnZWRgO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgWm9kSXNzdWVDb2RlLm5vdF9tdWx0aXBsZV9vZjpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgTnVtYmVyIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAke2lzc3VlLm11bHRpcGxlT2Z9YDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFpvZElzc3VlQ29kZS5ub3RfZmluaXRlOlxuICAgICAgICAgICAgbWVzc2FnZSA9IFwiTnVtYmVyIG11c3QgYmUgZmluaXRlXCI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBfY3R4LmRlZmF1bHRFcnJvcjtcbiAgICAgICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoaXNzdWUpO1xuICAgIH1cbiAgICByZXR1cm4geyBtZXNzYWdlIH07XG59O1xuZXhwb3J0IGRlZmF1bHQgZXJyb3JNYXA7XG4iLCJpbXBvcnQgZGVmYXVsdEVycm9yTWFwIGZyb20gXCIuL2xvY2FsZXMvZW4uanNcIjtcbmxldCBvdmVycmlkZUVycm9yTWFwID0gZGVmYXVsdEVycm9yTWFwO1xuZXhwb3J0IHsgZGVmYXVsdEVycm9yTWFwIH07XG5leHBvcnQgZnVuY3Rpb24gc2V0RXJyb3JNYXAobWFwKSB7XG4gICAgb3ZlcnJpZGVFcnJvck1hcCA9IG1hcDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRFcnJvck1hcCgpIHtcbiAgICByZXR1cm4gb3ZlcnJpZGVFcnJvck1hcDtcbn1cbiIsImltcG9ydCB7IGdldEVycm9yTWFwIH0gZnJvbSBcIi4uL2Vycm9ycy5qc1wiO1xuaW1wb3J0IGRlZmF1bHRFcnJvck1hcCBmcm9tIFwiLi4vbG9jYWxlcy9lbi5qc1wiO1xuZXhwb3J0IGNvbnN0IG1ha2VJc3N1ZSA9IChwYXJhbXMpID0+IHtcbiAgICBjb25zdCB7IGRhdGEsIHBhdGgsIGVycm9yTWFwcywgaXNzdWVEYXRhIH0gPSBwYXJhbXM7XG4gICAgY29uc3QgZnVsbFBhdGggPSBbLi4ucGF0aCwgLi4uKGlzc3VlRGF0YS5wYXRoIHx8IFtdKV07XG4gICAgY29uc3QgZnVsbElzc3VlID0ge1xuICAgICAgICAuLi5pc3N1ZURhdGEsXG4gICAgICAgIHBhdGg6IGZ1bGxQYXRoLFxuICAgIH07XG4gICAgaWYgKGlzc3VlRGF0YS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLmlzc3VlRGF0YSxcbiAgICAgICAgICAgIHBhdGg6IGZ1bGxQYXRoLFxuICAgICAgICAgICAgbWVzc2FnZTogaXNzdWVEYXRhLm1lc3NhZ2UsXG4gICAgICAgIH07XG4gICAgfVxuICAgIGxldCBlcnJvck1lc3NhZ2UgPSBcIlwiO1xuICAgIGNvbnN0IG1hcHMgPSBlcnJvck1hcHNcbiAgICAgICAgLmZpbHRlcigobSkgPT4gISFtKVxuICAgICAgICAuc2xpY2UoKVxuICAgICAgICAucmV2ZXJzZSgpO1xuICAgIGZvciAoY29uc3QgbWFwIG9mIG1hcHMpIHtcbiAgICAgICAgZXJyb3JNZXNzYWdlID0gbWFwKGZ1bGxJc3N1ZSwgeyBkYXRhLCBkZWZhdWx0RXJyb3I6IGVycm9yTWVzc2FnZSB9KS5tZXNzYWdlO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICAuLi5pc3N1ZURhdGEsXG4gICAgICAgIHBhdGg6IGZ1bGxQYXRoLFxuICAgICAgICBtZXNzYWdlOiBlcnJvck1lc3NhZ2UsXG4gICAgfTtcbn07XG5leHBvcnQgY29uc3QgRU1QVFlfUEFUSCA9IFtdO1xuZXhwb3J0IGZ1bmN0aW9uIGFkZElzc3VlVG9Db250ZXh0KGN0eCwgaXNzdWVEYXRhKSB7XG4gICAgY29uc3Qgb3ZlcnJpZGVNYXAgPSBnZXRFcnJvck1hcCgpO1xuICAgIGNvbnN0IGlzc3VlID0gbWFrZUlzc3VlKHtcbiAgICAgICAgaXNzdWVEYXRhOiBpc3N1ZURhdGEsXG4gICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgZXJyb3JNYXBzOiBbXG4gICAgICAgICAgICBjdHguY29tbW9uLmNvbnRleHR1YWxFcnJvck1hcCwgLy8gY29udGV4dHVhbCBlcnJvciBtYXAgaXMgZmlyc3QgcHJpb3JpdHlcbiAgICAgICAgICAgIGN0eC5zY2hlbWFFcnJvck1hcCwgLy8gdGhlbiBzY2hlbWEtYm91bmQgbWFwIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgb3ZlcnJpZGVNYXAsIC8vIHRoZW4gZ2xvYmFsIG92ZXJyaWRlIG1hcFxuICAgICAgICAgICAgb3ZlcnJpZGVNYXAgPT09IGRlZmF1bHRFcnJvck1hcCA/IHVuZGVmaW5lZCA6IGRlZmF1bHRFcnJvck1hcCwgLy8gdGhlbiBnbG9iYWwgZGVmYXVsdCBtYXBcbiAgICAgICAgXS5maWx0ZXIoKHgpID0+ICEheCksXG4gICAgfSk7XG4gICAgY3R4LmNvbW1vbi5pc3N1ZXMucHVzaChpc3N1ZSk7XG59XG5leHBvcnQgY2xhc3MgUGFyc2VTdGF0dXMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnZhbHVlID0gXCJ2YWxpZFwiO1xuICAgIH1cbiAgICBkaXJ0eSgpIHtcbiAgICAgICAgaWYgKHRoaXMudmFsdWUgPT09IFwidmFsaWRcIilcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBcImRpcnR5XCI7XG4gICAgfVxuICAgIGFib3J0KCkge1xuICAgICAgICBpZiAodGhpcy52YWx1ZSAhPT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gXCJhYm9ydGVkXCI7XG4gICAgfVxuICAgIHN0YXRpYyBtZXJnZUFycmF5KHN0YXR1cywgcmVzdWx0cykge1xuICAgICAgICBjb25zdCBhcnJheVZhbHVlID0gW107XG4gICAgICAgIGZvciAoY29uc3QgcyBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICBpZiAocy5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgaWYgKHMuc3RhdHVzID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICBhcnJheVZhbHVlLnB1c2gocy52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBhcnJheVZhbHVlIH07XG4gICAgfVxuICAgIHN0YXRpYyBhc3luYyBtZXJnZU9iamVjdEFzeW5jKHN0YXR1cywgcGFpcnMpIHtcbiAgICAgICAgY29uc3Qgc3luY1BhaXJzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gYXdhaXQgcGFpci5rZXk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IHBhaXIudmFsdWU7XG4gICAgICAgICAgICBzeW5jUGFpcnMucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlT2JqZWN0U3luYyhzdGF0dXMsIHN5bmNQYWlycyk7XG4gICAgfVxuICAgIHN0YXRpYyBtZXJnZU9iamVjdFN5bmMoc3RhdHVzLCBwYWlycykge1xuICAgICAgICBjb25zdCBmaW5hbE9iamVjdCA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHsga2V5LCB2YWx1ZSB9ID0gcGFpcjtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhdHVzID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgIGlmICh2YWx1ZS5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZS5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIGlmIChrZXkudmFsdWUgIT09IFwiX19wcm90b19fXCIgJiYgKHR5cGVvZiB2YWx1ZS52YWx1ZSAhPT0gXCJ1bmRlZmluZWRcIiB8fCBwYWlyLmFsd2F5c1NldCkpIHtcbiAgICAgICAgICAgICAgICBmaW5hbE9iamVjdFtrZXkudmFsdWVdID0gdmFsdWUudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBmaW5hbE9iamVjdCB9O1xuICAgIH1cbn1cbmV4cG9ydCBjb25zdCBJTlZBTElEID0gT2JqZWN0LmZyZWV6ZSh7XG4gICAgc3RhdHVzOiBcImFib3J0ZWRcIixcbn0pO1xuZXhwb3J0IGNvbnN0IERJUlRZID0gKHZhbHVlKSA9PiAoeyBzdGF0dXM6IFwiZGlydHlcIiwgdmFsdWUgfSk7XG5leHBvcnQgY29uc3QgT0sgPSAodmFsdWUpID0+ICh7IHN0YXR1czogXCJ2YWxpZFwiLCB2YWx1ZSB9KTtcbmV4cG9ydCBjb25zdCBpc0Fib3J0ZWQgPSAoeCkgPT4geC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiO1xuZXhwb3J0IGNvbnN0IGlzRGlydHkgPSAoeCkgPT4geC5zdGF0dXMgPT09IFwiZGlydHlcIjtcbmV4cG9ydCBjb25zdCBpc1ZhbGlkID0gKHgpID0+IHguc3RhdHVzID09PSBcInZhbGlkXCI7XG5leHBvcnQgY29uc3QgaXNBc3luYyA9ICh4KSA9PiB0eXBlb2YgUHJvbWlzZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB4IGluc3RhbmNlb2YgUHJvbWlzZTtcbiIsImV4cG9ydCB7fTtcbiIsImV4cG9ydCB2YXIgZXJyb3JVdGlsO1xuKGZ1bmN0aW9uIChlcnJvclV0aWwpIHtcbiAgICBlcnJvclV0aWwuZXJyVG9PYmogPSAobWVzc2FnZSkgPT4gdHlwZW9mIG1lc3NhZ2UgPT09IFwic3RyaW5nXCIgPyB7IG1lc3NhZ2UgfSA6IG1lc3NhZ2UgfHwge307XG4gICAgLy8gYmlvbWUtaWdub3JlIGxpbnQ6XG4gICAgZXJyb3JVdGlsLnRvU3RyaW5nID0gKG1lc3NhZ2UpID0+IHR5cGVvZiBtZXNzYWdlID09PSBcInN0cmluZ1wiID8gbWVzc2FnZSA6IG1lc3NhZ2U/Lm1lc3NhZ2U7XG59KShlcnJvclV0aWwgfHwgKGVycm9yVXRpbCA9IHt9KSk7XG4iLCJpbXBvcnQgeyBab2RFcnJvciwgWm9kSXNzdWVDb2RlLCB9IGZyb20gXCIuL1pvZEVycm9yLmpzXCI7XG5pbXBvcnQgeyBkZWZhdWx0RXJyb3JNYXAsIGdldEVycm9yTWFwIH0gZnJvbSBcIi4vZXJyb3JzLmpzXCI7XG5pbXBvcnQgeyBlcnJvclV0aWwgfSBmcm9tIFwiLi9oZWxwZXJzL2Vycm9yVXRpbC5qc1wiO1xuaW1wb3J0IHsgRElSVFksIElOVkFMSUQsIE9LLCBQYXJzZVN0YXR1cywgYWRkSXNzdWVUb0NvbnRleHQsIGlzQWJvcnRlZCwgaXNBc3luYywgaXNEaXJ0eSwgaXNWYWxpZCwgbWFrZUlzc3VlLCB9IGZyb20gXCIuL2hlbHBlcnMvcGFyc2VVdGlsLmpzXCI7XG5pbXBvcnQgeyB1dGlsLCBab2RQYXJzZWRUeXBlLCBnZXRQYXJzZWRUeXBlIH0gZnJvbSBcIi4vaGVscGVycy91dGlsLmpzXCI7XG5jbGFzcyBQYXJzZUlucHV0TGF6eVBhdGgge1xuICAgIGNvbnN0cnVjdG9yKHBhcmVudCwgdmFsdWUsIHBhdGgsIGtleSkge1xuICAgICAgICB0aGlzLl9jYWNoZWRQYXRoID0gW107XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgICAgICB0aGlzLmRhdGEgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fcGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMuX2tleSA9IGtleTtcbiAgICB9XG4gICAgZ2V0IHBhdGgoKSB7XG4gICAgICAgIGlmICghdGhpcy5fY2FjaGVkUGF0aC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMuX2tleSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWNoZWRQYXRoLnB1c2goLi4udGhpcy5fcGF0aCwgLi4udGhpcy5fa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX2NhY2hlZFBhdGgucHVzaCguLi50aGlzLl9wYXRoLCB0aGlzLl9rZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9jYWNoZWRQYXRoO1xuICAgIH1cbn1cbmNvbnN0IGhhbmRsZVJlc3VsdCA9IChjdHgsIHJlc3VsdCkgPT4ge1xuICAgIGlmIChpc1ZhbGlkKHJlc3VsdCkpIHtcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0LnZhbHVlIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAoIWN0eC5jb21tb24uaXNzdWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFsaWRhdGlvbiBmYWlsZWQgYnV0IG5vIGlzc3VlcyBkZXRlY3RlZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZ2V0IGVycm9yKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9lcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2Vycm9yO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IFpvZEVycm9yKGN0eC5jb21tb24uaXNzdWVzKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9lcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9lcnJvcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxufTtcbmZ1bmN0aW9uIHByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSB7XG4gICAgaWYgKCFwYXJhbXMpXG4gICAgICAgIHJldHVybiB7fTtcbiAgICBjb25zdCB7IGVycm9yTWFwLCBpbnZhbGlkX3R5cGVfZXJyb3IsIHJlcXVpcmVkX2Vycm9yLCBkZXNjcmlwdGlvbiB9ID0gcGFyYW1zO1xuICAgIGlmIChlcnJvck1hcCAmJiAoaW52YWxpZF90eXBlX2Vycm9yIHx8IHJlcXVpcmVkX2Vycm9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbid0IHVzZSBcImludmFsaWRfdHlwZV9lcnJvclwiIG9yIFwicmVxdWlyZWRfZXJyb3JcIiBpbiBjb25qdW5jdGlvbiB3aXRoIGN1c3RvbSBlcnJvciBtYXAuYCk7XG4gICAgfVxuICAgIGlmIChlcnJvck1hcClcbiAgICAgICAgcmV0dXJuIHsgZXJyb3JNYXA6IGVycm9yTWFwLCBkZXNjcmlwdGlvbiB9O1xuICAgIGNvbnN0IGN1c3RvbU1hcCA9IChpc3MsIGN0eCkgPT4ge1xuICAgICAgICBjb25zdCB7IG1lc3NhZ2UgfSA9IHBhcmFtcztcbiAgICAgICAgaWYgKGlzcy5jb2RlID09PSBcImludmFsaWRfZW51bV92YWx1ZVwiKSB7XG4gICAgICAgICAgICByZXR1cm4geyBtZXNzYWdlOiBtZXNzYWdlID8/IGN0eC5kZWZhdWx0RXJyb3IgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGN0eC5kYXRhID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICByZXR1cm4geyBtZXNzYWdlOiBtZXNzYWdlID8/IHJlcXVpcmVkX2Vycm9yID8/IGN0eC5kZWZhdWx0RXJyb3IgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNzLmNvZGUgIT09IFwiaW52YWxpZF90eXBlXCIpXG4gICAgICAgICAgICByZXR1cm4geyBtZXNzYWdlOiBjdHguZGVmYXVsdEVycm9yIH07XG4gICAgICAgIHJldHVybiB7IG1lc3NhZ2U6IG1lc3NhZ2UgPz8gaW52YWxpZF90eXBlX2Vycm9yID8/IGN0eC5kZWZhdWx0RXJyb3IgfTtcbiAgICB9O1xuICAgIHJldHVybiB7IGVycm9yTWFwOiBjdXN0b21NYXAsIGRlc2NyaXB0aW9uIH07XG59XG5leHBvcnQgY2xhc3MgWm9kVHlwZSB7XG4gICAgZ2V0IGRlc2NyaXB0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmRlc2NyaXB0aW9uO1xuICAgIH1cbiAgICBfZ2V0VHlwZShpbnB1dCkge1xuICAgICAgICByZXR1cm4gZ2V0UGFyc2VkVHlwZShpbnB1dC5kYXRhKTtcbiAgICB9XG4gICAgX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpIHtcbiAgICAgICAgcmV0dXJuIChjdHggfHwge1xuICAgICAgICAgICAgY29tbW9uOiBpbnB1dC5wYXJlbnQuY29tbW9uLFxuICAgICAgICAgICAgZGF0YTogaW5wdXQuZGF0YSxcbiAgICAgICAgICAgIHBhcnNlZFR5cGU6IGdldFBhcnNlZFR5cGUoaW5wdXQuZGF0YSksXG4gICAgICAgICAgICBzY2hlbWFFcnJvck1hcDogdGhpcy5fZGVmLmVycm9yTWFwLFxuICAgICAgICAgICAgcGF0aDogaW5wdXQucGF0aCxcbiAgICAgICAgICAgIHBhcmVudDogaW5wdXQucGFyZW50LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhdHVzOiBuZXcgUGFyc2VTdGF0dXMoKSxcbiAgICAgICAgICAgIGN0eDoge1xuICAgICAgICAgICAgICAgIGNvbW1vbjogaW5wdXQucGFyZW50LmNvbW1vbixcbiAgICAgICAgICAgICAgICBkYXRhOiBpbnB1dC5kYXRhLFxuICAgICAgICAgICAgICAgIHBhcnNlZFR5cGU6IGdldFBhcnNlZFR5cGUoaW5wdXQuZGF0YSksXG4gICAgICAgICAgICAgICAgc2NoZW1hRXJyb3JNYXA6IHRoaXMuX2RlZi5lcnJvck1hcCxcbiAgICAgICAgICAgICAgICBwYXRoOiBpbnB1dC5wYXRoLFxuICAgICAgICAgICAgICAgIHBhcmVudDogaW5wdXQucGFyZW50LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgX3BhcnNlU3luYyhpbnB1dCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9wYXJzZShpbnB1dCk7XG4gICAgICAgIGlmIChpc0FzeW5jKHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlN5bmNocm9ub3VzIHBhcnNlIGVuY291bnRlcmVkIHByb21pc2UuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIF9wYXJzZUFzeW5jKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX3BhcnNlKGlucHV0KTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuICAgIH1cbiAgICBwYXJzZShkYXRhLCBwYXJhbXMpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5zYWZlUGFyc2UoZGF0YSwgcGFyYW1zKTtcbiAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5kYXRhO1xuICAgICAgICB0aHJvdyByZXN1bHQuZXJyb3I7XG4gICAgfVxuICAgIHNhZmVQYXJzZShkYXRhLCBwYXJhbXMpIHtcbiAgICAgICAgY29uc3QgY3R4ID0ge1xuICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICBhc3luYzogcGFyYW1zPy5hc3luYyA/PyBmYWxzZSxcbiAgICAgICAgICAgICAgICBjb250ZXh0dWFsRXJyb3JNYXA6IHBhcmFtcz8uZXJyb3JNYXAsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGF0aDogcGFyYW1zPy5wYXRoIHx8IFtdLFxuICAgICAgICAgICAgc2NoZW1hRXJyb3JNYXA6IHRoaXMuX2RlZi5lcnJvck1hcCxcbiAgICAgICAgICAgIHBhcmVudDogbnVsbCxcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICBwYXJzZWRUeXBlOiBnZXRQYXJzZWRUeXBlKGRhdGEpLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9wYXJzZVN5bmMoeyBkYXRhLCBwYXRoOiBjdHgucGF0aCwgcGFyZW50OiBjdHggfSk7XG4gICAgICAgIHJldHVybiBoYW5kbGVSZXN1bHQoY3R4LCByZXN1bHQpO1xuICAgIH1cbiAgICBcIn52YWxpZGF0ZVwiKGRhdGEpIHtcbiAgICAgICAgY29uc3QgY3R4ID0ge1xuICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICBhc3luYzogISF0aGlzW1wifnN0YW5kYXJkXCJdLmFzeW5jLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdGg6IFtdLFxuICAgICAgICAgICAgc2NoZW1hRXJyb3JNYXA6IHRoaXMuX2RlZi5lcnJvck1hcCxcbiAgICAgICAgICAgIHBhcmVudDogbnVsbCxcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICBwYXJzZWRUeXBlOiBnZXRQYXJzZWRUeXBlKGRhdGEpLFxuICAgICAgICB9O1xuICAgICAgICBpZiAoIXRoaXNbXCJ+c3RhbmRhcmRcIl0uYXN5bmMpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fcGFyc2VTeW5jKHsgZGF0YSwgcGF0aDogW10sIHBhcmVudDogY3R4IH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBpc1ZhbGlkKHJlc3VsdClcbiAgICAgICAgICAgICAgICAgICAgPyB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcmVzdWx0LnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiBjdHguY29tbW9uLmlzc3VlcyxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyPy5tZXNzYWdlPy50b0xvd2VyQ2FzZSgpPy5pbmNsdWRlcyhcImVuY291bnRlcmVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbXCJ+c3RhbmRhcmRcIl0uYXN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdHguY29tbW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBhc3luYzogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXJzZUFzeW5jKHsgZGF0YSwgcGF0aDogW10sIHBhcmVudDogY3R4IH0pLnRoZW4oKHJlc3VsdCkgPT4gaXNWYWxpZChyZXN1bHQpXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogcmVzdWx0LnZhbHVlLFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgOiB7XG4gICAgICAgICAgICAgICAgaXNzdWVzOiBjdHguY29tbW9uLmlzc3VlcyxcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbiAgICBhc3luYyBwYXJzZUFzeW5jKGRhdGEsIHBhcmFtcykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNhZmVQYXJzZUFzeW5jKGRhdGEsIHBhcmFtcyk7XG4gICAgICAgIGlmIChyZXN1bHQuc3VjY2VzcylcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgICAgICAgdGhyb3cgcmVzdWx0LmVycm9yO1xuICAgIH1cbiAgICBhc3luYyBzYWZlUGFyc2VBc3luYyhkYXRhLCBwYXJhbXMpIHtcbiAgICAgICAgY29uc3QgY3R4ID0ge1xuICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICBjb250ZXh0dWFsRXJyb3JNYXA6IHBhcmFtcz8uZXJyb3JNYXAsXG4gICAgICAgICAgICAgICAgYXN5bmM6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGF0aDogcGFyYW1zPy5wYXRoIHx8IFtdLFxuICAgICAgICAgICAgc2NoZW1hRXJyb3JNYXA6IHRoaXMuX2RlZi5lcnJvck1hcCxcbiAgICAgICAgICAgIHBhcmVudDogbnVsbCxcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICBwYXJzZWRUeXBlOiBnZXRQYXJzZWRUeXBlKGRhdGEpLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBtYXliZUFzeW5jUmVzdWx0ID0gdGhpcy5fcGFyc2UoeyBkYXRhLCBwYXRoOiBjdHgucGF0aCwgcGFyZW50OiBjdHggfSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IChpc0FzeW5jKG1heWJlQXN5bmNSZXN1bHQpID8gbWF5YmVBc3luY1Jlc3VsdCA6IFByb21pc2UucmVzb2x2ZShtYXliZUFzeW5jUmVzdWx0KSk7XG4gICAgICAgIHJldHVybiBoYW5kbGVSZXN1bHQoY3R4LCByZXN1bHQpO1xuICAgIH1cbiAgICByZWZpbmUoY2hlY2ssIG1lc3NhZ2UpIHtcbiAgICAgICAgY29uc3QgZ2V0SXNzdWVQcm9wZXJ0aWVzID0gKHZhbCkgPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiBtZXNzYWdlID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG1lc3NhZ2UgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBtZXNzYWdlKHZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZmluZW1lbnQoKHZhbCwgY3R4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBjaGVjayh2YWwpO1xuICAgICAgICAgICAgY29uc3Qgc2V0RXJyb3IgPSAoKSA9PiBjdHguYWRkSXNzdWUoe1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5jdXN0b20sXG4gICAgICAgICAgICAgICAgLi4uZ2V0SXNzdWVQcm9wZXJ0aWVzKHZhbCksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgUHJvbWlzZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiByZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0RXJyb3IoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHNldEVycm9yKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZWZpbmVtZW50KGNoZWNrLCByZWZpbmVtZW50RGF0YSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVmaW5lbWVudCgodmFsLCBjdHgpID0+IHtcbiAgICAgICAgICAgIGlmICghY2hlY2sodmFsKSkge1xuICAgICAgICAgICAgICAgIGN0eC5hZGRJc3N1ZSh0eXBlb2YgcmVmaW5lbWVudERhdGEgPT09IFwiZnVuY3Rpb25cIiA/IHJlZmluZW1lbnREYXRhKHZhbCwgY3R4KSA6IHJlZmluZW1lbnREYXRhKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9yZWZpbmVtZW50KHJlZmluZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RFZmZlY3RzKHtcbiAgICAgICAgICAgIHNjaGVtYTogdGhpcyxcbiAgICAgICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRWZmZWN0cyxcbiAgICAgICAgICAgIGVmZmVjdDogeyB0eXBlOiBcInJlZmluZW1lbnRcIiwgcmVmaW5lbWVudCB9LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgc3VwZXJSZWZpbmUocmVmaW5lbWVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVmaW5lbWVudChyZWZpbmVtZW50KTtcbiAgICB9XG4gICAgY29uc3RydWN0b3IoZGVmKSB7XG4gICAgICAgIC8qKiBBbGlhcyBvZiBzYWZlUGFyc2VBc3luYyAqL1xuICAgICAgICB0aGlzLnNwYSA9IHRoaXMuc2FmZVBhcnNlQXN5bmM7XG4gICAgICAgIHRoaXMuX2RlZiA9IGRlZjtcbiAgICAgICAgdGhpcy5wYXJzZSA9IHRoaXMucGFyc2UuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zYWZlUGFyc2UgPSB0aGlzLnNhZmVQYXJzZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnBhcnNlQXN5bmMgPSB0aGlzLnBhcnNlQXN5bmMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zYWZlUGFyc2VBc3luYyA9IHRoaXMuc2FmZVBhcnNlQXN5bmMuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5zcGEgPSB0aGlzLnNwYS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnJlZmluZSA9IHRoaXMucmVmaW5lLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucmVmaW5lbWVudCA9IHRoaXMucmVmaW5lbWVudC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLnN1cGVyUmVmaW5lID0gdGhpcy5zdXBlclJlZmluZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLm9wdGlvbmFsID0gdGhpcy5vcHRpb25hbC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLm51bGxhYmxlID0gdGhpcy5udWxsYWJsZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLm51bGxpc2ggPSB0aGlzLm51bGxpc2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5hcnJheSA9IHRoaXMuYXJyYXkuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5wcm9taXNlID0gdGhpcy5wcm9taXNlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMub3IgPSB0aGlzLm9yLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuYW5kID0gdGhpcy5hbmQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0gPSB0aGlzLnRyYW5zZm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmJyYW5kID0gdGhpcy5icmFuZC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmRlZmF1bHQgPSB0aGlzLmRlZmF1bHQuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jYXRjaCA9IHRoaXMuY2F0Y2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZXNjcmliZSA9IHRoaXMuZGVzY3JpYmUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5waXBlID0gdGhpcy5waXBlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMucmVhZG9ubHkgPSB0aGlzLnJlYWRvbmx5LmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuaXNOdWxsYWJsZSA9IHRoaXMuaXNOdWxsYWJsZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmlzT3B0aW9uYWwgPSB0aGlzLmlzT3B0aW9uYWwuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpc1tcIn5zdGFuZGFyZFwiXSA9IHtcbiAgICAgICAgICAgIHZlcnNpb246IDEsXG4gICAgICAgICAgICB2ZW5kb3I6IFwiem9kXCIsXG4gICAgICAgICAgICB2YWxpZGF0ZTogKGRhdGEpID0+IHRoaXNbXCJ+dmFsaWRhdGVcIl0oZGF0YSksXG4gICAgICAgIH07XG4gICAgfVxuICAgIG9wdGlvbmFsKCkge1xuICAgICAgICByZXR1cm4gWm9kT3B0aW9uYWwuY3JlYXRlKHRoaXMsIHRoaXMuX2RlZik7XG4gICAgfVxuICAgIG51bGxhYmxlKCkge1xuICAgICAgICByZXR1cm4gWm9kTnVsbGFibGUuY3JlYXRlKHRoaXMsIHRoaXMuX2RlZik7XG4gICAgfVxuICAgIG51bGxpc2goKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm51bGxhYmxlKCkub3B0aW9uYWwoKTtcbiAgICB9XG4gICAgYXJyYXkoKSB7XG4gICAgICAgIHJldHVybiBab2RBcnJheS5jcmVhdGUodGhpcyk7XG4gICAgfVxuICAgIHByb21pc2UoKSB7XG4gICAgICAgIHJldHVybiBab2RQcm9taXNlLmNyZWF0ZSh0aGlzLCB0aGlzLl9kZWYpO1xuICAgIH1cbiAgICBvcihvcHRpb24pIHtcbiAgICAgICAgcmV0dXJuIFpvZFVuaW9uLmNyZWF0ZShbdGhpcywgb3B0aW9uXSwgdGhpcy5fZGVmKTtcbiAgICB9XG4gICAgYW5kKGluY29taW5nKSB7XG4gICAgICAgIHJldHVybiBab2RJbnRlcnNlY3Rpb24uY3JlYXRlKHRoaXMsIGluY29taW5nLCB0aGlzLl9kZWYpO1xuICAgIH1cbiAgICB0cmFuc2Zvcm0odHJhbnNmb3JtKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kRWZmZWN0cyh7XG4gICAgICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHRoaXMuX2RlZiksXG4gICAgICAgICAgICBzY2hlbWE6IHRoaXMsXG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVmZmVjdHMsXG4gICAgICAgICAgICBlZmZlY3Q6IHsgdHlwZTogXCJ0cmFuc2Zvcm1cIiwgdHJhbnNmb3JtIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkZWZhdWx0KGRlZikge1xuICAgICAgICBjb25zdCBkZWZhdWx0VmFsdWVGdW5jID0gdHlwZW9mIGRlZiA9PT0gXCJmdW5jdGlvblwiID8gZGVmIDogKCkgPT4gZGVmO1xuICAgICAgICByZXR1cm4gbmV3IFpvZERlZmF1bHQoe1xuICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyh0aGlzLl9kZWYpLFxuICAgICAgICAgICAgaW5uZXJUeXBlOiB0aGlzLFxuICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBkZWZhdWx0VmFsdWVGdW5jLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2REZWZhdWx0LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgYnJhbmQoKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kQnJhbmRlZCh7XG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEJyYW5kZWQsXG4gICAgICAgICAgICB0eXBlOiB0aGlzLFxuICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyh0aGlzLl9kZWYpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgY2F0Y2goZGVmKSB7XG4gICAgICAgIGNvbnN0IGNhdGNoVmFsdWVGdW5jID0gdHlwZW9mIGRlZiA9PT0gXCJmdW5jdGlvblwiID8gZGVmIDogKCkgPT4gZGVmO1xuICAgICAgICByZXR1cm4gbmV3IFpvZENhdGNoKHtcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXModGhpcy5fZGVmKSxcbiAgICAgICAgICAgIGlubmVyVHlwZTogdGhpcyxcbiAgICAgICAgICAgIGNhdGNoVmFsdWU6IGNhdGNoVmFsdWVGdW5jLFxuICAgICAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RDYXRjaCxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGRlc2NyaWJlKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIGNvbnN0IFRoaXMgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgICByZXR1cm4gbmV3IFRoaXMoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBwaXBlKHRhcmdldCkge1xuICAgICAgICByZXR1cm4gWm9kUGlwZWxpbmUuY3JlYXRlKHRoaXMsIHRhcmdldCk7XG4gICAgfVxuICAgIHJlYWRvbmx5KCkge1xuICAgICAgICByZXR1cm4gWm9kUmVhZG9ubHkuY3JlYXRlKHRoaXMpO1xuICAgIH1cbiAgICBpc09wdGlvbmFsKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zYWZlUGFyc2UodW5kZWZpbmVkKS5zdWNjZXNzO1xuICAgIH1cbiAgICBpc051bGxhYmxlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zYWZlUGFyc2UobnVsbCkuc3VjY2VzcztcbiAgICB9XG59XG5jb25zdCBjdWlkUmVnZXggPSAvXmNbXlxccy1dezgsfSQvaTtcbmNvbnN0IGN1aWQyUmVnZXggPSAvXlswLTlhLXpdKyQvO1xuY29uc3QgdWxpZFJlZ2V4ID0gL15bMC05QS1ISktNTlAtVFYtWl17MjZ9JC9pO1xuLy8gY29uc3QgdXVpZFJlZ2V4ID1cbi8vICAgL14oW2EtZjAtOV17OH0tW2EtZjAtOV17NH0tWzEtNV1bYS1mMC05XXszfS1bYS1mMC05XXs0fS1bYS1mMC05XXsxMn18MDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwKSQvaTtcbmNvbnN0IHV1aWRSZWdleCA9IC9eWzAtOWEtZkEtRl17OH1cXGItWzAtOWEtZkEtRl17NH1cXGItWzAtOWEtZkEtRl17NH1cXGItWzAtOWEtZkEtRl17NH1cXGItWzAtOWEtZkEtRl17MTJ9JC9pO1xuY29uc3QgbmFub2lkUmVnZXggPSAvXlthLXowLTlfLV17MjF9JC9pO1xuY29uc3Qgand0UmVnZXggPSAvXltBLVphLXowLTktX10rXFwuW0EtWmEtejAtOS1fXStcXC5bQS1aYS16MC05LV9dKiQvO1xuY29uc3QgZHVyYXRpb25SZWdleCA9IC9eWy0rXT9QKD8hJCkoPzooPzpbLStdP1xcZCtZKXwoPzpbLStdP1xcZCtbLixdXFxkK1kkKSk/KD86KD86Wy0rXT9cXGQrTSl8KD86Wy0rXT9cXGQrWy4sXVxcZCtNJCkpPyg/Oig/OlstK10/XFxkK1cpfCg/OlstK10/XFxkK1suLF1cXGQrVyQpKT8oPzooPzpbLStdP1xcZCtEKXwoPzpbLStdP1xcZCtbLixdXFxkK0QkKSk/KD86VCg/PVtcXGQrLV0pKD86KD86Wy0rXT9cXGQrSCl8KD86Wy0rXT9cXGQrWy4sXVxcZCtIJCkpPyg/Oig/OlstK10/XFxkK00pfCg/OlstK10/XFxkK1suLF1cXGQrTSQpKT8oPzpbLStdP1xcZCsoPzpbLixdXFxkKyk/Uyk/KT8/JC87XG4vLyBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS80NjE4MS8xNTUwMTU1XG4vLyBvbGQgdmVyc2lvbjogdG9vIHNsb3csIGRpZG4ndCBzdXBwb3J0IHVuaWNvZGVcbi8vIGNvbnN0IGVtYWlsUmVnZXggPSAvXigoKFthLXpdfFxcZHxbISNcXCQlJidcXCpcXCtcXC1cXC89XFw/XFxeX2B7XFx8fX5dfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSsoXFwuKFthLXpdfFxcZHxbISNcXCQlJidcXCpcXCtcXC1cXC89XFw/XFxeX2B7XFx8fX5dfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSspKil8KChcXHgyMikoKCgoXFx4MjB8XFx4MDkpKihcXHgwZFxceDBhKSk/KFxceDIwfFxceDA5KSspPygoW1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4N2ZdfFxceDIxfFtcXHgyMy1cXHg1Yl18W1xceDVkLVxceDdlXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KFxcXFwoW1xceDAxLVxceDA5XFx4MGJcXHgwY1xceDBkLVxceDdmXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKSkqKCgoXFx4MjB8XFx4MDkpKihcXHgwZFxceDBhKSk/KFxceDIwfFxceDA5KSspPyhcXHgyMikpKUAoKChbYS16XXxcXGR8W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCgoW2Etel18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKShbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSooW2Etel18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuKSsoKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKShbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSooW2Etel18W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pKSkkL2k7XG4vL29sZCBlbWFpbCByZWdleFxuLy8gY29uc3QgZW1haWxSZWdleCA9IC9eKChbXjw+KClbXFxdLiw7Olxcc0BcIl0rKFxcLltePD4oKVtcXF0uLDs6XFxzQFwiXSspKil8KFwiLitcIikpQCgoPyEtKShbXjw+KClbXFxdLiw7Olxcc0BcIl0rXFwuKStbXjw+KClbXFxdLiw7Olxcc0BcIl17MSx9KVteLTw+KClbXFxdLiw7Olxcc0BcIl0kL2k7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbi8vIGNvbnN0IGVtYWlsUmVnZXggPVxuLy8gICAvXigoW148PigpW1xcXVxcXFwuLDs6XFxzQFxcXCJdKyhcXC5bXjw+KClbXFxdXFxcXC4sOzpcXHNAXFxcIl0rKSopfChcXFwiLitcXFwiKSlAKChcXFsoKCgyNVswLTVdKXwoMlswLTRdWzAtOV0pfCgxWzAtOV17Mn0pfChbMC05XXsxLDJ9KSlcXC4pezN9KCgyNVswLTVdKXwoMlswLTRdWzAtOV0pfCgxWzAtOV17Mn0pfChbMC05XXsxLDJ9KSlcXF0pfChcXFtJUHY2OigoW2EtZjAtOV17MSw0fTopezd9fDo6KFthLWYwLTldezEsNH06KXswLDZ9fChbYS1mMC05XXsxLDR9Oil7MX06KFthLWYwLTldezEsNH06KXswLDV9fChbYS1mMC05XXsxLDR9Oil7Mn06KFthLWYwLTldezEsNH06KXswLDR9fChbYS1mMC05XXsxLDR9Oil7M306KFthLWYwLTldezEsNH06KXswLDN9fChbYS1mMC05XXsxLDR9Oil7NH06KFthLWYwLTldezEsNH06KXswLDJ9fChbYS1mMC05XXsxLDR9Oil7NX06KFthLWYwLTldezEsNH06KXswLDF9KShbYS1mMC05XXsxLDR9fCgoKDI1WzAtNV0pfCgyWzAtNF1bMC05XSl8KDFbMC05XXsyfSl8KFswLTldezEsMn0pKVxcLil7M30oKDI1WzAtNV0pfCgyWzAtNF1bMC05XSl8KDFbMC05XXsyfSl8KFswLTldezEsMn0pKSlcXF0pfChbQS1aYS16MC05XShbQS1aYS16MC05LV0qW0EtWmEtejAtOV0pKihcXC5bQS1aYS16XXsyLH0pKykpJC87XG4vLyBjb25zdCBlbWFpbFJlZ2V4ID1cbi8vICAgL15bYS16QS1aMC05XFwuXFwhXFwjXFwkXFwlXFwmXFwnXFwqXFwrXFwvXFw9XFw/XFxeXFxfXFxgXFx7XFx8XFx9XFx+XFwtXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSokLztcbi8vIGNvbnN0IGVtYWlsUmVnZXggPVxuLy8gICAvXig/OlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSsoPzpcXC5bYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKSp8XCIoPzpbXFx4MDEtXFx4MDhcXHgwYlxceDBjXFx4MGUtXFx4MWZcXHgyMVxceDIzLVxceDViXFx4NWQtXFx4N2ZdfFxcXFxbXFx4MDEtXFx4MDlcXHgwYlxceDBjXFx4MGUtXFx4N2ZdKSpcIilAKD86KD86W2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP1xcLikrW2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP3xcXFsoPzooPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldP3xbYS16MC05LV0qW2EtejAtOV06KD86W1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4MjEtXFx4NWFcXHg1My1cXHg3Zl18XFxcXFtcXHgwMS1cXHgwOVxceDBiXFx4MGNcXHgwZS1cXHg3Zl0pKylcXF0pJC9pO1xuY29uc3QgZW1haWxSZWdleCA9IC9eKD8hXFwuKSg/IS4qXFwuXFwuKShbQS1aMC05XycrXFwtXFwuXSopW0EtWjAtOV8rLV1AKFtBLVowLTldW0EtWjAtOVxcLV0qXFwuKStbQS1aXXsyLH0kL2k7XG4vLyBjb25zdCBlbWFpbFJlZ2V4ID1cbi8vICAgL15bYS16MC05LiEjJCUm4oCZKisvPT9eX2B7fH1+LV0rQFthLXowLTktXSsoPzpcXC5bYS16MC05XFwtXSspKiQvaTtcbi8vIGZyb20gaHR0cHM6Ly90aGVrZXZpbnNjb3R0LmNvbS9lbW9qaXMtaW4tamF2YXNjcmlwdC8jd3JpdGluZy1hLXJlZ3VsYXItZXhwcmVzc2lvblxuY29uc3QgX2Vtb2ppUmVnZXggPSBgXihcXFxccHtFeHRlbmRlZF9QaWN0b2dyYXBoaWN9fFxcXFxwe0Vtb2ppX0NvbXBvbmVudH0pKyRgO1xubGV0IGVtb2ppUmVnZXg7XG4vLyBmYXN0ZXIsIHNpbXBsZXIsIHNhZmVyXG5jb25zdCBpcHY0UmVnZXggPSAvXig/Oig/OjI1WzAtNV18MlswLTRdWzAtOV18MVswLTldWzAtOV18WzEtOV1bMC05XXxbMC05XSlcXC4pezN9KD86MjVbMC01XXwyWzAtNF1bMC05XXwxWzAtOV1bMC05XXxbMS05XVswLTldfFswLTldKSQvO1xuY29uc3QgaXB2NENpZHJSZWdleCA9IC9eKD86KD86MjVbMC01XXwyWzAtNF1bMC05XXwxWzAtOV1bMC05XXxbMS05XVswLTldfFswLTldKVxcLil7M30oPzoyNVswLTVdfDJbMC00XVswLTldfDFbMC05XVswLTldfFsxLTldWzAtOV18WzAtOV0pXFwvKDNbMC0yXXxbMTJdP1swLTldKSQvO1xuLy8gY29uc3QgaXB2NlJlZ2V4ID1cbi8vIC9eKChbYS1mMC05XXsxLDR9Oil7N318OjooW2EtZjAtOV17MSw0fTopezAsNn18KFthLWYwLTldezEsNH06KXsxfTooW2EtZjAtOV17MSw0fTopezAsNX18KFthLWYwLTldezEsNH06KXsyfTooW2EtZjAtOV17MSw0fTopezAsNH18KFthLWYwLTldezEsNH06KXszfTooW2EtZjAtOV17MSw0fTopezAsM318KFthLWYwLTldezEsNH06KXs0fTooW2EtZjAtOV17MSw0fTopezAsMn18KFthLWYwLTldezEsNH06KXs1fTooW2EtZjAtOV17MSw0fTopezAsMX0pKFthLWYwLTldezEsNH18KCgoMjVbMC01XSl8KDJbMC00XVswLTldKXwoMVswLTldezJ9KXwoWzAtOV17MSwyfSkpXFwuKXszfSgoMjVbMC01XSl8KDJbMC00XVswLTldKXwoMVswLTldezJ9KXwoWzAtOV17MSwyfSkpKSQvO1xuY29uc3QgaXB2NlJlZ2V4ID0gL14oKFswLTlhLWZBLUZdezEsNH06KXs3LDd9WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsN306fChbMC05YS1mQS1GXXsxLDR9Oil7MSw2fTpbMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw1fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwyfXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH0oOlswLTlhLWZBLUZdezEsNH0pezEsM318KFswLTlhLWZBLUZdezEsNH06KXsxLDN9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwyfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw1fXxbMC05YS1mQS1GXXsxLDR9OigoOlswLTlhLWZBLUZdezEsNH0pezEsNn0pfDooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDd9fDopfGZlODA6KDpbMC05YS1mQS1GXXswLDR9KXswLDR9JVswLTlhLXpBLVpdezEsfXw6OihmZmZmKDowezEsNH0pezAsMX06KXswLDF9KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezMsM30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pfChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fTooKDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKVxcLil7MywzfSgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSkpJC87XG5jb25zdCBpcHY2Q2lkclJlZ2V4ID0gL14oKFswLTlhLWZBLUZdezEsNH06KXs3LDd9WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsN306fChbMC05YS1mQS1GXXsxLDR9Oil7MSw2fTpbMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw1fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwyfXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH0oOlswLTlhLWZBLUZdezEsNH0pezEsM318KFswLTlhLWZBLUZdezEsNH06KXsxLDN9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwyfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw1fXxbMC05YS1mQS1GXXsxLDR9OigoOlswLTlhLWZBLUZdezEsNH0pezEsNn0pfDooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDd9fDopfGZlODA6KDpbMC05YS1mQS1GXXswLDR9KXswLDR9JVswLTlhLXpBLVpdezEsfXw6OihmZmZmKDowezEsNH0pezAsMX06KXswLDF9KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezMsM30oMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pfChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fTooKDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKVxcLil7MywzfSgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSkpXFwvKDEyWzAtOF18MVswMV1bMC05XXxbMS05XT9bMC05XSkkLztcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzc4NjAzOTIvZGV0ZXJtaW5lLWlmLXN0cmluZy1pcy1pbi1iYXNlNjQtdXNpbmctamF2YXNjcmlwdFxuY29uc3QgYmFzZTY0UmVnZXggPSAvXihbMC05YS16QS1aKy9dezR9KSooKFswLTlhLXpBLVorL117Mn09PSl8KFswLTlhLXpBLVorL117M309KSk/JC87XG4vLyBodHRwczovL2Jhc2U2NC5ndXJ1L3N0YW5kYXJkcy9iYXNlNjR1cmxcbmNvbnN0IGJhc2U2NHVybFJlZ2V4ID0gL14oWzAtOWEtekEtWi1fXXs0fSkqKChbMC05YS16QS1aLV9dezJ9KD09KT8pfChbMC05YS16QS1aLV9dezN9KD0pPykpPyQvO1xuLy8gc2ltcGxlXG4vLyBjb25zdCBkYXRlUmVnZXhTb3VyY2UgPSBgXFxcXGR7NH0tXFxcXGR7Mn0tXFxcXGR7Mn1gO1xuLy8gbm8gbGVhcCB5ZWFyIHZhbGlkYXRpb25cbi8vIGNvbnN0IGRhdGVSZWdleFNvdXJjZSA9IGBcXFxcZHs0fS0oKDBbMTM1NzhdfDEwfDEyKS0zMXwoMFsxMy05XXwxWzAtMl0pLTMwfCgwWzEtOV18MVswLTJdKS0oMFsxLTldfDFcXFxcZHwyXFxcXGQpKWA7XG4vLyB3aXRoIGxlYXAgeWVhciB2YWxpZGF0aW9uXG5jb25zdCBkYXRlUmVnZXhTb3VyY2UgPSBgKChcXFxcZFxcXFxkWzI0NjhdWzA0OF18XFxcXGRcXFxcZFsxMzU3OV1bMjZdfFxcXFxkXFxcXGQwWzQ4XXxbMDI0NjhdWzA0OF0wMHxbMTM1NzldWzI2XTAwKS0wMi0yOXxcXFxcZHs0fS0oKDBbMTM1NzhdfDFbMDJdKS0oMFsxLTldfFsxMl1cXFxcZHwzWzAxXSl8KDBbNDY5XXwxMSktKDBbMS05XXxbMTJdXFxcXGR8MzApfCgwMiktKDBbMS05XXwxXFxcXGR8MlswLThdKSkpYDtcbmNvbnN0IGRhdGVSZWdleCA9IG5ldyBSZWdFeHAoYF4ke2RhdGVSZWdleFNvdXJjZX0kYCk7XG5mdW5jdGlvbiB0aW1lUmVnZXhTb3VyY2UoYXJncykge1xuICAgIGxldCBzZWNvbmRzUmVnZXhTb3VyY2UgPSBgWzAtNV1cXFxcZGA7XG4gICAgaWYgKGFyZ3MucHJlY2lzaW9uKSB7XG4gICAgICAgIHNlY29uZHNSZWdleFNvdXJjZSA9IGAke3NlY29uZHNSZWdleFNvdXJjZX1cXFxcLlxcXFxkeyR7YXJncy5wcmVjaXNpb259fWA7XG4gICAgfVxuICAgIGVsc2UgaWYgKGFyZ3MucHJlY2lzaW9uID09IG51bGwpIHtcbiAgICAgICAgc2Vjb25kc1JlZ2V4U291cmNlID0gYCR7c2Vjb25kc1JlZ2V4U291cmNlfShcXFxcLlxcXFxkKyk/YDtcbiAgICB9XG4gICAgY29uc3Qgc2Vjb25kc1F1YW50aWZpZXIgPSBhcmdzLnByZWNpc2lvbiA/IFwiK1wiIDogXCI/XCI7IC8vIHJlcXVpcmUgc2Vjb25kcyBpZiBwcmVjaXNpb24gaXMgbm9uemVyb1xuICAgIHJldHVybiBgKFswMV1cXFxcZHwyWzAtM10pOlswLTVdXFxcXGQoOiR7c2Vjb25kc1JlZ2V4U291cmNlfSkke3NlY29uZHNRdWFudGlmaWVyfWA7XG59XG5mdW5jdGlvbiB0aW1lUmVnZXgoYXJncykge1xuICAgIHJldHVybiBuZXcgUmVnRXhwKGBeJHt0aW1lUmVnZXhTb3VyY2UoYXJncyl9JGApO1xufVxuLy8gQWRhcHRlZCBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zMTQzMjMxXG5leHBvcnQgZnVuY3Rpb24gZGF0ZXRpbWVSZWdleChhcmdzKSB7XG4gICAgbGV0IHJlZ2V4ID0gYCR7ZGF0ZVJlZ2V4U291cmNlfVQke3RpbWVSZWdleFNvdXJjZShhcmdzKX1gO1xuICAgIGNvbnN0IG9wdHMgPSBbXTtcbiAgICBvcHRzLnB1c2goYXJncy5sb2NhbCA/IGBaP2AgOiBgWmApO1xuICAgIGlmIChhcmdzLm9mZnNldClcbiAgICAgICAgb3B0cy5wdXNoKGAoWystXVxcXFxkezJ9Oj9cXFxcZHsyfSlgKTtcbiAgICByZWdleCA9IGAke3JlZ2V4fSgke29wdHMuam9pbihcInxcIil9KWA7XG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4ke3JlZ2V4fSRgKTtcbn1cbmZ1bmN0aW9uIGlzVmFsaWRJUChpcCwgdmVyc2lvbikge1xuICAgIGlmICgodmVyc2lvbiA9PT0gXCJ2NFwiIHx8ICF2ZXJzaW9uKSAmJiBpcHY0UmVnZXgudGVzdChpcCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICgodmVyc2lvbiA9PT0gXCJ2NlwiIHx8ICF2ZXJzaW9uKSAmJiBpcHY2UmVnZXgudGVzdChpcCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIGlzVmFsaWRKV1Qoand0LCBhbGcpIHtcbiAgICBpZiAoIWp3dFJlZ2V4LnRlc3Qoand0KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IFtoZWFkZXJdID0gand0LnNwbGl0KFwiLlwiKTtcbiAgICAgICAgaWYgKCFoZWFkZXIpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vIENvbnZlcnQgYmFzZTY0dXJsIHRvIGJhc2U2NFxuICAgICAgICBjb25zdCBiYXNlNjQgPSBoZWFkZXJcbiAgICAgICAgICAgIC5yZXBsYWNlKC8tL2csIFwiK1wiKVxuICAgICAgICAgICAgLnJlcGxhY2UoL18vZywgXCIvXCIpXG4gICAgICAgICAgICAucGFkRW5kKGhlYWRlci5sZW5ndGggKyAoKDQgLSAoaGVhZGVyLmxlbmd0aCAlIDQpKSAlIDQpLCBcIj1cIik7XG4gICAgICAgIGNvbnN0IGRlY29kZWQgPSBKU09OLnBhcnNlKGF0b2IoYmFzZTY0KSk7XG4gICAgICAgIGlmICh0eXBlb2YgZGVjb2RlZCAhPT0gXCJvYmplY3RcIiB8fCBkZWNvZGVkID09PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoXCJ0eXBcIiBpbiBkZWNvZGVkICYmIGRlY29kZWQ/LnR5cCAhPT0gXCJKV1RcIilcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKCFkZWNvZGVkLmFsZylcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGFsZyAmJiBkZWNvZGVkLmFsZyAhPT0gYWxnKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY2F0Y2gge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuZnVuY3Rpb24gaXNWYWxpZENpZHIoaXAsIHZlcnNpb24pIHtcbiAgICBpZiAoKHZlcnNpb24gPT09IFwidjRcIiB8fCAhdmVyc2lvbikgJiYgaXB2NENpZHJSZWdleC50ZXN0KGlwKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCh2ZXJzaW9uID09PSBcInY2XCIgfHwgIXZlcnNpb24pICYmIGlwdjZDaWRyUmVnZXgudGVzdChpcCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydCBjbGFzcyBab2RTdHJpbmcgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RlZi5jb2VyY2UpIHtcbiAgICAgICAgICAgIGlucHV0LmRhdGEgPSBTdHJpbmcoaW5wdXQuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5zdHJpbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuc3RyaW5nLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc3RhdHVzID0gbmV3IFBhcnNlU3RhdHVzKCk7XG4gICAgICAgIGxldCBjdHggPSB1bmRlZmluZWQ7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoZWNrLmtpbmQgPT09IFwibWluXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuZGF0YS5sZW5ndGggPCBjaGVjay52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuZGF0YS5sZW5ndGggPiBjaGVjay52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImxlbmd0aFwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vQmlnID0gaW5wdXQuZGF0YS5sZW5ndGggPiBjaGVjay52YWx1ZTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29TbWFsbCA9IGlucHV0LmRhdGEubGVuZ3RoIDwgY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRvb0JpZyB8fCB0b29TbWFsbCkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvb0JpZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19iaWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRvb1NtYWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImVtYWlsXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWVtYWlsUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImVtYWlsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJlbW9qaVwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFlbW9qaVJlZ2V4KSB7XG4gICAgICAgICAgICAgICAgICAgIGVtb2ppUmVnZXggPSBuZXcgUmVnRXhwKF9lbW9qaVJlZ2V4LCBcInVcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghZW1vamlSZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiZW1vamlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInV1aWRcIikge1xuICAgICAgICAgICAgICAgIGlmICghdXVpZFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJ1dWlkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJuYW5vaWRcIikge1xuICAgICAgICAgICAgICAgIGlmICghbmFub2lkUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcIm5hbm9pZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiY3VpZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjdWlkUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImN1aWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImN1aWQyXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWN1aWQyUmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImN1aWQyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJ1bGlkXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXVsaWRSZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwidWxpZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwidXJsXCIpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBuZXcgVVJMKGlucHV0LmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwidXJsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJyZWdleFwiKSB7XG4gICAgICAgICAgICAgICAgY2hlY2sucmVnZXgubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXN0UmVzdWx0ID0gY2hlY2sucmVnZXgudGVzdChpbnB1dC5kYXRhKTtcbiAgICAgICAgICAgICAgICBpZiAoIXRlc3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJyZWdleFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwidHJpbVwiKSB7XG4gICAgICAgICAgICAgICAgaW5wdXQuZGF0YSA9IGlucHV0LmRhdGEudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJpbmNsdWRlc1wiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5kYXRhLmluY2x1ZGVzKGNoZWNrLnZhbHVlLCBjaGVjay5wb3NpdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogeyBpbmNsdWRlczogY2hlY2sudmFsdWUsIHBvc2l0aW9uOiBjaGVjay5wb3NpdGlvbiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwidG9Mb3dlckNhc2VcIikge1xuICAgICAgICAgICAgICAgIGlucHV0LmRhdGEgPSBpbnB1dC5kYXRhLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcInRvVXBwZXJDYXNlXCIpIHtcbiAgICAgICAgICAgICAgICBpbnB1dC5kYXRhID0gaW5wdXQuZGF0YS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJzdGFydHNXaXRoXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlucHV0LmRhdGEuc3RhcnRzV2l0aChjaGVjay52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogeyBzdGFydHNXaXRoOiBjaGVjay52YWx1ZSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZW5kc1dpdGhcIikge1xuICAgICAgICAgICAgICAgIGlmICghaW5wdXQuZGF0YS5lbmRzV2l0aChjaGVjay52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogeyBlbmRzV2l0aDogY2hlY2sudmFsdWUgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImRhdGV0aW1lXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWdleCA9IGRhdGV0aW1lUmVnZXgoY2hlY2spO1xuICAgICAgICAgICAgICAgIGlmICghcmVnZXgudGVzdChpbnB1dC5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImRhdGV0aW1lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJkYXRlXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWdleCA9IGRhdGVSZWdleDtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJkYXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJ0aW1lXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWdleCA9IHRpbWVSZWdleChjaGVjayk7XG4gICAgICAgICAgICAgICAgaWYgKCFyZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwidGltZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiZHVyYXRpb25cIikge1xuICAgICAgICAgICAgICAgIGlmICghZHVyYXRpb25SZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiZHVyYXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImlwXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWRJUChpbnB1dC5kYXRhLCBjaGVjay52ZXJzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBcImlwXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJqd3RcIikge1xuICAgICAgICAgICAgICAgIGlmICghaXNWYWxpZEpXVChpbnB1dC5kYXRhLCBjaGVjay5hbGcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiand0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJjaWRyXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWRDaWRyKGlucHV0LmRhdGEsIGNoZWNrLnZlcnNpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiY2lkclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwiYmFzZTY0XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWJhc2U2NFJlZ2V4LnRlc3QoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogXCJiYXNlNjRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3N0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcImJhc2U2NHVybFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFiYXNlNjR1cmxSZWdleC50ZXN0KGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFwiYmFzZTY0dXJsXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9zdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRpbC5hc3NlcnROZXZlcihjaGVjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiBzdGF0dXMudmFsdWUsIHZhbHVlOiBpbnB1dC5kYXRhIH07XG4gICAgfVxuICAgIF9yZWdleChyZWdleCwgdmFsaWRhdGlvbiwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWZpbmVtZW50KChkYXRhKSA9PiByZWdleC50ZXN0KGRhdGEpLCB7XG4gICAgICAgICAgICB2YWxpZGF0aW9uLFxuICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfc3RyaW5nLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgX2FkZENoZWNrKGNoZWNrKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kU3RyaW5nKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNoZWNrczogWy4uLnRoaXMuX2RlZi5jaGVja3MsIGNoZWNrXSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVtYWlsKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJlbWFpbFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIHVybChtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwidXJsXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSB9KTtcbiAgICB9XG4gICAgZW1vamkobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImVtb2ppXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSB9KTtcbiAgICB9XG4gICAgdXVpZChtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwidXVpZFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIG5hbm9pZChtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwibmFub2lkXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSB9KTtcbiAgICB9XG4gICAgY3VpZChtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiY3VpZFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIGN1aWQyKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJjdWlkMlwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIHVsaWQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcInVsaWRcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICBiYXNlNjQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImJhc2U2NFwiLCAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSkgfSk7XG4gICAgfVxuICAgIGJhc2U2NHVybChtZXNzYWdlKSB7XG4gICAgICAgIC8vIGJhc2U2NHVybCBlbmNvZGluZyBpcyBhIG1vZGlmaWNhdGlvbiBvZiBiYXNlNjQgdGhhdCBjYW4gc2FmZWx5IGJlIHVzZWQgaW4gVVJMcyBhbmQgZmlsZW5hbWVzXG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImJhc2U2NHVybFwiLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgand0KG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJqd3RcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG9wdGlvbnMpIH0pO1xuICAgIH1cbiAgICBpcChvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiaXBcIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG9wdGlvbnMpIH0pO1xuICAgIH1cbiAgICBjaWRyKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHsga2luZDogXCJjaWRyXCIsIC4uLmVycm9yVXRpbC5lcnJUb09iaihvcHRpb25zKSB9KTtcbiAgICB9XG4gICAgZGF0ZXRpbWUob3B0aW9ucykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICAgICAga2luZDogXCJkYXRldGltZVwiLFxuICAgICAgICAgICAgICAgIHByZWNpc2lvbjogbnVsbCxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGxvY2FsOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBvcHRpb25zLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwiZGF0ZXRpbWVcIixcbiAgICAgICAgICAgIHByZWNpc2lvbjogdHlwZW9mIG9wdGlvbnM/LnByZWNpc2lvbiA9PT0gXCJ1bmRlZmluZWRcIiA/IG51bGwgOiBvcHRpb25zPy5wcmVjaXNpb24sXG4gICAgICAgICAgICBvZmZzZXQ6IG9wdGlvbnM/Lm9mZnNldCA/PyBmYWxzZSxcbiAgICAgICAgICAgIGxvY2FsOiBvcHRpb25zPy5sb2NhbCA/PyBmYWxzZSxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihvcHRpb25zPy5tZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGRhdGUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soeyBraW5kOiBcImRhdGVcIiwgbWVzc2FnZSB9KTtcbiAgICB9XG4gICAgdGltZShvcHRpb25zKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgICAgICBraW5kOiBcInRpbWVcIixcbiAgICAgICAgICAgICAgICBwcmVjaXNpb246IG51bGwsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogb3B0aW9ucyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcInRpbWVcIixcbiAgICAgICAgICAgIHByZWNpc2lvbjogdHlwZW9mIG9wdGlvbnM/LnByZWNpc2lvbiA9PT0gXCJ1bmRlZmluZWRcIiA/IG51bGwgOiBvcHRpb25zPy5wcmVjaXNpb24sXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoob3B0aW9ucz8ubWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkdXJhdGlvbihtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7IGtpbmQ6IFwiZHVyYXRpb25cIiwgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpIH0pO1xuICAgIH1cbiAgICByZWdleChyZWdleCwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJyZWdleFwiLFxuICAgICAgICAgICAgcmVnZXg6IHJlZ2V4LFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgaW5jbHVkZXModmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwiaW5jbHVkZXNcIixcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiBvcHRpb25zPy5wb3NpdGlvbixcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihvcHRpb25zPy5tZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHN0YXJ0c1dpdGgodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwic3RhcnRzV2l0aFwiLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZW5kc1dpdGgodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwiZW5kc1dpdGhcIixcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1pbihtaW5MZW5ndGgsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICB2YWx1ZTogbWluTGVuZ3RoLFxuICAgICAgICAgICAgLi4uZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbWF4KG1heExlbmd0aCwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtYXhcIixcbiAgICAgICAgICAgIHZhbHVlOiBtYXhMZW5ndGgsXG4gICAgICAgICAgICAuLi5lcnJvclV0aWwuZXJyVG9PYmoobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBsZW5ndGgobGVuLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcImxlbmd0aFwiLFxuICAgICAgICAgICAgdmFsdWU6IGxlbixcbiAgICAgICAgICAgIC4uLmVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVxdWl2YWxlbnQgdG8gYC5taW4oMSlgXG4gICAgICovXG4gICAgbm9uZW1wdHkobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5taW4oMSwgZXJyb3JVdGlsLmVyclRvT2JqKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgdHJpbSgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTdHJpbmcoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbLi4udGhpcy5fZGVmLmNoZWNrcywgeyBraW5kOiBcInRyaW1cIiB9XSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRvTG93ZXJDYXNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZFN0cmluZyh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCB7IGtpbmQ6IFwidG9Mb3dlckNhc2VcIiB9XSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRvVXBwZXJDYXNlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZFN0cmluZyh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCB7IGtpbmQ6IFwidG9VcHBlckNhc2VcIiB9XSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGdldCBpc0RhdGV0aW1lKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImRhdGV0aW1lXCIpO1xuICAgIH1cbiAgICBnZXQgaXNEYXRlKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImRhdGVcIik7XG4gICAgfVxuICAgIGdldCBpc1RpbWUoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwidGltZVwiKTtcbiAgICB9XG4gICAgZ2V0IGlzRHVyYXRpb24oKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwiZHVyYXRpb25cIik7XG4gICAgfVxuICAgIGdldCBpc0VtYWlsKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImVtYWlsXCIpO1xuICAgIH1cbiAgICBnZXQgaXNVUkwoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwidXJsXCIpO1xuICAgIH1cbiAgICBnZXQgaXNFbW9qaSgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJlbW9qaVwiKTtcbiAgICB9XG4gICAgZ2V0IGlzVVVJRCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJ1dWlkXCIpO1xuICAgIH1cbiAgICBnZXQgaXNOQU5PSUQoKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2RlZi5jaGVja3MuZmluZCgoY2gpID0+IGNoLmtpbmQgPT09IFwibmFub2lkXCIpO1xuICAgIH1cbiAgICBnZXQgaXNDVUlEKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImN1aWRcIik7XG4gICAgfVxuICAgIGdldCBpc0NVSUQyKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImN1aWQyXCIpO1xuICAgIH1cbiAgICBnZXQgaXNVTElEKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcInVsaWRcIik7XG4gICAgfVxuICAgIGdldCBpc0lQKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImlwXCIpO1xuICAgIH1cbiAgICBnZXQgaXNDSURSKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9kZWYuY2hlY2tzLmZpbmQoKGNoKSA9PiBjaC5raW5kID09PSBcImNpZHJcIik7XG4gICAgfVxuICAgIGdldCBpc0Jhc2U2NCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJiYXNlNjRcIik7XG4gICAgfVxuICAgIGdldCBpc0Jhc2U2NHVybCgpIHtcbiAgICAgICAgLy8gYmFzZTY0dXJsIGVuY29kaW5nIGlzIGEgbW9kaWZpY2F0aW9uIG9mIGJhc2U2NCB0aGF0IGNhbiBzYWZlbHkgYmUgdXNlZCBpbiBVUkxzIGFuZCBmaWxlbmFtZXNcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJiYXNlNjR1cmxcIik7XG4gICAgfVxuICAgIGdldCBtaW5MZW5ndGgoKSB7XG4gICAgICAgIGxldCBtaW4gPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1pbiA9PT0gbnVsbCB8fCBjaC52YWx1ZSA+IG1pbilcbiAgICAgICAgICAgICAgICAgICAgbWluID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1pbjtcbiAgICB9XG4gICAgZ2V0IG1heExlbmd0aCgpIHtcbiAgICAgICAgbGV0IG1heCA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWF4ID09PSBudWxsIHx8IGNoLnZhbHVlIDwgbWF4KVxuICAgICAgICAgICAgICAgICAgICBtYXggPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF4O1xuICAgIH1cbn1cblpvZFN0cmluZy5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RTdHJpbmcoe1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFN0cmluZyxcbiAgICAgICAgY29lcmNlOiBwYXJhbXM/LmNvZXJjZSA/PyBmYWxzZSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM5NjY0ODQvd2h5LWRvZXMtbW9kdWx1cy1vcGVyYXRvci1yZXR1cm4tZnJhY3Rpb25hbC1udW1iZXItaW4tamF2YXNjcmlwdC8zMTcxMTAzNCMzMTcxMTAzNFxuZnVuY3Rpb24gZmxvYXRTYWZlUmVtYWluZGVyKHZhbCwgc3RlcCkge1xuICAgIGNvbnN0IHZhbERlY0NvdW50ID0gKHZhbC50b1N0cmluZygpLnNwbGl0KFwiLlwiKVsxXSB8fCBcIlwiKS5sZW5ndGg7XG4gICAgY29uc3Qgc3RlcERlY0NvdW50ID0gKHN0ZXAudG9TdHJpbmcoKS5zcGxpdChcIi5cIilbMV0gfHwgXCJcIikubGVuZ3RoO1xuICAgIGNvbnN0IGRlY0NvdW50ID0gdmFsRGVjQ291bnQgPiBzdGVwRGVjQ291bnQgPyB2YWxEZWNDb3VudCA6IHN0ZXBEZWNDb3VudDtcbiAgICBjb25zdCB2YWxJbnQgPSBOdW1iZXIucGFyc2VJbnQodmFsLnRvRml4ZWQoZGVjQ291bnQpLnJlcGxhY2UoXCIuXCIsIFwiXCIpKTtcbiAgICBjb25zdCBzdGVwSW50ID0gTnVtYmVyLnBhcnNlSW50KHN0ZXAudG9GaXhlZChkZWNDb3VudCkucmVwbGFjZShcIi5cIiwgXCJcIikpO1xuICAgIHJldHVybiAodmFsSW50ICUgc3RlcEludCkgLyAxMCAqKiBkZWNDb3VudDtcbn1cbmV4cG9ydCBjbGFzcyBab2ROdW1iZXIgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgdGhpcy5taW4gPSB0aGlzLmd0ZTtcbiAgICAgICAgdGhpcy5tYXggPSB0aGlzLmx0ZTtcbiAgICAgICAgdGhpcy5zdGVwID0gdGhpcy5tdWx0aXBsZU9mO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RlZi5jb2VyY2UpIHtcbiAgICAgICAgICAgIGlucHV0LmRhdGEgPSBOdW1iZXIoaW5wdXQuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5udW1iZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUubnVtYmVyLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN0eCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gbmV3IFBhcnNlU3RhdHVzKCk7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoZWNrLmtpbmQgPT09IFwiaW50XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXV0aWwuaXNJbnRlZ2VyKGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogXCJpbnRlZ2VyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZDogXCJmbG9hdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoZWNrLmtpbmQgPT09IFwibWluXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29TbWFsbCA9IGNoZWNrLmluY2x1c2l2ZSA/IGlucHV0LmRhdGEgPCBjaGVjay52YWx1ZSA6IGlucHV0LmRhdGEgPD0gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRvb1NtYWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fc21hbGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwibnVtYmVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IGNoZWNrLmluY2x1c2l2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vQmlnID0gY2hlY2suaW5jbHVzaXZlID8gaW5wdXQuZGF0YSA+IGNoZWNrLnZhbHVlIDogaW5wdXQuZGF0YSA+PSBjaGVjay52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodG9vQmlnKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm51bWJlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiBjaGVjay5pbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJtdWx0aXBsZU9mXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmxvYXRTYWZlUmVtYWluZGVyKGlucHV0LmRhdGEsIGNoZWNrLnZhbHVlKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCwgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUubm90X211bHRpcGxlX29mLFxuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGVPZjogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJmaW5pdGVcIikge1xuICAgICAgICAgICAgICAgIGlmICghTnVtYmVyLmlzRmluaXRlKGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5ub3RfZmluaXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoY2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN0YXR1czogc3RhdHVzLnZhbHVlLCB2YWx1ZTogaW5wdXQuZGF0YSB9O1xuICAgIH1cbiAgICBndGUodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGltaXQoXCJtaW5cIiwgdmFsdWUsIHRydWUsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIGd0KHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWluXCIsIHZhbHVlLCBmYWxzZSwgZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgbHRlKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWF4XCIsIHZhbHVlLCB0cnVlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBsdCh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1heFwiLCB2YWx1ZSwgZmFsc2UsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIHNldExpbWl0KGtpbmQsIHZhbHVlLCBpbmNsdXNpdmUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2ROdW1iZXIoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2hlY2tzOiBbXG4gICAgICAgICAgICAgICAgLi4udGhpcy5fZGVmLmNoZWNrcyxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIF9hZGRDaGVjayhjaGVjaykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZE51bWJlcih7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFsuLi50aGlzLl9kZWYuY2hlY2tzLCBjaGVja10sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpbnQobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJpbnRcIixcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHBvc2l0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgIGluY2x1c2l2ZTogZmFsc2UsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBuZWdhdGl2ZShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1heFwiLFxuICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICBpbmNsdXNpdmU6IGZhbHNlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbm9ucG9zaXRpdmUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtYXhcIixcbiAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbm9ubmVnYXRpdmUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtaW5cIixcbiAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbXVsdGlwbGVPZih2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtdWx0aXBsZU9mXCIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBmaW5pdGUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJmaW5pdGVcIixcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNhZmUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtaW5cIixcbiAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgIHZhbHVlOiBOdW1iZXIuTUlOX1NBRkVfSU5URUdFUixcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSkuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZTogTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXQgbWluVmFsdWUoKSB7XG4gICAgICAgIGxldCBtaW4gPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1pbiA9PT0gbnVsbCB8fCBjaC52YWx1ZSA+IG1pbilcbiAgICAgICAgICAgICAgICAgICAgbWluID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1pbjtcbiAgICB9XG4gICAgZ2V0IG1heFZhbHVlKCkge1xuICAgICAgICBsZXQgbWF4ID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGlmIChtYXggPT09IG51bGwgfHwgY2gudmFsdWUgPCBtYXgpXG4gICAgICAgICAgICAgICAgICAgIG1heCA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYXg7XG4gICAgfVxuICAgIGdldCBpc0ludCgpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fZGVmLmNoZWNrcy5maW5kKChjaCkgPT4gY2gua2luZCA9PT0gXCJpbnRcIiB8fCAoY2gua2luZCA9PT0gXCJtdWx0aXBsZU9mXCIgJiYgdXRpbC5pc0ludGVnZXIoY2gudmFsdWUpKSk7XG4gICAgfVxuICAgIGdldCBpc0Zpbml0ZSgpIHtcbiAgICAgICAgbGV0IG1heCA9IG51bGw7XG4gICAgICAgIGxldCBtaW4gPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcImZpbml0ZVwiIHx8IGNoLmtpbmQgPT09IFwiaW50XCIgfHwgY2gua2luZCA9PT0gXCJtdWx0aXBsZU9mXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoLmtpbmQgPT09IFwibWluXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWluID09PSBudWxsIHx8IGNoLnZhbHVlID4gbWluKVxuICAgICAgICAgICAgICAgICAgICBtaW4gPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGNoLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWF4ID09PSBudWxsIHx8IGNoLnZhbHVlIDwgbWF4KVxuICAgICAgICAgICAgICAgICAgICBtYXggPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKG1pbikgJiYgTnVtYmVyLmlzRmluaXRlKG1heCk7XG4gICAgfVxufVxuWm9kTnVtYmVyLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE51bWJlcih7XG4gICAgICAgIGNoZWNrczogW10sXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTnVtYmVyLFxuICAgICAgICBjb2VyY2U6IHBhcmFtcz8uY29lcmNlIHx8IGZhbHNlLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZEJpZ0ludCBleHRlbmRzIFpvZFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB0aGlzLm1pbiA9IHRoaXMuZ3RlO1xuICAgICAgICB0aGlzLm1heCA9IHRoaXMubHRlO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RlZi5jb2VyY2UpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaW5wdXQuZGF0YSA9IEJpZ0ludChpbnB1dC5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2V0SW52YWxpZElucHV0KGlucHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmJpZ2ludCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dldEludmFsaWRJbnB1dChpbnB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN0eCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gbmV3IFBhcnNlU3RhdHVzKCk7XG4gICAgICAgIGZvciAoY29uc3QgY2hlY2sgb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoZWNrLmtpbmQgPT09IFwibWluXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29TbWFsbCA9IGNoZWNrLmluY2x1c2l2ZSA/IGlucHV0LmRhdGEgPCBjaGVjay52YWx1ZSA6IGlucHV0LmRhdGEgPD0gY2hlY2sudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHRvb1NtYWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fc21hbGwsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImJpZ2ludFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogY2hlY2sudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IGNoZWNrLmluY2x1c2l2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjaGVjay5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vQmlnID0gY2hlY2suaW5jbHVzaXZlID8gaW5wdXQuZGF0YSA+IGNoZWNrLnZhbHVlIDogaW5wdXQuZGF0YSA+PSBjaGVjay52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodG9vQmlnKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJiaWdpbnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVzaXZlOiBjaGVjay5pbmNsdXNpdmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBjaGVjay5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJtdWx0aXBsZU9mXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5wdXQuZGF0YSAlIGNoZWNrLnZhbHVlICE9PSBCaWdJbnQoMCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLm5vdF9tdWx0aXBsZV9vZixcbiAgICAgICAgICAgICAgICAgICAgICAgIG11bHRpcGxlT2Y6IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHV0aWwuYXNzZXJ0TmV2ZXIoY2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN0YXR1czogc3RhdHVzLnZhbHVlLCB2YWx1ZTogaW5wdXQuZGF0YSB9O1xuICAgIH1cbiAgICBfZ2V0SW52YWxpZElucHV0KGlucHV0KSB7XG4gICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuYmlnaW50LFxuICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgfVxuICAgIGd0ZSh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMaW1pdChcIm1pblwiLCB2YWx1ZSwgdHJ1ZSwgZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgZ3QodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGltaXQoXCJtaW5cIiwgdmFsdWUsIGZhbHNlLCBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkpO1xuICAgIH1cbiAgICBsdGUodmFsdWUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGltaXQoXCJtYXhcIiwgdmFsdWUsIHRydWUsIGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSk7XG4gICAgfVxuICAgIGx0KHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldExpbWl0KFwibWF4XCIsIHZhbHVlLCBmYWxzZSwgZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpKTtcbiAgICB9XG4gICAgc2V0TGltaXQoa2luZCwgdmFsdWUsIGluY2x1c2l2ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEJpZ0ludCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBjaGVja3M6IFtcbiAgICAgICAgICAgICAgICAuLi50aGlzLl9kZWYuY2hlY2tzLFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAga2luZCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgX2FkZENoZWNrKGNoZWNrKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kQmlnSW50KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNoZWNrczogWy4uLnRoaXMuX2RlZi5jaGVja3MsIGNoZWNrXSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHBvc2l0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWluXCIsXG4gICAgICAgICAgICB2YWx1ZTogQmlnSW50KDApLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5lZ2F0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICB2YWx1ZTogQmlnSW50KDApLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbnBvc2l0aXZlKG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICB2YWx1ZTogQmlnSW50KDApLFxuICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbm9ubmVnYXRpdmUobWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYWRkQ2hlY2soe1xuICAgICAgICAgICAga2luZDogXCJtaW5cIixcbiAgICAgICAgICAgIHZhbHVlOiBCaWdJbnQoMCksXG4gICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBtdWx0aXBsZU9mKHZhbHVlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm11bHRpcGxlT2ZcIixcbiAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2V0IG1pblZhbHVlKCkge1xuICAgICAgICBsZXQgbWluID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBjaCBvZiB0aGlzLl9kZWYuY2hlY2tzKSB7XG4gICAgICAgICAgICBpZiAoY2gua2luZCA9PT0gXCJtaW5cIikge1xuICAgICAgICAgICAgICAgIGlmIChtaW4gPT09IG51bGwgfHwgY2gudmFsdWUgPiBtaW4pXG4gICAgICAgICAgICAgICAgICAgIG1pbiA9IGNoLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtaW47XG4gICAgfVxuICAgIGdldCBtYXhWYWx1ZSgpIHtcbiAgICAgICAgbGV0IG1heCA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoLmtpbmQgPT09IFwibWF4XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWF4ID09PSBudWxsIHx8IGNoLnZhbHVlIDwgbWF4KVxuICAgICAgICAgICAgICAgICAgICBtYXggPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF4O1xuICAgIH1cbn1cblpvZEJpZ0ludC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RCaWdJbnQoe1xuICAgICAgICBjaGVja3M6IFtdLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEJpZ0ludCxcbiAgICAgICAgY29lcmNlOiBwYXJhbXM/LmNvZXJjZSA/PyBmYWxzZSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RCb29sZWFuIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGlmICh0aGlzLl9kZWYuY29lcmNlKSB7XG4gICAgICAgICAgICBpbnB1dC5kYXRhID0gQm9vbGVhbihpbnB1dC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLmJvb2xlYW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuYm9vbGVhbixcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG59XG5ab2RCb29sZWFuLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEJvb2xlYW4oe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEJvb2xlYW4sXG4gICAgICAgIGNvZXJjZTogcGFyYW1zPy5jb2VyY2UgfHwgZmFsc2UsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kRGF0ZSBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBpZiAodGhpcy5fZGVmLmNvZXJjZSkge1xuICAgICAgICAgICAgaW5wdXQuZGF0YSA9IG5ldyBEYXRlKGlucHV0LmRhdGEpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuZGF0ZSkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5kYXRlLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKE51bWJlci5pc05hTihpbnB1dC5kYXRhLmdldFRpbWUoKSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2RhdGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9IG5ldyBQYXJzZVN0YXR1cygpO1xuICAgICAgICBsZXQgY3R4ID0gdW5kZWZpbmVkO1xuICAgICAgICBmb3IgKGNvbnN0IGNoZWNrIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaGVjay5raW5kID09PSBcIm1pblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlucHV0LmRhdGEuZ2V0VGltZSgpIDwgY2hlY2sudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNoZWNrLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiBjaGVjay52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZGF0ZVwiLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoY2hlY2sua2luZCA9PT0gXCJtYXhcIikge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5kYXRhLmdldFRpbWUoKSA+IGNoZWNrLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0LCBjdHgpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogY2hlY2subWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IGNoZWNrLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJkYXRlXCIsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB1dGlsLmFzc2VydE5ldmVyKGNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhdHVzOiBzdGF0dXMudmFsdWUsXG4gICAgICAgICAgICB2YWx1ZTogbmV3IERhdGUoaW5wdXQuZGF0YS5nZXRUaW1lKCkpLFxuICAgICAgICB9O1xuICAgIH1cbiAgICBfYWRkQ2hlY2soY2hlY2spIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2REYXRlKHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIGNoZWNrczogWy4uLnRoaXMuX2RlZi5jaGVja3MsIGNoZWNrXSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG1pbihtaW5EYXRlLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hZGRDaGVjayh7XG4gICAgICAgICAgICBraW5kOiBcIm1pblwiLFxuICAgICAgICAgICAgdmFsdWU6IG1pbkRhdGUuZ2V0VGltZSgpLFxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbWF4KG1heERhdGUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2FkZENoZWNrKHtcbiAgICAgICAgICAgIGtpbmQ6IFwibWF4XCIsXG4gICAgICAgICAgICB2YWx1ZTogbWF4RGF0ZS5nZXRUaW1lKCksXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSksXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXQgbWluRGF0ZSgpIHtcbiAgICAgICAgbGV0IG1pbiA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2ggb2YgdGhpcy5fZGVmLmNoZWNrcykge1xuICAgICAgICAgICAgaWYgKGNoLmtpbmQgPT09IFwibWluXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAobWluID09PSBudWxsIHx8IGNoLnZhbHVlID4gbWluKVxuICAgICAgICAgICAgICAgICAgICBtaW4gPSBjaC52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWluICE9IG51bGwgPyBuZXcgRGF0ZShtaW4pIDogbnVsbDtcbiAgICB9XG4gICAgZ2V0IG1heERhdGUoKSB7XG4gICAgICAgIGxldCBtYXggPSBudWxsO1xuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIHRoaXMuX2RlZi5jaGVja3MpIHtcbiAgICAgICAgICAgIGlmIChjaC5raW5kID09PSBcIm1heFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1heCA9PT0gbnVsbCB8fCBjaC52YWx1ZSA8IG1heClcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gY2gudmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1heCAhPSBudWxsID8gbmV3IERhdGUobWF4KSA6IG51bGw7XG4gICAgfVxufVxuWm9kRGF0ZS5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2REYXRlKHtcbiAgICAgICAgY2hlY2tzOiBbXSxcbiAgICAgICAgY29lcmNlOiBwYXJhbXM/LmNvZXJjZSB8fCBmYWxzZSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2REYXRlLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFN5bWJvbCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLnN5bWJvbCkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5zeW1ib2wsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT0soaW5wdXQuZGF0YSk7XG4gICAgfVxufVxuWm9kU3ltYm9sLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZFN5bWJvbCh7XG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kU3ltYm9sLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFVuZGVmaW5lZCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLnVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS51bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT0soaW5wdXQuZGF0YSk7XG4gICAgfVxufVxuWm9kVW5kZWZpbmVkLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZFVuZGVmaW5lZCh7XG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kVW5kZWZpbmVkLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZE51bGwgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5udWxsKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm51bGwsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT0soaW5wdXQuZGF0YSk7XG4gICAgfVxufVxuWm9kTnVsbC5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2ROdWxsKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2ROdWxsLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZEFueSBleHRlbmRzIFpvZFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICAvLyB0byBwcmV2ZW50IGluc3RhbmNlcyBvZiBvdGhlciBjbGFzc2VzIGZyb20gZXh0ZW5kaW5nIFpvZEFueS4gdGhpcyBjYXVzZXMgaXNzdWVzIHdpdGggY2F0Y2hhbGwgaW4gWm9kT2JqZWN0LlxuICAgICAgICB0aGlzLl9hbnkgPSB0cnVlO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZEFueS5jcmVhdGUgPSAocGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RBbnkoe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEFueSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RVbmtub3duIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIC8vIHJlcXVpcmVkXG4gICAgICAgIHRoaXMuX3Vua25vd24gPSB0cnVlO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbn1cblpvZFVua25vd24uY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kVW5rbm93bih7XG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kVW5rbm93bixcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2ROZXZlciBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLm5ldmVyLFxuICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgfVxufVxuWm9kTmV2ZXIuY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTmV2ZXIoe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE5ldmVyLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFZvaWQgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkVHlwZSA9IHRoaXMuX2dldFR5cGUoaW5wdXQpO1xuICAgICAgICBpZiAocGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS51bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGN0eCA9IHRoaXMuX2dldE9yUmV0dXJuQ3R4KGlucHV0KTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUudm9pZCxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPSyhpbnB1dC5kYXRhKTtcbiAgICB9XG59XG5ab2RWb2lkLmNyZWF0ZSA9IChwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZFZvaWQoe1xuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFZvaWQsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kQXJyYXkgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHgsIHN0YXR1cyB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3QgZGVmID0gdGhpcy5fZGVmO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuYXJyYXkpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuYXJyYXksXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVmLmV4YWN0TGVuZ3RoICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25zdCB0b29CaWcgPSBjdHguZGF0YS5sZW5ndGggPiBkZWYuZXhhY3RMZW5ndGgudmFsdWU7XG4gICAgICAgICAgICBjb25zdCB0b29TbWFsbCA9IGN0eC5kYXRhLmxlbmd0aCA8IGRlZi5leGFjdExlbmd0aC52YWx1ZTtcbiAgICAgICAgICAgIGlmICh0b29CaWcgfHwgdG9vU21hbGwpIHtcbiAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogdG9vQmlnID8gWm9kSXNzdWVDb2RlLnRvb19iaWcgOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiAodG9vU21hbGwgPyBkZWYuZXhhY3RMZW5ndGgudmFsdWUgOiB1bmRlZmluZWQpLFxuICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiAodG9vQmlnID8gZGVmLmV4YWN0TGVuZ3RoLnZhbHVlIDogdW5kZWZpbmVkKSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGV4YWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBkZWYuZXhhY3RMZW5ndGgubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVmLm1pbkxlbmd0aCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGN0eC5kYXRhLmxlbmd0aCA8IGRlZi5taW5MZW5ndGgudmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19zbWFsbCxcbiAgICAgICAgICAgICAgICAgICAgbWluaW11bTogZGVmLm1pbkxlbmd0aC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmLm1pbkxlbmd0aC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChkZWYubWF4TGVuZ3RoICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoY3R4LmRhdGEubGVuZ3RoID4gZGVmLm1heExlbmd0aC52YWx1ZSkge1xuICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX2JpZyxcbiAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogZGVmLm1heExlbmd0aC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJhcnJheVwiLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmLm1heExlbmd0aC5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoWy4uLmN0eC5kYXRhXS5tYXAoKGl0ZW0sIGkpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmLnR5cGUuX3BhcnNlQXN5bmMobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIGl0ZW0sIGN0eC5wYXRoLCBpKSk7XG4gICAgICAgICAgICB9KSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlQXJyYXkoc3RhdHVzLCByZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gWy4uLmN0eC5kYXRhXS5tYXAoKGl0ZW0sIGkpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBkZWYudHlwZS5fcGFyc2VTeW5jKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBpdGVtLCBjdHgucGF0aCwgaSkpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlQXJyYXkoc3RhdHVzLCByZXN1bHQpO1xuICAgIH1cbiAgICBnZXQgZWxlbWVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi50eXBlO1xuICAgIH1cbiAgICBtaW4obWluTGVuZ3RoLCBtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kQXJyYXkoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgbWluTGVuZ3RoOiB7IHZhbHVlOiBtaW5MZW5ndGgsIG1lc3NhZ2U6IGVycm9yVXRpbC50b1N0cmluZyhtZXNzYWdlKSB9LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgbWF4KG1heExlbmd0aCwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEFycmF5KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIG1heExlbmd0aDogeyB2YWx1ZTogbWF4TGVuZ3RoLCBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGxlbmd0aChsZW4sIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RBcnJheSh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBleGFjdExlbmd0aDogeyB2YWx1ZTogbGVuLCBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5vbmVtcHR5KG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWluKDEsIG1lc3NhZ2UpO1xuICAgIH1cbn1cblpvZEFycmF5LmNyZWF0ZSA9IChzY2hlbWEsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kQXJyYXkoe1xuICAgICAgICB0eXBlOiBzY2hlbWEsXG4gICAgICAgIG1pbkxlbmd0aDogbnVsbCxcbiAgICAgICAgbWF4TGVuZ3RoOiBudWxsLFxuICAgICAgICBleGFjdExlbmd0aDogbnVsbCxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RBcnJheSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmZ1bmN0aW9uIGRlZXBQYXJ0aWFsaWZ5KHNjaGVtYSkge1xuICAgIGlmIChzY2hlbWEgaW5zdGFuY2VvZiBab2RPYmplY3QpIHtcbiAgICAgICAgY29uc3QgbmV3U2hhcGUgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc2NoZW1hLnNoYXBlKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZFNjaGVtYSA9IHNjaGVtYS5zaGFwZVtrZXldO1xuICAgICAgICAgICAgbmV3U2hhcGVba2V5XSA9IFpvZE9wdGlvbmFsLmNyZWF0ZShkZWVwUGFydGlhbGlmeShmaWVsZFNjaGVtYSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgWm9kT2JqZWN0KHtcbiAgICAgICAgICAgIC4uLnNjaGVtYS5fZGVmLFxuICAgICAgICAgICAgc2hhcGU6ICgpID0+IG5ld1NoYXBlLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoc2NoZW1hIGluc3RhbmNlb2YgWm9kQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RBcnJheSh7XG4gICAgICAgICAgICAuLi5zY2hlbWEuX2RlZixcbiAgICAgICAgICAgIHR5cGU6IGRlZXBQYXJ0aWFsaWZ5KHNjaGVtYS5lbGVtZW50KSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFpvZE9wdGlvbmFsKSB7XG4gICAgICAgIHJldHVybiBab2RPcHRpb25hbC5jcmVhdGUoZGVlcFBhcnRpYWxpZnkoc2NoZW1hLnVud3JhcCgpKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFpvZE51bGxhYmxlKSB7XG4gICAgICAgIHJldHVybiBab2ROdWxsYWJsZS5jcmVhdGUoZGVlcFBhcnRpYWxpZnkoc2NoZW1hLnVud3JhcCgpKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHNjaGVtYSBpbnN0YW5jZW9mIFpvZFR1cGxlKSB7XG4gICAgICAgIHJldHVybiBab2RUdXBsZS5jcmVhdGUoc2NoZW1hLml0ZW1zLm1hcCgoaXRlbSkgPT4gZGVlcFBhcnRpYWxpZnkoaXRlbSkpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBzY2hlbWE7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFpvZE9iamVjdCBleHRlbmRzIFpvZFR5cGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICB0aGlzLl9jYWNoZWQgPSBudWxsO1xuICAgICAgICAvKipcbiAgICAgICAgICogQGRlcHJlY2F0ZWQgSW4gbW9zdCBjYXNlcywgdGhpcyBpcyBubyBsb25nZXIgbmVlZGVkIC0gdW5rbm93biBwcm9wZXJ0aWVzIGFyZSBub3cgc2lsZW50bHkgc3RyaXBwZWQuXG4gICAgICAgICAqIElmIHlvdSB3YW50IHRvIHBhc3MgdGhyb3VnaCB1bmtub3duIHByb3BlcnRpZXMsIHVzZSBgLnBhc3N0aHJvdWdoKClgIGluc3RlYWQuXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm5vbnN0cmljdCA9IHRoaXMucGFzc3Rocm91Z2g7XG4gICAgICAgIC8vIGV4dGVuZDxcbiAgICAgICAgLy8gICBBdWdtZW50YXRpb24gZXh0ZW5kcyBab2RSYXdTaGFwZSxcbiAgICAgICAgLy8gICBOZXdPdXRwdXQgZXh0ZW5kcyB1dGlsLmZsYXR0ZW48e1xuICAgICAgICAvLyAgICAgW2sgaW4ga2V5b2YgQXVnbWVudGF0aW9uIHwga2V5b2YgT3V0cHV0XTogayBleHRlbmRzIGtleW9mIEF1Z21lbnRhdGlvblxuICAgICAgICAvLyAgICAgICA/IEF1Z21lbnRhdGlvbltrXVtcIl9vdXRwdXRcIl1cbiAgICAgICAgLy8gICAgICAgOiBrIGV4dGVuZHMga2V5b2YgT3V0cHV0XG4gICAgICAgIC8vICAgICAgID8gT3V0cHV0W2tdXG4gICAgICAgIC8vICAgICAgIDogbmV2ZXI7XG4gICAgICAgIC8vICAgfT4sXG4gICAgICAgIC8vICAgTmV3SW5wdXQgZXh0ZW5kcyB1dGlsLmZsYXR0ZW48e1xuICAgICAgICAvLyAgICAgW2sgaW4ga2V5b2YgQXVnbWVudGF0aW9uIHwga2V5b2YgSW5wdXRdOiBrIGV4dGVuZHMga2V5b2YgQXVnbWVudGF0aW9uXG4gICAgICAgIC8vICAgICAgID8gQXVnbWVudGF0aW9uW2tdW1wiX2lucHV0XCJdXG4gICAgICAgIC8vICAgICAgIDogayBleHRlbmRzIGtleW9mIElucHV0XG4gICAgICAgIC8vICAgICAgID8gSW5wdXRba11cbiAgICAgICAgLy8gICAgICAgOiBuZXZlcjtcbiAgICAgICAgLy8gICB9PlxuICAgICAgICAvLyA+KFxuICAgICAgICAvLyAgIGF1Z21lbnRhdGlvbjogQXVnbWVudGF0aW9uXG4gICAgICAgIC8vICk6IFpvZE9iamVjdDxcbiAgICAgICAgLy8gICBleHRlbmRTaGFwZTxULCBBdWdtZW50YXRpb24+LFxuICAgICAgICAvLyAgIFVua25vd25LZXlzLFxuICAgICAgICAvLyAgIENhdGNoYWxsLFxuICAgICAgICAvLyAgIE5ld091dHB1dCxcbiAgICAgICAgLy8gICBOZXdJbnB1dFxuICAgICAgICAvLyA+IHtcbiAgICAgICAgLy8gICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgIC8vICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgIC8vICAgICBzaGFwZTogKCkgPT4gKHtcbiAgICAgICAgLy8gICAgICAgLi4udGhpcy5fZGVmLnNoYXBlKCksXG4gICAgICAgIC8vICAgICAgIC4uLmF1Z21lbnRhdGlvbixcbiAgICAgICAgLy8gICAgIH0pLFxuICAgICAgICAvLyAgIH0pIGFzIGFueTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlcHJlY2F0ZWQgVXNlIGAuZXh0ZW5kYCBpbnN0ZWFkXG4gICAgICAgICAqICAqL1xuICAgICAgICB0aGlzLmF1Z21lbnQgPSB0aGlzLmV4dGVuZDtcbiAgICB9XG4gICAgX2dldENhY2hlZCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2NhY2hlZCAhPT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jYWNoZWQ7XG4gICAgICAgIGNvbnN0IHNoYXBlID0gdGhpcy5fZGVmLnNoYXBlKCk7XG4gICAgICAgIGNvbnN0IGtleXMgPSB1dGlsLm9iamVjdEtleXMoc2hhcGUpO1xuICAgICAgICB0aGlzLl9jYWNoZWQgPSB7IHNoYXBlLCBrZXlzIH07XG4gICAgICAgIHJldHVybiB0aGlzLl9jYWNoZWQ7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLm9iamVjdCkge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBjb25zdCB7IHNoYXBlLCBrZXlzOiBzaGFwZUtleXMgfSA9IHRoaXMuX2dldENhY2hlZCgpO1xuICAgICAgICBjb25zdCBleHRyYUtleXMgPSBbXTtcbiAgICAgICAgaWYgKCEodGhpcy5fZGVmLmNhdGNoYWxsIGluc3RhbmNlb2YgWm9kTmV2ZXIgJiYgdGhpcy5fZGVmLnVua25vd25LZXlzID09PSBcInN0cmlwXCIpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBjdHguZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmICghc2hhcGVLZXlzLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0cmFLZXlzLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGFpcnMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2Ygc2hhcGVLZXlzKSB7XG4gICAgICAgICAgICBjb25zdCBrZXlWYWxpZGF0b3IgPSBzaGFwZVtrZXldO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBjdHguZGF0YVtrZXldO1xuICAgICAgICAgICAgcGFpcnMucHVzaCh7XG4gICAgICAgICAgICAgICAga2V5OiB7IHN0YXR1czogXCJ2YWxpZFwiLCB2YWx1ZToga2V5IH0sXG4gICAgICAgICAgICAgICAgdmFsdWU6IGtleVZhbGlkYXRvci5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIHZhbHVlLCBjdHgucGF0aCwga2V5KSksXG4gICAgICAgICAgICAgICAgYWx3YXlzU2V0OiBrZXkgaW4gY3R4LmRhdGEsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5fZGVmLmNhdGNoYWxsIGluc3RhbmNlb2YgWm9kTmV2ZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IHVua25vd25LZXlzID0gdGhpcy5fZGVmLnVua25vd25LZXlzO1xuICAgICAgICAgICAgaWYgKHVua25vd25LZXlzID09PSBcInBhc3N0aHJvdWdoXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBleHRyYUtleXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFpcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlOiBrZXkgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHN0YXR1czogXCJ2YWxpZFwiLCB2YWx1ZTogY3R4LmRhdGFba2V5XSB9LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bmtub3duS2V5cyA9PT0gXCJzdHJpY3RcIikge1xuICAgICAgICAgICAgICAgIGlmIChleHRyYUtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS51bnJlY29nbml6ZWRfa2V5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXM6IGV4dHJhS2V5cyxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHVua25vd25LZXlzID09PSBcInN0cmlwXCIpIHtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgWm9kT2JqZWN0IGVycm9yOiBpbnZhbGlkIHVua25vd25LZXlzIHZhbHVlLmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gcnVuIGNhdGNoYWxsIHZhbGlkYXRpb25cbiAgICAgICAgICAgIGNvbnN0IGNhdGNoYWxsID0gdGhpcy5fZGVmLmNhdGNoYWxsO1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZXh0cmFLZXlzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBjdHguZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBrZXk6IHsgc3RhdHVzOiBcInZhbGlkXCIsIHZhbHVlOiBrZXkgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNhdGNoYWxsLl9wYXJzZShuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwgdmFsdWUsIGN0eC5wYXRoLCBrZXkpIC8vLCBjdHguY2hpbGQoa2V5KSwgdmFsdWUsIGdldFBhcnNlZFR5cGUodmFsdWUpXG4gICAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICAgIGFsd2F5c1NldDoga2V5IGluIGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgICAgICAgICAudGhlbihhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3luY1BhaXJzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGF3YWl0IHBhaXIua2V5O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IHBhaXIudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIHN5bmNQYWlycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWx3YXlzU2V0OiBwYWlyLmFsd2F5c1NldCxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBzeW5jUGFpcnM7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC50aGVuKChzeW5jUGFpcnMpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUGFyc2VTdGF0dXMubWVyZ2VPYmplY3RTeW5jKHN0YXR1cywgc3luY1BhaXJzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlT2JqZWN0U3luYyhzdGF0dXMsIHBhaXJzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgc2hhcGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuc2hhcGUoKTtcbiAgICB9XG4gICAgc3RyaWN0KG1lc3NhZ2UpIHtcbiAgICAgICAgZXJyb3JVdGlsLmVyclRvT2JqO1xuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICB1bmtub3duS2V5czogXCJzdHJpY3RcIixcbiAgICAgICAgICAgIC4uLihtZXNzYWdlICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNYXA6IChpc3N1ZSwgY3R4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWZhdWx0RXJyb3IgPSB0aGlzLl9kZWYuZXJyb3JNYXA/Lihpc3N1ZSwgY3R4KS5tZXNzYWdlID8/IGN0eC5kZWZhdWx0RXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNzdWUuY29kZSA9PT0gXCJ1bnJlY29nbml6ZWRfa2V5c1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yVXRpbC5lcnJUb09iaihtZXNzYWdlKS5tZXNzYWdlID8/IGRlZmF1bHRFcnJvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBkZWZhdWx0RXJyb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHN0cmlwKCkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICB1bmtub3duS2V5czogXCJzdHJpcFwiLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcGFzc3Rocm91Z2goKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kT2JqZWN0KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIHVua25vd25LZXlzOiBcInBhc3N0aHJvdWdoXCIsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBjb25zdCBBdWdtZW50RmFjdG9yeSA9XG4gICAgLy8gICA8RGVmIGV4dGVuZHMgWm9kT2JqZWN0RGVmPihkZWY6IERlZikgPT5cbiAgICAvLyAgIDxBdWdtZW50YXRpb24gZXh0ZW5kcyBab2RSYXdTaGFwZT4oXG4gICAgLy8gICAgIGF1Z21lbnRhdGlvbjogQXVnbWVudGF0aW9uXG4gICAgLy8gICApOiBab2RPYmplY3Q8XG4gICAgLy8gICAgIGV4dGVuZFNoYXBlPFJldHVyblR5cGU8RGVmW1wic2hhcGVcIl0+LCBBdWdtZW50YXRpb24+LFxuICAgIC8vICAgICBEZWZbXCJ1bmtub3duS2V5c1wiXSxcbiAgICAvLyAgICAgRGVmW1wiY2F0Y2hhbGxcIl1cbiAgICAvLyAgID4gPT4ge1xuICAgIC8vICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgLy8gICAgICAgLi4uZGVmLFxuICAgIC8vICAgICAgIHNoYXBlOiAoKSA9PiAoe1xuICAgIC8vICAgICAgICAgLi4uZGVmLnNoYXBlKCksXG4gICAgLy8gICAgICAgICAuLi5hdWdtZW50YXRpb24sXG4gICAgLy8gICAgICAgfSksXG4gICAgLy8gICAgIH0pIGFzIGFueTtcbiAgICAvLyAgIH07XG4gICAgZXh0ZW5kKGF1Z21lbnRhdGlvbikge1xuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gKHtcbiAgICAgICAgICAgICAgICAuLi50aGlzLl9kZWYuc2hhcGUoKSxcbiAgICAgICAgICAgICAgICAuLi5hdWdtZW50YXRpb24sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByaW9yIHRvIHpvZEAxLjAuMTIgdGhlcmUgd2FzIGEgYnVnIGluIHRoZVxuICAgICAqIGluZmVycmVkIHR5cGUgb2YgbWVyZ2VkIG9iamVjdHMuIFBsZWFzZVxuICAgICAqIHVwZ3JhZGUgaWYgeW91IGFyZSBleHBlcmllbmNpbmcgaXNzdWVzLlxuICAgICAqL1xuICAgIG1lcmdlKG1lcmdpbmcpIHtcbiAgICAgICAgY29uc3QgbWVyZ2VkID0gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICB1bmtub3duS2V5czogbWVyZ2luZy5fZGVmLnVua25vd25LZXlzLFxuICAgICAgICAgICAgY2F0Y2hhbGw6IG1lcmdpbmcuX2RlZi5jYXRjaGFsbCxcbiAgICAgICAgICAgIHNoYXBlOiAoKSA9PiAoe1xuICAgICAgICAgICAgICAgIC4uLnRoaXMuX2RlZi5zaGFwZSgpLFxuICAgICAgICAgICAgICAgIC4uLm1lcmdpbmcuX2RlZi5zaGFwZSgpLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZXJnZWQ7XG4gICAgfVxuICAgIC8vIG1lcmdlPFxuICAgIC8vICAgSW5jb21pbmcgZXh0ZW5kcyBBbnlab2RPYmplY3QsXG4gICAgLy8gICBBdWdtZW50YXRpb24gZXh0ZW5kcyBJbmNvbWluZ1tcInNoYXBlXCJdLFxuICAgIC8vICAgTmV3T3V0cHV0IGV4dGVuZHMge1xuICAgIC8vICAgICBbayBpbiBrZXlvZiBBdWdtZW50YXRpb24gfCBrZXlvZiBPdXRwdXRdOiBrIGV4dGVuZHMga2V5b2YgQXVnbWVudGF0aW9uXG4gICAgLy8gICAgICAgPyBBdWdtZW50YXRpb25ba11bXCJfb3V0cHV0XCJdXG4gICAgLy8gICAgICAgOiBrIGV4dGVuZHMga2V5b2YgT3V0cHV0XG4gICAgLy8gICAgICAgPyBPdXRwdXRba11cbiAgICAvLyAgICAgICA6IG5ldmVyO1xuICAgIC8vICAgfSxcbiAgICAvLyAgIE5ld0lucHV0IGV4dGVuZHMge1xuICAgIC8vICAgICBbayBpbiBrZXlvZiBBdWdtZW50YXRpb24gfCBrZXlvZiBJbnB1dF06IGsgZXh0ZW5kcyBrZXlvZiBBdWdtZW50YXRpb25cbiAgICAvLyAgICAgICA/IEF1Z21lbnRhdGlvbltrXVtcIl9pbnB1dFwiXVxuICAgIC8vICAgICAgIDogayBleHRlbmRzIGtleW9mIElucHV0XG4gICAgLy8gICAgICAgPyBJbnB1dFtrXVxuICAgIC8vICAgICAgIDogbmV2ZXI7XG4gICAgLy8gICB9XG4gICAgLy8gPihcbiAgICAvLyAgIG1lcmdpbmc6IEluY29taW5nXG4gICAgLy8gKTogWm9kT2JqZWN0PFxuICAgIC8vICAgZXh0ZW5kU2hhcGU8VCwgUmV0dXJuVHlwZTxJbmNvbWluZ1tcIl9kZWZcIl1bXCJzaGFwZVwiXT4+LFxuICAgIC8vICAgSW5jb21pbmdbXCJfZGVmXCJdW1widW5rbm93bktleXNcIl0sXG4gICAgLy8gICBJbmNvbWluZ1tcIl9kZWZcIl1bXCJjYXRjaGFsbFwiXSxcbiAgICAvLyAgIE5ld091dHB1dCxcbiAgICAvLyAgIE5ld0lucHV0XG4gICAgLy8gPiB7XG4gICAgLy8gICBjb25zdCBtZXJnZWQ6IGFueSA9IG5ldyBab2RPYmplY3Qoe1xuICAgIC8vICAgICB1bmtub3duS2V5czogbWVyZ2luZy5fZGVmLnVua25vd25LZXlzLFxuICAgIC8vICAgICBjYXRjaGFsbDogbWVyZ2luZy5fZGVmLmNhdGNoYWxsLFxuICAgIC8vICAgICBzaGFwZTogKCkgPT5cbiAgICAvLyAgICAgICBvYmplY3RVdGlsLm1lcmdlU2hhcGVzKHRoaXMuX2RlZi5zaGFwZSgpLCBtZXJnaW5nLl9kZWYuc2hhcGUoKSksXG4gICAgLy8gICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kT2JqZWN0LFxuICAgIC8vICAgfSkgYXMgYW55O1xuICAgIC8vICAgcmV0dXJuIG1lcmdlZDtcbiAgICAvLyB9XG4gICAgc2V0S2V5KGtleSwgc2NoZW1hKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmF1Z21lbnQoeyBba2V5XTogc2NoZW1hIH0pO1xuICAgIH1cbiAgICAvLyBtZXJnZTxJbmNvbWluZyBleHRlbmRzIEFueVpvZE9iamVjdD4oXG4gICAgLy8gICBtZXJnaW5nOiBJbmNvbWluZ1xuICAgIC8vICk6IC8vWm9kT2JqZWN0PFQgJiBJbmNvbWluZ1tcIl9zaGFwZVwiXSwgVW5rbm93bktleXMsIENhdGNoYWxsPiA9IChtZXJnaW5nKSA9PiB7XG4gICAgLy8gWm9kT2JqZWN0PFxuICAgIC8vICAgZXh0ZW5kU2hhcGU8VCwgUmV0dXJuVHlwZTxJbmNvbWluZ1tcIl9kZWZcIl1bXCJzaGFwZVwiXT4+LFxuICAgIC8vICAgSW5jb21pbmdbXCJfZGVmXCJdW1widW5rbm93bktleXNcIl0sXG4gICAgLy8gICBJbmNvbWluZ1tcIl9kZWZcIl1bXCJjYXRjaGFsbFwiXVxuICAgIC8vID4ge1xuICAgIC8vICAgLy8gY29uc3QgbWVyZ2VkU2hhcGUgPSBvYmplY3RVdGlsLm1lcmdlU2hhcGVzKFxuICAgIC8vICAgLy8gICB0aGlzLl9kZWYuc2hhcGUoKSxcbiAgICAvLyAgIC8vICAgbWVyZ2luZy5fZGVmLnNoYXBlKClcbiAgICAvLyAgIC8vICk7XG4gICAgLy8gICBjb25zdCBtZXJnZWQ6IGFueSA9IG5ldyBab2RPYmplY3Qoe1xuICAgIC8vICAgICB1bmtub3duS2V5czogbWVyZ2luZy5fZGVmLnVua25vd25LZXlzLFxuICAgIC8vICAgICBjYXRjaGFsbDogbWVyZ2luZy5fZGVmLmNhdGNoYWxsLFxuICAgIC8vICAgICBzaGFwZTogKCkgPT5cbiAgICAvLyAgICAgICBvYmplY3RVdGlsLm1lcmdlU2hhcGVzKHRoaXMuX2RlZi5zaGFwZSgpLCBtZXJnaW5nLl9kZWYuc2hhcGUoKSksXG4gICAgLy8gICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kT2JqZWN0LFxuICAgIC8vICAgfSkgYXMgYW55O1xuICAgIC8vICAgcmV0dXJuIG1lcmdlZDtcbiAgICAvLyB9XG4gICAgY2F0Y2hhbGwoaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RPYmplY3Qoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgY2F0Y2hhbGw6IGluZGV4LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcGljayhtYXNrKSB7XG4gICAgICAgIGNvbnN0IHNoYXBlID0ge307XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHV0aWwub2JqZWN0S2V5cyhtYXNrKSkge1xuICAgICAgICAgICAgaWYgKG1hc2tba2V5XSAmJiB0aGlzLnNoYXBlW2tleV0pIHtcbiAgICAgICAgICAgICAgICBzaGFwZVtrZXldID0gdGhpcy5zaGFwZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgWm9kT2JqZWN0KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIHNoYXBlOiAoKSA9PiBzaGFwZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG9taXQobWFzaykge1xuICAgICAgICBjb25zdCBzaGFwZSA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiB1dGlsLm9iamVjdEtleXModGhpcy5zaGFwZSkpIHtcbiAgICAgICAgICAgIGlmICghbWFza1trZXldKSB7XG4gICAgICAgICAgICAgICAgc2hhcGVba2V5XSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gc2hhcGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIGRlZXBQYXJ0aWFsKCkge1xuICAgICAgICByZXR1cm4gZGVlcFBhcnRpYWxpZnkodGhpcyk7XG4gICAgfVxuICAgIHBhcnRpYWwobWFzaykge1xuICAgICAgICBjb25zdCBuZXdTaGFwZSA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiB1dGlsLm9iamVjdEtleXModGhpcy5zaGFwZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkU2NoZW1hID0gdGhpcy5zaGFwZVtrZXldO1xuICAgICAgICAgICAgaWYgKG1hc2sgJiYgIW1hc2tba2V5XSkge1xuICAgICAgICAgICAgICAgIG5ld1NoYXBlW2tleV0gPSBmaWVsZFNjaGVtYTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG5ld1NoYXBlW2tleV0gPSBmaWVsZFNjaGVtYS5vcHRpb25hbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgWm9kT2JqZWN0KHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIHNoYXBlOiAoKSA9PiBuZXdTaGFwZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlcXVpcmVkKG1hc2spIHtcbiAgICAgICAgY29uc3QgbmV3U2hhcGUgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgdXRpbC5vYmplY3RLZXlzKHRoaXMuc2hhcGUpKSB7XG4gICAgICAgICAgICBpZiAobWFzayAmJiAhbWFza1trZXldKSB7XG4gICAgICAgICAgICAgICAgbmV3U2hhcGVba2V5XSA9IHRoaXMuc2hhcGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkU2NoZW1hID0gdGhpcy5zaGFwZVtrZXldO1xuICAgICAgICAgICAgICAgIGxldCBuZXdGaWVsZCA9IGZpZWxkU2NoZW1hO1xuICAgICAgICAgICAgICAgIHdoaWxlIChuZXdGaWVsZCBpbnN0YW5jZW9mIFpvZE9wdGlvbmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld0ZpZWxkID0gbmV3RmllbGQuX2RlZi5pbm5lclR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5ld1NoYXBlW2tleV0gPSBuZXdGaWVsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBzaGFwZTogKCkgPT4gbmV3U2hhcGUsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBrZXlvZigpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZVpvZEVudW0odXRpbC5vYmplY3RLZXlzKHRoaXMuc2hhcGUpKTtcbiAgICB9XG59XG5ab2RPYmplY3QuY3JlYXRlID0gKHNoYXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgIHNoYXBlOiAoKSA9PiBzaGFwZSxcbiAgICAgICAgdW5rbm93bktleXM6IFwic3RyaXBcIixcbiAgICAgICAgY2F0Y2hhbGw6IFpvZE5ldmVyLmNyZWF0ZSgpLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcblpvZE9iamVjdC5zdHJpY3RDcmVhdGUgPSAoc2hhcGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kT2JqZWN0KHtcbiAgICAgICAgc2hhcGU6ICgpID0+IHNoYXBlLFxuICAgICAgICB1bmtub3duS2V5czogXCJzdHJpY3RcIixcbiAgICAgICAgY2F0Y2hhbGw6IFpvZE5ldmVyLmNyZWF0ZSgpLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9iamVjdCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcblpvZE9iamVjdC5sYXp5Y3JlYXRlID0gKHNoYXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE9iamVjdCh7XG4gICAgICAgIHNoYXBlLFxuICAgICAgICB1bmtub3duS2V5czogXCJzdHJpcFwiLFxuICAgICAgICBjYXRjaGFsbDogWm9kTmV2ZXIuY3JlYXRlKCksXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kT2JqZWN0LFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFVuaW9uIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5fZGVmLm9wdGlvbnM7XG4gICAgICAgIGZ1bmN0aW9uIGhhbmRsZVJlc3VsdHMocmVzdWx0cykge1xuICAgICAgICAgICAgLy8gcmV0dXJuIGZpcnN0IGlzc3VlLWZyZWUgdmFsaWRhdGlvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnJlc3VsdC5zdGF0dXMgPT09IFwidmFsaWRcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJlc3VsdCBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5yZXN1bHQuc3RhdHVzID09PSBcImRpcnR5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGlzc3VlcyBmcm9tIGRpcnR5IG9wdGlvblxuICAgICAgICAgICAgICAgICAgICBjdHguY29tbW9uLmlzc3Vlcy5wdXNoKC4uLnJlc3VsdC5jdHguY29tbW9uLmlzc3Vlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQucmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJldHVybiBpbnZhbGlkXG4gICAgICAgICAgICBjb25zdCB1bmlvbkVycm9ycyA9IHJlc3VsdHMubWFwKChyZXN1bHQpID0+IG5ldyBab2RFcnJvcihyZXN1bHQuY3R4LmNvbW1vbi5pc3N1ZXMpKTtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3VuaW9uLFxuICAgICAgICAgICAgICAgIHVuaW9uRXJyb3JzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKG9wdGlvbnMubWFwKGFzeW5jIChvcHRpb24pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZEN0eCA9IHtcbiAgICAgICAgICAgICAgICAgICAgLi4uY3R4LFxuICAgICAgICAgICAgICAgICAgICBjb21tb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLmN0eC5jb21tb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGF3YWl0IG9wdGlvbi5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjaGlsZEN0eCxcbiAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgIGN0eDogY2hpbGRDdHgsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pKS50aGVuKGhhbmRsZVJlc3VsdHMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IGRpcnR5ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgY29uc3QgaXNzdWVzID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG9wdGlvbiBvZiBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRDdHggPSB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmN0eCxcbiAgICAgICAgICAgICAgICAgICAgY29tbW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5jdHguY29tbW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBudWxsLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gb3B0aW9uLl9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY2hpbGRDdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IFwidmFsaWRcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChyZXN1bHQuc3RhdHVzID09PSBcImRpcnR5XCIgJiYgIWRpcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgIGRpcnR5ID0geyByZXN1bHQsIGN0eDogY2hpbGRDdHggfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkQ3R4LmNvbW1vbi5pc3N1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKGNoaWxkQ3R4LmNvbW1vbi5pc3N1ZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkaXJ0eSkge1xuICAgICAgICAgICAgICAgIGN0eC5jb21tb24uaXNzdWVzLnB1c2goLi4uZGlydHkuY3R4LmNvbW1vbi5pc3N1ZXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkaXJ0eS5yZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB1bmlvbkVycm9ycyA9IGlzc3Vlcy5tYXAoKGlzc3VlcykgPT4gbmV3IFpvZEVycm9yKGlzc3VlcykpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdW5pb24sXG4gICAgICAgICAgICAgICAgdW5pb25FcnJvcnMsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldCBvcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLm9wdGlvbnM7XG4gICAgfVxufVxuWm9kVW5pb24uY3JlYXRlID0gKHR5cGVzLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZFVuaW9uKHtcbiAgICAgICAgb3B0aW9uczogdHlwZXMsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kVW5pb24sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vXG4vLy8vLy8vLy8vICAgICAgWm9kRGlzY3JpbWluYXRlZFVuaW9uICAgICAgLy8vLy8vLy8vL1xuLy8vLy8vLy8vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuY29uc3QgZ2V0RGlzY3JpbWluYXRvciA9ICh0eXBlKSA9PiB7XG4gICAgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RMYXp5KSB7XG4gICAgICAgIHJldHVybiBnZXREaXNjcmltaW5hdG9yKHR5cGUuc2NoZW1hKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZEVmZmVjdHMpIHtcbiAgICAgICAgcmV0dXJuIGdldERpc2NyaW1pbmF0b3IodHlwZS5pbm5lclR5cGUoKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RMaXRlcmFsKSB7XG4gICAgICAgIHJldHVybiBbdHlwZS52YWx1ZV07XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RFbnVtKSB7XG4gICAgICAgIHJldHVybiB0eXBlLm9wdGlvbnM7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2ROYXRpdmVFbnVtKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBiYW4vYmFuXG4gICAgICAgIHJldHVybiB1dGlsLm9iamVjdFZhbHVlcyh0eXBlLmVudW0pO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kRGVmYXVsdCkge1xuICAgICAgICByZXR1cm4gZ2V0RGlzY3JpbWluYXRvcih0eXBlLl9kZWYuaW5uZXJUeXBlKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZFVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gW3VuZGVmaW5lZF07XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2ROdWxsKSB7XG4gICAgICAgIHJldHVybiBbbnVsbF07XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2RPcHRpb25hbCkge1xuICAgICAgICByZXR1cm4gW3VuZGVmaW5lZCwgLi4uZ2V0RGlzY3JpbWluYXRvcih0eXBlLnVud3JhcCgpKV07XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGUgaW5zdGFuY2VvZiBab2ROdWxsYWJsZSkge1xuICAgICAgICByZXR1cm4gW251bGwsIC4uLmdldERpc2NyaW1pbmF0b3IodHlwZS51bndyYXAoKSldO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kQnJhbmRlZCkge1xuICAgICAgICByZXR1cm4gZ2V0RGlzY3JpbWluYXRvcih0eXBlLnVud3JhcCgpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZSBpbnN0YW5jZW9mIFpvZFJlYWRvbmx5KSB7XG4gICAgICAgIHJldHVybiBnZXREaXNjcmltaW5hdG9yKHR5cGUudW53cmFwKCkpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlIGluc3RhbmNlb2YgWm9kQ2F0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGdldERpc2NyaW1pbmF0b3IodHlwZS5fZGVmLmlubmVyVHlwZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxufTtcbmV4cG9ydCBjbGFzcyBab2REaXNjcmltaW5hdGVkVW5pb24gZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5vYmplY3QpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlzY3JpbWluYXRvciA9IHRoaXMuZGlzY3JpbWluYXRvcjtcbiAgICAgICAgY29uc3QgZGlzY3JpbWluYXRvclZhbHVlID0gY3R4LmRhdGFbZGlzY3JpbWluYXRvcl07XG4gICAgICAgIGNvbnN0IG9wdGlvbiA9IHRoaXMub3B0aW9uc01hcC5nZXQoZGlzY3JpbWluYXRvclZhbHVlKTtcbiAgICAgICAgaWYgKCFvcHRpb24pIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3VuaW9uX2Rpc2NyaW1pbmF0b3IsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogQXJyYXkuZnJvbSh0aGlzLm9wdGlvbnNNYXAua2V5cygpKSxcbiAgICAgICAgICAgICAgICBwYXRoOiBbZGlzY3JpbWluYXRvcl0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICByZXR1cm4gb3B0aW9uLl9wYXJzZUFzeW5jKHtcbiAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbi5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGdldCBkaXNjcmltaW5hdG9yKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmRpc2NyaW1pbmF0b3I7XG4gICAgfVxuICAgIGdldCBvcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLm9wdGlvbnM7XG4gICAgfVxuICAgIGdldCBvcHRpb25zTWFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLm9wdGlvbnNNYXA7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgZGlzY3JpbWluYXRlZCB1bmlvbiBzY2hlbWEuIEl0cyBiZWhhdmlvdXIgaXMgdmVyeSBzaW1pbGFyIHRvIHRoYXQgb2YgdGhlIG5vcm1hbCB6LnVuaW9uKCkgY29uc3RydWN0b3IuXG4gICAgICogSG93ZXZlciwgaXQgb25seSBhbGxvd3MgYSB1bmlvbiBvZiBvYmplY3RzLCBhbGwgb2Ygd2hpY2ggbmVlZCB0byBzaGFyZSBhIGRpc2NyaW1pbmF0b3IgcHJvcGVydHkuIFRoaXMgcHJvcGVydHkgbXVzdFxuICAgICAqIGhhdmUgYSBkaWZmZXJlbnQgdmFsdWUgZm9yIGVhY2ggb2JqZWN0IGluIHRoZSB1bmlvbi5cbiAgICAgKiBAcGFyYW0gZGlzY3JpbWluYXRvciB0aGUgbmFtZSBvZiB0aGUgZGlzY3JpbWluYXRvciBwcm9wZXJ0eVxuICAgICAqIEBwYXJhbSB0eXBlcyBhbiBhcnJheSBvZiBvYmplY3Qgc2NoZW1hc1xuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKi9cbiAgICBzdGF0aWMgY3JlYXRlKGRpc2NyaW1pbmF0b3IsIG9wdGlvbnMsIHBhcmFtcykge1xuICAgICAgICAvLyBHZXQgYWxsIHRoZSB2YWxpZCBkaXNjcmltaW5hdG9yIHZhbHVlc1xuICAgICAgICBjb25zdCBvcHRpb25zTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAvLyB0cnkge1xuICAgICAgICBmb3IgKGNvbnN0IHR5cGUgb2Ygb3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgZGlzY3JpbWluYXRvclZhbHVlcyA9IGdldERpc2NyaW1pbmF0b3IodHlwZS5zaGFwZVtkaXNjcmltaW5hdG9yXSk7XG4gICAgICAgICAgICBpZiAoIWRpc2NyaW1pbmF0b3JWYWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBIGRpc2NyaW1pbmF0b3IgdmFsdWUgZm9yIGtleSBcXGAke2Rpc2NyaW1pbmF0b3J9XFxgIGNvdWxkIG5vdCBiZSBleHRyYWN0ZWQgZnJvbSBhbGwgc2NoZW1hIG9wdGlvbnNgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgdmFsdWUgb2YgZGlzY3JpbWluYXRvclZhbHVlcykge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zTWFwLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEaXNjcmltaW5hdG9yIHByb3BlcnR5ICR7U3RyaW5nKGRpc2NyaW1pbmF0b3IpfSBoYXMgZHVwbGljYXRlIHZhbHVlICR7U3RyaW5nKHZhbHVlKX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3B0aW9uc01hcC5zZXQodmFsdWUsIHR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgWm9kRGlzY3JpbWluYXRlZFVuaW9uKHtcbiAgICAgICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRGlzY3JpbWluYXRlZFVuaW9uLFxuICAgICAgICAgICAgZGlzY3JpbWluYXRvcixcbiAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICBvcHRpb25zTWFwLFxuICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgICAgICB9KTtcbiAgICB9XG59XG5mdW5jdGlvbiBtZXJnZVZhbHVlcyhhLCBiKSB7XG4gICAgY29uc3QgYVR5cGUgPSBnZXRQYXJzZWRUeXBlKGEpO1xuICAgIGNvbnN0IGJUeXBlID0gZ2V0UGFyc2VkVHlwZShiKTtcbiAgICBpZiAoYSA9PT0gYikge1xuICAgICAgICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgZGF0YTogYSB9O1xuICAgIH1cbiAgICBlbHNlIGlmIChhVHlwZSA9PT0gWm9kUGFyc2VkVHlwZS5vYmplY3QgJiYgYlR5cGUgPT09IFpvZFBhcnNlZFR5cGUub2JqZWN0KSB7XG4gICAgICAgIGNvbnN0IGJLZXlzID0gdXRpbC5vYmplY3RLZXlzKGIpO1xuICAgICAgICBjb25zdCBzaGFyZWRLZXlzID0gdXRpbC5vYmplY3RLZXlzKGEpLmZpbHRlcigoa2V5KSA9PiBiS2V5cy5pbmRleE9mKGtleSkgIT09IC0xKTtcbiAgICAgICAgY29uc3QgbmV3T2JqID0geyAuLi5hLCAuLi5iIH07XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIHNoYXJlZEtleXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHNoYXJlZFZhbHVlID0gbWVyZ2VWYWx1ZXMoYVtrZXldLCBiW2tleV0pO1xuICAgICAgICAgICAgaWYgKCFzaGFyZWRWYWx1ZS52YWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3T2JqW2tleV0gPSBzaGFyZWRWYWx1ZS5kYXRhO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiB0cnVlLCBkYXRhOiBuZXdPYmogfTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYVR5cGUgPT09IFpvZFBhcnNlZFR5cGUuYXJyYXkgJiYgYlR5cGUgPT09IFpvZFBhcnNlZFR5cGUuYXJyYXkpIHtcbiAgICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbmV3QXJyYXkgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGEubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICBjb25zdCBpdGVtQSA9IGFbaW5kZXhdO1xuICAgICAgICAgICAgY29uc3QgaXRlbUIgPSBiW2luZGV4XTtcbiAgICAgICAgICAgIGNvbnN0IHNoYXJlZFZhbHVlID0gbWVyZ2VWYWx1ZXMoaXRlbUEsIGl0ZW1CKTtcbiAgICAgICAgICAgIGlmICghc2hhcmVkVmFsdWUudmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWxpZDogZmFsc2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld0FycmF5LnB1c2goc2hhcmVkVmFsdWUuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGRhdGE6IG5ld0FycmF5IH07XG4gICAgfVxuICAgIGVsc2UgaWYgKGFUeXBlID09PSBab2RQYXJzZWRUeXBlLmRhdGUgJiYgYlR5cGUgPT09IFpvZFBhcnNlZFR5cGUuZGF0ZSAmJiArYSA9PT0gK2IpIHtcbiAgICAgICAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIGRhdGE6IGEgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiB7IHZhbGlkOiBmYWxzZSB9O1xuICAgIH1cbn1cbmV4cG9ydCBjbGFzcyBab2RJbnRlcnNlY3Rpb24gZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0dXMsIGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3QgaGFuZGxlUGFyc2VkID0gKHBhcnNlZExlZnQsIHBhcnNlZFJpZ2h0KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNBYm9ydGVkKHBhcnNlZExlZnQpIHx8IGlzQWJvcnRlZChwYXJzZWRSaWdodCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG1lcmdlZCA9IG1lcmdlVmFsdWVzKHBhcnNlZExlZnQudmFsdWUsIHBhcnNlZFJpZ2h0LnZhbHVlKTtcbiAgICAgICAgICAgIGlmICghbWVyZ2VkLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX2ludGVyc2VjdGlvbl90eXBlcyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc0RpcnR5KHBhcnNlZExlZnQpIHx8IGlzRGlydHkocGFyc2VkUmlnaHQpKSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IG1lcmdlZC5kYXRhIH07XG4gICAgICAgIH07XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlZi5sZWZ0Ll9wYXJzZUFzeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICB0aGlzLl9kZWYucmlnaHQuX3BhcnNlQXN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgXSkudGhlbigoW2xlZnQsIHJpZ2h0XSkgPT4gaGFuZGxlUGFyc2VkKGxlZnQsIHJpZ2h0KSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlUGFyc2VkKHRoaXMuX2RlZi5sZWZ0Ll9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICAgICAgfSksIHRoaXMuX2RlZi5yaWdodC5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICBkYXRhOiBjdHguZGF0YSxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblpvZEludGVyc2VjdGlvbi5jcmVhdGUgPSAobGVmdCwgcmlnaHQsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kSW50ZXJzZWN0aW9uKHtcbiAgICAgICAgbGVmdDogbGVmdCxcbiAgICAgICAgcmlnaHQ6IHJpZ2h0LFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEludGVyc2VjdGlvbixcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbi8vIHR5cGUgWm9kVHVwbGVJdGVtcyA9IFtab2RUeXBlQW55LCAuLi5ab2RUeXBlQW55W11dO1xuZXhwb3J0IGNsYXNzIFpvZFR1cGxlIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5hcnJheSkge1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5hcnJheSxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdHguZGF0YS5sZW5ndGggPCB0aGlzLl9kZWYuaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUudG9vX3NtYWxsLFxuICAgICAgICAgICAgICAgIG1pbmltdW06IHRoaXMuX2RlZi5pdGVtcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcImFycmF5XCIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3QgPSB0aGlzLl9kZWYucmVzdDtcbiAgICAgICAgaWYgKCFyZXN0ICYmIGN0eC5kYXRhLmxlbmd0aCA+IHRoaXMuX2RlZi5pdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fYmlnLFxuICAgICAgICAgICAgICAgIG1heGltdW06IHRoaXMuX2RlZi5pdGVtcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBcImFycmF5XCIsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gWy4uLmN0eC5kYXRhXVxuICAgICAgICAgICAgLm1hcCgoaXRlbSwgaXRlbUluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzY2hlbWEgPSB0aGlzLl9kZWYuaXRlbXNbaXRlbUluZGV4XSB8fCB0aGlzLl9kZWYucmVzdDtcbiAgICAgICAgICAgIGlmICghc2NoZW1hKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHNjaGVtYS5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIGl0ZW0sIGN0eC5wYXRoLCBpdGVtSW5kZXgpKTtcbiAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKHgpID0+ICEheCk7IC8vIGZpbHRlciBudWxsc1xuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGl0ZW1zKS50aGVuKChyZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlQXJyYXkoc3RhdHVzLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlQXJyYXkoc3RhdHVzLCBpdGVtcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZ2V0IGl0ZW1zKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLml0ZW1zO1xuICAgIH1cbiAgICByZXN0KHJlc3QpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RUdXBsZSh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICByZXN0LFxuICAgICAgICB9KTtcbiAgICB9XG59XG5ab2RUdXBsZS5jcmVhdGUgPSAoc2NoZW1hcywgcGFyYW1zKSA9PiB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHNjaGVtYXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBtdXN0IHBhc3MgYW4gYXJyYXkgb2Ygc2NoZW1hcyB0byB6LnR1cGxlKFsgLi4uIF0pXCIpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFpvZFR1cGxlKHtcbiAgICAgICAgaXRlbXM6IHNjaGVtYXMsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kVHVwbGUsXG4gICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kUmVjb3JkIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgZ2V0IGtleVNjaGVtYSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5rZXlUeXBlO1xuICAgIH1cbiAgICBnZXQgdmFsdWVTY2hlbWEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudmFsdWVUeXBlO1xuICAgIH1cbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0dXMsIGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLm9iamVjdCkge1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwYWlycyA9IFtdO1xuICAgICAgICBjb25zdCBrZXlUeXBlID0gdGhpcy5fZGVmLmtleVR5cGU7XG4gICAgICAgIGNvbnN0IHZhbHVlVHlwZSA9IHRoaXMuX2RlZi52YWx1ZVR5cGU7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGN0eC5kYXRhKSB7XG4gICAgICAgICAgICBwYWlycy5wdXNoKHtcbiAgICAgICAgICAgICAgICBrZXk6IGtleVR5cGUuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBrZXksIGN0eC5wYXRoLCBrZXkpKSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVUeXBlLl9wYXJzZShuZXcgUGFyc2VJbnB1dExhenlQYXRoKGN0eCwgY3R4LmRhdGFba2V5XSwgY3R4LnBhdGgsIGtleSkpLFxuICAgICAgICAgICAgICAgIGFsd2F5c1NldDoga2V5IGluIGN0eC5kYXRhLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIHJldHVybiBQYXJzZVN0YXR1cy5tZXJnZU9iamVjdEFzeW5jKHN0YXR1cywgcGFpcnMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFBhcnNlU3RhdHVzLm1lcmdlT2JqZWN0U3luYyhzdGF0dXMsIHBhaXJzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBnZXQgZWxlbWVudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi52YWx1ZVR5cGU7XG4gICAgfVxuICAgIHN0YXRpYyBjcmVhdGUoZmlyc3QsIHNlY29uZCwgdGhpcmQpIHtcbiAgICAgICAgaWYgKHNlY29uZCBpbnN0YW5jZW9mIFpvZFR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgWm9kUmVjb3JkKHtcbiAgICAgICAgICAgICAgICBrZXlUeXBlOiBmaXJzdCxcbiAgICAgICAgICAgICAgICB2YWx1ZVR5cGU6IHNlY29uZCxcbiAgICAgICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFJlY29yZCxcbiAgICAgICAgICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHRoaXJkKSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgWm9kUmVjb3JkKHtcbiAgICAgICAgICAgIGtleVR5cGU6IFpvZFN0cmluZy5jcmVhdGUoKSxcbiAgICAgICAgICAgIHZhbHVlVHlwZTogZmlyc3QsXG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFJlY29yZCxcbiAgICAgICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMoc2Vjb25kKSxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFpvZE1hcCBleHRlbmRzIFpvZFR5cGUge1xuICAgIGdldCBrZXlTY2hlbWEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYua2V5VHlwZTtcbiAgICB9XG4gICAgZ2V0IHZhbHVlU2NoZW1hKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnZhbHVlVHlwZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5tYXApIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUubWFwLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qga2V5VHlwZSA9IHRoaXMuX2RlZi5rZXlUeXBlO1xuICAgICAgICBjb25zdCB2YWx1ZVR5cGUgPSB0aGlzLl9kZWYudmFsdWVUeXBlO1xuICAgICAgICBjb25zdCBwYWlycyA9IFsuLi5jdHguZGF0YS5lbnRyaWVzKCldLm1hcCgoW2tleSwgdmFsdWVdLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBrZXk6IGtleVR5cGUuX3BhcnNlKG5ldyBQYXJzZUlucHV0TGF6eVBhdGgoY3R4LCBrZXksIGN0eC5wYXRoLCBbaW5kZXgsIFwia2V5XCJdKSksXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlVHlwZS5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIHZhbHVlLCBjdHgucGF0aCwgW2luZGV4LCBcInZhbHVlXCJdKSksXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBhd2FpdCBwYWlyLmtleTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBwYWlyLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIgfHwgdmFsdWUuc3RhdHVzID09PSBcImFib3J0ZWRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGF0dXMgPT09IFwiZGlydHlcIiB8fCB2YWx1ZS5zdGF0dXMgPT09IFwiZGlydHlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZmluYWxNYXAuc2V0KGtleS52YWx1ZSwgdmFsdWUudmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGZpbmFsTWFwIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbmFsTWFwID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gcGFpci5rZXk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYWlyLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhdHVzID09PSBcImFib3J0ZWRcIiB8fCB2YWx1ZS5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXR1cyA9PT0gXCJkaXJ0eVwiIHx8IHZhbHVlLnN0YXR1cyA9PT0gXCJkaXJ0eVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmaW5hbE1hcC5zZXQoa2V5LnZhbHVlLCB2YWx1ZS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGZpbmFsTWFwIH07XG4gICAgICAgIH1cbiAgICB9XG59XG5ab2RNYXAuY3JlYXRlID0gKGtleVR5cGUsIHZhbHVlVHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RNYXAoe1xuICAgICAgICB2YWx1ZVR5cGUsXG4gICAgICAgIGtleVR5cGUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTWFwLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFNldCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IHN0YXR1cywgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuc2V0KSB7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF90eXBlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBab2RQYXJzZWRUeXBlLnNldCxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRlZiA9IHRoaXMuX2RlZjtcbiAgICAgICAgaWYgKGRlZi5taW5TaXplICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoY3R4LmRhdGEuc2l6ZSA8IGRlZi5taW5TaXplLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS50b29fc21hbGwsXG4gICAgICAgICAgICAgICAgICAgIG1pbmltdW06IGRlZi5taW5TaXplLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInNldFwiLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmLm1pblNpemUubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVmLm1heFNpemUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChjdHguZGF0YS5zaXplID4gZGVmLm1heFNpemUudmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLnRvb19iaWcsXG4gICAgICAgICAgICAgICAgICAgIG1heGltdW06IGRlZi5tYXhTaXplLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInNldFwiLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGV4YWN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGVmLm1heFNpemUubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCB2YWx1ZVR5cGUgPSB0aGlzLl9kZWYudmFsdWVUeXBlO1xuICAgICAgICBmdW5jdGlvbiBmaW5hbGl6ZVNldChlbGVtZW50cykge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkU2V0ID0gbmV3IFNldCgpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuc3RhdHVzID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuc3RhdHVzID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5kaXJ0eSgpO1xuICAgICAgICAgICAgICAgIHBhcnNlZFNldC5hZGQoZWxlbWVudC52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IHBhcnNlZFNldCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gWy4uLmN0eC5kYXRhLnZhbHVlcygpXS5tYXAoKGl0ZW0sIGkpID0+IHZhbHVlVHlwZS5fcGFyc2UobmV3IFBhcnNlSW5wdXRMYXp5UGF0aChjdHgsIGl0ZW0sIGN0eC5wYXRoLCBpKSkpO1xuICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGVsZW1lbnRzKS50aGVuKChlbGVtZW50cykgPT4gZmluYWxpemVTZXQoZWxlbWVudHMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmaW5hbGl6ZVNldChlbGVtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbWluKG1pblNpemUsIG1lc3NhZ2UpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBab2RTZXQoe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgbWluU2l6ZTogeyB2YWx1ZTogbWluU2l6ZSwgbWVzc2FnZTogZXJyb3JVdGlsLnRvU3RyaW5nKG1lc3NhZ2UpIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBtYXgobWF4U2l6ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gbmV3IFpvZFNldCh7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICBtYXhTaXplOiB7IHZhbHVlOiBtYXhTaXplLCBtZXNzYWdlOiBlcnJvclV0aWwudG9TdHJpbmcobWVzc2FnZSkgfSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHNpemUoc2l6ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5taW4oc2l6ZSwgbWVzc2FnZSkubWF4KHNpemUsIG1lc3NhZ2UpO1xuICAgIH1cbiAgICBub25lbXB0eShtZXNzYWdlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1pbigxLCBtZXNzYWdlKTtcbiAgICB9XG59XG5ab2RTZXQuY3JlYXRlID0gKHZhbHVlVHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RTZXQoe1xuICAgICAgICB2YWx1ZVR5cGUsXG4gICAgICAgIG1pblNpemU6IG51bGwsXG4gICAgICAgIG1heFNpemU6IG51bGwsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kU2V0LFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZEZ1bmN0aW9uIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIHRoaXMudmFsaWRhdGUgPSB0aGlzLmltcGxlbWVudDtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUuZnVuY3Rpb24pIHtcbiAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwge1xuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IFpvZFBhcnNlZFR5cGUuZnVuY3Rpb24sXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBtYWtlQXJnc0lzc3VlKGFyZ3MsIGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFrZUlzc3VlKHtcbiAgICAgICAgICAgICAgICBkYXRhOiBhcmdzLFxuICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgIGVycm9yTWFwczogW2N0eC5jb21tb24uY29udGV4dHVhbEVycm9yTWFwLCBjdHguc2NoZW1hRXJyb3JNYXAsIGdldEVycm9yTWFwKCksIGRlZmF1bHRFcnJvck1hcF0uZmlsdGVyKCh4KSA9PiAhIXgpLFxuICAgICAgICAgICAgICAgIGlzc3VlRGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBab2RJc3N1ZUNvZGUuaW52YWxpZF9hcmd1bWVudHMsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c0Vycm9yOiBlcnJvcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gbWFrZVJldHVybnNJc3N1ZShyZXR1cm5zLCBlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIG1ha2VJc3N1ZSh7XG4gICAgICAgICAgICAgICAgZGF0YTogcmV0dXJucyxcbiAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICBlcnJvck1hcHM6IFtjdHguY29tbW9uLmNvbnRleHR1YWxFcnJvck1hcCwgY3R4LnNjaGVtYUVycm9yTWFwLCBnZXRFcnJvck1hcCgpLCBkZWZhdWx0RXJyb3JNYXBdLmZpbHRlcigoeCkgPT4gISF4KSxcbiAgICAgICAgICAgICAgICBpc3N1ZURhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfcmV0dXJuX3R5cGUsXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblR5cGVFcnJvcjogZXJyb3IsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHsgZXJyb3JNYXA6IGN0eC5jb21tb24uY29udGV4dHVhbEVycm9yTWFwIH07XG4gICAgICAgIGNvbnN0IGZuID0gY3R4LmRhdGE7XG4gICAgICAgIGlmICh0aGlzLl9kZWYucmV0dXJucyBpbnN0YW5jZW9mIFpvZFByb21pc2UpIHtcbiAgICAgICAgICAgIC8vIFdvdWxkIGxvdmUgYSB3YXkgdG8gYXZvaWQgZGlzYWJsaW5nIHRoaXMgcnVsZSwgYnV0IHdlIG5lZWRcbiAgICAgICAgICAgIC8vIGFuIGFsaWFzICh1c2luZyBhbiBhcnJvdyBmdW5jdGlvbiB3YXMgd2hhdCBjYXVzZWQgMjY1MSkuXG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGNvbnN0IG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiBPSyhhc3luYyBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IFpvZEVycm9yKFtdKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWRBcmdzID0gYXdhaXQgbWUuX2RlZi5hcmdzLnBhcnNlQXN5bmMoYXJncywgcGFyYW1zKS5jYXRjaCgoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlcnJvci5hZGRJc3N1ZShtYWtlQXJnc0lzc3VlKGFyZ3MsIGUpKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgUmVmbGVjdC5hcHBseShmbiwgdGhpcywgcGFyc2VkQXJncyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkUmV0dXJucyA9IGF3YWl0IG1lLl9kZWYucmV0dXJucy5fZGVmLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgLnBhcnNlQXN5bmMocmVzdWx0LCBwYXJhbXMpXG4gICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlcnJvci5hZGRJc3N1ZShtYWtlUmV0dXJuc0lzc3VlKHJlc3VsdCwgZSkpO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VkUmV0dXJucztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gV291bGQgbG92ZSBhIHdheSB0byBhdm9pZCBkaXNhYmxpbmcgdGhpcyBydWxlLCBidXQgd2UgbmVlZFxuICAgICAgICAgICAgLy8gYW4gYWxpYXMgKHVzaW5nIGFuIGFycm93IGZ1bmN0aW9uIHdhcyB3aGF0IGNhdXNlZCAyNjUxKS5cbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICAgICAgY29uc3QgbWUgPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIE9LKGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkQXJncyA9IG1lLl9kZWYuYXJncy5zYWZlUGFyc2UoYXJncywgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICBpZiAoIXBhcnNlZEFyZ3Muc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgWm9kRXJyb3IoW21ha2VBcmdzSXNzdWUoYXJncywgcGFyc2VkQXJncy5lcnJvcildKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gUmVmbGVjdC5hcHBseShmbiwgdGhpcywgcGFyc2VkQXJncy5kYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWRSZXR1cm5zID0gbWUuX2RlZi5yZXR1cm5zLnNhZmVQYXJzZShyZXN1bHQsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXJzZWRSZXR1cm5zLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFpvZEVycm9yKFttYWtlUmV0dXJuc0lzc3VlKHJlc3VsdCwgcGFyc2VkUmV0dXJucy5lcnJvcildKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlZFJldHVybnMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHBhcmFtZXRlcnMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuYXJncztcbiAgICB9XG4gICAgcmV0dXJuVHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5yZXR1cm5zO1xuICAgIH1cbiAgICBhcmdzKC4uLml0ZW1zKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kRnVuY3Rpb24oe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgYXJnczogWm9kVHVwbGUuY3JlYXRlKGl0ZW1zKS5yZXN0KFpvZFVua25vd24uY3JlYXRlKCkpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJucyhyZXR1cm5UeXBlKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kRnVuY3Rpb24oe1xuICAgICAgICAgICAgLi4udGhpcy5fZGVmLFxuICAgICAgICAgICAgcmV0dXJuczogcmV0dXJuVHlwZSxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGltcGxlbWVudChmdW5jKSB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZEZ1bmMgPSB0aGlzLnBhcnNlKGZ1bmMpO1xuICAgICAgICByZXR1cm4gdmFsaWRhdGVkRnVuYztcbiAgICB9XG4gICAgc3RyaWN0SW1wbGVtZW50KGZ1bmMpIHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGVkRnVuYyA9IHRoaXMucGFyc2UoZnVuYyk7XG4gICAgICAgIHJldHVybiB2YWxpZGF0ZWRGdW5jO1xuICAgIH1cbiAgICBzdGF0aWMgY3JlYXRlKGFyZ3MsIHJldHVybnMsIHBhcmFtcykge1xuICAgICAgICByZXR1cm4gbmV3IFpvZEZ1bmN0aW9uKHtcbiAgICAgICAgICAgIGFyZ3M6IChhcmdzID8gYXJncyA6IFpvZFR1cGxlLmNyZWF0ZShbXSkucmVzdChab2RVbmtub3duLmNyZWF0ZSgpKSksXG4gICAgICAgICAgICByZXR1cm5zOiByZXR1cm5zIHx8IFpvZFVua25vd24uY3JlYXRlKCksXG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEZ1bmN0aW9uLFxuICAgICAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgWm9kTGF6eSBleHRlbmRzIFpvZFR5cGUge1xuICAgIGdldCBzY2hlbWEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuZ2V0dGVyKCk7XG4gICAgfVxuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3QgbGF6eVNjaGVtYSA9IHRoaXMuX2RlZi5nZXR0ZXIoKTtcbiAgICAgICAgcmV0dXJuIGxhenlTY2hlbWEuX3BhcnNlKHsgZGF0YTogY3R4LmRhdGEsIHBhdGg6IGN0eC5wYXRoLCBwYXJlbnQ6IGN0eCB9KTtcbiAgICB9XG59XG5ab2RMYXp5LmNyZWF0ZSA9IChnZXR0ZXIsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTGF6eSh7XG4gICAgICAgIGdldHRlcjogZ2V0dGVyLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZExhenksXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kTGl0ZXJhbCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBpZiAoaW5wdXQuZGF0YSAhPT0gdGhpcy5fZGVmLnZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfbGl0ZXJhbCxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogdGhpcy5fZGVmLnZhbHVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IFwidmFsaWRcIiwgdmFsdWU6IGlucHV0LmRhdGEgfTtcbiAgICB9XG4gICAgZ2V0IHZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnZhbHVlO1xuICAgIH1cbn1cblpvZExpdGVyYWwuY3JlYXRlID0gKHZhbHVlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZExpdGVyYWwoe1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTGl0ZXJhbCxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmZ1bmN0aW9uIGNyZWF0ZVpvZEVudW0odmFsdWVzLCBwYXJhbXMpIHtcbiAgICByZXR1cm4gbmV3IFpvZEVudW0oe1xuICAgICAgICB2YWx1ZXMsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRW51bSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufVxuZXhwb3J0IGNsYXNzIFpvZEVudW0gZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpbnB1dC5kYXRhICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFZhbHVlcyA9IHRoaXMuX2RlZi52YWx1ZXM7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogdXRpbC5qb2luVmFsdWVzKGV4cGVjdGVkVmFsdWVzKSxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LnBhcnNlZFR5cGUsXG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9jYWNoZSkge1xuICAgICAgICAgICAgdGhpcy5fY2FjaGUgPSBuZXcgU2V0KHRoaXMuX2RlZi52YWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fY2FjaGUuaGFzKGlucHV0LmRhdGEpKSB7XG4gICAgICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFZhbHVlcyA9IHRoaXMuX2RlZi52YWx1ZXM7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfZW51bV92YWx1ZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBleHBlY3RlZFZhbHVlcyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbiAgICBnZXQgb3B0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi52YWx1ZXM7XG4gICAgfVxuICAgIGdldCBlbnVtKCkge1xuICAgICAgICBjb25zdCBlbnVtVmFsdWVzID0ge307XG4gICAgICAgIGZvciAoY29uc3QgdmFsIG9mIHRoaXMuX2RlZi52YWx1ZXMpIHtcbiAgICAgICAgICAgIGVudW1WYWx1ZXNbdmFsXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW51bVZhbHVlcztcbiAgICB9XG4gICAgZ2V0IFZhbHVlcygpIHtcbiAgICAgICAgY29uc3QgZW51bVZhbHVlcyA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IHZhbCBvZiB0aGlzLl9kZWYudmFsdWVzKSB7XG4gICAgICAgICAgICBlbnVtVmFsdWVzW3ZhbF0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVudW1WYWx1ZXM7XG4gICAgfVxuICAgIGdldCBFbnVtKCkge1xuICAgICAgICBjb25zdCBlbnVtVmFsdWVzID0ge307XG4gICAgICAgIGZvciAoY29uc3QgdmFsIG9mIHRoaXMuX2RlZi52YWx1ZXMpIHtcbiAgICAgICAgICAgIGVudW1WYWx1ZXNbdmFsXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW51bVZhbHVlcztcbiAgICB9XG4gICAgZXh0cmFjdCh2YWx1ZXMsIG5ld0RlZiA9IHRoaXMuX2RlZikge1xuICAgICAgICByZXR1cm4gWm9kRW51bS5jcmVhdGUodmFsdWVzLCB7XG4gICAgICAgICAgICAuLi50aGlzLl9kZWYsXG4gICAgICAgICAgICAuLi5uZXdEZWYsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBleGNsdWRlKHZhbHVlcywgbmV3RGVmID0gdGhpcy5fZGVmKSB7XG4gICAgICAgIHJldHVybiBab2RFbnVtLmNyZWF0ZSh0aGlzLm9wdGlvbnMuZmlsdGVyKChvcHQpID0+ICF2YWx1ZXMuaW5jbHVkZXMob3B0KSksIHtcbiAgICAgICAgICAgIC4uLnRoaXMuX2RlZixcbiAgICAgICAgICAgIC4uLm5ld0RlZixcbiAgICAgICAgfSk7XG4gICAgfVxufVxuWm9kRW51bS5jcmVhdGUgPSBjcmVhdGVab2RFbnVtO1xuZXhwb3J0IGNsYXNzIFpvZE5hdGl2ZUVudW0gZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgbmF0aXZlRW51bVZhbHVlcyA9IHV0aWwuZ2V0VmFsaWRFbnVtVmFsdWVzKHRoaXMuX2RlZi52YWx1ZXMpO1xuICAgICAgICBjb25zdCBjdHggPSB0aGlzLl9nZXRPclJldHVybkN0eChpbnB1dCk7XG4gICAgICAgIGlmIChjdHgucGFyc2VkVHlwZSAhPT0gWm9kUGFyc2VkVHlwZS5zdHJpbmcgJiYgY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUubnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFZhbHVlcyA9IHV0aWwub2JqZWN0VmFsdWVzKG5hdGl2ZUVudW1WYWx1ZXMpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IHV0aWwuam9pblZhbHVlcyhleHBlY3RlZFZhbHVlcyksXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgICAgIGNvZGU6IFpvZElzc3VlQ29kZS5pbnZhbGlkX3R5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5fY2FjaGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlID0gbmV3IFNldCh1dGlsLmdldFZhbGlkRW51bVZhbHVlcyh0aGlzLl9kZWYudmFsdWVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLl9jYWNoZS5oYXMoaW5wdXQuZGF0YSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVmFsdWVzID0gdXRpbC5vYmplY3RWYWx1ZXMobmF0aXZlRW51bVZhbHVlcyk7XG4gICAgICAgICAgICBhZGRJc3N1ZVRvQ29udGV4dChjdHgsIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfZW51bV92YWx1ZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBleHBlY3RlZFZhbHVlcyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE9LKGlucHV0LmRhdGEpO1xuICAgIH1cbiAgICBnZXQgZW51bSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi52YWx1ZXM7XG4gICAgfVxufVxuWm9kTmF0aXZlRW51bS5jcmVhdGUgPSAodmFsdWVzLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE5hdGl2ZUVudW0oe1xuICAgICAgICB2YWx1ZXM6IHZhbHVlcyxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2ROYXRpdmVFbnVtLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZFByb21pc2UgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICB1bndyYXAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYudHlwZTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgY3R4IH0gPSB0aGlzLl9wcm9jZXNzSW5wdXRQYXJhbXMoaW5wdXQpO1xuICAgICAgICBpZiAoY3R4LnBhcnNlZFR5cGUgIT09IFpvZFBhcnNlZFR5cGUucHJvbWlzZSAmJiBjdHguY29tbW9uLmFzeW5jID09PSBmYWxzZSkge1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5wcm9taXNlLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVkOiBjdHgucGFyc2VkVHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcHJvbWlzaWZpZWQgPSBjdHgucGFyc2VkVHlwZSA9PT0gWm9kUGFyc2VkVHlwZS5wcm9taXNlID8gY3R4LmRhdGEgOiBQcm9taXNlLnJlc29sdmUoY3R4LmRhdGEpO1xuICAgICAgICByZXR1cm4gT0socHJvbWlzaWZpZWQudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi50eXBlLnBhcnNlQXN5bmMoZGF0YSwge1xuICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgIGVycm9yTWFwOiBjdHguY29tbW9uLmNvbnRleHR1YWxFcnJvck1hcCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KSk7XG4gICAgfVxufVxuWm9kUHJvbWlzZS5jcmVhdGUgPSAoc2NoZW1hLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZFByb21pc2Uoe1xuICAgICAgICB0eXBlOiBzY2hlbWEsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kUHJvbWlzZSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbmV4cG9ydCBjbGFzcyBab2RFZmZlY3RzIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgaW5uZXJUeXBlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnNjaGVtYTtcbiAgICB9XG4gICAgc291cmNlVHlwZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5zY2hlbWEuX2RlZi50eXBlTmFtZSA9PT0gWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZEVmZmVjdHNcbiAgICAgICAgICAgID8gdGhpcy5fZGVmLnNjaGVtYS5zb3VyY2VUeXBlKClcbiAgICAgICAgICAgIDogdGhpcy5fZGVmLnNjaGVtYTtcbiAgICB9XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGNvbnN0IGVmZmVjdCA9IHRoaXMuX2RlZi5lZmZlY3QgfHwgbnVsbDtcbiAgICAgICAgY29uc3QgY2hlY2tDdHggPSB7XG4gICAgICAgICAgICBhZGRJc3N1ZTogKGFyZykgPT4ge1xuICAgICAgICAgICAgICAgIGFkZElzc3VlVG9Db250ZXh0KGN0eCwgYXJnKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJnLmZhdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5hYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldCBwYXRoKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdHgucGF0aDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgICAgIGNoZWNrQ3R4LmFkZElzc3VlID0gY2hlY2tDdHguYWRkSXNzdWUuYmluZChjaGVja0N0eCk7XG4gICAgICAgIGlmIChlZmZlY3QudHlwZSA9PT0gXCJwcmVwcm9jZXNzXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NlZCA9IGVmZmVjdC50cmFuc2Zvcm0oY3R4LmRhdGEsIGNoZWNrQ3R4KTtcbiAgICAgICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShwcm9jZXNzZWQpLnRoZW4oYXN5bmMgKHByb2Nlc3NlZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnZhbHVlID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLl9kZWYuc2NoZW1hLl9wYXJzZUFzeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHByb2Nlc3NlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBESVJUWShyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnZhbHVlID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gRElSVFkocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0dXMudmFsdWUgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kZWYuc2NoZW1hLl9wYXJzZVN5bmMoe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWQsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSBcImRpcnR5XCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBESVJUWShyZXN1bHQudmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0dXMudmFsdWUgPT09IFwiZGlydHlcIilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERJUlRZKHJlc3VsdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZWZmZWN0LnR5cGUgPT09IFwicmVmaW5lbWVudFwiKSB7XG4gICAgICAgICAgICBjb25zdCBleGVjdXRlUmVmaW5lbWVudCA9IChhY2MpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBlZmZlY3QucmVmaW5lbWVudChhY2MsIGNoZWNrQ3R4KTtcbiAgICAgICAgICAgICAgICBpZiAoY3R4LmNvbW1vbi5hc3luYykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFzeW5jIHJlZmluZW1lbnQgZW5jb3VudGVyZWQgZHVyaW5nIHN5bmNocm9ub3VzIHBhcnNlIG9wZXJhdGlvbi4gVXNlIC5wYXJzZUFzeW5jIGluc3RlYWQuXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlubmVyID0gdGhpcy5fZGVmLnNjaGVtYS5fcGFyc2VTeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIuc3RhdHVzID09PSBcImFib3J0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElOVkFMSUQ7XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyLnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gdmFsdWUgaXMgaWdub3JlZFxuICAgICAgICAgICAgICAgIGV4ZWN1dGVSZWZpbmVtZW50KGlubmVyLnZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGlubmVyLnZhbHVlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnNjaGVtYS5fcGFyc2VBc3luYyh7IGRhdGE6IGN0eC5kYXRhLCBwYXRoOiBjdHgucGF0aCwgcGFyZW50OiBjdHggfSkudGhlbigoaW5uZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlubmVyLnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlubmVyLnN0YXR1cyA9PT0gXCJkaXJ0eVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBleGVjdXRlUmVmaW5lbWVudChpbm5lci52YWx1ZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdGF0dXM6IHN0YXR1cy52YWx1ZSwgdmFsdWU6IGlubmVyLnZhbHVlIH07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChlZmZlY3QudHlwZSA9PT0gXCJ0cmFuc2Zvcm1cIikge1xuICAgICAgICAgICAgaWYgKGN0eC5jb21tb24uYXN5bmMgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmFzZSA9IHRoaXMuX2RlZi5zY2hlbWEuX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1ZhbGlkKGJhc2UpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBlZmZlY3QudHJhbnNmb3JtKGJhc2UudmFsdWUsIGNoZWNrQ3R4KTtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzeW5jaHJvbm91cyB0cmFuc2Zvcm0gZW5jb3VudGVyZWQgZHVyaW5nIHN5bmNocm9ub3VzIHBhcnNlIG9wZXJhdGlvbi4gVXNlIC5wYXJzZUFzeW5jIGluc3RlYWQuYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogc3RhdHVzLnZhbHVlLCB2YWx1ZTogcmVzdWx0IH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnNjaGVtYS5fcGFyc2VBc3luYyh7IGRhdGE6IGN0eC5kYXRhLCBwYXRoOiBjdHgucGF0aCwgcGFyZW50OiBjdHggfSkudGhlbigoYmFzZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWQoYmFzZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShlZmZlY3QudHJhbnNmb3JtKGJhc2UudmFsdWUsIGNoZWNrQ3R4KSkudGhlbigocmVzdWx0KSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBzdGF0dXMudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdXRpbC5hc3NlcnROZXZlcihlZmZlY3QpO1xuICAgIH1cbn1cblpvZEVmZmVjdHMuY3JlYXRlID0gKHNjaGVtYSwgZWZmZWN0LCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZEVmZmVjdHMoe1xuICAgICAgICBzY2hlbWEsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRWZmZWN0cyxcbiAgICAgICAgZWZmZWN0LFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuWm9kRWZmZWN0cy5jcmVhdGVXaXRoUHJlcHJvY2VzcyA9IChwcmVwcm9jZXNzLCBzY2hlbWEsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kRWZmZWN0cyh7XG4gICAgICAgIHNjaGVtYSxcbiAgICAgICAgZWZmZWN0OiB7IHR5cGU6IFwicHJlcHJvY2Vzc1wiLCB0cmFuc2Zvcm06IHByZXByb2Nlc3MgfSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RFZmZlY3RzLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IHsgWm9kRWZmZWN0cyBhcyBab2RUcmFuc2Zvcm1lciB9O1xuZXhwb3J0IGNsYXNzIFpvZE9wdGlvbmFsIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgPT09IFpvZFBhcnNlZFR5cGUudW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gT0sodW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZS5fcGFyc2UoaW5wdXQpO1xuICAgIH1cbiAgICB1bndyYXAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuaW5uZXJUeXBlO1xuICAgIH1cbn1cblpvZE9wdGlvbmFsLmNyZWF0ZSA9ICh0eXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZE9wdGlvbmFsKHtcbiAgICAgICAgaW5uZXJUeXBlOiB0eXBlLFxuICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZE9wdGlvbmFsLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZE51bGxhYmxlIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFR5cGUgPSB0aGlzLl9nZXRUeXBlKGlucHV0KTtcbiAgICAgICAgaWYgKHBhcnNlZFR5cGUgPT09IFpvZFBhcnNlZFR5cGUubnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIE9LKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9kZWYuaW5uZXJUeXBlLl9wYXJzZShpbnB1dCk7XG4gICAgfVxuICAgIHVud3JhcCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5pbm5lclR5cGU7XG4gICAgfVxufVxuWm9kTnVsbGFibGUuY3JlYXRlID0gKHR5cGUsIHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTnVsbGFibGUoe1xuICAgICAgICBpbm5lclR5cGU6IHR5cGUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kTnVsbGFibGUsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kRGVmYXVsdCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgbGV0IGRhdGEgPSBjdHguZGF0YTtcbiAgICAgICAgaWYgKGN0eC5wYXJzZWRUeXBlID09PSBab2RQYXJzZWRUeXBlLnVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGF0YSA9IHRoaXMuX2RlZi5kZWZhdWx0VmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZS5fcGFyc2Uoe1xuICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgIHBhdGg6IGN0eC5wYXRoLFxuICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZW1vdmVEZWZhdWx0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZTtcbiAgICB9XG59XG5ab2REZWZhdWx0LmNyZWF0ZSA9ICh0eXBlLCBwYXJhbXMpID0+IHtcbiAgICByZXR1cm4gbmV3IFpvZERlZmF1bHQoe1xuICAgICAgICBpbm5lclR5cGU6IHR5cGUsXG4gICAgICAgIHR5cGVOYW1lOiBab2RGaXJzdFBhcnR5VHlwZUtpbmQuWm9kRGVmYXVsdCxcbiAgICAgICAgZGVmYXVsdFZhbHVlOiB0eXBlb2YgcGFyYW1zLmRlZmF1bHQgPT09IFwiZnVuY3Rpb25cIiA/IHBhcmFtcy5kZWZhdWx0IDogKCkgPT4gcGFyYW1zLmRlZmF1bHQsXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY2xhc3MgWm9kQ2F0Y2ggZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgeyBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIC8vIG5ld0N0eCBpcyB1c2VkIHRvIG5vdCBjb2xsZWN0IGlzc3VlcyBmcm9tIGlubmVyIHR5cGVzIGluIGN0eFxuICAgICAgICBjb25zdCBuZXdDdHggPSB7XG4gICAgICAgICAgICAuLi5jdHgsXG4gICAgICAgICAgICBjb21tb246IHtcbiAgICAgICAgICAgICAgICAuLi5jdHguY29tbW9uLFxuICAgICAgICAgICAgICAgIGlzc3VlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kZWYuaW5uZXJUeXBlLl9wYXJzZSh7XG4gICAgICAgICAgICBkYXRhOiBuZXdDdHguZGF0YSxcbiAgICAgICAgICAgIHBhdGg6IG5ld0N0eC5wYXRoLFxuICAgICAgICAgICAgcGFyZW50OiB7XG4gICAgICAgICAgICAgICAgLi4ubmV3Q3R4LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpc0FzeW5jKHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBcInZhbGlkXCIsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiByZXN1bHQuc3RhdHVzID09PSBcInZhbGlkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gcmVzdWx0LnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuX2RlZi5jYXRjaFZhbHVlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXQgZXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgWm9kRXJyb3IobmV3Q3R4LmNvbW1vbi5pc3N1ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQ6IG5ld0N0eC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFwidmFsaWRcIixcbiAgICAgICAgICAgICAgICB2YWx1ZTogcmVzdWx0LnN0YXR1cyA9PT0gXCJ2YWxpZFwiXG4gICAgICAgICAgICAgICAgICAgID8gcmVzdWx0LnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIDogdGhpcy5fZGVmLmNhdGNoVmFsdWUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0IGVycm9yKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgWm9kRXJyb3IobmV3Q3R4LmNvbW1vbi5pc3N1ZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0OiBuZXdDdHguZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuICAgIHJlbW92ZUNhdGNoKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZTtcbiAgICB9XG59XG5ab2RDYXRjaC5jcmVhdGUgPSAodHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RDYXRjaCh7XG4gICAgICAgIGlubmVyVHlwZTogdHlwZSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RDYXRjaCxcbiAgICAgICAgY2F0Y2hWYWx1ZTogdHlwZW9mIHBhcmFtcy5jYXRjaCA9PT0gXCJmdW5jdGlvblwiID8gcGFyYW1zLmNhdGNoIDogKCkgPT4gcGFyYW1zLmNhdGNoLFxuICAgICAgICAuLi5wcm9jZXNzQ3JlYXRlUGFyYW1zKHBhcmFtcyksXG4gICAgfSk7XG59O1xuZXhwb3J0IGNsYXNzIFpvZE5hTiBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCBwYXJzZWRUeXBlID0gdGhpcy5fZ2V0VHlwZShpbnB1dCk7XG4gICAgICAgIGlmIChwYXJzZWRUeXBlICE9PSBab2RQYXJzZWRUeXBlLm5hbikge1xuICAgICAgICAgICAgY29uc3QgY3R4ID0gdGhpcy5fZ2V0T3JSZXR1cm5DdHgoaW5wdXQpO1xuICAgICAgICAgICAgYWRkSXNzdWVUb0NvbnRleHQoY3R4LCB7XG4gICAgICAgICAgICAgICAgY29kZTogWm9kSXNzdWVDb2RlLmludmFsaWRfdHlwZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogWm9kUGFyc2VkVHlwZS5uYW4sXG4gICAgICAgICAgICAgICAgcmVjZWl2ZWQ6IGN0eC5wYXJzZWRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gSU5WQUxJRDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdGF0dXM6IFwidmFsaWRcIiwgdmFsdWU6IGlucHV0LmRhdGEgfTtcbiAgICB9XG59XG5ab2ROYU4uY3JlYXRlID0gKHBhcmFtcykgPT4ge1xuICAgIHJldHVybiBuZXcgWm9kTmFOKHtcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2ROYU4sXG4gICAgICAgIC4uLnByb2Nlc3NDcmVhdGVQYXJhbXMocGFyYW1zKSxcbiAgICB9KTtcbn07XG5leHBvcnQgY29uc3QgQlJBTkQgPSBTeW1ib2woXCJ6b2RfYnJhbmRcIik7XG5leHBvcnQgY2xhc3MgWm9kQnJhbmRlZCBleHRlbmRzIFpvZFR5cGUge1xuICAgIF9wYXJzZShpbnB1dCkge1xuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcy5fcHJvY2Vzc0lucHV0UGFyYW1zKGlucHV0KTtcbiAgICAgICAgY29uc3QgZGF0YSA9IGN0eC5kYXRhO1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnR5cGUuX3BhcnNlKHtcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgIHBhcmVudDogY3R4LFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdW53cmFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLnR5cGU7XG4gICAgfVxufVxuZXhwb3J0IGNsYXNzIFpvZFBpcGVsaW5lIGV4dGVuZHMgWm9kVHlwZSB7XG4gICAgX3BhcnNlKGlucHV0KSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdHggfSA9IHRoaXMuX3Byb2Nlc3NJbnB1dFBhcmFtcyhpbnB1dCk7XG4gICAgICAgIGlmIChjdHguY29tbW9uLmFzeW5jKSB7XG4gICAgICAgICAgICBjb25zdCBoYW5kbGVBc3luYyA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpblJlc3VsdCA9IGF3YWl0IHRoaXMuX2RlZi5pbi5fcGFyc2VBc3luYyh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGN0eC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGluUmVzdWx0LnN0YXR1cyA9PT0gXCJhYm9ydGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgICAgIGlmIChpblJlc3VsdC5zdGF0dXMgPT09IFwiZGlydHlcIikge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZGlydHkoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIERJUlRZKGluUmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9kZWYub3V0Ll9wYXJzZUFzeW5jKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGluUmVzdWx0LnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IGN0eCxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVBc3luYygpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgaW5SZXN1bHQgPSB0aGlzLl9kZWYuaW4uX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgZGF0YTogY3R4LmRhdGEsXG4gICAgICAgICAgICAgICAgcGF0aDogY3R4LnBhdGgsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChpblJlc3VsdC5zdGF0dXMgPT09IFwiYWJvcnRlZFwiKVxuICAgICAgICAgICAgICAgIHJldHVybiBJTlZBTElEO1xuICAgICAgICAgICAgaWYgKGluUmVzdWx0LnN0YXR1cyA9PT0gXCJkaXJ0eVwiKSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmRpcnR5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBcImRpcnR5XCIsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpblJlc3VsdC52YWx1ZSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RlZi5vdXQuX3BhcnNlU3luYyh7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGluUmVzdWx0LnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBjdHgucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdHgsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3RhdGljIGNyZWF0ZShhLCBiKSB7XG4gICAgICAgIHJldHVybiBuZXcgWm9kUGlwZWxpbmUoe1xuICAgICAgICAgICAgaW46IGEsXG4gICAgICAgICAgICBvdXQ6IGIsXG4gICAgICAgICAgICB0eXBlTmFtZTogWm9kRmlyc3RQYXJ0eVR5cGVLaW5kLlpvZFBpcGVsaW5lLFxuICAgICAgICB9KTtcbiAgICB9XG59XG5leHBvcnQgY2xhc3MgWm9kUmVhZG9ubHkgZXh0ZW5kcyBab2RUeXBlIHtcbiAgICBfcGFyc2UoaW5wdXQpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGVmLmlubmVyVHlwZS5fcGFyc2UoaW5wdXQpO1xuICAgICAgICBjb25zdCBmcmVlemUgPSAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGlzVmFsaWQoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnZhbHVlID0gT2JqZWN0LmZyZWV6ZShkYXRhLnZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gaXNBc3luYyhyZXN1bHQpID8gcmVzdWx0LnRoZW4oKGRhdGEpID0+IGZyZWV6ZShkYXRhKSkgOiBmcmVlemUocmVzdWx0KTtcbiAgICB9XG4gICAgdW53cmFwKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGVmLmlubmVyVHlwZTtcbiAgICB9XG59XG5ab2RSZWFkb25seS5jcmVhdGUgPSAodHlwZSwgcGFyYW1zKSA9PiB7XG4gICAgcmV0dXJuIG5ldyBab2RSZWFkb25seSh7XG4gICAgICAgIGlubmVyVHlwZTogdHlwZSxcbiAgICAgICAgdHlwZU5hbWU6IFpvZEZpcnN0UGFydHlUeXBlS2luZC5ab2RSZWFkb25seSxcbiAgICAgICAgLi4ucHJvY2Vzc0NyZWF0ZVBhcmFtcyhwYXJhbXMpLFxuICAgIH0pO1xufTtcbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8gICAgICAgICAgICAgICAgICAgIC8vLy8vLy8vLy9cbi8vLy8vLy8vLy8gICAgICB6LmN1c3RvbSAgICAgIC8vLy8vLy8vLy9cbi8vLy8vLy8vLy8gICAgICAgICAgICAgICAgICAgIC8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbmZ1bmN0aW9uIGNsZWFuUGFyYW1zKHBhcmFtcywgZGF0YSkge1xuICAgIGNvbnN0IHAgPSB0eXBlb2YgcGFyYW1zID09PSBcImZ1bmN0aW9uXCIgPyBwYXJhbXMoZGF0YSkgOiB0eXBlb2YgcGFyYW1zID09PSBcInN0cmluZ1wiID8geyBtZXNzYWdlOiBwYXJhbXMgfSA6IHBhcmFtcztcbiAgICBjb25zdCBwMiA9IHR5cGVvZiBwID09PSBcInN0cmluZ1wiID8geyBtZXNzYWdlOiBwIH0gOiBwO1xuICAgIHJldHVybiBwMjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjdXN0b20oY2hlY2ssIF9wYXJhbXMgPSB7fSwgXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKlxuICogUGFzcyBgZmF0YWxgIGludG8gdGhlIHBhcmFtcyBvYmplY3QgaW5zdGVhZDpcbiAqXG4gKiBgYGB0c1xuICogei5zdHJpbmcoKS5jdXN0b20oKHZhbCkgPT4gdmFsLmxlbmd0aCA+IDUsIHsgZmF0YWw6IGZhbHNlIH0pXG4gKiBgYGBcbiAqXG4gKi9cbmZhdGFsKSB7XG4gICAgaWYgKGNoZWNrKVxuICAgICAgICByZXR1cm4gWm9kQW55LmNyZWF0ZSgpLnN1cGVyUmVmaW5lKChkYXRhLCBjdHgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBjaGVjayhkYXRhKTtcbiAgICAgICAgICAgIGlmIChyIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByLnRoZW4oKHIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBjbGVhblBhcmFtcyhfcGFyYW1zLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IF9mYXRhbCA9IHBhcmFtcy5mYXRhbCA/PyBmYXRhbCA/PyB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmFkZElzc3VlKHsgY29kZTogXCJjdXN0b21cIiwgLi4ucGFyYW1zLCBmYXRhbDogX2ZhdGFsIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBjbGVhblBhcmFtcyhfcGFyYW1zLCBkYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBfZmF0YWwgPSBwYXJhbXMuZmF0YWwgPz8gZmF0YWwgPz8gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjdHguYWRkSXNzdWUoeyBjb2RlOiBcImN1c3RvbVwiLCAuLi5wYXJhbXMsIGZhdGFsOiBfZmF0YWwgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pO1xuICAgIHJldHVybiBab2RBbnkuY3JlYXRlKCk7XG59XG5leHBvcnQgeyBab2RUeXBlIGFzIFNjaGVtYSwgWm9kVHlwZSBhcyBab2RTY2hlbWEgfTtcbmV4cG9ydCBjb25zdCBsYXRlID0ge1xuICAgIG9iamVjdDogWm9kT2JqZWN0LmxhenljcmVhdGUsXG59O1xuZXhwb3J0IHZhciBab2RGaXJzdFBhcnR5VHlwZUtpbmQ7XG4oZnVuY3Rpb24gKFpvZEZpcnN0UGFydHlUeXBlS2luZCkge1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFN0cmluZ1wiXSA9IFwiWm9kU3RyaW5nXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTnVtYmVyXCJdID0gXCJab2ROdW1iZXJcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2ROYU5cIl0gPSBcIlpvZE5hTlwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEJpZ0ludFwiXSA9IFwiWm9kQmlnSW50XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kQm9vbGVhblwiXSA9IFwiWm9kQm9vbGVhblwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZERhdGVcIl0gPSBcIlpvZERhdGVcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RTeW1ib2xcIl0gPSBcIlpvZFN5bWJvbFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFVuZGVmaW5lZFwiXSA9IFwiWm9kVW5kZWZpbmVkXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTnVsbFwiXSA9IFwiWm9kTnVsbFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEFueVwiXSA9IFwiWm9kQW55XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kVW5rbm93blwiXSA9IFwiWm9kVW5rbm93blwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE5ldmVyXCJdID0gXCJab2ROZXZlclwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFZvaWRcIl0gPSBcIlpvZFZvaWRcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RBcnJheVwiXSA9IFwiWm9kQXJyYXlcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RPYmplY3RcIl0gPSBcIlpvZE9iamVjdFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFVuaW9uXCJdID0gXCJab2RVbmlvblwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZERpc2NyaW1pbmF0ZWRVbmlvblwiXSA9IFwiWm9kRGlzY3JpbWluYXRlZFVuaW9uXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kSW50ZXJzZWN0aW9uXCJdID0gXCJab2RJbnRlcnNlY3Rpb25cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RUdXBsZVwiXSA9IFwiWm9kVHVwbGVcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RSZWNvcmRcIl0gPSBcIlpvZFJlY29yZFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE1hcFwiXSA9IFwiWm9kTWFwXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kU2V0XCJdID0gXCJab2RTZXRcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RGdW5jdGlvblwiXSA9IFwiWm9kRnVuY3Rpb25cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RMYXp5XCJdID0gXCJab2RMYXp5XCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTGl0ZXJhbFwiXSA9IFwiWm9kTGl0ZXJhbFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZEVudW1cIl0gPSBcIlpvZEVudW1cIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RFZmZlY3RzXCJdID0gXCJab2RFZmZlY3RzXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kTmF0aXZlRW51bVwiXSA9IFwiWm9kTmF0aXZlRW51bVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE9wdGlvbmFsXCJdID0gXCJab2RPcHRpb25hbFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZE51bGxhYmxlXCJdID0gXCJab2ROdWxsYWJsZVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZERlZmF1bHRcIl0gPSBcIlpvZERlZmF1bHRcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RDYXRjaFwiXSA9IFwiWm9kQ2F0Y2hcIjtcbiAgICBab2RGaXJzdFBhcnR5VHlwZUtpbmRbXCJab2RQcm9taXNlXCJdID0gXCJab2RQcm9taXNlXCI7XG4gICAgWm9kRmlyc3RQYXJ0eVR5cGVLaW5kW1wiWm9kQnJhbmRlZFwiXSA9IFwiWm9kQnJhbmRlZFwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFBpcGVsaW5lXCJdID0gXCJab2RQaXBlbGluZVwiO1xuICAgIFpvZEZpcnN0UGFydHlUeXBlS2luZFtcIlpvZFJlYWRvbmx5XCJdID0gXCJab2RSZWFkb25seVwiO1xufSkoWm9kRmlyc3RQYXJ0eVR5cGVLaW5kIHx8IChab2RGaXJzdFBhcnR5VHlwZUtpbmQgPSB7fSkpO1xuLy8gcmVxdWlyZXMgVFMgNC40K1xuY2xhc3MgQ2xhc3Mge1xuICAgIGNvbnN0cnVjdG9yKC4uLl8pIHsgfVxufVxuY29uc3QgaW5zdGFuY2VPZlR5cGUgPSAoXG4vLyBjb25zdCBpbnN0YW5jZU9mVHlwZSA9IDxUIGV4dGVuZHMgbmV3ICguLi5hcmdzOiBhbnlbXSkgPT4gYW55PihcbmNscywgcGFyYW1zID0ge1xuICAgIG1lc3NhZ2U6IGBJbnB1dCBub3QgaW5zdGFuY2Ugb2YgJHtjbHMubmFtZX1gLFxufSkgPT4gY3VzdG9tKChkYXRhKSA9PiBkYXRhIGluc3RhbmNlb2YgY2xzLCBwYXJhbXMpO1xuY29uc3Qgc3RyaW5nVHlwZSA9IFpvZFN0cmluZy5jcmVhdGU7XG5jb25zdCBudW1iZXJUeXBlID0gWm9kTnVtYmVyLmNyZWF0ZTtcbmNvbnN0IG5hblR5cGUgPSBab2ROYU4uY3JlYXRlO1xuY29uc3QgYmlnSW50VHlwZSA9IFpvZEJpZ0ludC5jcmVhdGU7XG5jb25zdCBib29sZWFuVHlwZSA9IFpvZEJvb2xlYW4uY3JlYXRlO1xuY29uc3QgZGF0ZVR5cGUgPSBab2REYXRlLmNyZWF0ZTtcbmNvbnN0IHN5bWJvbFR5cGUgPSBab2RTeW1ib2wuY3JlYXRlO1xuY29uc3QgdW5kZWZpbmVkVHlwZSA9IFpvZFVuZGVmaW5lZC5jcmVhdGU7XG5jb25zdCBudWxsVHlwZSA9IFpvZE51bGwuY3JlYXRlO1xuY29uc3QgYW55VHlwZSA9IFpvZEFueS5jcmVhdGU7XG5jb25zdCB1bmtub3duVHlwZSA9IFpvZFVua25vd24uY3JlYXRlO1xuY29uc3QgbmV2ZXJUeXBlID0gWm9kTmV2ZXIuY3JlYXRlO1xuY29uc3Qgdm9pZFR5cGUgPSBab2RWb2lkLmNyZWF0ZTtcbmNvbnN0IGFycmF5VHlwZSA9IFpvZEFycmF5LmNyZWF0ZTtcbmNvbnN0IG9iamVjdFR5cGUgPSBab2RPYmplY3QuY3JlYXRlO1xuY29uc3Qgc3RyaWN0T2JqZWN0VHlwZSA9IFpvZE9iamVjdC5zdHJpY3RDcmVhdGU7XG5jb25zdCB1bmlvblR5cGUgPSBab2RVbmlvbi5jcmVhdGU7XG5jb25zdCBkaXNjcmltaW5hdGVkVW5pb25UeXBlID0gWm9kRGlzY3JpbWluYXRlZFVuaW9uLmNyZWF0ZTtcbmNvbnN0IGludGVyc2VjdGlvblR5cGUgPSBab2RJbnRlcnNlY3Rpb24uY3JlYXRlO1xuY29uc3QgdHVwbGVUeXBlID0gWm9kVHVwbGUuY3JlYXRlO1xuY29uc3QgcmVjb3JkVHlwZSA9IFpvZFJlY29yZC5jcmVhdGU7XG5jb25zdCBtYXBUeXBlID0gWm9kTWFwLmNyZWF0ZTtcbmNvbnN0IHNldFR5cGUgPSBab2RTZXQuY3JlYXRlO1xuY29uc3QgZnVuY3Rpb25UeXBlID0gWm9kRnVuY3Rpb24uY3JlYXRlO1xuY29uc3QgbGF6eVR5cGUgPSBab2RMYXp5LmNyZWF0ZTtcbmNvbnN0IGxpdGVyYWxUeXBlID0gWm9kTGl0ZXJhbC5jcmVhdGU7XG5jb25zdCBlbnVtVHlwZSA9IFpvZEVudW0uY3JlYXRlO1xuY29uc3QgbmF0aXZlRW51bVR5cGUgPSBab2ROYXRpdmVFbnVtLmNyZWF0ZTtcbmNvbnN0IHByb21pc2VUeXBlID0gWm9kUHJvbWlzZS5jcmVhdGU7XG5jb25zdCBlZmZlY3RzVHlwZSA9IFpvZEVmZmVjdHMuY3JlYXRlO1xuY29uc3Qgb3B0aW9uYWxUeXBlID0gWm9kT3B0aW9uYWwuY3JlYXRlO1xuY29uc3QgbnVsbGFibGVUeXBlID0gWm9kTnVsbGFibGUuY3JlYXRlO1xuY29uc3QgcHJlcHJvY2Vzc1R5cGUgPSBab2RFZmZlY3RzLmNyZWF0ZVdpdGhQcmVwcm9jZXNzO1xuY29uc3QgcGlwZWxpbmVUeXBlID0gWm9kUGlwZWxpbmUuY3JlYXRlO1xuY29uc3Qgb3N0cmluZyA9ICgpID0+IHN0cmluZ1R5cGUoKS5vcHRpb25hbCgpO1xuY29uc3Qgb251bWJlciA9ICgpID0+IG51bWJlclR5cGUoKS5vcHRpb25hbCgpO1xuY29uc3Qgb2Jvb2xlYW4gPSAoKSA9PiBib29sZWFuVHlwZSgpLm9wdGlvbmFsKCk7XG5leHBvcnQgY29uc3QgY29lcmNlID0ge1xuICAgIHN0cmluZzogKChhcmcpID0+IFpvZFN0cmluZy5jcmVhdGUoeyAuLi5hcmcsIGNvZXJjZTogdHJ1ZSB9KSksXG4gICAgbnVtYmVyOiAoKGFyZykgPT4gWm9kTnVtYmVyLmNyZWF0ZSh7IC4uLmFyZywgY29lcmNlOiB0cnVlIH0pKSxcbiAgICBib29sZWFuOiAoKGFyZykgPT4gWm9kQm9vbGVhbi5jcmVhdGUoe1xuICAgICAgICAuLi5hcmcsXG4gICAgICAgIGNvZXJjZTogdHJ1ZSxcbiAgICB9KSksXG4gICAgYmlnaW50OiAoKGFyZykgPT4gWm9kQmlnSW50LmNyZWF0ZSh7IC4uLmFyZywgY29lcmNlOiB0cnVlIH0pKSxcbiAgICBkYXRlOiAoKGFyZykgPT4gWm9kRGF0ZS5jcmVhdGUoeyAuLi5hcmcsIGNvZXJjZTogdHJ1ZSB9KSksXG59O1xuZXhwb3J0IHsgYW55VHlwZSBhcyBhbnksIGFycmF5VHlwZSBhcyBhcnJheSwgYmlnSW50VHlwZSBhcyBiaWdpbnQsIGJvb2xlYW5UeXBlIGFzIGJvb2xlYW4sIGRhdGVUeXBlIGFzIGRhdGUsIGRpc2NyaW1pbmF0ZWRVbmlvblR5cGUgYXMgZGlzY3JpbWluYXRlZFVuaW9uLCBlZmZlY3RzVHlwZSBhcyBlZmZlY3QsIGVudW1UeXBlIGFzIGVudW0sIGZ1bmN0aW9uVHlwZSBhcyBmdW5jdGlvbiwgaW5zdGFuY2VPZlR5cGUgYXMgaW5zdGFuY2VvZiwgaW50ZXJzZWN0aW9uVHlwZSBhcyBpbnRlcnNlY3Rpb24sIGxhenlUeXBlIGFzIGxhenksIGxpdGVyYWxUeXBlIGFzIGxpdGVyYWwsIG1hcFR5cGUgYXMgbWFwLCBuYW5UeXBlIGFzIG5hbiwgbmF0aXZlRW51bVR5cGUgYXMgbmF0aXZlRW51bSwgbmV2ZXJUeXBlIGFzIG5ldmVyLCBudWxsVHlwZSBhcyBudWxsLCBudWxsYWJsZVR5cGUgYXMgbnVsbGFibGUsIG51bWJlclR5cGUgYXMgbnVtYmVyLCBvYmplY3RUeXBlIGFzIG9iamVjdCwgb2Jvb2xlYW4sIG9udW1iZXIsIG9wdGlvbmFsVHlwZSBhcyBvcHRpb25hbCwgb3N0cmluZywgcGlwZWxpbmVUeXBlIGFzIHBpcGVsaW5lLCBwcmVwcm9jZXNzVHlwZSBhcyBwcmVwcm9jZXNzLCBwcm9taXNlVHlwZSBhcyBwcm9taXNlLCByZWNvcmRUeXBlIGFzIHJlY29yZCwgc2V0VHlwZSBhcyBzZXQsIHN0cmljdE9iamVjdFR5cGUgYXMgc3RyaWN0T2JqZWN0LCBzdHJpbmdUeXBlIGFzIHN0cmluZywgc3ltYm9sVHlwZSBhcyBzeW1ib2wsIGVmZmVjdHNUeXBlIGFzIHRyYW5zZm9ybWVyLCB0dXBsZVR5cGUgYXMgdHVwbGUsIHVuZGVmaW5lZFR5cGUgYXMgdW5kZWZpbmVkLCB1bmlvblR5cGUgYXMgdW5pb24sIHVua25vd25UeXBlIGFzIHVua25vd24sIHZvaWRUeXBlIGFzIHZvaWQsIH07XG5leHBvcnQgY29uc3QgTkVWRVIgPSBJTlZBTElEO1xuIiwiZXhwb3J0ICogZnJvbSBcIi4vZXJyb3JzLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9oZWxwZXJzL3BhcnNlVXRpbC5qc1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vaGVscGVycy90eXBlQWxpYXNlcy5qc1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vaGVscGVycy91dGlsLmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi90eXBlcy5qc1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vWm9kRXJyb3IuanNcIjtcbiIsImltcG9ydCAqIGFzIHogZnJvbSBcIi4vdjMvZXh0ZXJuYWwuanNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3YzL2V4dGVybmFsLmpzXCI7XG5leHBvcnQgeyB6IH07XG5leHBvcnQgZGVmYXVsdCB6O1xuIiwiZXhwb3J0IGNvbnN0IERFRkFVTFRfR0xPQkFMX1BST01QVCA9IGBZb3UgYXJlIGEgcHJvZmVzc2lvbmFsLCBhdXRoZW50aWMgbWFjaGluZSB0cmFuc2xhdGlvbiBlbmdpbmUuXG5cblJ1bGVzOlxuMS4gVHJhbnNsYXRlIHRoZSBmb2xsb3dpbmcgdGV4dCBmcm9tIHt7c291cmNlTGFuZ319IHRvIHt7dGFyZ2V0TGFuZ319LlxuMi4gT3V0cHV0IE9OTFkgdGhlIHRyYW5zbGF0ZWQgdGV4dC4gTm8gbWFya2Rvd24gY29kZSBibG9ja3MsIG5vIGV4cGxhbmF0aW9ucywgbm8gbm90ZXMuXG4zLiBQcmVzZXJ2ZSBhbGwgSFRNTCB0YWdzLCBwbGFjZWhvbGRlcnMsIGZvcm1hdCBzeW1ib2xzLCBhbmQgd2hpdGVzcGFjZSBleGFjdGx5IGFzIHRoZXkgYXBwZWFyLiBPbmx5IHRyYW5zbGF0ZSB0aGUgaW5uZXIgdGV4dCBjb250ZW50LlxuNC4gRG8gTk9UIHRyYW5zbGF0ZSBjb250ZW50IGluc2lkZSA8Y29kZT4sIDxwcmU+LCA8c2FtcD4sIDxrYmQ+LCA8dmFyPiB0YWdzLCB0ZXh0IGVuY2xvc2VkIGluIGJhY2t0aWNrcyAoXFxgY29kZVxcYCksIGZpbGUgcGF0aHMsIFVSTHMsIHZhcmlhYmxlIG5hbWVzLCBvciBwbGFjZWhvbGRlcnMgbGlrZSB7MX0sIHt7MX19LCBbMV0sIFtbMV1dLCAjMSMsICMyIy5cbjUuIE1haW50YWluIHRoZSBvcmlnaW5hbCB0b25lIGFuZCBzdHlsZSBvZiB0aGUgdGV4dC5gO1xuIiwiaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBERUZBVUxUX0dMT0JBTF9QUk9NUFQgfSBmcm9tICcuL3Byb21wdHMnO1xuXG5jb25zdCBwcm92aWRlckNvbmZpZ1NjaGVtYSA9IHoub2JqZWN0KHtcbiAgaWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICBuYW1lOiB6LnN0cmluZygpLm1pbigxKSxcbiAgYmFzZVVSTDogei5zdHJpbmcoKS51cmwoKSxcbiAgYXBpS2V5OiB6LnN0cmluZygpLmRlZmF1bHQoJycpLFxuICBoZWFkZXJzOiB6LnJlY29yZCh6LnN0cmluZygpKS5kZWZhdWx0KHt9KSxcbiAgcXVlcnk6IHoucmVjb3JkKHouc3RyaW5nKCkpLmRlZmF1bHQoe30pLFxuICBib2R5OiB6LnJlY29yZCh6LnVua25vd24oKSkuZGVmYXVsdCh7fSksXG4gIHByb21wdDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICB0ZW1wZXJhdHVyZTogei5udW1iZXIoKS5taW4oMCkubWF4KDIpLm9wdGlvbmFsKCksXG4gIHRvcFA6IHoubnVtYmVyKCkuZ3QoMCkubWF4KDEpLm9wdGlvbmFsKCksXG4gIG1heFRva2Vuczogei5udW1iZXIoKS5pbnQoKS5wb3NpdGl2ZSgpLm9wdGlvbmFsKCksXG4gIHN0cmVhbTogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbiAgbW9kZWxzOiB6LmFycmF5KFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGlkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIG5hbWU6IHouc3RyaW5nKCkubWluKDEpLFxuICAgIH0pXG4gICkubWluKDEsICdBdCBsZWFzdCBvbmUgbW9kZWwgaXMgcmVxdWlyZWQnKSxcbn0pO1xuXG5jb25zdCBtb2RlbFF1ZXVlSXRlbVNjaGVtYSA9IHoub2JqZWN0KHtcbiAgcHJvdmlkZXJJZDogei5zdHJpbmcoKS5taW4oMSksXG4gIG1vZGVsSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICBlbmFibGVkOiB6LmJvb2xlYW4oKS5kZWZhdWx0KHRydWUpLFxufSk7XG5cbmNvbnN0IGxhbmdEZXRlY3RQcm92aWRlclNjaGVtYSA9IHoub2JqZWN0KHtcbiAgaWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICBuYW1lOiB6LnN0cmluZygpLm1pbigxKSxcbiAgdHlwZTogei5lbnVtKFsnZnJhbmMnLCAnYXBpJywgJ2dvb2dsZV9mcmVlJ10pLFxuICBlbmRwb2ludDogei5zdHJpbmcoKS51cmwoKS5vcHRpb25hbCgpLFxuICBhcGlLZXk6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgaGVhZGVyczogei5yZWNvcmQoei5zdHJpbmcoKSkub3B0aW9uYWwoKSxcbiAgdGltZW91dDogei5udW1iZXIoKS5pbnQoKS5taW4oMTAwMCkubWF4KDYwMDAwKS5vcHRpb25hbCgpLFxufSk7XG5cbmV4cG9ydCBjb25zdCBnbG9iYWxTZXR0aW5nc1NjaGVtYSA9IHoub2JqZWN0KHtcbiAgcHJvdmlkZXJzOiB6LmFycmF5KHByb3ZpZGVyQ29uZmlnU2NoZW1hKS5taW4oMSwgJ0F0IGxlYXN0IG9uZSBwcm92aWRlciBpcyByZXF1aXJlZCcpLFxuICBtb2RlbFF1ZXVlOiB6LmFycmF5KG1vZGVsUXVldWVJdGVtU2NoZW1hKS5taW4oMSwgJ0F0IGxlYXN0IG9uZSBtb2RlbCBxdWV1ZSBpdGVtIGlzIHJlcXVpcmVkJyksXG4gIG5hdGl2ZUxhbmd1YWdlOiB6LnN0cmluZygpLm1pbigyKS5tYXgoMTApLmRlZmF1bHQoJ3poLUNOJyksXG4gIGRlZmF1bHRTb3VyY2VMYW5ndWFnZTogei5zdHJpbmcoKS5taW4oMikubWF4KDEwKS5kZWZhdWx0KCdlbicpLFxuICB1aUxhbmd1YWdlOiB6LnN0cmluZygpLm1pbigyKS5tYXgoMTApLmRlZmF1bHQoJ3poLUNOJyksXG4gIGRlZmF1bHRTdHlsZTogei5lbnVtKFsnb3JpZ2luYWwnLCAnYmlsaW5ndWFsJywgJ3VuZGVybGluZScsICdjbGVhbiddKS5kZWZhdWx0KCdvcmlnaW5hbCcpLFxuICBnbG9iYWxQcm9tcHQ6IHouc3RyaW5nKCkubWluKDEpLmRlZmF1bHQoREVGQVVMVF9HTE9CQUxfUFJPTVBUKSxcbiAgZGV0ZWN0TGFuZ1Byb3ZpZGVyczogei5hcnJheShsYW5nRGV0ZWN0UHJvdmlkZXJTY2hlbWEpLmRlZmF1bHQoW3sgaWQ6ICdmcmFuYycsIG5hbWU6ICdmcmFuYy1taW4nLCB0eXBlOiAnZnJhbmMnIH1dKSxcbiAgc2hvcnRjdXRLZXk6IHouc3RyaW5nKCkuZGVmYXVsdCgnQWx0K1cnKSxcbiAgYWdncmVnYXRlRW5hYmxlZDogei5ib29sZWFuKCkuZGVmYXVsdCh0cnVlKSxcbiAgbWF4UGFyYWdyYXBoc1BlclJlcXVlc3Q6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgyMCkuZGVmYXVsdCg1KSxcbiAgbWF4VGV4dExlbmd0aFBlclJlcXVlc3Q6IHoubnVtYmVyKCkuaW50KCkubWluKDEwMCkubWF4KDEwMDAwKS5kZWZhdWx0KDIwMDApLFxuICBtYXhDb25jdXJyZW50UmVxdWVzdHM6IHoubnVtYmVyKCkuaW50KCkubWluKDEpLm1heCgxMCkuZGVmYXVsdCgzKSxcbiAgcmVxdWVzdFRpbWVvdXQ6IHoubnVtYmVyKCkuaW50KCkubWluKDUwMDApLm1heCgxMjAwMDApLmRlZmF1bHQoMzAwMDApLFxufSk7XG5cbmV4cG9ydCB0eXBlIFZhbGlkYXRlZFNldHRpbmdzID0gei5pbmZlcjx0eXBlb2YgZ2xvYmFsU2V0dGluZ3NTY2hlbWE+O1xuIiwiLy8gQUVTLUdDTSDliqDlr4bovoXliqnvvJrnlKjkuo7orr7nva7lr7zlh7ov5a+85YWl44CC5LuF5L2c55So5LqO5a+85Ye65paH5Lu277yM5LiN5YaZ5ZueIGNocm9tZS5zdG9yYWdlLnN5bmPjgIJcbi8vXG4vLyDkuqfniannu5PmnoTvvIjlpJblsYIgSlNPTu+8ie+8mlxuLy8gICB7XG4vLyAgICAgXCJmb3JtYXRcIjogXCJ0cmFuc2xhdG9yLWVuY3J5cHRlZC12MVwiLFxuLy8gICAgIFwia2RmXCI6IFwiUEJLREYyLVNIQTI1NlwiLFxuLy8gICAgIFwiaXRlcmF0aW9uc1wiOiAyMDAwMDAsXG4vLyAgICAgXCJzYWx0XCI6IFwiPGJhc2U2ND5cIixcbi8vICAgICBcIml2XCI6IFwiPGJhc2U2ND5cIixcbi8vICAgICBcImNpcGhlcnRleHRcIjogXCI8YmFzZTY0PlwiXG4vLyAgIH1cblxuZXhwb3J0IGNvbnN0IEVOQ1JZUFRFRF9GT1JNQVQgPSAndHJhbnNsYXRvci1lbmNyeXB0ZWQtdjEnIGFzIGNvbnN0O1xuY29uc3QgS0RGX05BTUUgPSAnUEJLREYyLVNIQTI1NicgYXMgY29uc3Q7XG5jb25zdCBQQktERjJfSVRFUkFUSU9OUyA9IDIwMF8wMDA7XG5jb25zdCBTQUxUX0JZVEVTID0gMTY7XG5jb25zdCBJVl9CWVRFUyA9IDEyO1xuY29uc3QgS0VZX0JJVFMgPSAyNTY7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRW5jcnlwdGVkUGF5bG9hZCB7XG4gIGZvcm1hdDogdHlwZW9mIEVOQ1JZUFRFRF9GT1JNQVQ7XG4gIGtkZjogdHlwZW9mIEtERl9OQU1FO1xuICBpdGVyYXRpb25zOiBudW1iZXI7XG4gIHNhbHQ6IHN0cmluZztcbiAgaXY6IHN0cmluZztcbiAgY2lwaGVydGV4dDogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiByYW5kb21CdWZmZXIobGVuZ3RoOiBudW1iZXIpOiBBcnJheUJ1ZmZlciB7XG4gIGNvbnN0IGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihsZW5ndGgpO1xuICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50OEFycmF5KGJ1ZikpO1xuICByZXR1cm4gYnVmO1xufVxuXG5mdW5jdGlvbiBidWZmZXJUb0Jhc2U2NChidWY6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWYpO1xuICBsZXQgYmluYXJ5ID0gJyc7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMuYnl0ZUxlbmd0aDsgaSArPSAxKSB7XG4gICAgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0pO1xuICB9XG4gIHJldHVybiBidG9hKGJpbmFyeSk7XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnVmZmVyKGI2NDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICBjb25zdCBiaW5hcnkgPSBhdG9iKGI2NCk7XG4gIGNvbnN0IGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihiaW5hcnkubGVuZ3RoKTtcbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWYpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeS5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ5dGVzW2ldID0gYmluYXJ5LmNoYXJDb2RlQXQoaSk7XG4gIH1cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuZnVuY3Rpb24gdXRmOEVuY29kZSh0ZXh0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gIGNvbnN0IGJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHRleHQpO1xuICBjb25zdCBidWYgPSBuZXcgQXJyYXlCdWZmZXIoYnl0ZXMuYnl0ZUxlbmd0aCk7XG4gIG5ldyBVaW50OEFycmF5KGJ1Zikuc2V0KGJ5dGVzKTtcbiAgcmV0dXJuIGJ1Zjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZGVyaXZlQWVzS2V5KHBhc3NwaHJhc2U6IHN0cmluZywgc2FsdDogQXJyYXlCdWZmZXIsIGl0ZXJhdGlvbnM6IG51bWJlcik6IFByb21pc2U8Q3J5cHRvS2V5PiB7XG4gIGNvbnN0IGJhc2VLZXkgPSBhd2FpdCBjcnlwdG8uc3VidGxlLmltcG9ydEtleShcbiAgICAncmF3JyxcbiAgICB1dGY4RW5jb2RlKHBhc3NwaHJhc2UpLFxuICAgIHsgbmFtZTogJ1BCS0RGMicgfSxcbiAgICBmYWxzZSxcbiAgICBbJ2Rlcml2ZUtleSddXG4gICk7XG4gIHJldHVybiBjcnlwdG8uc3VidGxlLmRlcml2ZUtleShcbiAgICB7XG4gICAgICBuYW1lOiAnUEJLREYyJyxcbiAgICAgIHNhbHQsXG4gICAgICBpdGVyYXRpb25zLFxuICAgICAgaGFzaDogJ1NIQS0yNTYnLFxuICAgIH0sXG4gICAgYmFzZUtleSxcbiAgICB7IG5hbWU6ICdBRVMtR0NNJywgbGVuZ3RoOiBLRVlfQklUUyB9LFxuICAgIGZhbHNlLFxuICAgIFsnZW5jcnlwdCcsICdkZWNyeXB0J11cbiAgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuY3J5cHRKU09OKHBsYWludGV4dDogc3RyaW5nLCBwYXNzcGhyYXNlOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAoIXBhc3NwaHJhc2UpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BBU1NQSFJBU0VfUkVRVUlSRUQnKTtcbiAgfVxuICBjb25zdCBzYWx0ID0gcmFuZG9tQnVmZmVyKFNBTFRfQllURVMpO1xuICBjb25zdCBpdiA9IHJhbmRvbUJ1ZmZlcihJVl9CWVRFUyk7XG4gIGNvbnN0IGtleSA9IGF3YWl0IGRlcml2ZUFlc0tleShwYXNzcGhyYXNlLCBzYWx0LCBQQktERjJfSVRFUkFUSU9OUyk7XG4gIGNvbnN0IGNpcGhlckJ1ZiA9IGF3YWl0IGNyeXB0by5zdWJ0bGUuZW5jcnlwdChcbiAgICB7IG5hbWU6ICdBRVMtR0NNJywgaXYgfSxcbiAgICBrZXksXG4gICAgdXRmOEVuY29kZShwbGFpbnRleHQpXG4gICk7XG4gIGNvbnN0IHBheWxvYWQ6IEVuY3J5cHRlZFBheWxvYWQgPSB7XG4gICAgZm9ybWF0OiBFTkNSWVBURURfRk9STUFULFxuICAgIGtkZjogS0RGX05BTUUsXG4gICAgaXRlcmF0aW9uczogUEJLREYyX0lURVJBVElPTlMsXG4gICAgc2FsdDogYnVmZmVyVG9CYXNlNjQoc2FsdCksXG4gICAgaXY6IGJ1ZmZlclRvQmFzZTY0KGl2KSxcbiAgICBjaXBoZXJ0ZXh0OiBidWZmZXJUb0Jhc2U2NChjaXBoZXJCdWYpLFxuICB9O1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocGF5bG9hZCwgbnVsbCwgMik7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWNyeXB0SlNPTihjaXBoZXJ0ZXh0OiBzdHJpbmcsIHBhc3NwaHJhc2U6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGlmICghcGFzc3BocmFzZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignUEFTU1BIUkFTRV9SRVFVSVJFRCcpO1xuICB9XG4gIGxldCBwYXlsb2FkOiBFbmNyeXB0ZWRQYXlsb2FkO1xuICB0cnkge1xuICAgIHBheWxvYWQgPSBKU09OLnBhcnNlKGNpcGhlcnRleHQpIGFzIEVuY3J5cHRlZFBheWxvYWQ7XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBFcnJvcignVU5TVVBQT1JURURfRU5DUllQVEVEX0ZPUk1BVCcpO1xuICB9XG4gIGlmIChwYXlsb2FkLmZvcm1hdCAhPT0gRU5DUllQVEVEX0ZPUk1BVCB8fCBwYXlsb2FkLmtkZiAhPT0gS0RGX05BTUUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VOU1VQUE9SVEVEX0VOQ1JZUFRFRF9GT1JNQVQnKTtcbiAgfVxuICBjb25zdCBzYWx0ID0gYmFzZTY0VG9CdWZmZXIocGF5bG9hZC5zYWx0KTtcbiAgY29uc3QgaXYgPSBiYXNlNjRUb0J1ZmZlcihwYXlsb2FkLml2KTtcbiAgY29uc3QgZGF0YSA9IGJhc2U2NFRvQnVmZmVyKHBheWxvYWQuY2lwaGVydGV4dCk7XG4gIGNvbnN0IGl0ZXJhdGlvbnMgPSBOdW1iZXIuaXNJbnRlZ2VyKHBheWxvYWQuaXRlcmF0aW9ucykgJiYgcGF5bG9hZC5pdGVyYXRpb25zID4gMFxuICAgID8gcGF5bG9hZC5pdGVyYXRpb25zXG4gICAgOiBQQktERjJfSVRFUkFUSU9OUztcbiAgY29uc3Qga2V5ID0gYXdhaXQgZGVyaXZlQWVzS2V5KHBhc3NwaHJhc2UsIHNhbHQsIGl0ZXJhdGlvbnMpO1xuICBsZXQgcGxhaW5CdWY6IEFycmF5QnVmZmVyO1xuICB0cnkge1xuICAgIHBsYWluQnVmID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kZWNyeXB0KHsgbmFtZTogJ0FFUy1HQ00nLCBpdiB9LCBrZXksIGRhdGEpO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0RFQ1JZUFRfRkFJTEVEJyk7XG4gIH1cbiAgcmV0dXJuIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShwbGFpbkJ1Zik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VuY3J5cHRlZFBheWxvYWQocGFyc2VkOiB1bmtub3duKTogcGFyc2VkIGlzIEVuY3J5cHRlZFBheWxvYWQge1xuICByZXR1cm4gQm9vbGVhbihcbiAgICBwYXJzZWQgJiZcbiAgICAgIHR5cGVvZiBwYXJzZWQgPT09ICdvYmplY3QnICYmXG4gICAgICAocGFyc2VkIGFzIHsgZm9ybWF0PzogdW5rbm93biB9KS5mb3JtYXQgPT09IEVOQ1JZUFRFRF9GT1JNQVRcbiAgKTtcbn1cbiIsImltcG9ydCB0eXBlIHsgR2xvYmFsU2V0dGluZ3MgfSBmcm9tICdAL3R5cGVzJztcbmltcG9ydCB7IGdsb2JhbFNldHRpbmdzU2NoZW1hLCB0eXBlIFZhbGlkYXRlZFNldHRpbmdzIH0gZnJvbSAnLi9zY2hlbWEnO1xuXG50eXBlIFZhbGlkYXRlZFByb3ZpZGVyID0gVmFsaWRhdGVkU2V0dGluZ3NbJ3Byb3ZpZGVycyddW251bWJlcl07XG5pbXBvcnQgeyBERUZBVUxUX0dMT0JBTF9QUk9NUFQgfSBmcm9tICcuL3Byb21wdHMnO1xuaW1wb3J0IHsgZW5jcnlwdEpTT04sIGRlY3J5cHRKU09OLCBpc0VuY3J5cHRlZFBheWxvYWQsIEVOQ1JZUFRFRF9GT1JNQVQgfSBmcm9tICcuL2NyeXB0byc7XG5cbmNvbnN0IFNFVFRJTkdTX0tFWSA9ICd0cmFuc2xhdG9yX3NldHRpbmdzX3YxJztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IEdsb2JhbFNldHRpbmdzID0ge1xuICBwcm92aWRlcnM6IFtcbiAgICB7XG4gICAgICBpZDogJ2RlZmF1bHQtb3BlbmFpJyxcbiAgICAgIG5hbWU6ICdPcGVuQUkgQ29tcGF0aWJsZScsXG4gICAgICBiYXNlVVJMOiAnaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MS9jaGF0L2NvbXBsZXRpb25zJyxcbiAgICAgIGFwaUtleTogJycsXG4gICAgICBoZWFkZXJzOiB7fSxcbiAgICAgIHF1ZXJ5OiB7fSxcbiAgICAgIGJvZHk6IHt9LFxuICAgICAgdGVtcGVyYXR1cmU6IDAuMyxcbiAgICAgIHN0cmVhbTogZmFsc2UsXG4gICAgICBtb2RlbHM6IFtcbiAgICAgICAgeyBpZDogJ2dwdC00bycsIG5hbWU6ICdHUFQtNG8nIH0sXG4gICAgICAgIHsgaWQ6ICdncHQtNG8tbWluaScsIG5hbWU6ICdHUFQtNG8gTWluaScgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgXSxcbiAgbW9kZWxRdWV1ZTogW1xuICAgIHsgcHJvdmlkZXJJZDogJ2RlZmF1bHQtb3BlbmFpJywgbW9kZWxJZDogJ2dwdC00bycsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHByb3ZpZGVySWQ6ICdkZWZhdWx0LW9wZW5haScsIG1vZGVsSWQ6ICdncHQtNG8tbWluaScsIGVuYWJsZWQ6IHRydWUgfSxcbiAgXSxcbiAgbmF0aXZlTGFuZ3VhZ2U6ICd6aC1DTicsXG4gIGRlZmF1bHRTb3VyY2VMYW5ndWFnZTogJ2VuJyxcbiAgdWlMYW5ndWFnZTogJ3poLUNOJyxcbiAgZGVmYXVsdFN0eWxlOiAnb3JpZ2luYWwnLFxuICBnbG9iYWxQcm9tcHQ6IERFRkFVTFRfR0xPQkFMX1BST01QVCxcbiAgZGV0ZWN0TGFuZ1Byb3ZpZGVyczogW1xuICAgIHsgaWQ6ICdmcmFuYycsIG5hbWU6ICdmcmFuYy1taW4nLCB0eXBlOiAnZnJhbmMnIH0sXG4gIF0sXG4gIHNob3J0Y3V0S2V5OiAnQWx0K1cnLFxuICBhZ2dyZWdhdGVFbmFibGVkOiB0cnVlLFxuICBtYXhQYXJhZ3JhcGhzUGVyUmVxdWVzdDogNSxcbiAgbWF4VGV4dExlbmd0aFBlclJlcXVlc3Q6IDIwMDAsXG4gIG1heENvbmN1cnJlbnRSZXF1ZXN0czogMyxcbiAgcmVxdWVzdFRpbWVvdXQ6IDMwMDAwLFxufTtcblxuLy8g5pen54mIIHByb3ZpZGVyIOeahCBib2R5Liog6YeH5qC35a2X5q615LiA5qyh5oCn5bmz5ruR6L+B56e75Yiw54us56uL5a2X5q6177yI5bmC562J77yJ44CCXG4vLyDlkIzml7bmuIXnkIYgaGVhZGVycyDkuK3lhpfkvZnnmoTpu5jorqQgQ29udGVudC1UeXBl77yI6K+35rGC5bGC5Lya6Ieq5Yqo5rOo5YWl77yJ44CCXG5mdW5jdGlvbiBub3JtYWxpemVQcm92aWRlcihwcm92aWRlcjogVmFsaWRhdGVkUHJvdmlkZXIpOiBWYWxpZGF0ZWRQcm92aWRlciB7XG4gIGNvbnN0IGJvZHkgPSB7IC4uLnByb3ZpZGVyLmJvZHkgfTtcbiAgY29uc3QgaGVhZGVycyA9IHsgLi4ucHJvdmlkZXIuaGVhZGVycyB9O1xuXG4gIGZvciAoY29uc3QgaGVhZGVyS2V5IG9mIE9iamVjdC5rZXlzKGhlYWRlcnMpKSB7XG4gICAgaWYgKGhlYWRlcktleS50b0xvd2VyQ2FzZSgpID09PSAnY29udGVudC10eXBlJyAmJiBoZWFkZXJzW2hlYWRlcktleV0udG9Mb3dlckNhc2UoKSA9PT0gJ2FwcGxpY2F0aW9uL2pzb24nKSB7XG4gICAgICBkZWxldGUgaGVhZGVyc1toZWFkZXJLZXldO1xuICAgIH1cbiAgfVxuXG4gIGxldCB0ZW1wZXJhdHVyZSA9IHByb3ZpZGVyLnRlbXBlcmF0dXJlO1xuICBsZXQgdG9wUCA9IHByb3ZpZGVyLnRvcFA7XG4gIGxldCBtYXhUb2tlbnMgPSBwcm92aWRlci5tYXhUb2tlbnM7XG4gIGxldCBzdHJlYW0gPSBwcm92aWRlci5zdHJlYW07XG5cbiAgaWYgKHRlbXBlcmF0dXJlID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIGJvZHkudGVtcGVyYXR1cmUgPT09ICdudW1iZXInKSB7XG4gICAgdGVtcGVyYXR1cmUgPSBib2R5LnRlbXBlcmF0dXJlO1xuICB9XG4gIGlmICh0eXBlb2YgYm9keS50ZW1wZXJhdHVyZSA9PT0gJ251bWJlcicpIHtcbiAgICBkZWxldGUgYm9keS50ZW1wZXJhdHVyZTtcbiAgfVxuXG4gIGlmICh0b3BQID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIGJvZHkudG9wX3AgPT09ICdudW1iZXInKSB7XG4gICAgdG9wUCA9IGJvZHkudG9wX3A7XG4gIH1cbiAgaWYgKHR5cGVvZiBib2R5LnRvcF9wID09PSAnbnVtYmVyJykge1xuICAgIGRlbGV0ZSBib2R5LnRvcF9wO1xuICB9XG5cbiAgaWYgKG1heFRva2VucyA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBib2R5Lm1heF90b2tlbnMgPT09ICdudW1iZXInKSB7XG4gICAgbWF4VG9rZW5zID0gYm9keS5tYXhfdG9rZW5zO1xuICB9XG4gIGlmICh0eXBlb2YgYm9keS5tYXhfdG9rZW5zID09PSAnbnVtYmVyJykge1xuICAgIGRlbGV0ZSBib2R5Lm1heF90b2tlbnM7XG4gIH1cblxuICBpZiAoc3RyZWFtID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIGJvZHkuc3RyZWFtID09PSAnYm9vbGVhbicpIHtcbiAgICBzdHJlYW0gPSBib2R5LnN0cmVhbTtcbiAgfVxuICBpZiAodHlwZW9mIGJvZHkuc3RyZWFtID09PSAnYm9vbGVhbicpIHtcbiAgICBkZWxldGUgYm9keS5zdHJlYW07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIC4uLnByb3ZpZGVyLFxuICAgIGhlYWRlcnMsXG4gICAgYm9keSxcbiAgICB0ZW1wZXJhdHVyZSxcbiAgICB0b3BQLFxuICAgIG1heFRva2VucyxcbiAgICBzdHJlYW06IHN0cmVhbSA/PyBmYWxzZSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3Moc2V0dGluZ3M6IFZhbGlkYXRlZFNldHRpbmdzKTogVmFsaWRhdGVkU2V0dGluZ3Mge1xuICByZXR1cm4ge1xuICAgIC4uLnNldHRpbmdzLFxuICAgIHByb3ZpZGVyczogc2V0dGluZ3MucHJvdmlkZXJzLm1hcChub3JtYWxpemVQcm92aWRlciksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlU2V0dGluZ3MoZGF0YTogdW5rbm93bik6IFZhbGlkYXRlZFNldHRpbmdzIHtcbiAgY29uc3QgcGFyc2VkID0gZ2xvYmFsU2V0dGluZ3NTY2hlbWEuc2FmZVBhcnNlKGRhdGEpO1xuICBpZiAocGFyc2VkLnN1Y2Nlc3MpIHtcbiAgICByZXR1cm4gbm9ybWFsaXplU2V0dGluZ3MocGFyc2VkLmRhdGEpO1xuICB9XG4gIGNvbnNvbGUud2FybignSW52YWxpZCBzZXR0aW5ncywgdXNpbmcgZGVmYXVsdHM6JywgcGFyc2VkLmVycm9yLmZvcm1hdCgpKTtcbiAgcmV0dXJuIG5vcm1hbGl6ZVNldHRpbmdzKGdsb2JhbFNldHRpbmdzU2NoZW1hLnBhcnNlKERFRkFVTFRfU0VUVElOR1MpKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFNldHRpbmdzKCk6IFByb21pc2U8VmFsaWRhdGVkU2V0dGluZ3M+IHtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2Uuc3luYy5nZXQoU0VUVElOR1NfS0VZKTtcbiAgY29uc3QgZGF0YSA9IHJlc3VsdFtTRVRUSU5HU19LRVldO1xuICBpZiAoZGF0YSkge1xuICAgIHJldHVybiB2YWxpZGF0ZVNldHRpbmdzKGRhdGEpO1xuICB9XG4gIHJldHVybiB2YWxpZGF0ZVNldHRpbmdzKERFRkFVTFRfU0VUVElOR1MpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVNldHRpbmdzKHNldHRpbmdzOiBHbG9iYWxTZXR0aW5ncyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB2YWxpZGF0ZWQgPSB2YWxpZGF0ZVNldHRpbmdzKHNldHRpbmdzKTtcbiAgYXdhaXQgY2hyb21lLnN0b3JhZ2Uuc3luYy5zZXQoeyBbU0VUVElOR1NfS0VZXTogdmFsaWRhdGVkIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhwb3J0U2V0dGluZ3MocGFzc3BocmFzZT86IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgZ2V0U2V0dGluZ3MoKTtcbiAgY29uc3QgZXhwb3J0RGF0YSA9IHtcbiAgICB2ZXJzaW9uOiAxLFxuICAgIGV4cG9ydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBzZXR0aW5ncyxcbiAgfTtcbiAgY29uc3QgcGxhaW50ZXh0ID0gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgMik7XG4gIGlmIChwYXNzcGhyYXNlICYmIHBhc3NwaHJhc2UubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBhd2FpdCBlbmNyeXB0SlNPTihwbGFpbnRleHQsIHBhc3NwaHJhc2UpO1xuICB9XG4gIHJldHVybiBwbGFpbnRleHQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbXBvcnRTZXR0aW5ncyh0ZXh0OiBzdHJpbmcsIHBhc3NwaHJhc2U/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHBhcnNlZDogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICBwYXJzZWQgPSBKU09OLnBhcnNlKHRleHQpO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTicpO1xuICB9XG5cbiAgbGV0IHBheWxvYWQ6IHVua25vd24gPSBwYXJzZWQ7XG4gIGlmIChpc0VuY3J5cHRlZFBheWxvYWQocGFyc2VkKSkge1xuICAgIGlmICghcGFzc3BocmFzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdQQVNTUEhSQVNFX1JFUVVJUkVEJyk7XG4gICAgfVxuICAgIGNvbnN0IGRlY3J5cHRlZCA9IGF3YWl0IGRlY3J5cHRKU09OKHRleHQsIHBhc3NwaHJhc2UpO1xuICAgIHRyeSB7XG4gICAgICBwYXlsb2FkID0gSlNPTi5wYXJzZShkZWNyeXB0ZWQpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdERUNSWVBUX0ZBSUxFRCcpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHdyYXBwZXIgPSBwYXlsb2FkIGFzIHsgc2V0dGluZ3M/OiB1bmtub3duIH07XG4gIGNvbnN0IHZhbGlkYXRlZCA9IGdsb2JhbFNldHRpbmdzU2NoZW1hLnBhcnNlKHdyYXBwZXI/LnNldHRpbmdzKTtcbiAgYXdhaXQgc2F2ZVNldHRpbmdzKHZhbGlkYXRlZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VuY3J5cHRlZEV4cG9ydCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRleHQpIGFzIHsgZm9ybWF0PzogdW5rbm93biB9O1xuICAgIHJldHVybiBwYXJzZWQ/LmZvcm1hdCA9PT0gRU5DUllQVEVEX0ZPUk1BVDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iLCJpbXBvcnQgeyBmcmFuYyB9IGZyb20gJ2ZyYW5jLW1pbic7XG5pbXBvcnQgdHlwZSB7IExhbmdDb2RlLCBMYW5nRGV0ZWN0UHJvdmlkZXIgfSBmcm9tICdAL3R5cGVzJztcbmltcG9ydCB7IGdldFNldHRpbmdzIH0gZnJvbSAnLi9zdG9yYWdlJztcblxuLy8gSVNPIDYzOS0zIHRvIEJDUCA0NyAvIElTTyA2MzktMSBtYXBwaW5nIGZvciBjb21tb24gbGFuZ3VhZ2VzXG5jb25zdCBJU08zX1RPX0JDUDQ3OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBjbW46ICd6aCcsXG4gIHpobzogJ3poJyxcbiAgZW5nOiAnZW4nLFxuICBqcG46ICdqYScsXG4gIGtvcjogJ2tvJyxcbiAgZnJhOiAnZnInLFxuICBkZXU6ICdkZScsXG4gIHNwYTogJ2VzJyxcbiAgaXRhOiAnaXQnLFxuICBydXM6ICdydScsXG4gIHBvcjogJ3B0JyxcbiAgYXJhOiAnYXInLFxuICBoaW46ICdoaScsXG4gIHRoYTogJ3RoJyxcbiAgdmllOiAndmknLFxuICBpbmQ6ICdpZCcsXG4gIHR1cjogJ3RyJyxcbiAgbmxkOiAnbmwnLFxuICBwb2w6ICdwbCcsXG4gIHVrcjogJ3VrJyxcbiAgc3dlOiAnc3YnLFxuICBub3I6ICdubycsXG4gIGZpbjogJ2ZpJyxcbiAgZGFuOiAnZGEnLFxuICBjZXM6ICdjcycsXG4gIGVsbDogJ2VsJyxcbiAgaGViOiAnaGUnLFxuICBodW46ICdodScsXG4gIHJvbTogJ3JvJyxcbn07XG5cbmZ1bmN0aW9uIG1hcExhbmdDb2RlKGlzbzM6IHN0cmluZyk6IExhbmdDb2RlIHtcbiAgcmV0dXJuIElTTzNfVE9fQkNQNDdbaXNvM10gfHwgaXNvMztcbn1cblxuLy8g5a2X56ym6ZuG5b+r6YCf5YWc5bqV77yaQ0pLIOaWh+acrO+8iOS4rS/ml6Uv6Z+p77yJ5Y2z5L2/6ZW/5bqmIDwgMTAg5Lmf6IO95q2j56Gu6K+G5Yir44CCXG4vLyDkvJjlhYjnuqfvvJrml6XmlofvvIjlkKvlgYflkI3vvIk+IOmfqeaWh++8iOiwmuaWh++8iT4g5Lit5paH77yI5LuFIENKSyDooajmhI/mloflrZfvvInjgIJcbmZ1bmN0aW9uIGRldGVjdEJ5Q2hhcnNldCh0ZXh0OiBzdHJpbmcpOiBMYW5nQ29kZSB8IG51bGwge1xuICBjb25zdCB0cmltbWVkID0gdGV4dC50cmltKCk7XG4gIGlmICghdHJpbW1lZCkgcmV0dXJuIG51bGw7XG5cbiAgbGV0IGNqayA9IDA7XG4gIGxldCBrYW5hID0gMDtcbiAgbGV0IGhhbmd1bCA9IDA7XG4gIGxldCB0b3RhbCA9IDA7XG5cbiAgZm9yIChjb25zdCBjaCBvZiB0cmltbWVkKSB7XG4gICAgY29uc3QgY29kZSA9IGNoLmNvZGVQb2ludEF0KDApO1xuICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuICAgIGlmICgvXFxzLy50ZXN0KGNoKSkgY29udGludWU7XG4gICAgdG90YWwgKz0gMTtcbiAgICBpZiAoKGNvZGUgPj0gMHg0ZTAwICYmIGNvZGUgPD0gMHg5ZmZmKSB8fCAoY29kZSA+PSAweDM0MDAgJiYgY29kZSA8PSAweDRkYmYpKSB7XG4gICAgICBjamsgKz0gMTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgKGNvZGUgPj0gMHgzMDQwICYmIGNvZGUgPD0gMHgzMDlmKSB8fCAvLyBIaXJhZ2FuYVxuICAgICAgKGNvZGUgPj0gMHgzMGEwICYmIGNvZGUgPD0gMHgzMGZmKSAgICAvLyBLYXRha2FuYVxuICAgICkge1xuICAgICAga2FuYSArPSAxO1xuICAgIH0gZWxzZSBpZiAoY29kZSA+PSAweGFjMDAgJiYgY29kZSA8PSAweGQ3YWYpIHtcbiAgICAgIGhhbmd1bCArPSAxO1xuICAgIH1cbiAgfVxuXG4gIGlmICh0b3RhbCA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgLy8g6ZiI5YC86K+05piO77yaXG4gIC8vIC0g5YGH5ZCNIOKJpSAwLjI177ya5pel5paH5paH5pys5Lit5YGH5ZCN5a+G5bqm6YCa5bi45b6I6auY77yIMzAtNjAl77yJ77yM5L2O5LqO5q2k5Y+v6IO95piv5Lit5paH5aS55byV5pel5paH54mH5q6144CCXG4gIC8vIC0g6LCa5paHIOKJpSAwLjPvvJrpn6nmlofmlofmnKzkuK3osJrmlofpn7PoioLlr4bpm4bvvIzpl7TmnYLlsJHph4/msYnlrZfjgIJcbiAgLy8gLSBDSksg4omlIDAuM++8muS4reaWh+WFnOW6le+8iOazqOaEj++8muaXpeaWhy/pn6nmloflt7LlnKjliY3kuKTmnaHnrZvmjonvvInjgIJcbiAgaWYgKGthbmEgLyB0b3RhbCA+PSAwLjI1KSByZXR1cm4gJ2phJztcbiAgaWYgKGhhbmd1bCAvIHRvdGFsID49IDAuMykgcmV0dXJuICdrbyc7XG4gIGlmIChjamsgLyB0b3RhbCA+PSAwLjMpIHJldHVybiAnemgnO1xuXG4gIHJldHVybiBudWxsO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkZXRlY3RXaXRoRnJhbmModGV4dDogc3RyaW5nKTogUHJvbWlzZTxMYW5nQ29kZSB8IG51bGw+IHtcbiAgY29uc3QgdHJpbW1lZCA9IHRleHQudHJpbSgpO1xuXG4gIC8vIGZyYW5jLW1pbiByZXF1aXJlcyBhdCBsZWFzdCB+MTAgY2hhcnMgZm9yIHJlbGlhYmxlIGRldGVjdGlvbu+8m+efreaWh+acrOi1sOWtl+espumbhuWFnOW6leOAglxuICBpZiAodHJpbW1lZC5sZW5ndGggPCAxMCkge1xuICAgIHJldHVybiBkZXRlY3RCeUNoYXJzZXQodHJpbW1lZCk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGlzbzMgPSBmcmFuYyh0ZXh0KTtcbiAgICBpZiAoaXNvMyA9PT0gJ3VuZCcpIHtcbiAgICAgIHJldHVybiBkZXRlY3RCeUNoYXJzZXQodHJpbW1lZCk7XG4gICAgfVxuICAgIHJldHVybiBtYXBMYW5nQ29kZShpc28zKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGRldGVjdEJ5Q2hhcnNldCh0cmltbWVkKTtcbiAgfVxufVxuXG4vLyBHb29nbGUgdHJhbnNsYXRlIOWFrOWFseerr+eCue+8muWFjSBrZXnvvIzkvYbkuK3lm73lpKfpmYborr/pl67lj6/og73kuI3nqLPlrprjgIJcbi8vIOWTjeW6lOaYr+ijuOaVsOe7hO+8mlsgW1tcIuivkeaWh1wiLFwi5Y6f5paHXCIsLi4uXV0sIG51bGwsIFwiemgtQ05cIiwgLi4uIF3vvIznrKzkuInkuKrlhYPntKDmmK/mo4DmtYvliLDnmoTmupDor63oqIDjgIJcbmFzeW5jIGZ1bmN0aW9uIGRldGVjdFdpdGhHb29nbGVGcmVlKHByb3ZpZGVyOiBMYW5nRGV0ZWN0UHJvdmlkZXIsIHRleHQ6IHN0cmluZyk6IFByb21pc2U8TGFuZ0NvZGUgfCBudWxsPiB7XG4gIGNvbnN0IGVuZHBvaW50ID0gcHJvdmlkZXIuZW5kcG9pbnQ/LnRyaW0oKSB8fCAnaHR0cHM6Ly90cmFuc2xhdGUuZ29vZ2xlYXBpcy5jb20vdHJhbnNsYXRlX2Evc2luZ2xlJztcblxuICB0cnkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHByb3ZpZGVyLnRpbWVvdXQgfHwgMTAwMDApO1xuXG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChlbmRwb2ludCk7XG4gICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2NsaWVudCcsICdndHgnKTtcbiAgICB1cmwuc2VhcmNoUGFyYW1zLnNldCgnc2wnLCAnYXV0bycpO1xuICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KCd0bCcsICdlbicpO1xuICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KCdkdCcsICd0Jyk7XG4gICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3EnLCB0ZXh0KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLnRvU3RyaW5nKCksIHtcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgIH0pO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgaWYgKCFyZXNwb25zZS5vaykgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IGxhbmcgPSBBcnJheS5pc0FycmF5KGRhdGEpICYmIHR5cGVvZiBkYXRhWzJdID09PSAnc3RyaW5nJyA/IGRhdGFbMl0gOiBudWxsO1xuICAgIGlmIChsYW5nICYmIGxhbmcubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBsYW5nO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZGV0ZWN0V2l0aEFwaShwcm92aWRlcjogTGFuZ0RldGVjdFByb3ZpZGVyLCB0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPExhbmdDb2RlIHwgbnVsbD4ge1xuICBpZiAoIXByb3ZpZGVyLmVuZHBvaW50KSByZXR1cm4gbnVsbDtcblxuICB0cnkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHByb3ZpZGVyLnRpbWVvdXQgfHwgMTAwMDApO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChwcm92aWRlci5lbmRwb2ludCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIC4uLnByb3ZpZGVyLmhlYWRlcnMsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB0ZXh0IH0pLFxuICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcbiAgICB9KTtcblxuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXG4gICAgaWYgKCFyZXNwb25zZS5vaykgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuXG4gICAgLy8gVHJ5IGNvbW1vbiByZXNwb25zZSBzaGFwZXNcbiAgICBjb25zdCBsYW5nID1cbiAgICAgIGRhdGEubGFuZ3VhZ2UgfHxcbiAgICAgIGRhdGEubGFuZyB8fFxuICAgICAgZGF0YS5kZXRlY3RlZExhbmd1YWdlIHx8XG4gICAgICBkYXRhLnNvdXJjZV9sYW5ndWFnZSB8fFxuICAgICAgZGF0YS5kYXRhPy5sYW5ndWFnZSB8fFxuICAgICAgZGF0YS5kYXRhPy5kZXRlY3Rpb25zPy5bMF0/Lmxhbmd1YWdlIHx8XG4gICAgICBkYXRhLnJlc3VsdD8ubGFuZ3VhZ2U7XG5cbiAgICBpZiAodHlwZW9mIGxhbmcgPT09ICdzdHJpbmcnICYmIGxhbmcubGVuZ3RoID49IDIpIHtcbiAgICAgIHJldHVybiBsYW5nO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyDmnKzlnLDmo4DmtYvvvJrku4UgZnJhbmMtbWluICsgQ0pLIOWtl+espumbhuWFnOW6le+8jOS4jeWPkei1t+S7u+S9lee9kee7nOivt+axguOAglxuLy8g55So5LqOIHBvcHVwIOi+k+WFpemihOiniOetiemakOengeaVj+aEn+WcuuaZr++8jOmBv+WFjeavj+asoeaMiemUrumDveaKiuWGheWuueWPkee7mei/nOerr+ajgOa1i+WZqOOAglxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRldGVjdExhbmd1YWdlTG9jYWwodGV4dDogc3RyaW5nKTogUHJvbWlzZTxMYW5nQ29kZSB8IG51bGw+IHtcbiAgcmV0dXJuIGRldGVjdFdpdGhGcmFuYyh0ZXh0KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRldGVjdExhbmd1YWdlKHRleHQ6IHN0cmluZyk6IFByb21pc2U8TGFuZ0NvZGUgfCBudWxsPiB7XG4gIGNvbnN0IHNldHRpbmdzID0gYXdhaXQgZ2V0U2V0dGluZ3MoKTtcblxuICBmb3IgKGNvbnN0IHByb3ZpZGVyIG9mIHNldHRpbmdzLmRldGVjdExhbmdQcm92aWRlcnMpIHtcbiAgICBsZXQgcmVzdWx0OiBMYW5nQ29kZSB8IG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHByb3ZpZGVyLnR5cGUgPT09ICdmcmFuYycpIHtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IGRldGVjdFdpdGhGcmFuYyh0ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHByb3ZpZGVyLnR5cGUgPT09ICdhcGknKSB7XG4gICAgICByZXN1bHQgPSBhd2FpdCBkZXRlY3RXaXRoQXBpKHByb3ZpZGVyLCB0ZXh0KTtcbiAgICB9IGVsc2UgaWYgKHByb3ZpZGVyLnR5cGUgPT09ICdnb29nbGVfZnJlZScpIHtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IGRldGVjdFdpdGhHb29nbGVGcmVlKHByb3ZpZGVyLCB0ZXh0KTtcbiAgICB9XG5cbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hvdWxkU2tpcFRyYW5zbGF0aW9uKFxuICBkZXRlY3RlZExhbmc6IExhbmdDb2RlIHwgbnVsbCB8IHVuZGVmaW5lZCxcbiAgbmF0aXZlTGFuZ3VhZ2U6IExhbmdDb2RlXG4pOiBib29sZWFuIHtcbiAgaWYgKCFkZXRlY3RlZExhbmcpIHJldHVybiBmYWxzZTtcblxuICAvLyBOb3JtYWxpemUgZm9yIGNvbXBhcmlzb25cbiAgY29uc3QgZGV0ZWN0ZWQgPSBkZXRlY3RlZExhbmcudG9Mb3dlckNhc2UoKS5zcGxpdCgnLScpWzBdO1xuICBjb25zdCBuYXRpdmUgPSBuYXRpdmVMYW5ndWFnZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCctJylbMF07XG5cbiAgcmV0dXJuIGRldGVjdGVkID09PSBuYXRpdmU7XG59XG4iLCIvKipcbiAqIOauteiQveivhuWIq+W8leaTju+8muWGs+WumumhtemdouS4iuWTquS6m+WFg+e0oOWPr+S9nOS4ulwi57+76K+R5Y2V5YWDXCLjgIJcbiAqXG4gKiDorr7orqHopoHngrnvvIjor6bop4EgLmFnZW50LWNvbnRleHQvZGVmYXVsdC9wbGFuLTIvcGxhbi5tZO+8ie+8mlxuICogLSDnmb3lkI3ljZXvvIjlv4XotbDvvIkrIOeBsOWQjeWNle+8iOadoeS7tui1sO+8muebtOaOpeaWh+acrOWNoOavlCDiiaUgNTAl77yJKyDnoawv6L2v5o6S6Zmk44CCXG4gKiAtIOeItuWtkOWOu+mHje+8muiLpeafkOWAmemAieeahFwi5Y+v57+76K+R56WW5YWIXCLlt7Lnu4/lhaXpgInvvIzliJnot7Pov4for6XlgJnpgInvvIzkv53nlZnmnIDlpJblsYLjgIJcbiAqIC0g5YWB6K645ZCrIGlubGluZSBjb2RlIOeahOauteiQvemAmui/h++8iOWQjue7reeUseWNoOS9jeespuacuuWItuWkhOeQhu+8ieOAglxuICovXG5cbmNvbnN0IFdISVRFTElTVF9UQUdTID0gbmV3IFNldChbXG4gICdQJywgJ0xJJywgJ0gxJywgJ0gyJywgJ0gzJywgJ0g0JywgJ0g1JywgJ0g2JyxcbiAgJ0RUJywgJ0REJywgJ0ZJR0NBUFRJT04nLCAnU1VNTUFSWScsICdDQVBUSU9OJywgJ1REJywgJ1RIJyxcbl0pO1xuXG4vLyBCTE9DS1FVT1RFIOaUvueBsOWQjeWNle+8muW4uOingeeahCByZWRkaXQgLyBnaXRodWIgLyBtYXJrZG93biDmuLLmn5PkvJrmiorlvJXmlofmrrXokL1cbi8vIOWMheaIkCA8YmxvY2txdW90ZT48cD7igKY8L3A+PC9ibG9ja3F1b3RlPu+8jOatpOaXtiBibG9ja3F1b3RlIOiHqui6q+ayoeacieebtOaOpeaWh+acrO+8jFxuLy8g5bqU6K6p5YaF6YOoIDxwPiDkvZzkuLrnv7vor5HljZXlhYPvvJvlj6rmnInlvZMgYmxvY2txdW90ZSDnm7TmjqXmlofmnKzljaDmr5TotrPlpJ/vvIjoo7jmlofmnKzlvJXnlKjvvIlcbi8vIOaXtuaJjeaKiuWug+W9k+S9nOaVtOautee/u+ivkeOAgui/meagt+WPr+mBv+WFjeaKiiA8cD4g5b2T5oiQIEtFRVAg5Y2g5L2N56ym5a+86Ie05pW05q615LiN57+76K+R77yMXG4vLyDlkIzml7bkv53nlZkgYmxvY2txdW90ZSDlrrnlmajoh6rouqvnmoTlt6bovrnmoYYgLyDnvKnov5vnrYnnq5nngrnlvJXnlKjmoLflvI/jgIJcbmNvbnN0IEdSQVlMSVNUX1RBR1MgPSBuZXcgU2V0KFsnRElWJywgJ1NFQ1RJT04nLCAnQVJUSUNMRScsICdBU0lERScsICdNQUlOJywgJ0JMT0NLUVVPVEUnXSk7XG5cbmNvbnN0IEhBUkRfRVhDTFVERV9UQUdTID0gbmV3IFNldChbXG4gICdTQ1JJUFQnLCAnU1RZTEUnLCAnTk9TQ1JJUFQnLCAnSUZSQU1FJyxcbiAgJ1RFWFRBUkVBJywgJ0lOUFVUJywgJ0JVVFRPTicsICdTRUxFQ1QnLFxuICAnU1ZHJywgJ0NBTlZBUycsICdWSURFTycsICdBVURJTycsXG4gICdQUkUnLCAnQ09ERScsXG5dKTtcblxuY29uc3QgRElSRUNUX1RFWFRfUkFUSU9fVEhSRVNIT0xEID0gMC41O1xuY29uc3QgTUlOX1RFWFRfTEVOR1RIID0gNTtcblxuY29uc3QgQ0FORElEQVRFX1NFTEVDVE9SID0gWy4uLldISVRFTElTVF9UQUdTLCAuLi5HUkFZTElTVF9UQUdTXVxuICAubWFwKCh0YWcpID0+IHRhZy50b0xvd2VyQ2FzZSgpKVxuICAuam9pbignLCcpO1xuXG4vKiog5L6b5aSW6YOo77yI5aaCIEN0cmwraG92ZXLvvInlv6vpgJ/liKTlrppcIuaYr+S4jeaYr+S4gOS4quauteiQvee6p+WFg+e0oFwi44CCICovXG5leHBvcnQgY29uc3QgQkxPQ0tfU0VMRUNUT1IgPSBDQU5ESURBVEVfU0VMRUNUT1I7XG5cbmZ1bmN0aW9uIGdldERpcmVjdFRleHRMZW5ndGgoZWw6IEhUTUxFbGVtZW50KTogbnVtYmVyIHtcbiAgbGV0IGxlbiA9IDA7XG4gIGZvciAoY29uc3Qgbm9kZSBvZiBBcnJheS5mcm9tKGVsLmNoaWxkTm9kZXMpKSB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICBsZW4gKz0gKG5vZGUudGV4dENvbnRlbnQgPz8gJycpLnRyaW0oKS5sZW5ndGg7XG4gICAgfVxuICB9XG4gIHJldHVybiBsZW47XG59XG5cbmZ1bmN0aW9uIGhhc0V4Y2x1ZGVkQW5jZXN0b3IoZWw6IEhUTUxFbGVtZW50KTogYm9vbGVhbiB7XG4gIGxldCBjdXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IGVsO1xuICB3aGlsZSAoY3VyKSB7XG4gICAgaWYgKGN1ci5pc0NvbnRlbnRFZGl0YWJsZSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKGN1ci5nZXRBdHRyaWJ1dGU/LignY29udGVudGVkaXRhYmxlJykgPT09ICd0cnVlJykgcmV0dXJuIHRydWU7XG4gICAgaWYgKGN1ci5nZXRBdHRyaWJ1dGU/LigndHJhbnNsYXRlJykgPT09ICdubycpIHJldHVybiB0cnVlO1xuICAgIGlmIChjdXIuY2xhc3NMaXN0Py5jb250YWlucygnbm90cmFuc2xhdGUnKSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKGN1ci5nZXRBdHRyaWJ1dGU/LignYXJpYS1oaWRkZW4nKSA9PT0gJ3RydWUnKSByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCByb2xlID0gY3VyLmdldEF0dHJpYnV0ZT8uKCdyb2xlJyk7XG4gICAgaWYgKHJvbGUgPT09ICdjb2RlJyB8fCByb2xlID09PSAnbWF0aCcpIHJldHVybiB0cnVlO1xuICAgIGlmIChjdXIuaGFzQXR0cmlidXRlPy4oJ2RhdGEtdHJhbnNsYXRvci1wcm9jZXNzZWQnKSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKGN1ci5oYXNBdHRyaWJ1dGU/LignZGF0YS10cmFuc2xhdG9yLWNsb25lJykpIHJldHVybiB0cnVlO1xuICAgIGN1ciA9IGN1ci5wYXJlbnRFbGVtZW50O1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaXNWaXNpYmxlKGVsOiBIVE1MRWxlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoZWwub2Zmc2V0UGFyZW50ID09PSBudWxsKSB7XG4gICAgLy8gb2Zmc2V0UGFyZW50ID09PSBudWxsIOWvuSBwb3NpdGlvbjpmaXhlZCDkvJror6/liKTvvIzpgIDljJbliLAgcmVjdCDliKTlrppcbiAgICBjb25zdCBzdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICBpZiAoc3R5bGUuZGlzcGxheSA9PT0gJ25vbmUnIHx8IHN0eWxlLnZpc2liaWxpdHkgPT09ICdoaWRkZW4nKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHN0eWxlLnBvc2l0aW9uICE9PSAnZml4ZWQnKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgY29uc3QgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICByZXR1cm4gcmVjdC53aWR0aCA+IDAgfHwgcmVjdC5oZWlnaHQgPiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUcmFuc2xhdGFibGVCbG9jayhlbDogSFRNTEVsZW1lbnQgfCBudWxsIHwgdW5kZWZpbmVkKTogZWwgaXMgSFRNTEVsZW1lbnQge1xuICBpZiAoIWVsKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgdGFnID0gZWwudGFnTmFtZTtcbiAgaWYgKEhBUkRfRVhDTFVERV9UQUdTLmhhcyh0YWcpKSByZXR1cm4gZmFsc2U7XG5cbiAgY29uc3QgaXNXaGl0ZWxpc3QgPSBXSElURUxJU1RfVEFHUy5oYXModGFnKTtcbiAgY29uc3QgaXNHcmF5bGlzdCA9IEdSQVlMSVNUX1RBR1MuaGFzKHRhZyk7XG4gIGlmICghaXNXaGl0ZWxpc3QgJiYgIWlzR3JheWxpc3QpIHJldHVybiBmYWxzZTtcblxuICBpZiAoaGFzRXhjbHVkZWRBbmNlc3RvcihlbCkpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCB0ZXh0ID0gZWwudGV4dENvbnRlbnQ/LnRyaW0oKSA/PyAnJztcbiAgaWYgKHRleHQubGVuZ3RoIDwgTUlOX1RFWFRfTEVOR1RIKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKCFpc1Zpc2libGUoZWwpKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzR3JheWxpc3QpIHtcbiAgICAvLyDngbDlkI3ljZXvvJrlv4XpobtcIuebtOaOpeaWh+acrFwi5Y2g5q+U5aSf6auY5omN6KeG5L2c5q616JC977yM5ZCm5YiZ6K6p5a2Q5YWD57Sg5Y675Yy56YWN44CCXG4gICAgY29uc3QgZGlyZWN0TGVuID0gZ2V0RGlyZWN0VGV4dExlbmd0aChlbCk7XG4gICAgY29uc3QgdG90YWxMZW4gPSB0ZXh0Lmxlbmd0aDtcbiAgICBpZiAodG90YWxMZW4gPT09IDApIHJldHVybiBmYWxzZTtcbiAgICBpZiAoZGlyZWN0TGVuIC8gdG90YWxMZW4gPCBESVJFQ1RfVEVYVF9SQVRJT19USFJFU0hPTEQpIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIOS7jiByb290IOi1t+aUtumbhuaJgOacieWPr+e/u+ivkeauteiQve+8jOW5tuWvueeItuWtkOWQjOaXtuWRveS4reeahOaDheWGteS/neeVmeacgOWkluWxguOAglxuICovXG5leHBvcnQgZnVuY3Rpb24gY29sbGVjdEJsb2Nrcyhyb290OiBQYXJlbnROb2RlID0gZG9jdW1lbnQpOiBIVE1MRWxlbWVudFtdIHtcbiAgY29uc3Qgc2NvcGU6IEVsZW1lbnQgPSAocm9vdCBpbnN0YW5jZW9mIERvY3VtZW50KSA/IHJvb3QuZG9jdW1lbnRFbGVtZW50IDogKHJvb3QgYXMgRWxlbWVudCk7XG4gIGlmICghc2NvcGUpIHJldHVybiBbXTtcblxuICBjb25zdCBhbGwgPSBBcnJheS5mcm9tKHNjb3BlLnF1ZXJ5U2VsZWN0b3JBbGwoQ0FORElEQVRFX1NFTEVDVE9SKSkgYXMgSFRNTEVsZW1lbnRbXTtcbiAgLy8g5oqKIHJvb3Qg6Ieq6Lqr5Lmf57qz5YWl5YCZ6YCJ77yITXV0YXRpb25PYnNlcnZlciDkvKDlhaXljZXkuKrmlrDlop7oioLngrnml7bpnIDopoHvvIlcbiAgaWYgKHNjb3BlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQgJiYgc2NvcGUubWF0Y2hlcyhDQU5ESURBVEVfU0VMRUNUT1IpKSB7XG4gICAgYWxsLnVuc2hpZnQoc2NvcGUpO1xuICB9XG5cbiAgY29uc3QgcGFzc2VkOiBIVE1MRWxlbWVudFtdID0gW107XG4gIGZvciAoY29uc3QgZWwgb2YgYWxsKSB7XG4gICAgaWYgKGlzVHJhbnNsYXRhYmxlQmxvY2soZWwpKSBwYXNzZWQucHVzaChlbCk7XG4gIH1cblxuICBpZiAocGFzc2VkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuXG4gIC8vIOeItuWtkOWOu+mHje+8muaehOmAoCBTZXQg5L6/5LqOIE8oMSkg5p+l6KGo77yb5a+55q+P5Liq5YCZ6YCJ5b6A5LiK5om+5piv5ZCm5a2Y5Zyo5bey5ZyoIFNldCDnmoTnpZblhYjjgIJcbiAgY29uc3QgcGFzc2VkU2V0ID0gbmV3IFNldChwYXNzZWQpO1xuICBjb25zdCBzdXJ2aXZvcnM6IEhUTUxFbGVtZW50W10gPSBbXTtcbiAgZm9yIChjb25zdCBlbCBvZiBwYXNzZWQpIHtcbiAgICBsZXQgaGFzQW5jZXN0b3JJblNldCA9IGZhbHNlO1xuICAgIGxldCBwYXJlbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IGVsLnBhcmVudEVsZW1lbnQ7XG4gICAgd2hpbGUgKHBhcmVudCkge1xuICAgICAgaWYgKHBhc3NlZFNldC5oYXMocGFyZW50KSkge1xuICAgICAgICBoYXNBbmNlc3RvckluU2V0ID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50RWxlbWVudDtcbiAgICB9XG4gICAgaWYgKCFoYXNBbmNlc3RvckluU2V0KSBzdXJ2aXZvcnMucHVzaChlbCk7XG4gIH1cblxuICByZXR1cm4gc3Vydml2b3JzO1xufVxuIiwiLyoqXG4gKiDooYzlhoXljaDkvY3nrKbkv53nlZnmnLrliLbvvJrnv7vor5HliY3miorooYzlhoXlr4zmlofmnKzoioLngrnmir3miJAgYCNOI2Ag5pWw5a2X5qCH6K6w77yMXG4gKiDlj5HpgIHnuq/mlofmnKznu5kgTExN77yM6K+R5paH5Zue5Lyg5ZCO5YaN5oqK5Y2g5L2N56ym6L+Y5Y6f5Li65Y6fIEhUTUwg54mH5q6144CCXG4gKlxuICog6K6+6K6h6KaB54K577yI6K+m6KeBIC5hZ2VudC1jb250ZXh0L2RlZmF1bHQvcGxhbi0zL3BsYW4ubWTvvInvvJpcbiAqIC0gSU5MSU5FX0tFRVDvvJror63kuYnovb3kvZPvvIhBIC8gQ09ERSAvIElNRyDnrYnvvInihpIg55So5Y2g5L2N56ym77yM5L+d55WZ5Y6fIERPTeOAglxuICogLSBJTkxJTkVfRkxBVFRFTu+8muaWh+acrOW8uuiwg++8iFNUUk9ORyAvIEVNIC8g5pmu6YCaIFNQQU7vvInihpIg5bGV5bmz5Li65paH5a2X77yM6Lef6ZqP6K+R5paH44CCXG4gKiAtIOacquefpeWFg+e0oOm7mOiupOi1sCBLRUVQ77yM6YG/5YWN5Lii57uT5p6E44CCXG4gKiAtIOe8luWPt+S7jiAxIOW8gOWni++8jOagvOW8jyBgI04jYO+8jOS4u+a1gSBMTE0g5L+d55WZ546H5pyA6auY44CCXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBFbmNvZGVkQmxvY2sge1xuICBwbGFjZWhvbGRlclRleHQ6IHN0cmluZztcbiAgZnJhZ21lbnRzOiBEb2N1bWVudEZyYWdtZW50W107XG59XG5cbmNvbnN0IElOTElORV9GTEFUVEVOX1RBR1MgPSBuZXcgU2V0KFtcbiAgJ1NUUk9ORycsICdCJywgJ0VNJywgJ0knLCAnVScsICdTTUFMTCcsICdTUEFOJyxcbl0pO1xuXG5jb25zdCBQTEFDRUhPTERFUl9SRUdFWCA9IC8jKFxcZCspIy9nO1xuXG5mdW5jdGlvbiBpc01hdGhMaWtlU3BhbihlbDogRWxlbWVudCk6IGJvb2xlYW4ge1xuICBpZiAoZWwudGFnTmFtZSAhPT0gJ1NQQU4nKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGNscyA9IGVsLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSA/PyAnJztcbiAgcmV0dXJuIGNscy5pbmNsdWRlcygnbWF0aCcpIHx8IGNscy5pbmNsdWRlcygna2F0ZXgnKTtcbn1cblxuZnVuY3Rpb24gd3JhcEFzRnJhZ21lbnQobm9kZTogTm9kZSk6IERvY3VtZW50RnJhZ21lbnQge1xuICBjb25zdCBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICBmcmFnLmFwcGVuZENoaWxkKG5vZGUpO1xuICByZXR1cm4gZnJhZztcbn1cblxuaW50ZXJmYWNlIEVuY29kZUNvbnRleHQge1xuICBmcmFnbWVudHM6IERvY3VtZW50RnJhZ21lbnRbXTtcbiAgcGFydHM6IHN0cmluZ1tdO1xufVxuXG5mdW5jdGlvbiBlbmNvZGVOb2RlKGN0eDogRW5jb2RlQ29udGV4dCwgbm9kZTogTm9kZSk6IHZvaWQge1xuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICBjdHgucGFydHMucHVzaChub2RlLnRleHRDb250ZW50ID8/ICcnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKG5vZGUubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFKSByZXR1cm47XG5cbiAgY29uc3QgZWwgPSBub2RlIGFzIEVsZW1lbnQ7XG4gIGNvbnN0IHRhZyA9IGVsLnRhZ05hbWU7XG5cbiAgaWYgKHRhZyA9PT0gJ0JSJykge1xuICAgIGN0eC5wYXJ0cy5wdXNoKCdcXG4nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoSU5MSU5FX0ZMQVRURU5fVEFHUy5oYXModGFnKSAmJiAhaXNNYXRoTGlrZVNwYW4oZWwpKSB7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGVsLmNoaWxkTm9kZXMpKSB7XG4gICAgICBlbmNvZGVOb2RlKGN0eCwgY2hpbGQpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBLRUVQ77yaSU5MSU5FX0tFRVAgKyBtYXRoLWxpa2Ugc3BhbiArIOWFtuWug+acquefpeWFg+e0oO+8iOWuieWFqOWFnOW6le+8iVxuICBjdHguZnJhZ21lbnRzLnB1c2god3JhcEFzRnJhZ21lbnQoZWwuY2xvbmVOb2RlKHRydWUpKSk7XG4gIGN0eC5wYXJ0cy5wdXNoKGAjJHtjdHguZnJhZ21lbnRzLmxlbmd0aH0jYCk7XG59XG5cbi8qKiDmiorlnZfnuqflhYPntKDnmoTlrZDlrZnnvJbnoIHkuLogYCNOI2Ag5Y2g5L2N5paH5pys5LiO5a+55bqUIERPTSDniYfmrrXjgIIgKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVJbmxpbmUoZWw6IEhUTUxFbGVtZW50KTogRW5jb2RlZEJsb2NrIHtcbiAgY29uc3QgY3R4OiBFbmNvZGVDb250ZXh0ID0geyBmcmFnbWVudHM6IFtdLCBwYXJ0czogW10gfTtcbiAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGVsLmNoaWxkTm9kZXMpKSB7XG4gICAgZW5jb2RlTm9kZShjdHgsIGNoaWxkKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIHBsYWNlaG9sZGVyVGV4dDogY3R4LnBhcnRzLmpvaW4oJycpLnRyaW0oKSxcbiAgICBmcmFnbWVudHM6IGN0eC5mcmFnbWVudHMsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFRleHRQcmVzZXJ2aW5nQnIoY29udGFpbmVyOiBEb2N1bWVudEZyYWdtZW50LCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCF0ZXh0KSByZXR1cm47XG4gIGNvbnN0IGxpbmVzID0gdGV4dC5zcGxpdCgnXFxuJyk7XG4gIGxpbmVzLmZvckVhY2goKGxpbmUsIGkpID0+IHtcbiAgICBpZiAoaSA+IDApIGNvbnRhaW5lci5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpKTtcbiAgICBpZiAobGluZSkgY29udGFpbmVyLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGxpbmUpKTtcbiAgfSk7XG59XG5cbi8qKiDmjIkgYCNOI2Ag6L+Y5Y6f6K+R5paH5Li6IERvY3VtZW50RnJhZ21lbnTvvJvnvLrlpLHnmoTljaDkvY3nrKbkv53nlZnmlofmnKzlubblkYrorabvvIzkvr/kuo7lj5HnjrDogIzpnZ7pnZnpu5jkuKLlpLHjgIIgKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWNvZGVJbmxpbmUodHJhbnNsYXRlZDogc3RyaW5nLCBmcmFnbWVudHM6IERvY3VtZW50RnJhZ21lbnRbXSk6IERvY3VtZW50RnJhZ21lbnQge1xuICBjb25zdCBvdXQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gIGxldCBsYXN0SW5kZXggPSAwO1xuICBQTEFDRUhPTERFUl9SRUdFWC5sYXN0SW5kZXggPSAwO1xuXG4gIGxldCBtYXRjaDogUmVnRXhwRXhlY0FycmF5IHwgbnVsbDtcbiAgd2hpbGUgKChtYXRjaCA9IFBMQUNFSE9MREVSX1JFR0VYLmV4ZWModHJhbnNsYXRlZCkpICE9PSBudWxsKSB7XG4gICAgY29uc3QgcHJlZml4ID0gdHJhbnNsYXRlZC5zbGljZShsYXN0SW5kZXgsIG1hdGNoLmluZGV4KTtcbiAgICBhcHBlbmRUZXh0UHJlc2VydmluZ0JyKG91dCwgcHJlZml4KTtcblxuICAgIGNvbnN0IGlkeCA9IE51bWJlcihtYXRjaFsxXSk7XG4gICAgY29uc3QgZnJhZyA9IGZyYWdtZW50c1tpZHggLSAxXTtcbiAgICBpZiAoIWZyYWcpIHtcbiAgICAgIGNvbnNvbGUud2FybignW3RyYW5zbGF0b3JdIHBsYWNlaG9sZGVyIG5vdCBmb3VuZCBpbiBmcmFnbWVudHM6JywgbWF0Y2hbMF0pO1xuICAgICAgb3V0LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG1hdGNoWzBdKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dC5hcHBlbmRDaGlsZChmcmFnLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgfVxuXG4gICAgbGFzdEluZGV4ID0gUExBQ0VIT0xERVJfUkVHRVgubGFzdEluZGV4O1xuICB9XG5cbiAgYXBwZW5kVGV4dFByZXNlcnZpbmdCcihvdXQsIHRyYW5zbGF0ZWQuc2xpY2UobGFzdEluZGV4KSk7XG4gIHJldHVybiBvdXQ7XG59XG4iLCJleHBvcnQgaW50ZXJmYWNlIEJhdGNoSXRlbSB7XG4gIGlkOiBudW1iZXI7XG4gIHRleHQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZWNvZGVkQmF0Y2gge1xuICB0cmFuc2xhdGlvbnM6IE1hcDxudW1iZXIsIHN0cmluZz47XG4gIG1pc3Npbmc6IG51bWJlcltdO1xuICBkdXBsaWNhdGVkOiBudW1iZXJbXTtcbn1cblxuY29uc3QgTUFSS0VSX1JFID0gL148PDwoXFxkKyk+Pj5cXHMqJC9nbTtcblxuZXhwb3J0IGZ1bmN0aW9uIGVuY29kZUJhdGNoKGl0ZW1zOiBCYXRjaEl0ZW1bXSk6IHN0cmluZyB7XG4gIHJldHVybiBpdGVtcy5tYXAoKHsgaWQsIHRleHQgfSkgPT4gYDw8PCR7aWR9Pj4+XFxuJHt0ZXh0fWApLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlQmF0Y2gocmF3OiBzdHJpbmcsIGV4cGVjdGVkOiBudW1iZXIpOiBEZWNvZGVkQmF0Y2gge1xuICB0eXBlIE1hcmtlciA9IHsgaWQ6IG51bWJlcjsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfTtcbiAgY29uc3QgbWFya2VyczogTWFya2VyW10gPSBbXTtcblxuICBNQVJLRVJfUkUubGFzdEluZGV4ID0gMDtcbiAgbGV0IG06IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XG4gIHdoaWxlICgobSA9IE1BUktFUl9SRS5leGVjKHJhdykpICE9PSBudWxsKSB7XG4gICAgbWFya2Vycy5wdXNoKHtcbiAgICAgIGlkOiBOdW1iZXIobVsxXSksXG4gICAgICBzdGFydDogbS5pbmRleCxcbiAgICAgIGVuZDogbS5pbmRleCArIG1bMF0ubGVuZ3RoLFxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgdHJhbnNsYXRpb25zID0gbmV3IE1hcDxudW1iZXIsIHN0cmluZz4oKTtcbiAgY29uc3QgY291bnRzID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG1hcmtlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjdXIgPSBtYXJrZXJzW2ldO1xuICAgIGNvbnN0IG5leHQgPSBtYXJrZXJzW2kgKyAxXTtcbiAgICBjb25zdCBzZWdtZW50ID0gcmF3LnNsaWNlKGN1ci5lbmQsIG5leHQgPyBuZXh0LnN0YXJ0IDogcmF3Lmxlbmd0aCkudHJpbSgpO1xuICAgIHRyYW5zbGF0aW9ucy5zZXQoY3VyLmlkLCBzZWdtZW50KTtcbiAgICBjb3VudHMuc2V0KGN1ci5pZCwgKGNvdW50cy5nZXQoY3VyLmlkKSA/PyAwKSArIDEpO1xuICB9XG5cbiAgY29uc3QgbWlzc2luZzogbnVtYmVyW10gPSBbXTtcbiAgZm9yIChsZXQgaWQgPSAxOyBpZCA8PSBleHBlY3RlZDsgaWQrKykge1xuICAgIGlmICghdHJhbnNsYXRpb25zLmhhcyhpZCkpIG1pc3NpbmcucHVzaChpZCk7XG4gIH1cblxuICBjb25zdCBkdXBsaWNhdGVkOiBudW1iZXJbXSA9IFtdO1xuICBmb3IgKGNvbnN0IFtpZCwgY291bnRdIG9mIGNvdW50cykge1xuICAgIGlmIChjb3VudCA+IDEpIGR1cGxpY2F0ZWQucHVzaChpZCk7XG4gIH1cbiAgZHVwbGljYXRlZC5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG5cbiAgcmV0dXJuIHsgdHJhbnNsYXRpb25zLCBtaXNzaW5nLCBkdXBsaWNhdGVkIH07XG59XG4iLCJpbXBvcnQgdHlwZSB7IEJnTWVzc2FnZSB9IGZyb20gJ0AvdHlwZXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gc2VuZEJnTWVzc2FnZTxUID0gdW5rbm93bj4obWVzc2FnZTogQmdNZXNzYWdlKTogUHJvbWlzZTxUPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UobWVzc2FnZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2U/LnN1Y2Nlc3MpIHtcbiAgICAgICAgcmVzb2x2ZShyZXNwb25zZS5kYXRhIGFzIFQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihyZXNwb25zZT8uZXJyb3IgPz8gJ1Vua25vd24gZXJyb3InKSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuIiwiaW1wb3J0IHsgZGVmaW5lQ29udGVudFNjcmlwdCB9IGZyb20gJ3d4dC91dGlscy9kZWZpbmUtY29udGVudC1zY3JpcHQnO1xuaW1wb3J0IHR5cGUgeyBMYW5nQ29kZSwgVHJhbnNsYXRpb25TdHlsZSwgVHJhbnNsYXRpb25SZXNwb25zZSB9IGZyb20gJ0AvdHlwZXMnO1xuaW1wb3J0IHsgc2hvdWxkU2tpcFRyYW5zbGF0aW9uIH0gZnJvbSAnQC9saWIvbGFuZy1kZXRlY3QnO1xuaW1wb3J0IHsgY29sbGVjdEJsb2NrcywgaXNUcmFuc2xhdGFibGVCbG9jaywgQkxPQ0tfU0VMRUNUT1IgfSBmcm9tICdAL2xpYi9ibG9jay1kZXRlY3QnO1xuaW1wb3J0IHsgZW5jb2RlSW5saW5lLCBkZWNvZGVJbmxpbmUgfSBmcm9tICdAL2xpYi9pbmxpbmUtcGxhY2Vob2xkZXInO1xuaW1wb3J0IHsgZW5jb2RlQmF0Y2gsIGRlY29kZUJhdGNoIH0gZnJvbSAnQC9saWIvYmF0Y2gtcHJvdG9jb2wnO1xuaW1wb3J0IHsgc2VuZEJnTWVzc2FnZSB9IGZyb20gJ0AvbGliL21lc3NhZ2luZyc7XG5pbXBvcnQgJy4vc3R5bGVzLmNzcyc7XG5cbi8vIOKUgOKUgOKUgCBUeXBlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuaW50ZXJmYWNlIEVsZW1lbnRTdGF0ZSB7XG4gIG9yaWdpbmFsSFRNTDogc3RyaW5nO1xuICB0cmFuc2xhdGVkVGV4dDogc3RyaW5nO1xuICBzdGF0dXM6ICdpZGxlJyB8ICdwZW5kaW5nJyB8ICd0cmFuc2xhdGVkJyB8ICdlcnJvcic7XG4gIGNsb25lRWw/OiBIVE1MRWxlbWVudDtcbn1cblxuaW50ZXJmYWNlIEFnZ3JlZ2F0ZVNldHRpbmdzIHtcbiAgYWdncmVnYXRlRW5hYmxlZDogYm9vbGVhbjtcbiAgbWF4UGFyYWdyYXBoc1BlclJlcXVlc3Q6IG51bWJlcjtcbiAgbWF4VGV4dExlbmd0aFBlclJlcXVlc3Q6IG51bWJlcjtcbiAgbWF4Q29uY3VycmVudFJlcXVlc3RzOiBudW1iZXI7XG4gIHJlcXVlc3RUaW1lb3V0OiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBHbG9iYWxTdGF0ZSB7XG4gIGlzQWN0aXZlOiBib29sZWFuO1xuICBzdHlsZTogVHJhbnNsYXRpb25TdHlsZTtcbiAgbmF0aXZlTGFuZ3VhZ2U6IExhbmdDb2RlO1xuICB0YXJnZXRMYW5nOiBMYW5nQ29kZTtcbiAgb2JzZXJ2ZXI6IEludGVyc2VjdGlvbk9ic2VydmVyIHwgbnVsbDtcbiAgZWxlbWVudE1hcDogTWFwPEhUTUxFbGVtZW50LCBFbGVtZW50U3RhdGU+O1xuICBhZ2dyZWdhdGU6IEFnZ3JlZ2F0ZVNldHRpbmdzO1xuICBwZW5kaW5nQWdncmVnYXRlRWxlbWVudHM6IFNldDxIVE1MRWxlbWVudD47XG4gIGFnZ3JlZ2F0ZURlYm91bmNlVGltZXI6IG51bWJlciB8IG51bGw7XG59XG5cbi8vIOKUgOKUgOKUgCBTdGF0ZSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuLy8g6K+R5paHIHdyYXBwZXIg4oaSIOWOn+WniyBlbCDlj43mn6XooajjgILnlKjkuo4gQ3RybCDliIfmjaLmgaLlpI3ml7bku44gd3JhcHBlciDlj43mn6Xljp8gZWzvvJtcbi8vIOWQjOaXtuaYr+OAjOWOnyBlbCDnprvlvIAgRE9NIOWQjuS7jeWPr+inpui+vuOAjeeahOWtmOWCqOmUmueCueOAguWOnyBlbCDoioLngrnmnKzouqvkv53lrZjlnKhcbi8vIGBzdGF0ZS5lbGVtZW50TWFwYO+8iOmAmui/hyBFbGVtZW50U3RhdGXvvInvvJtET00g5qCR6YeM5Y+q5YmpIHdyYXBwZXIg5Y2g5o2u5qe95L2N44CCXG5jb25zdCB3cmFwcGVyVG9PcmlnaW5hbDogV2Vha01hcDxIVE1MRWxlbWVudCwgSFRNTEVsZW1lbnQ+ID0gbmV3IFdlYWtNYXAoKTtcblxuLy8gTXV0YXRpb25PYnNlcnZlciDoioLmtYHmibnlpITnkIbvvJrmqKHlnZfnuqfkv53lrZjvvIjkuI3mlL7ov5sgc3RhdGXvvIzpgb/lhY0gcmVzdG9yZUFsbCDor6/muIXvvInjgIJcbi8vIOiKgueCueemu+Wcuua4heeQhui3r+W+hOS7jeWunuaXtuaJp+ihjO+8m+aWsOWinui3r+W+hOWFpemYn+WQjueUsSBmbHVzaCDmibnlpITnkIbjgIJcbmxldCBtdXRhdGlvbkZsdXNoVGltZXI6IG51bWJlciB8IG51bGwgPSBudWxsO1xuY29uc3QgcGVuZGluZ011dGF0aW9uTm9kZXM6IFNldDxIVE1MRWxlbWVudD4gPSBuZXcgU2V0KCk7XG5jb25zdCBNVVRBVElPTl9GTFVTSF9ERUxBWV9NUyA9IDIwMDtcblxuY29uc3Qgc3RhdGU6IEdsb2JhbFN0YXRlID0ge1xuICBpc0FjdGl2ZTogZmFsc2UsXG4gIHN0eWxlOiAnb3JpZ2luYWwnLFxuICBuYXRpdmVMYW5ndWFnZTogJ3poLUNOJyxcbiAgdGFyZ2V0TGFuZzogJ3poLUNOJyxcbiAgb2JzZXJ2ZXI6IG51bGwsXG4gIGVsZW1lbnRNYXA6IG5ldyBNYXAoKSxcbiAgYWdncmVnYXRlOiB7XG4gICAgYWdncmVnYXRlRW5hYmxlZDogdHJ1ZSxcbiAgICBtYXhQYXJhZ3JhcGhzUGVyUmVxdWVzdDogNSxcbiAgICBtYXhUZXh0TGVuZ3RoUGVyUmVxdWVzdDogMjAwMCxcbiAgICBtYXhDb25jdXJyZW50UmVxdWVzdHM6IDMsXG4gICAgcmVxdWVzdFRpbWVvdXQ6IDMwMDAwLFxuICB9LFxuICBwZW5kaW5nQWdncmVnYXRlRWxlbWVudHM6IG5ldyBTZXQoKSxcbiAgYWdncmVnYXRlRGVib3VuY2VUaW1lcjogbnVsbCxcbn07XG5cbi8vIOKUgOKUgOKUgCBVdGlsaXRpZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmZ1bmN0aW9uIGlzVmFsaWRQYWdlKCk6IGJvb2xlYW4ge1xuICBjb25zdCB1cmwgPSBsb2NhdGlvbi5ocmVmO1xuICByZXR1cm4gIXVybC5zdGFydHNXaXRoKCdjaHJvbWU6Ly8nKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJ2Nocm9tZS1leHRlbnNpb246Ly8nKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJ2RldnRvb2xzOi8vJyk7XG59XG5cbmZ1bmN0aW9uIGdldFRyYW5zbGF0YWJsZUVsZW1lbnRzKHJvb3Q6IFBhcmVudE5vZGUgPSBkb2N1bWVudCk6IEhUTUxFbGVtZW50W10ge1xuICByZXR1cm4gY29sbGVjdEJsb2Nrcyhyb290KTtcbn1cblxuLy8g4pSA4pSA4pSAIFN0eWxlIEFwcGxpY2F0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG5mdW5jdGlvbiBjbG9uZUFzV3JhcHBlcihlbDogSFRNTEVsZW1lbnQpOiBIVE1MRWxlbWVudCB7XG4gIGNvbnN0IHdyYXBwZXIgPSBlbC5jbG9uZU5vZGUoZmFsc2UpIGFzIEhUTUxFbGVtZW50O1xuICAvLyDpgb/lhY0gaWQg5Yay56qB5a+86Ie0IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkIC8g6ZSa54K56Lez6L2s5byC5bi4XG4gIGlmICh3cmFwcGVyLmlkKSB3cmFwcGVyLnJlbW92ZUF0dHJpYnV0ZSgnaWQnKTtcbiAgcmV0dXJuIHdyYXBwZXI7XG59XG5cbi8vIOWdl+e6p+agh+etvumbhuWQiO+8mueUqOS6jiBiaWxpbmd1YWwg6YCJ5oupIGJsb2NrIC8gaW5saW5lIOWxleekuuW9ouW8j+OAglxuLy8g55u05o6l5oyJIHRhZ05hbWUg5Yik5a6a6ICM6Z2eIGdldENvbXB1dGVkU3R5bGXvvIzpgb/lhY3nq5nngrkgZGlzcGxheSDooqsgaW5saW5lIOWMlu+8iOWmglxuLy8gVGFpbHdpbmQgYGJsb2NrYCByZXNldOOAgeWQhOenjSBub3JtYWxpemXvvInlkI7or6/liKTvvIzkuZ/lhY3ljrvlkIzmraUgcmVmbG93IOaIkOacrOOAglxuY29uc3QgQkxPQ0tfVEFHUyA9IG5ldyBTZXQoW1xuICAnUCcsICdMSScsICdIMScsICdIMicsICdIMycsICdINCcsICdINScsICdINicsXG4gICdCTE9DS1FVT1RFJywgJ0RJVicsICdBUlRJQ0xFJywgJ1NFQ1RJT04nLCAnRklHQ0FQVElPTicsXG4gICdEVCcsICdERCcsICdDQVBUSU9OJywgJ1REJywgJ1RIJyxcbl0pO1xuXG5mdW5jdGlvbiBpc0Jsb2NrRWxlbWVudChlbDogSFRNTEVsZW1lbnQpOiBib29sZWFuIHtcbiAgcmV0dXJuIEJMT0NLX1RBR1MuaGFzKGVsLnRhZ05hbWUpO1xufVxuXG4vLyBvcmlnaW5hbCAvIGNsZWFuIOaooeW8j++8muiuqeivkeaWhyB3cmFwcGVyIOmAmui/hyBgcmVwbGFjZVdpdGhgIOebtOaOpeaOpeeuoeWOnyBlbFxuLy8g5ZyoIERPTSDkuK3nmoTmp73kvY3vvIzljp8gZWwg6IqC54K556a75byAIERPTSDmoJHvvIjku4Xkv53lrZjlnKggZWxlbWVudE1hcCDkuK3kvZzkuLrlrZjlgqjvvInjgIJcbi8vIOi/meagtyB3cmFwcGVyIOaLpeacieS4juWOnyBlbCDlrozlhajkuIDoh7TnmoTlhYTlvJ/kvY3nva7vvIzmiYDmnIkgYDpudGgtY2hpbGRgIC9cbi8vIGA6bm90KDpmaXJzdC1jaGlsZClgIC8g55u46YK75YWE5byf6YCJ5oup5Zmo5a+56K+R5paH5LiO5Y6f5paH55qE5Yik5a6a5LiA6Ie077yM6YG/5YWN56uZ54K5XG4vLyBDU1PvvIjlpoIgbWFya2Rvd24g5riy5p+T5bi46KeB55qE44CM6aaW5q615pegIG1hcmdpbi10b3DjgI3vvInlnKjor5HmlofkuIrlpLHmlYjjgIJcbmZ1bmN0aW9uIGFwcGx5T3JpZ2luYWxTdHlsZShlbDogSFRNTEVsZW1lbnQsIHRyYW5zbGF0ZWRUZXh0OiBzdHJpbmcsIGZyYWdtZW50czogRG9jdW1lbnRGcmFnbWVudFtdKTogdm9pZCB7XG4gIGNvbnN0IG9yaWdpbmFsSFRNTCA9IGVsLmlubmVySFRNTDtcbiAgY29uc3Qgd3JhcHBlciA9IGNsb25lQXNXcmFwcGVyKGVsKTtcbiAgd3JhcHBlci5hcHBlbmRDaGlsZChkZWNvZGVJbmxpbmUodHJhbnNsYXRlZFRleHQsIGZyYWdtZW50cykpO1xuICB3cmFwcGVyLmNsYXNzTGlzdC5hZGQoJ3RyYW5zbGF0b3ItZXh0LXdyYXBwZXInKTtcbiAgd3JhcHBlci5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1jbG9uZScsICd0cnVlJyk7XG4gIHdyYXBwZXIuc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0b3ItcHJvY2Vzc2VkJywgJ3RydWUnKTtcblxuICB3cmFwcGVyVG9PcmlnaW5hbC5zZXQod3JhcHBlciwgZWwpO1xuICBlbC5yZXBsYWNlV2l0aCh3cmFwcGVyKTtcblxuICBzdGF0ZS5lbGVtZW50TWFwLnNldChlbCwgeyBvcmlnaW5hbEhUTUwsIHRyYW5zbGF0ZWRUZXh0LCBzdGF0dXM6ICd0cmFuc2xhdGVkJywgY2xvbmVFbDogd3JhcHBlciB9KTtcbn1cblxuZnVuY3Rpb24gYXBwbHlDbGVhblN0eWxlKGVsOiBIVE1MRWxlbWVudCwgdHJhbnNsYXRlZFRleHQ6IHN0cmluZywgZnJhZ21lbnRzOiBEb2N1bWVudEZyYWdtZW50W10pOiB2b2lkIHtcbiAgY29uc3Qgb3JpZ2luYWxIVE1MID0gZWwuaW5uZXJIVE1MO1xuICBjb25zdCB3cmFwcGVyID0gY2xvbmVBc1dyYXBwZXIoZWwpO1xuICB3cmFwcGVyLmFwcGVuZENoaWxkKGRlY29kZUlubGluZSh0cmFuc2xhdGVkVGV4dCwgZnJhZ21lbnRzKSk7XG4gIHdyYXBwZXIuY2xhc3NMaXN0LmFkZCgndHJhbnNsYXRvci1leHQtd3JhcHBlcicpO1xuICB3cmFwcGVyLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdG9yLWNsb25lJywgJ3RydWUnKTtcblxuICB3cmFwcGVyVG9PcmlnaW5hbC5zZXQod3JhcHBlciwgZWwpO1xuICBlbC5yZXBsYWNlV2l0aCh3cmFwcGVyKTtcblxuICBzdGF0ZS5lbGVtZW50TWFwLnNldChlbCwgeyBvcmlnaW5hbEhUTUwsIHRyYW5zbGF0ZWRUZXh0LCBzdGF0dXM6ICd0cmFuc2xhdGVkJywgY2xvbmVFbDogd3JhcHBlciB9KTtcbn1cblxuZnVuY3Rpb24gYXBwbHlCaWxpbmd1YWxTdHlsZShlbDogSFRNTEVsZW1lbnQsIHRyYW5zbGF0ZWRUZXh0OiBzdHJpbmcsIGZyYWdtZW50czogRG9jdW1lbnRGcmFnbWVudFtdKTogdm9pZCB7XG4gIGNvbnN0IG9yaWdpbmFsSFRNTCA9IGVsLmlubmVySFRNTDtcbiAgY29uc3QgYnIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpO1xuICBici5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1icicsICd0cnVlJyk7XG5cbiAgY29uc3Qgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgc3Bhbi5jbGFzc0xpc3QuYWRkKCd0cmFuc2xhdG9yLWV4dC13cmFwcGVyJyk7XG4gIHNwYW4uc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0b3ItYmlsaW5ndWFsJywgJ3RydWUnKTtcbiAgc3Bhbi5kYXRhc2V0LmRpc3BsYXkgPSBpc0Jsb2NrRWxlbWVudChlbCkgPyAnYmxvY2snIDogJ2lubGluZSc7XG4gIHNwYW4uYXBwZW5kQ2hpbGQoZGVjb2RlSW5saW5lKHRyYW5zbGF0ZWRUZXh0LCBmcmFnbWVudHMpKTtcblxuICBlbC5hcHBlbmRDaGlsZChicik7XG4gIGVsLmFwcGVuZENoaWxkKHNwYW4pO1xuICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wcm9jZXNzZWQnLCAndHJ1ZScpO1xuXG4gIHN0YXRlLmVsZW1lbnRNYXAuc2V0KGVsLCB7IG9yaWdpbmFsSFRNTCwgdHJhbnNsYXRlZFRleHQsIHN0YXR1czogJ3RyYW5zbGF0ZWQnIH0pO1xufVxuXG5mdW5jdGlvbiBhcHBseVVuZGVybGluZVN0eWxlKGVsOiBIVE1MRWxlbWVudCwgdHJhbnNsYXRlZFRleHQ6IHN0cmluZywgZnJhZ21lbnRzOiBEb2N1bWVudEZyYWdtZW50W10pOiB2b2lkIHtcbiAgY29uc3Qgb3JpZ2luYWxIVE1MID0gZWwuaW5uZXJIVE1MO1xuICBjb25zdCBvcmlnaW5hbFRleHQgPSBlbC50ZXh0Q29udGVudD8udHJpbSgpID8/ICcnO1xuXG4gIGNvbnN0IHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gIHdyYXBwZXIuY2xhc3NMaXN0LmFkZCgndHJhbnNsYXRvci1leHQtd3JhcHBlcicpO1xuICB3cmFwcGVyLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdG9yLXVuZGVybGluZScsICd0cnVlJyk7XG4gIHdyYXBwZXIudGl0bGUgPSBvcmlnaW5hbFRleHQ7XG4gIHdyYXBwZXIuYXBwZW5kQ2hpbGQoZGVjb2RlSW5saW5lKHRyYW5zbGF0ZWRUZXh0LCBmcmFnbWVudHMpKTtcblxuICBlbC5pbm5lckhUTUwgPSAnJztcbiAgZWwuYXBwZW5kQ2hpbGQod3JhcHBlcik7XG4gIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdG9yLXByb2Nlc3NlZCcsICd0cnVlJyk7XG5cbiAgc3RhdGUuZWxlbWVudE1hcC5zZXQoZWwsIHsgb3JpZ2luYWxIVE1MLCB0cmFuc2xhdGVkVGV4dCwgc3RhdHVzOiAndHJhbnNsYXRlZCcgfSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5VHJhbnNsYXRpb24oZWw6IEhUTUxFbGVtZW50LCB0cmFuc2xhdGVkVGV4dDogc3RyaW5nLCBmcmFnbWVudHM6IERvY3VtZW50RnJhZ21lbnRbXSk6IHZvaWQge1xuICBpZiAoc3RhdGUuZWxlbWVudE1hcC5oYXMoZWwpKSByZXR1cm47XG5cbiAgc3dpdGNoIChzdGF0ZS5zdHlsZSkge1xuICAgIGNhc2UgJ29yaWdpbmFsJzpcbiAgICAgIGFwcGx5T3JpZ2luYWxTdHlsZShlbCwgdHJhbnNsYXRlZFRleHQsIGZyYWdtZW50cyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjbGVhbic6XG4gICAgICBhcHBseUNsZWFuU3R5bGUoZWwsIHRyYW5zbGF0ZWRUZXh0LCBmcmFnbWVudHMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnYmlsaW5ndWFsJzpcbiAgICAgIGFwcGx5QmlsaW5ndWFsU3R5bGUoZWwsIHRyYW5zbGF0ZWRUZXh0LCBmcmFnbWVudHMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndW5kZXJsaW5lJzpcbiAgICAgIGFwcGx5VW5kZXJsaW5lU3R5bGUoZWwsIHRyYW5zbGF0ZWRUZXh0LCBmcmFnbWVudHMpO1xuICAgICAgYnJlYWs7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzdG9yZUVsZW1lbnQoZWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gIGNvbnN0IGVsU3RhdGUgPSBzdGF0ZS5lbGVtZW50TWFwLmdldChlbCk7XG4gIGlmICghZWxTdGF0ZSkgcmV0dXJuO1xuXG4gIHN3aXRjaCAoc3RhdGUuc3R5bGUpIHtcbiAgICBjYXNlICdvcmlnaW5hbCc6XG4gICAgY2FzZSAnY2xlYW4nOiB7XG4gICAgICBjb25zdCB3cmFwcGVyID0gZWxTdGF0ZS5jbG9uZUVsO1xuICAgICAgaWYgKHdyYXBwZXIgJiYgd3JhcHBlci5wYXJlbnROb2RlKSB7XG4gICAgICAgIHdyYXBwZXIucmVwbGFjZVdpdGgoZWwpO1xuICAgICAgICB3cmFwcGVyVG9PcmlnaW5hbC5kZWxldGUod3JhcHBlcik7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSAnYmlsaW5ndWFsJzoge1xuICAgICAgZWwuaW5uZXJIVE1MID0gZWxTdGF0ZS5vcmlnaW5hbEhUTUw7XG4gICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wcm9jZXNzZWQnKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjYXNlICd1bmRlcmxpbmUnOiB7XG4gICAgICBlbC5pbm5lckhUTUwgPSBlbFN0YXRlLm9yaWdpbmFsSFRNTDtcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS10cmFuc2xhdG9yLXByb2Nlc3NlZCcpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUuZWxlbWVudE1hcC5kZWxldGUoZWwpO1xufVxuXG5mdW5jdGlvbiByZXN0b3JlQWxsKCk6IHZvaWQge1xuICAvLyByZXN0b3JlRWxlbWVudCDlnKjlvqrnjq/kuK3kvJrkv67mlLkgZWxlbWVudE1hcO+8jOWFiOW/q+eFpyBrZXlzIOmBv+WFjei/reS7o+S4reWPmOabtOOAglxuICBjb25zdCBrZXlzID0gQXJyYXkuZnJvbShzdGF0ZS5lbGVtZW50TWFwLmtleXMoKSk7XG4gIGZvciAoY29uc3QgZWwgb2Yga2V5cykgcmVzdG9yZUVsZW1lbnQoZWwpO1xuICAvLyByZXN0b3JlRWxlbWVudCDlt7LpgJDkuKogZGVsZXRl77yb5pyA57uIIGNsZWFyIOaYr+WGl+S9meS9huaXoOWJr+S9nOeUqO+8jOS9nOmYsuW+oeS/neeVmeOAglxuICBzdGF0ZS5lbGVtZW50TWFwLmNsZWFyKCk7XG59XG5cbi8vIOiKgueCue+8iOaIluWFtuWtkOagke+8ieemu+W8gCBET00g5pe25Li75Yqo5LuOIGVsZW1lbnRNYXAg5riF55CG5a+55bqUIGVudHJ544CCXG4vLyBlbGVtZW50TWFwIOW8uuW8leeUqCBIVE1MRWxlbWVudO+8jOe8uuWwkei/meadoeS4u+WKqOWbnuaUtui3r+W+hOaXtumVv+S8muivneWNlSBUYWIg5Lya5oyB57ut57Sv56ev44CCXG4vL1xuLy8g5YWz6ZSu57qm5p2f77yaXG4vLyAgIC0gYmlsaW5ndWFsIC8gdW5kZXJsaW5lIOaooeW8j++8mmVsZW1lbnRNYXAg55qEIGtleSDmmK/ljp8gZWzvvIzku43lnKggRE9NIOagkeWGhe+8m1xuLy8gICAgIOermeeCueenu+mZpOiKgueCueaXtiByZW1vdmVkTm9kZXMg55u05o6l5YyF5ZCrIGtlee+8jOWRveS4rSBgaW5CeUtleWAg6Lev5b6E44CCXG4vLyAgIC0gb3JpZ2luYWwgLyBjbGVhbiDmqKHlvI/vvJprZXnvvIjljp8gZWzvvInlt7LnprvlvIAgRE9N77yMRE9NIOanveS9jeeUsSBjbG9uZUVsKHdyYXBwZXIpIOWNoOaNruOAglxuLy8gICAgIOermeeCueenu+mZpOeahCByb290IOWMheWQq+eahOaYryB3cmFwcGVyIOiAjOmdnuWOnyBlbO+8jOW/hemhu+mineWkluajgOafpSBgY2xvbmVFbGDjgIJcbi8vXG4vLyDlnKggZGV0YWNoZWQgc3VidHJlZSDkuIogYE5vZGUuY29udGFpbnNgIOS7jeato+ehruWIpOWumueItuWtkOWFs+ezu+OAglxuZnVuY3Rpb24gY2xlYW51cFJlbW92ZWRTdWJ0cmVlKHJvb3Q6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gIGNvbnN0IHZpY3RpbXM6IEhUTUxFbGVtZW50W10gPSBbXTtcbiAgc3RhdGUuZWxlbWVudE1hcC5mb3JFYWNoKChlbnRyeSwga2V5KSA9PiB7XG4gICAgY29uc3QgaW5CeUtleSA9IGtleSA9PT0gcm9vdCB8fCByb290LmNvbnRhaW5zKGtleSk7XG4gICAgY29uc3QgaW5CeUNsb25lID1cbiAgICAgIGVudHJ5LmNsb25lRWwgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgKGVudHJ5LmNsb25lRWwgPT09IHJvb3QgfHwgcm9vdC5jb250YWlucyhlbnRyeS5jbG9uZUVsKSk7XG4gICAgaWYgKGluQnlLZXkgfHwgaW5CeUNsb25lKSB2aWN0aW1zLnB1c2goa2V5KTtcbiAgfSk7XG4gIGZvciAoY29uc3QgZWwgb2YgdmljdGltcykge1xuICAgIHN0YXRlLmVsZW1lbnRNYXAuZGVsZXRlKGVsKTtcbiAgICBzdGF0ZS5vYnNlcnZlcj8udW5vYnNlcnZlKGVsKTtcbiAgICBzdGF0ZS5wZW5kaW5nQWdncmVnYXRlRWxlbWVudHMuZGVsZXRlKGVsKTtcbiAgfVxufVxuXG4vLyDilIDilIDilIAgVHJhbnNsYXRpb24gTG9naWMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmFzeW5jIGZ1bmN0aW9uIHRyYW5zbGF0ZVNpbmdsZUVsZW1lbnQoZWw6IEhUTUxFbGVtZW50LCBmb3JjZSA9IGZhbHNlKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghZm9yY2UgJiYgc3RhdGUuZWxlbWVudE1hcC5oYXMoZWwpKSByZXR1cm47XG4gIGlmIChlbC5oYXNBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJykpIHJldHVybjtcblxuICBjb25zdCByYXdUZXh0ID0gZWwudGV4dENvbnRlbnQ/LnRyaW0oKTtcbiAgaWYgKCFyYXdUZXh0IHx8IHJhd1RleHQubGVuZ3RoIDwgNSkgcmV0dXJuO1xuXG4gIGNvbnN0IHsgcGxhY2Vob2xkZXJUZXh0LCBmcmFnbWVudHMgfSA9IGVuY29kZUlubGluZShlbCk7XG4gIGlmICghcGxhY2Vob2xkZXJUZXh0KSByZXR1cm47XG5cbiAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0b3ItcGVuZGluZycsICd0cnVlJyk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXRlY3RSZXN1bHQgPSBhd2FpdCBzZW5kQmdNZXNzYWdlPHsgbGFuZzogc3RyaW5nIHwgbnVsbCB9Pih7XG4gICAgICB0eXBlOiAnREVURUNUX0xBTkcnLFxuICAgICAgcGF5bG9hZDogeyB0ZXh0OiByYXdUZXh0IH0sXG4gICAgfSk7XG4gICAgY29uc3QgZGV0ZWN0ZWRMYW5nID0gZGV0ZWN0UmVzdWx0Lmxhbmc7XG5cbiAgICBpZiAoZGV0ZWN0ZWRMYW5nICYmIHNob3VsZFNraXBUcmFuc2xhdGlvbihkZXRlY3RlZExhbmcsIHN0YXRlLm5hdGl2ZUxhbmd1YWdlKSkge1xuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXRyYW5zbGF0b3ItcGVuZGluZycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlbmRCZ01lc3NhZ2U8VHJhbnNsYXRpb25SZXNwb25zZT4oe1xuICAgICAgdHlwZTogJ1RSQU5TTEFURScsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIHRleHQ6IHBsYWNlaG9sZGVyVGV4dCxcbiAgICAgICAgc291cmNlTGFuZzogZGV0ZWN0ZWRMYW5nIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgdGFyZ2V0TGFuZzogc3RhdGUudGFyZ2V0TGFuZyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJyk7XG4gICAgYXBwbHlUcmFuc2xhdGlvbihlbCwgcmVzdWx0LnRleHQsIGZyYWdtZW50cyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignVHJhbnNsYXRpb24gZmFpbGVkOicsIGVycm9yKTtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJyk7XG4gICAgc3RhdGUuZWxlbWVudE1hcC5zZXQoZWwsIHtcbiAgICAgIG9yaWdpbmFsSFRNTDogZWwuaW5uZXJIVE1MLFxuICAgICAgdHJhbnNsYXRlZFRleHQ6ICcnLFxuICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgIH0pO1xuICB9XG59XG5cbi8vIOKUgOKUgOKUgCBBZ2dyZWdhdGUgVHJhbnNsYXRpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmZ1bmN0aW9uIGNyZWF0ZUJhdGNoZXMoZWxlbWVudHM6IEhUTUxFbGVtZW50W10pOiBIVE1MRWxlbWVudFtdW10ge1xuICBjb25zdCBiYXRjaGVzOiBIVE1MRWxlbWVudFtdW10gPSBbXTtcbiAgbGV0IGN1cnJlbnRCYXRjaDogSFRNTEVsZW1lbnRbXSA9IFtdO1xuICBsZXQgY3VycmVudExlbmd0aCA9IDA7XG5cbiAgZm9yIChjb25zdCBlbCBvZiBlbGVtZW50cykge1xuICAgIGNvbnN0IHRleHQgPSBlbC50ZXh0Q29udGVudD8udHJpbSgpIHx8ICcnO1xuICAgIGlmICghdGV4dCkgY29udGludWU7XG5cbiAgICBjb25zdCB3b3VsZEV4Y2VlZFBhcmFncmFwaHMgPSBjdXJyZW50QmF0Y2gubGVuZ3RoID49IHN0YXRlLmFnZ3JlZ2F0ZS5tYXhQYXJhZ3JhcGhzUGVyUmVxdWVzdDtcbiAgICBjb25zdCB3b3VsZEV4Y2VlZExlbmd0aCA9IGN1cnJlbnRMZW5ndGggKyB0ZXh0Lmxlbmd0aCA+IHN0YXRlLmFnZ3JlZ2F0ZS5tYXhUZXh0TGVuZ3RoUGVyUmVxdWVzdDtcblxuICAgIGlmICh3b3VsZEV4Y2VlZFBhcmFncmFwaHMgfHwgd291bGRFeGNlZWRMZW5ndGgpIHtcbiAgICAgIGlmIChjdXJyZW50QmF0Y2gubGVuZ3RoID4gMCkge1xuICAgICAgICBiYXRjaGVzLnB1c2goY3VycmVudEJhdGNoKTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRCYXRjaCA9IFtlbF07XG4gICAgICBjdXJyZW50TGVuZ3RoID0gdGV4dC5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnRCYXRjaC5wdXNoKGVsKTtcbiAgICAgIGN1cnJlbnRMZW5ndGggKz0gdGV4dC5sZW5ndGg7XG4gICAgfVxuICB9XG5cbiAgaWYgKGN1cnJlbnRCYXRjaC5sZW5ndGggPiAwKSB7XG4gICAgYmF0Y2hlcy5wdXNoKGN1cnJlbnRCYXRjaCk7XG4gIH1cblxuICByZXR1cm4gYmF0Y2hlcztcbn1cblxuYXN5bmMgZnVuY3Rpb24gdHJhbnNsYXRlQmF0Y2hXaXRoRmFsbGJhY2soYmF0Y2g6IEhUTUxFbGVtZW50W10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgcGxhY2Vob2xkZXJUZXh0czogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZnJhZ21lbnRzTGlzdDogRG9jdW1lbnRGcmFnbWVudFtdW10gPSBbXTtcbiAgY29uc3QgdmFsaWRFbGVtZW50czogSFRNTEVsZW1lbnRbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZWwgb2YgYmF0Y2gpIHtcbiAgICBjb25zdCByYXdUZXh0ID0gZWwudGV4dENvbnRlbnQ/LnRyaW0oKTtcbiAgICBpZiAoIXJhd1RleHQgfHwgcmF3VGV4dC5sZW5ndGggPCA1KSBjb250aW51ZTtcbiAgICBjb25zdCBlbmNvZGVkID0gZW5jb2RlSW5saW5lKGVsKTtcbiAgICBpZiAoIWVuY29kZWQucGxhY2Vob2xkZXJUZXh0KSBjb250aW51ZTtcbiAgICBwbGFjZWhvbGRlclRleHRzLnB1c2goZW5jb2RlZC5wbGFjZWhvbGRlclRleHQpO1xuICAgIGZyYWdtZW50c0xpc3QucHVzaChlbmNvZGVkLmZyYWdtZW50cyk7XG4gICAgdmFsaWRFbGVtZW50cy5wdXNoKGVsKTtcbiAgfVxuXG4gIGlmICh2YWxpZEVsZW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gIGNvbnN0IGV4cGVjdGVkID0gdmFsaWRFbGVtZW50cy5sZW5ndGg7XG4gIHZhbGlkRWxlbWVudHMuZm9yRWFjaChlbCA9PiBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJywgJ3RydWUnKSk7XG5cbiAgY29uc3QgY2xlYXJQZW5kaW5nID0gKCkgPT4ge1xuICAgIHZhbGlkRWxlbWVudHMuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJykpO1xuICB9O1xuXG4gIGNvbnN0IGZ1bGxGYWxsYmFjayA9IGFzeW5jICgpID0+IHtcbiAgICBjbGVhclBlbmRpbmcoKTtcbiAgICBjb25zdCB0YXNrcyA9IHZhbGlkRWxlbWVudHMubWFwKGVsID0+ICgpID0+IHRyYW5zbGF0ZVNpbmdsZUVsZW1lbnQoZWwsIHRydWUpKTtcbiAgICBhd2FpdCBsaW1pdENvbmN1cnJlbmN5KHRhc2tzLCBzdGF0ZS5hZ2dyZWdhdGUubWF4Q29uY3VycmVudFJlcXVlc3RzKTtcbiAgfTtcblxuICB0cnkge1xuICAgIGNvbnN0IGNvbWJpbmVkVGV4dCA9IGVuY29kZUJhdGNoKFxuICAgICAgcGxhY2Vob2xkZXJUZXh0cy5tYXAoKHRleHQsIGlkeCkgPT4gKHsgaWQ6IGlkeCArIDEsIHRleHQgfSkpXG4gICAgKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlbmRCZ01lc3NhZ2U8VHJhbnNsYXRpb25SZXNwb25zZT4oe1xuICAgICAgdHlwZTogJ1RSQU5TTEFURScsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIHRleHQ6IGNvbWJpbmVkVGV4dCxcbiAgICAgICAgdGFyZ2V0TGFuZzogc3RhdGUudGFyZ2V0TGFuZyxcbiAgICAgICAgaXNBZ2dyZWdhdGU6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgeyB0cmFuc2xhdGlvbnMsIG1pc3NpbmcsIGR1cGxpY2F0ZWQgfSA9IGRlY29kZUJhdGNoKHJlc3VsdC50ZXh0LCBleHBlY3RlZCk7XG5cbiAgICBjb25zdCBwcm90b2NvbEZhaWxlZCA9XG4gICAgICB0cmFuc2xhdGlvbnMuc2l6ZSA9PT0gMCB8fCBtaXNzaW5nLmxlbmd0aCA+PSBNYXRoLmNlaWwoZXhwZWN0ZWQgLyAyKTtcblxuICAgIGlmIChwcm90b2NvbEZhaWxlZCkge1xuICAgICAgY29uc29sZS53YXJuKCdCYXRjaCBwcm90b2NvbCBmYWlsZWQsIGZ1bGwgZmFsbGJhY2snLCB7XG4gICAgICAgIGV4cGVjdGVkLFxuICAgICAgICBnb3Q6IHRyYW5zbGF0aW9ucy5zaXplLFxuICAgICAgICBtaXNzaW5nLFxuICAgICAgICBkdXBsaWNhdGVkLFxuICAgICAgfSk7XG4gICAgICBhd2FpdCBmdWxsRmFsbGJhY2soKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobWlzc2luZy5sZW5ndGggPiAwIHx8IGR1cGxpY2F0ZWQubGVuZ3RoID4gMCkge1xuICAgICAgY29uc29sZS53YXJuKCdCYXRjaCBwcm90b2NvbCBwYXJ0aWFsIG1pc21hdGNoLCByZXRyeWluZyBtaXNzaW5nIG9ubHknLCB7XG4gICAgICAgIGV4cGVjdGVkLFxuICAgICAgICBtaXNzaW5nLFxuICAgICAgICBkdXBsaWNhdGVkLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmV0cnlFbGVtZW50czogSFRNTEVsZW1lbnRbXSA9IFtdO1xuICAgIHZhbGlkRWxlbWVudHMuZm9yRWFjaCgoZWwsIGluZGV4KSA9PiB7XG4gICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJyk7XG4gICAgICBjb25zdCB0cmFuc2xhdGVkID0gdHJhbnNsYXRpb25zLmdldChpbmRleCArIDEpO1xuICAgICAgaWYgKHRyYW5zbGF0ZWQpIHtcbiAgICAgICAgYXBwbHlUcmFuc2xhdGlvbihlbCwgdHJhbnNsYXRlZCwgZnJhZ21lbnRzTGlzdFtpbmRleF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0cnlFbGVtZW50cy5wdXNoKGVsKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChyZXRyeUVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHRhc2tzID0gcmV0cnlFbGVtZW50cy5tYXAoZWwgPT4gKCkgPT4gdHJhbnNsYXRlU2luZ2xlRWxlbWVudChlbCwgdHJ1ZSkpO1xuICAgICAgYXdhaXQgbGltaXRDb25jdXJyZW5jeSh0YXNrcywgc3RhdGUuYWdncmVnYXRlLm1heENvbmN1cnJlbnRSZXF1ZXN0cyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUud2FybignQWdncmVnYXRlIHRyYW5zbGF0aW9uIGZhaWxlZCwgZmFsbGluZyBiYWNrIHRvIHNpbmdsZTonLCBlcnJvcik7XG4gICAgYXdhaXQgZnVsbEZhbGxiYWNrKCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbGltaXRDb25jdXJyZW5jeTxUPih0YXNrczogKCgpID0+IFByb21pc2U8VD4pW10sIGxpbWl0OiBudW1iZXIpOiBQcm9taXNlPFRbXT4ge1xuICBjb25zdCByZXN1bHRzOiAoVCB8IHVuZGVmaW5lZClbXSA9IG5ldyBBcnJheSh0YXNrcy5sZW5ndGgpO1xuICBsZXQgaW5kZXggPSAwO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHdvcmtlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB3aGlsZSAoaW5kZXggPCB0YXNrcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGkgPSBpbmRleCsrO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0c1tpXSA9IGF3YWl0IHRhc2tzW2ldKCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBJbmRpdmlkdWFsIHRhc2sgZXJyb3JzIHNob3VsZCBiZSBoYW5kbGVkIGluc2lkZSB0aGUgdGFza1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUYXNrIGVycm9yOicsIGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCB3b3JrZXJzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogTWF0aC5taW4obGltaXQsIHRhc2tzLmxlbmd0aCkgfSwgKCkgPT4gd29ya2VyKCkpO1xuICBhd2FpdCBQcm9taXNlLmFsbCh3b3JrZXJzKTtcbiAgcmV0dXJuIHJlc3VsdHMgYXMgVFtdO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmbHVzaEFnZ3JlZ2F0ZVF1ZXVlKCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoc3RhdGUucGVuZGluZ0FnZ3JlZ2F0ZUVsZW1lbnRzLnNpemUgPT09IDApIHJldHVybjtcblxuICBjb25zdCBlbGVtZW50cyA9IEFycmF5LmZyb20oc3RhdGUucGVuZGluZ0FnZ3JlZ2F0ZUVsZW1lbnRzKTtcbiAgc3RhdGUucGVuZGluZ0FnZ3JlZ2F0ZUVsZW1lbnRzLmNsZWFyKCk7XG5cbiAgLy8gRmlsdGVyIG91dCBhbHJlYWR5IHRyYW5zbGF0ZWQgb3IgcGVuZGluZyBlbGVtZW50c1xuICBjb25zdCBlbGlnaWJsZSA9IGVsZW1lbnRzLmZpbHRlcihlbCA9PiB7XG4gICAgaWYgKHN0YXRlLmVsZW1lbnRNYXAuaGFzKGVsKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChlbC5oYXNBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJykpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgaWYgKGVsaWdpYmxlLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gIGNvbnN0IGJhdGNoZXMgPSBjcmVhdGVCYXRjaGVzKGVsaWdpYmxlKTtcbiAgY29uc3QgdGFza3MgPSBiYXRjaGVzLm1hcChiYXRjaCA9PiAoKSA9PiB0cmFuc2xhdGVCYXRjaFdpdGhGYWxsYmFjayhiYXRjaCkpO1xuXG4gIGF3YWl0IGxpbWl0Q29uY3VycmVuY3kodGFza3MsIHN0YXRlLmFnZ3JlZ2F0ZS5tYXhDb25jdXJyZW50UmVxdWVzdHMpO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZUFnZ3JlZ2F0ZUZsdXNoKCk6IHZvaWQge1xuICBpZiAoc3RhdGUuYWdncmVnYXRlRGVib3VuY2VUaW1lcikge1xuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQoc3RhdGUuYWdncmVnYXRlRGVib3VuY2VUaW1lcik7XG4gIH1cbiAgc3RhdGUuYWdncmVnYXRlRGVib3VuY2VUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICBzdGF0ZS5hZ2dyZWdhdGVEZWJvdW5jZVRpbWVyID0gbnVsbDtcbiAgICBmbHVzaEFnZ3JlZ2F0ZVF1ZXVlKCk7XG4gIH0sIDMwMCk7XG59XG5cbi8vIOKUgOKUgOKUgCBJbnRlcnNlY3Rpb24gT2JzZXJ2ZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmZ1bmN0aW9uIGNyZWF0ZU9ic2VydmVyKCk6IEludGVyc2VjdGlvbk9ic2VydmVyIHtcbiAgY29uc3QgcGVuZGluZyA9IG5ldyBTZXQ8SFRNTEVsZW1lbnQ+KCk7XG5cbiAgcmV0dXJuIG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xuICAgIGVudHJpZXMuZm9yRWFjaCgoZW50cnkpID0+IHtcbiAgICAgIGNvbnN0IGVsID0gZW50cnkudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xuICAgICAgaWYgKCFlbnRyeS5pc0ludGVyc2VjdGluZykge1xuICAgICAgICBwZW5kaW5nLmRlbGV0ZShlbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChwZW5kaW5nLmhhcyhlbCkpIHJldHVybjtcbiAgICAgIGlmIChzdGF0ZS5lbGVtZW50TWFwLmhhcyhlbCkpIHJldHVybjtcblxuICAgICAgaWYgKHN0YXRlLmFnZ3JlZ2F0ZS5hZ2dyZWdhdGVFbmFibGVkKSB7XG4gICAgICAgIHN0YXRlLnBlbmRpbmdBZ2dyZWdhdGVFbGVtZW50cy5hZGQoZWwpO1xuICAgICAgICBzY2hlZHVsZUFnZ3JlZ2F0ZUZsdXNoKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZW5kaW5nLmFkZChlbCk7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBwZW5kaW5nLmRlbGV0ZShlbCk7XG4gICAgICAgICAgaWYgKHN0YXRlLmVsZW1lbnRNYXAuaGFzKGVsKSkgcmV0dXJuO1xuICAgICAgICAgIGNvbnN0IHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICBjb25zdCB2aXNpYmxlID0gcmVjdC50b3AgPCB3aW5kb3cuaW5uZXJIZWlnaHQgJiYgcmVjdC5ib3R0b20gPiAwO1xuICAgICAgICAgIGlmICh2aXNpYmxlKSB7XG4gICAgICAgICAgICB0cmFuc2xhdGVTaW5nbGVFbGVtZW50KGVsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sIHsgdGhyZXNob2xkOiAwLCByb290TWFyZ2luOiAnMTAwcHgnIH0pO1xufVxuXG5mdW5jdGlvbiBzdGFydFRyYW5zbGF0aW9uKCk6IHZvaWQge1xuICBpZiAoIWlzVmFsaWRQYWdlKCkpIHJldHVybjtcblxuICBjb25zdCBlbGVtZW50cyA9IGdldFRyYW5zbGF0YWJsZUVsZW1lbnRzKCk7XG4gIGlmICghc3RhdGUub2JzZXJ2ZXIpIHtcbiAgICBzdGF0ZS5vYnNlcnZlciA9IGNyZWF0ZU9ic2VydmVyKCk7XG4gIH1cblxuICBlbGVtZW50cy5mb3JFYWNoKChlbCkgPT4ge1xuICAgIHN0YXRlLm9ic2VydmVyIS5vYnNlcnZlKGVsKTtcbiAgfSk7XG5cbiAgLy8gSWYgYWdncmVnYXRlIGlzIGVuYWJsZWQsIGFsc28gaW1tZWRpYXRlbHkgZmx1c2ggYW55IGVsZW1lbnRzIGFscmVhZHkgaW4gdmlld3BvcnRcbiAgaWYgKHN0YXRlLmFnZ3JlZ2F0ZS5hZ2dyZWdhdGVFbmFibGVkKSB7XG4gICAgY29uc3QgdmlzaWJsZUVsZW1lbnRzID0gZWxlbWVudHMuZmlsdGVyKGVsID0+IHtcbiAgICAgIGNvbnN0IHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHJldHVybiByZWN0LnRvcCA8IHdpbmRvdy5pbm5lckhlaWdodCAmJiByZWN0LmJvdHRvbSA+IDA7XG4gICAgfSk7XG4gICAgdmlzaWJsZUVsZW1lbnRzLmZvckVhY2goZWwgPT4gc3RhdGUucGVuZGluZ0FnZ3JlZ2F0ZUVsZW1lbnRzLmFkZChlbCkpO1xuICAgIHNjaGVkdWxlQWdncmVnYXRlRmx1c2goKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9wVHJhbnNsYXRpb24oKTogdm9pZCB7XG4gIHN0YXRlLm9ic2VydmVyPy5kaXNjb25uZWN0KCk7XG4gIHN0YXRlLm9ic2VydmVyID0gbnVsbDtcbiAgcmVzdG9yZUFsbCgpO1xuICBzdGF0ZS5wZW5kaW5nQWdncmVnYXRlRWxlbWVudHMuY2xlYXIoKTtcbiAgaWYgKHN0YXRlLmFnZ3JlZ2F0ZURlYm91bmNlVGltZXIgIT09IG51bGwpIHtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHN0YXRlLmFnZ3JlZ2F0ZURlYm91bmNlVGltZXIpO1xuICAgIHN0YXRlLmFnZ3JlZ2F0ZURlYm91bmNlVGltZXIgPSBudWxsO1xuICB9XG4gIHBlbmRpbmdNdXRhdGlvbk5vZGVzLmNsZWFyKCk7XG4gIGlmIChtdXRhdGlvbkZsdXNoVGltZXIgIT09IG51bGwpIHtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KG11dGF0aW9uRmx1c2hUaW1lcik7XG4gICAgbXV0YXRpb25GbHVzaFRpbWVyID0gbnVsbDtcbiAgfVxufVxuXG4vLyDilIDilIDilIAgSW5wdXQgQm94IFRyYW5zbGF0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuXG5sZXQgc3BhY2VDb3VudCA9IDA7XG5sZXQgaW5wdXREZWJvdW5jZVRpbWVyOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuYXN5bmMgZnVuY3Rpb24gdHJhbnNsYXRlSW5wdXQoZWw6IEhUTUxJbnB1dEVsZW1lbnQgfCBIVE1MVGV4dEFyZWFFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHRleHQgPSBlbC52YWx1ZS50cmltKCk7XG4gIGlmICghdGV4dCB8fCB0ZXh0Lmxlbmd0aCA8IDIpIHJldHVybjtcblxuICB0cnkge1xuICAgIGNvbnN0IGRldGVjdFJlc3VsdCA9IGF3YWl0IHNlbmRCZ01lc3NhZ2U8eyBsYW5nOiBzdHJpbmcgfCBudWxsIH0+KHtcbiAgICAgIHR5cGU6ICdERVRFQ1RfTEFORycsXG4gICAgICBwYXlsb2FkOiB7IHRleHQgfSxcbiAgICB9KTtcbiAgICBjb25zdCBkZXRlY3RlZExhbmcgPSBkZXRlY3RSZXN1bHQubGFuZztcblxuICAgIGlmIChkZXRlY3RlZExhbmcgJiYgc2hvdWxkU2tpcFRyYW5zbGF0aW9uKGRldGVjdGVkTGFuZywgc3RhdGUubmF0aXZlTGFuZ3VhZ2UpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VuZEJnTWVzc2FnZTxUcmFuc2xhdGlvblJlc3BvbnNlPih7XG4gICAgICB0eXBlOiAnVFJBTlNMQVRFJyxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgdGV4dCxcbiAgICAgICAgc291cmNlTGFuZzogZGV0ZWN0ZWRMYW5nIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgdGFyZ2V0TGFuZzogc3RhdGUudGFyZ2V0TGFuZyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBlbC52YWx1ZSA9IHJlc3VsdC50ZXh0O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0lucHV0IHRyYW5zbGF0aW9uIGZhaWxlZDonLCBlcnJvcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0dXBJbnB1dExpc3RlbmVycygpOiB2b2lkIHtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgaWYgKCEodGFyZ2V0IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCkgJiYgISh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MVGV4dEFyZWFFbGVtZW50KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChlLmtleSA9PT0gJyAnKSB7XG4gICAgICBzcGFjZUNvdW50Kys7XG4gICAgICBpZiAoc3BhY2VDb3VudCA+PSAzKSB7XG4gICAgICAgIHNwYWNlQ291bnQgPSAwO1xuICAgICAgICBpZiAoaW5wdXREZWJvdW5jZVRpbWVyKSB3aW5kb3cuY2xlYXJUaW1lb3V0KGlucHV0RGVib3VuY2VUaW1lcik7XG4gICAgICAgIGlucHV0RGVib3VuY2VUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0cmFuc2xhdGVJbnB1dCh0YXJnZXQpO1xuICAgICAgICB9LCAzMDApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZS5rZXkubGVuZ3RoID09PSAxICYmICFlLmN0cmxLZXkgJiYgIWUubWV0YUtleSAmJiAhZS5hbHRLZXkpIHtcbiAgICAgIHNwYWNlQ291bnQgPSAwO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIOKUgOKUgOKUgCBDdHJsK0hvdmVyIFRyYW5zbGF0aW9uIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8g6K6+6K6h77ya5oyJ5L2PIEN0cmwg5oKs5YGc5Y+v57+76K+R5q616JC9IOKGkiDmrrXokL3lh7rnjrDpq5jkuq7vvIzlgZznlZkgMjAwbXMg5ZCO6Kem5Y+R57+76K+R44CCXG4vLyDkuI3opoHmsYLlhYjmjInlv6vmjbfplK7lkK/nlKjmlbTpobXnv7vor5HvvJvpppbmrKHop6blj5Hml7bmjInpnIDmh5LliqDovb3nlKjmiLforr7nva7vvIjmr43or60v5qC35byPL+iBmuWQiOWPguaVsO+8ieOAglxuLy9cbi8vIOinpuWPkeaXtuacuuimhuebluS4pOenjeWnv+WKv++8mlxuLy8gMS4g5YWI5oyJIEN0cmzvvIzlho3np7vliqjliLDmrrXokL0g4oaSIOeUsSBgbW91c2VvdmVyYO+8iOW4piBjdHJsS2V5PXRydWXvvInop6blj5HvvJtcbi8vIDIuIOWFiOaCrOWBnOWcqOauteiQve+8jOWGjeaMieS4iyBDdHJsIOKGkiDnlLEgYGtleWRvd24oJ0NvbnRyb2wnKWAg6YWN5ZCIIG1vdXNlbW92ZVxuLy8gICAg6K6w5b2V55qE5pyA6L+R5Z2Q5qCHICsgYGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnRgIOinpuWPkeOAglxuLy8g5LuF6Z2gIGBtb3VzZW92ZXJgIOS8mua8j+aOieWnv+WKvyAy77yM5Zug5Li65oyJ6ZSu5LiN5Lya6YeN5Y+RIG1vdXNlb3ZlcuOAglxuXG5jb25zdCBIT1ZFUl9ISUdITElHSFRfQVRUUiA9ICdkYXRhLXRyYW5zbGF0b3ItaG92ZXItdGFyZ2V0JztcbmNvbnN0IEhPVkVSX0RFQk9VTkNFX01TID0gMjAwO1xuLy8g6auY5Lqu5ZG95Lit5q616JC95Yiw5riF6Zmk55qE5pyA5bCP5oC75pe26ZW/44CC5Y2z5L2/57+76K+R556s6Ze05a6M5oiQ77yM5Lmf5L+d6K+B55So5oi36Iez5bCR55yL5YiwXG4vLyAwLjI1cyDnmoTop4bop4nlj43ppojvvIzpgb/lhY3jgIzmjIkgQ3RybCDlkI7pq5jkuq7kuIDpl6rogIzov4fjgI3nmoTkvZPpqozlibLoo4LjgIJcbmNvbnN0IEhPVkVSX01JTl9WSVNJQkxFX01TID0gMjUwO1xuXG5sZXQgY3RybEhvdmVyU2V0dGluZ3NMb2FkZWQgPSBmYWxzZTtcbmxldCBob3ZlclRhcmdldDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbmxldCBob3ZlclRpbWVyOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbmxldCBsYXN0TW91c2VYID0gLTE7XG5sZXQgbGFzdE1vdXNlWSA9IC0xO1xuLy8g5bGP6JS9IGtleWRvd24g5Zyo5oyJ5L2P5pyf6Ze055qEIGF1dG8tcmVwZWF077ya5LuF5Zyo44CM5p2+5byA5ZCO5YaN5qyh5oyJ5LiL44CN5pe2XG4vLyDop4bkvZzkuIDmrKHmlrDnmoRcIuaMiSBDdHJsXCLkuovku7bvvIzpgb/lhY3mjInkvY/mnJ/pl7TkuI3lgZwgdG9nZ2xl44CCXG5sZXQgY3RybFByZXNzZWQgPSBmYWxzZTtcblxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlQ3RybEhvdmVyU2V0dGluZ3MoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChjdHJsSG92ZXJTZXR0aW5nc0xvYWRlZCB8fCBzdGF0ZS5pc0FjdGl2ZSkgcmV0dXJuO1xuICB0cnkge1xuICAgIGNvbnN0IHsgZ2V0U2V0dGluZ3MgfSA9IGF3YWl0IGltcG9ydCgnQC9saWIvc3RvcmFnZScpO1xuICAgIGNvbnN0IHMgPSBhd2FpdCBnZXRTZXR0aW5ncygpO1xuICAgIHN0YXRlLnN0eWxlID0gcy5kZWZhdWx0U3R5bGU7XG4gICAgc3RhdGUubmF0aXZlTGFuZ3VhZ2UgPSBzLm5hdGl2ZUxhbmd1YWdlO1xuICAgIHN0YXRlLnRhcmdldExhbmcgPSBzLm5hdGl2ZUxhbmd1YWdlO1xuICAgIHN0YXRlLmFnZ3JlZ2F0ZSA9IHtcbiAgICAgIGFnZ3JlZ2F0ZUVuYWJsZWQ6IHMuYWdncmVnYXRlRW5hYmxlZCxcbiAgICAgIG1heFBhcmFncmFwaHNQZXJSZXF1ZXN0OiBzLm1heFBhcmFncmFwaHNQZXJSZXF1ZXN0LFxuICAgICAgbWF4VGV4dExlbmd0aFBlclJlcXVlc3Q6IHMubWF4VGV4dExlbmd0aFBlclJlcXVlc3QsXG4gICAgICBtYXhDb25jdXJyZW50UmVxdWVzdHM6IHMubWF4Q29uY3VycmVudFJlcXVlc3RzLFxuICAgICAgcmVxdWVzdFRpbWVvdXQ6IHMucmVxdWVzdFRpbWVvdXQsXG4gICAgfTtcbiAgICBjdHJsSG92ZXJTZXR0aW5nc0xvYWRlZCA9IHRydWU7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgc2V0dGluZ3MgZm9yIEN0cmwraG92ZXI6JywgZXJyb3IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmROZWFyZXN0VHJhbnNsYXRhYmxlQmxvY2soZWw6IEhUTUxFbGVtZW50IHwgbnVsbCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gIGxldCBjdXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IGVsO1xuICB3aGlsZSAoY3VyKSB7XG4gICAgaWYgKGN1ci5tYXRjaGVzPy4oQkxPQ0tfU0VMRUNUT1IpICYmIGlzVHJhbnNsYXRhYmxlQmxvY2soY3VyKSkgcmV0dXJuIGN1cjtcbiAgICBjdXIgPSBjdXIucGFyZW50RWxlbWVudDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8g5rK/56WW5YWI6ZO+5a+75om+5bey57+76K+R55qE44CM6YC76L6R5q616JC9IGVs44CN77yaXG4vLyAtIG9yaWdpbmFsIC8gY2xlYW4g5qih5byP77ya5Y6fIGVsIOW3suemu+W8gCBET03vvIzpvKDmoIflkb3kuK3nmoTmmK/luKYgYFtkYXRhLXRyYW5zbGF0b3ItY2xvbmVdYFxuLy8gICDnmoQgd3JhcHBlcu+8jOmAmui/hyB3cmFwcGVyVG9PcmlnaW5hbCDlj43mn6XvvJtcbi8vIC0gYmlsaW5ndWFsIC8gdW5kZXJsaW5lIOaooeW8j++8muWOnyBlbCDku43lnKggRE9N77yM5LiU5L2c5Li6IGBzdGF0ZS5lbGVtZW50TWFwYCDnmoQga2V577yMXG4vLyAgIOebtOaOpeWRveS4reWNs+WPr++8iGhvdmVyIOebruagh+WPr+iDveaYr+azqOWFpeeahCBzcGFuL2JyIOWtkOiKgueCue+8ieOAglxuZnVuY3Rpb24gZmluZFRvZ2dsZVRhcmdldCh0YXJnZXQ6IEhUTUxFbGVtZW50IHwgbnVsbCk6IEhUTUxFbGVtZW50IHwgbnVsbCB7XG4gIGxldCBjdXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IHRhcmdldDtcbiAgd2hpbGUgKGN1cikge1xuICAgIGlmIChjdXIuZGF0YXNldD8udHJhbnNsYXRvckNsb25lID09PSAndHJ1ZScpIHtcbiAgICAgIHJldHVybiB3cmFwcGVyVG9PcmlnaW5hbC5nZXQoY3VyKSA/PyBudWxsO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuZWxlbWVudE1hcC5oYXMoY3VyKSkgcmV0dXJuIGN1cjtcbiAgICBjdXIgPSBjdXIucGFyZW50RWxlbWVudDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8g5ZG95Lit5bey57+76K+R55uu5qCH5pe25ZCM5q2l5oGi5aSN5Y6f5paH77yM6L+U5Zue5piv5ZCm5bey5aSE55CG44CCXG5mdW5jdGlvbiB0cnlUb2dnbGVSZXN0b3JlKHRhcmdldDogSFRNTEVsZW1lbnQgfCBudWxsKTogYm9vbGVhbiB7XG4gIGNvbnN0IHRvZ2dsZUVsID0gZmluZFRvZ2dsZVRhcmdldCh0YXJnZXQpO1xuICBpZiAoIXRvZ2dsZUVsIHx8ICFzdGF0ZS5lbGVtZW50TWFwLmhhcyh0b2dnbGVFbCkpIHJldHVybiBmYWxzZTtcbiAgLy8g6Iul5b2T5YmNIGhvdmVyIOWAmemAieaBsOWlveaYr+imgeaBouWkjeeahOebruagh++8jOWFiOa4heaOiemYsuaKlumYtuauteeahOmrmOS6riAvIOiuoeaXtuWZqO+8jFxuICAvLyDpgb/lhY3mgaLlpI3lkI7mrovnlZkgYFtkYXRhLXRyYW5zbGF0b3ItaG92ZXItdGFyZ2V0XWAg5qC35byP5oiW5ZCO57ut6K+v6Kem5Y+R57+76K+R44CCXG4gIGlmIChob3ZlclRhcmdldCA9PT0gdG9nZ2xlRWwpIGNhbmNlbEhvdmVyRGVib3VuY2UoKTtcbiAgcmVzdG9yZUVsZW1lbnQodG9nZ2xlRWwpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8g5LuF5Y+W5raI44CM6Ziy5oqW6Zi25q6144CN55qE6auY5Lqu5ZKM6K6h5pe25Zmo77yIaG92ZXJUaW1lciAhPSBudWxsIOaXtu+8ieOAglxuLy8g5LiA5pem6K6h5pe25Zmo5Zue6LCD5beyIGZpcmUg6L+b5YWl57+76K+R6Zi25q6177yIaG92ZXJUaW1lciA9PSBudWxs77yJ77yM5LiN5YaN5YGa5Lu75L2V5riF55CG77yaXG4vLyDpq5jkuq7kuI4gaG92ZXJUYXJnZXQg55qE5riF6Zmk5a6M5YWo5Lqk55Sx57+76K+R5a6M5oiQ5Zue6LCD55qEIGZpbmFsbHkg5YiG5pSv5o6l566h77yM56Gu5L+dXG4vLyDjgIxDdHJsIOefreaMieWNs+advuW8gOOAjeS5n+iDveWujOaIkOe/u+ivke+8jOS4lOe/u+ivkeacn+mXtOmrmOS6ruS4jeS8muiiqyBrZXl1cCAvIG1vdXNlb3V0IOS4reaWreOAglxuZnVuY3Rpb24gY2FuY2VsSG92ZXJEZWJvdW5jZSgpOiB2b2lkIHtcbiAgaWYgKGhvdmVyVGltZXIgPT09IG51bGwpIHJldHVybjtcbiAgaWYgKGhvdmVyVGFyZ2V0KSB7XG4gICAgaG92ZXJUYXJnZXQucmVtb3ZlQXR0cmlidXRlKEhPVkVSX0hJR0hMSUdIVF9BVFRSKTtcbiAgICBob3ZlclRhcmdldCA9IG51bGw7XG4gIH1cbiAgd2luZG93LmNsZWFyVGltZW91dChob3ZlclRpbWVyKTtcbiAgaG92ZXJUaW1lciA9IG51bGw7XG59XG5cbmZ1bmN0aW9uIHRyeVN0YXJ0SG92ZXJGb3IodGFyZ2V0OiBIVE1MRWxlbWVudCB8IG51bGwpOiB2b2lkIHtcbiAgaWYgKCF0YXJnZXQpIHJldHVybjtcbiAgY29uc3QgcGFyYWdyYXBoID0gZmluZE5lYXJlc3RUcmFuc2xhdGFibGVCbG9jayh0YXJnZXQpO1xuICBpZiAoIXBhcmFncmFwaCkge1xuICAgIGNhbmNlbEhvdmVyRGVib3VuY2UoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHN0YXRlLmVsZW1lbnRNYXAuaGFzKHBhcmFncmFwaCkpIHJldHVybjtcbiAgaWYgKHBhcmFncmFwaC5oYXNBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJykpIHJldHVybjtcbiAgaWYgKGhvdmVyVGFyZ2V0ID09PSBwYXJhZ3JhcGgpIHJldHVybjtcblxuICAvLyDliIfmjaLmrrXokL3ml7bmiorml6flgJnpgInnmoTpq5jkuq4gLyDorqHml7bmuIXmjonjgILov5nph4zkuI3lpI3nlKggY2FuY2VsSG92ZXJEZWJvdW5jZVxuICAvLyDmmK/lm6DkuLrml6cgaG92ZXJUYXJnZXQg5Y+v6IO95q2j5aSE5LqO57+76K+R6Zi25q6177yIaG92ZXJUaW1lciDlt7LkuLogbnVsbO+8ie+8jFxuICAvLyDkvYbnlKjmiLfnmoTpvKDmoIflt7LliIfliLDmlrDmrrXokL3vvIzlupTorqnml6flgJnpgInohLHnprsgaG92ZXIg54q25oCB5py644CCXG4gIC8vIOe/u+ivkeWujOaIkCBmaW5hbGx5IOaYr+W5guetieeahO+8iHJlbW92ZUF0dHJpYnV0ZSArIOavlOi+gyBob3ZlclRhcmdldCDlho3muIXnqbrvvInjgIJcbiAgaWYgKGhvdmVyVGFyZ2V0KSBob3ZlclRhcmdldC5yZW1vdmVBdHRyaWJ1dGUoSE9WRVJfSElHSExJR0hUX0FUVFIpO1xuICBpZiAoaG92ZXJUaW1lciAhPT0gbnVsbCkgd2luZG93LmNsZWFyVGltZW91dChob3ZlclRpbWVyKTtcblxuICBob3ZlclRhcmdldCA9IHBhcmFncmFwaDtcbiAgcGFyYWdyYXBoLnNldEF0dHJpYnV0ZShIT1ZFUl9ISUdITElHSFRfQVRUUiwgJ3RydWUnKTtcbiAgY29uc3Qgc3RhcnRlZEF0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cbiAgaG92ZXJUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICBob3ZlclRpbWVyID0gbnVsbDtcbiAgICBpZiAoaG92ZXJUYXJnZXQgIT09IHBhcmFncmFwaCkgcmV0dXJuO1xuICAgIGlmIChzdGF0ZS5lbGVtZW50TWFwLmhhcyhwYXJhZ3JhcGgpIHx8IHBhcmFncmFwaC5oYXNBdHRyaWJ1dGUoJ2RhdGEtdHJhbnNsYXRvci1wZW5kaW5nJykpIHtcbiAgICAgIHBhcmFncmFwaC5yZW1vdmVBdHRyaWJ1dGUoSE9WRVJfSElHSExJR0hUX0FUVFIpO1xuICAgICAgaWYgKGhvdmVyVGFyZ2V0ID09PSBwYXJhZ3JhcGgpIGhvdmVyVGFyZ2V0ID0gbnVsbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8g6L+b5YWl57+76K+R6Zi25q6177ya5L+d5oyBIGhvdmVyVGFyZ2V0PXBhcmFncmFwaCDkuI7pq5jkuq4gYXR0cmlidXRl77ybY2FuY2VsSG92ZXJEZWJvdW5jZVxuICAgIC8vIOatpOaXtuefrei3r++8iGhvdmVyVGltZXIgPT09IG51bGzvvInvvIxtb3VzZW91dCAvIGtleXVwIC8gYmx1ciDpg73kuI3kvJrmuIXmjonpq5jkuq7jgIJcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZW5zdXJlQ3RybEhvdmVyU2V0dGluZ3MoKTtcbiAgICAgIGF3YWl0IHRyYW5zbGF0ZVNpbmdsZUVsZW1lbnQocGFyYWdyYXBoLCB0cnVlKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY29uc3QgZWxhcHNlZCA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRlZEF0O1xuICAgICAgY29uc3Qgd2FpdCA9IE1hdGgubWF4KDAsIEhPVkVSX01JTl9WSVNJQkxFX01TIC0gZWxhcHNlZCk7XG4gICAgICBpZiAod2FpdCA+IDApIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHdpbmRvdy5zZXRUaW1lb3V0KHJlc29sdmUsIHdhaXQpKTtcbiAgICAgIH1cbiAgICAgIC8vIGJpbGluZ3VhbCAvIHVuZGVybGluZSDmqKHlvI/vvJpwYXJhZ3JhcGgg5LuN5ZyoIERPTe+8jOebtOaOpea4heaOieiHqui6q+WxnuaAp+OAglxuICAgICAgcGFyYWdyYXBoLnJlbW92ZUF0dHJpYnV0ZShIT1ZFUl9ISUdITElHSFRfQVRUUik7XG4gICAgICAvLyBvcmlnaW5hbCAvIGNsZWFuIOaooeW8j++8mnBhcmFncmFwaCDlt7LnprvlvIAgRE9N77yM5L2GIGNsb25lQXNXcmFwcGVyIOmAmui/h1xuICAgICAgLy8gY2xvbmVOb2RlKGZhbHNlKSDmiorpq5jkuq4gYXR0cmlidXRlIOWkjeWItuWIsOS6hiB3cmFwcGVyIOS4iu+8jOmcgOimgeS4u+WKqOS7jlxuICAgICAgLy8gd3JhcHBlciDnp7vpmaTigJTigJTlkKbliJnpq5jkuq7msLjkuYXmrovnlZnlnKggRE9NIOS4re+8iOWboOS4uiBwYXJhZ3JhcGgg5LiK55qEXG4gICAgICAvLyByZW1vdmVBdHRyaWJ1dGUg5L2c55So5Zyo5bey6ISx56a755qE6IqC54K55LiK44CB5a+5IHdyYXBwZXIg5peg5pWI77yJ44CCXG4gICAgICBjb25zdCB3cmFwcGVyID0gc3RhdGUuZWxlbWVudE1hcC5nZXQocGFyYWdyYXBoKT8uY2xvbmVFbDtcbiAgICAgIHdyYXBwZXI/LnJlbW92ZUF0dHJpYnV0ZShIT1ZFUl9ISUdITElHSFRfQVRUUik7XG4gICAgICBpZiAoaG92ZXJUYXJnZXQgPT09IHBhcmFncmFwaCkgaG92ZXJUYXJnZXQgPSBudWxsO1xuICAgIH1cbiAgfSwgSE9WRVJfREVCT1VOQ0VfTVMpO1xufVxuXG5mdW5jdGlvbiBzZXR1cEN0cmxIb3ZlcigpOiB2b2lkIHtcbiAgLy8g5LuF6K6w5b2V6byg5qCH5Z2Q5qCH77yM5L6bIGtleWRvd24g6Lev5b6E55SoIGVsZW1lbnRGcm9tUG9pbnQg5Y+N5p+l5b2T5YmNIGhvdmVyIOebruagh1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCAoZSkgPT4ge1xuICAgIGxhc3RNb3VzZVggPSBlLmNsaWVudFg7XG4gICAgbGFzdE1vdXNlWSA9IGUuY2xpZW50WTtcbiAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3ZlcicsIChlKSA9PiB7XG4gICAgaWYgKCFlLmN0cmxLZXkpIHJldHVybjtcbiAgICB0cnlTdGFydEhvdmVyRm9yKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KTtcbiAgfSk7XG5cbiAgLy8g55So5oi35YWI5oKs5YGc5ZCO5oyJIEN0cmwg55qE5ae/5Yq/77yabW91c2VvdmVyIOS4jeS8muWGjeasoeinpuWPke+8jOmcgOimgSBrZXlkb3duIOWFnOW6leOAglxuICAvLyDlkIzml7bmib/mi4XjgIzlho3mjIkgQ3RybCDmgaLlpI3ljp/mlofjgI3nmoQgdG9nZ2xlIOWFpeWPo++8mlxuICAvLyAgIDEuIOeUqCBgY3RybFByZXNzZWRgIOWxj+iUvSBhdXRvLXJlcGVhdO+8jOehruS/neOAjOadvuW8gOWQjuWGjeasoeaMieS4i+OAjeaJjeinhuS9nOS4gOasoeaMiemUru+8m1xuICAvLyAgIDIuIOWRveS4reW3sue/u+ivkeauteiQve+8iHdyYXBwZXIg5oiW5Y6fIGVs77yJ4oaSIOWQjOatpeaBouWkjeWOn+aWh++8jOS4jei/m+WFpee/u+ivkei3r+W+hO+8m1xuICAvLyAgIDMuIOWQpuWImei1sOWOn+aciee/u+ivkei3r+W+hO+8iGVsZW1lbnRGcm9tUG9pbnQgKyB0cnlTdGFydEhvdmVyRm9y77yJ44CCXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZSkgPT4ge1xuICAgIGlmIChlLmtleSAhPT0gJ0NvbnRyb2wnKSByZXR1cm47XG4gICAgaWYgKGN0cmxQcmVzc2VkIHx8IGUucmVwZWF0KSByZXR1cm47XG4gICAgY3RybFByZXNzZWQgPSB0cnVlO1xuICAgIGlmIChsYXN0TW91c2VYIDwgMCB8fCBsYXN0TW91c2VZIDwgMCkgcmV0dXJuO1xuICAgIGNvbnN0IGVsID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChsYXN0TW91c2VYLCBsYXN0TW91c2VZKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgaWYgKHRyeVRvZ2dsZVJlc3RvcmUoZWwpKSByZXR1cm47XG4gICAgdHJ5U3RhcnRIb3ZlckZvcihlbCk7XG4gIH0pO1xuXG4gIC8vIG1vdXNlb3V0IOS7heWcqOmYsuaKlumYtuaute+8iGhvdmVyVGltZXIgIT0gbnVsbO+8ieWPlua2iOmrmOS6riArIOiuoeaXtu+8m+e/u+ivkeW3siBmaXJlXG4gIC8vIOWQjuS/neaMgemrmOS6ruebtOWIsOe/u+ivkeWujOaIkO+8iGNhbmNlbEhvdmVyRGVib3VuY2Ug5YaF6YOo55+t6Lev77yJ44CCXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgKGUpID0+IHtcbiAgICBpZiAoIWhvdmVyVGFyZ2V0KSByZXR1cm47XG4gICAgY29uc3QgcmVsYXRlZCA9IGUucmVsYXRlZFRhcmdldCBhcyBOb2RlIHwgbnVsbDtcbiAgICBpZiAocmVsYXRlZCAmJiBob3ZlclRhcmdldC5jb250YWlucyhyZWxhdGVkKSkgcmV0dXJuO1xuICAgIGNhbmNlbEhvdmVyRGVib3VuY2UoKTtcbiAgfSk7XG5cbiAgLy8g5LuF5aSN5L2N5oyJ6ZSu54q25oCB5py677yb5LiN5Y+W5raI6Ziy5oqW5Lmf5LiN5riF6auY5Lqu44CCXG4gIC8vIOi/meagt+OAjEN0cmwg55+t5oyJ5Y2z5p2+5byA44CN5Lmf6IO95a6M5oiQIDIwMG1zIOmYsuaKluinpuWPkeeahOe/u+ivke+8jOS4lOe/u+ivkeacn+mXtFxuICAvLyDpq5jkuq7kuI3kvJrooqvmnb7plK7kuK3mlq3vvIzkuI7jgIzlho3mjIkgQ3RybCDmgaLlpI3jgI3nmoQgdG9nZ2xlIOivreS5ieWNj+iwg+OAglxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIChlKSA9PiB7XG4gICAgaWYgKGUua2V5ICE9PSAnQ29udHJvbCcpIHJldHVybjtcbiAgICBjdHJsUHJlc3NlZCA9IGZhbHNlO1xuICB9KTtcblxuICAvLyDnqpflj6PlpLHnhKbop4bkvZznlKjmiLfkuLvliqjnprvlvIDvvIzku43otbDpmLLmipbmnJ/lj5bmtojpgLvovpHjgIJcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCAoKSA9PiB7XG4gICAgY3RybFByZXNzZWQgPSBmYWxzZTtcbiAgICBjYW5jZWxIb3ZlckRlYm91bmNlKCk7XG4gIH0pO1xufVxuXG4vLyDilIDilIDilIAgU1BBIFJvdXRlIENoYW5nZSBEZXRlY3Rpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmZ1bmN0aW9uIGhhbmRsZVJvdXRlQ2hhbmdlKCk6IHZvaWQge1xuICBpZiAoc3RhdGUuaXNBY3RpdmUpIHtcbiAgICBzdG9wVHJhbnNsYXRpb24oKTtcbiAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoc3RhdGUuaXNBY3RpdmUpIHtcbiAgICAgICAgc3RhcnRUcmFuc2xhdGlvbigpO1xuICAgICAgfVxuICAgIH0sIDUwMCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0dXBTUEFEZXRlY3Rpb24oKTogdm9pZCB7XG4gIGNvbnN0IG9yaWdpbmFsUHVzaFN0YXRlID0gaGlzdG9yeS5wdXNoU3RhdGU7XG4gIGNvbnN0IG9yaWdpbmFsUmVwbGFjZVN0YXRlID0gaGlzdG9yeS5yZXBsYWNlU3RhdGU7XG5cbiAgaGlzdG9yeS5wdXNoU3RhdGUgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIG9yaWdpbmFsUHVzaFN0YXRlLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgndHJhbnNsYXRvci1wdXNoc3RhdGUnKSk7XG4gIH07XG5cbiAgaGlzdG9yeS5yZXBsYWNlU3RhdGUgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIG9yaWdpbmFsUmVwbGFjZVN0YXRlLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgndHJhbnNsYXRvci1yZXBsYWNlc3RhdGUnKSk7XG4gIH07XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgaGFuZGxlUm91dGVDaGFuZ2UpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndHJhbnNsYXRvci1wdXNoc3RhdGUnLCBoYW5kbGVSb3V0ZUNoYW5nZSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2xhdG9yLXJlcGxhY2VzdGF0ZScsIGhhbmRsZVJvdXRlQ2hhbmdlKTtcbn1cblxuLy8g4pSA4pSA4pSAIE11dGF0aW9uIE9ic2VydmVyIGZvciBEeW5hbWljIENvbnRlbnQg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmZ1bmN0aW9uIHNjaGVkdWxlTXV0YXRpb25GbHVzaCgpOiB2b2lkIHtcbiAgaWYgKG11dGF0aW9uRmx1c2hUaW1lciAhPT0gbnVsbCkgcmV0dXJuO1xuICBtdXRhdGlvbkZsdXNoVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgbXV0YXRpb25GbHVzaFRpbWVyID0gbnVsbDtcbiAgICBmbHVzaE11dGF0aW9uUXVldWUoKTtcbiAgfSwgTVVUQVRJT05fRkxVU0hfREVMQVlfTVMpO1xufVxuXG5mdW5jdGlvbiBmbHVzaE11dGF0aW9uUXVldWUoKTogdm9pZCB7XG4gIGlmICghc3RhdGUuaXNBY3RpdmUgfHwgIXN0YXRlLm9ic2VydmVyKSB7XG4gICAgcGVuZGluZ011dGF0aW9uTm9kZXMuY2xlYXIoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgbm9kZXMgPSBBcnJheS5mcm9tKHBlbmRpbmdNdXRhdGlvbk5vZGVzKTtcbiAgcGVuZGluZ011dGF0aW9uTm9kZXMuY2xlYXIoKTtcblxuICAvLyDnpZblhYjljrvph43vvJroi6UgQSDljIXlkKsgQiDkuJTpg73lnKjpm4blkIjph4zvvIzku4Xmiavmj48gQeOAglxuICAvLyDlpI3mnYLluqYgTyhuwrIp77yM5Y2V5qyhIGZsdXNoIOiKgueCueaVsOWunua1iyA8IDUwMO+8jOWPr+aOpeWPl++8m1xuICAvLyDoi6Xml6XlkI7ph4/nuqfotoXlh7rvvIzmlLnkuLrmjIkgRE9NIOa3seW6puaOkuW6jyArIFNldCDmoIforrDjgIJcbiAgY29uc3Qgcm9vdHMgPSBub2Rlcy5maWx0ZXIoXG4gICAgKG4pID0+ICFub2Rlcy5zb21lKChtKSA9PiBtICE9PSBuICYmIG0uY29udGFpbnMobikpXG4gICk7XG5cbiAgY29uc3QgbmV3RWxlbWVudHM6IEhUTUxFbGVtZW50W10gPSBbXTtcbiAgZm9yIChjb25zdCByb290IG9mIHJvb3RzKSB7XG4gICAgaWYgKCFyb290LmlzQ29ubmVjdGVkKSBjb250aW51ZTtcbiAgICBuZXdFbGVtZW50cy5wdXNoKC4uLmdldFRyYW5zbGF0YWJsZUVsZW1lbnRzKHJvb3QpKTtcbiAgfVxuICBmb3IgKGNvbnN0IGVsIG9mIG5ld0VsZW1lbnRzKSB7XG4gICAgaWYgKCFzdGF0ZS5lbGVtZW50TWFwLmhhcyhlbCkpIHtcbiAgICAgIHN0YXRlLm9ic2VydmVyLm9ic2VydmUoZWwpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cE11dGF0aW9uT2JzZXJ2ZXIoKTogdm9pZCB7XG4gIGNvbnN0IG11dGF0aW9uT2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG4gICAgaWYgKCFzdGF0ZS5pc0FjdGl2ZSB8fCAhc3RhdGUub2JzZXJ2ZXIpIHJldHVybjtcblxuICAgIC8vIOenu+mZpOi3r+W+hO+8muWunuaXtuaJp+ihjO+8iEdDIOS4jeiDveetieiKgua1ge+8jOazhOa8j+eql+WPo+i2iuefrei2iuWlve+8ieOAglxuICAgIGZvciAoY29uc3QgbSBvZiBtdXRhdGlvbnMpIHtcbiAgICAgIG0ucmVtb3ZlZE5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgICAgaWYgKG5vZGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkgY2xlYW51cFJlbW92ZWRTdWJ0cmVlKG5vZGUpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g5re75Yqg6Lev5b6E77ya5LuF5YWl6ZifICsg6LCD5bqmIGZsdXNo77yM6YG/5YWN5a+55q+P5p2hIG11dGF0aW9uIOWQjOatpei3kVxuICAgIC8vIHF1ZXJ5U2VsZWN0b3JBbGwoQkxPQ0tfU0VMRUNUT1IpICsgZ2V0Q29tcHV0ZWRTdHlsZSDlhZzlupXjgIJcbiAgICBsZXQgYWRkZWQgPSBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IG0gb2YgbXV0YXRpb25zKSB7XG4gICAgICBtLmFkZGVkTm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50ICYmIG5vZGUuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICBwZW5kaW5nTXV0YXRpb25Ob2Rlcy5hZGQobm9kZSk7XG4gICAgICAgICAgYWRkZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGFkZGVkKSBzY2hlZHVsZU11dGF0aW9uRmx1c2goKTtcbiAgfSk7XG5cbiAgbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgY2hpbGRMaXN0OiB0cnVlLCBzdWJ0cmVlOiB0cnVlIH0pO1xufVxuXG4vLyDilIDilIDilIAgVG9nZ2xlIEhhbmRsZXIg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbmFzeW5jIGZ1bmN0aW9uIHRvZ2dsZVRyYW5zbGF0aW9uKCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoc3RhdGUuaXNBY3RpdmUpIHtcbiAgICBzdGF0ZS5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIHN0b3BUcmFuc2xhdGlvbigpO1xuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kQmdNZXNzYWdlKHsgdHlwZTogJ1BJTkcnIH0pLmNhdGNoKCgpID0+IG51bGwpO1xuXG4gICAgICBjb25zdCB7IGdldFNldHRpbmdzIH0gPSBhd2FpdCBpbXBvcnQoJ0AvbGliL3N0b3JhZ2UnKTtcbiAgICAgIGNvbnN0IHMgPSBhd2FpdCBnZXRTZXR0aW5ncygpO1xuXG4gICAgICBzdGF0ZS5zdHlsZSA9IHMuZGVmYXVsdFN0eWxlO1xuICAgICAgc3RhdGUubmF0aXZlTGFuZ3VhZ2UgPSBzLm5hdGl2ZUxhbmd1YWdlO1xuICAgICAgc3RhdGUudGFyZ2V0TGFuZyA9IHMubmF0aXZlTGFuZ3VhZ2U7XG4gICAgICBzdGF0ZS5hZ2dyZWdhdGUgPSB7XG4gICAgICAgIGFnZ3JlZ2F0ZUVuYWJsZWQ6IHMuYWdncmVnYXRlRW5hYmxlZCxcbiAgICAgICAgbWF4UGFyYWdyYXBoc1BlclJlcXVlc3Q6IHMubWF4UGFyYWdyYXBoc1BlclJlcXVlc3QsXG4gICAgICAgIG1heFRleHRMZW5ndGhQZXJSZXF1ZXN0OiBzLm1heFRleHRMZW5ndGhQZXJSZXF1ZXN0LFxuICAgICAgICBtYXhDb25jdXJyZW50UmVxdWVzdHM6IHMubWF4Q29uY3VycmVudFJlcXVlc3RzLFxuICAgICAgICByZXF1ZXN0VGltZW91dDogcy5yZXF1ZXN0VGltZW91dCxcbiAgICAgIH07XG4gICAgICBzdGF0ZS5pc0FjdGl2ZSA9IHRydWU7XG5cbiAgICAgIHN0YXJ0VHJhbnNsYXRpb24oKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHN0YXJ0IHRyYW5zbGF0aW9uOicsIGVycm9yKTtcbiAgICB9XG4gIH1cbn1cblxuLy8g4pSA4pSA4pSAIE1haW4gRW50cnlwb2ludCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFsnPGFsbF91cmxzPiddLFxuICBydW5BdDogJ2RvY3VtZW50X2lkbGUnLFxuICBtYWluKCkge1xuICAgIGlmICghaXNWYWxpZFBhZ2UoKSkgcmV0dXJuO1xuXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlKSA9PiB7XG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnVE9HR0xFX1RSQU5TTEFUSU9OJykge1xuICAgICAgICB0b2dnbGVUcmFuc2xhdGlvbigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2V0dXBJbnB1dExpc3RlbmVycygpO1xuICAgIHNldHVwQ3RybEhvdmVyKCk7XG4gICAgc2V0dXBTUEFEZXRlY3Rpb24oKTtcbiAgICBzZXR1cE11dGF0aW9uT2JzZXJ2ZXIoKTtcblxuICAgIGNvbnNvbGUubG9nKCdUcmFuc2xhdG9yIGNvbnRlbnQgc2NyaXB0IGxvYWRlZCcpO1xuICB9LFxufSk7XG4iLCIvLyNyZWdpb24gc3JjL3V0aWxzL2ludGVybmFsL2xvZ2dlci50c1xuZnVuY3Rpb24gcHJpbnQobWV0aG9kLCAuLi5hcmdzKSB7XG5cdGlmIChpbXBvcnQubWV0YS5lbnYuTU9ERSA9PT0gXCJwcm9kdWN0aW9uXCIpIHJldHVybjtcblx0aWYgKHR5cGVvZiBhcmdzWzBdID09PSBcInN0cmluZ1wiKSBtZXRob2QoYFt3eHRdICR7YXJncy5zaGlmdCgpfWAsIC4uLmFyZ3MpO1xuXHRlbHNlIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xufVxuLyoqIFdyYXBwZXIgYXJvdW5kIGBjb25zb2xlYCB3aXRoIGEgXCJbd3h0XVwiIHByZWZpeCAqL1xuY29uc3QgbG9nZ2VyID0ge1xuXHRkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuXHRsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG5cdHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuXHRlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBsb2dnZXIgfTtcbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgYnJvd3NlciQxIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbi8vI3JlZ2lvbiBzcmMvYnJvd3Nlci50c1xuLyoqXG4qIENvbnRhaW5zIHRoZSBgYnJvd3NlcmAgZXhwb3J0IHdoaWNoIHlvdSBzaG91bGQgdXNlIHRvIGFjY2VzcyB0aGUgZXh0ZW5zaW9uXG4qIEFQSXMgaW4geW91ciBwcm9qZWN0OlxuKlxuKiBgYGB0c1xuKiBpbXBvcnQgeyBicm93c2VyIH0gZnJvbSAnd3h0L2Jyb3dzZXInO1xuKlxuKiBicm93c2VyLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuKiAgIC8vIC4uLlxuKiB9KTtcbiogYGBgXG4qXG4qIEBtb2R1bGUgd3h0L2Jyb3dzZXJcbiovXG5jb25zdCBicm93c2VyID0gYnJvd3NlciQxO1xuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBicm93c2VyIH07XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG4vLyNyZWdpb24gc3JjL3V0aWxzL2ludGVybmFsL2N1c3RvbS1ldmVudHMudHNcbnZhciBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50ID0gY2xhc3MgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCBleHRlbmRzIEV2ZW50IHtcblx0c3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG5cdGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG5cdFx0c3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG5cdFx0dGhpcy5uZXdVcmwgPSBuZXdVcmw7XG5cdFx0dGhpcy5vbGRVcmwgPSBvbGRVcmw7XG5cdH1cbn07XG4vKipcbiogUmV0dXJucyBhbiBldmVudCBuYW1lIHVuaXF1ZSB0byB0aGUgZXh0ZW5zaW9uIGFuZCBjb250ZW50IHNjcmlwdCB0aGF0J3NcbiogcnVubmluZy5cbiovXG5mdW5jdGlvbiBnZXRVbmlxdWVFdmVudE5hbWUoZXZlbnROYW1lKSB7XG5cdHJldHVybiBgJHticm93c2VyPy5ydW50aW1lPy5pZH06JHtpbXBvcnQubWV0YS5lbnYuRU5UUllQT0lOVH06JHtldmVudE5hbWV9YDtcbn1cbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCwgZ2V0VW5pcXVlRXZlbnROYW1lIH07XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci50c1xuY29uc3Qgc3VwcG9ydHNOYXZpZ2F0aW9uQXBpID0gdHlwZW9mIGdsb2JhbFRoaXMubmF2aWdhdGlvbj8uYWRkRXZlbnRMaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiO1xuLyoqXG4qIENyZWF0ZSBhIHV0aWwgdGhhdCB3YXRjaGVzIGZvciBVUkwgY2hhbmdlcywgZGlzcGF0Y2hpbmcgdGhlIGN1c3RvbSBldmVudCB3aGVuXG4qIGRldGVjdGVkLiBTdG9wcyB3YXRjaGluZyB3aGVuIGNvbnRlbnQgc2NyaXB0IGlzIGludmFsaWRhdGVkLiBVc2VzIE5hdmlnYXRpb25cbiogQVBJIHdoZW4gYXZhaWxhYmxlLCBvdGhlcndpc2UgZmFsbHMgYmFjayB0byBwb2xsaW5nLlxuKi9cbmZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcihjdHgpIHtcblx0bGV0IGxhc3RVcmw7XG5cdGxldCB3YXRjaGluZyA9IGZhbHNlO1xuXHRyZXR1cm4geyBydW4oKSB7XG5cdFx0aWYgKHdhdGNoaW5nKSByZXR1cm47XG5cdFx0d2F0Y2hpbmcgPSB0cnVlO1xuXHRcdGxhc3RVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuXHRcdGlmIChzdXBwb3J0c05hdmlnYXRpb25BcGkpIGdsb2JhbFRoaXMubmF2aWdhdGlvbi5hZGRFdmVudExpc3RlbmVyKFwibmF2aWdhdGVcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRjb25zdCBuZXdVcmwgPSBuZXcgVVJMKGV2ZW50LmRlc3RpbmF0aW9uLnVybCk7XG5cdFx0XHRpZiAobmV3VXJsLmhyZWYgPT09IGxhc3RVcmwuaHJlZikgcmV0dXJuO1xuXHRcdFx0d2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBsYXN0VXJsKSk7XG5cdFx0XHRsYXN0VXJsID0gbmV3VXJsO1xuXHRcdH0sIHsgc2lnbmFsOiBjdHguc2lnbmFsIH0pO1xuXHRcdGVsc2UgY3R4LnNldEludGVydmFsKCgpID0+IHtcblx0XHRcdGNvbnN0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG5cdFx0XHRpZiAobmV3VXJsLmhyZWYgIT09IGxhc3RVcmwuaHJlZikge1xuXHRcdFx0XHR3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIGxhc3RVcmwpKTtcblx0XHRcdFx0bGFzdFVybCA9IG5ld1VybDtcblx0XHRcdH1cblx0XHR9LCAxZTMpO1xuXHR9IH07XG59XG4vLyNlbmRyZWdpb25cbmV4cG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9O1xuIiwiaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vaW50ZXJuYWwvY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2ludGVybmFsL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5pbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG4vLyNyZWdpb24gc3JjL3V0aWxzL2NvbnRlbnQtc2NyaXB0LWNvbnRleHQudHNcbi8qKlxuKiBJbXBsZW1lbnRzXG4qIFtgQWJvcnRDb250cm9sbGVyYF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0Fib3J0Q29udHJvbGxlcikuXG4qIFVzZWQgdG8gZGV0ZWN0IGFuZCBzdG9wIGNvbnRlbnQgc2NyaXB0IGNvZGUgd2hlbiB0aGUgc2NyaXB0IGlzIGludmFsaWRhdGVkLlxuKlxuKiBJdCBhbHNvIHByb3ZpZGVzIHNldmVyYWwgdXRpbGl0aWVzIGxpa2UgYGN0eC5zZXRUaW1lb3V0YCBhbmRcbiogYGN0eC5zZXRJbnRlcnZhbGAgdGhhdCBzaG91bGQgYmUgdXNlZCBpbiBjb250ZW50IHNjcmlwdHMgaW5zdGVhZCBvZlxuKiBgd2luZG93LnNldFRpbWVvdXRgIG9yIGB3aW5kb3cuc2V0SW50ZXJ2YWxgLlxuKlxuKiBUbyBjcmVhdGUgY29udGV4dCBmb3IgdGVzdGluZywgeW91IGNhbiB1c2UgdGhlIGNsYXNzJ3MgY29uc3RydWN0b3I6XG4qXG4qIGBgYHRzXG4qIGltcG9ydCB7IENvbnRlbnRTY3JpcHRDb250ZXh0IH0gZnJvbSAnd3h0L3V0aWxzL2NvbnRlbnQtc2NyaXB0cy1jb250ZXh0JztcbipcbiogdGVzdCgnc3RvcmFnZSBsaXN0ZW5lciBzaG91bGQgYmUgcmVtb3ZlZCB3aGVuIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQnLCAoKSA9PiB7XG4qICAgY29uc3QgY3R4ID0gbmV3IENvbnRlbnRTY3JpcHRDb250ZXh0KCd0ZXN0Jyk7XG4qICAgY29uc3QgaXRlbSA9IHN0b3JhZ2UuZGVmaW5lSXRlbSgnbG9jYWw6Y291bnQnLCB7IGRlZmF1bHRWYWx1ZTogMCB9KTtcbiogICBjb25zdCB3YXRjaGVyID0gdmkuZm4oKTtcbipcbiogICBjb25zdCB1bndhdGNoID0gaXRlbS53YXRjaCh3YXRjaGVyKTtcbiogICBjdHgub25JbnZhbGlkYXRlZCh1bndhdGNoKTsgLy8gTGlzdGVuIGZvciBpbnZhbGlkYXRlIGhlcmVcbipcbiogICBhd2FpdCBpdGVtLnNldFZhbHVlKDEpO1xuKiAgIGV4cGVjdCh3YXRjaGVyKS50b0JlQ2FsbGVkVGltZXMoMSk7XG4qICAgZXhwZWN0KHdhdGNoZXIpLnRvQmVDYWxsZWRXaXRoKDEsIDApO1xuKlxuKiAgIGN0eC5ub3RpZnlJbnZhbGlkYXRlZCgpOyAvLyBVc2UgdGhpcyBmdW5jdGlvbiB0byBpbnZhbGlkYXRlIHRoZSBjb250ZXh0XG4qICAgYXdhaXQgaXRlbS5zZXRWYWx1ZSgyKTtcbiogICBleHBlY3Qod2F0Y2hlcikudG9CZUNhbGxlZFRpbWVzKDEpO1xuKiB9KTtcbiogYGBgXG4qL1xudmFyIENvbnRlbnRTY3JpcHRDb250ZXh0ID0gY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuXHRzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIik7XG5cdGlkO1xuXHRhYm9ydENvbnRyb2xsZXI7XG5cdGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcblx0Y29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHR0aGlzLmlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMik7XG5cdFx0dGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG5cdFx0dGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuXHRcdHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG5cdH1cblx0Z2V0IHNpZ25hbCgpIHtcblx0XHRyZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuXHR9XG5cdGFib3J0KHJlYXNvbikge1xuXHRcdHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuXHR9XG5cdGdldCBpc0ludmFsaWQoKSB7XG5cdFx0aWYgKGJyb3dzZXIucnVudGltZT8uaWQgPT0gbnVsbCkgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuXHRcdHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuXHR9XG5cdGdldCBpc1ZhbGlkKCkge1xuXHRcdHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG5cdH1cblx0LyoqXG5cdCogQWRkIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgY29udGVudCBzY3JpcHQncyBjb250ZXh0IGlzXG5cdCogaW52YWxpZGF0ZWQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG5cdCogICBjb25zdCByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyID0gY3R4Lm9uSW52YWxpZGF0ZWQoKCkgPT4ge1xuXHQqICAgICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcblx0KiAgIH0pO1xuXHQqICAgLy8gLi4uXG5cdCogICByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG5cdCpcblx0KiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXIuXG5cdCovXG5cdG9uSW52YWxpZGF0ZWQoY2IpIHtcblx0XHR0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuXHRcdHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuXHR9XG5cdC8qKlxuXHQqIFJldHVybiBhIHByb21pc2UgdGhhdCBuZXZlciByZXNvbHZlcy4gVXNlZnVsIGlmIHlvdSBoYXZlIGFuIGFzeW5jIGZ1bmN0aW9uXG5cdCogdGhhdCBzaG91bGRuJ3QgcnVuIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG5cdCpcblx0KiBAZXhhbXBsZVxuXHQqICAgY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcblx0KiAgICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcblx0KlxuXHQqICAgICAvLyAuLi5cblx0KiAgIH07XG5cdCovXG5cdGJsb2NrKCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgoKSA9PiB7fSk7XG5cdH1cblx0LyoqXG5cdCogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWxcblx0KiB3aGVuIGludmFsaWRhdGVkLlxuXHQqXG5cdCogSW50ZXJ2YWxzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgY2xlYXJJbnRlcnZhbGAgZnVuY3Rpb24uXG5cdCovXG5cdHNldEludGVydmFsKGhhbmRsZXIsIHRpbWVvdXQpIHtcblx0XHRjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcblx0XHRcdGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcblx0XHR9LCB0aW1lb3V0KTtcblx0XHR0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuXHRcdHJldHVybiBpZDtcblx0fVxuXHQvKipcblx0KiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldFRpbWVvdXRgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsXG5cdCogd2hlbiBpbnZhbGlkYXRlZC5cblx0KlxuXHQqIFRpbWVvdXRzIGNhbiBiZSBjbGVhcmVkIGJ5IGNhbGxpbmcgdGhlIG5vcm1hbCBgc2V0VGltZW91dGAgZnVuY3Rpb24uXG5cdCovXG5cdHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuXHRcdGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG5cdFx0fSwgdGltZW91dCk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuXHRcdHJldHVybiBpZDtcblx0fVxuXHQvKipcblx0KiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHNcblx0KiB0aGUgcmVxdWVzdCB3aGVuIGludmFsaWRhdGVkLlxuXHQqXG5cdCogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbEFuaW1hdGlvbkZyYW1lYFxuXHQqIGZ1bmN0aW9uLlxuXHQqL1xuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcblx0XHRjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuXHRcdFx0aWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fSk7XG5cdFx0dGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cdC8qKlxuXHQqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlXG5cdCogcmVxdWVzdCB3aGVuIGludmFsaWRhdGVkLlxuXHQqXG5cdCogQ2FsbGJhY2tzIGNhbiBiZSBjYW5jZWxlZCBieSBjYWxsaW5nIHRoZSBub3JtYWwgYGNhbmNlbElkbGVDYWxsYmFja2Bcblx0KiBmdW5jdGlvbi5cblx0Ki9cblx0cmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuXHRcdGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcblx0XHR9LCBvcHRpb25zKTtcblx0XHR0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG5cdFx0cmV0dXJuIGlkO1xuXHR9XG5cdGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG5cdFx0aWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcblx0XHRcdGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuXHRcdH1cblx0XHR0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKHR5cGUuc3RhcnRzV2l0aChcInd4dDpcIikgPyBnZXRVbmlxdWVFdmVudE5hbWUodHlwZSkgOiB0eXBlLCBoYW5kbGVyLCB7XG5cdFx0XHQuLi5vcHRpb25zLFxuXHRcdFx0c2lnbmFsOiB0aGlzLnNpZ25hbFxuXHRcdH0pO1xuXHR9XG5cdC8qKlxuXHQqIEBpbnRlcm5hbFxuXHQqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuXHQqL1xuXHRub3RpZnlJbnZhbGlkYXRlZCgpIHtcblx0XHR0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcblx0XHRsb2dnZXIuZGVidWcoYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgKTtcblx0fVxuXHRzdG9wT2xkU2NyaXB0cygpIHtcblx0XHRkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsIHsgZGV0YWlsOiB7XG5cdFx0XHRjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcblx0XHRcdG1lc3NhZ2VJZDogdGhpcy5pZFxuXHRcdH0gfSkpO1xuXHRcdHdpbmRvdy5wb3N0TWVzc2FnZSh7XG5cdFx0XHR0eXBlOiBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsXG5cdFx0XHRjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcblx0XHRcdG1lc3NhZ2VJZDogdGhpcy5pZFxuXHRcdH0sIFwiKlwiKTtcblx0fVxuXHR2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcblx0XHRjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGV0YWlsPy5jb250ZW50U2NyaXB0TmFtZSA9PT0gdGhpcy5jb250ZW50U2NyaXB0TmFtZTtcblx0XHRjb25zdCBpc0Zyb21TZWxmID0gZXZlbnQuZGV0YWlsPy5tZXNzYWdlSWQgPT09IHRoaXMuaWQ7XG5cdFx0cmV0dXJuIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgIWlzRnJvbVNlbGY7XG5cdH1cblx0bGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCkge1xuXHRcdGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG5cdFx0XHRpZiAoIShldmVudCBpbnN0YW5jZW9mIEN1c3RvbUV2ZW50KSB8fCAhdGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSByZXR1cm47XG5cdFx0XHR0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG5cdFx0fTtcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSwgY2IpO1xuXHRcdHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSwgY2IpKTtcblx0fVxufTtcbi8vI2VuZHJlZ2lvblxuZXhwb3J0IHsgQ29udGVudFNjcmlwdENvbnRleHQgfTtcbiJdLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwyMSwyMiwyMywyNCwyNSwyNl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Q0FDQSxTQUFTLG9CQUFvQixZQUFZO0FBQ3hDLFNBQU87Ozs7OztBQ0RSLEdBQUMsU0FBVSxNQUFNO0FBQ2IsUUFBSyxlQUFlLE1BQU07R0FDMUIsU0FBUyxTQUFTLE1BQU07QUFDeEIsUUFBSyxX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