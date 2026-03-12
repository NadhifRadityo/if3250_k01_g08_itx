import React, { useMemo } from "react";

import reactRegex from "./reactRegex";
import reactRegexExtract from "./reactRegexExtract";

export default function useReactRegex(reactRegex: reactRegex, childrenNode: React.ReactNode) {
	return useMemo(() => {
		reactRegex.lastIndex = 0;
		const matcher = reactRegex.exec(childrenNode);
		if(matcher == null) return null;
		return reactRegexExtract(matcher);
	}, [reactRegex, childrenNode]);
}
