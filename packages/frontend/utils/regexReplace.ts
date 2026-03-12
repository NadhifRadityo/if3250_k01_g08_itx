export default function regexReplace<T extends string | Promise<string>>(
	regex: RegExp,
	string: string,
	replacer: (matcher: RegExpExecArray) => T
): T {
	let lastIndex = 0;
	let result = "";
	function loop() {
		let matcher: RegExpExecArray | null;
		if((matcher = regex.exec(string)) == null) {
			result += string.slice(lastIndex);
			return result;
		}
		const replace = replacer(matcher);
		if(!(replace instanceof Promise)) {
			result += string.slice(lastIndex, matcher.index);
			result += replace;
			lastIndex = matcher.index + matcher[0].length;
			return loop();
		}
		return replace.then(r => {
			result += string.slice(lastIndex, matcher.index);
			result += r;
			lastIndex = matcher.index + matcher[0].length;
			return loop();
		});
	}
	return loop();
}
