// Typescript Utils
declare global {
	// Union: Primordials
	type UnionToIntersection<_Union> =
		(_Union extends any ? (k: _Union) => void : never) extends ((k: infer _Intersection) => void) ? _Intersection : never;
	type UnionLast<_Union> =
		UnionToIntersection<_Union extends any ? () => _Union : never> extends () => (infer R) ? R : never;
	type UnionToTuple<_Union, _Last = UnionLast<_Union>> =
		[_Union] extends [never] ? [] : [...UnionToTuple<Exclude<_Union, _Last>>, _Last];

	// Literal: Primordials
	type LiteralIsString<_Type extends string> =
		string extends _Type ? false : true;
	type LiteralIsNumber<_Type extends number> =
		number extends _Type ? false : true;
	type LiteralIsBoolean<_Type extends boolean> =
		boolean extends _Type ? false : true;
	type LiteralIsAny<_Type> =
		_Type extends string ? LiteralIsString<_Type> :
			_Type extends number ? LiteralIsNumber<_Type> :
				_Type extends boolean ? LiteralIsBoolean<_Type> :
					false;
	type LiteralToWidePlaceholder<_Type> =
		_Type extends string ?
			(LiteralIsString<_Type> extends false ? "[string]" : never) :
			_Type extends number ?
				(LiteralIsNumber<_Type> extends false ? "[number]" : never) :
				_Type extends boolean ?
					(LiteralIsBoolean<_Type> extends false ? "[boolean]" : never) :
					never;
	type LiteralFromWidePlaceholder<_Type> =
		_Type extends "[string]" ? string :
			_Type extends "[number]" ? number :
				_Type extends "[boolean]" ? boolean :
					never;

	// IntegerString: Primordials
	type IntegerStringParse<_IntegerString extends `${number}`> =
		_IntegerString extends `${infer _Number extends number}` ?
			_Number :
			never;
	type IntegerStringSign<_IntegerString extends `${number}`> =
		_IntegerString extends "0" ? "0" :
			_IntegerString extends `-${number}` ? "-" :
				_IntegerString extends `${number}` | `+${number}` ? "+" :
					never;
	type IntegerStringRemoveLeadingZeros<_IntegerString extends `${number}`> =
		_IntegerString extends "0" ?
			"0" :
			_IntegerString extends `0${infer _Rest}` ?
				IntegerStringRemoveLeadingZeros<_Rest> :
				_IntegerString;
	type __IntegerStringIncrement<_IntegerString extends `${number}`> = _IntegerString extends "9" ?
		"01" :
		_IntegerString extends `${infer _Digit extends number}${infer _Rest}` ?
			_Digit extends 9 ?
				`0${__IntegerStringIncrement<_Rest>}` :
				`${[1, 2, 3, 4, 5, 6, 7, 8, 9][_Digit]}${_Rest}` :
			never;
	type __IntegerStringDecrement<_IntegerString extends `${number}`> =
		_IntegerString extends `${infer _Digit extends number}${infer _Rest}` ?
			_Digit extends 0 ?
				`9${__IntegerStringDecrement<_Rest>}` :
				`${[9, 0, 1, 2, 3, 4, 5, 6, 7, 8][_Digit]}${_Rest}` :
			never;
	type IntegerStringIncrement<_IntegerString extends `${number}`> =
		_IntegerString extends "-1" ?
			"0" :
			_IntegerString extends `-${infer _Absolute}` ?
				`-${IntegerStringRemoveLeadingZeros<StringReverse<__IntegerStringDecrement<StringReverse<_Absolute>>>>}` :
				IntegerStringRemoveLeadingZeros<StringReverse<__IntegerStringIncrement<StringReverse<_IntegerString>>>>;
	type IntegerStringDecrement<_IntegerString extends `${number}`> =
		_IntegerString extends "0" ?
			"-1" :
			_IntegerString extends `-${infer _Absolute}` ?
				`-${StringReverse<__IntegerStringIncrement<StringReverse<_Absolute>>>}` :
				IntegerStringRemoveLeadingZeros<StringReverse<__IntegerStringDecrement<StringReverse<_IntegerString>>>>;
	type __IntegerStringSignComparatorTable = {
		"-": { "-": "=", "0": "<", "+": "<" };
		"0": { "-": ">", "0": "=", "+": "<" };
		"+": { "-": ">", "0": ">", "+": "=" };
	};
	type __IntegerStringCompareSign<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		__IntegerStringSignComparatorTable[IntegerStringSign<_IntegerStringA>][IntegerStringSign<_IntegerStringB>] extends ">" ?
			1 :
			__IntegerStringSignComparatorTable[IntegerStringSign<_IntegerStringA>][IntegerStringSign<_IntegerStringB>] extends "<" ?
				-1 :
				0;
	type __IntegerStringDigitComparatorTable = [
		["=", "<", "<", "<", "<", "<", "<", "<", "<", "<"],
		[">", "=", "<", "<", "<", "<", "<", "<", "<", "<"],
		[">", ">", "=", "<", "<", "<", "<", "<", "<", "<"],
		[">", ">", ">", "=", "<", "<", "<", "<", "<", "<"],
		[">", ">", ">", ">", "=", "<", "<", "<", "<", "<"],
		[">", ">", ">", ">", ">", "=", "<", "<", "<", "<"],
		[">", ">", ">", ">", ">", ">", "=", "<", "<", "<"],
		[">", ">", ">", ">", ">", ">", ">", "=", "<", "<"],
		[">", ">", ">", ">", ">", ">", ">", ">", "=", "<"],
		[">", ">", ">", ">", ">", ">", ">", ">", ">", "="]
	];
	type __IntegerStringCompareDigit<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		_IntegerStringA extends `${infer _DigitA extends number}${infer _RestA}` ?
			_IntegerStringB extends `${infer _DigitB extends number}${infer _RestB}` ?
				__IntegerStringDigitComparatorTable[_DigitA][_DigitB] extends ">" ?
					1 :
					__IntegerStringDigitComparatorTable[_DigitA][_DigitB] extends "<" ?
						-1 :
						__IntegerStringCompareDigit<_RestA, _RestB> :
				0 :
			0;
	type IntegerStringCompare<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		__IntegerStringCompareSign<_IntegerStringA, _IntegerStringB> extends 1 ?
			1 :
			__IntegerStringCompareSign<_IntegerStringA, _IntegerStringB> extends -1 ?
				-1 :
				StringLengthIsLonger<_IntegerStringA, _IntegerStringB> extends true ?
					1 :
					StringLengthIsShorter<_IntegerStringA, _IntegerStringB> extends true ?
						-1 :
						__IntegerStringCompareDigit<_IntegerStringA, _IntegerStringB>;
	type IntegerStringGreaterThan<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		IntegerStringCompare<_IntegerStringA, _IntegerStringB> extends 1 ? true : false;
	type IntegerStringGreaterThanEqual<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		IntegerStringCompare<_IntegerStringA, _IntegerStringB> extends 1 | 0 ? true : false;
	type IntegerStringLessThan<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		IntegerStringCompare<_IntegerStringA, _IntegerStringB> extends -1 ? true : false;
	type IntegerStringLessThanEqual<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		IntegerStringCompare<_IntegerStringA, _IntegerStringB> extends -1 | 0 ? true : false;
	type IntegerStringEqual<_IntegerStringA extends `${number}`, _IntegerStringB extends `${number}`> =
		IntegerStringCompare<_IntegerStringA, _IntegerStringB> extends 0 ? true : false;

	// Integer: Primordials
	type IntegerIncrement<_Integer extends number> =
		IntegerStringParse<IntegerStringIncrement<`${_Integer}`>>;
	type IntegerDecrement<_Integer extends number> =
		IntegerStringParse<IntegerStringDecrement<`${_Integer}`>>;
	type IntegerCompare<_IntegerA extends number, _IntegerB extends number> =
		IntegerStringCompare<`${_IntegerA}`, `${_IntegerB}`>;
	type IntegerGreaterThan<_IntegerA extends number, _IntegerB extends number> =
		IntegerCompare<_IntegerA, _IntegerB> extends 1 ? true : false;
	type IntegerGreaterThanEqual<_IntegerA extends number, _IntegerB extends number> =
		IntegerCompare<_IntegerA, _IntegerB> extends 1 | 0 ? true : false;
	type IntegerLessThan<_IntegerA extends number, _IntegerB extends number> =
		IntegerCompare<_IntegerA, _IntegerB> extends -1 ? true : false;
	type IntegerLessThanEqual<_IntegerA extends number, _IntegerB extends number> =
		IntegerCompare<_IntegerA, _IntegerB> extends -1 | 0 ? true : false;
	type IntegerEqual<_IntegerA extends number, _IntegerB extends number> =
		IntegerCompare<_IntegerA, _IntegerB> extends 0 ? true : false;
	type IntegerSign<_Integer extends number> =
		`${_Integer}` extends `-${number}` ? "-" :
			`${_Integer}` extends `${number}` | `+${number}` ? "+" :
				never;
	type IntegerAbsolute<_Integer extends number> =
		`${_Integer}` extends `-${infer _Absolute extends number}` ?
			_Absolute : _Integer;
	type IntegerInvert<_Integer extends number> =
		`${_Integer}` extends `-${infer _Absolute extends number}` ?
			_Absolute :
			_Integer extends 0 ?
				0 :
				IntegerStringParse<`-${_Integer}`>;
	type Integer10ToPower<_Power extends number> = IntegerStringParse<`1${StringRepeat<"0", _Power>}`>;

	// Integer: Addition & Substraction
	type __IntegerAdditionPowerIncrement<_Integer extends number, _Power extends number> =
		_Power extends 0 ?
			IntegerIncrement<_Integer> :
			IntegerGreaterThan<Integer10ToPower<_Power>, _Integer> extends true ?
				IntegerStringParse<`${StringReverse<StringSliceLength<StringReverse<`${Integer10ToPower<_Power>}`>, StringLength<`${_Integer}`>>>}${_Integer}`> :
				IntegerStringParse<StringReverse<`${StringSliceLength<StringReverse<`${_Integer}`>, 0, _Power>}${__IntegerStringIncrement<StringSliceLength<StringReverse<`${_Integer}`>, _Power>>}`>>;
	type __IntegerAdditionPowerIncrementRepeat<_Sum extends number, _Power extends number, _Count extends number> =
		_Count extends 0 ? _Sum : __IntegerAdditionPowerIncrementRepeat<__IntegerAdditionPowerIncrement<_Sum, _Power>, _Power, IntegerDecrement<_Count>>;
	type __IntegerAdditionColumnRepeat<_Sum extends number, _ReversedDigits extends `${number}`, _CurrentPower extends number = 0> =
		_ReversedDigits extends `${infer _Digit extends number}${infer _Rest}` ?
			__IntegerAdditionColumnRepeat<__IntegerAdditionPowerIncrementRepeat<_Sum, _CurrentPower, _Digit>, _Rest, IntegerIncrement<_CurrentPower>> :
			_Sum;
	type __IntegerAdditionSimple<_IntegerA extends number, _IntegerB extends number> =
		__IntegerAdditionColumnRepeat<_IntegerA, StringReverse<`${_IntegerB}`>>;
	type __IntegerSubstractionPowerDecrement<_Integer extends number, _Power extends number> =
		_Power extends 0 ?
			IntegerDecrement<_Integer> :
			IntegerStringParse<IntegerStringRemoveLeadingZeros<StringReverse<`${StringSliceLength<StringReverse<`${_Integer}`>, 0, _Power>}${__IntegerStringDecrement<StringSliceLength<StringReverse<`${_Integer}`>, _Power>>}`>>>;
	type __IntegerSubstractionPowerDecrementRepeat<_Sum extends number, _Power extends number, _Count extends number> =
		_Count extends 0 ? _Sum : __IntegerSubstractionPowerDecrementRepeat<__IntegerSubstractionPowerDecrement<_Sum, _Power>, _Power, IntegerDecrement<_Count>>;
	type __IntegerSubstractionColumnRepeat<_Sum extends number, _ReversedDigits extends string, _CurrentPower extends number = 0> =
		_ReversedDigits extends `${infer _Digit extends number}${infer _Rest}` ?
			__IntegerSubstractionColumnRepeat<__IntegerSubstractionPowerDecrementRepeat<_Sum, _CurrentPower, _Digit>, _Rest, IntegerIncrement<_CurrentPower>> :
			_Sum;
	type __IntegerSubstractionSimple<_IntegerA extends number, _IntegerB extends number> =
		IntegerGreaterThanEqual<_IntegerA, _IntegerB> extends true ?
			__IntegerSubstractionColumnRepeat<_IntegerA, StringReverse<`${_IntegerB}`>> :
			IntegerInvert<__IntegerSubstractionColumnRepeat<_IntegerB, StringReverse<`${_IntegerA}`>>>;
	type IntegerAdd<_IntegerA extends number, _IntegerB extends number> =
		IntegerGreaterThanEqual<_IntegerA, 0> extends true ?
			IntegerGreaterThanEqual<_IntegerB, 0> extends true ?
				__IntegerAdditionSimple<_IntegerA, _IntegerB> :
				__IntegerSubstractionSimple<_IntegerA, IntegerInvert<_IntegerB>> :
			IntegerGreaterThanEqual<_IntegerB, 0> extends true ?
				__IntegerSubstractionSimple<_IntegerB, IntegerInvert<_IntegerA>> :
				IntegerInvert<__IntegerAdditionSimple<IntegerInvert<_IntegerA>, IntegerInvert<_IntegerB>>>;
	type IntegerSubstract<_IntegerA extends number, _IntegerB extends number> =
		IntegerGreaterThanEqual<_IntegerA, 0> extends true ?
			IntegerGreaterThanEqual<_IntegerB, 0> extends true ?
				__IntegerSubstractionSimple<_IntegerA, _IntegerB> :
				__IntegerAdditionSimple<_IntegerA, IntegerInvert<_IntegerB>> :
			IntegerGreaterThanEqual<_IntegerB, 0> extends true ?
				IntegerInvert<__IntegerAdditionSimple<_IntegerB, IntegerInvert<_IntegerA>>> :
				__IntegerSubstractionSimple<IntegerInvert<_IntegerB>, IntegerInvert<_IntegerA>>;

	// String: Primordials
	type StringLength<_String extends string, _Result extends number = 0> =
		_String extends `${infer _Character}${infer _Rest}` ?
			StringLength<_Rest, IntegerIncrement<_Result>> :
			_Result;
	type StringLengthCompare<_StringA extends string, _StringB extends string> =
		_StringA extends `${infer _CharacterA}${infer _RestA}` ?
			_StringB extends `${infer _CharacterB}${infer _RestB}` ?
				StringLengthCompare<_RestA, _RestB> :
				1 :
			_StringB extends `${infer _CharacterB}${infer _RestB}` ?
				-1 :
				0;
	type StringLengthIsLonger<_StringA extends string, _StringB extends string> =
		StringLengthCompare<_StringA, _StringB> extends 1 ? true : false;
	type StringLengthIsLongerOrSame<_StringA extends string, _StringB extends string> =
		StringLengthCompare<_StringA, _StringB> extends 1 | 0 ? true : false;
	type StringLengthIsShorter<_StringA extends string, _StringB extends string> =
		StringLengthCompare<_StringA, _StringB> extends -1 ? true : false;
	type StringLengthIsShorterOrSame<_StringA extends string, _StringB extends string> =
		StringLengthCompare<_StringA, _StringB> extends -1 | 0 ? true : false;
	type StringLengthIsSame<_StringA extends string, _StringB extends string> =
		StringLengthCompare<_StringA, _StringB> extends 0 ? true : false;
	type StringRepeat<_String extends string, _Count extends number, _Accumulate extends string = ""> =
		_Count extends 0 ? _Accumulate : StringRepeat<_String, IntegerDecrement<_Count>, `${_Accumulate}${_String}`>;
	type StringReverse<_String extends string> =
		LiteralIsString<_String> extends true ?
			_String extends `${infer _Character}${infer _Rest}` ?
				`${StringReverse<_Rest>}${_Character}` :
				"" :
			string;
	type StringSliceLength<_String extends string, _Start extends number, _Length extends number = null, _Accumulate extends string = ""> =
		_Start extends 0 ?
			_Length extends null ?
				_String :
				_Length extends 0 ?
					_Accumulate :
					_String extends `${infer _Character}${infer _Rest}` ?
						StringSliceLength<_Rest, 0, IntegerDecrement<_Length>, `${_Accumulate}${_Character}`> :
						_Accumulate :
			_String extends `${infer _Character}${infer _Rest}` ?
				StringSliceLength<_Rest, IntegerDecrement<_Start>, _Length, _Accumulate> :
				"";
	type __StringExpandWideBoolean<_String extends string> =
		_String extends `${infer _Former}${infer _Boolean extends boolean}${infer _Latter}` ?
			LiteralIsBoolean<_Boolean> extends false ?
				`${StringExpandWide<_Former>}${true | false}${StringExpandWide<_Latter>}` :
				`${StringExpandWide<_Former>}${_Boolean}${StringExpandWide<_Latter>}` :
			_String extends `${infer _Boolean extends boolean}${infer _Latter}` ?
				LiteralIsBoolean<_Boolean> extends false ?
					`${true | false}${StringExpandWide<_Latter>}` :
					`${_Boolean}${StringExpandWide<_Latter>}` :
				_String extends `${infer _Former}${infer _Boolean extends boolean}` ?
					LiteralIsBoolean<_Boolean> extends false ?
						`${StringExpandWide<_Former>}${true | false}` :
						`${StringExpandWide<_Former>}${_Boolean}` :
					never;
	type __StringExpandWideNumber<_String extends string> =
		_String extends `${infer _Former}${infer _Number extends number}${infer _Latter}` ?
			LiteralIsNumber<_Number> extends false ?
				`${StringExpandWide<_Former>}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${StringExpandWide<_Latter>}` :
				`${StringExpandWide<_Former>}${_Number}${StringExpandWide<_Latter>}` :
			_String extends `${infer _Number extends number}${infer _Latter}` ?
				LiteralIsNumber<_Number> extends false ?
					`${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${StringExpandWide<_Latter>}` :
					`${_Number}${StringExpandWide<_Latter>}` :
				_String extends `${infer _Former}${infer _Number extends number}` ?
					LiteralIsNumber<_Number> extends false ?
						`${StringExpandWide<_Former>}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` :
						`${StringExpandWide<_Former>}${_Number}` :
					never;
	type __StringExpandExceptSpace<_String extends string> =
		_String extends `${infer _Former}${" "}${infer _Latter}` ?
			`${StringExpandWide<_Former>}${" "}${StringExpandWide<_Latter>}` :
			_String extends `${" "}${infer _Latter}` ?
				`${" "}${StringExpandWide<_Latter>}` :
				_String extends `${infer _Former}${" "}` ?
					`${StringExpandWide<_Former>}${" "}` :
					never;
	type StringExpandWide<_String extends string> =
		_String extends any ?
			__StringExpandWideBoolean<_String> extends (infer _ExpandedBoolean) ?
				[_ExpandedBoolean] extends [never] ?
					__StringExpandExceptSpace<_String> extends (infer _UnexpandedSpace) ?
						[_UnexpandedSpace] extends [never] ?
							__StringExpandWideNumber<_String> extends (infer _ExpandedNumber) ?
								[_ExpandedNumber] extends [never] ?
									_String :
									_ExpandedNumber :
								never :
							_UnexpandedSpace :
						never :
					_ExpandedBoolean :
				never :
			never;
	type __StringTemplateCheckEscapeSuffixEven<_String extends string, _Accumulate extends string = "", _OldAccumulate extends string = "", _IsEven extends boolean = true> =
		_String extends `${infer _Former}^` ?
			__StringTemplateCheckEscapeSuffixEven<_Former, `^${_Accumulate}`, _Accumulate, _IsEven extends true ? false : true> :
			_IsEven extends true ?
				{ escaped: false, escapedString: _String, escapeSequence: _Accumulate } :
				{ escaped: true, escapedString: _String, escapeSequence: _OldAccumulate };
	type StringTemplateFrom<_String extends string> =
		_String extends any ?
			_String extends `${infer _Former}\${${infer _Type}}${infer _Latter}` ?
				__StringTemplateCheckEscapeSuffixEven<_Former> extends { escaped: infer _Escaped, escapedString: infer _EscapedFormer, escapeSequence: infer _EscapeSequence } ?
					_Escaped extends false ?
						`${_EscapedFormer}${_EscapeSequence}${
							_Type extends "string" ? string :
								_Type extends "number" ? number :
									_Type extends "boolean" ? boolean :
										never
						}${StringTemplateFrom<_Latter>}` :
						`${_EscapedFormer}${_EscapeSequence}\${${_Type}}${StringTemplateFrom<_Latter>}` :
					never :
				_String :
			never;

	// String: Walk
	type __StringSearchMatch<_String extends string, _Bound extends string, _Searchs extends string> =
		{
			[_Search in _Searchs]:
			_String extends `${infer _Former extends _Bound}${StringTemplateFrom<_Search>}${infer _Latter}` ?
				_String extends `${_Former}${infer _Match}${_Latter}` ?
					[_Former, _Match, _Latter] :
					never :
				never
		};
	type __StringSearchPick<_MatchCompilation extends { [k: string]: [string, string] }, _Result extends [string, string, string] = null> =
		_Result extends null ?
			UnionLast<keyof _MatchCompilation> extends (infer _Search) ?
				[_Search] extends [never] ?
					never :
					[_MatchCompilation[_Search]] extends [never] ?
						__StringSearchPick<Omit<_MatchCompilation, _Search>, null> :
						__StringSearchPick<Omit<_MatchCompilation, _Search>, _MatchCompilation[_Search]> :
				never :
			_Result extends [infer _ResultFormer, string, string] ?
				UnionLast<keyof _MatchCompilation> extends (infer _Search) ?
					[_Search] extends [never] ?
						_Result :
						[_MatchCompilation[_Search]] extends [never] ?
							__StringSearchPick<Omit<_MatchCompilation, _Search>, _Result> :
							StringLengthIsShorter<_MatchCompilation[_Search][0], _ResultFormer> extends true ?
								__StringSearchPick<Omit<_MatchCompilation, _Search>, _MatchCompilation[_Search]> :
								__StringSearchPick<Omit<_MatchCompilation, _Search>, _Result> :
					never :
				never;
	interface StringWalkJoiner { value1: any, value2: any, result: any }
	interface StringWalkNext { string: string, bound: string, searchs: string, mapper: StringWalkMapper, joiner: StringWalkJoiner }
	interface StringWalkMapper { direction: "forward" | "backward", string: string, bound: string, searchs: string, depth: number, former: string, search: string, latter: string, result: string, next: StringWalkNext }
	type StringWalkForward<_String extends string, _Bound extends string, _Searchs extends string, _Mapper extends StringWalkMapper, _Depth extends number = 20> =
		_Depth extends 0 ?
			never :
			__StringSearchPick<__StringSearchMatch<_String, _Bound, _Searchs>> extends (infer _Result) ?
				[_Result] extends [never] ?
					never :
					_Result extends ([infer _ResultFormer, infer _ResultSearch, infer _ResultLatter]) ?
						(_Mapper & { direction: "forward", string: _String, bound: _Bound, searchs: _Searchs, depth: _Depth, former: _ResultFormer, search: _ResultSearch, latter: _ResultLatter }) extends (infer _MapperResult) ?
							_MapperResult["next"] extends null ?
								_MapperResult["result"] :
								(_MapperResult["next"]["joiner"] & {
									value1: _MapperResult["result"];
									value2: StringWalkForward<_MapperResult["next"]["string"], _MapperResult["next"]["bound"], _MapperResult["next"]["searchs"], _MapperResult["next"]["mapper"], IntegerDecrement<_Depth>>;
								})["result"] :
							never :
						never :
				never;
	type StringWalkBackward<_String extends string, _Bound extends string, _Searchs extends string, _Mapper extends StringWalkMapper, _Depth extends number = 20> =
		_Depth extends 0 ?
			never :
			__StringSearchPick<__StringSearchMatch<StringReverse<_String>, StringReverse<_Bound>, StringReverse<_Searchs>>> extends (infer _Result) ?
				[_Result] extends [never] ?
					never :
					_Result extends ([infer _ResultFormer, infer _ResultSearch, infer _ResultLatter]) ?
						(_Mapper & { direction: "backward", string: _String, bound: _Bound, searchs: _Searchs, depth: _Depth, former: StringReverse<_ResultLatter>, search: StringReverse<_ResultSearch>, latter: StringReverse<_ResultFormer> }) extends (infer _MapperResult) ?
							_MapperResult["next"] extends null ?
								_MapperResult["result"] :
								(_MapperResult["next"]["joiner"] & {
									value1: _MapperResult["result"];
									value2: StringWalkBackward<_MapperResult["next"]["string"], _MapperResult["next"]["bound"], _MapperResult["next"]["searchs"], _MapperResult["next"]["mapper"], IntegerDecrement<_Depth>>;
								})["result"] :
							never :
						never :
				never;

	// String: Replace
	interface StringReplacer { search: string, result: string }
	interface StringReplacerStatic<_Replace extends string> extends StringReplacer { result: _Replace }
	type __StringReplacerInvoke<_Replacer extends StringReplacer, _Search extends string> =
		(_Replacer & { search: _Search })["result"];
	interface __StringReplaceJoiner<_Direction extends "forward" | "backward", _String extends string> extends StringWalkJoiner {
		value1: unknown;
		value2: unknown;
		result: _Direction extends "forward" ?
			`${this["value1"]}${[this["value2"]] extends [never] ? _String : this["value2"]}` :
			`${[this["value2"]] extends [never] ? _String : this["value2"]}${this["value1"]}`;
	}
	interface __StringReplaceWalkNext<_Direction extends "forward" | "backward", _String extends string, _Searchs extends string, _Replacer extends StringReplacer> extends StringWalkNext {
		string: _String;
		bound: string;
		searchs: _Searchs;
		mapper: __StringReplaceWalkMapper<true, _Replacer>;
		joiner: __StringReplaceJoiner<_Direction, _String>;
	}
	interface __StringReplaceWalkMapper<_Repeat extends boolean, _Replacer extends StringReplacer> extends StringWalkMapper {
		direction: unknown;
		searchs: unknown;
		former: unknown;
		search: unknown;
		latter: unknown;
		result: _Repeat extends false ?
			`${this["former"]}${__StringReplacerInvoke<_Replacer, this["search"]>}${this["latter"]}` :
			`${this["former"]}${__StringReplacerInvoke<_Replacer, this["search"]>}`;
		next: _Repeat extends true ?
			__StringReplaceWalkNext<this["direction"], this["direction"] extends "forward" ? this["latter"] : this["former"], this["searchs"], _Replacer> :
			null;
	}
	type StringReplaceFirst<_String extends string, _Searchs extends string, _Replacer extends StringReplacer, _Depth extends number = 20> =
		StringWalkForward<_String, string, _Searchs, __StringReplaceWalkMapper<false, _Replacer>, _Depth> extends (infer _Result) ?
			[_Result] extends [never] ? _String : _Result : never;
	type StringReplaceLast<_String extends string, _Searchs extends string, _Replacer extends StringReplacer, _Depth extends number = 20> =
		StringWalkBackward<_String, string, _Searchs, __StringReplaceWalkMapper<false, _Replacer>, _Depth> extends (infer _Result) ?
			[_Result] extends [never] ? _String : _Result : never;
	type StringReplaceAll<_String extends string, _Searchs extends string, _Replacer extends StringReplacer, _Depth extends number = 20> =
		StringWalkForward<_String, string, _Searchs, __StringReplaceWalkMapper<true, _Replacer>, _Depth> extends (infer _Result) ?
			[_Result] extends [never] ? _String : _Result : never;

	// String: Trim
	interface __StringTrimJoiner<_Direction extends "forward" | "backward", _String extends string> extends StringWalkJoiner {
		value1: unknown;
		value2: unknown;
		result: _Direction extends "forward" ?
			`${this["value1"]}${[this["value2"]] extends [never] ? _String : this["value2"]}` :
			`${[this["value2"]] extends [never] ? _String : this["value2"]}${this["value1"]}`;
	}
	interface __StringTrimWalkNext<_Direction extends "forward" | "backward", _String extends string, _Searchs extends string, _Replacer extends StringReplacer> extends StringWalkNext {
		string: _String;
		bound: "";
		searchs: _Searchs;
		mapper: __StringTrimWalkMapper<_Replacer>;
		joiner: __StringTrimJoiner<_Direction, _String>;
	}
	interface __StringTrimWalkMapper<_Replacer extends StringReplacer> extends StringWalkMapper {
		direction: unknown;
		searchs: unknown;
		former: unknown;
		search: unknown;
		latter: unknown;
		result: this["direction"] extends "forward" ?
			`${this["former"]}${__StringReplacerInvoke<_Replacer, this["search"]>}` :
			`${__StringReplacerInvoke<_Replacer, this["search"]>}${this["latter"]}`;
		next: __StringTrimWalkNext<this["direction"], this["direction"] extends "forward" ? this["latter"] : this["former"], this["searchs"], _Replacer>;
	}
	type StringTrimStart<_String extends string, _Searchs extends string, _Replacer extends StringReplacer, _Depth extends number = 20> =
		StringWalkForward<_String, "", _Searchs, __StringTrimWalkMapper<_Replacer>, _Depth> extends (infer _Result) ?
			[_Result] extends [never] ? _String : _Result : never;
	type StringTrimEnd<_String extends string, _Searchs extends string, _Replacer extends StringReplacer, _Depth extends number = 20> =
		StringWalkBackward<_String, "", _Searchs, __StringTrimWalkMapper<_Replacer>, _Depth> extends (infer _Result) ?
			[_Result] extends [never] ? _String : _Result : never;
	type StringTrim<_String extends string, _Searchs extends string, _Replacer extends StringReplacer, _Depth extends number = 20> =
		StringTrimEnd<StringTrimStart<_String, _Searchs, _Replacer, _Depth>, _Searchs, _Replacer, _Depth>;

	// String: Split
	interface __StringSplitWalkJoiner<_String extends string> extends StringWalkJoiner {
		value1: unknown;
		value2: unknown;
		result: [...this["value1"], ...([this["value2"]] extends [never] ? [_String] : this["value2"])];
	}
	interface __StringSplitWalkNext<_String extends string, _Searchs extends string> extends StringWalkNext {
		string: _String;
		bound: string;
		searchs: _Searchs;
		mapper: __StringSplitWalkMapper;
		joiner: __StringSplitWalkJoiner<_String>;
	}
	interface __StringSplitWalkMapper extends StringWalkMapper {
		direction: unknown;
		searchs: unknown;
		former: unknown;
		search: unknown;
		latter: unknown;
		result: [this["direction"] extends "forward" ? this["former"] : this["latter"]];
		next: (this["direction"] extends "forward" ? this["latter"] : this["former"]) extends "" ?
			null :
			__StringSplitWalkNext<this["direction"] extends "forward" ? this["latter"] : this["former"], this["searchs"]>;
	}
	type StringSplit<_String extends string, _Searchs extends string, _Depth extends number = 20> =
		StringWalkForward<_String, string, _Searchs, __StringSplitWalkMapper, _Depth> extends (infer _Result) ?
			[_Result] extends [never] ? [_String] : _Result : never;

	// Object: Walk
	interface ObjectWalkJoiner { value1: any, value2: any, result: any }
	interface ObjectWalkNext { object: any, mapper: ObjectWalkMapper, joiner: ObjectWalkJoiner }
	interface ObjectWalkMapper { object: any, key: any, depth: any, result: any, next: ObjectWalkNext }
	type __ObjectWalkVisit<_Object, _Key, _Mapper extends ObjectWalkMapper, _Depth extends number> =
		(_Mapper & { object: _Object, key: _Key, depth: _Depth }) extends (infer _MapperResult) ?
			_MapperResult["next"] extends null ?
				_MapperResult["result"] :
				(_MapperResult["next"]["joiner"] & {
					value1: _MapperResult["result"];
					value2: ObjectWalk<_MapperResult["next"]["object"], _MapperResult["next"]["mapper"], IntegerDecrement<_Depth>>;
				})["result"] :
			never;
	type ObjectWalk<_Object, _Mapper extends ObjectWalkMapper, _Depth extends number = 2> =
		_Depth extends 0 ?
			never :
			_Object extends any[] ?
				LiteralIsNumber<_Object["length"]> extends false ?
					__ObjectWalkVisit<_Object, number, _Mapper, _Depth> :
					Exclude<{
						[_Key in (keyof _Object) & `${number}`]:
						__ObjectWalkVisit<_Object, IntegerStringParse<_Key>, _Mapper, _Depth>
					}[(keyof _Object) & `${number}`], undefined> :
				_Object extends object ?
					Exclude<{
						[_Key in keyof _Object]:
						__ObjectWalkVisit<_Object, _Key, _Mapper, _Depth>
					}[keyof _Object], undefined> :
					never;

	// Object: Key Encoding/Decoding
	interface __ObjectKeyEncodeEscapeReplacer extends StringReplacer {
		search: unknown;
		result: `^${this["search"]}`;
	}
	interface __ObjectKeyDecodeUnescapeReplacer extends StringReplacer {
		search: unknown;
		result: this["search"] extends `^${infer _Unescaped}` ? _Unescaped : never;
	}
	type ObjectKeyEncode<_Key> =
		LiteralToWidePlaceholder<_Key> extends (infer _Placeholder) ?
			[_Placeholder] extends [never] ?
				_Key extends number | boolean ?
					`${_Key}` :
					StringReplaceAll<`${_Key}`, "." | "[" | "]" | "^", __ObjectKeyEncodeEscapeReplacer> :
				_Placeholder :
			never;
	type ObjectKeyDecode<_Key extends string> =
		LiteralFromWidePlaceholder<_Key> extends (infer _Unplaceholder) ?
			[_Unplaceholder] extends [never] ?
				_Key extends `${infer _Number extends number}` ?
					_Number :
					_Key extends `${infer _Boolean extends boolean}` ?
						_Boolean :
						StringReplaceAll<_Key, "^." | "^[" | "^]" | "^^", __ObjectKeyDecodeUnescapeReplacer> :
				_Unplaceholder :
			never;

	// Object: Path Splitting/Joining
	interface __ObjectPathSplitWalkJoiner<_String extends string, _Accumulate extends string> extends StringWalkJoiner {
		value1: unknown;
		value2: unknown;
		result: [...this["value1"], ...([this["value2"]] extends [never] ? [ObjectKeyDecode<`${_Accumulate}${_String}`>] : this["value2"])];
	}
	interface __ObjectPathSplitWalkNext<_String extends string, _Accumulate extends string, _Escaped extends boolean, _Searchs extends string> extends StringWalkNext {
		string: _String;
		bound: string;
		searchs: _Searchs;
		mapper: __ObjectPathSplitWalkMapper<_Accumulate, _Escaped>;
		joiner: __ObjectPathSplitWalkJoiner<_String, _Accumulate>;
	}
	interface __ObjectPathSplitWalkMapper<_Accumulate extends string, _Escaped extends boolean> extends StringWalkMapper {
		former: unknown;
		search: unknown;
		latter: unknown;
		result:
		this["search"] extends "" ?
			this["former"] extends "^" ?
				[] :
				this["former"] extends "." ?
					_Escaped extends false ?
						[ObjectKeyDecode<_Accumulate>] :
						[] :
					[] :
			this["search"] extends "^" ?
				[] :
				this["search"] extends "." ?
					_Escaped extends false ?
						[ObjectKeyDecode<`${_Accumulate}${this["former"]}`>] :
						[] :
					[];
		next:
		this["search"] extends "" ?
			this["former"] extends "^" ?
				__ObjectPathSplitWalkNext<this["latter"], `${_Accumulate}^`, _Escaped extends false ? true : false, ""> :
				this["former"] extends "." ?
					_Escaped extends false ?
						__ObjectPathSplitWalkNext<this["latter"], "", false, "^" | "."> :
						__ObjectPathSplitWalkNext<this["latter"], `${_Accumulate}${this["former"]}`, false, "^" | "."> :
					__ObjectPathSplitWalkNext<this["latter"], `${_Accumulate}${this["former"]}`, false, "^" | "."> :
			this["search"] extends "^" ?
				__ObjectPathSplitWalkNext<this["latter"], `${_Accumulate}${this["former"]}^`, _Escaped extends false ? true : false, ""> :
				this["search"] extends "." ?
					_Escaped extends false ?
						__ObjectPathSplitWalkNext<this["latter"], "", false, "^" | "."> :
						__ObjectPathSplitWalkNext<this["latter"], `${_Accumulate}${this["former"]}`, false, "^" | "."> :
					__ObjectPathSplitWalkNext<this["latter"], `${_Accumulate}${this["former"]}${this["search"]}`, false, "^" | ".">;
	}
	type ObjectPathSplit<_PathString extends string, _Depth extends number = 20> =
		StringWalkForward<_PathString, string, "^" | ".", __ObjectPathSplitWalkMapper<"", false>, _Depth> extends (infer _Result) ?
			[_Result] extends [never] ? [_PathString] : _Result : never;
	type ObjectPathJoin<_Path extends any[]> =
		_Path extends [infer _Key, ...infer _Rest] ?
			_Rest extends [] ?
				`${ObjectKeyEncode<_Key>}` :
				`${ObjectKeyEncode<_Key>}.${ObjectPathJoin<_Rest>}` :
			never;

	// Object: PossiblePaths
	interface __ObjectPossiblePathsWalkJoiner extends ObjectWalkJoiner {
		value1: unknown;
		value2: unknown;
		result: this["value1"] | this["value2"];
	}
	interface __ObjectPossiblePathsWalkNext<_Object, _Key, _Previous extends any[]> extends ObjectWalkNext {
		object: _Object[_Key];
		mapper: __ObjectPossiblePathsWalkMapper<_Previous extends null ? [_Key] : [..._Previous, _Key]>;
		joiner: __ObjectPossiblePathsWalkJoiner;
	}
	interface __ObjectPossiblePathsWalkMapper<_Previous extends any[] = null> extends ObjectWalkMapper {
		object: unknown;
		key: unknown;
		result: _Previous extends null ? [this["key"]] : [..._Previous, this["key"]];
		next: __ObjectPossiblePathsWalkNext<this["object"], this["key"], _Previous>;
	}
	type ObjectPossiblePaths<_Object, _Depth extends number = 2> =
		ObjectWalk<_Object, __ObjectPossiblePathsWalkMapper, _Depth>;

	// Object: PathValue
	type ObjectPathValueGet<_Object, _Path extends string | any[]> =
		_Path extends string ?
			ObjectPathValueGet<_Object, ObjectPathSplit<_Path>> :
			_Object extends any ?
				_Path extends [infer _Key, ...infer _Rest] ?
					_Key extends keyof Extract<_Object, object> ?
						ObjectPathValueGet<Extract<_Object, object>[_Key], _Rest> | (object extends Pick<Extract<_Object, object>, _Key> ? undefined : never) :
						never :
					_Object :
				never;
	type ObjectPathValueSet<_Object, _Path extends string | any[], _Value, _Modifier extends null | "optional" | "required" | "readonly" = null> =
		_Path extends string ?
			ObjectPathValueSet<_Object, ObjectPathSplit<_Path>, _Value, _Modifier> :
			_Path extends [infer _Key, ...infer _Rest] ?
				[Extract<_Key, keyof Extract<_Object, object>>] extends [never] ?
					_Object :
					_Rest extends [] ?
						_Object extends (infer _Element)[] ?
							number extends _Key ?
								_Modifier extends "optional" ? (_Value | undefined)[] : _Modifier extends "requried" ? _Value[] : _Modifier extends "readonly" ? readonly _Value[] : _Value[] :
								[Extract<_Object, object>] extends [never] ?
									never :
									{ [_K in Exclude<keyof _Object, _Key>]: _Object[_K] } & (_Modifier extends "optional" ? { [_K in _Key]?: _Value } : _Modifier extends "required" ? { [_K in _Key]-?: _Value } : _Modifier extends "readonly" ? { readonly [_K in _Key]: _Value } : { [_K in _Key]: _Value }) :
							[Extract<_Object, object>] extends [never] ?
								never :
								{ [_K in Exclude<keyof _Object, _Key>]: _Object[_K] } & (_Modifier extends "optional" ? { [_K in _Key]?: _Value } : _Modifier extends "required" ? { [_K in _Key]-?: _Value } : _Modifier extends "readonly" ? { readonly [_K in _Key]: _Value } : { [_K in _Key]: _Value }) :
						{ [_K in keyof _Object]: _K extends _Key ? ObjectPathValueSet<Extract<_Object, object>[_K], _Rest, _Value, _Modifier> : _Object[_K] } :
				_Object;

	// Object: Others
	type KeyOfAtPath<_Object, _Path extends string | any[]> =
		_Path extends any ?
			keyof ObjectPathValueGet<_Object, _Path> :
			never;
	type SelectAtPath<_Object, _Path extends string | any[]> =
		_Path extends any ?
			ObjectPathValueGet<_Object, _Path> :
			never;
	type NonNullableAtPath<_Object, _Path extends string> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, NonNullable<ObjectPathValueGet<_Object, _Path>>> : never>;
	type PartialAtPath<_Object, _Path extends string> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, Partial<ObjectPathValueGet<_Object, _Path>>> : never>;
	type RequiredAtPath<_Object, _Path extends string> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, Required<ObjectPathValueGet<_Object, _Path>>> : never>;
	type ReadOnlyAtPath<_Object, _Path extends string> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, ReadOnly<ObjectPathValueGet<_Object, _Path>>> : never>;
	type ExtractAtPath<_Object, _Path extends string, _Value> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, Extract<ObjectPathValueGet<_Object, _Path>, _Value>> : never>;
	type ExcludeAtPath<_Object, _Path extends string, _Value> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, Exclude<ObjectPathValueGet<_Object, _Path>, _Value>> : never>;
	type PickAtPath<_Object, _Path extends string, _Key> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, Pick<ObjectPathValueGet<_Object, _Path>, _Key>> : never>;
	type OmitAtPath<_Object, _Path extends string, _Key> =
		UnionToIntersection<_Path extends any ? ObjectPathValueSet<_Object, _Path, Omit<ObjectPathValueGet<_Object, _Path>, _Key>> : never>;
}

// Timeout & Interval Handles
declare global {
	type TimerHandle = ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
}

// React
import "react";
declare module "react" {
	interface CSSProperties {
		[key: `--${string}`]: string | number;
	}
}
