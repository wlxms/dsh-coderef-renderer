window.__ModuleLoader__.load({
	id: "dsh-coderef-renderer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all2) => {
  for (var name2 in all2)
    __defProp(target, name2, { get: all2[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/entry.tsx
var entry_exports = {};
__export(entry_exports, {
  __resetState: () => __resetState,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  version: () => version
});
module.exports = __toCommonJS(entry_exports);
var import_react4 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/fork/MarkdownText.tsx
var import_react3 = require("react");

// src/fork/incremental.ts
var UNSTABLE_TAIL_BLOCKS = 2;
function blockKey(node2, base, index2) {
  const offset = node2.position?.start.offset;
  return offset === void 0 ? -(index2 + 1) : base + offset;
}
function lineTerminatorEnd(text4, start) {
  for (let index2 = start; index2 < text4.length; index2 += 1) {
    const char = text4[index2];
    if (char === "\n") return index2 + 1;
    if (char === "\r") return text4[index2 + 1] === "\n" ? index2 + 2 : index2 + 1;
  }
  return void 0;
}
function committableLinePrefixLength(text4) {
  let previousEnd = 0;
  let end = 0;
  for (let index2 = 0; index2 < text4.length; index2 += 1) {
    const char = text4[index2];
    if (char === "\n") {
      previousEnd = end;
      end = index2 + 1;
      continue;
    }
    if (char !== "\r" || index2 + 1 >= text4.length) continue;
    if (text4[index2 + 1] === "\n") index2 += 1;
    previousEnd = end;
    end = index2 + 1;
  }
  return previousEnd;
}
function trailingLineTerminator(text4) {
  return text4.endsWith("\r\n") ? "\r\n" : text4.endsWith("\r") ? "\r" : "\n";
}
function containsClosingFence(text4, marker, markerLength) {
  let start = 0;
  while (start <= text4.length) {
    let end = start;
    while (end < text4.length && text4[end] !== "\n" && text4[end] !== "\r") end += 1;
    const line = text4.slice(start, end);
    let indent2 = 0;
    while (indent2 < 3 && line[indent2] === " ") indent2 += 1;
    let run = indent2;
    while (line[run] === marker) run += 1;
    if (run - indent2 >= markerLength && /^[ \t]*$/.test(line.slice(run))) return true;
    if (end === text4.length) return false;
    start = text4[end] === "\r" && text4[end + 1] === "\n" ? end + 2 : end + 1;
  }
  return false;
}
function advancePoint(point3, appended, precededByCarriageReturn) {
  let line = point3.line;
  let column = point3.column;
  let afterCarriageReturn = precededByCarriageReturn;
  for (const char of appended) {
    if (char === "\n") {
      if (!afterCarriageReturn) line += 1;
      column = 1;
      afterCarriageReturn = false;
      continue;
    }
    if (char === "\r") {
      line += 1;
      column = 1;
      afterCarriageReturn = true;
      continue;
    }
    column += 1;
    afterCarriageReturn = false;
  }
  return { line, column, offset: point3.offset + appended.length };
}
var IncrementalMarkdownParser = class {
  /** @param parse - Grammar shared with whatever renders the blocks, so boundaries agree. */
  constructor(parse2) {
    __publicField(this, "parse", parse2);
    __publicField(this, "prevText", "");
    __publicField(this, "tailStart", 0);
    __publicField(this, "frozen", []);
    __publicField(this, "generation", 0);
    __publicField(this, "cached", null);
    __publicField(this, "openFence", null);
  }
  /** Parse one unclosed-fence content slice through the caller's grammar. */
  fenceValue(state, text4) {
    const root = this.parse(`${state.syntheticPrefix}${text4}`);
    if (root.children.length !== 1) return void 0;
    const node2 = root.children[0];
    return node2.type === "code" ? node2.value : void 0;
  }
  /** Recognize the parsed tail's final unclosed fence and prepare its incremental content frontier. */
  openFenceState(text4, base, tail, frozen) {
    const codeIndex = tail.length - 1;
    const block = tail[codeIndex];
    if (block?.node.type !== "code") return null;
    const node2 = block.node;
    const startOffset = node2.position?.start.offset;
    const end = node2.position?.end;
    if (startOffset === void 0 || end?.offset === void 0) return null;
    if (base + end.offset !== text4.length) return null;
    const source = text4.slice(base);
    const previousLf = source.lastIndexOf("\n", startOffset - 1);
    const previousCr = source.lastIndexOf("\r", startOffset - 1);
    const lineStart = Math.max(previousLf, previousCr) + 1;
    const terminatorEnd = lineTerminatorEnd(source, startOffset);
    if (terminatorEnd === void 0) return null;
    if (terminatorEnd === source.length && source.endsWith("\r")) return null;
    const openingLine = source.slice(lineStart, terminatorEnd).replace(/[\r\n]+$/, "");
    const opening = /^( {0,3})(`{3,}|~{3,})/.exec(openingLine);
    if (opening === null) return null;
    const indent2 = opening[1];
    const run = opening[2];
    if (lineStart + indent2.length !== startOffset) return null;
    const marker = run[0];
    const contentStart = base + terminatorEnd;
    const content3 = text4.slice(contentStart);
    if (containsClosingFence(content3, marker, run.length)) return null;
    const syntheticPrefix = `${indent2}${run}
`;
    const stableLength = committableLinePrefixLength(content3);
    const stableValue = stableLength === 0 ? "" : this.fenceValue({ syntheticPrefix }, content3.slice(0, stableLength));
    if (stableValue === void 0) return null;
    const pendingStart = contentStart + stableLength;
    const stableSource = content3.slice(0, stableLength);
    const valuePrefix = stableLength === 0 ? "" : `${stableValue}${trailingLineTerminator(stableSource)}`;
    const pendingValue = this.fenceValue({ syntheticPrefix }, text4.slice(pendingStart));
    if (pendingValue === void 0 || `${valuePrefix}${pendingValue}` !== node2.value) return null;
    return {
      marker,
      markerLength: run.length,
      syntheticPrefix,
      codeIndex,
      frozen,
      tail,
      pendingStart,
      valuePrefix,
      end: { line: end.line, column: end.column, offset: end.offset },
      endedWithCarriageReturn: text4.endsWith("\r")
    };
  }
  /** Extend a recognized unclosed fence without parsing its completed content prefix again. */
  updateOpenFence(state, text4, previousText) {
    const pending = text4.slice(state.pendingStart);
    if (containsClosingFence(pending, state.marker, state.markerLength)) return void 0;
    const pendingValue = this.fenceValue(state, pending);
    if (pendingValue === void 0) return void 0;
    const stableLength = committableLinePrefixLength(pending);
    const stableValue = stableLength === 0 ? "" : this.fenceValue(state, pending.slice(0, stableLength));
    if (stableValue === void 0) return void 0;
    const block = state.tail[state.codeIndex];
    const previousNode = block.node;
    const end = advancePoint(
      state.end,
      text4.slice(previousText.length),
      state.endedWithCarriageReturn
    );
    const node2 = {
      ...previousNode,
      value: `${state.valuePrefix}${pendingValue}`,
      position: { start: previousNode.position.start, end }
    };
    const tail = state.tail.map((entry, index2) => index2 === state.codeIndex ? { ...entry, node: node2 } : entry);
    const cached = {
      frozen: state.frozen,
      tail,
      generation: this.generation
    };
    this.openFence = {
      ...state,
      tail,
      pendingStart: state.pendingStart + stableLength,
      valuePrefix: stableLength === 0 ? state.valuePrefix : `${state.valuePrefix}${stableValue}${trailingLineTerminator(pending.slice(0, stableLength))}`,
      end,
      endedWithCarriageReturn: text4.endsWith("\r")
    };
    return cached;
  }
  /**
   * Fold the current accumulated text and return the frozen/tail split.
   * Idempotent for identical input (the previous result is returned as-is),
   * so callers may invoke it from render paths that re-execute.
   * @param text - The full accumulated markdown source.
   * @returns Frozen and tail blocks with stream-stable render keys.
   */
  update(text4) {
    if (this.cached !== null && text4 === this.prevText) return this.cached;
    if (!text4.startsWith(this.prevText)) {
      this.prevText = "";
      this.tailStart = 0;
      this.frozen = [];
      this.openFence = null;
      this.generation += 1;
    }
    const previousText = this.prevText;
    if (previousText !== "" && this.openFence !== null) {
      const incremental = this.updateOpenFence(this.openFence, text4, previousText);
      if (incremental !== void 0) {
        this.prevText = text4;
        this.cached = incremental;
        return incremental;
      }
      this.openFence = null;
    }
    this.prevText = text4;
    const base = this.tailStart;
    const blocks = this.parse(text4.slice(base)).children;
    let firstUnstable = Math.max(0, blocks.length - UNSTABLE_TAIL_BLOCKS);
    if (firstUnstable > 0) {
      const cutEnd = blocks[firstUnstable - 1]?.position?.end.offset;
      if (cutEnd === void 0) {
        firstUnstable = 0;
      } else {
        for (const node2 of blocks.slice(0, firstUnstable)) {
          this.frozen.push({ node: node2, key: blockKey(node2, base, this.frozen.length) });
        }
        this.tailStart = base + cutEnd;
      }
    }
    const tail = blocks.slice(firstUnstable).map((node2, index2) => ({
      node: node2,
      key: blockKey(node2, base, index2)
    }));
    this.cached = { frozen: [...this.frozen], tail, generation: this.generation };
    this.openFence = this.openFenceState(text4, base, tail, this.cached.frozen);
    return this.cached;
  }
};

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-to-string@4.0.0/node_modules/mdast-util-to-string/lib/index.js
var emptyOptions = {};
function toString(value, options) {
  const settings = options || emptyOptions;
  const includeImageAlt = typeof settings.includeImageAlt === "boolean" ? settings.includeImageAlt : true;
  const includeHtml = typeof settings.includeHtml === "boolean" ? settings.includeHtml : true;
  return one(value, includeImageAlt, includeHtml);
}
function one(value, includeImageAlt, includeHtml) {
  if (node(value)) {
    if ("value" in value) {
      return value.type === "html" && !includeHtml ? "" : value.value;
    }
    if (includeImageAlt && "alt" in value && value.alt) {
      return value.alt;
    }
    if ("children" in value) {
      return all(value.children, includeImageAlt, includeHtml);
    }
  }
  if (Array.isArray(value)) {
    return all(value, includeImageAlt, includeHtml);
  }
  return "";
}
function all(values, includeImageAlt, includeHtml) {
  const result = [];
  let index2 = -1;
  while (++index2 < values.length) {
    result[index2] = one(values[index2], includeImageAlt, includeHtml);
  }
  return result.join("");
}
function node(value) {
  return Boolean(value && typeof value === "object");
}

// ../../deepseek-harness/node_modules/.pnpm/decode-named-character-reference@1.3.0/node_modules/decode-named-character-reference/index.dom.js
var element = document.createElement("i");
function decodeNamedCharacterReference(value) {
  const characterReference2 = "&" + value + ";";
  element.innerHTML = characterReference2;
  const character = element.textContent;
  if (character.charCodeAt(character.length - 1) === 59 && value !== "semi") {
    return false;
  }
  return character === characterReference2 ? false : character;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-chunked@2.0.1/node_modules/micromark-util-chunked/index.js
function splice(list2, start, remove, items) {
  const end = list2.length;
  let chunkStart = 0;
  let parameters;
  if (start < 0) {
    start = -start > end ? 0 : end + start;
  } else {
    start = start > end ? end : start;
  }
  remove = remove > 0 ? remove : 0;
  if (items.length < 1e4) {
    parameters = Array.from(items);
    parameters.unshift(start, remove);
    list2.splice(...parameters);
  } else {
    if (remove) list2.splice(start, remove);
    while (chunkStart < items.length) {
      parameters = items.slice(chunkStart, chunkStart + 1e4);
      parameters.unshift(start, 0);
      list2.splice(...parameters);
      chunkStart += 1e4;
      start += 1e4;
    }
  }
}
function push(list2, items) {
  if (list2.length > 0) {
    splice(list2, list2.length, 0, items);
    return list2;
  }
  return items;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-combine-extensions@2.0.1/node_modules/micromark-util-combine-extensions/index.js
var hasOwnProperty = {}.hasOwnProperty;
function combineExtensions(extensions) {
  const all2 = {};
  let index2 = -1;
  while (++index2 < extensions.length) {
    syntaxExtension(all2, extensions[index2]);
  }
  return all2;
}
function syntaxExtension(all2, extension2) {
  let hook;
  for (hook in extension2) {
    const maybe = hasOwnProperty.call(all2, hook) ? all2[hook] : void 0;
    const left = maybe || (all2[hook] = {});
    const right = extension2[hook];
    let code2;
    if (right) {
      for (code2 in right) {
        if (!hasOwnProperty.call(left, code2)) left[code2] = [];
        const value = right[code2];
        constructs(
          // @ts-expect-error Looks like a list.
          left[code2],
          Array.isArray(value) ? value : value ? [value] : []
        );
      }
    }
  }
}
function constructs(existing, list2) {
  let index2 = -1;
  const before = [];
  while (++index2 < list2.length) {
    ;
    (list2[index2].add === "after" ? existing : before).push(list2[index2]);
  }
  splice(existing, 0, 0, before);
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-decode-numeric-character-reference@2.0.2/node_modules/micromark-util-decode-numeric-character-reference/index.js
function decodeNumericCharacterReference(value, base) {
  const code2 = Number.parseInt(value, base);
  if (
    // C0 except for HT, LF, FF, CR, space.
    code2 < 9 || code2 === 11 || code2 > 13 && code2 < 32 || // Control character (DEL) of C0, and C1 controls.
    code2 > 126 && code2 < 160 || // Lone high surrogates and low surrogates.
    code2 > 55295 && code2 < 57344 || // Noncharacters.
    code2 > 64975 && code2 < 65008 || /* eslint-disable no-bitwise */
    (code2 & 65535) === 65535 || (code2 & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    code2 > 1114111
  ) {
    return "\uFFFD";
  }
  return String.fromCodePoint(code2);
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-normalize-identifier@2.0.1/node_modules/micromark-util-normalize-identifier/index.js
function normalizeIdentifier(value) {
  return value.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-character@2.1.1/node_modules/micromark-util-character/index.js
var asciiAlpha = regexCheck(/[A-Za-z]/);
var asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
var asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
function asciiControl(code2) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    code2 !== null && (code2 < 32 || code2 === 127)
  );
}
var asciiDigit = regexCheck(/\d/);
var asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
var asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
function markdownLineEnding(code2) {
  return code2 !== null && code2 < -2;
}
function markdownLineEndingOrSpace(code2) {
  return code2 !== null && (code2 < 0 || code2 === 32);
}
function markdownSpace(code2) {
  return code2 === -2 || code2 === -1 || code2 === 32;
}
var unicodePunctuation = regexCheck(/\p{P}|\p{S}/u);
var unicodeWhitespace = regexCheck(/\s/);
function regexCheck(regex) {
  return check;
  function check(code2) {
    return code2 !== null && code2 > -1 && regex.test(String.fromCharCode(code2));
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-sanitize-uri@2.0.1/node_modules/micromark-util-sanitize-uri/index.js
function normalizeUri(value) {
  const result = [];
  let index2 = -1;
  let start = 0;
  let skip = 0;
  while (++index2 < value.length) {
    const code2 = value.charCodeAt(index2);
    let replace2 = "";
    if (code2 === 37 && asciiAlphanumeric(value.charCodeAt(index2 + 1)) && asciiAlphanumeric(value.charCodeAt(index2 + 2))) {
      skip = 2;
    } else if (code2 < 128) {
      if (!/[!#$&-;=?-Z_a-z~]/.test(String.fromCharCode(code2))) {
        replace2 = String.fromCharCode(code2);
      }
    } else if (code2 > 55295 && code2 < 57344) {
      const next = value.charCodeAt(index2 + 1);
      if (code2 < 56320 && next > 56319 && next < 57344) {
        replace2 = String.fromCharCode(code2, next);
        skip = 1;
      } else {
        replace2 = "\uFFFD";
      }
    } else {
      replace2 = String.fromCharCode(code2);
    }
    if (replace2) {
      result.push(value.slice(start, index2), encodeURIComponent(replace2));
      start = index2 + skip + 1;
      replace2 = "";
    }
    if (skip) {
      index2 += skip;
      skip = 0;
    }
  }
  return result.join("") + value.slice(start);
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-factory-space@2.0.1/node_modules/micromark-factory-space/index.js
function factorySpace(effects, ok3, type, max) {
  const limit = max ? max - 1 : Number.POSITIVE_INFINITY;
  let size = 0;
  return start;
  function start(code2) {
    if (markdownSpace(code2)) {
      effects.enter(type);
      return prefix(code2);
    }
    return ok3(code2);
  }
  function prefix(code2) {
    if (markdownSpace(code2) && size++ < limit) {
      effects.consume(code2);
      return prefix;
    }
    effects.exit(type);
    return ok3(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/initialize/content.js
var content = {
  tokenize: initializeContent
};
function initializeContent(effects) {
  const contentStart = effects.attempt(this.parser.constructs.contentInitial, afterContentStartConstruct, paragraphInitial);
  let previous3;
  return contentStart;
  function afterContentStartConstruct(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, contentStart, "linePrefix");
  }
  function paragraphInitial(code2) {
    effects.enter("paragraph");
    return lineStart(code2);
  }
  function lineStart(code2) {
    const token = effects.enter("chunkText", {
      contentType: "text",
      previous: previous3
    });
    if (previous3) {
      previous3.next = token;
    }
    previous3 = token;
    return data(code2);
  }
  function data(code2) {
    if (code2 === null) {
      effects.exit("chunkText");
      effects.exit("paragraph");
      effects.consume(code2);
      return;
    }
    if (markdownLineEnding(code2)) {
      effects.consume(code2);
      effects.exit("chunkText");
      return lineStart;
    }
    effects.consume(code2);
    return data;
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/initialize/document.js
var document2 = {
  tokenize: initializeDocument
};
var containerConstruct = {
  tokenize: tokenizeContainer
};
function initializeDocument(effects) {
  const self = this;
  const stack = [];
  let continued = 0;
  let childFlow;
  let childToken;
  let lineStartOffset;
  return start;
  function start(code2) {
    if (continued < stack.length) {
      const item = stack[continued];
      self.containerState = item[1];
      return effects.attempt(item[0].continuation, documentContinue, checkNewContainers)(code2);
    }
    return checkNewContainers(code2);
  }
  function documentContinue(code2) {
    continued++;
    if (self.containerState._closeFlow) {
      self.containerState._closeFlow = void 0;
      if (childFlow) {
        closeFlow();
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          point3 = self.events[indexBeforeFlow][1].end;
          break;
        }
      }
      exitContainers(continued);
      let index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      self.events.length = index2;
      return checkNewContainers(code2);
    }
    return start(code2);
  }
  function checkNewContainers(code2) {
    if (continued === stack.length) {
      if (!childFlow) {
        return documentContinued(code2);
      }
      if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) {
        return flowStart(code2);
      }
      self.interrupt = Boolean(childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack);
    }
    self.containerState = {};
    return effects.check(containerConstruct, thereIsANewContainer, thereIsNoNewContainer)(code2);
  }
  function thereIsANewContainer(code2) {
    if (childFlow) closeFlow();
    exitContainers(continued);
    return documentContinued(code2);
  }
  function thereIsNoNewContainer(code2) {
    self.parser.lazy[self.now().line] = continued !== stack.length;
    lineStartOffset = self.now().offset;
    return flowStart(code2);
  }
  function documentContinued(code2) {
    self.containerState = {};
    return effects.attempt(containerConstruct, containerContinue, flowStart)(code2);
  }
  function containerContinue(code2) {
    continued++;
    stack.push([self.currentConstruct, self.containerState]);
    return documentContinued(code2);
  }
  function flowStart(code2) {
    if (code2 === null) {
      if (childFlow) closeFlow();
      exitContainers(0);
      effects.consume(code2);
      return;
    }
    childFlow = childFlow || self.parser.flow(self.now());
    effects.enter("chunkFlow", {
      _tokenizer: childFlow,
      contentType: "flow",
      previous: childToken
    });
    return flowContinue(code2);
  }
  function flowContinue(code2) {
    if (code2 === null) {
      writeToChild(effects.exit("chunkFlow"), true);
      exitContainers(0);
      effects.consume(code2);
      return;
    }
    if (markdownLineEnding(code2)) {
      effects.consume(code2);
      writeToChild(effects.exit("chunkFlow"));
      continued = 0;
      self.interrupt = void 0;
      return start;
    }
    effects.consume(code2);
    return flowContinue;
  }
  function writeToChild(token, endOfFile) {
    const stream = self.sliceStream(token);
    if (endOfFile) stream.push(null);
    token.previous = childToken;
    if (childToken) childToken.next = token;
    childToken = token;
    childFlow.defineSkip(token.start);
    childFlow.write(stream);
    if (self.parser.lazy[token.start.line]) {
      let index2 = childFlow.events.length;
      while (index2--) {
        if (
          // The token starts before the line ending…
          childFlow.events[index2][1].start.offset < lineStartOffset && // …and either is not ended yet…
          (!childFlow.events[index2][1].end || // …or ends after it.
          childFlow.events[index2][1].end.offset > lineStartOffset)
        ) {
          return;
        }
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let seen;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          if (seen) {
            point3 = self.events[indexBeforeFlow][1].end;
            break;
          }
          seen = true;
        }
      }
      exitContainers(continued);
      index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      self.events.length = index2;
    }
  }
  function exitContainers(size) {
    let index2 = stack.length;
    while (index2-- > size) {
      const entry = stack[index2];
      self.containerState = entry[1];
      entry[0].exit.call(self, effects);
    }
    stack.length = size;
  }
  function closeFlow() {
    childFlow.write([null]);
    childToken = void 0;
    childFlow = void 0;
    self.containerState._closeFlow = void 0;
  }
}
function tokenizeContainer(effects, ok3, nok) {
  return factorySpace(effects, effects.attempt(this.parser.constructs.document, ok3, nok), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-classify-character@2.0.1/node_modules/micromark-util-classify-character/index.js
function classifyCharacter(code2) {
  if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
    return 1;
  }
  if (unicodePunctuation(code2)) {
    return 2;
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-resolve-all@2.0.1/node_modules/micromark-util-resolve-all/index.js
function resolveAll(constructs2, events, context) {
  const called = [];
  let index2 = -1;
  while (++index2 < constructs2.length) {
    const resolve = constructs2[index2].resolveAll;
    if (resolve && !called.includes(resolve)) {
      events = resolve(events, context);
      called.push(resolve);
    }
  }
  return events;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/attention.js
var attention = {
  name: "attention",
  resolveAll: resolveAllAttention,
  tokenize: tokenizeAttention
};
function resolveAllAttention(events, context) {
  let index2 = -1;
  let open;
  let group;
  let text4;
  let openingSequence;
  let closingSequence;
  let use;
  let nextEvents;
  let offset;
  while (++index2 < events.length) {
    if (events[index2][0] === "enter" && events[index2][1].type === "attentionSequence" && events[index2][1]._close) {
      open = index2;
      while (open--) {
        if (events[open][0] === "exit" && events[open][1].type === "attentionSequence" && events[open][1]._open && // If the markers are the same:
        context.sliceSerialize(events[open][1]).charCodeAt(0) === context.sliceSerialize(events[index2][1]).charCodeAt(0)) {
          if ((events[open][1]._close || events[index2][1]._open) && (events[index2][1].end.offset - events[index2][1].start.offset) % 3 && !((events[open][1].end.offset - events[open][1].start.offset + events[index2][1].end.offset - events[index2][1].start.offset) % 3)) {
            continue;
          }
          use = events[open][1].end.offset - events[open][1].start.offset > 1 && events[index2][1].end.offset - events[index2][1].start.offset > 1 ? 2 : 1;
          const start = {
            ...events[open][1].end
          };
          const end = {
            ...events[index2][1].start
          };
          movePoint(start, -use);
          movePoint(end, use);
          openingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start,
            end: {
              ...events[open][1].end
            }
          };
          closingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...events[index2][1].start
            },
            end
          };
          text4 = {
            type: use > 1 ? "strongText" : "emphasisText",
            start: {
              ...events[open][1].end
            },
            end: {
              ...events[index2][1].start
            }
          };
          group = {
            type: use > 1 ? "strong" : "emphasis",
            start: {
              ...openingSequence.start
            },
            end: {
              ...closingSequence.end
            }
          };
          events[open][1].end = {
            ...openingSequence.start
          };
          events[index2][1].start = {
            ...closingSequence.end
          };
          nextEvents = [];
          if (events[open][1].end.offset - events[open][1].start.offset) {
            nextEvents = push(nextEvents, [["enter", events[open][1], context], ["exit", events[open][1], context]]);
          }
          nextEvents = push(nextEvents, [["enter", group, context], ["enter", openingSequence, context], ["exit", openingSequence, context], ["enter", text4, context]]);
          nextEvents = push(nextEvents, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + 1, index2), context));
          nextEvents = push(nextEvents, [["exit", text4, context], ["enter", closingSequence, context], ["exit", closingSequence, context], ["exit", group, context]]);
          if (events[index2][1].end.offset - events[index2][1].start.offset) {
            offset = 2;
            nextEvents = push(nextEvents, [["enter", events[index2][1], context], ["exit", events[index2][1], context]]);
          } else {
            offset = 0;
          }
          splice(events, open - 1, index2 - open + 3, nextEvents);
          index2 = open + nextEvents.length - offset - 2;
          break;
        }
      }
    }
  }
  index2 = -1;
  while (++index2 < events.length) {
    if (events[index2][1].type === "attentionSequence") {
      events[index2][1].type = "data";
    }
  }
  return events;
}
function tokenizeAttention(effects, ok3) {
  const attentionMarkers2 = this.parser.constructs.attentionMarkers.null;
  const previous3 = this.previous;
  const before = classifyCharacter(previous3);
  let marker;
  return start;
  function start(code2) {
    marker = code2;
    effects.enter("attentionSequence");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      return inside;
    }
    const token = effects.exit("attentionSequence");
    const after = classifyCharacter(code2);
    const open = !after || after === 2 && before || attentionMarkers2.includes(code2);
    const close = !before || before === 2 && after || attentionMarkers2.includes(previous3);
    token._open = Boolean(marker === 42 ? open : open && (before || !close));
    token._close = Boolean(marker === 42 ? close : close && (after || !open));
    return ok3(code2);
  }
}
function movePoint(point3, offset) {
  point3.column += offset;
  point3.offset += offset;
  point3._bufferIndex += offset;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/autolink.js
var autolink = {
  name: "autolink",
  tokenize: tokenizeAutolink
};
function tokenizeAutolink(effects, ok3, nok) {
  let size = 0;
  return start;
  function start(code2) {
    effects.enter("autolink");
    effects.enter("autolinkMarker");
    effects.consume(code2);
    effects.exit("autolinkMarker");
    effects.enter("autolinkProtocol");
    return open;
  }
  function open(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return schemeOrEmailAtext;
    }
    if (code2 === 64) {
      return nok(code2);
    }
    return emailAtext(code2);
  }
  function schemeOrEmailAtext(code2) {
    if (code2 === 43 || code2 === 45 || code2 === 46 || asciiAlphanumeric(code2)) {
      size = 1;
      return schemeInsideOrEmailAtext(code2);
    }
    return emailAtext(code2);
  }
  function schemeInsideOrEmailAtext(code2) {
    if (code2 === 58) {
      effects.consume(code2);
      size = 0;
      return urlInside;
    }
    if ((code2 === 43 || code2 === 45 || code2 === 46 || asciiAlphanumeric(code2)) && size++ < 32) {
      effects.consume(code2);
      return schemeInsideOrEmailAtext;
    }
    size = 0;
    return emailAtext(code2);
  }
  function urlInside(code2) {
    if (code2 === 62) {
      effects.exit("autolinkProtocol");
      effects.enter("autolinkMarker");
      effects.consume(code2);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok3;
    }
    if (code2 === null || code2 === 32 || code2 === 60 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return urlInside;
  }
  function emailAtext(code2) {
    if (code2 === 64) {
      effects.consume(code2);
      return emailAtSignOrDot;
    }
    if (asciiAtext(code2)) {
      effects.consume(code2);
      return emailAtext;
    }
    return nok(code2);
  }
  function emailAtSignOrDot(code2) {
    return asciiAlphanumeric(code2) ? emailLabel(code2) : nok(code2);
  }
  function emailLabel(code2) {
    if (code2 === 46) {
      effects.consume(code2);
      size = 0;
      return emailAtSignOrDot;
    }
    if (code2 === 62) {
      effects.exit("autolinkProtocol").type = "autolinkEmail";
      effects.enter("autolinkMarker");
      effects.consume(code2);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok3;
    }
    return emailValue(code2);
  }
  function emailValue(code2) {
    if ((code2 === 45 || asciiAlphanumeric(code2)) && size++ < 63) {
      const next = code2 === 45 ? emailValue : emailLabel;
      effects.consume(code2);
      return next;
    }
    return nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/blank-line.js
var blankLine = {
  partial: true,
  tokenize: tokenizeBlankLine
};
function tokenizeBlankLine(effects, ok3, nok) {
  return start;
  function start(code2) {
    return markdownSpace(code2) ? factorySpace(effects, after, "linePrefix")(code2) : after(code2);
  }
  function after(code2) {
    return code2 === null || markdownLineEnding(code2) ? ok3(code2) : nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/block-quote.js
var blockQuote = {
  continuation: {
    tokenize: tokenizeBlockQuoteContinuation
  },
  exit,
  name: "blockQuote",
  tokenize: tokenizeBlockQuoteStart
};
function tokenizeBlockQuoteStart(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    if (code2 === 62) {
      const state = self.containerState;
      if (!state.open) {
        effects.enter("blockQuote", {
          _container: true
        });
        state.open = true;
      }
      effects.enter("blockQuotePrefix");
      effects.enter("blockQuoteMarker");
      effects.consume(code2);
      effects.exit("blockQuoteMarker");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    if (markdownSpace(code2)) {
      effects.enter("blockQuotePrefixWhitespace");
      effects.consume(code2);
      effects.exit("blockQuotePrefixWhitespace");
      effects.exit("blockQuotePrefix");
      return ok3;
    }
    effects.exit("blockQuotePrefix");
    return ok3(code2);
  }
}
function tokenizeBlockQuoteContinuation(effects, ok3, nok) {
  const self = this;
  return contStart;
  function contStart(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, contBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
    }
    return contBefore(code2);
  }
  function contBefore(code2) {
    return effects.attempt(blockQuote, ok3, nok)(code2);
  }
}
function exit(effects) {
  effects.exit("blockQuote");
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/character-escape.js
var characterEscape = {
  name: "characterEscape",
  tokenize: tokenizeCharacterEscape
};
function tokenizeCharacterEscape(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.enter("characterEscape");
    effects.enter("escapeMarker");
    effects.consume(code2);
    effects.exit("escapeMarker");
    return inside;
  }
  function inside(code2) {
    if (asciiPunctuation(code2)) {
      effects.enter("characterEscapeValue");
      effects.consume(code2);
      effects.exit("characterEscapeValue");
      effects.exit("characterEscape");
      return ok3;
    }
    return nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/character-reference.js
var characterReference = {
  name: "characterReference",
  tokenize: tokenizeCharacterReference
};
function tokenizeCharacterReference(effects, ok3, nok) {
  const self = this;
  let size = 0;
  let max;
  let test;
  return start;
  function start(code2) {
    effects.enter("characterReference");
    effects.enter("characterReferenceMarker");
    effects.consume(code2);
    effects.exit("characterReferenceMarker");
    return open;
  }
  function open(code2) {
    if (code2 === 35) {
      effects.enter("characterReferenceMarkerNumeric");
      effects.consume(code2);
      effects.exit("characterReferenceMarkerNumeric");
      return numeric;
    }
    effects.enter("characterReferenceValue");
    max = 31;
    test = asciiAlphanumeric;
    return value(code2);
  }
  function numeric(code2) {
    if (code2 === 88 || code2 === 120) {
      effects.enter("characterReferenceMarkerHexadecimal");
      effects.consume(code2);
      effects.exit("characterReferenceMarkerHexadecimal");
      effects.enter("characterReferenceValue");
      max = 6;
      test = asciiHexDigit;
      return value;
    }
    effects.enter("characterReferenceValue");
    max = 7;
    test = asciiDigit;
    return value(code2);
  }
  function value(code2) {
    if (code2 === 59 && size) {
      const token = effects.exit("characterReferenceValue");
      if (test === asciiAlphanumeric && !decodeNamedCharacterReference(self.sliceSerialize(token))) {
        return nok(code2);
      }
      effects.enter("characterReferenceMarker");
      effects.consume(code2);
      effects.exit("characterReferenceMarker");
      effects.exit("characterReference");
      return ok3;
    }
    if (test(code2) && size++ < max) {
      effects.consume(code2);
      return value;
    }
    return nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/code-fenced.js
var nonLazyContinuation = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation
};
var codeFenced = {
  concrete: true,
  name: "codeFenced",
  tokenize: tokenizeCodeFenced
};
function tokenizeCodeFenced(effects, ok3, nok) {
  const self = this;
  const closeStart = {
    partial: true,
    tokenize: tokenizeCloseStart
  };
  let initialPrefix = 0;
  let sizeOpen = 0;
  let marker;
  return start;
  function start(code2) {
    return beforeSequenceOpen(code2);
  }
  function beforeSequenceOpen(code2) {
    const tail = self.events[self.events.length - 1];
    initialPrefix = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
    marker = code2;
    effects.enter("codeFenced");
    effects.enter("codeFencedFence");
    effects.enter("codeFencedFenceSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === marker) {
      sizeOpen++;
      effects.consume(code2);
      return sequenceOpen;
    }
    if (sizeOpen < 3) {
      return nok(code2);
    }
    effects.exit("codeFencedFenceSequence");
    return markdownSpace(code2) ? factorySpace(effects, infoBefore, "whitespace")(code2) : infoBefore(code2);
  }
  function infoBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFencedFence");
      return self.interrupt ? ok3(code2) : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code2);
    }
    effects.enter("codeFencedFenceInfo");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return info(code2);
  }
  function info(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return infoBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return factorySpace(effects, metaBefore, "whitespace")(code2);
    }
    if (code2 === 96 && code2 === marker) {
      return nok(code2);
    }
    effects.consume(code2);
    return info;
  }
  function metaBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return infoBefore(code2);
    }
    effects.enter("codeFencedFenceMeta");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return meta(code2);
  }
  function meta(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceMeta");
      return infoBefore(code2);
    }
    if (code2 === 96 && code2 === marker) {
      return nok(code2);
    }
    effects.consume(code2);
    return meta;
  }
  function atNonLazyBreak(code2) {
    return effects.attempt(closeStart, after, contentBefore)(code2);
  }
  function contentBefore(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return contentStart;
  }
  function contentStart(code2) {
    return initialPrefix > 0 && markdownSpace(code2) ? factorySpace(effects, beforeContentChunk, "linePrefix", initialPrefix + 1)(code2) : beforeContentChunk(code2);
  }
  function beforeContentChunk(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code2);
    }
    effects.enter("codeFlowValue");
    return contentChunk(code2);
  }
  function contentChunk(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFlowValue");
      return beforeContentChunk(code2);
    }
    effects.consume(code2);
    return contentChunk;
  }
  function after(code2) {
    effects.exit("codeFenced");
    return ok3(code2);
  }
  function tokenizeCloseStart(effects2, ok4, nok2) {
    let size = 0;
    return startBefore;
    function startBefore(code2) {
      effects2.enter("lineEnding");
      effects2.consume(code2);
      effects2.exit("lineEnding");
      return start2;
    }
    function start2(code2) {
      effects2.enter("codeFencedFence");
      return markdownSpace(code2) ? factorySpace(effects2, beforeSequenceClose, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2) : beforeSequenceClose(code2);
    }
    function beforeSequenceClose(code2) {
      if (code2 === marker) {
        effects2.enter("codeFencedFenceSequence");
        return sequenceClose(code2);
      }
      return nok2(code2);
    }
    function sequenceClose(code2) {
      if (code2 === marker) {
        size++;
        effects2.consume(code2);
        return sequenceClose;
      }
      if (size >= sizeOpen) {
        effects2.exit("codeFencedFenceSequence");
        return markdownSpace(code2) ? factorySpace(effects2, sequenceCloseAfter, "whitespace")(code2) : sequenceCloseAfter(code2);
      }
      return nok2(code2);
    }
    function sequenceCloseAfter(code2) {
      if (code2 === null || markdownLineEnding(code2)) {
        effects2.exit("codeFencedFence");
        return ok4(code2);
      }
      return nok2(code2);
    }
  }
}
function tokenizeNonLazyContinuation(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return lineStart;
  }
  function lineStart(code2) {
    return self.parser.lazy[self.now().line] ? nok(code2) : ok3(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/code-indented.js
var codeIndented = {
  name: "codeIndented",
  tokenize: tokenizeCodeIndented
};
var furtherStart = {
  partial: true,
  tokenize: tokenizeFurtherStart
};
function tokenizeCodeIndented(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    effects.enter("codeIndented");
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code2);
  }
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? atBreak(code2) : nok(code2);
  }
  function atBreak(code2) {
    if (code2 === null) {
      return after(code2);
    }
    if (markdownLineEnding(code2)) {
      return effects.attempt(furtherStart, atBreak, after)(code2);
    }
    effects.enter("codeFlowValue");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("codeFlowValue");
      return atBreak(code2);
    }
    effects.consume(code2);
    return inside;
  }
  function after(code2) {
    effects.exit("codeIndented");
    return ok3(code2);
  }
}
function tokenizeFurtherStart(effects, ok3, nok) {
  const self = this;
  return furtherStart2;
  function furtherStart2(code2) {
    if (self.parser.lazy[self.now().line]) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return furtherStart2;
    }
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code2);
  }
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? ok3(code2) : markdownLineEnding(code2) ? furtherStart2(code2) : nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/code-text.js
var codeText = {
  name: "codeText",
  previous,
  resolve: resolveCodeText,
  tokenize: tokenizeCodeText
};
function resolveCodeText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index2;
  let enter;
  if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
    index2 = headEnterIndex;
    while (++index2 < tailExitIndex) {
      if (events[index2][1].type === "codeTextData") {
        events[headEnterIndex][1].type = "codeTextPadding";
        events[tailExitIndex][1].type = "codeTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }
  index2 = headEnterIndex - 1;
  tailExitIndex++;
  while (++index2 <= tailExitIndex) {
    if (enter === void 0) {
      if (index2 !== tailExitIndex && events[index2][1].type !== "lineEnding") {
        enter = index2;
      }
    } else if (index2 === tailExitIndex || events[index2][1].type === "lineEnding") {
      events[enter][1].type = "codeTextData";
      if (index2 !== enter + 2) {
        events[enter][1].end = events[index2 - 1][1].end;
        events.splice(enter + 2, index2 - enter - 2);
        tailExitIndex -= index2 - enter - 2;
        index2 = enter + 2;
      }
      enter = void 0;
    }
  }
  return events;
}
function previous(code2) {
  return code2 !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function tokenizeCodeText(effects, ok3, nok) {
  const self = this;
  let sizeOpen = 0;
  let size;
  let token;
  return start;
  function start(code2) {
    effects.enter("codeText");
    effects.enter("codeTextSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === 96) {
      effects.consume(code2);
      sizeOpen++;
      return sequenceOpen;
    }
    effects.exit("codeTextSequence");
    return between(code2);
  }
  function between(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 32) {
      effects.enter("space");
      effects.consume(code2);
      effects.exit("space");
      return between;
    }
    if (code2 === 96) {
      token = effects.enter("codeTextSequence");
      size = 0;
      return sequenceClose(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return between;
    }
    effects.enter("codeTextData");
    return data(code2);
  }
  function data(code2) {
    if (code2 === null || code2 === 32 || code2 === 96 || markdownLineEnding(code2)) {
      effects.exit("codeTextData");
      return between(code2);
    }
    effects.consume(code2);
    return data;
  }
  function sequenceClose(code2) {
    if (code2 === 96) {
      effects.consume(code2);
      size++;
      return sequenceClose;
    }
    if (size === sizeOpen) {
      effects.exit("codeTextSequence");
      effects.exit("codeText");
      return ok3(code2);
    }
    token.type = "codeTextData";
    return data(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-subtokenize@2.1.0/node_modules/micromark-util-subtokenize/lib/splice-buffer.js
var SpliceBuffer = class {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(initial) {
    this.left = initial ? [...initial] : [];
    this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(index2) {
    if (index2 < 0 || index2 >= this.left.length + this.right.length) {
      throw new RangeError("Cannot access index `" + index2 + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    }
    if (index2 < this.left.length) return this.left[index2];
    return this.right[this.right.length - index2 + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    this.setCursor(0);
    return this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(start, end) {
    const stop = end === null || end === void 0 ? Number.POSITIVE_INFINITY : end;
    if (stop < this.left.length) {
      return this.left.slice(start, stop);
    }
    if (start > this.left.length) {
      return this.right.slice(this.right.length - stop + this.left.length, this.right.length - start + this.left.length).reverse();
    }
    return this.left.slice(start).concat(this.right.slice(this.right.length - stop + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(start, deleteCount, items) {
    const count = deleteCount || 0;
    this.setCursor(Math.trunc(start));
    const removed = this.right.splice(this.right.length - count, Number.POSITIVE_INFINITY);
    if (items) chunkedPush(this.left, items);
    return removed.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    this.setCursor(Number.POSITIVE_INFINITY);
    return this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(item) {
    this.setCursor(Number.POSITIVE_INFINITY);
    this.left.push(item);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(items) {
    this.setCursor(Number.POSITIVE_INFINITY);
    chunkedPush(this.left, items);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(item) {
    this.setCursor(0);
    this.right.push(item);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(items) {
    this.setCursor(0);
    chunkedPush(this.right, items.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(n) {
    if (n === this.left.length || n > this.left.length && this.right.length === 0 || n < 0 && this.left.length === 0) return;
    if (n < this.left.length) {
      const removed = this.left.splice(n, Number.POSITIVE_INFINITY);
      chunkedPush(this.right, removed.reverse());
    } else {
      const removed = this.right.splice(this.left.length + this.right.length - n, Number.POSITIVE_INFINITY);
      chunkedPush(this.left, removed.reverse());
    }
  }
};
function chunkedPush(list2, right) {
  let chunkStart = 0;
  if (right.length < 1e4) {
    list2.push(...right);
  } else {
    while (chunkStart < right.length) {
      list2.push(...right.slice(chunkStart, chunkStart + 1e4));
      chunkStart += 1e4;
    }
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-subtokenize@2.1.0/node_modules/micromark-util-subtokenize/index.js
function subtokenize(eventsArray) {
  const jumps = {};
  let index2 = -1;
  let event;
  let lineIndex;
  let otherIndex;
  let otherEvent;
  let parameters;
  let subevents;
  let more;
  const events = new SpliceBuffer(eventsArray);
  while (++index2 < events.length) {
    while (index2 in jumps) {
      index2 = jumps[index2];
    }
    event = events.get(index2);
    if (index2 && event[1].type === "chunkFlow" && events.get(index2 - 1)[1].type === "listItemPrefix") {
      subevents = event[1]._tokenizer.events;
      otherIndex = 0;
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "lineEndingBlank") {
        otherIndex += 2;
      }
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "content") {
        while (++otherIndex < subevents.length) {
          if (subevents[otherIndex][1].type === "content") {
            break;
          }
          if (subevents[otherIndex][1].type === "chunkText") {
            subevents[otherIndex][1]._isInFirstContentOfListItem = true;
            otherIndex++;
          }
        }
      }
    }
    if (event[0] === "enter") {
      if (event[1].contentType) {
        Object.assign(jumps, subcontent(events, index2));
        index2 = jumps[index2];
        more = true;
      }
    } else if (event[1]._container) {
      otherIndex = index2;
      lineIndex = void 0;
      while (otherIndex--) {
        otherEvent = events.get(otherIndex);
        if (otherEvent[1].type === "lineEnding" || otherEvent[1].type === "lineEndingBlank") {
          if (otherEvent[0] === "enter") {
            if (lineIndex) {
              events.get(lineIndex)[1].type = "lineEndingBlank";
            }
            otherEvent[1].type = "lineEnding";
            lineIndex = otherIndex;
          }
        } else if (otherEvent[1].type === "linePrefix" || otherEvent[1].type === "listItemIndent") {
        } else {
          break;
        }
      }
      if (lineIndex) {
        event[1].end = {
          ...events.get(lineIndex)[1].start
        };
        parameters = events.slice(lineIndex, index2);
        parameters.unshift(event);
        events.splice(lineIndex, index2 - lineIndex + 1, parameters);
      }
    }
  }
  splice(eventsArray, 0, Number.POSITIVE_INFINITY, events.slice(0));
  return !more;
}
function subcontent(events, eventIndex) {
  const token = events.get(eventIndex)[1];
  const context = events.get(eventIndex)[2];
  let startPosition = eventIndex - 1;
  const startPositions = [];
  let tokenizer = token._tokenizer;
  if (!tokenizer) {
    tokenizer = context.parser[token.contentType](token.start);
    if (token._contentTypeTextTrailing) {
      tokenizer._contentTypeTextTrailing = true;
    }
  }
  const childEvents = tokenizer.events;
  const jumps = [];
  const gaps = {};
  let stream;
  let previous3;
  let index2 = -1;
  let current = token;
  let adjust = 0;
  let start = 0;
  const breaks = [start];
  while (current) {
    while (events.get(++startPosition)[1] !== current) {
    }
    startPositions.push(startPosition);
    if (!current._tokenizer) {
      stream = context.sliceStream(current);
      if (!current.next) {
        stream.push(null);
      }
      if (previous3) {
        tokenizer.defineSkip(current.start);
      }
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = true;
      }
      tokenizer.write(stream);
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = void 0;
      }
    }
    previous3 = current;
    current = current.next;
  }
  current = token;
  while (++index2 < childEvents.length) {
    if (
      // Find a void token that includes a break.
      childEvents[index2][0] === "exit" && childEvents[index2 - 1][0] === "enter" && childEvents[index2][1].type === childEvents[index2 - 1][1].type && childEvents[index2][1].start.line !== childEvents[index2][1].end.line
    ) {
      start = index2 + 1;
      breaks.push(start);
      current._tokenizer = void 0;
      current.previous = void 0;
      current = current.next;
    }
  }
  tokenizer.events = [];
  if (current) {
    current._tokenizer = void 0;
    current.previous = void 0;
  } else {
    breaks.pop();
  }
  index2 = breaks.length;
  while (index2--) {
    const slice = childEvents.slice(breaks[index2], breaks[index2 + 1]);
    const start2 = startPositions.pop();
    jumps.push([start2, start2 + slice.length - 1]);
    events.splice(start2, 2, slice);
  }
  jumps.reverse();
  index2 = -1;
  while (++index2 < jumps.length) {
    gaps[adjust + jumps[index2][0]] = adjust + jumps[index2][1];
    adjust += jumps[index2][1] - jumps[index2][0] - 1;
  }
  return gaps;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/content.js
var content2 = {
  resolve: resolveContent,
  tokenize: tokenizeContent
};
var continuationConstruct = {
  partial: true,
  tokenize: tokenizeContinuation
};
function resolveContent(events) {
  subtokenize(events);
  return events;
}
function tokenizeContent(effects, ok3) {
  let previous3;
  return chunkStart;
  function chunkStart(code2) {
    effects.enter("content");
    previous3 = effects.enter("chunkContent", {
      contentType: "content"
    });
    return chunkInside(code2);
  }
  function chunkInside(code2) {
    if (code2 === null) {
      return contentEnd(code2);
    }
    if (markdownLineEnding(code2)) {
      return effects.check(continuationConstruct, contentContinue, contentEnd)(code2);
    }
    effects.consume(code2);
    return chunkInside;
  }
  function contentEnd(code2) {
    effects.exit("chunkContent");
    effects.exit("content");
    return ok3(code2);
  }
  function contentContinue(code2) {
    effects.consume(code2);
    effects.exit("chunkContent");
    previous3.next = effects.enter("chunkContent", {
      contentType: "content",
      previous: previous3
    });
    previous3 = previous3.next;
    return chunkInside;
  }
}
function tokenizeContinuation(effects, ok3, nok) {
  const self = this;
  return startLookahead;
  function startLookahead(code2) {
    effects.exit("chunkContent");
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, prefixed, "linePrefix");
  }
  function prefixed(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return nok(code2);
    }
    const tail = self.events[self.events.length - 1];
    if (!self.parser.constructs.disable.null.includes("codeIndented") && tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4) {
      return ok3(code2);
    }
    return effects.interrupt(self.parser.constructs.flow, nok, ok3)(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-factory-destination@2.0.1/node_modules/micromark-factory-destination/index.js
function factoryDestination(effects, ok3, nok, type, literalType, literalMarkerType, rawType, stringType, max) {
  const limit = max || Number.POSITIVE_INFINITY;
  let balance = 0;
  return start;
  function start(code2) {
    if (code2 === 60) {
      effects.enter(type);
      effects.enter(literalType);
      effects.enter(literalMarkerType);
      effects.consume(code2);
      effects.exit(literalMarkerType);
      return enclosedBefore;
    }
    if (code2 === null || code2 === 32 || code2 === 41 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.enter(type);
    effects.enter(rawType);
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return raw(code2);
  }
  function enclosedBefore(code2) {
    if (code2 === 62) {
      effects.enter(literalMarkerType);
      effects.consume(code2);
      effects.exit(literalMarkerType);
      effects.exit(literalType);
      effects.exit(type);
      return ok3;
    }
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return enclosed(code2);
  }
  function enclosed(code2) {
    if (code2 === 62) {
      effects.exit("chunkString");
      effects.exit(stringType);
      return enclosedBefore(code2);
    }
    if (code2 === null || code2 === 60 || markdownLineEnding(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? enclosedEscape : enclosed;
  }
  function enclosedEscape(code2) {
    if (code2 === 60 || code2 === 62 || code2 === 92) {
      effects.consume(code2);
      return enclosed;
    }
    return enclosed(code2);
  }
  function raw(code2) {
    if (!balance && (code2 === null || code2 === 41 || markdownLineEndingOrSpace(code2))) {
      effects.exit("chunkString");
      effects.exit(stringType);
      effects.exit(rawType);
      effects.exit(type);
      return ok3(code2);
    }
    if (balance < limit && code2 === 40) {
      effects.consume(code2);
      balance++;
      return raw;
    }
    if (code2 === 41) {
      effects.consume(code2);
      balance--;
      return raw;
    }
    if (code2 === null || code2 === 32 || code2 === 40 || asciiControl(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? rawEscape : raw;
  }
  function rawEscape(code2) {
    if (code2 === 40 || code2 === 41 || code2 === 92) {
      effects.consume(code2);
      return raw;
    }
    return raw(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-factory-label@2.0.1/node_modules/micromark-factory-label/index.js
function factoryLabel(effects, ok3, nok, type, markerType, stringType) {
  const self = this;
  let size = 0;
  let seen;
  return start;
  function start(code2) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code2);
    effects.exit(markerType);
    effects.enter(stringType);
    return atBreak;
  }
  function atBreak(code2) {
    if (size > 999 || code2 === null || code2 === 91 || code2 === 93 && !seen || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    code2 === 94 && !size && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit(stringType);
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      effects.exit(type);
      return ok3;
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return atBreak;
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return labelInside(code2);
  }
  function labelInside(code2) {
    if (code2 === null || code2 === 91 || code2 === 93 || markdownLineEnding(code2) || size++ > 999) {
      effects.exit("chunkString");
      return atBreak(code2);
    }
    effects.consume(code2);
    if (!seen) seen = !markdownSpace(code2);
    return code2 === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return labelInside;
    }
    return labelInside(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-factory-title@2.0.1/node_modules/micromark-factory-title/index.js
function factoryTitle(effects, ok3, nok, type, markerType, stringType) {
  let marker;
  return start;
  function start(code2) {
    if (code2 === 34 || code2 === 39 || code2 === 40) {
      effects.enter(type);
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      marker = code2 === 40 ? 41 : code2;
      return begin;
    }
    return nok(code2);
  }
  function begin(code2) {
    if (code2 === marker) {
      effects.enter(markerType);
      effects.consume(code2);
      effects.exit(markerType);
      effects.exit(type);
      return ok3;
    }
    effects.enter(stringType);
    return atBreak(code2);
  }
  function atBreak(code2) {
    if (code2 === marker) {
      effects.exit(stringType);
      return begin(marker);
    }
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return factorySpace(effects, atBreak, "linePrefix");
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker || code2 === null || markdownLineEnding(code2)) {
      effects.exit("chunkString");
      return atBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? escape : inside;
  }
  function escape(code2) {
    if (code2 === marker || code2 === 92) {
      effects.consume(code2);
      return inside;
    }
    return inside(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-factory-whitespace@2.0.1/node_modules/micromark-factory-whitespace/index.js
function factoryWhitespace(effects, ok3) {
  let seen;
  return start;
  function start(code2) {
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      seen = true;
      return start;
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code2);
    }
    return ok3(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/definition.js
var definition = {
  name: "definition",
  tokenize: tokenizeDefinition
};
var titleBefore = {
  partial: true,
  tokenize: tokenizeTitleBefore
};
function tokenizeDefinition(effects, ok3, nok) {
  const self = this;
  let identifier;
  return start;
  function start(code2) {
    effects.enter("definition");
    return before(code2);
  }
  function before(code2) {
    return factoryLabel.call(
      self,
      effects,
      labelAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(code2);
  }
  function labelAfter(code2) {
    identifier = normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1));
    if (code2 === 58) {
      effects.enter("definitionMarker");
      effects.consume(code2);
      effects.exit("definitionMarker");
      return markerAfter;
    }
    return nok(code2);
  }
  function markerAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, destinationBefore)(code2) : destinationBefore(code2);
  }
  function destinationBefore(code2) {
    return factoryDestination(
      effects,
      destinationAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(code2);
  }
  function destinationAfter(code2) {
    return effects.attempt(titleBefore, after, after)(code2);
  }
  function after(code2) {
    return markdownSpace(code2) ? factorySpace(effects, afterWhitespace, "whitespace")(code2) : afterWhitespace(code2);
  }
  function afterWhitespace(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("definition");
      self.parser.defined.push(identifier);
      return ok3(code2);
    }
    return nok(code2);
  }
}
function tokenizeTitleBefore(effects, ok3, nok) {
  return titleBefore2;
  function titleBefore2(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, beforeMarker)(code2) : nok(code2);
  }
  function beforeMarker(code2) {
    return factoryTitle(effects, titleAfter, nok, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(code2);
  }
  function titleAfter(code2) {
    return markdownSpace(code2) ? factorySpace(effects, titleAfterOptionalWhitespace, "whitespace")(code2) : titleAfterOptionalWhitespace(code2);
  }
  function titleAfterOptionalWhitespace(code2) {
    return code2 === null || markdownLineEnding(code2) ? ok3(code2) : nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/hard-break-escape.js
var hardBreakEscape = {
  name: "hardBreakEscape",
  tokenize: tokenizeHardBreakEscape
};
function tokenizeHardBreakEscape(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.enter("hardBreakEscape");
    effects.consume(code2);
    return after;
  }
  function after(code2) {
    if (markdownLineEnding(code2)) {
      effects.exit("hardBreakEscape");
      return ok3(code2);
    }
    return nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/heading-atx.js
var headingAtx = {
  name: "headingAtx",
  resolve: resolveHeadingAtx,
  tokenize: tokenizeHeadingAtx
};
function resolveHeadingAtx(events, context) {
  let contentEnd = events.length - 2;
  let contentStart = 3;
  let content3;
  let text4;
  if (events[contentStart][1].type === "whitespace") {
    contentStart += 2;
  }
  if (contentEnd - 2 > contentStart && events[contentEnd][1].type === "whitespace") {
    contentEnd -= 2;
  }
  if (events[contentEnd][1].type === "atxHeadingSequence" && (contentStart === contentEnd - 1 || contentEnd - 4 > contentStart && events[contentEnd - 2][1].type === "whitespace")) {
    contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
  }
  if (contentEnd > contentStart) {
    content3 = {
      type: "atxHeadingText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end
    };
    text4 = {
      type: "chunkText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end,
      contentType: "text"
    };
    splice(events, contentStart, contentEnd - contentStart + 1, [["enter", content3, context], ["enter", text4, context], ["exit", text4, context], ["exit", content3, context]]);
  }
  return events;
}
function tokenizeHeadingAtx(effects, ok3, nok) {
  let size = 0;
  return start;
  function start(code2) {
    effects.enter("atxHeading");
    return before(code2);
  }
  function before(code2) {
    effects.enter("atxHeadingSequence");
    return sequenceOpen(code2);
  }
  function sequenceOpen(code2) {
    if (code2 === 35 && size++ < 6) {
      effects.consume(code2);
      return sequenceOpen;
    }
    if (code2 === null || markdownLineEndingOrSpace(code2)) {
      effects.exit("atxHeadingSequence");
      return atBreak(code2);
    }
    return nok(code2);
  }
  function atBreak(code2) {
    if (code2 === 35) {
      effects.enter("atxHeadingSequence");
      return sequenceFurther(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("atxHeading");
      return ok3(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, atBreak, "whitespace")(code2);
    }
    effects.enter("atxHeadingText");
    return data(code2);
  }
  function sequenceFurther(code2) {
    if (code2 === 35) {
      effects.consume(code2);
      return sequenceFurther;
    }
    effects.exit("atxHeadingSequence");
    return atBreak(code2);
  }
  function data(code2) {
    if (code2 === null || code2 === 35 || markdownLineEndingOrSpace(code2)) {
      effects.exit("atxHeadingText");
      return atBreak(code2);
    }
    effects.consume(code2);
    return data;
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-html-tag-name@2.0.1/node_modules/micromark-util-html-tag-name/index.js
var htmlBlockNames = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
];
var htmlRawNames = ["pre", "script", "style", "textarea"];

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/html-flow.js
var htmlFlow = {
  concrete: true,
  name: "htmlFlow",
  resolveTo: resolveToHtmlFlow,
  tokenize: tokenizeHtmlFlow
};
var blankLineBefore = {
  partial: true,
  tokenize: tokenizeBlankLineBefore
};
var nonLazyContinuationStart = {
  partial: true,
  tokenize: tokenizeNonLazyContinuationStart
};
function resolveToHtmlFlow(events) {
  let index2 = events.length;
  while (index2--) {
    if (events[index2][0] === "enter" && events[index2][1].type === "htmlFlow") {
      break;
    }
  }
  if (index2 > 1 && events[index2 - 2][1].type === "linePrefix") {
    events[index2][1].start = events[index2 - 2][1].start;
    events[index2 + 1][1].start = events[index2 - 2][1].start;
    events.splice(index2 - 2, 2);
  }
  return events;
}
function tokenizeHtmlFlow(effects, ok3, nok) {
  const self = this;
  let marker;
  let closingTag;
  let buffer;
  let index2;
  let markerB;
  return start;
  function start(code2) {
    return before(code2);
  }
  function before(code2) {
    effects.enter("htmlFlow");
    effects.enter("htmlFlowData");
    effects.consume(code2);
    return open;
  }
  function open(code2) {
    if (code2 === 33) {
      effects.consume(code2);
      return declarationOpen;
    }
    if (code2 === 47) {
      effects.consume(code2);
      closingTag = true;
      return tagCloseStart;
    }
    if (code2 === 63) {
      effects.consume(code2);
      marker = 3;
      return self.interrupt ? ok3 : continuationDeclarationInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      buffer = String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function declarationOpen(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      marker = 2;
      return commentOpenInside;
    }
    if (code2 === 91) {
      effects.consume(code2);
      marker = 5;
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      marker = 4;
      return self.interrupt ? ok3 : continuationDeclarationInside;
    }
    return nok(code2);
  }
  function commentOpenInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return self.interrupt ? ok3 : continuationDeclarationInside;
    }
    return nok(code2);
  }
  function cdataOpenInside(code2) {
    const value = "CDATA[";
    if (code2 === value.charCodeAt(index2++)) {
      effects.consume(code2);
      if (index2 === value.length) {
        return self.interrupt ? ok3 : continuation;
      }
      return cdataOpenInside;
    }
    return nok(code2);
  }
  function tagCloseStart(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      buffer = String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function tagName(code2) {
    if (code2 === null || code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      const slash = code2 === 47;
      const name2 = buffer.toLowerCase();
      if (!slash && !closingTag && htmlRawNames.includes(name2)) {
        marker = 1;
        return self.interrupt ? ok3(code2) : continuation(code2);
      }
      if (htmlBlockNames.includes(buffer.toLowerCase())) {
        marker = 6;
        if (slash) {
          effects.consume(code2);
          return basicSelfClosing;
        }
        return self.interrupt ? ok3(code2) : continuation(code2);
      }
      marker = 7;
      return self.interrupt && !self.parser.lazy[self.now().line] ? nok(code2) : closingTag ? completeClosingTagAfter(code2) : completeAttributeNameBefore(code2);
    }
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      buffer += String.fromCharCode(code2);
      return tagName;
    }
    return nok(code2);
  }
  function basicSelfClosing(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return self.interrupt ? ok3 : continuation;
    }
    return nok(code2);
  }
  function completeClosingTagAfter(code2) {
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeClosingTagAfter;
    }
    return completeEnd(code2);
  }
  function completeAttributeNameBefore(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      return completeEnd;
    }
    if (code2 === 58 || code2 === 95 || asciiAlpha(code2)) {
      effects.consume(code2);
      return completeAttributeName;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeNameBefore;
    }
    return completeEnd(code2);
  }
  function completeAttributeName(code2) {
    if (code2 === 45 || code2 === 46 || code2 === 58 || code2 === 95 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return completeAttributeName;
    }
    return completeAttributeNameAfter(code2);
  }
  function completeAttributeNameAfter(code2) {
    if (code2 === 61) {
      effects.consume(code2);
      return completeAttributeValueBefore;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeNameAfter;
    }
    return completeAttributeNameBefore(code2);
  }
  function completeAttributeValueBefore(code2) {
    if (code2 === null || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 34 || code2 === 39) {
      effects.consume(code2);
      markerB = code2;
      return completeAttributeValueQuoted;
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAttributeValueBefore;
    }
    return completeAttributeValueUnquoted(code2);
  }
  function completeAttributeValueQuoted(code2) {
    if (code2 === markerB) {
      effects.consume(code2);
      markerB = null;
      return completeAttributeValueQuotedAfter;
    }
    if (code2 === null || markdownLineEnding(code2)) {
      return nok(code2);
    }
    effects.consume(code2);
    return completeAttributeValueQuoted;
  }
  function completeAttributeValueUnquoted(code2) {
    if (code2 === null || code2 === 34 || code2 === 39 || code2 === 47 || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96 || markdownLineEndingOrSpace(code2)) {
      return completeAttributeNameAfter(code2);
    }
    effects.consume(code2);
    return completeAttributeValueUnquoted;
  }
  function completeAttributeValueQuotedAfter(code2) {
    if (code2 === 47 || code2 === 62 || markdownSpace(code2)) {
      return completeAttributeNameBefore(code2);
    }
    return nok(code2);
  }
  function completeEnd(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return completeAfter;
    }
    return nok(code2);
  }
  function completeAfter(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return continuation(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return completeAfter;
    }
    return nok(code2);
  }
  function continuation(code2) {
    if (code2 === 45 && marker === 2) {
      effects.consume(code2);
      return continuationCommentInside;
    }
    if (code2 === 60 && marker === 1) {
      effects.consume(code2);
      return continuationRawTagOpen;
    }
    if (code2 === 62 && marker === 4) {
      effects.consume(code2);
      return continuationClose;
    }
    if (code2 === 63 && marker === 3) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    if (code2 === 93 && marker === 5) {
      effects.consume(code2);
      return continuationCdataInside;
    }
    if (markdownLineEnding(code2) && (marker === 6 || marker === 7)) {
      effects.exit("htmlFlowData");
      return effects.check(blankLineBefore, continuationAfter, continuationStart)(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("htmlFlowData");
      return continuationStart(code2);
    }
    effects.consume(code2);
    return continuation;
  }
  function continuationStart(code2) {
    return effects.check(nonLazyContinuationStart, continuationStartNonLazy, continuationAfter)(code2);
  }
  function continuationStartNonLazy(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return continuationBefore;
  }
  function continuationBefore(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      return continuationStart(code2);
    }
    effects.enter("htmlFlowData");
    return continuation(code2);
  }
  function continuationCommentInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationRawTagOpen(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      buffer = "";
      return continuationRawEndTag;
    }
    return continuation(code2);
  }
  function continuationRawEndTag(code2) {
    if (code2 === 62) {
      const name2 = buffer.toLowerCase();
      if (htmlRawNames.includes(name2)) {
        effects.consume(code2);
        return continuationClose;
      }
      return continuation(code2);
    }
    if (asciiAlpha(code2) && buffer.length < 8) {
      effects.consume(code2);
      buffer += String.fromCharCode(code2);
      return continuationRawEndTag;
    }
    return continuation(code2);
  }
  function continuationCdataInside(code2) {
    if (code2 === 93) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationDeclarationInside(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      return continuationClose;
    }
    if (code2 === 45 && marker === 2) {
      effects.consume(code2);
      return continuationDeclarationInside;
    }
    return continuation(code2);
  }
  function continuationClose(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("htmlFlowData");
      return continuationAfter(code2);
    }
    effects.consume(code2);
    return continuationClose;
  }
  function continuationAfter(code2) {
    effects.exit("htmlFlow");
    return ok3(code2);
  }
}
function tokenizeNonLazyContinuationStart(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    if (markdownLineEnding(code2)) {
      effects.enter("lineEnding");
      effects.consume(code2);
      effects.exit("lineEnding");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    return self.parser.lazy[self.now().line] ? nok(code2) : ok3(code2);
  }
}
function tokenizeBlankLineBefore(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return effects.attempt(blankLine, ok3, nok);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/html-text.js
var htmlText = {
  name: "htmlText",
  tokenize: tokenizeHtmlText
};
function tokenizeHtmlText(effects, ok3, nok) {
  const self = this;
  let marker;
  let index2;
  let returnState;
  return start;
  function start(code2) {
    effects.enter("htmlText");
    effects.enter("htmlTextData");
    effects.consume(code2);
    return open;
  }
  function open(code2) {
    if (code2 === 33) {
      effects.consume(code2);
      return declarationOpen;
    }
    if (code2 === 47) {
      effects.consume(code2);
      return tagCloseStart;
    }
    if (code2 === 63) {
      effects.consume(code2);
      return instruction;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return tagOpen;
    }
    return nok(code2);
  }
  function declarationOpen(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentOpenInside;
    }
    if (code2 === 91) {
      effects.consume(code2);
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return declaration;
    }
    return nok(code2);
  }
  function commentOpenInside(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentEnd;
    }
    return nok(code2);
  }
  function comment(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 45) {
      effects.consume(code2);
      return commentClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = comment;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return comment;
  }
  function commentClose(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return commentEnd;
    }
    return comment(code2);
  }
  function commentEnd(code2) {
    return code2 === 62 ? end(code2) : code2 === 45 ? commentClose(code2) : comment(code2);
  }
  function cdataOpenInside(code2) {
    const value = "CDATA[";
    if (code2 === value.charCodeAt(index2++)) {
      effects.consume(code2);
      return index2 === value.length ? cdata : cdataOpenInside;
    }
    return nok(code2);
  }
  function cdata(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.consume(code2);
      return cdataClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = cdata;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return cdata;
  }
  function cdataClose(code2) {
    if (code2 === 93) {
      effects.consume(code2);
      return cdataEnd;
    }
    return cdata(code2);
  }
  function cdataEnd(code2) {
    if (code2 === 62) {
      return end(code2);
    }
    if (code2 === 93) {
      effects.consume(code2);
      return cdataEnd;
    }
    return cdata(code2);
  }
  function declaration(code2) {
    if (code2 === null || code2 === 62) {
      return end(code2);
    }
    if (markdownLineEnding(code2)) {
      returnState = declaration;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return declaration;
  }
  function instruction(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (code2 === 63) {
      effects.consume(code2);
      return instructionClose;
    }
    if (markdownLineEnding(code2)) {
      returnState = instruction;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return instruction;
  }
  function instructionClose(code2) {
    return code2 === 62 ? end(code2) : instruction(code2);
  }
  function tagCloseStart(code2) {
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return tagClose;
    }
    return nok(code2);
  }
  function tagClose(code2) {
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagClose;
    }
    return tagCloseBetween(code2);
  }
  function tagCloseBetween(code2) {
    if (markdownLineEnding(code2)) {
      returnState = tagCloseBetween;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagCloseBetween;
    }
    return end(code2);
  }
  function tagOpen(code2) {
    if (code2 === 45 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagOpen;
    }
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    return nok(code2);
  }
  function tagOpenBetween(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      return end;
    }
    if (code2 === 58 || code2 === 95 || asciiAlpha(code2)) {
      effects.consume(code2);
      return tagOpenAttributeName;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenBetween;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenBetween;
    }
    return end(code2);
  }
  function tagOpenAttributeName(code2) {
    if (code2 === 45 || code2 === 46 || code2 === 58 || code2 === 95 || asciiAlphanumeric(code2)) {
      effects.consume(code2);
      return tagOpenAttributeName;
    }
    return tagOpenAttributeNameAfter(code2);
  }
  function tagOpenAttributeNameAfter(code2) {
    if (code2 === 61) {
      effects.consume(code2);
      return tagOpenAttributeValueBefore;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeNameAfter;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenAttributeNameAfter;
    }
    return tagOpenBetween(code2);
  }
  function tagOpenAttributeValueBefore(code2) {
    if (code2 === null || code2 === 60 || code2 === 61 || code2 === 62 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 34 || code2 === 39) {
      effects.consume(code2);
      marker = code2;
      return tagOpenAttributeValueQuoted;
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeValueBefore;
      return lineEndingBefore(code2);
    }
    if (markdownSpace(code2)) {
      effects.consume(code2);
      return tagOpenAttributeValueBefore;
    }
    effects.consume(code2);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuoted(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      marker = void 0;
      return tagOpenAttributeValueQuotedAfter;
    }
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      returnState = tagOpenAttributeValueQuoted;
      return lineEndingBefore(code2);
    }
    effects.consume(code2);
    return tagOpenAttributeValueQuoted;
  }
  function tagOpenAttributeValueUnquoted(code2) {
    if (code2 === null || code2 === 34 || code2 === 39 || code2 === 60 || code2 === 61 || code2 === 96) {
      return nok(code2);
    }
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    effects.consume(code2);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuotedAfter(code2) {
    if (code2 === 47 || code2 === 62 || markdownLineEndingOrSpace(code2)) {
      return tagOpenBetween(code2);
    }
    return nok(code2);
  }
  function end(code2) {
    if (code2 === 62) {
      effects.consume(code2);
      effects.exit("htmlTextData");
      effects.exit("htmlText");
      return ok3;
    }
    return nok(code2);
  }
  function lineEndingBefore(code2) {
    effects.exit("htmlTextData");
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return lineEndingAfter;
  }
  function lineEndingAfter(code2) {
    return markdownSpace(code2) ? factorySpace(effects, lineEndingAfterPrefix, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2) : lineEndingAfterPrefix(code2);
  }
  function lineEndingAfterPrefix(code2) {
    effects.enter("htmlTextData");
    return returnState(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/label-end.js
var labelEnd = {
  name: "labelEnd",
  resolveAll: resolveAllLabelEnd,
  resolveTo: resolveToLabelEnd,
  tokenize: tokenizeLabelEnd
};
var resourceConstruct = {
  tokenize: tokenizeResource
};
var referenceFullConstruct = {
  tokenize: tokenizeReferenceFull
};
var referenceCollapsedConstruct = {
  tokenize: tokenizeReferenceCollapsed
};
function resolveAllLabelEnd(events) {
  let index2 = -1;
  const newEvents = [];
  while (++index2 < events.length) {
    const token = events[index2][1];
    newEvents.push(events[index2]);
    if (token.type === "labelImage" || token.type === "labelLink" || token.type === "labelEnd") {
      const offset = token.type === "labelImage" ? 4 : 2;
      token.type = "data";
      index2 += offset;
    }
  }
  if (events.length !== newEvents.length) {
    splice(events, 0, events.length, newEvents);
  }
  return events;
}
function resolveToLabelEnd(events, context) {
  let index2 = events.length;
  let offset = 0;
  let token;
  let open;
  let close;
  let media;
  while (index2--) {
    token = events[index2][1];
    if (open) {
      if (token.type === "link" || token.type === "labelLink" && token._inactive) {
        break;
      }
      if (events[index2][0] === "enter" && token.type === "labelLink") {
        token._inactive = true;
      }
    } else if (close) {
      if (events[index2][0] === "enter" && (token.type === "labelImage" || token.type === "labelLink") && !token._balanced) {
        open = index2;
        if (token.type !== "labelLink") {
          offset = 2;
          break;
        }
      }
    } else if (token.type === "labelEnd") {
      close = index2;
    }
  }
  const group = {
    type: events[open][1].type === "labelLink" ? "link" : "image",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  const label = {
    type: "label",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[close][1].end
    }
  };
  const text4 = {
    type: "labelText",
    start: {
      ...events[open + offset + 2][1].end
    },
    end: {
      ...events[close - 2][1].start
    }
  };
  media = [["enter", group, context], ["enter", label, context]];
  media = push(media, events.slice(open + 1, open + offset + 3));
  media = push(media, [["enter", text4, context]]);
  media = push(media, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + offset + 4, close - 3), context));
  media = push(media, [["exit", text4, context], events[close - 2], events[close - 1], ["exit", label, context]]);
  media = push(media, events.slice(close + 1));
  media = push(media, [["exit", group, context]]);
  splice(events, open, events.length, media);
  return events;
}
function tokenizeLabelEnd(effects, ok3, nok) {
  const self = this;
  let index2 = self.events.length;
  let labelStart;
  let defined;
  while (index2--) {
    if ((self.events[index2][1].type === "labelImage" || self.events[index2][1].type === "labelLink") && !self.events[index2][1]._balanced) {
      labelStart = self.events[index2][1];
      break;
    }
  }
  return start;
  function start(code2) {
    if (!labelStart) {
      return nok(code2);
    }
    if (labelStart._inactive) {
      return labelEndNok(code2);
    }
    defined = self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize({
      start: labelStart.end,
      end: self.now()
    })));
    effects.enter("labelEnd");
    effects.enter("labelMarker");
    effects.consume(code2);
    effects.exit("labelMarker");
    effects.exit("labelEnd");
    return after;
  }
  function after(code2) {
    if (code2 === 40) {
      return effects.attempt(resourceConstruct, labelEndOk, defined ? labelEndOk : labelEndNok)(code2);
    }
    if (code2 === 91) {
      return effects.attempt(referenceFullConstruct, labelEndOk, defined ? referenceNotFull : labelEndNok)(code2);
    }
    return defined ? labelEndOk(code2) : labelEndNok(code2);
  }
  function referenceNotFull(code2) {
    return effects.attempt(referenceCollapsedConstruct, labelEndOk, labelEndNok)(code2);
  }
  function labelEndOk(code2) {
    return ok3(code2);
  }
  function labelEndNok(code2) {
    labelStart._balanced = true;
    return nok(code2);
  }
}
function tokenizeResource(effects, ok3, nok) {
  return resourceStart;
  function resourceStart(code2) {
    effects.enter("resource");
    effects.enter("resourceMarker");
    effects.consume(code2);
    effects.exit("resourceMarker");
    return resourceBefore;
  }
  function resourceBefore(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceOpen)(code2) : resourceOpen(code2);
  }
  function resourceOpen(code2) {
    if (code2 === 41) {
      return resourceEnd(code2);
    }
    return factoryDestination(effects, resourceDestinationAfter, resourceDestinationMissing, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(code2);
  }
  function resourceDestinationAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceBetween)(code2) : resourceEnd(code2);
  }
  function resourceDestinationMissing(code2) {
    return nok(code2);
  }
  function resourceBetween(code2) {
    if (code2 === 34 || code2 === 39 || code2 === 40) {
      return factoryTitle(effects, resourceTitleAfter, nok, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(code2);
    }
    return resourceEnd(code2);
  }
  function resourceTitleAfter(code2) {
    return markdownLineEndingOrSpace(code2) ? factoryWhitespace(effects, resourceEnd)(code2) : resourceEnd(code2);
  }
  function resourceEnd(code2) {
    if (code2 === 41) {
      effects.enter("resourceMarker");
      effects.consume(code2);
      effects.exit("resourceMarker");
      effects.exit("resource");
      return ok3;
    }
    return nok(code2);
  }
}
function tokenizeReferenceFull(effects, ok3, nok) {
  const self = this;
  return referenceFull;
  function referenceFull(code2) {
    return factoryLabel.call(self, effects, referenceFullAfter, referenceFullMissing, "reference", "referenceMarker", "referenceString")(code2);
  }
  function referenceFullAfter(code2) {
    return self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1))) ? ok3(code2) : nok(code2);
  }
  function referenceFullMissing(code2) {
    return nok(code2);
  }
}
function tokenizeReferenceCollapsed(effects, ok3, nok) {
  return referenceCollapsedStart;
  function referenceCollapsedStart(code2) {
    effects.enter("reference");
    effects.enter("referenceMarker");
    effects.consume(code2);
    effects.exit("referenceMarker");
    return referenceCollapsedOpen;
  }
  function referenceCollapsedOpen(code2) {
    if (code2 === 93) {
      effects.enter("referenceMarker");
      effects.consume(code2);
      effects.exit("referenceMarker");
      effects.exit("reference");
      return ok3;
    }
    return nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/label-start-image.js
var labelStartImage = {
  name: "labelStartImage",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartImage
};
function tokenizeLabelStartImage(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    effects.enter("labelImage");
    effects.enter("labelImageMarker");
    effects.consume(code2);
    effects.exit("labelImageMarker");
    return open;
  }
  function open(code2) {
    if (code2 === 91) {
      effects.enter("labelMarker");
      effects.consume(code2);
      effects.exit("labelMarker");
      effects.exit("labelImage");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    return code2 === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code2) : ok3(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/label-start-link.js
var labelStartLink = {
  name: "labelStartLink",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartLink
};
function tokenizeLabelStartLink(effects, ok3, nok) {
  const self = this;
  return start;
  function start(code2) {
    effects.enter("labelLink");
    effects.enter("labelMarker");
    effects.consume(code2);
    effects.exit("labelMarker");
    effects.exit("labelLink");
    return after;
  }
  function after(code2) {
    return code2 === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code2) : ok3(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/line-ending.js
var lineEnding = {
  name: "lineEnding",
  tokenize: tokenizeLineEnding
};
function tokenizeLineEnding(effects, ok3) {
  return start;
  function start(code2) {
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    return factorySpace(effects, ok3, "linePrefix");
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/thematic-break.js
var thematicBreak = {
  name: "thematicBreak",
  tokenize: tokenizeThematicBreak
};
function tokenizeThematicBreak(effects, ok3, nok) {
  let size = 0;
  let marker;
  return start;
  function start(code2) {
    effects.enter("thematicBreak");
    return before(code2);
  }
  function before(code2) {
    marker = code2;
    return atBreak(code2);
  }
  function atBreak(code2) {
    if (code2 === marker) {
      effects.enter("thematicBreakSequence");
      return sequence(code2);
    }
    if (size >= 3 && (code2 === null || markdownLineEnding(code2))) {
      effects.exit("thematicBreak");
      return ok3(code2);
    }
    return nok(code2);
  }
  function sequence(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      size++;
      return sequence;
    }
    effects.exit("thematicBreakSequence");
    return markdownSpace(code2) ? factorySpace(effects, atBreak, "whitespace")(code2) : atBreak(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/list.js
var list = {
  continuation: {
    tokenize: tokenizeListContinuation
  },
  exit: tokenizeListEnd,
  name: "list",
  tokenize: tokenizeListStart
};
var listItemPrefixWhitespaceConstruct = {
  partial: true,
  tokenize: tokenizeListItemPrefixWhitespace
};
var indentConstruct = {
  partial: true,
  tokenize: tokenizeIndent
};
function tokenizeListStart(effects, ok3, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  let initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let size = 0;
  return start;
  function start(code2) {
    const kind = self.containerState.type || (code2 === 42 || code2 === 43 || code2 === 45 ? "listUnordered" : "listOrdered");
    if (kind === "listUnordered" ? !self.containerState.marker || code2 === self.containerState.marker : asciiDigit(code2)) {
      if (!self.containerState.type) {
        self.containerState.type = kind;
        effects.enter(kind, {
          _container: true
        });
      }
      if (kind === "listUnordered") {
        effects.enter("listItemPrefix");
        return code2 === 42 || code2 === 45 ? effects.check(thematicBreak, nok, atMarker)(code2) : atMarker(code2);
      }
      if (!self.interrupt || code2 === 49) {
        effects.enter("listItemPrefix");
        effects.enter("listItemValue");
        return inside(code2);
      }
    }
    return nok(code2);
  }
  function inside(code2) {
    if (asciiDigit(code2) && ++size < 10) {
      effects.consume(code2);
      return inside;
    }
    if ((!self.interrupt || size < 2) && (self.containerState.marker ? code2 === self.containerState.marker : code2 === 41 || code2 === 46)) {
      effects.exit("listItemValue");
      return atMarker(code2);
    }
    return nok(code2);
  }
  function atMarker(code2) {
    effects.enter("listItemMarker");
    effects.consume(code2);
    effects.exit("listItemMarker");
    self.containerState.marker = self.containerState.marker || code2;
    return effects.check(
      blankLine,
      // Can’t be empty when interrupting.
      self.interrupt ? nok : onBlank,
      effects.attempt(listItemPrefixWhitespaceConstruct, endOfPrefix, otherPrefix)
    );
  }
  function onBlank(code2) {
    self.containerState.initialBlankLine = true;
    initialSize++;
    return endOfPrefix(code2);
  }
  function otherPrefix(code2) {
    if (markdownSpace(code2)) {
      effects.enter("listItemPrefixWhitespace");
      effects.consume(code2);
      effects.exit("listItemPrefixWhitespace");
      return endOfPrefix;
    }
    return nok(code2);
  }
  function endOfPrefix(code2) {
    self.containerState.size = initialSize + self.sliceSerialize(effects.exit("listItemPrefix"), true).length;
    return ok3(code2);
  }
}
function tokenizeListContinuation(effects, ok3, nok) {
  const self = this;
  self.containerState._closeFlow = void 0;
  return effects.check(blankLine, onBlank, notBlank);
  function onBlank(code2) {
    self.containerState.furtherBlankLines = self.containerState.furtherBlankLines || self.containerState.initialBlankLine;
    return factorySpace(effects, ok3, "listItemIndent", self.containerState.size + 1)(code2);
  }
  function notBlank(code2) {
    if (self.containerState.furtherBlankLines || !markdownSpace(code2)) {
      self.containerState.furtherBlankLines = void 0;
      self.containerState.initialBlankLine = void 0;
      return notInCurrentItem(code2);
    }
    self.containerState.furtherBlankLines = void 0;
    self.containerState.initialBlankLine = void 0;
    return effects.attempt(indentConstruct, ok3, notInCurrentItem)(code2);
  }
  function notInCurrentItem(code2) {
    self.containerState._closeFlow = true;
    self.interrupt = void 0;
    return factorySpace(effects, effects.attempt(list, ok3, nok), "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
  }
}
function tokenizeIndent(effects, ok3, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemIndent", self.containerState.size + 1);
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "listItemIndent" && tail[2].sliceSerialize(tail[1], true).length === self.containerState.size ? ok3(code2) : nok(code2);
  }
}
function tokenizeListEnd(effects) {
  effects.exit(this.containerState.type);
}
function tokenizeListItemPrefixWhitespace(effects, ok3, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemPrefixWhitespace", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4 + 1);
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return !markdownSpace(code2) && tail && tail[1].type === "listItemPrefixWhitespace" ? ok3(code2) : nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-core-commonmark@2.0.3/node_modules/micromark-core-commonmark/lib/setext-underline.js
var setextUnderline = {
  name: "setextUnderline",
  resolveTo: resolveToSetextUnderline,
  tokenize: tokenizeSetextUnderline
};
function resolveToSetextUnderline(events, context) {
  let index2 = events.length;
  let content3;
  let text4;
  let definition2;
  while (index2--) {
    if (events[index2][0] === "enter") {
      if (events[index2][1].type === "content") {
        content3 = index2;
        break;
      }
      if (events[index2][1].type === "paragraph") {
        text4 = index2;
      }
    } else {
      if (events[index2][1].type === "content") {
        events.splice(index2, 1);
      }
      if (!definition2 && events[index2][1].type === "definition") {
        definition2 = index2;
      }
    }
  }
  const heading = {
    type: "setextHeading",
    start: {
      ...events[content3][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  events[text4][1].type = "setextHeadingText";
  if (definition2) {
    events.splice(text4, 0, ["enter", heading, context]);
    events.splice(definition2 + 1, 0, ["exit", events[content3][1], context]);
    events[content3][1].end = {
      ...events[definition2][1].end
    };
  } else {
    events[content3][1] = heading;
  }
  events.push(["exit", heading, context]);
  return events;
}
function tokenizeSetextUnderline(effects, ok3, nok) {
  const self = this;
  let marker;
  return start;
  function start(code2) {
    let index2 = self.events.length;
    let paragraph;
    while (index2--) {
      if (self.events[index2][1].type !== "lineEnding" && self.events[index2][1].type !== "linePrefix" && self.events[index2][1].type !== "content") {
        paragraph = self.events[index2][1].type === "paragraph";
        break;
      }
    }
    if (!self.parser.lazy[self.now().line] && (self.interrupt || paragraph)) {
      effects.enter("setextHeadingLine");
      marker = code2;
      return before(code2);
    }
    return nok(code2);
  }
  function before(code2) {
    effects.enter("setextHeadingLineSequence");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      return inside;
    }
    effects.exit("setextHeadingLineSequence");
    return markdownSpace(code2) ? factorySpace(effects, after, "lineSuffix")(code2) : after(code2);
  }
  function after(code2) {
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("setextHeadingLine");
      return ok3(code2);
    }
    return nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/initialize/flow.js
var flow = {
  tokenize: initializeFlow
};
function initializeFlow(effects) {
  const self = this;
  const initial = effects.attempt(
    // Try to parse a blank line.
    blankLine,
    atBlankEnding,
    // Try to parse initial flow (essentially, only code).
    effects.attempt(this.parser.constructs.flowInitial, afterConstruct, factorySpace(effects, effects.attempt(this.parser.constructs.flow, afterConstruct, effects.attempt(content2, afterConstruct)), "linePrefix"))
  );
  return initial;
  function atBlankEnding(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEndingBlank");
    effects.consume(code2);
    effects.exit("lineEndingBlank");
    self.currentConstruct = void 0;
    return initial;
  }
  function afterConstruct(code2) {
    if (code2 === null) {
      effects.consume(code2);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code2);
    effects.exit("lineEnding");
    self.currentConstruct = void 0;
    return initial;
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/initialize/text.js
var resolver = {
  resolveAll: createResolver()
};
var string = initializeFactory("string");
var text = initializeFactory("text");
function initializeFactory(field) {
  return {
    resolveAll: createResolver(field === "text" ? resolveAllLineSuffixes : void 0),
    tokenize: initializeText
  };
  function initializeText(effects) {
    const self = this;
    const constructs2 = this.parser.constructs[field];
    const text4 = effects.attempt(constructs2, start, notText);
    return start;
    function start(code2) {
      return atBreak(code2) ? text4(code2) : notText(code2);
    }
    function notText(code2) {
      if (code2 === null) {
        effects.consume(code2);
        return;
      }
      effects.enter("data");
      effects.consume(code2);
      return data;
    }
    function data(code2) {
      if (atBreak(code2)) {
        effects.exit("data");
        return text4(code2);
      }
      effects.consume(code2);
      return data;
    }
    function atBreak(code2) {
      if (code2 === null) {
        return true;
      }
      const list2 = constructs2[code2];
      let index2 = -1;
      if (list2) {
        while (++index2 < list2.length) {
          const item = list2[index2];
          if (!item.previous || item.previous.call(self, self.previous)) {
            return true;
          }
        }
      }
      return false;
    }
  }
}
function createResolver(extraResolver) {
  return resolveAllText;
  function resolveAllText(events, context) {
    let index2 = -1;
    let enter;
    while (++index2 <= events.length) {
      if (enter === void 0) {
        if (events[index2] && events[index2][1].type === "data") {
          enter = index2;
          index2++;
        }
      } else if (!events[index2] || events[index2][1].type !== "data") {
        if (index2 !== enter + 2) {
          events[enter][1].end = events[index2 - 1][1].end;
          events.splice(enter + 2, index2 - enter - 2);
          index2 = enter + 2;
        }
        enter = void 0;
      }
    }
    return extraResolver ? extraResolver(events, context) : events;
  }
}
function resolveAllLineSuffixes(events, context) {
  let eventIndex = 0;
  while (++eventIndex <= events.length) {
    if ((eventIndex === events.length || events[eventIndex][1].type === "lineEnding") && events[eventIndex - 1][1].type === "data") {
      const data = events[eventIndex - 1][1];
      const chunks = context.sliceStream(data);
      let index2 = chunks.length;
      let bufferIndex = -1;
      let size = 0;
      let tabs;
      while (index2--) {
        const chunk = chunks[index2];
        if (typeof chunk === "string") {
          bufferIndex = chunk.length;
          while (chunk.charCodeAt(bufferIndex - 1) === 32) {
            size++;
            bufferIndex--;
          }
          if (bufferIndex) break;
          bufferIndex = -1;
        } else if (chunk === -2) {
          tabs = true;
          size++;
        } else if (chunk === -1) {
        } else {
          index2++;
          break;
        }
      }
      if (context._contentTypeTextTrailing && eventIndex === events.length) {
        size = 0;
      }
      if (size) {
        const token = {
          type: eventIndex === events.length || tabs || size < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: index2 ? bufferIndex : data.start._bufferIndex + bufferIndex,
            _index: data.start._index + index2,
            line: data.end.line,
            column: data.end.column - size,
            offset: data.end.offset - size
          },
          end: {
            ...data.end
          }
        };
        data.end = {
          ...token.start
        };
        if (data.start.offset === data.end.offset) {
          Object.assign(data, token);
        } else {
          events.splice(eventIndex, 0, ["enter", token, context], ["exit", token, context]);
          eventIndex += 2;
        }
      }
      eventIndex++;
    }
  }
  return events;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/constructs.js
var constructs_exports = {};
__export(constructs_exports, {
  attentionMarkers: () => attentionMarkers,
  contentInitial: () => contentInitial,
  disable: () => disable,
  document: () => document3,
  flow: () => flow2,
  flowInitial: () => flowInitial,
  insideSpan: () => insideSpan,
  string: () => string2,
  text: () => text2
});
var document3 = {
  [42]: list,
  [43]: list,
  [45]: list,
  [48]: list,
  [49]: list,
  [50]: list,
  [51]: list,
  [52]: list,
  [53]: list,
  [54]: list,
  [55]: list,
  [56]: list,
  [57]: list,
  [62]: blockQuote
};
var contentInitial = {
  [91]: definition
};
var flowInitial = {
  [-2]: codeIndented,
  [-1]: codeIndented,
  [32]: codeIndented
};
var flow2 = {
  [35]: headingAtx,
  [42]: thematicBreak,
  [45]: [setextUnderline, thematicBreak],
  [60]: htmlFlow,
  [61]: setextUnderline,
  [95]: thematicBreak,
  [96]: codeFenced,
  [126]: codeFenced
};
var string2 = {
  [38]: characterReference,
  [92]: characterEscape
};
var text2 = {
  [-5]: lineEnding,
  [-4]: lineEnding,
  [-3]: lineEnding,
  [33]: labelStartImage,
  [38]: characterReference,
  [42]: attention,
  [60]: [autolink, htmlText],
  [91]: labelStartLink,
  [92]: [hardBreakEscape, characterEscape],
  [93]: labelEnd,
  [95]: attention,
  [96]: codeText
};
var insideSpan = {
  null: [attention, resolver]
};
var attentionMarkers = {
  null: [42, 95]
};
var disable = {
  null: []
};

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/create-tokenizer.js
function createTokenizer(parser, initialize, from) {
  let point3 = {
    _bufferIndex: -1,
    _index: 0,
    line: from && from.line || 1,
    column: from && from.column || 1,
    offset: from && from.offset || 0
  };
  const columnStart = {};
  const resolveAllConstructs = [];
  let chunks = [];
  let stack = [];
  let consumed = true;
  const effects = {
    attempt: constructFactory(onsuccessfulconstruct),
    check: constructFactory(onsuccessfulcheck),
    consume,
    enter,
    exit: exit3,
    interrupt: constructFactory(onsuccessfulcheck, {
      interrupt: true
    })
  };
  const context = {
    code: null,
    containerState: {},
    defineSkip,
    events: [],
    now,
    parser,
    previous: null,
    sliceSerialize,
    sliceStream,
    write
  };
  let state = initialize.tokenize.call(context, effects);
  let expectedCode;
  if (initialize.resolveAll) {
    resolveAllConstructs.push(initialize);
  }
  return context;
  function write(slice) {
    chunks = push(chunks, slice);
    main();
    if (chunks[chunks.length - 1] !== null) {
      return [];
    }
    addResult(initialize, 0);
    context.events = resolveAll(resolveAllConstructs, context.events, context);
    return context.events;
  }
  function sliceSerialize(token, expandTabs) {
    return serializeChunks(sliceStream(token), expandTabs);
  }
  function sliceStream(token) {
    return sliceChunks(chunks, token);
  }
  function now() {
    const {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    } = point3;
    return {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    };
  }
  function defineSkip(value) {
    columnStart[value.line] = value.column;
    accountForPotentialSkip();
  }
  function main() {
    let chunkIndex;
    while (point3._index < chunks.length) {
      const chunk = chunks[point3._index];
      if (typeof chunk === "string") {
        chunkIndex = point3._index;
        if (point3._bufferIndex < 0) {
          point3._bufferIndex = 0;
        }
        while (point3._index === chunkIndex && point3._bufferIndex < chunk.length) {
          go(chunk.charCodeAt(point3._bufferIndex));
        }
      } else {
        go(chunk);
      }
    }
  }
  function go(code2) {
    consumed = void 0;
    expectedCode = code2;
    state = state(code2);
  }
  function consume(code2) {
    if (markdownLineEnding(code2)) {
      point3.line++;
      point3.column = 1;
      point3.offset += code2 === -3 ? 2 : 1;
      accountForPotentialSkip();
    } else if (code2 !== -1) {
      point3.column++;
      point3.offset++;
    }
    if (point3._bufferIndex < 0) {
      point3._index++;
    } else {
      point3._bufferIndex++;
      if (point3._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
      // strings.
      /** @type {string} */
      chunks[point3._index].length) {
        point3._bufferIndex = -1;
        point3._index++;
      }
    }
    context.previous = code2;
    consumed = true;
  }
  function enter(type, fields) {
    const token = fields || {};
    token.type = type;
    token.start = now();
    context.events.push(["enter", token, context]);
    stack.push(token);
    return token;
  }
  function exit3(type) {
    const token = stack.pop();
    token.end = now();
    context.events.push(["exit", token, context]);
    return token;
  }
  function onsuccessfulconstruct(construct, info) {
    addResult(construct, info.from);
  }
  function onsuccessfulcheck(_, info) {
    info.restore();
  }
  function constructFactory(onreturn, fields) {
    return hook;
    function hook(constructs2, returnState, bogusState) {
      let listOfConstructs;
      let constructIndex;
      let currentConstruct;
      let info;
      return Array.isArray(constructs2) ? (
        /* c8 ignore next 1 */
        handleListOfConstructs(constructs2)
      ) : "tokenize" in constructs2 ? (
        // Looks like a construct.
        handleListOfConstructs([
          /** @type {Construct} */
          constructs2
        ])
      ) : handleMapOfConstructs(constructs2);
      function handleMapOfConstructs(map) {
        return start;
        function start(code2) {
          const left = code2 !== null && map[code2];
          const all2 = code2 !== null && map.null;
          const list2 = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(left) ? left : left ? [left] : [],
            ...Array.isArray(all2) ? all2 : all2 ? [all2] : []
          ];
          return handleListOfConstructs(list2)(code2);
        }
      }
      function handleListOfConstructs(list2) {
        listOfConstructs = list2;
        constructIndex = 0;
        if (list2.length === 0) {
          return bogusState;
        }
        return handleConstruct(list2[constructIndex]);
      }
      function handleConstruct(construct) {
        return start;
        function start(code2) {
          info = store();
          currentConstruct = construct;
          if (!construct.partial) {
            context.currentConstruct = construct;
          }
          if (construct.name && context.parser.constructs.disable.null.includes(construct.name)) {
            return nok(code2);
          }
          return construct.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            fields ? Object.assign(Object.create(context), fields) : context,
            effects,
            ok3,
            nok
          )(code2);
        }
      }
      function ok3(code2) {
        consumed = true;
        onreturn(currentConstruct, info);
        return returnState;
      }
      function nok(code2) {
        consumed = true;
        info.restore();
        if (++constructIndex < listOfConstructs.length) {
          return handleConstruct(listOfConstructs[constructIndex]);
        }
        return bogusState;
      }
    }
  }
  function addResult(construct, from2) {
    if (construct.resolveAll && !resolveAllConstructs.includes(construct)) {
      resolveAllConstructs.push(construct);
    }
    if (construct.resolve) {
      splice(context.events, from2, context.events.length - from2, construct.resolve(context.events.slice(from2), context));
    }
    if (construct.resolveTo) {
      context.events = construct.resolveTo(context.events, context);
    }
  }
  function store() {
    const startPoint = now();
    const startPrevious = context.previous;
    const startCurrentConstruct = context.currentConstruct;
    const startEventsIndex = context.events.length;
    const startStack = Array.from(stack);
    return {
      from: startEventsIndex,
      restore
    };
    function restore() {
      point3 = startPoint;
      context.previous = startPrevious;
      context.currentConstruct = startCurrentConstruct;
      context.events.length = startEventsIndex;
      stack = startStack;
      accountForPotentialSkip();
    }
  }
  function accountForPotentialSkip() {
    if (point3.line in columnStart && point3.column < 2) {
      point3.column = columnStart[point3.line];
      point3.offset += columnStart[point3.line] - 1;
    }
  }
}
function sliceChunks(chunks, token) {
  const startIndex = token.start._index;
  const startBufferIndex = token.start._bufferIndex;
  const endIndex = token.end._index;
  const endBufferIndex = token.end._bufferIndex;
  let view;
  if (startIndex === endIndex) {
    view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
  } else {
    view = chunks.slice(startIndex, endIndex);
    if (startBufferIndex > -1) {
      const head = view[0];
      if (typeof head === "string") {
        view[0] = head.slice(startBufferIndex);
      } else {
        view.shift();
      }
    }
    if (endBufferIndex > 0) {
      view.push(chunks[endIndex].slice(0, endBufferIndex));
    }
  }
  return view;
}
function serializeChunks(chunks, expandTabs) {
  let index2 = -1;
  const result = [];
  let atTab;
  while (++index2 < chunks.length) {
    const chunk = chunks[index2];
    let value;
    if (typeof chunk === "string") {
      value = chunk;
    } else switch (chunk) {
      case -5: {
        value = "\r";
        break;
      }
      case -4: {
        value = "\n";
        break;
      }
      case -3: {
        value = "\r\n";
        break;
      }
      case -2: {
        value = expandTabs ? " " : "	";
        break;
      }
      case -1: {
        if (!expandTabs && atTab) continue;
        value = " ";
        break;
      }
      default: {
        value = String.fromCharCode(chunk);
      }
    }
    atTab = chunk === -2;
    result.push(value);
  }
  return result.join("");
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/parse.js
function parse(options) {
  const settings = options || {};
  const constructs2 = (
    /** @type {FullNormalizedExtension} */
    combineExtensions([constructs_exports, ...settings.extensions || []])
  );
  const parser = {
    constructs: constructs2,
    content: create(content),
    defined: [],
    document: create(document2),
    flow: create(flow),
    lazy: {},
    string: create(string),
    text: create(text)
  };
  return parser;
  function create(initial) {
    return creator;
    function creator(from) {
      return createTokenizer(parser, initial, from);
    }
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/postprocess.js
function postprocess(events) {
  while (!subtokenize(events)) {
  }
  return events;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark@4.0.2_supports-color@9.4.0/node_modules/micromark/lib/preprocess.js
var search = /[\0\t\n\r]/g;
function preprocess() {
  let column = 1;
  let buffer = "";
  let start = true;
  let atCarriageReturn;
  return preprocessor;
  function preprocessor(value, encoding, end) {
    const chunks = [];
    let match;
    let next;
    let startPosition;
    let endPosition;
    let code2;
    value = buffer + (typeof value === "string" ? value.toString() : new TextDecoder(encoding || void 0).decode(value));
    startPosition = 0;
    buffer = "";
    if (start) {
      if (value.charCodeAt(0) === 65279) {
        startPosition++;
      }
      start = void 0;
    }
    while (startPosition < value.length) {
      search.lastIndex = startPosition;
      match = search.exec(value);
      endPosition = match && match.index !== void 0 ? match.index : value.length;
      code2 = value.charCodeAt(endPosition);
      if (!match) {
        buffer = value.slice(startPosition);
        break;
      }
      if (code2 === 10 && startPosition === endPosition && atCarriageReturn) {
        chunks.push(-3);
        atCarriageReturn = void 0;
      } else {
        if (atCarriageReturn) {
          chunks.push(-5);
          atCarriageReturn = void 0;
        }
        if (startPosition < endPosition) {
          chunks.push(value.slice(startPosition, endPosition));
          column += endPosition - startPosition;
        }
        switch (code2) {
          case 0: {
            chunks.push(65533);
            column++;
            break;
          }
          case 9: {
            next = Math.ceil(column / 4) * 4;
            chunks.push(-2);
            while (column++ < next) chunks.push(-1);
            break;
          }
          case 10: {
            chunks.push(-4);
            column = 1;
            break;
          }
          default: {
            atCarriageReturn = true;
            column = 1;
          }
        }
      }
      startPosition = endPosition + 1;
    }
    if (end) {
      if (atCarriageReturn) chunks.push(-5);
      if (buffer) chunks.push(buffer);
      chunks.push(null);
    }
    return chunks;
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-decode-string@2.0.1/node_modules/micromark-util-decode-string/index.js
var characterEscapeOrReference = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function decodeString(value) {
  return value.replace(characterEscapeOrReference, decode);
}
function decode($0, $1, $2) {
  if ($1) {
    return $1;
  }
  const head = $2.charCodeAt(0);
  if (head === 35) {
    const head2 = $2.charCodeAt(1);
    const hex = head2 === 120 || head2 === 88;
    return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10);
  }
  return decodeNamedCharacterReference($2) || $0;
}

// ../../deepseek-harness/node_modules/.pnpm/unist-util-stringify-position@4.0.0/node_modules/unist-util-stringify-position/lib/index.js
function stringifyPosition(value) {
  if (!value || typeof value !== "object") {
    return "";
  }
  if ("position" in value || "type" in value) {
    return position(value.position);
  }
  if ("start" in value || "end" in value) {
    return position(value);
  }
  if ("line" in value || "column" in value) {
    return point(value);
  }
  return "";
}
function point(point3) {
  return index(point3 && point3.line) + ":" + index(point3 && point3.column);
}
function position(pos) {
  return point(pos && pos.start) + "-" + point(pos && pos.end);
}
function index(value) {
  return value && typeof value === "number" ? value : 1;
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-from-markdown@2.0.3_supports-color@9.4.0/node_modules/mdast-util-from-markdown/lib/index.js
var own = {}.hasOwnProperty;
function fromMarkdown(value, encoding, options) {
  if (encoding && typeof encoding === "object") {
    options = encoding;
    encoding = void 0;
  }
  return compiler(options)(postprocess(parse(options).document().write(preprocess()(value, encoding, true))));
}
function compiler(options) {
  const config = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: opener(link),
      autolinkProtocol: onenterdata,
      autolinkEmail: onenterdata,
      atxHeading: opener(heading),
      blockQuote: opener(blockQuote2),
      characterEscape: onenterdata,
      characterReference: onenterdata,
      codeFenced: opener(codeFlow),
      codeFencedFenceInfo: buffer,
      codeFencedFenceMeta: buffer,
      codeIndented: opener(codeFlow, buffer),
      codeText: opener(codeText2, buffer),
      codeTextData: onenterdata,
      data: onenterdata,
      codeFlowValue: onenterdata,
      definition: opener(definition2),
      definitionDestinationString: buffer,
      definitionLabelString: buffer,
      definitionTitleString: buffer,
      emphasis: opener(emphasis),
      hardBreakEscape: opener(hardBreak),
      hardBreakTrailing: opener(hardBreak),
      htmlFlow: opener(html, buffer),
      htmlFlowData: onenterdata,
      htmlText: opener(html, buffer),
      htmlTextData: onenterdata,
      image: opener(image),
      label: buffer,
      link: opener(link),
      listItem: opener(listItem),
      listItemValue: onenterlistitemvalue,
      listOrdered: opener(list2, onenterlistordered),
      listUnordered: opener(list2),
      paragraph: opener(paragraph),
      reference: onenterreference,
      referenceString: buffer,
      resourceDestinationString: buffer,
      resourceTitleString: buffer,
      setextHeading: opener(heading),
      strong: opener(strong),
      thematicBreak: opener(thematicBreak2)
    },
    exit: {
      atxHeading: closer(),
      atxHeadingSequence: onexitatxheadingsequence,
      autolink: closer(),
      autolinkEmail: onexitautolinkemail,
      autolinkProtocol: onexitautolinkprotocol,
      blockQuote: closer(),
      characterEscapeValue: onexitdata,
      characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
      characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
      characterReferenceValue: onexitcharacterreferencevalue,
      characterReference: onexitcharacterreference,
      codeFenced: closer(onexitcodefenced),
      codeFencedFence: onexitcodefencedfence,
      codeFencedFenceInfo: onexitcodefencedfenceinfo,
      codeFencedFenceMeta: onexitcodefencedfencemeta,
      codeFlowValue: onexitdata,
      codeIndented: closer(onexitcodeindented),
      codeText: closer(onexitcodetext),
      codeTextData: onexitdata,
      data: onexitdata,
      definition: closer(),
      definitionDestinationString: onexitdefinitiondestinationstring,
      definitionLabelString: onexitdefinitionlabelstring,
      definitionTitleString: onexitdefinitiontitlestring,
      emphasis: closer(),
      hardBreakEscape: closer(onexithardbreak),
      hardBreakTrailing: closer(onexithardbreak),
      htmlFlow: closer(onexithtmlflow),
      htmlFlowData: onexitdata,
      htmlText: closer(onexithtmltext),
      htmlTextData: onexitdata,
      image: closer(onexitimage),
      label: onexitlabel,
      labelText: onexitlabeltext,
      lineEnding: onexitlineending,
      link: closer(onexitlink),
      listItem: closer(),
      listOrdered: closer(),
      listUnordered: closer(),
      paragraph: closer(),
      referenceString: onexitreferencestring,
      resourceDestinationString: onexitresourcedestinationstring,
      resourceTitleString: onexitresourcetitlestring,
      resource: onexitresource,
      setextHeading: closer(onexitsetextheading),
      setextHeadingLineSequence: onexitsetextheadinglinesequence,
      setextHeadingText: onexitsetextheadingtext,
      strong: closer(),
      thematicBreak: closer()
    }
  };
  configure(config, (options || {}).mdastExtensions || []);
  const data = {};
  return compile;
  function compile(events) {
    let tree = {
      type: "root",
      children: []
    };
    const context = {
      stack: [tree],
      tokenStack: [],
      config,
      enter,
      exit: exit3,
      buffer,
      resume,
      data
    };
    const listStack = [];
    let index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][1].type === "listOrdered" || events[index2][1].type === "listUnordered") {
        if (events[index2][0] === "enter") {
          listStack.push(index2);
        } else {
          const tail = listStack.pop();
          index2 = prepareList(events, tail, index2);
        }
      }
    }
    index2 = -1;
    while (++index2 < events.length) {
      const handler = config[events[index2][0]];
      if (own.call(handler, events[index2][1].type)) {
        handler[events[index2][1].type].call(Object.assign({
          sliceSerialize: events[index2][2].sliceSerialize
        }, context), events[index2][1]);
      }
    }
    if (context.tokenStack.length > 0) {
      const tail = context.tokenStack[context.tokenStack.length - 1];
      const handler = tail[1] || defaultOnError;
      handler.call(context, void 0, tail[0]);
    }
    tree.position = {
      start: point2(events.length > 0 ? events[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: point2(events.length > 0 ? events[events.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    };
    index2 = -1;
    while (++index2 < config.transforms.length) {
      tree = config.transforms[index2](tree) || tree;
    }
    return tree;
  }
  function prepareList(events, start, length) {
    let index2 = start - 1;
    let containerBalance = -1;
    let listSpread = false;
    let listItem2;
    let lineIndex;
    let firstBlankLineIndex;
    let atMarker;
    while (++index2 <= length) {
      const event = events[index2];
      switch (event[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          if (event[0] === "enter") {
            containerBalance++;
          } else {
            containerBalance--;
          }
          atMarker = void 0;
          break;
        }
        case "lineEndingBlank": {
          if (event[0] === "enter") {
            if (listItem2 && !atMarker && !containerBalance && !firstBlankLineIndex) {
              firstBlankLineIndex = index2;
            }
            atMarker = void 0;
          }
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace": {
          break;
        }
        default: {
          atMarker = void 0;
        }
      }
      if (!containerBalance && event[0] === "enter" && event[1].type === "listItemPrefix" || containerBalance === -1 && event[0] === "exit" && (event[1].type === "listUnordered" || event[1].type === "listOrdered")) {
        if (listItem2) {
          let tailIndex = index2;
          lineIndex = void 0;
          while (tailIndex--) {
            const tailEvent = events[tailIndex];
            if (tailEvent[1].type === "lineEnding" || tailEvent[1].type === "lineEndingBlank") {
              if (tailEvent[0] === "exit") continue;
              if (lineIndex) {
                events[lineIndex][1].type = "lineEndingBlank";
                listSpread = true;
              }
              tailEvent[1].type = "lineEnding";
              lineIndex = tailIndex;
            } else if (tailEvent[1].type === "linePrefix" || tailEvent[1].type === "blockQuotePrefix" || tailEvent[1].type === "blockQuotePrefixWhitespace" || tailEvent[1].type === "blockQuoteMarker" || tailEvent[1].type === "listItemIndent") {
            } else {
              break;
            }
          }
          if (firstBlankLineIndex && (!lineIndex || firstBlankLineIndex < lineIndex)) {
            listItem2._spread = true;
          }
          listItem2.end = Object.assign({}, lineIndex ? events[lineIndex][1].start : event[1].end);
          events.splice(lineIndex || index2, 0, ["exit", listItem2, event[2]]);
          index2++;
          length++;
        }
        if (event[1].type === "listItemPrefix") {
          const item = {
            type: "listItem",
            _spread: false,
            start: Object.assign({}, event[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          listItem2 = item;
          events.splice(index2, 0, ["enter", item, event[2]]);
          index2++;
          length++;
          firstBlankLineIndex = void 0;
          atMarker = true;
        }
      }
    }
    events[start][1]._spread = listSpread;
    return length;
  }
  function opener(create, and) {
    return open;
    function open(token) {
      enter.call(this, create(token), token);
      if (and) and.call(this, token);
    }
  }
  function buffer() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function enter(node2, token, errorHandler) {
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent.children;
    siblings.push(node2);
    this.stack.push(node2);
    this.tokenStack.push([token, errorHandler || void 0]);
    node2.position = {
      start: point2(token.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function closer(and) {
    return close;
    function close(token) {
      if (and) and.call(this, token);
      exit3.call(this, token);
    }
  }
  function exit3(token, onExitError) {
    const node2 = this.stack.pop();
    const open = this.tokenStack.pop();
    if (!open) {
      throw new Error("Cannot close `" + token.type + "` (" + stringifyPosition({
        start: token.start,
        end: token.end
      }) + "): it\u2019s not open");
    } else if (open[0].type !== token.type) {
      if (onExitError) {
        onExitError.call(this, token, open[0]);
      } else {
        const handler = open[1] || defaultOnError;
        handler.call(this, token, open[0]);
      }
    }
    node2.position.end = point2(token.end);
  }
  function resume() {
    return toString(this.stack.pop());
  }
  function onenterlistordered() {
    this.data.expectingFirstListItemValue = true;
  }
  function onenterlistitemvalue(token) {
    if (this.data.expectingFirstListItemValue) {
      const ancestor = this.stack[this.stack.length - 2];
      ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
      this.data.expectingFirstListItemValue = void 0;
    }
  }
  function onexitcodefencedfenceinfo() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.lang = data2;
  }
  function onexitcodefencedfencemeta() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.meta = data2;
  }
  function onexitcodefencedfence() {
    if (this.data.flowCodeInside) return;
    this.buffer();
    this.data.flowCodeInside = true;
  }
  function onexitcodefenced() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
    this.data.flowCodeInside = void 0;
  }
  function onexitcodeindented() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/(\r?\n|\r)$/g, "");
  }
  function onexitdefinitionlabelstring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
  }
  function onexitdefinitiontitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitdefinitiondestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitatxheadingsequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    if (!node2.depth) {
      const depth = this.sliceSerialize(token).length;
      node2.depth = depth;
    }
  }
  function onexitsetextheadingtext() {
    this.data.setextHeadingSlurpLineEnding = true;
  }
  function onexitsetextheadinglinesequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    node2.depth = this.sliceSerialize(token).codePointAt(0) === 61 ? 1 : 2;
  }
  function onexitsetextheading() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function onenterdata(token) {
    const node2 = this.stack[this.stack.length - 1];
    const siblings = node2.children;
    let tail = siblings[siblings.length - 1];
    if (!tail || tail.type !== "text") {
      tail = text4();
      tail.position = {
        start: point2(token.start),
        // @ts-expect-error: we’ll add `end` later.
        end: void 0
      };
      siblings.push(tail);
    }
    this.stack.push(tail);
  }
  function onexitdata(token) {
    const tail = this.stack.pop();
    tail.value += this.sliceSerialize(token);
    tail.position.end = point2(token.end);
  }
  function onexitlineending(token) {
    const context = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const tail = context.children[context.children.length - 1];
      tail.position.end = point2(token.end);
      this.data.atHardBreak = void 0;
      return;
    }
    if (!this.data.setextHeadingSlurpLineEnding && config.canContainEols.includes(context.type)) {
      onenterdata.call(this, token);
      onexitdata.call(this, token);
    }
  }
  function onexithardbreak() {
    this.data.atHardBreak = true;
  }
  function onexithtmlflow() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexithtmltext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitcodetext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitlink() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitimage() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitlabeltext(token) {
    const string3 = this.sliceSerialize(token);
    const ancestor = this.stack[this.stack.length - 2];
    ancestor.label = decodeString(string3);
    ancestor.identifier = normalizeIdentifier(string3).toLowerCase();
  }
  function onexitlabel() {
    const fragment = this.stack[this.stack.length - 1];
    const value = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    this.data.inReference = true;
    if (node2.type === "link") {
      const children = fragment.children;
      node2.children = children;
    } else {
      node2.alt = value;
    }
  }
  function onexitresourcedestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitresourcetitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitresource() {
    this.data.inReference = void 0;
  }
  function onenterreference() {
    this.data.referenceType = "collapsed";
  }
  function onexitreferencestring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
    this.data.referenceType = "full";
  }
  function onexitcharacterreferencemarker(token) {
    this.data.characterReferenceType = token.type;
  }
  function onexitcharacterreferencevalue(token) {
    const data2 = this.sliceSerialize(token);
    const type = this.data.characterReferenceType;
    let value;
    if (type) {
      value = decodeNumericCharacterReference(data2, type === "characterReferenceMarkerNumeric" ? 10 : 16);
      this.data.characterReferenceType = void 0;
    } else {
      const result = decodeNamedCharacterReference(data2);
      value = result;
    }
    const tail = this.stack[this.stack.length - 1];
    tail.value += value;
  }
  function onexitcharacterreference(token) {
    const tail = this.stack.pop();
    tail.position.end = point2(token.end);
  }
  function onexitautolinkprotocol(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = this.sliceSerialize(token);
  }
  function onexitautolinkemail(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = "mailto:" + this.sliceSerialize(token);
  }
  function blockQuote2() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function codeFlow() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function codeText2() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function definition2() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function emphasis() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function heading() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function hardBreak() {
    return {
      type: "break"
    };
  }
  function html() {
    return {
      type: "html",
      value: ""
    };
  }
  function image() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function link() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function list2(token) {
    return {
      type: "list",
      ordered: token.type === "listOrdered",
      start: null,
      spread: token._spread,
      children: []
    };
  }
  function listItem(token) {
    return {
      type: "listItem",
      spread: token._spread,
      checked: null,
      children: []
    };
  }
  function paragraph() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function strong() {
    return {
      type: "strong",
      children: []
    };
  }
  function text4() {
    return {
      type: "text",
      value: ""
    };
  }
  function thematicBreak2() {
    return {
      type: "thematicBreak"
    };
  }
}
function point2(d) {
  return {
    line: d.line,
    column: d.column,
    offset: d.offset
  };
}
function configure(combined, extensions) {
  let index2 = -1;
  while (++index2 < extensions.length) {
    const value = extensions[index2];
    if (Array.isArray(value)) {
      configure(combined, value);
    } else {
      extension(combined, value);
    }
  }
}
function extension(combined, extension2) {
  let key;
  for (key in extension2) {
    if (own.call(extension2, key)) {
      switch (key) {
        case "canContainEols": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "transforms": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "enter":
        case "exit": {
          const right = extension2[key];
          if (right) {
            Object.assign(combined[key], right);
          }
          break;
        }
      }
    }
  }
}
function defaultOnError(left, right) {
  if (left) {
    throw new Error("Cannot close `" + left.type + "` (" + stringifyPosition({
      start: left.start,
      end: left.end
    }) + "): a different token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is open");
  } else {
    throw new Error("Cannot close document, a token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is still open");
  }
}

// ../../deepseek-harness/node_modules/.pnpm/ccount@2.0.1/node_modules/ccount/index.js
function ccount(value, character) {
  const source = String(value);
  if (typeof character !== "string") {
    throw new TypeError("Expected character");
  }
  let count = 0;
  let index2 = source.indexOf(character);
  while (index2 !== -1) {
    count++;
    index2 = source.indexOf(character, index2 + character.length);
  }
  return count;
}

// ../../deepseek-harness/node_modules/.pnpm/devlop@1.1.0/node_modules/devlop/lib/default.js
function ok() {
}

// ../../deepseek-harness/node_modules/.pnpm/escape-string-regexp@5.0.0/node_modules/escape-string-regexp/index.js
function escapeStringRegexp(string3) {
  if (typeof string3 !== "string") {
    throw new TypeError("Expected a string");
  }
  return string3.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}

// ../../deepseek-harness/node_modules/.pnpm/unist-util-is@6.0.1/node_modules/unist-util-is/lib/index.js
var convert = (
  // Note: overloads in JSDoc can’t yet use different `@template`s.
  /**
   * @type {(
   *   (<Condition extends string>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & {type: Condition}) &
   *   (<Condition extends Props>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Condition) &
   *   (<Condition extends TestFunction>(test: Condition) => (node: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node & Predicate<Condition, Node>) &
   *   ((test?: null | undefined) => (node?: unknown, index?: number | null | undefined, parent?: Parent | null | undefined, context?: unknown) => node is Node) &
   *   ((test?: Test) => Check)
   * )}
   */
  /**
   * @param {Test} [test]
   * @returns {Check}
   */
  (function(test) {
    if (test === null || test === void 0) {
      return ok2;
    }
    if (typeof test === "function") {
      return castFactory(test);
    }
    if (typeof test === "object") {
      return Array.isArray(test) ? anyFactory(test) : (
        // Cast because `ReadonlyArray` goes into the above but `isArray`
        // narrows to `Array`.
        propertiesFactory(
          /** @type {Props} */
          test
        )
      );
    }
    if (typeof test === "string") {
      return typeFactory(test);
    }
    throw new Error("Expected function, string, or object as test");
  })
);
function anyFactory(tests) {
  const checks = [];
  let index2 = -1;
  while (++index2 < tests.length) {
    checks[index2] = convert(tests[index2]);
  }
  return castFactory(any);
  function any(...parameters) {
    let index3 = -1;
    while (++index3 < checks.length) {
      if (checks[index3].apply(this, parameters)) return true;
    }
    return false;
  }
}
function propertiesFactory(check) {
  const checkAsRecord = (
    /** @type {Record<string, unknown>} */
    check
  );
  return castFactory(all2);
  function all2(node2) {
    const nodeAsRecord = (
      /** @type {Record<string, unknown>} */
      /** @type {unknown} */
      node2
    );
    let key;
    for (key in check) {
      if (nodeAsRecord[key] !== checkAsRecord[key]) return false;
    }
    return true;
  }
}
function typeFactory(check) {
  return castFactory(type);
  function type(node2) {
    return node2 && node2.type === check;
  }
}
function castFactory(testFunction) {
  return check;
  function check(value, index2, parent) {
    return Boolean(
      looksLikeANode(value) && testFunction.call(
        this,
        value,
        typeof index2 === "number" ? index2 : void 0,
        parent || void 0
      )
    );
  }
}
function ok2() {
  return true;
}
function looksLikeANode(value) {
  return value !== null && typeof value === "object" && "type" in value;
}

// ../../deepseek-harness/node_modules/.pnpm/unist-util-visit-parents@6.0.2/node_modules/unist-util-visit-parents/lib/color.js
function color(d) {
  return d;
}

// ../../deepseek-harness/node_modules/.pnpm/unist-util-visit-parents@6.0.2/node_modules/unist-util-visit-parents/lib/index.js
var empty = [];
var CONTINUE = true;
var EXIT = false;
var SKIP = "skip";
function visitParents(tree, test, visitor, reverse) {
  let check;
  if (typeof test === "function" && typeof visitor !== "function") {
    reverse = visitor;
    visitor = test;
  } else {
    check = test;
  }
  const is2 = convert(check);
  const step = reverse ? -1 : 1;
  factory(tree, void 0, [])();
  function factory(node2, index2, parents) {
    const value = (
      /** @type {Record<string, unknown>} */
      node2 && typeof node2 === "object" ? node2 : {}
    );
    if (typeof value.type === "string") {
      const name2 = (
        // `hast`
        typeof value.tagName === "string" ? value.tagName : (
          // `xast`
          typeof value.name === "string" ? value.name : void 0
        )
      );
      Object.defineProperty(visit, "name", {
        value: "node (" + color(node2.type + (name2 ? "<" + name2 + ">" : "")) + ")"
      });
    }
    return visit;
    function visit() {
      let result = empty;
      let subresult;
      let offset;
      let grandparents;
      if (!test || is2(node2, index2, parents[parents.length - 1] || void 0)) {
        result = toResult(visitor(node2, parents));
        if (result[0] === EXIT) {
          return result;
        }
      }
      if ("children" in node2 && node2.children) {
        const nodeAsParent = (
          /** @type {UnistParent} */
          node2
        );
        if (nodeAsParent.children && result[0] !== SKIP) {
          offset = (reverse ? nodeAsParent.children.length : -1) + step;
          grandparents = parents.concat(nodeAsParent);
          while (offset > -1 && offset < nodeAsParent.children.length) {
            const child = nodeAsParent.children[offset];
            subresult = factory(child, offset, grandparents)();
            if (subresult[0] === EXIT) {
              return subresult;
            }
            offset = typeof subresult[1] === "number" ? subresult[1] : offset + step;
          }
        }
      }
      return result;
    }
  }
}
function toResult(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "number") {
    return [CONTINUE, value];
  }
  return value === null || value === void 0 ? empty : [value];
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-find-and-replace@3.0.2/node_modules/mdast-util-find-and-replace/lib/index.js
function findAndReplace(tree, list2, options) {
  const settings = options || {};
  const ignored = convert(settings.ignore || []);
  const pairs = toPairs(list2);
  let pairIndex = -1;
  while (++pairIndex < pairs.length) {
    visitParents(tree, "text", visitor);
  }
  function visitor(node2, parents) {
    let index2 = -1;
    let grandparent;
    while (++index2 < parents.length) {
      const parent = parents[index2];
      const siblings = grandparent ? grandparent.children : void 0;
      if (ignored(
        parent,
        siblings ? siblings.indexOf(parent) : void 0,
        grandparent
      )) {
        return;
      }
      grandparent = parent;
    }
    if (grandparent) {
      return handler(node2, parents);
    }
  }
  function handler(node2, parents) {
    const parent = parents[parents.length - 1];
    const find = pairs[pairIndex][0];
    const replace2 = pairs[pairIndex][1];
    let start = 0;
    const siblings = parent.children;
    const index2 = siblings.indexOf(node2);
    let change = false;
    let nodes = [];
    find.lastIndex = 0;
    let match = find.exec(node2.value);
    while (match) {
      const position2 = match.index;
      const matchObject = {
        index: match.index,
        input: match.input,
        stack: [...parents, node2]
      };
      let value = replace2(...match, matchObject);
      if (typeof value === "string") {
        value = value.length > 0 ? { type: "text", value } : void 0;
      }
      if (value === false) {
        find.lastIndex = position2 + 1;
      } else {
        if (start !== position2) {
          nodes.push({
            type: "text",
            value: node2.value.slice(start, position2)
          });
        }
        if (Array.isArray(value)) {
          nodes.push(...value);
        } else if (value) {
          nodes.push(value);
        }
        start = position2 + match[0].length;
        change = true;
      }
      if (!find.global) {
        break;
      }
      match = find.exec(node2.value);
    }
    if (change) {
      if (start < node2.value.length) {
        nodes.push({ type: "text", value: node2.value.slice(start) });
      }
      parent.children.splice(index2, 1, ...nodes);
    } else {
      nodes = [node2];
    }
    return index2 + nodes.length;
  }
}
function toPairs(tupleOrList) {
  const result = [];
  if (!Array.isArray(tupleOrList)) {
    throw new TypeError("Expected find and replace tuple or list of tuples");
  }
  const list2 = !tupleOrList[0] || Array.isArray(tupleOrList[0]) ? tupleOrList : [tupleOrList];
  let index2 = -1;
  while (++index2 < list2.length) {
    const tuple = list2[index2];
    result.push([toExpression(tuple[0]), toFunction(tuple[1])]);
  }
  return result;
}
function toExpression(find) {
  return typeof find === "string" ? new RegExp(escapeStringRegexp(find), "g") : find;
}
function toFunction(replace2) {
  return typeof replace2 === "function" ? replace2 : function() {
    return replace2;
  };
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-gfm-autolink-literal@2.0.1/node_modules/mdast-util-gfm-autolink-literal/lib/index.js
function gfmAutolinkLiteralFromMarkdown() {
  return {
    transforms: [transformGfmAutolinkLiterals],
    enter: {
      literalAutolink: enterLiteralAutolink,
      literalAutolinkEmail: enterLiteralAutolinkValue,
      literalAutolinkHttp: enterLiteralAutolinkValue,
      literalAutolinkWww: enterLiteralAutolinkValue
    },
    exit: {
      literalAutolink: exitLiteralAutolink,
      literalAutolinkEmail: exitLiteralAutolinkEmail,
      literalAutolinkHttp: exitLiteralAutolinkHttp,
      literalAutolinkWww: exitLiteralAutolinkWww
    }
  };
}
function enterLiteralAutolink(token) {
  this.enter({ type: "link", title: null, url: "", children: [] }, token);
}
function enterLiteralAutolinkValue(token) {
  this.config.enter.autolinkProtocol.call(this, token);
}
function exitLiteralAutolinkHttp(token) {
  this.config.exit.autolinkProtocol.call(this, token);
}
function exitLiteralAutolinkWww(token) {
  this.config.exit.data.call(this, token);
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "link");
  node2.url = "http://" + this.sliceSerialize(token);
}
function exitLiteralAutolinkEmail(token) {
  this.config.exit.autolinkEmail.call(this, token);
}
function exitLiteralAutolink(token) {
  this.exit(token);
}
function transformGfmAutolinkLiterals(tree) {
  findAndReplace(
    tree,
    [
      [/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, findUrl],
      [/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu, findEmail]
    ],
    { ignore: ["link", "linkReference"] }
  );
}
function findUrl(_, protocol, domain2, path2, match) {
  let prefix = "";
  if (!previous2(match)) {
    return false;
  }
  if (/^w/i.test(protocol)) {
    domain2 = protocol + domain2;
    protocol = "";
    prefix = "http://";
  }
  if (!isCorrectDomain(domain2)) {
    return false;
  }
  const parts = splitUrl(domain2 + path2);
  if (!parts[0]) return false;
  const result = {
    type: "link",
    title: null,
    url: prefix + protocol + parts[0],
    children: [{ type: "text", value: protocol + parts[0] }]
  };
  if (parts[1]) {
    return [result, { type: "text", value: parts[1] }];
  }
  return result;
}
function findEmail(_, atext, label, match) {
  if (
    // Not an expected previous character.
    !previous2(match, true) || // Label ends in not allowed character.
    /[-\d_]$/.test(label)
  ) {
    return false;
  }
  return {
    type: "link",
    title: null,
    url: "mailto:" + atext + "@" + label,
    children: [{ type: "text", value: atext + "@" + label }]
  };
}
function isCorrectDomain(domain2) {
  const parts = domain2.split(".");
  if (parts.length < 2 || parts[parts.length - 1] && (/_/.test(parts[parts.length - 1]) || !/[a-zA-Z\d]/.test(parts[parts.length - 1])) || parts[parts.length - 2] && (/_/.test(parts[parts.length - 2]) || !/[a-zA-Z\d]/.test(parts[parts.length - 2]))) {
    return false;
  }
  return true;
}
function splitUrl(url) {
  const trailExec = /[!"&'),.:;<>?\]}]+$/.exec(url);
  if (!trailExec) {
    return [url, void 0];
  }
  url = url.slice(0, trailExec.index);
  let trail2 = trailExec[0];
  let closingParenIndex = trail2.indexOf(")");
  const openingParens = ccount(url, "(");
  let closingParens = ccount(url, ")");
  while (closingParenIndex !== -1 && openingParens > closingParens) {
    url += trail2.slice(0, closingParenIndex + 1);
    trail2 = trail2.slice(closingParenIndex + 1);
    closingParenIndex = trail2.indexOf(")");
    closingParens++;
  }
  return [url, trail2];
}
function previous2(match, email) {
  const code2 = match.input.charCodeAt(match.index - 1);
  return (match.index === 0 || unicodeWhitespace(code2) || unicodePunctuation(code2)) && // If it’s an email, the previous character should not be a slash.
  (!email || code2 !== 47);
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-gfm-footnote@2.1.0/node_modules/mdast-util-gfm-footnote/lib/index.js
footnoteReference.peek = footnoteReferencePeek;
function enterFootnoteCallString() {
  this.buffer();
}
function enterFootnoteCall(token) {
  this.enter({ type: "footnoteReference", identifier: "", label: "" }, token);
}
function enterFootnoteDefinitionLabelString() {
  this.buffer();
}
function enterFootnoteDefinition(token) {
  this.enter(
    { type: "footnoteDefinition", identifier: "", label: "", children: [] },
    token
  );
}
function exitFootnoteCallString(token) {
  const label = this.resume();
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "footnoteReference");
  node2.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node2.label = label;
}
function exitFootnoteCall(token) {
  this.exit(token);
}
function exitFootnoteDefinitionLabelString(token) {
  const label = this.resume();
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "footnoteDefinition");
  node2.identifier = normalizeIdentifier(
    this.sliceSerialize(token)
  ).toLowerCase();
  node2.label = label;
}
function exitFootnoteDefinition(token) {
  this.exit(token);
}
function footnoteReferencePeek() {
  return "[";
}
function footnoteReference(node2, _, state, info) {
  const tracker = state.createTracker(info);
  let value = tracker.move("[^");
  const exit3 = state.enter("footnoteReference");
  const subexit = state.enter("reference");
  value += tracker.move(
    state.safe(state.associationId(node2), { after: "]", before: value })
  );
  subexit();
  exit3();
  value += tracker.move("]");
  return value;
}
function gfmFootnoteFromMarkdown() {
  return {
    enter: {
      gfmFootnoteCallString: enterFootnoteCallString,
      gfmFootnoteCall: enterFootnoteCall,
      gfmFootnoteDefinitionLabelString: enterFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: enterFootnoteDefinition
    },
    exit: {
      gfmFootnoteCallString: exitFootnoteCallString,
      gfmFootnoteCall: exitFootnoteCall,
      gfmFootnoteDefinitionLabelString: exitFootnoteDefinitionLabelString,
      gfmFootnoteDefinition: exitFootnoteDefinition
    }
  };
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-gfm-strikethrough@2.0.0/node_modules/mdast-util-gfm-strikethrough/lib/index.js
handleDelete.peek = peekDelete;
function gfmStrikethroughFromMarkdown() {
  return {
    canContainEols: ["delete"],
    enter: { strikethrough: enterStrikethrough },
    exit: { strikethrough: exitStrikethrough }
  };
}
function enterStrikethrough(token) {
  this.enter({ type: "delete", children: [] }, token);
}
function exitStrikethrough(token) {
  this.exit(token);
}
function handleDelete(node2, _, state, info) {
  const tracker = state.createTracker(info);
  const exit3 = state.enter("strikethrough");
  let value = tracker.move("~~");
  value += state.containerPhrasing(node2, {
    ...tracker.current(),
    before: value,
    after: "~"
  });
  value += tracker.move("~~");
  exit3();
  return value;
}
function peekDelete() {
  return "~";
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-gfm-table@2.0.0/node_modules/mdast-util-gfm-table/lib/index.js
function gfmTableFromMarkdown() {
  return {
    enter: {
      table: enterTable,
      tableData: enterCell,
      tableHeader: enterCell,
      tableRow: enterRow
    },
    exit: {
      codeText: exitCodeText,
      table: exitTable,
      tableData: exit2,
      tableHeader: exit2,
      tableRow: exit2
    }
  };
}
function enterTable(token) {
  const align = token._align;
  ok(align, "expected `_align` on table");
  this.enter(
    {
      type: "table",
      align: align.map(function(d) {
        return d === "none" ? null : d;
      }),
      children: []
    },
    token
  );
  this.data.inTable = true;
}
function exitTable(token) {
  this.exit(token);
  this.data.inTable = void 0;
}
function enterRow(token) {
  this.enter({ type: "tableRow", children: [] }, token);
}
function exit2(token) {
  this.exit(token);
}
function enterCell(token) {
  this.enter({ type: "tableCell", children: [] }, token);
}
function exitCodeText(token) {
  let value = this.resume();
  if (this.data.inTable) {
    value = value.replace(/\\([\\|])/g, replace);
  }
  const node2 = this.stack[this.stack.length - 1];
  ok(node2.type === "inlineCode");
  node2.value = value;
  this.exit(token);
}
function replace($0, $1) {
  return $1 === "|" ? $1 : $0;
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-gfm-task-list-item@2.0.0/node_modules/mdast-util-gfm-task-list-item/lib/index.js
function gfmTaskListItemFromMarkdown() {
  return {
    exit: {
      taskListCheckValueChecked: exitCheck,
      taskListCheckValueUnchecked: exitCheck,
      paragraph: exitParagraphWithTaskListItem
    }
  };
}
function exitCheck(token) {
  const node2 = this.stack[this.stack.length - 2];
  ok(node2.type === "listItem");
  node2.checked = token.type === "taskListCheckValueChecked";
}
function exitParagraphWithTaskListItem(token) {
  const parent = this.stack[this.stack.length - 2];
  if (parent && parent.type === "listItem" && typeof parent.checked === "boolean") {
    const node2 = this.stack[this.stack.length - 1];
    ok(node2.type === "paragraph");
    const head = node2.children[0];
    if (head && head.type === "text") {
      const siblings = parent.children;
      let index2 = -1;
      let firstParaghraph;
      while (++index2 < siblings.length) {
        const sibling = siblings[index2];
        if (sibling.type === "paragraph") {
          firstParaghraph = sibling;
          break;
        }
      }
      if (firstParaghraph === node2) {
        head.value = head.value.slice(1);
        if (head.value.length === 0) {
          node2.children.shift();
        } else if (node2.position && head.position && typeof head.position.start.offset === "number") {
          head.position.start.column++;
          head.position.start.offset++;
          node2.position.start = Object.assign({}, head.position.start);
        }
      }
    }
  }
  this.exit(token);
}

// ../../deepseek-harness/node_modules/.pnpm/mdast-util-gfm@3.1.0/node_modules/mdast-util-gfm/lib/index.js
function gfmFromMarkdown() {
  return [
    gfmAutolinkLiteralFromMarkdown(),
    gfmFootnoteFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
    gfmTaskListItemFromMarkdown()
  ];
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm-autolink-literal@2.1.0/node_modules/micromark-extension-gfm-autolink-literal/lib/syntax.js
var wwwPrefix = {
  tokenize: tokenizeWwwPrefix,
  partial: true
};
var domain = {
  tokenize: tokenizeDomain,
  partial: true
};
var path = {
  tokenize: tokenizePath,
  partial: true
};
var trail = {
  tokenize: tokenizeTrail,
  partial: true
};
var emailDomainDotTrail = {
  tokenize: tokenizeEmailDomainDotTrail,
  partial: true
};
var wwwAutolink = {
  name: "wwwAutolink",
  tokenize: tokenizeWwwAutolink,
  previous: previousWww
};
var protocolAutolink = {
  name: "protocolAutolink",
  tokenize: tokenizeProtocolAutolink,
  previous: previousProtocol
};
var emailAutolink = {
  name: "emailAutolink",
  tokenize: tokenizeEmailAutolink,
  previous: previousEmail
};
var text3 = {};
function gfmAutolinkLiteral() {
  return {
    text: text3
  };
}
var code = 48;
while (code < 123) {
  text3[code] = emailAutolink;
  code++;
  if (code === 58) code = 65;
  else if (code === 91) code = 97;
}
text3[43] = emailAutolink;
text3[45] = emailAutolink;
text3[46] = emailAutolink;
text3[95] = emailAutolink;
text3[72] = [emailAutolink, protocolAutolink];
text3[104] = [emailAutolink, protocolAutolink];
text3[87] = [emailAutolink, wwwAutolink];
text3[119] = [emailAutolink, wwwAutolink];
function tokenizeEmailAutolink(effects, ok3, nok) {
  const self = this;
  let dot;
  let data;
  return start;
  function start(code2) {
    if (!gfmAtext(code2) || !previousEmail.call(self, self.previous) || previousUnbalanced(self.events)) {
      return nok(code2);
    }
    effects.enter("literalAutolink");
    effects.enter("literalAutolinkEmail");
    return atext(code2);
  }
  function atext(code2) {
    if (gfmAtext(code2)) {
      effects.consume(code2);
      return atext;
    }
    if (code2 === 64) {
      effects.consume(code2);
      return emailDomain;
    }
    return nok(code2);
  }
  function emailDomain(code2) {
    if (code2 === 46) {
      return effects.check(emailDomainDotTrail, emailDomainAfter, emailDomainDot)(code2);
    }
    if (code2 === 45 || code2 === 95 || asciiAlphanumeric(code2)) {
      data = true;
      effects.consume(code2);
      return emailDomain;
    }
    return emailDomainAfter(code2);
  }
  function emailDomainDot(code2) {
    effects.consume(code2);
    dot = true;
    return emailDomain;
  }
  function emailDomainAfter(code2) {
    if (data && dot && asciiAlpha(self.previous)) {
      effects.exit("literalAutolinkEmail");
      effects.exit("literalAutolink");
      return ok3(code2);
    }
    return nok(code2);
  }
}
function tokenizeWwwAutolink(effects, ok3, nok) {
  const self = this;
  return wwwStart;
  function wwwStart(code2) {
    if (code2 !== 87 && code2 !== 119 || !previousWww.call(self, self.previous) || previousUnbalanced(self.events)) {
      return nok(code2);
    }
    effects.enter("literalAutolink");
    effects.enter("literalAutolinkWww");
    return effects.check(wwwPrefix, effects.attempt(domain, effects.attempt(path, wwwAfter), nok), nok)(code2);
  }
  function wwwAfter(code2) {
    effects.exit("literalAutolinkWww");
    effects.exit("literalAutolink");
    return ok3(code2);
  }
}
function tokenizeProtocolAutolink(effects, ok3, nok) {
  const self = this;
  let buffer = "";
  let seen = false;
  return protocolStart;
  function protocolStart(code2) {
    if ((code2 === 72 || code2 === 104) && previousProtocol.call(self, self.previous) && !previousUnbalanced(self.events)) {
      effects.enter("literalAutolink");
      effects.enter("literalAutolinkHttp");
      buffer += String.fromCodePoint(code2);
      effects.consume(code2);
      return protocolPrefixInside;
    }
    return nok(code2);
  }
  function protocolPrefixInside(code2) {
    if (asciiAlpha(code2) && buffer.length < 5) {
      buffer += String.fromCodePoint(code2);
      effects.consume(code2);
      return protocolPrefixInside;
    }
    if (code2 === 58) {
      const protocol = buffer.toLowerCase();
      if (protocol === "http" || protocol === "https") {
        effects.consume(code2);
        return protocolSlashesInside;
      }
    }
    return nok(code2);
  }
  function protocolSlashesInside(code2) {
    if (code2 === 47) {
      effects.consume(code2);
      if (seen) {
        return afterProtocol;
      }
      seen = true;
      return protocolSlashesInside;
    }
    return nok(code2);
  }
  function afterProtocol(code2) {
    return code2 === null || asciiControl(code2) || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2) || unicodePunctuation(code2) ? nok(code2) : effects.attempt(domain, effects.attempt(path, protocolAfter), nok)(code2);
  }
  function protocolAfter(code2) {
    effects.exit("literalAutolinkHttp");
    effects.exit("literalAutolink");
    return ok3(code2);
  }
}
function tokenizeWwwPrefix(effects, ok3, nok) {
  let size = 0;
  return wwwPrefixInside;
  function wwwPrefixInside(code2) {
    if ((code2 === 87 || code2 === 119) && size < 3) {
      size++;
      effects.consume(code2);
      return wwwPrefixInside;
    }
    if (code2 === 46 && size === 3) {
      effects.consume(code2);
      return wwwPrefixAfter;
    }
    return nok(code2);
  }
  function wwwPrefixAfter(code2) {
    return code2 === null ? nok(code2) : ok3(code2);
  }
}
function tokenizeDomain(effects, ok3, nok) {
  let underscoreInLastSegment;
  let underscoreInLastLastSegment;
  let seen;
  return domainInside;
  function domainInside(code2) {
    if (code2 === 46 || code2 === 95) {
      return effects.check(trail, domainAfter, domainAtPunctuation)(code2);
    }
    if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2) || code2 !== 45 && unicodePunctuation(code2)) {
      return domainAfter(code2);
    }
    seen = true;
    effects.consume(code2);
    return domainInside;
  }
  function domainAtPunctuation(code2) {
    if (code2 === 95) {
      underscoreInLastSegment = true;
    } else {
      underscoreInLastLastSegment = underscoreInLastSegment;
      underscoreInLastSegment = void 0;
    }
    effects.consume(code2);
    return domainInside;
  }
  function domainAfter(code2) {
    if (underscoreInLastLastSegment || underscoreInLastSegment || !seen) {
      return nok(code2);
    }
    return ok3(code2);
  }
}
function tokenizePath(effects, ok3) {
  let sizeOpen = 0;
  let sizeClose = 0;
  return pathInside;
  function pathInside(code2) {
    if (code2 === 40) {
      sizeOpen++;
      effects.consume(code2);
      return pathInside;
    }
    if (code2 === 41 && sizeClose < sizeOpen) {
      return pathAtPunctuation(code2);
    }
    if (code2 === 33 || code2 === 34 || code2 === 38 || code2 === 39 || code2 === 41 || code2 === 42 || code2 === 44 || code2 === 46 || code2 === 58 || code2 === 59 || code2 === 60 || code2 === 63 || code2 === 93 || code2 === 95 || code2 === 126) {
      return effects.check(trail, ok3, pathAtPunctuation)(code2);
    }
    if (code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
      return ok3(code2);
    }
    effects.consume(code2);
    return pathInside;
  }
  function pathAtPunctuation(code2) {
    if (code2 === 41) {
      sizeClose++;
    }
    effects.consume(code2);
    return pathInside;
  }
}
function tokenizeTrail(effects, ok3, nok) {
  return trail2;
  function trail2(code2) {
    if (code2 === 33 || code2 === 34 || code2 === 39 || code2 === 41 || code2 === 42 || code2 === 44 || code2 === 46 || code2 === 58 || code2 === 59 || code2 === 63 || code2 === 95 || code2 === 126) {
      effects.consume(code2);
      return trail2;
    }
    if (code2 === 38) {
      effects.consume(code2);
      return trailCharacterReferenceStart;
    }
    if (code2 === 93) {
      effects.consume(code2);
      return trailBracketAfter;
    }
    if (
      // `<` is an end.
      code2 === 60 || // So is whitespace.
      code2 === null || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)
    ) {
      return ok3(code2);
    }
    return nok(code2);
  }
  function trailBracketAfter(code2) {
    if (code2 === null || code2 === 40 || code2 === 91 || markdownLineEndingOrSpace(code2) || unicodeWhitespace(code2)) {
      return ok3(code2);
    }
    return trail2(code2);
  }
  function trailCharacterReferenceStart(code2) {
    return asciiAlpha(code2) ? trailCharacterReferenceInside(code2) : nok(code2);
  }
  function trailCharacterReferenceInside(code2) {
    if (code2 === 59) {
      effects.consume(code2);
      return trail2;
    }
    if (asciiAlpha(code2)) {
      effects.consume(code2);
      return trailCharacterReferenceInside;
    }
    return nok(code2);
  }
}
function tokenizeEmailDomainDotTrail(effects, ok3, nok) {
  return start;
  function start(code2) {
    effects.consume(code2);
    return after;
  }
  function after(code2) {
    return asciiAlphanumeric(code2) ? nok(code2) : ok3(code2);
  }
}
function previousWww(code2) {
  return code2 === null || code2 === 40 || code2 === 42 || code2 === 95 || code2 === 91 || code2 === 93 || code2 === 126 || markdownLineEndingOrSpace(code2);
}
function previousProtocol(code2) {
  return !asciiAlpha(code2);
}
function previousEmail(code2) {
  return !(code2 === 47 || gfmAtext(code2));
}
function gfmAtext(code2) {
  return code2 === 43 || code2 === 45 || code2 === 46 || code2 === 95 || asciiAlphanumeric(code2);
}
function previousUnbalanced(events) {
  let index2 = events.length;
  let result = false;
  while (index2--) {
    const token = events[index2][1];
    if ((token.type === "labelLink" || token.type === "labelImage") && !token._balanced) {
      result = true;
      break;
    }
    if (token._gfmAutolinkLiteralWalkedInto) {
      result = false;
      break;
    }
  }
  if (events.length > 0 && !result) {
    events[events.length - 1][1]._gfmAutolinkLiteralWalkedInto = true;
  }
  return result;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm-footnote@2.1.0/node_modules/micromark-extension-gfm-footnote/lib/syntax.js
var indent = {
  tokenize: tokenizeIndent2,
  partial: true
};
function gfmFootnote() {
  return {
    document: {
      [91]: {
        name: "gfmFootnoteDefinition",
        tokenize: tokenizeDefinitionStart,
        continuation: {
          tokenize: tokenizeDefinitionContinuation
        },
        exit: gfmFootnoteDefinitionEnd
      }
    },
    text: {
      [91]: {
        name: "gfmFootnoteCall",
        tokenize: tokenizeGfmFootnoteCall
      },
      [93]: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: tokenizePotentialGfmFootnoteCall,
        resolveTo: resolveToPotentialGfmFootnoteCall
      }
    }
  };
}
function tokenizePotentialGfmFootnoteCall(effects, ok3, nok) {
  const self = this;
  let index2 = self.events.length;
  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  let labelStart;
  while (index2--) {
    const token = self.events[index2][1];
    if (token.type === "labelImage") {
      labelStart = token;
      break;
    }
    if (token.type === "gfmFootnoteCall" || token.type === "labelLink" || token.type === "label" || token.type === "image" || token.type === "link") {
      break;
    }
  }
  return start;
  function start(code2) {
    if (!labelStart || !labelStart._balanced) {
      return nok(code2);
    }
    const id = normalizeIdentifier(self.sliceSerialize({
      start: labelStart.end,
      end: self.now()
    }));
    if (id.codePointAt(0) !== 94 || !defined.includes(id.slice(1))) {
      return nok(code2);
    }
    effects.enter("gfmFootnoteCallLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallLabelMarker");
    return ok3(code2);
  }
}
function resolveToPotentialGfmFootnoteCall(events, context) {
  let index2 = events.length;
  let labelStart;
  while (index2--) {
    if (events[index2][1].type === "labelImage" && events[index2][0] === "enter") {
      labelStart = events[index2][1];
      break;
    }
  }
  events[index2 + 1][1].type = "data";
  events[index2 + 3][1].type = "gfmFootnoteCallLabelMarker";
  const call = {
    type: "gfmFootnoteCall",
    start: Object.assign({}, events[index2 + 3][1].start),
    end: Object.assign({}, events[events.length - 1][1].end)
  };
  const marker = {
    type: "gfmFootnoteCallMarker",
    start: Object.assign({}, events[index2 + 3][1].end),
    end: Object.assign({}, events[index2 + 3][1].end)
  };
  marker.end.column++;
  marker.end.offset++;
  marker.end._bufferIndex++;
  const string3 = {
    type: "gfmFootnoteCallString",
    start: Object.assign({}, marker.end),
    end: Object.assign({}, events[events.length - 1][1].start)
  };
  const chunk = {
    type: "chunkString",
    contentType: "string",
    start: Object.assign({}, string3.start),
    end: Object.assign({}, string3.end)
  };
  const replacement = [
    // Take the `labelImageMarker` (now `data`, the `!`)
    events[index2 + 1],
    events[index2 + 2],
    ["enter", call, context],
    // The `[`
    events[index2 + 3],
    events[index2 + 4],
    // The `^`.
    ["enter", marker, context],
    ["exit", marker, context],
    // Everything in between.
    ["enter", string3, context],
    ["enter", chunk, context],
    ["exit", chunk, context],
    ["exit", string3, context],
    // The ending (`]`, properly parsed and labelled).
    events[events.length - 2],
    events[events.length - 1],
    ["exit", call, context]
  ];
  events.splice(index2, events.length - index2 + 1, ...replacement);
  return events;
}
function tokenizeGfmFootnoteCall(effects, ok3, nok) {
  const self = this;
  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  let size = 0;
  let data;
  return start;
  function start(code2) {
    effects.enter("gfmFootnoteCall");
    effects.enter("gfmFootnoteCallLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallLabelMarker");
    return callStart;
  }
  function callStart(code2) {
    if (code2 !== 94) return nok(code2);
    effects.enter("gfmFootnoteCallMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteCallMarker");
    effects.enter("gfmFootnoteCallString");
    effects.enter("chunkString").contentType = "string";
    return callData;
  }
  function callData(code2) {
    if (
      // Too long.
      size > 999 || // Closing brace with nothing.
      code2 === 93 && !data || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      code2 === null || code2 === 91 || markdownLineEndingOrSpace(code2)
    ) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit("chunkString");
      const token = effects.exit("gfmFootnoteCallString");
      if (!defined.includes(normalizeIdentifier(self.sliceSerialize(token)))) {
        return nok(code2);
      }
      effects.enter("gfmFootnoteCallLabelMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteCallLabelMarker");
      effects.exit("gfmFootnoteCall");
      return ok3;
    }
    if (!markdownLineEndingOrSpace(code2)) {
      data = true;
    }
    size++;
    effects.consume(code2);
    return code2 === 92 ? callEscape : callData;
  }
  function callEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return callData;
    }
    return callData(code2);
  }
}
function tokenizeDefinitionStart(effects, ok3, nok) {
  const self = this;
  const defined = self.parser.gfmFootnotes || (self.parser.gfmFootnotes = []);
  let identifier;
  let size = 0;
  let data;
  return start;
  function start(code2) {
    effects.enter("gfmFootnoteDefinition")._container = true;
    effects.enter("gfmFootnoteDefinitionLabel");
    effects.enter("gfmFootnoteDefinitionLabelMarker");
    effects.consume(code2);
    effects.exit("gfmFootnoteDefinitionLabelMarker");
    return labelAtMarker;
  }
  function labelAtMarker(code2) {
    if (code2 === 94) {
      effects.enter("gfmFootnoteDefinitionMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteDefinitionMarker");
      effects.enter("gfmFootnoteDefinitionLabelString");
      effects.enter("chunkString").contentType = "string";
      return labelInside;
    }
    return nok(code2);
  }
  function labelInside(code2) {
    if (
      // Too long.
      size > 999 || // Closing brace with nothing.
      code2 === 93 && !data || // Space or tab is not supported by GFM for some reason.
      // `\n` and `[` not being supported makes sense.
      code2 === null || code2 === 91 || markdownLineEndingOrSpace(code2)
    ) {
      return nok(code2);
    }
    if (code2 === 93) {
      effects.exit("chunkString");
      const token = effects.exit("gfmFootnoteDefinitionLabelString");
      identifier = normalizeIdentifier(self.sliceSerialize(token));
      effects.enter("gfmFootnoteDefinitionLabelMarker");
      effects.consume(code2);
      effects.exit("gfmFootnoteDefinitionLabelMarker");
      effects.exit("gfmFootnoteDefinitionLabel");
      return labelAfter;
    }
    if (!markdownLineEndingOrSpace(code2)) {
      data = true;
    }
    size++;
    effects.consume(code2);
    return code2 === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code2) {
    if (code2 === 91 || code2 === 92 || code2 === 93) {
      effects.consume(code2);
      size++;
      return labelInside;
    }
    return labelInside(code2);
  }
  function labelAfter(code2) {
    if (code2 === 58) {
      effects.enter("definitionMarker");
      effects.consume(code2);
      effects.exit("definitionMarker");
      if (!defined.includes(identifier)) {
        defined.push(identifier);
      }
      return factorySpace(effects, whitespaceAfter, "gfmFootnoteDefinitionWhitespace");
    }
    return nok(code2);
  }
  function whitespaceAfter(code2) {
    return ok3(code2);
  }
}
function tokenizeDefinitionContinuation(effects, ok3, nok) {
  return effects.check(blankLine, ok3, effects.attempt(indent, ok3, nok));
}
function gfmFootnoteDefinitionEnd(effects) {
  effects.exit("gfmFootnoteDefinition");
}
function tokenizeIndent2(effects, ok3, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "gfmFootnoteDefinitionIndent", 4 + 1);
  function afterPrefix(code2) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "gfmFootnoteDefinitionIndent" && tail[2].sliceSerialize(tail[1], true).length === 4 ? ok3(code2) : nok(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm-strikethrough@2.1.0/node_modules/micromark-extension-gfm-strikethrough/lib/syntax.js
function gfmStrikethrough(options) {
  const options_ = options || {};
  let single = options_.singleTilde;
  const tokenizer = {
    name: "strikethrough",
    tokenize: tokenizeStrikethrough,
    resolveAll: resolveAllStrikethrough
  };
  if (single === null || single === void 0) {
    single = true;
  }
  return {
    text: {
      [126]: tokenizer
    },
    insideSpan: {
      null: [tokenizer]
    },
    attentionMarkers: {
      null: [126]
    }
  };
  function resolveAllStrikethrough(events, context) {
    let index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][0] === "enter" && events[index2][1].type === "strikethroughSequenceTemporary" && events[index2][1]._close) {
        let open = index2;
        while (open--) {
          if (events[open][0] === "exit" && events[open][1].type === "strikethroughSequenceTemporary" && events[open][1]._open && // If the sizes are the same:
          events[index2][1].end.offset - events[index2][1].start.offset === events[open][1].end.offset - events[open][1].start.offset) {
            events[index2][1].type = "strikethroughSequence";
            events[open][1].type = "strikethroughSequence";
            const strikethrough = {
              type: "strikethrough",
              start: Object.assign({}, events[open][1].start),
              end: Object.assign({}, events[index2][1].end)
            };
            const text4 = {
              type: "strikethroughText",
              start: Object.assign({}, events[open][1].end),
              end: Object.assign({}, events[index2][1].start)
            };
            const nextEvents = [["enter", strikethrough, context], ["enter", events[open][1], context], ["exit", events[open][1], context], ["enter", text4, context]];
            const insideSpan2 = context.parser.constructs.insideSpan.null;
            if (insideSpan2) {
              splice(nextEvents, nextEvents.length, 0, resolveAll(insideSpan2, events.slice(open + 1, index2), context));
            }
            splice(nextEvents, nextEvents.length, 0, [["exit", text4, context], ["enter", events[index2][1], context], ["exit", events[index2][1], context], ["exit", strikethrough, context]]);
            splice(events, open - 1, index2 - open + 3, nextEvents);
            index2 = open + nextEvents.length - 2;
            break;
          }
        }
      }
    }
    index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][1].type === "strikethroughSequenceTemporary") {
        events[index2][1].type = "data";
      }
    }
    return events;
  }
  function tokenizeStrikethrough(effects, ok3, nok) {
    const previous3 = this.previous;
    const events = this.events;
    let size = 0;
    return start;
    function start(code2) {
      if (previous3 === 126 && events[events.length - 1][1].type !== "characterEscape") {
        return nok(code2);
      }
      effects.enter("strikethroughSequenceTemporary");
      return more(code2);
    }
    function more(code2) {
      const before = classifyCharacter(previous3);
      if (code2 === 126) {
        if (size > 1) return nok(code2);
        effects.consume(code2);
        size++;
        return more;
      }
      if (size < 2 && !single) return nok(code2);
      const token = effects.exit("strikethroughSequenceTemporary");
      const after = classifyCharacter(code2);
      token._open = !after || after === 2 && Boolean(before);
      token._close = !before || before === 2 && Boolean(after);
      return ok3(code2);
    }
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm-table@2.1.1/node_modules/micromark-extension-gfm-table/lib/edit-map.js
var EditMap = class {
  /**
   * Create a new edit map.
   */
  constructor() {
    this.map = [];
  }
  /**
   * Create an edit: a remove and/or add at a certain place.
   *
   * @param {number} index
   * @param {number} remove
   * @param {Array<Event>} add
   * @returns {undefined}
   */
  add(index2, remove, add) {
    addImplementation(this, index2, remove, add);
  }
  // To do: add this when moving to `micromark`.
  // /**
  //  * Create an edit: but insert `add` before existing additions.
  //  *
  //  * @param {number} index
  //  * @param {number} remove
  //  * @param {Array<Event>} add
  //  * @returns {undefined}
  //  */
  // addBefore(index, remove, add) {
  //   addImplementation(this, index, remove, add, true)
  // }
  /**
   * Done, change the events.
   *
   * @param {Array<Event>} events
   * @returns {undefined}
   */
  consume(events) {
    this.map.sort(function(a, b) {
      return a[0] - b[0];
    });
    if (this.map.length === 0) {
      return;
    }
    let index2 = this.map.length;
    const vecs = [];
    while (index2 > 0) {
      index2 -= 1;
      vecs.push(events.slice(this.map[index2][0] + this.map[index2][1]), this.map[index2][2]);
      events.length = this.map[index2][0];
    }
    vecs.push(events.slice());
    events.length = 0;
    let slice = vecs.pop();
    while (slice) {
      for (const element2 of slice) {
        events.push(element2);
      }
      slice = vecs.pop();
    }
    this.map.length = 0;
  }
};
function addImplementation(editMap, at, remove, add) {
  let index2 = 0;
  if (remove === 0 && add.length === 0) {
    return;
  }
  while (index2 < editMap.map.length) {
    if (editMap.map[index2][0] === at) {
      editMap.map[index2][1] += remove;
      editMap.map[index2][2].push(...add);
      return;
    }
    index2 += 1;
  }
  editMap.map.push([at, remove, add]);
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm-table@2.1.1/node_modules/micromark-extension-gfm-table/lib/infer.js
function gfmTableAlign(events, index2) {
  let inDelimiterRow = false;
  const align = [];
  while (index2 < events.length) {
    const event = events[index2];
    if (inDelimiterRow) {
      if (event[0] === "enter") {
        if (event[1].type === "tableContent") {
          align.push(events[index2 + 1][1].type === "tableDelimiterMarker" ? "left" : "none");
        }
      } else if (event[1].type === "tableContent") {
        if (events[index2 - 1][1].type === "tableDelimiterMarker") {
          const alignIndex = align.length - 1;
          align[alignIndex] = align[alignIndex] === "left" ? "center" : "right";
        }
      } else if (event[1].type === "tableDelimiterRow") {
        break;
      }
    } else if (event[0] === "enter" && event[1].type === "tableDelimiterRow") {
      inDelimiterRow = true;
    }
    index2 += 1;
  }
  return align;
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm-table@2.1.1/node_modules/micromark-extension-gfm-table/lib/syntax.js
function gfmTable() {
  return {
    flow: {
      null: {
        name: "table",
        tokenize: tokenizeTable,
        resolveAll: resolveTable
      }
    }
  };
}
function tokenizeTable(effects, ok3, nok) {
  const self = this;
  let size = 0;
  let sizeB = 0;
  let seen;
  return start;
  function start(code2) {
    let index2 = self.events.length - 1;
    while (index2 > -1) {
      const type = self.events[index2][1].type;
      if (type === "lineEnding" || // Note: markdown-rs uses `whitespace` instead of `linePrefix`
      type === "linePrefix") index2--;
      else break;
    }
    const tail = index2 > -1 ? self.events[index2][1].type : null;
    const next = tail === "tableHead" || tail === "tableRow" ? bodyRowStart : headRowBefore;
    if (next === bodyRowStart && self.parser.lazy[self.now().line]) {
      return nok(code2);
    }
    return next(code2);
  }
  function headRowBefore(code2) {
    effects.enter("tableHead");
    effects.enter("tableRow");
    return headRowStart(code2);
  }
  function headRowStart(code2) {
    if (code2 === 124) {
      return headRowBreak(code2);
    }
    seen = true;
    sizeB += 1;
    return headRowBreak(code2);
  }
  function headRowBreak(code2) {
    if (code2 === null) {
      return nok(code2);
    }
    if (markdownLineEnding(code2)) {
      if (sizeB > 1) {
        sizeB = 0;
        self.interrupt = true;
        effects.exit("tableRow");
        effects.enter("lineEnding");
        effects.consume(code2);
        effects.exit("lineEnding");
        return headDelimiterStart;
      }
      return nok(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, headRowBreak, "whitespace")(code2);
    }
    sizeB += 1;
    if (seen) {
      seen = false;
      size += 1;
    }
    if (code2 === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      seen = true;
      return headRowBreak;
    }
    effects.enter("data");
    return headRowData(code2);
  }
  function headRowData(code2) {
    if (code2 === null || code2 === 124 || markdownLineEndingOrSpace(code2)) {
      effects.exit("data");
      return headRowBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? headRowEscape : headRowData;
  }
  function headRowEscape(code2) {
    if (code2 === 92 || code2 === 124) {
      effects.consume(code2);
      return headRowData;
    }
    return headRowData(code2);
  }
  function headDelimiterStart(code2) {
    self.interrupt = false;
    if (self.parser.lazy[self.now().line]) {
      return nok(code2);
    }
    effects.enter("tableDelimiterRow");
    seen = false;
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code2);
    }
    return headDelimiterBefore(code2);
  }
  function headDelimiterBefore(code2) {
    if (code2 === 45 || code2 === 58) {
      return headDelimiterValueBefore(code2);
    }
    if (code2 === 124) {
      seen = true;
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      return headDelimiterCellBefore;
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterCellBefore(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterValueBefore, "whitespace")(code2);
    }
    return headDelimiterValueBefore(code2);
  }
  function headDelimiterValueBefore(code2) {
    if (code2 === 58) {
      sizeB += 1;
      seen = true;
      effects.enter("tableDelimiterMarker");
      effects.consume(code2);
      effects.exit("tableDelimiterMarker");
      return headDelimiterLeftAlignmentAfter;
    }
    if (code2 === 45) {
      sizeB += 1;
      return headDelimiterLeftAlignmentAfter(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      return headDelimiterCellAfter(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterLeftAlignmentAfter(code2) {
    if (code2 === 45) {
      effects.enter("tableDelimiterFiller");
      return headDelimiterFiller(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterFiller(code2) {
    if (code2 === 45) {
      effects.consume(code2);
      return headDelimiterFiller;
    }
    if (code2 === 58) {
      seen = true;
      effects.exit("tableDelimiterFiller");
      effects.enter("tableDelimiterMarker");
      effects.consume(code2);
      effects.exit("tableDelimiterMarker");
      return headDelimiterRightAlignmentAfter;
    }
    effects.exit("tableDelimiterFiller");
    return headDelimiterRightAlignmentAfter(code2);
  }
  function headDelimiterRightAlignmentAfter(code2) {
    if (markdownSpace(code2)) {
      return factorySpace(effects, headDelimiterCellAfter, "whitespace")(code2);
    }
    return headDelimiterCellAfter(code2);
  }
  function headDelimiterCellAfter(code2) {
    if (code2 === 124) {
      return headDelimiterBefore(code2);
    }
    if (code2 === null || markdownLineEnding(code2)) {
      if (!seen || size !== sizeB) {
        return headDelimiterNok(code2);
      }
      effects.exit("tableDelimiterRow");
      effects.exit("tableHead");
      return ok3(code2);
    }
    return headDelimiterNok(code2);
  }
  function headDelimiterNok(code2) {
    return nok(code2);
  }
  function bodyRowStart(code2) {
    effects.enter("tableRow");
    return bodyRowBreak(code2);
  }
  function bodyRowBreak(code2) {
    if (code2 === 124) {
      effects.enter("tableCellDivider");
      effects.consume(code2);
      effects.exit("tableCellDivider");
      return bodyRowBreak;
    }
    if (code2 === null || markdownLineEnding(code2)) {
      effects.exit("tableRow");
      return ok3(code2);
    }
    if (markdownSpace(code2)) {
      return factorySpace(effects, bodyRowBreak, "whitespace")(code2);
    }
    effects.enter("data");
    return bodyRowData(code2);
  }
  function bodyRowData(code2) {
    if (code2 === null || code2 === 124 || markdownLineEndingOrSpace(code2)) {
      effects.exit("data");
      return bodyRowBreak(code2);
    }
    effects.consume(code2);
    return code2 === 92 ? bodyRowEscape : bodyRowData;
  }
  function bodyRowEscape(code2) {
    if (code2 === 92 || code2 === 124) {
      effects.consume(code2);
      return bodyRowData;
    }
    return bodyRowData(code2);
  }
}
function resolveTable(events, context) {
  let index2 = -1;
  let inFirstCellAwaitingPipe = true;
  let rowKind = 0;
  let lastCell = [0, 0, 0, 0];
  let cell = [0, 0, 0, 0];
  let afterHeadAwaitingFirstBodyRow = false;
  let lastTableEnd = 0;
  let currentTable;
  let currentBody;
  let currentCell;
  const map = new EditMap();
  while (++index2 < events.length) {
    const event = events[index2];
    const token = event[1];
    if (event[0] === "enter") {
      if (token.type === "tableHead") {
        afterHeadAwaitingFirstBodyRow = false;
        if (lastTableEnd !== 0) {
          flushTableEnd(map, context, lastTableEnd, currentTable, currentBody);
          currentBody = void 0;
          lastTableEnd = 0;
        }
        currentTable = {
          type: "table",
          start: Object.assign({}, token.start),
          // Note: correct end is set later.
          end: Object.assign({}, token.end)
        };
        map.add(index2, 0, [["enter", currentTable, context]]);
      } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
        inFirstCellAwaitingPipe = true;
        currentCell = void 0;
        lastCell = [0, 0, 0, 0];
        cell = [0, index2 + 1, 0, 0];
        if (afterHeadAwaitingFirstBodyRow) {
          afterHeadAwaitingFirstBodyRow = false;
          currentBody = {
            type: "tableBody",
            start: Object.assign({}, token.start),
            // Note: correct end is set later.
            end: Object.assign({}, token.end)
          };
          map.add(index2, 0, [["enter", currentBody, context]]);
        }
        rowKind = token.type === "tableDelimiterRow" ? 2 : currentBody ? 3 : 1;
      } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
        inFirstCellAwaitingPipe = false;
        if (cell[2] === 0) {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map, context, lastCell, rowKind, void 0, currentCell);
            lastCell = [0, 0, 0, 0];
          }
          cell[2] = index2;
        }
      } else if (token.type === "tableCellDivider") {
        if (inFirstCellAwaitingPipe) {
          inFirstCellAwaitingPipe = false;
        } else {
          if (lastCell[1] !== 0) {
            cell[0] = cell[1];
            currentCell = flushCell(map, context, lastCell, rowKind, void 0, currentCell);
          }
          lastCell = cell;
          cell = [lastCell[1], index2, 0, 0];
        }
      }
    } else if (token.type === "tableHead") {
      afterHeadAwaitingFirstBodyRow = true;
      lastTableEnd = index2;
    } else if (token.type === "tableRow" || token.type === "tableDelimiterRow") {
      lastTableEnd = index2;
      if (lastCell[1] !== 0) {
        cell[0] = cell[1];
        currentCell = flushCell(map, context, lastCell, rowKind, index2, currentCell);
      } else if (cell[1] !== 0) {
        currentCell = flushCell(map, context, cell, rowKind, index2, currentCell);
      }
      rowKind = 0;
    } else if (rowKind && (token.type === "data" || token.type === "tableDelimiterMarker" || token.type === "tableDelimiterFiller")) {
      cell[3] = index2;
    }
  }
  if (lastTableEnd !== 0) {
    flushTableEnd(map, context, lastTableEnd, currentTable, currentBody);
  }
  map.consume(context.events);
  index2 = -1;
  while (++index2 < context.events.length) {
    const event = context.events[index2];
    if (event[0] === "enter" && event[1].type === "table") {
      event[1]._align = gfmTableAlign(context.events, index2);
    }
  }
  return events;
}
function flushCell(map, context, range, rowKind, rowEnd, previousCell) {
  const groupName = rowKind === 1 ? "tableHeader" : rowKind === 2 ? "tableDelimiter" : "tableData";
  const valueName = "tableContent";
  if (range[0] !== 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, range[0]));
    map.add(range[0], 0, [["exit", previousCell, context]]);
  }
  const now = getPoint(context.events, range[1]);
  previousCell = {
    type: groupName,
    start: Object.assign({}, now),
    // Note: correct end is set later.
    end: Object.assign({}, now)
  };
  map.add(range[1], 0, [["enter", previousCell, context]]);
  if (range[2] !== 0) {
    const relatedStart = getPoint(context.events, range[2]);
    const relatedEnd = getPoint(context.events, range[3]);
    const valueToken = {
      type: valueName,
      start: Object.assign({}, relatedStart),
      end: Object.assign({}, relatedEnd)
    };
    map.add(range[2], 0, [["enter", valueToken, context]]);
    if (rowKind !== 2) {
      const start = context.events[range[2]];
      const end = context.events[range[3]];
      start[1].end = Object.assign({}, end[1].end);
      start[1].type = "chunkText";
      start[1].contentType = "text";
      if (range[3] > range[2] + 1) {
        const a = range[2] + 1;
        const b = range[3] - range[2] - 1;
        map.add(a, b, []);
      }
    }
    map.add(range[3] + 1, 0, [["exit", valueToken, context]]);
  }
  if (rowEnd !== void 0) {
    previousCell.end = Object.assign({}, getPoint(context.events, rowEnd));
    map.add(rowEnd, 0, [["exit", previousCell, context]]);
    previousCell = void 0;
  }
  return previousCell;
}
function flushTableEnd(map, context, index2, table, tableBody) {
  const exits = [];
  const related = getPoint(context.events, index2);
  if (tableBody) {
    tableBody.end = Object.assign({}, related);
    exits.push(["exit", tableBody, context]);
  }
  table.end = Object.assign({}, related);
  exits.push(["exit", table, context]);
  map.add(index2 + 1, 0, exits);
}
function getPoint(events, index2) {
  const event = events[index2];
  const side = event[0] === "enter" ? "start" : "end";
  return event[1][side];
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm-task-list-item@2.1.0/node_modules/micromark-extension-gfm-task-list-item/lib/syntax.js
var tasklistCheck = {
  name: "tasklistCheck",
  tokenize: tokenizeTasklistCheck
};
function gfmTaskListItem() {
  return {
    text: {
      [91]: tasklistCheck
    }
  };
}
function tokenizeTasklistCheck(effects, ok3, nok) {
  const self = this;
  return open;
  function open(code2) {
    if (
      // Exit if there’s stuff before.
      self.previous !== null || // Exit if not in the first content that is the first child of a list
      // item.
      !self._gfmTasklistFirstContentOfListItem
    ) {
      return nok(code2);
    }
    effects.enter("taskListCheck");
    effects.enter("taskListCheckMarker");
    effects.consume(code2);
    effects.exit("taskListCheckMarker");
    return inside;
  }
  function inside(code2) {
    if (markdownLineEndingOrSpace(code2)) {
      effects.enter("taskListCheckValueUnchecked");
      effects.consume(code2);
      effects.exit("taskListCheckValueUnchecked");
      return close;
    }
    if (code2 === 88 || code2 === 120) {
      effects.enter("taskListCheckValueChecked");
      effects.consume(code2);
      effects.exit("taskListCheckValueChecked");
      return close;
    }
    return nok(code2);
  }
  function close(code2) {
    if (code2 === 93) {
      effects.enter("taskListCheckMarker");
      effects.consume(code2);
      effects.exit("taskListCheckMarker");
      effects.exit("taskListCheck");
      return after;
    }
    return nok(code2);
  }
  function after(code2) {
    if (markdownLineEnding(code2)) {
      return ok3(code2);
    }
    if (markdownSpace(code2)) {
      return effects.check({
        tokenize: spaceThenNonSpace
      }, ok3, nok)(code2);
    }
    return nok(code2);
  }
}
function spaceThenNonSpace(effects, ok3, nok) {
  return factorySpace(effects, after, "whitespace");
  function after(code2) {
    return code2 === null ? nok(code2) : ok3(code2);
  }
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-extension-gfm@3.0.0/node_modules/micromark-extension-gfm/index.js
function gfm(options) {
  return combineExtensions([
    gfmAutolinkLiteral(),
    gfmFootnote(),
    gfmStrikethrough(options),
    gfmTable(),
    gfmTaskListItem()
  ]);
}

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-symbol@2.0.1/node_modules/micromark-util-symbol/lib/codes.js
var codes = (
  /** @type {const} */
  {
    carriageReturn: -5,
    lineFeed: -4,
    carriageReturnLineFeed: -3,
    horizontalTab: -2,
    virtualSpace: -1,
    eof: null,
    nul: 0,
    soh: 1,
    stx: 2,
    etx: 3,
    eot: 4,
    enq: 5,
    ack: 6,
    bel: 7,
    bs: 8,
    ht: 9,
    // `\t`
    lf: 10,
    // `\n`
    vt: 11,
    // `\v`
    ff: 12,
    // `\f`
    cr: 13,
    // `\r`
    so: 14,
    si: 15,
    dle: 16,
    dc1: 17,
    dc2: 18,
    dc3: 19,
    dc4: 20,
    nak: 21,
    syn: 22,
    etb: 23,
    can: 24,
    em: 25,
    sub: 26,
    esc: 27,
    fs: 28,
    gs: 29,
    rs: 30,
    us: 31,
    space: 32,
    exclamationMark: 33,
    // `!`
    quotationMark: 34,
    // `"`
    numberSign: 35,
    // `#`
    dollarSign: 36,
    // `$`
    percentSign: 37,
    // `%`
    ampersand: 38,
    // `&`
    apostrophe: 39,
    // `'`
    leftParenthesis: 40,
    // `(`
    rightParenthesis: 41,
    // `)`
    asterisk: 42,
    // `*`
    plusSign: 43,
    // `+`
    comma: 44,
    // `,`
    dash: 45,
    // `-`
    dot: 46,
    // `.`
    slash: 47,
    // `/`
    digit0: 48,
    // `0`
    digit1: 49,
    // `1`
    digit2: 50,
    // `2`
    digit3: 51,
    // `3`
    digit4: 52,
    // `4`
    digit5: 53,
    // `5`
    digit6: 54,
    // `6`
    digit7: 55,
    // `7`
    digit8: 56,
    // `8`
    digit9: 57,
    // `9`
    colon: 58,
    // `:`
    semicolon: 59,
    // `;`
    lessThan: 60,
    // `<`
    equalsTo: 61,
    // `=`
    greaterThan: 62,
    // `>`
    questionMark: 63,
    // `?`
    atSign: 64,
    // `@`
    uppercaseA: 65,
    // `A`
    uppercaseB: 66,
    // `B`
    uppercaseC: 67,
    // `C`
    uppercaseD: 68,
    // `D`
    uppercaseE: 69,
    // `E`
    uppercaseF: 70,
    // `F`
    uppercaseG: 71,
    // `G`
    uppercaseH: 72,
    // `H`
    uppercaseI: 73,
    // `I`
    uppercaseJ: 74,
    // `J`
    uppercaseK: 75,
    // `K`
    uppercaseL: 76,
    // `L`
    uppercaseM: 77,
    // `M`
    uppercaseN: 78,
    // `N`
    uppercaseO: 79,
    // `O`
    uppercaseP: 80,
    // `P`
    uppercaseQ: 81,
    // `Q`
    uppercaseR: 82,
    // `R`
    uppercaseS: 83,
    // `S`
    uppercaseT: 84,
    // `T`
    uppercaseU: 85,
    // `U`
    uppercaseV: 86,
    // `V`
    uppercaseW: 87,
    // `W`
    uppercaseX: 88,
    // `X`
    uppercaseY: 89,
    // `Y`
    uppercaseZ: 90,
    // `Z`
    leftSquareBracket: 91,
    // `[`
    backslash: 92,
    // `\`
    rightSquareBracket: 93,
    // `]`
    caret: 94,
    // `^`
    underscore: 95,
    // `_`
    graveAccent: 96,
    // `` ` ``
    lowercaseA: 97,
    // `a`
    lowercaseB: 98,
    // `b`
    lowercaseC: 99,
    // `c`
    lowercaseD: 100,
    // `d`
    lowercaseE: 101,
    // `e`
    lowercaseF: 102,
    // `f`
    lowercaseG: 103,
    // `g`
    lowercaseH: 104,
    // `h`
    lowercaseI: 105,
    // `i`
    lowercaseJ: 106,
    // `j`
    lowercaseK: 107,
    // `k`
    lowercaseL: 108,
    // `l`
    lowercaseM: 109,
    // `m`
    lowercaseN: 110,
    // `n`
    lowercaseO: 111,
    // `o`
    lowercaseP: 112,
    // `p`
    lowercaseQ: 113,
    // `q`
    lowercaseR: 114,
    // `r`
    lowercaseS: 115,
    // `s`
    lowercaseT: 116,
    // `t`
    lowercaseU: 117,
    // `u`
    lowercaseV: 118,
    // `v`
    lowercaseW: 119,
    // `w`
    lowercaseX: 120,
    // `x`
    lowercaseY: 121,
    // `y`
    lowercaseZ: 122,
    // `z`
    leftCurlyBrace: 123,
    // `{`
    verticalBar: 124,
    // `|`
    rightCurlyBrace: 125,
    // `}`
    tilde: 126,
    // `~`
    del: 127,
    // Unicode Specials block.
    byteOrderMarker: 65279,
    // Unicode Specials block.
    replacementCharacter: 65533
    // `�`
  }
);

// ../../deepseek-harness/node_modules/.pnpm/micromark-util-symbol@2.0.1/node_modules/micromark-util-symbol/lib/constants.js
var constants = (
  /** @type {const} */
  {
    attentionSideAfter: 2,
    // Symbol to mark an attention sequence as after content: `a*`
    attentionSideBefore: 1,
    // Symbol to mark an attention sequence as before content: `*a`
    atxHeadingOpeningFenceSizeMax: 6,
    // 6 number signs is fine, 7 isn’t.
    autolinkDomainSizeMax: 63,
    // 63 characters is fine, 64 is too many.
    autolinkSchemeSizeMax: 32,
    // 32 characters is fine, 33 is too many.
    cdataOpeningString: "CDATA[",
    // And preceded by `<![`.
    characterGroupPunctuation: 2,
    // Symbol used to indicate a character is punctuation
    characterGroupWhitespace: 1,
    // Symbol used to indicate a character is whitespace
    characterReferenceDecimalSizeMax: 7,
    // `&#9999999;`.
    characterReferenceHexadecimalSizeMax: 6,
    // `&#xff9999;`.
    characterReferenceNamedSizeMax: 31,
    // `&CounterClockwiseContourIntegral;`.
    codeFencedSequenceSizeMin: 3,
    // At least 3 ticks or tildes are needed.
    contentTypeContent: "content",
    contentTypeDocument: "document",
    contentTypeFlow: "flow",
    contentTypeString: "string",
    contentTypeText: "text",
    hardBreakPrefixSizeMin: 2,
    // At least 2 trailing spaces are needed.
    htmlBasic: 6,
    // Symbol for `<div`
    htmlCdata: 5,
    // Symbol for `<![CDATA[]]>`
    htmlComment: 2,
    // Symbol for `<!---->`
    htmlComplete: 7,
    // Symbol for `<x>`
    htmlDeclaration: 4,
    // Symbol for `<!doctype>`
    htmlInstruction: 3,
    // Symbol for `<?php?>`
    htmlRawSizeMax: 8,
    // Length of `textarea`.
    htmlRaw: 1,
    // Symbol for `<script>`
    linkResourceDestinationBalanceMax: 32,
    // See: <https://spec.commonmark.org/0.30/#link-destination>, <https://github.com/remarkjs/react-markdown/issues/658#issuecomment-984345577>
    linkReferenceSizeMax: 999,
    // See: <https://spec.commonmark.org/0.30/#link-label>
    listItemValueSizeMax: 10,
    // See: <https://spec.commonmark.org/0.30/#ordered-list-marker>
    numericBaseDecimal: 10,
    numericBaseHexadecimal: 16,
    tabSize: 4,
    // Tabs have a hard-coded size of 4, per CommonMark.
    thematicBreakMarkerCountMin: 3,
    // At least 3 asterisks, dashes, or underscores are needed.
    v8MaxSafeChunkSize: 1e4
    // V8 (and potentially others) have problems injecting giant arrays into other arrays, hence we operate in chunks.
  }
);

// src/fork/cjkFriendlyStrong.ts
var cjkCharacter = new RegExp([
  "\\p{Script_Extensions=Han}",
  "\\p{Script_Extensions=Hiragana}",
  "\\p{Script_Extensions=Katakana}",
  "\\p{Script_Extensions=Hangul}",
  "\\p{Script_Extensions=Bopomofo}"
].join("|"), "u");
function isCjkCharacter(code2) {
  return code2 !== null && code2 >= 0 && cjkCharacter.test(String.fromCodePoint(code2));
}
var tokenizeCjkFriendlyAttention = function(effects, ok3, nok) {
  const configuredAttentionMarkers = this.parser.constructs.attentionMarkers.null;
  if (configuredAttentionMarkers === void 0) {
    throw new Error("micromark CommonMark attention markers are unavailable");
  }
  const attentionMarkers2 = configuredAttentionMarkers;
  const previous3 = this.previous;
  const before = classifyCharacter(previous3);
  let marker = codes.eof;
  return start;
  function start(code2) {
    if (code2 !== codes.asterisk) return nok(code2);
    marker = code2;
    effects.enter("attentionSequence");
    return inside(code2);
  }
  function inside(code2) {
    if (code2 === marker) {
      effects.consume(code2);
      return inside;
    }
    const token = effects.exit("attentionSequence");
    const after = classifyCharacter(code2);
    const open = !after || after === constants.characterGroupPunctuation && Boolean(before) || attentionMarkers2.includes(code2);
    const commonMarkClose = !before || before === constants.characterGroupPunctuation && Boolean(after) || attentionMarkers2.includes(previous3);
    const markerCount = token.end.offset - token.start.offset;
    const cjkStrongClose = markerCount >= 2 && unicodePunctuation(previous3) && isCjkCharacter(code2);
    const close = commonMarkClose || cjkStrongClose;
    token._open = open;
    token._close = close;
    return ok3(code2);
  }
};
var cjkFriendlyAttention = {
  name: "cjkFriendlyAttention",
  resolveAll: attention.resolveAll,
  tokenize: tokenizeCjkFriendlyAttention
};
var cjkFriendlyStrongExtension = {
  text: { [codes.asterisk]: cjkFriendlyAttention }
};
function cjkFriendlyStrong() {
  return cjkFriendlyStrongExtension;
}

// src/fork/parse.ts
function parseGfm(text4) {
  return fromMarkdown(text4, {
    extensions: [gfm(), cjkFriendlyStrong()],
    mdastExtensions: [gfmFromMarkdown()]
  });
}
function parseGfmWithMath(text4) {
  return parseGfm(text4);
}

// src/fork/render.tsx
var import_react2 = require("react");

// src/fork/CodeBlock.tsx
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/fork/katex.tsx
function renderTexToReact(value, _display) {
  return value;
}

// src/LinkIcon.tsx
var import_react = require("react");
function classifyLinkPath(value) {
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return "url";
  return "code";
}
function LinkIcon(props) {
  const url = props.kind === "url";
  return (0, import_react.createElement)(
    "svg",
    {
      className: props.className,
      width: 12,
      height: 12,
      viewBox: "0 0 16 16",
      fill: "none",
      "aria-hidden": "true",
      style: { flexShrink: 0, verticalAlign: "-1px" }
    },
    url ? (0, import_react.createElement)("path", {
      d: "M6.5 3.5h6v6M12 4 7 9M6 4H4.5A1.5 1.5 0 0 0 3 5.5v6A1.5 1.5 0 0 0 4.5 13h6A1.5 1.5 0 0 0 12 11.5V10",
      stroke: "currentColor",
      strokeWidth: 1.4,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }) : (0, import_react.createElement)("path", {
      d: "M5 3.5 11.5 8 5 12.5",
      stroke: "currentColor",
      strokeWidth: 1.4,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    })
  );
}

// src/fork/css.ts
var css = {
  markdown: "dcr-md",
  linkIcon: "dcr-link-icon",
  fileMention: "dcr-file-mention",
  tableScroll: "dcr-table-scroll",
  tableFill: "dcr-table-fill",
  imageAlt: "dcr-image-alt",
  image: "dcr-image"
};
var css_default = css;

// src/fork/render.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function clsx(...values) {
  return values.filter((value) => typeof value === "string" && value !== "").join(" ");
}
function sanitizeUrl(url) {
  try {
    switch (new URL(url).protocol) {
      case "http:":
      case "https:":
      case "mailto:":
        return url;
      default:
        return "";
    }
  } catch {
    return "";
  }
}
function remoteImageUrl(url) {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:" ? url : void 0;
  } catch {
    return void 0;
  }
}
function vocabularyImageUrl(url) {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "blob:" || protocol === "data:" ? url : void 0;
  } catch {
    return void 0;
  }
}
function imageSource(url, pathImages) {
  const remote = remoteImageUrl(sanitizeUrl(normalizeUri(url)));
  if (remote !== void 0) return remote;
  const rewritten = pathImages?.resolve(url);
  return rewritten === void 0 ? void 0 : vocabularyImageUrl(rewritten);
}
function createReferenceTargets() {
  return { definitions: /* @__PURE__ */ new Map(), footnotes: /* @__PURE__ */ new Map() };
}
function collectReferenceTargets(nodes, targets) {
  for (const node2 of nodes) {
    if (node2.type === "definition") {
      const id = node2.identifier.toUpperCase();
      if (!targets.definitions.has(id)) targets.definitions.set(id, node2);
    } else if (node2.type === "footnoteDefinition") {
      const id = node2.identifier.toUpperCase();
      if (!targets.footnotes.has(id)) targets.footnotes.set(id, node2);
    }
    if ("children" in node2) collectReferenceTargets(node2.children, targets);
  }
}
function renderBlocks(blocks, context) {
  return blocks.map((block) => renderNode(block.node, block.key, context)).filter((element2) => element2 !== null);
}
function wrapBlockChildren(elements, edges) {
  const wrapped = [];
  for (const element2 of elements) {
    if (edges || wrapped.length > 0) wrapped.push("\n");
    wrapped.push(element2);
  }
  if (edges && elements.length > 0) wrapped.push("\n");
  return wrapped;
}
function renderBlockEntries(blocks, context) {
  const entries = [];
  for (const [index2, block] of blocks.entries()) {
    if (block.type === "paragraph") {
      entries.push({ paragraph: renderChildren(block.children, context) });
    } else {
      const element2 = renderNode(block, index2, context);
      if (element2 !== null) entries.push({ element: element2 });
    }
  }
  return entries;
}
function renderChildren(nodes, context) {
  return nodes.map((node2, index2) => renderNode(node2, index2, context));
}
function CommandPromptIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "15", height: "15", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", className: "dcr-command-icon", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "1.5", y: "1.5", width: "13", height: "13", rx: "3", fill: "currentColor", fillOpacity: "0.14", stroke: "currentColor", strokeWidth: "1.1" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4.4 6.1L6.7 8L4.4 9.9", stroke: "currentColor", strokeWidth: "1.25", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8.3 10.2H11.5", stroke: "currentColor", strokeWidth: "1.25", strokeLinecap: "round" })
  ] });
}
function renderTextMentions(value, context, key) {
  const matcher = context.textMentions;
  if (matcher === void 0 || context.inLink === true) return value;
  const mentions = matcher.match(value);
  if (mentions.length === 0) return value;
  const nodes = [];
  let cursor = 0;
  for (const mention of mentions) {
    if (mention.start < cursor || mention.end > value.length || mention.end <= mention.start) continue;
    if (mention.start > cursor) nodes.push(value.slice(cursor, mention.start));
    if (mention.kind === "url") {
      const href = mention.href ?? mention.label;
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", { href, target: "_blank", rel: "noopener noreferrer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LinkIcon, { kind: "url", className: css_default.linkIcon }),
          mention.label
        ] }, `${key}:m${mention.start}`)
      );
    } else if (mention.kind === "command") {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: `${css_default.fileMention} dcr-command-chip`,
            title: mention.title,
            "aria-label": mention.title,
            "data-coderef-chip": "true",
            "data-coderef-command": "true",
            onClick: mention.open,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandPromptIcon, {}),
              mention.label
            ]
          },
          `${key}:m${mention.start}`
        )
      );
    } else {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: css_default.fileMention,
            title: mention.title,
            "aria-label": mention.title,
            "data-coderef-chip": "true",
            onClick: mention.open,
            onContextMenu: (event) => {
              if (context.onReferenceContextMenu === void 0) return;
              event.preventDefault();
              context.onReferenceContextMenu(event, {
                file: mention.file,
                line: mention.line,
                endLine: mention.endLine,
                title: mention.title
              });
            },
            children: mention.label
          },
          `${key}:m${mention.start}`
        )
      );
    }
    cursor = mention.end;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Fragment, { children: nodes }, key);
}
function renderNode(node2, key, context) {
  switch (node2.type) {
    case "text":
      return renderTextMentions(node2.value, context, key);
    case "paragraph":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: renderChildren(node2.children, context) }, key);
    case "heading":
      return (0, import_react2.createElement)(`h${node2.depth}`, { key }, ...renderChildren(node2.children, context));
    case "blockquote":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { children: wrapBlockChildren(
        renderChildren(node2.children, { ...context, inBlockquote: true }).filter((child) => child !== null),
        true
      ) }, key);
    case "thematicBreak":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("hr", {}, key);
    case "break":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        "\n"
      ] }, key);
    case "strong": {
      const child = node2.children.length === 1 ? node2.children[0] : void 0;
      const text4 = child !== void 0 && child.type === "text" ? child.value : void 0;
      const mention = text4 === void 0 || context.inLink === true ? void 0 : context.fileMentions?.resolve(text4);
      if (mention !== void 0 && text4 !== void 0) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: `${css_default.fileMention} dcr-strong-chip`,
            title: mention.title,
            "aria-label": mention.label,
            "data-coderef-chip": "true",
            onClick: mention.open,
            onContextMenu: (event) => {
              if (context.onReferenceContextMenu === void 0) return;
              event.preventDefault();
              context.onReferenceContextMenu(event, { file: mention.file, line: mention.line, endLine: mention.endLine, title: mention.title });
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LinkIcon, { kind: classifyLinkPath(text4), className: css_default.linkIcon }),
              text4
            ]
          },
          key
        );
      }
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: renderChildren(node2.children, context) }, key);
    }
    case "emphasis":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: renderChildren(node2.children, context) }, key);
    case "delete":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("del", { children: renderChildren(node2.children, context) }, key);
    case "inlineCode": {
      const value = node2.value.replace(/\r?\n|\r/g, " ");
      const href = inlineCodeHttpUrl(value);
      if (href !== void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: renderSafeLink(href, [value], "link") }, key);
      const command = context.inLink === true ? void 0 : context.commandMentions?.resolve(value);
      if (command !== void 0) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "dcr-command-code", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: `${css_default.fileMention} dcr-command-chip`,
            title: command.title,
            "aria-label": command.title,
            "data-coderef-chip": "true",
            "data-coderef-command": "true",
            onClick: () => {
              command.run();
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandPromptIcon, {}),
              value
            ]
          }
        ) }, key);
      }
      const mention = context.inLink === true ? void 0 : context.fileMentions?.resolve(value);
      if (mention !== void 0) {
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: css_default.fileMention,
            title: mention.title,
            "aria-label": mention.label,
            "data-coderef-chip": "true",
            onClick: mention.open,
            onContextMenu: (event) => {
              if (context.onReferenceContextMenu === void 0) return;
              event.preventDefault();
              context.onReferenceContextMenu(event, { file: mention.file, line: mention.line, endLine: mention.endLine, title: mention.title });
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LinkIcon, { kind: classifyLinkPath(value), className: css_default.linkIcon }),
              value
            ]
          }
        ) }, key);
      }
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: value }, key);
    }
    case "html":
      return node2.value;
    case "code":
      return renderCode(node2, key, context);
    case "math":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Fragment, { children: renderTexToReact(node2.value, true) }, key);
    case "inlineMath":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Fragment, { children: renderTexToReact(node2.value, false) }, key);
    case "list":
      return renderList(node2, key, context);
    case "listItem":
      return renderListItem(node2, listItemLoose(node2), key, context);
    case "table":
      return renderTable(node2, key, context);
    case "link": {
      if (context.coderefLinks !== void 0 && /^coderef:/i.test(node2.url)) {
        const links = context.coderefLinks;
        const isCommand = /^coderef:cmd:/i.test(node2.url);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: isCommand ? `${css_default.fileMention} dcr-command-chip` : css_default.fileMention,
            title: node2.url,
            "data-coderef-chip": "true",
            ...isCommand ? { "data-coderef-command": "true" } : {},
            onClick: () => links.open(node2.url),
            children: [
              isCommand ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandPromptIcon, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LinkIcon, { kind: "code", className: css_default.linkIcon }),
              renderChildren(node2.children, { ...context, inLink: true })
            ]
          },
          key
        );
      }
      return renderAnchor(node2.url, renderChildren(node2.children, { ...context, inLink: true }), key, !anchorWrapsOnlyImages(node2.children));
    }
    case "linkReference":
      return renderLinkReference(node2, key, context);
    case "image":
      return renderImage(node2.url, node2.alt ?? "", key, context);
    case "imageReference":
      return renderImageReference(node2, key, context);
    case "footnoteReference":
      return renderFootnoteReference(node2, key, context);
    case "definition":
    case "footnoteDefinition":
      return null;
    default:
      return null;
  }
}
function renderCode(node2, key, context) {
  const language = node2.lang ?? void 0;
  if (node2.value === "") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: language === void 0 ? void 0 : `language-${language}` }) }, key);
  }
  const lang = language === void 0 ? void 0 : /^[\w-]+/.exec(language)?.[0];
  if (!context.streaming && lang === "math") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Fragment, { children: renderTexToReact(`${node2.value}
`, true) }, key);
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_dsh_client_ui_primitives.CodeBlock,
    {
      code: `${node2.value}
`,
      lang,
      streaming: context.streaming,
      copyLabel: context.labels.code.copyLabel,
      copiedLabel: context.labels.code.copiedLabel
    },
    key
  );
}
function listLoose(list2) {
  return (list2.spread ?? false) || list2.children.some(listItemLoose);
}
function listItemLoose(item) {
  return item.spread ?? item.children.length > 1;
}
function renderList(node2, key, context) {
  const loose = listLoose(node2);
  const properties = {};
  if (typeof node2.start === "number" && node2.start !== 1) properties.start = node2.start;
  if (node2.children.some((item) => typeof item.checked === "boolean")) {
    properties.className = "contains-task-list";
  }
  return (0, import_react2.createElement)(
    node2.ordered === true ? "ol" : "ul",
    { key, ...properties },
    ...node2.children.map((item, index2) => renderListItem(item, loose, index2, context))
  );
}
function renderListItem(item, loose, key, context) {
  const entries = renderBlockEntries(item.children, context);
  const task = typeof item.checked === "boolean";
  if (task) {
    const checkbox = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: item.checked === true, disabled: true }, "task-checkbox");
    const head = entries[0];
    if (head !== void 0 && "paragraph" in head) {
      head.paragraph = head.paragraph.length > 0 ? [checkbox, " ", ...head.paragraph] : [checkbox];
    } else {
      entries.unshift({ paragraph: [checkbox] });
    }
  }
  const parts = [];
  for (const [index2, entry] of entries.entries()) {
    const isParagraph = "paragraph" in entry;
    if (loose || index2 !== 0 || !isParagraph) parts.push("\n");
    if (!isParagraph) parts.push(entry.element);
    else if (loose) parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: entry.paragraph }, `p-${index2}`));
    else parts.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Fragment, { children: entry.paragraph }, `p-${index2}`));
  }
  const tail = entries[entries.length - 1];
  if (tail !== void 0 && (loose || !("paragraph" in tail))) parts.push("\n");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { className: task ? "task-list-item" : void 0, children: parts }, key);
}
function renderTable(node2, key, context) {
  const align = node2.align ?? null;
  const [headRow, ...bodyRows] = node2.children;
  const columns = align === null ? headRow?.children.length ?? 0 : align.length;
  const wide = columns >= 4 && context.inBlockquote !== true;
  return (
    // Wide tables rest with overflow-x hidden (the hover-revealed bar in
    // MarkdownText.module.css), which drops Chromium's implicit scroller
    // focusability — the explicit tabindex keeps them keyboard-reachable,
    // and :focus-visible restores scrolling.
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: clsx(css_default.tableScroll, wide ? "md-table-wide" : css_default.tableFill),
        tabIndex: wide ? 0 : void 0,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [
          headRow !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: renderTableRow(headRow, "th", align, 0, context) }),
          bodyRows.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: bodyRows.map((row, index2) => renderTableRow(row, "td", align, index2 + 1, context)) })
        ] })
      },
      key
    )
  );
}
function renderTableRow(row, cellTag, align, key, context) {
  const length = align === null ? row.children.length : align.length;
  const cells = [];
  for (let index2 = 0; index2 < length; index2++) {
    const cell = row.children[index2];
    const alignValue = align?.[index2];
    cells.push((0, import_react2.createElement)(
      cellTag,
      // hast-util-to-jsx-runtime's default tableCellAlignToStyle turned the
      // deprecated align attribute into an inline style; keep that DOM.
      { key: index2, style: alignValue == null ? void 0 : { textAlign: alignValue } },
      ...cell === void 0 ? [] : renderChildren(cell.children, context)
    ));
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: cells }, key);
}
function anchorWrapsOnlyImages(children) {
  return children.length > 0 && children.every((child) => child.type === "image" || child.type === "imageReference");
}
function renderSafeLink(href, children, key, glyph = true) {
  const safeHref = sanitizeUrl(href);
  if (safeHref === "") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Fragment, { children }, key);
  const external = ["http:", "https:"].includes(new URL(safeHref).protocol);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "a",
    {
      href: safeHref,
      ...external ? { target: "_blank", rel: "noopener noreferrer" } : {},
      children: [
        glyph && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LinkIcon, { kind: "url", className: css_default.linkIcon }),
        children
      ]
    },
    key
  );
}
function renderAnchor(url, children, key, glyph = true) {
  return renderSafeLink(normalizeUri(url), children, key, glyph);
}
function inlineCodeHttpUrl(value) {
  if (value.trim() !== value) return void 0;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:" ? value : void 0;
  } catch {
    return void 0;
  }
}
function renderImage(url, alt, key, context) {
  const imageSrc = imageSource(url, context.pathImages);
  if (imageSrc === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: css_default.imageAlt, children: alt }, key);
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarkdownImage, { src: imageSrc, alt, destination: url }, `${key}:${imageSrc}`);
}
function MarkdownImage({ src, alt, destination }) {
  const [failed, setFailed] = (0, import_react2.useState)(false);
  if (failed) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: css_default.imageAlt, children: alt || destination });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "img",
    {
      className: css_default.image,
      src,
      alt,
      onError: () => {
        setFailed(true);
      },
      loading: "lazy",
      decoding: "async",
      referrerPolicy: "no-referrer"
    }
  );
}
function referenceSuffix(node2) {
  if (node2.referenceType === "collapsed") return "][]";
  if (node2.referenceType === "full") return `][${node2.label ?? node2.identifier}]`;
  return "]";
}
function renderLinkReference(node2, key, context) {
  const definition2 = context.targets.definitions.get(node2.identifier.toUpperCase());
  if (definition2 === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.Fragment, { children: [
      "[",
      renderChildren(node2.children, context),
      referenceSuffix(node2)
    ] }, key);
  }
  const rendered = renderChildren(node2.children, { ...context, inLink: true });
  return renderAnchor(definition2.url, rendered, key, !anchorWrapsOnlyImages(node2.children));
}
function renderImageReference(node2, key, context) {
  const definition2 = context.targets.definitions.get(node2.identifier.toUpperCase());
  if (definition2 === void 0) return `![${node2.alt ?? ""}${referenceSuffix(node2)}`;
  return renderImage(definition2.url, node2.alt ?? "", key, context);
}
function renderFootnoteReference(node2, key, context) {
  const id = node2.identifier.toUpperCase();
  const seen = context.footnoteCounts.get(id);
  if (seen === void 0) context.footnoteOrder.push(id);
  context.footnoteCounts.set(id, (seen ?? 0) + 1);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: String(context.footnoteOrder.indexOf(id) + 1) }, key);
}
function renderFootnoteSection(context) {
  const items = [];
  for (const id of context.footnoteOrder) {
    const definition2 = context.targets.footnotes.get(id);
    if (definition2 === void 0) continue;
    const count = context.footnoteCounts.get(id) ?? 0;
    const backrefs = [];
    for (let reference = 1; reference <= count; reference++) {
      if (backrefs.length > 0) backrefs.push(" ");
      backrefs.push("\u21A9");
      if (reference > 1) backrefs.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: String(reference) }, `re-${reference}`));
    }
    const entries = renderBlockEntries(definition2.children, context);
    const tail = entries[entries.length - 1];
    const body = entries.map((entry, index2) => "paragraph" in entry ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      entry.paragraph,
      entry === tail && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        " ",
        backrefs
      ] })
    ] }, `p-${index2}`) : entry.element);
    if (tail === void 0 || !("paragraph" in tail)) body.push(...backrefs);
    items.push(
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { id: `user-content-fn-${normalizeUri(id.toLowerCase())}`, children: wrapBlockChildren(body, true) }, id)
    );
  }
  if (items.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { "data-footnotes": true, className: "footnotes", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { id: "footnote-label", className: "sr-only", children: context.labels.footnotes }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { children: items })
  ] }, "footnotes");
}

// src/fork/MarkdownText.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function renderSettled(text4, labels, fileMentions, pathImages, coderefLinks, textMentions, commandMentions, onReferenceContextMenu) {
  const root = parseGfmWithMath(text4);
  const targets = createReferenceTargets();
  collectReferenceTargets(root.children, targets);
  const context = {
    streaming: false,
    labels,
    fileMentions,
    pathImages,
    coderefLinks,
    textMentions,
    commandMentions,
    onReferenceContextMenu,
    targets,
    footnoteOrder: [],
    footnoteCounts: /* @__PURE__ */ new Map()
  };
  const blocks = wrapBlockChildren(
    renderBlocks(root.children.map((node2, index2) => ({
      node: node2,
      /* v8 ignore next -- parseFull uses parseGfm, which stamps every top-level node. */
      key: node2.position?.start.offset ?? -(index2 + 1)
    })), context),
    false
  );
  const section = renderFootnoteSection(context);
  return section === null ? blocks : [...blocks, "\n", section];
}
var StreamingRenderer = class {
  /** @param labels - Localized Markdown chrome baked into cached elements; the owner replaces the renderer when it changes. */
  constructor(labels) {
    __publicField(this, "labels", labels);
    __publicField(this, "parser", new IncrementalMarkdownParser(parseGfm));
    __publicField(this, "generation", -1);
    __publicField(this, "frozenCount", 0);
    __publicField(this, "frozenElements", []);
    __publicField(this, "frozenTargets", createReferenceTargets());
    __publicField(this, "frozenFootnoteOrder", []);
    __publicField(this, "frozenFootnoteCounts", /* @__PURE__ */ new Map());
    __publicField(this, "lastText", null);
    __publicField(this, "lastRendered", []);
  }
  /**
   * Render the current accumulated text. Idempotent per text value, so React
   * may re-execute the calling render freely.
   * @param text - The full accumulated markdown source.
   * @returns Frozen elements, re-rendered tail, and the footnote section.
   */
  render(text4) {
    if (text4 === this.lastText) return this.lastRendered;
    const { frozen, tail, generation } = this.parser.update(text4);
    if (generation !== this.generation) {
      this.generation = generation;
      this.frozenCount = 0;
      this.frozenElements = [];
      this.frozenTargets = createReferenceTargets();
      this.frozenFootnoteOrder = [];
      this.frozenFootnoteCounts = /* @__PURE__ */ new Map();
    }
    const newlyFrozen = frozen.slice(this.frozenCount);
    collectReferenceTargets(newlyFrozen.map((block) => block.node), this.frozenTargets);
    const frameTargets = {
      definitions: new Map(this.frozenTargets.definitions),
      footnotes: new Map(this.frozenTargets.footnotes)
    };
    collectReferenceTargets(tail.map((block) => block.node), frameTargets);
    if (newlyFrozen.length > 0) {
      const frozenContext = {
        streaming: true,
        labels: this.labels,
        fileMentions: void 0,
        pathImages: void 0,
        coderefLinks: void 0,
        textMentions: void 0,
        commandMentions: void 0,
        onReferenceContextMenu: void 0,
        targets: frameTargets,
        footnoteOrder: this.frozenFootnoteOrder,
        footnoteCounts: this.frozenFootnoteCounts
      };
      const batch = [...this.frozenElements];
      for (const element2 of renderBlocks(newlyFrozen, frozenContext)) {
        if (batch.length > 0) batch.push("\n");
        batch.push(element2);
      }
      this.frozenElements = batch;
      this.frozenCount = frozen.length;
    }
    const tailContext = {
      streaming: true,
      labels: this.labels,
      fileMentions: void 0,
      pathImages: void 0,
      coderefLinks: void 0,
      textMentions: void 0,
      commandMentions: void 0,
      onReferenceContextMenu: void 0,
      targets: frameTargets,
      footnoteOrder: [...this.frozenFootnoteOrder],
      footnoteCounts: new Map(this.frozenFootnoteCounts)
    };
    const children = [...this.frozenElements];
    for (const element2 of renderBlocks(tail, tailContext)) {
      if (children.length > 0) children.push("\n");
      children.push(element2);
    }
    const section = renderFootnoteSection(tailContext);
    if (section !== null) children.push("\n", section);
    this.lastText = text4;
    this.lastRendered = children;
    return this.lastRendered;
  }
};
var MarkdownText = (0, import_react3.memo)(function MarkdownText2({ text: text4, streaming = false, labels, fileMentions, pathImages, coderefLinks, textMentions, commandMentions, onReferenceContextMenu }) {
  const streamRef = (0, import_react3.useRef)(null);
  const streamLabelsRef = (0, import_react3.useRef)(labels);
  const children = (0, import_react3.useMemo)(() => {
    if (!streaming) {
      streamRef.current = null;
      return renderSettled(text4, labels, fileMentions, pathImages, coderefLinks, textMentions, commandMentions, onReferenceContextMenu);
    }
    if (streamRef.current === null || streamLabelsRef.current !== labels) {
      streamRef.current = new StreamingRenderer(labels);
      streamLabelsRef.current = labels;
    }
    return streamRef.current.render(text4);
  }, [text4, streaming, labels, fileMentions, pathImages, coderefLinks, textMentions, commandMentions, onReferenceContextMenu]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: css_default.markdown, children });
});

// src/styles.ts
var STYLES = [
  // AssistantMarkdown.root + .body
  ".dcr-root { display:flex; flex-direction:column; font-size:var(--dsh-content-font-size,14px); line-height:calc(24px + var(--dsh-content-font-delta,0px)); color:var(--dsw-alias-label-primary); }",
  ".dcr-body { display:flex; flex-direction:column; gap:16px; min-width:0; }",
  // MarkdownText.markdown
  ".dcr-md { min-width:0; overflow-wrap:anywhere; font:var(--dsw-font-markdown-base); color:var(--dsw-alias-label-primary); }",
  ".dcr-md strong { font-weight:600; }",
  ".dcr-md h1 { font:var(--dsw-font-markdown-h1); margin:32px 0 16px; }",
  ".dcr-md h2 { font:var(--dsw-font-markdown-h2); margin:32px 0 16px; }",
  ".dcr-md h3 { font:var(--dsw-font-markdown-h3); margin:32px 0 16px; }",
  ".dcr-md h4 { font:var(--dsw-font-markdown-h4); margin:16px 0; }",
  ".dcr-md :where(h5, h6) { font:var(--dsw-font-markdown-base-strong); margin:16px 0; }",
  ".dcr-md :where(h1, h2, h3, h4, h5, h6) strong { font-weight:inherit; }",
  ".dcr-md p { margin:16px 0; }",
  ".dcr-md :where(h4, h5, h6) + :where(ul, ol) { margin-top:8px; }",
  ".dcr-md :where(h4, h5, h6):has(+ :where(ul, ol)) { margin-bottom:8px; }",
  ".dcr-md a { color:var(--dsw-alias-link); font-weight:500; transition:box-shadow var(--ds-transition-duration) var(--ds-ease-in-out); position:relative; text-decoration:none; border-left:3px solid rgb(255 255 255 / 0); border-right:3px solid rgb(255 255 255 / 0); border-top:2px solid rgb(255 255 255 / 0); border-bottom:2px solid rgb(255 255 255 / 0); margin-left:-3px; margin-right:-3px; }",
  ".dcr-md a:hover, .dcr-md a:focus { outline:none; text-decoration:underline dotted var(--dsw-alias-link); text-underline-offset:3px; }",
  ".dcr-md a:focus-visible { box-shadow:0 0 0 2px var(--dsw-alias-state-business-primary); }",
  ".dcr-link-icon { flex:none; width:1.1em; height:1.1em; vertical-align:-0.25em; margin-right:5px; }",
  ".dcr-md :where(ul, ol) { margin:16px 0; padding-left:18px; }",
  ".dcr-md li:not(:first-child) { margin-top:6px; }",
  ".dcr-md li > :where(ul, ol) { margin-top:4px; }",
  ".dcr-md li::marker { line-height:24px; color:var(--dsw-alias-label-secondary); }",
  ".dcr-md :where(ul, ol) ol { list-style-position:inside; padding-left:0; }",
  ".dcr-md :where(ul, ol) ol li p { display:inline; }",
  ".dcr-md li > p { margin:8px 0; }",
  ".dcr-md li > *:first-child { margin-top:0; }",
  ".dcr-md hr { display:block; border:none; height:0.5px; margin:32px 0; background:var(--dsw-alias-border-l2); }",
  ".dcr-md blockquote { border-left:2px solid var(--dsw-alias-label-caption); margin:16px 0 0; padding-left:14px; }",
  ".dcr-md pre { margin:16px 0; font-family:var(--ds-font-family-code); overflow:auto; }",
  ".dcr-md :not(pre) > code { display:inline-flex; align-items:center; box-sizing:border-box; font:var(--dsw-font-markdown-code); font-family:var(--ds-font-family-code); font-size:0.875em !important; background-color:var(--dsw-alias-markdown-inline-code); border:0.5px solid var(--dsw-alias-border-l1); border-radius:6px; padding:0 5px; }",
  ".dcr-md :where(h1, h2, h3, h4, h5, h6) code { font:inherit; font-family:var(--ds-font-family-code); }",
  ".dcr-md input[type='checkbox'] { margin:0 8px 0 0; accent-color:var(--dsw-alias-label-secondary); }",
  // MarkdownText.tableScroll / .tableFill
  ".dcr-table-scroll { max-width:100%; overflow-x:auto; overscroll-behavior-x:contain; }",
  ".dcr-table-scroll:focus-visible { outline:none; box-shadow:0 0 0 2px var(--dsw-alias-state-business-primary); }",
  ".dcr-table-scroll table { border-collapse:collapse; width:max-content; max-width:max-content; }",
  ".dcr-table-fill table { width:100%; max-width:none; }",
  ".dcr-table-scroll th { text-align:start; padding:10px 16px; border-bottom:0.5px solid var(--dsw-alias-border-l3); border-top:none; font:var(--dsw-font-markdown-table-head); max-width:min(30vw,320px); min-width:100px; }",
  ".dcr-table-scroll td { padding:10px 16px; border-bottom:0.5px solid var(--dsw-alias-border-l2); font:var(--dsw-font-markdown-table); max-width:min(30vw,320px); min-width:100px; }",
  ".dcr-table-scroll th:first-child, .dcr-table-scroll td:first-child { padding-left:0; }",
  ".dcr-table-scroll td:last-child { padding-right:0; }",
  ".dcr-table-scroll table code { font-size:11px; }",
  ".dcr-md > *:first-child, .dcr-md p:first-child { margin-top:0 !important; }",
  ".dcr-md > *:last-child, .dcr-md p:last-child { margin-bottom:0 !important; }",
  ".dcr-image-alt { color:var(--dsw-alias-label-tertiary); font-style:italic; }",
  ".dcr-image { display:block; width:auto; max-width:100%; height:auto; margin:0; border-radius:8px; background:var(--dsw-alias-bg-base); object-fit:contain; }",
  // MarkdownText.fileMention (inline code reference chip)
  ".dcr-file-mention { margin:0; padding:0; border:none; background:none; font:inherit; font-weight:500; color:var(--dsw-alias-link); text-decoration:none; cursor:pointer; }",
  ".dcr-file-mention:hover, .dcr-file-mention:focus { outline:none; text-decoration:underline dotted var(--dsw-alias-link); text-underline-offset:3px; }",
  ".dcr-strong-chip { font-weight:600; }",
  // AssistantMarkdown.stopped
  ".dcr-stopped { align-self:flex-start; padding:0 6px; border-radius:6px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-tertiary); font-size:11px; line-height:18px; }",
  // ReasoningRow
  ".dcr-reasoning { display:flex; flex-direction:column; }",
  ".dcr-reasoning:not([data-expanded]) { contain:size layout; height:calc(24px + var(--dsh-content-font-delta,0px)); }",
  ".dcr-reasoning-row { position:relative; overflow:hidden; }",
  ".dcr-reasoning[data-state='running'] .dcr-reasoning-row::after { content:''; position:absolute; inset-block:0; left:0; width:300px; background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%); animation:dsh-coderef-reasoning-sweep 2.6s ease-out infinite; pointer-events:none; }",
  "@keyframes dsh-coderef-reasoning-sweep { 0% { left:-300px; } 90%, 100% { left:100%; } }",
  "@media (prefers-reduced-motion: reduce) { .dcr-reasoning[data-state='running'] .dcr-reasoning-row::after { animation:none; } }",
  ".dcr-reasoning-leading { flex-shrink:0; }",
  ".dcr-reasoning-chevron { color:var(--dsw-alias-label-secondary); }",
  ".dcr-reasoning-title { font-weight:400; }",
  ".dcr-reasoning-separator { flex:none; width:2px; height:2px; margin:0 8px; border-radius:1px; background:var(--dsw-alias-label-caption); }",
  ".dcr-reasoning-summary { min-width:0; overflow:hidden; flex:1 1 auto; color:var(--dsw-alias-label-tertiary); font-size:var(--dsh-content-font-size-secondary,13px); line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px)); white-space:nowrap; }",
  ".dcr-reasoning-summary-text { display:block; overflow:hidden; text-overflow:ellipsis; }",
  ".dcr-think-body { padding:4px 0 4px calc(22px + var(--dsh-content-font-delta,0px)); color:var(--dsw-alias-label-tertiary); font-size:var(--dsh-content-font-size-secondary,13px); line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px)); white-space:pre-wrap; word-break:break-word; }",
  ".dcr-fallback { white-space:pre-wrap; font-family:ui-monospace, monospace; font-size:0.9em; }",
  // Collapsed session references (body-visible only)
  ".dcr-refs { margin-top:14px; border:0.5px solid var(--dsw-alias-border-l1); border-radius:12px; background:var(--dsw-alias-bg-secondary,rgba(127,127,127,.04)); overflow:hidden; font-size:12.5px; line-height:1.6; }",
  ".dcr-refs summary { display:flex; align-items:center; gap:8px; padding:10px 12px; cursor:pointer; color:var(--dsw-alias-label-secondary); user-select:none; list-style:none; }",
  ".dcr-refs summary::-webkit-details-marker { display:none; }",
  ".dcr-refs summary::after { content:'\\203A'; margin-left:auto; color:var(--dsw-alias-label-tertiary); transition:transform .15s ease; }",
  ".dcr-refs[open] summary::after { transform:rotate(90deg); }",
  ".dcr-refs-body { display:flex; flex-direction:column; gap:4px; padding:0 8px 8px; max-height:320px; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; }",
  ".dcr-ref-group { border-radius:8px; }",
  ".dcr-ref-group + .dcr-ref-group { border-top:0.5px solid var(--dsw-alias-border-l1); }",
  ".dcr-ref-group-summary { display:flex; align-items:center; gap:8px; padding:6px; cursor:pointer; list-style:none; color:var(--dsw-alias-label-tertiary); font-size:10.5px; letter-spacing:.05em; text-transform:uppercase; user-select:none; }",
  ".dcr-ref-group-summary::-webkit-details-marker { display:none; }",
  ".dcr-ref-group-summary::before { content:'\\203A'; color:var(--dsw-alias-label-tertiary); transition:transform .15s ease; }",
  ".dcr-ref-group[open] > .dcr-ref-group-summary::before { transform:rotate(90deg); }",
  ".dcr-ref-group-body { display:flex; flex-direction:column; gap:1px; padding-bottom:4px; }",
  ".dcr-ref-item { display:flex; align-items:center; gap:8px; min-width:0; padding:5px 6px; border-radius:7px; overflow:hidden; }",
  ".dcr-ref-item:hover { background:var(--dsw-alias-interactive-bg-hover); }",
  ".dcr-ref-item button { display:flex; align-items:center; gap:6px; flex:1; min-width:0; border:none; background:none; padding:0; color:var(--dsw-alias-link); font:inherit; cursor:pointer; text-align:left; overflow-wrap:anywhere; }",
  ".dcr-ref-item button:hover { text-decoration:underline dotted var(--dsw-alias-link); text-underline-offset:3px; }",
  ".dcr-ref-item button.dcr-command-row { color:var(--dsw-alias-label-primary); font-family:ui-monospace,'Cascadia Code',Consolas,monospace; font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }",
  ".dcr-command-chip { max-width:min(100%,520px); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; vertical-align:bottom; }",
  ".dcr-ref-meta { color:var(--dsw-alias-label-tertiary); font-size:10.5px; flex:none; white-space:nowrap; }",
  ".dcr-ref-more { color:var(--dsw-alias-label-tertiary); font-size:10.5px; padding:2px 6px 0; }",
  // Reference context menu
  ".dcr-menu { position:fixed; z-index:9999; min-width:210px; max-width:320px; padding:5px; border-radius:10px; border:0.5px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#1b1b1c)); box-shadow:0 10px 28px rgba(0,0,0,.28); font-size:12px; }",
  ".dcr-menu-title { padding:5px 8px 4px; color:var(--dsw-alias-label-tertiary); font-size:10.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }",
  ".dcr-menu-sep { height:0.5px; margin:4px 6px; background:var(--dsw-alias-border-l1); }",
  ".dcr-menu button { display:flex; align-items:center; gap:8px; width:100%; padding:6px 8px; border:none; border-radius:6px; background:none; color:var(--dsw-alias-label-primary); font:inherit; cursor:pointer; text-align:left; }",
  ".dcr-menu button:hover { background:var(--dsw-alias-interactive-bg-hover); }",
  ".dcr-menu button[disabled] { opacity:.45; cursor:default; }",
  // Command chips + toast: independent pill is fine; explicit zero
  // margin and a 22px box keep it inside the 24px text line.
  ".dcr-command-chip { display:inline-flex; align-items:center; gap:4px; box-sizing:border-box; height:21px; line-height:19px; margin:0 !important; padding:0 5px !important; border:0.5px solid var(--dsw-alias-border-l1) !important; border-radius:6px; background:var(--dsw-alias-markdown-inline-code) !important; color:var(--dsw-alias-label-primary) !important; font-family:var(--ds-font-family-code) !important; font-size:12.25px !important; vertical-align:baseline; white-space:nowrap; }",
  ".dcr-md :not(pre) > code.dcr-command-code { display:inline; margin:0 !important; padding:0 !important; border:0 !important; border-radius:0; background:none !important; font:inherit; line-height:inherit; }",
  ".dcr-command-chip:hover { border-color:var(--dsw-alias-border-l1) !important; background:var(--dsw-alias-interactive-bg-hover) !important; }",
  ".dcr-command-chip .dcr-command-icon { display:inline-block; width:13px; height:13px; vertical-align:middle; margin:0 !important; color:var(--dsw-alias-label-secondary); }",
  ".dcr-toast { position:fixed; z-index:10000; left:50%; bottom:104px; transform:translateX(-50%); padding:7px 14px; border-radius:999px; border:0.5px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base,#1b1b1c)); color:var(--dsw-alias-label-primary); font-size:12px; box-shadow:0 8px 24px rgba(0,0,0,.24); white-space:nowrap; }",
  // Sidebar ping
  ".dsh-coderef-line-ping { background:rgba(84,150,255,0.22) !important; box-shadow:inset 3px 0 0 0 rgba(84,150,255,0.9); animation:dsh-coderef-ping 2.4s ease-out 1; }",
  "pre code > .line.dsh-coderef-line-ping { display:block; }",
  "@keyframes dsh-coderef-ping { 0% { background:rgba(84,150,255,0.55); } 45% { background:rgba(84,150,255,0.24); } 100% { background:rgba(84,150,255,0.18); } }"
].join("\n");

// src/entry.tsx
var PLUGIN_ID = "dsh-coderef-renderer";
var API_PREFIX = "/coderef";
var VERSION = "0.1.0-fork";
var SLOT_PRIORITY = -100;
var EMPTY_MAP = /* @__PURE__ */ new Map();
var debug = {
  version: VERSION,
  mounted: false,
  renders: 0,
  lastError: null,
  lastResolve: null,
  lastOpen: null,
  lastIde: null,
  lastReveal: null,
  lastTerminal: null,
  lastPing: null
};
if (typeof window !== "undefined") {
  window.__dshCoderefRenderer = debug;
  debug.createTextMatcher = createTextMatcher;
  debug.fillTerminalInput = fillTerminalInput;
  debug.parseCoderefHref = parseCoderefHref;
}
var clientCtx = null;
function resolveCurrentSessionId() {
  if (clientCtx === null) return void 0;
  const get = (name2) => {
    try {
      return typeof clientCtx.get === "function" ? clientCtx.get(name2) : void 0;
    } catch {
      return void 0;
    }
  };
  try {
    const selected = get("uiWorkspace")?.selection?.getSnapshot?.();
    if (typeof selected?.sessionId === "string" && selected.sessionId !== "") return selected.sessionId;
  } catch {
  }
  try {
    const binding = get("uiSession")?.adapter?.current?.getSnapshot?.();
    if (typeof binding?.key === "string" && binding.key !== "") return binding.key;
  } catch {
  }
  try {
    const snapshot = get("sessions")?.list?.getSnapshot?.();
    const byId = snapshot?.byId;
    if (byId !== null && typeof byId === "object") {
      for (const id of Object.keys(byId)) {
        const retained = byId[id]?.retainedBy;
        if (retained !== void 0 && retained !== null && retained.mainView > 0) return id;
      }
    }
  } catch {
  }
  return void 0;
}
function translate(t, key, fallback) {
  try {
    const value = typeof t === "function" ? t(key) : void 0;
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
  }
  return fallback;
}
var STYLE_ID = "dsh-coderef-renderer-style";
var stylesInstalled = false;
function ensureStyles() {
  if (stylesInstalled || typeof document === "undefined") return;
  stylesInstalled = true;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}
var TOKEN_TTL_MS = 5 * 60 * 1e3;
var tokenCache = /* @__PURE__ */ new Map();
function cacheKey(sessionId, cwd, text4) {
  return `${sessionId ?? ""}|${cwd ?? ""}|${text4}`;
}
function cachedItem(sessionId, cwd, text4) {
  const entry = tokenCache.get(cacheKey(sessionId, cwd, text4));
  if (entry === void 0) return void 0;
  if (Date.now() - entry.at > TOKEN_TTL_MS) {
    tokenCache.delete(cacheKey(sessionId, cwd, text4));
    return void 0;
  }
  if (entry.item?.status !== "linked") {
    tokenCache.delete(cacheKey(sessionId, cwd, text4));
    return void 0;
  }
  return entry.item;
}
function rememberItem(sessionId, cwd, text4, item) {
  if (tokenCache.size > 600) {
    const first = tokenCache.keys().next();
    if (!first.done) tokenCache.delete(first.value);
  }
  tokenCache.set(cacheKey(sessionId, cwd, text4), { item, at: Date.now() });
}
async function postJson(path2, body) {
  const response = await fetch(API_PREFIX + path2, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}
var ledgerChannels = /* @__PURE__ */ new Map();
function subscribeLedger(sessionId, cwd, listener) {
  const key = `${sessionId}\0${cwd}`;
  let channel = ledgerChannels.get(key);
  if (channel === void 0) {
    channel = { data: null, listeners: /* @__PURE__ */ new Set(), timer: null, inflight: false };
    ledgerChannels.set(key, channel);
  }
  channel.listeners.add(listener);
  if (channel.data !== null) listener(channel.data);
  if (channel.timer === null) {
    const active = channel;
    const load = async () => {
      if (active.inflight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      active.inflight = true;
      try {
        const since = active.data === null ? "" : `&since=${encodeURIComponent(String(active.data.version ?? ""))}`;
        const response = await fetch(`${API_PREFIX}/refs?sessionId=${encodeURIComponent(sessionId)}&cwd=${encodeURIComponent(cwd)}${since}`);
        const data = await response.json();
        if (data?.ok !== true) return;
        debug.refsRequests = (debug.refsRequests ?? 0) + 1;
        if (data.unchanged === true) return;
        debug.lastLedger = data.stats ?? null;
        if (active.data !== null && active.data.version === data.version) return;
        active.data = data;
        for (const target of [...active.listeners]) target(data);
      } catch (error) {
        debug.lastError = String(error?.message ?? error);
      } finally {
        active.inflight = false;
      }
    };
    active.timer = setInterval(() => {
      void load();
    }, 5e3);
    void load();
  }
  return () => {
    const active = ledgerChannels.get(key);
    if (active === void 0) return;
    active.listeners.delete(listener);
    if (active.listeners.size > 0) return;
    if (active.timer !== null) clearInterval(active.timer);
    active.timer = null;
    active.data = null;
    ledgerChannels.delete(key);
  };
}
async function resolveTokens({ cwd, sessionId, bold, inline }) {
  const items = /* @__PURE__ */ new Map();
  const missingBold = [];
  const missingInline = [];
  for (const text4 of bold) {
    const cached = cachedItem(sessionId, cwd, text4);
    if (cached === void 0) missingBold.push(text4);
    else items.set(text4, cached);
  }
  for (const text4 of inline) {
    const cached = cachedItem(sessionId, cwd, text4);
    if (cached === void 0) missingInline.push(text4);
    else items.set(text4, cached);
  }
  if (missingBold.length === 0 && missingInline.length === 0) return items;
  const result = await postJson("/resolve", {
    cwd,
    sessionId,
    texts: missingBold,
    inlineTexts: missingInline,
    hints: [],
    relativeHints: []
  });
  for (const item of Array.isArray(result.items) ? result.items : []) {
    if (item === null || typeof item !== "object" || typeof item.text !== "string") continue;
    rememberItem(sessionId, cwd, item.text, item);
    items.set(item.text, item);
  }
  const values = [...items.values()];
  debug.lastResolve = {
    cwd,
    sessionId: sessionId ?? null,
    bold: bold.length,
    inline: inline.length,
    requested: missingBold.length + missingInline.length,
    hits: values.filter((item) => item.status === "linked").length,
    inlineLinked: values.filter((item) => item.kind === "inline" && item.status === "linked").length,
    statusCounts: result.statusCounts ?? null,
    evidence: result.evidence ?? null
  };
  return items;
}
var PING_CLASS = "dsh-coderef-line-ping";
var pingGeneration = 0;
function findPreviewRows(line, endLine) {
  const rows = [];
  const last = Math.max(line, endLine);
  for (const pane of document.querySelectorAll("[data-code-preview], [data-document-preview]")) {
    if (pane.getClientRects().length === 0) continue;
    const codeLines = pane.querySelectorAll("pre .line");
    if (codeLines.length === 0) continue;
    const container = pane.querySelector("[data-code-block-content]") ?? pane;
    for (let index2 = line - 1; index2 < Math.min(last, line - 1 + 200) && index2 < codeLines.length; index2 += 1) {
      rows.push({ row: codeLines[index2], container });
    }
    if (rows.length > 0) return rows;
  }
  for (let current = line; current <= last; current += 1) {
    const row = document.querySelector(`[data-textpreview-line="${current}"]`);
    if (row !== null && row.getClientRects().length > 0) {
      rows.push({ row, container: row.closest('[data-textpreview-state="text"]') ?? row.parentElement });
    }
  }
  return rows;
}
function pingLine(line, endLine) {
  if (typeof document === "undefined" || !Number.isFinite(line)) return;
  ensureStyles();
  const generation = pingGeneration += 1;
  const start = Math.max(1, Math.floor(line));
  const end = Number.isFinite(endLine) ? Math.max(start, Math.floor(endLine)) : start;
  const deadline = Date.now() + 6e3;
  const clearers = /* @__PURE__ */ new Set();
  let applied = false;
  const attempt = () => {
    if (generation !== pingGeneration) return;
    const rows = findPreviewRows(start, Math.min(end, start + 200));
    if (rows.length === 0) {
      if (Date.now() < deadline) setTimeout(attempt, 120);
      return;
    }
    if (!applied) {
      applied = true;
      const container = rows[0].container;
      const top = Math.max(0, rows[0].row.offsetTop - container.clientHeight * 0.35);
      try {
        container.scrollTo({ top, behavior: "smooth" });
      } catch {
        container.scrollTop = top;
      }
      debug.lastPing = { line: start, end, rows: rows.length, at: Date.now() };
    }
    for (const { row } of rows) {
      row.classList.add(PING_CLASS);
      if (!clearers.has(row)) {
        clearers.add(row);
        setTimeout(() => {
          row.classList.remove(PING_CLASS);
          clearers.delete(row);
        }, 2600);
      }
    }
    if (Date.now() < deadline) setTimeout(attempt, 150);
  };
  attempt();
}
async function openReference(props, hit) {
  const file = hit.file;
  const line = hit.line;
  let previewOpened = false;
  try {
    if (typeof props?.openFile === "function") {
      await props.openFile(file, { line });
      previewOpened = true;
      pingLine(line, hit.endLine);
    }
  } catch (error) {
    debug.lastError = String(error?.message ?? error);
  }
  debug.lastOpen = { file, line, previewOpened, ideOpened: false, at: Date.now() };
}
async function revealInExplorer(hit) {
  try {
    const result = await postJson("/reveal", { file: hit.file });
    debug.lastReveal = {
      file: hit.file,
      ok: result?.ok === true,
      error: typeof result?.error === "string" ? result.error : null,
      at: Date.now()
    };
  } catch (error) {
    debug.lastError = String(error?.message ?? error);
  }
}
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function copyToClipboard(text4) {
  try {
    if (document.hasFocus()) {
      await navigator.clipboard.writeText(text4);
      return true;
    }
  } catch {
  }
  try {
    const area = document.createElement("textarea");
    area.value = text4;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok3 = document.execCommand("copy");
    area.remove();
    return ok3;
  } catch {
    return false;
  }
}
async function fillTerminalInput(command) {
  const text4 = command.replace(/\r/g, "").replace(/\n+$/g, "");
  if (text4 === "" || text4.includes("\n")) {
    return await copyToClipboard(command) ? "clipboard" : "failed";
  }
  const terminals = debug.terminalServices?.terminals ?? clientCtx?.get?.("webTerminals");
  const right = debug.terminalServices?.right ?? clientCtx?.get?.("sidebarRight");
  const sessionId = resolveCurrentSessionId();
  if (terminals !== void 0 && terminals !== null && right !== void 0 && right !== null && sessionId !== void 0) {
    try {
      const tabs = () => {
        try {
          const snapshot = right.openTabs?.getSnapshot?.();
          return Array.isArray(snapshot) ? snapshot : [];
        } catch {
          return [];
        }
      };
      let tab = tabs().find((candidate) => candidate?.kind === "terminal" && candidate?.sessionId === sessionId);
      if (tab === void 0) {
        right.openTab?.("terminal", { replaceTab: false });
        await sleep(250);
        tab = tabs().find((candidate) => candidate?.kind === "terminal" && candidate?.sessionId === sessionId);
      }
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (tab !== void 0) {
          try {
            const view = terminals.view?.(sessionId, tab.id, tab.contentId, tab.terminalId, void 0);
            const state = view?.state?.getSnapshot?.();
            if (state?.writable === true && typeof view.write === "function") {
              view.write(text4);
              debug.lastTerminal = { command: text4, mode: "terminal", tabId: tab.id, at: Date.now() };
              return "terminal";
            }
          } catch {
          }
        }
        await sleep(100);
        tab = tabs().find((candidate) => candidate?.kind === "terminal" && candidate?.sessionId === sessionId);
      }
    } catch {
    }
  }
  try {
    if (await copyToClipboard(command)) {
      debug.lastTerminal = { command, mode: "clipboard", at: Date.now() };
      return "clipboard";
    }
    debug.lastTerminal = { command, mode: "failed", at: Date.now() };
    return "failed";
  } catch {
    debug.lastTerminal = { command, mode: "failed", at: Date.now() };
    return "failed";
  }
}
var CANDIDATE_PATTERN = /\*\*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\*\*/g;
var BOLD_BLACKLIST = /* @__PURE__ */ new Set([
  "important",
  "note",
  "warning",
  "tip",
  "todo",
  "fixme",
  "danger",
  "caution",
  "hint",
  "read",
  "write",
  "edit",
  "grep",
  "glob",
  "bash",
  "pwsh",
  "shell",
  "line",
  "file",
  "path",
  "true",
  "false",
  "null",
  "undefined",
  "return",
  "class",
  "function",
  "interface",
  "type",
  "enum",
  "const",
  "let",
  "var",
  "async",
  "await",
  "export",
  "import",
  "default"
]);
var INLINE_PATH_HINT = /[\\/]|\.(?:tsx?|jsx?|mjs|cjs|json|md|py|go|rs|java|kt|cs|rb|php|swift|scala|lua|ya?ml|toml)(?::\d+(?:-\d+)?)?$/i;
var INLINE_IDENTIFIER = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(\))?$/;
var INLINE_BLACKLIST = /* @__PURE__ */ new Set([
  "node",
  "npx",
  "pnpm",
  "npm",
  "git",
  "cd",
  "stock",
  "line",
  "seq",
  "mentions",
  "props",
  "data",
  "kind",
  "text",
  "type",
  "value",
  "name",
  "path",
  "file",
  "http",
  "https",
  "true",
  "false",
  "null",
  "undefined",
  "return",
  "class",
  "function",
  "interface",
  "const",
  "let",
  "var",
  "async",
  "await"
]);
function isBoldCandidate(value) {
  if (typeof value !== "string") return false;
  if (value.length < 2 || value.length > 80) return false;
  if (BOLD_BLACKLIST.has(value.toLowerCase())) return false;
  if (/^[A-Z]{1,2}$/.test(value)) return false;
  return true;
}
function isInlineCandidate(value) {
  if (typeof value !== "string") return false;
  const text4 = value.trim();
  if (text4.length < 3 || text4.length > 220) return false;
  if (/[*`\n]/.test(text4)) return false;
  if (/^(?:https?:|mailto:|data:)/i.test(text4)) return false;
  if (/^(?:node|npx|pnpm|npm|git|cd|echo|curl)\s/.test(text4)) return false;
  if (INLINE_PATH_HINT.test(text4) && !/\s/.test(text4)) return true;
  if (INLINE_IDENTIFIER.test(text4)) {
    if (INLINE_BLACKLIST.has(text4.toLowerCase())) return false;
    if (/^[A-Z][A-Z0-9_]{1,}$/.test(text4) && text4.length >= 3) return true;
    if (text4.length < 3) return false;
    if (/[A-Z]/.test(text4) || text4.includes(".")) return true;
  }
  if (text4.length > 200 || /^[<{[*#]/.test(text4)) return false;
  const pathInside = /(?:[A-Za-z]:)?(?:[\w.$@-]+[\\/])*[\w.$@-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|py|go|rs|java|kt|cs|rb|php|swift|scala|lua|ya?ml|toml)(?::\d+(?:-\d+)?)?/i.test(text4);
  const symbolWithLine = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*:\s*\d+/.test(text4);
  const dottedUpper = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+/.test(text4) && /[A-Z]/.test(text4);
  const callUpper = /\b[A-Za-z_$][\w$]*\s*\(/.test(text4) && /[A-Z]/.test(text4);
  const pascal = /\b[A-Z][A-Za-z0-9_$]{3,}\b/.test(text4);
  return pathInside || symbolWithLine || dottedUpper || callUpper || pascal;
}
function collectTokens(blocks) {
  const bold = [];
  const inline = [];
  const seenBold = /* @__PURE__ */ new Set();
  const seenInline = /* @__PURE__ */ new Set();
  const addInline = (value) => {
    const text4 = value.trim();
    if (seenInline.has(text4) || !isInlineCandidate(text4)) return;
    seenInline.add(text4);
    inline.push(text4);
  };
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (block === null || typeof block !== "object" || block.kind !== "text" || typeof block.text !== "string") continue;
    CANDIDATE_PATTERN.lastIndex = 0;
    let match;
    while ((match = CANDIDATE_PATTERN.exec(block.text)) !== null) {
      const name2 = match[1];
      if (!isBoldCandidate(name2) || seenBold.has(name2)) continue;
      seenBold.add(name2);
      bold.push(name2);
    }
    const code2 = /`([^`\n]{2,300})`/g;
    while ((match = code2.exec(block.text)) !== null) {
      addInline(match[1]);
      if (inline.length >= 160) break;
    }
    const fence = /```[^\n]*\n([\s\S]*?)```/g;
    while ((match = fence.exec(block.text)) !== null) {
      const identifiers = match[1].match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) ?? [];
      for (const identifier of identifiers) {
        addInline(identifier);
        if (identifier.includes(".")) {
          for (const part of identifier.split(".")) addInline(part);
        }
        if (inline.length >= 160) break;
      }
      if (inline.length >= 160) break;
    }
    if (bold.length >= 40) break;
  }
  return { bold, inline };
}
function decorateCodeBlocks(root, textMentions, mentions, hits) {
  const blocks = root.querySelectorAll("pre code");
  for (const code2 of blocks) {
    const walker = document.createTreeWalker(code2, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let current = walker.nextNode();
    while (current !== null) {
      const parent = current.parentElement;
      if (parent !== null && parent.closest("[data-coderef-chip]") === null) textNodes.push(current);
      current = walker.nextNode();
    }
    for (const textNode of textNodes) {
      const value = textNode.nodeValue ?? "";
      if (value.length < 2) continue;
      const base = textMentions.match(value).filter((mention) => mention.kind !== "command");
      const spans = base.map((mention) => ({
        start: mention.start,
        end: mention.end,
        label: mention.label,
        title: mention.title,
        open: mention.open
      }));
      const covers = (start, end) => spans.some((span) => start < span.end && end > span.start);
      const tokenPattern = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g;
      let token;
      while ((token = tokenPattern.exec(value)) !== null) {
        const start = token.index;
        const end = start + token[0].length;
        if (covers(start, end)) continue;
        const mention = mentions.resolve(token[0]);
        if (mention !== void 0 && hits.has(token[0])) {
          spans.push({ start, end, label: mention.label, title: mention.title, open: mention.open });
          continue;
        }
        let offset = 0;
        for (const part of token[0].split(".")) {
          const partStart = start + offset;
          const partEnd = partStart + part.length;
          offset += part.length + 1;
          if (part.length < 2 || covers(partStart, partEnd) || !hits.has(part)) continue;
          const segment = mentions.resolve(part);
          if (segment === void 0) continue;
          spans.push({ start: partStart, end: partEnd, label: segment.label, title: segment.title, open: segment.open });
        }
      }
      if (spans.length === 0) continue;
      spans.sort((a, b) => a.start - b.start || b.end - a.end);
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      for (const span of spans) {
        if (span.start < cursor) continue;
        if (span.start > cursor) fragment.appendChild(document.createTextNode(value.slice(cursor, span.start)));
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "dcr-code-ref";
        chip.dataset.coderefChip = "true";
        chip.title = span.title;
        chip.textContent = value.slice(span.start, span.end);
        chip.style.cssText = "display:inline;padding:0;margin:0;border:0;background:none;font:inherit;color:inherit;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;cursor:pointer";
        chip.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          span.open?.();
        });
        fragment.appendChild(chip);
        cursor = span.end;
      }
      if (cursor < value.length) fragment.appendChild(document.createTextNode(value.slice(cursor)));
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }
}
function formatTitle(hit) {
  const range = hit.endLine !== void 0 && Number(hit.endLine) > Number(hit.line) ? `${hit.line}-${hit.endLine}` : `${hit.line}`;
  const kind = typeof hit.kind === "string" ? ` \xB7 ${hit.kind}` : "";
  return `${hit.file}:${range}${kind}`;
}
function decodeRefPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function parseCoderefHref(href) {
  if (!/^coderef:/i.test(href)) return void 0;
  const raw = href.slice(href.indexOf(":") + 1).replace(/^\/\//, "");
  if (/^sym:/i.test(raw)) return { kind: "symbol", name: decodeRefPart(raw.slice(4)) };
  if (/^cmd:/i.test(raw)) return { kind: "command", command: decodeRefPart(raw.slice(4)) };
  const hashAt = raw.indexOf("#");
  const pathPart = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  const hash = hashAt >= 0 ? raw.slice(hashAt + 1) : "";
  const lineMatch = /^L?(\d+)(?:-L?(\d+))?$/i.exec(hash);
  if (pathPart.length === 0) return void 0;
  return {
    kind: "file",
    file: decodeURIComponent(pathPart),
    line: lineMatch === null ? 1 : Number(lineMatch[1]),
    ...lineMatch !== null && lineMatch[2] !== void 0 ? { endLine: Number(lineMatch[2]) } : {}
  };
}
var WEB_URL_RE = /https?:\/\/[^\s<>"'`)\]]+/g;
var PATH_TOKEN_RE = /(?:[A-Za-z]:[\\/]|\.{0,2}[\\/])?(?:[\w.$@-]+[\\/])*[\w.$@-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|py|go|rs|java|kt|cs|rb|php|swift|scala|lua|ya?ml|toml)(?::\d+(?:-\d+)?)?/g;
var SYMBOL_TOKEN_RE = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g;
function normalizeMatchPath(value) {
  return String(value).replace(/\\/g, "/").replace(/^\.\//, "");
}
function normalizeSnippetText(value) {
  return String(value).replace(/\r/g, "").replace(/\/\/.*$/, "").replace(/\s+/g, " ").trim().replace(/[;,]\s*$/, "").trim();
}
function knownLedgerFile(needle, ledger, relativeOnly = false) {
  let known;
  for (const ref of ledger?.refs?.files ?? []) {
    if (relativeOnly && typeof ref?.path === "string" && /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(ref.path)) continue;
    const candidate = typeof ref?.absPath === "string" ? ref.absPath : typeof ref?.path === "string" ? ref.path : "";
    if (candidate === "") continue;
    const normalized = candidate.replace(/\\/g, "/").toLowerCase();
    if (normalized !== needle && !normalized.endsWith(`/${needle}`)) continue;
    if (known === void 0 || candidate.length < known.length) known = candidate;
  }
  return known;
}
function absoluteRefFile(file, cwd, ledger) {
  const normalizedFile = file.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (cwd === void 0 || cwd === "" || /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(file)) {
    const root = cwd === void 0 ? "" : cwd.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    const normalized = normalizedFile.toLowerCase();
    if (root !== "" && (normalized === root || normalized.startsWith(`${root}/`))) {
      const rel = normalized === root ? "" : normalized.slice(root.length + 1);
      if (rel !== "") {
        const known2 = knownLedgerFile(rel, ledger, true);
        if (known2 !== void 0) return known2;
      }
    }
    return file;
  }
  const needle = normalizedFile.toLowerCase();
  const known = knownLedgerFile(needle, ledger);
  if (known !== void 0) return known;
  const separator = cwd.includes("\\") ? "\\" : "/";
  const relative = file.replace(/^[\\/]+/, "").replace(/[\\/]/g, separator);
  return `${cwd.replace(/[\\/]+$/, "")}${separator}${relative}`;
}
function canonicalUrlClient(raw) {
  try {
    const url = new URL(raw);
    const path2 = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${path2}${url.search}`;
  } catch {
    return raw;
  }
}
var COMMAND_NAMES = new Set("node npm pnpm yarn npx bun bunx deno corepack python python3 pip pip3 poetry uv pytest conda cargo rustc rustup go dotnet java javac mvn gradle gradlew mvnw git gh docker kubectl helm terraform ansible make cmake gcc g++ clang clang++ tsc tsx esbuild vite webpack rollup npx.cmd npm.cmd pnpm.cmd node.exe python.exe pwsh powershell bash sh zsh cmd curl wget jq rg grep find sed awk cat less more head tail sort uniq wc cd pwd ls dir cp mv rm mkdir rmdir del echo export source touch chmod chown vitest jest playwright cypress eslint prettier biome ssh scp rsync tar unzip zip psql mysql sqlite3 redis-cli mongosh code code-insiders cursor windsurf notepad explorer".split(/\s+/));
var BARE_COMMANDS = /* @__PURE__ */ new Set(["pwd", "ls", "dir", "clear", "cls", "whoami", "date", "uname", "env", "history", "exit"]);
var PS_CMDLET_RE = /^(?:Add|Clear|Close|Connect|Convert|Copy|Disable|Disconnect|Enable|Enter|Exit|Export|Find|ForEach|Format|Get|Group|Hide|Import|Initialize|Install|Invoke|Join|Measure|Mount|Move|New|Open|Out|Pop|Publish|Push|Read|Receive|Register|Remove|Rename|Repair|Reset|Resolve|Restart|Resume|Save|Search|Select|Send|Set|Show|Sort|Split|Start|Stop|Submit|Suspend|Test|Uninstall|Unregister|Update|Use|Wait|Where|Write)-[A-Za-z][\w-]*$/;
function normalizeCommandText(raw) {
  return String(raw).trim().replace(/^(?:PS(?: [^>]*)?>|\$|>)\s+/, "").trim();
}
function looksLikeCommandText(raw) {
  const command = normalizeCommandText(raw);
  if (command === "" || command.length > 300 || command.includes("\n")) return false;
  if (/^export\s+(?:const|let|var|function|class|default|type|interface|enum|\{|\*)/.test(command)) return false;
  const first = command.split(/\s+/)[0] ?? "";
  const rest = command.slice(first.length).trim();
  const base = first.replace(/^["']|["']$/g, "").split(/[\\/]/).pop()?.toLowerCase() ?? "";
  if (COMMAND_NAMES.has(base)) return rest !== "" || BARE_COMMANDS.has(base);
  if (PS_CMDLET_RE.test(first)) return true;
  if (/^(?:[A-Za-z]:[\\/]|\.{1,2}[\\/])/.test(first) && /\.(?:exe|cmd|bat|ps1|sh|mjs|js|ts|py)$/i.test(first)) return true;
  return false;
}
function chooseRef(list2) {
  return [...list2].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
}
function createTextMatcher(ledger, cwd, props, runCommand) {
  const fileByAlias = /* @__PURE__ */ new Map();
  const symbolByName = /* @__PURE__ */ new Map();
  const urlByCanonical = /* @__PURE__ */ new Map();
  const commands = (ledger?.refs?.commands ?? []).filter((ref) => typeof ref?.command === "string" && ref.command.length >= 4).sort((a, b) => b.command.length - a.command.length);
  const cwdNorm = cwd === void 0 ? void 0 : normalizeMatchPath(cwd).replace(/\/+$/, "");
  const addFileAlias = (alias, ref) => {
    const key = normalizeMatchPath(alias);
    if (key.length < 3) return;
    const list2 = fileByAlias.get(key);
    if (list2 === void 0) fileByAlias.set(key, [ref]);
    else if (!list2.includes(ref)) list2.push(ref);
  };
  for (const ref of ledger?.refs?.files ?? []) {
    const absNorm = normalizeMatchPath(ref.absPath ?? ref.path);
    addFileAlias(absNorm, ref);
    addFileAlias(normalizeMatchPath(ref.path), ref);
    if (cwdNorm !== void 0 && absNorm.startsWith(`${cwdNorm}/`)) addFileAlias(absNorm.slice(cwdNorm.length + 1), ref);
    for (const alias of ref.aliases ?? []) addFileAlias(alias, ref);
    const parts = absNorm.split("/");
    const basename = parts[parts.length - 1];
    if (basename !== void 0) addFileAlias(basename, ref);
    for (let count = 2; count <= Math.min(4, parts.length); count += 1) addFileAlias(parts.slice(-count).join("/"), ref);
  }
  for (const ref of ledger?.refs?.symbols ?? []) {
    if (typeof ref.name !== "string") continue;
    const list2 = symbolByName.get(ref.name);
    if (list2 === void 0) symbolByName.set(ref.name, [ref]);
    else list2.push(ref);
  }
  for (const ref of ledger?.refs?.urls ?? []) {
    if (typeof ref.canonical === "string") urlByCanonical.set(ref.canonical, ref);
  }
  const openFileRef = (ref, line) => {
    void openReference(props, {
      file: ref.absPath ?? ref.file ?? ref.path,
      line: line ?? ref.line ?? 1,
      endLine: ref.endLine
    });
  };
  function resolveFileToken(rawToken) {
    const token = normalizeMatchPath(rawToken);
    const match = /^(.*?)(?::(\d+)(?:-(\d+))?)?$/.exec(token);
    if (match === null) return void 0;
    const pathPart = match[1];
    const list2 = fileByAlias.get(pathPart);
    if (list2 === void 0 || list2.length === 0) return void 0;
    return {
      ref: chooseRef(list2),
      line: match[2] === void 0 ? void 0 : Number(match[2]),
      endLine: match[3] === void 0 ? void 0 : Number(match[3])
    };
  }
  return {
    match(text4) {
      const spans = [];
      const overlaps = (start, end) => spans.some((span) => start < span.end && end > span.start);
      WEB_URL_RE.lastIndex = 0;
      let match;
      while ((match = WEB_URL_RE.exec(text4)) !== null) {
        const raw = match[0].replace(/[.,;:!?，。；：！？)）"'`\]]+$/g, "");
        const start = match.index;
        const end = start + raw.length;
        if (end <= start) continue;
        const urlRef = urlByCanonical.get(canonicalUrlClient(raw));
        spans.push({ start, end, kind: "url", payload: { url: raw, ref: urlRef }, token: raw });
      }
      for (const command of commands) {
        let index2 = text4.indexOf(command.command);
        while (index2 >= 0) {
          const start = index2;
          const end = start + command.command.length;
          const before = start > 0 ? text4[start - 1] : "";
          const after = end < text4.length ? text4[end] : "";
          const blockedBefore = before !== "" && /[\w$/\\-]/.test(before);
          const blockedAfter = after !== "" && /[\w$/\\-]/.test(after);
          if (!blockedBefore && !blockedAfter && !overlaps(start, end)) {
            spans.push({ start, end, kind: "command", payload: command, token: command.command });
          }
          index2 = text4.indexOf(command.command, index2 + 1);
        }
      }
      PATH_TOKEN_RE.lastIndex = 0;
      while ((match = PATH_TOKEN_RE.exec(text4)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (start > 0 && /[\w$]/.test(text4[start - 1])) continue;
        if (end < text4.length && /[\w$]/.test(text4[end])) continue;
        if (overlaps(start, end)) continue;
        const resolved = resolveFileToken(match[0]);
        if (resolved === void 0) continue;
        spans.push({ start, end, kind: "file", payload: resolved, token: match[0] });
      }
      SYMBOL_TOKEN_RE.lastIndex = 0;
      while ((match = SYMBOL_TOKEN_RE.exec(text4)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (overlaps(start, end)) continue;
        if (start > 0 && /[\w$/\\]/.test(text4[start - 1])) continue;
        const list2 = symbolByName.get(match[0]);
        if (list2 === void 0 || list2.length === 0) continue;
        spans.push({ start, end, kind: "symbol", payload: chooseRef(list2), token: match[0] });
      }
      spans.sort((a, b) => a.start - b.start || b.end - a.end);
      const mentions = [];
      let cursor = 0;
      for (const span of spans) {
        if (span.start < cursor) continue;
        let title = "";
        let open;
        if (span.kind === "url") {
          const url = span.payload.url;
          title = span.payload.ref?.title !== void 0 ? `${span.payload.ref.title} \xB7 ${url}` : url;
          open = () => {
            if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
          };
        } else if (span.kind === "command") {
          const command = span.payload.command;
          title = `\u547D\u4EE4 \xB7 \u70B9\u51FB\u586B\u5165\u7EC8\u7AEF\uFF08\u4E0D\u6267\u884C\uFF09`;
          open = () => runCommand(command);
        } else if (span.kind === "file") {
          const ref = span.payload.ref;
          const line = span.payload.line ?? ref.lines?.[0]?.start ?? 1;
          title = `${ref.absPath ?? ref.path}:${line}` + (ref.occurrences?.length > 1 ? ` \xB7 ${ref.occurrences.length} \u6B21` : "");
          open = () => openFileRef(ref, line);
        } else {
          const ref = span.payload;
          title = `${ref.name} \xB7 ${ref.absPath ?? ref.file}:${ref.line ?? 1}`;
          open = () => openFileRef(ref, ref.line);
        }
        const targetFile = span.kind === "file" ? span.payload.ref.absPath ?? span.payload.ref.path : span.kind === "symbol" ? span.payload.absPath ?? span.payload.file : void 0;
        const targetLine = span.kind === "file" ? span.payload.line ?? span.payload.ref.lines?.[0]?.start : span.kind === "symbol" ? span.payload.line : void 0;
        mentions.push({
          start: span.start,
          end: span.end,
          label: text4.slice(span.start, span.end),
          title,
          kind: span.kind,
          href: span.kind === "url" ? span.payload.url : void 0,
          file: targetFile,
          line: targetLine,
          endLine: span.kind === "file" ? span.payload.endLine : span.kind === "symbol" ? span.payload.endLine : void 0,
          command: span.kind === "command" ? span.payload.command : void 0,
          open
        });
        cursor = span.end;
      }
      return mentions;
    }
  };
}
function firstLine(text4) {
  const newline = text4.indexOf("\n");
  return newline === -1 ? text4 : text4.slice(0, newline);
}
function latestLine(text4) {
  const visible = text4.trimEnd();
  const newline = visible.lastIndexOf("\n");
  return newline === -1 ? visible : visible.slice(newline + 1);
}
function ReasoningBlock({ text: text4, running, t }) {
  const [expanded, setExpanded] = (0, import_react4.useState)(false);
  const source = running ? latestLine(text4) : firstLine(text4);
  const summary = String(source ?? "").replaceAll("**", "");
  const label = translate(t, "message.think", "\u601D\u8003");
  const body = (0, import_react4.createElement)("div", { className: "dcr-think-body" }, text4);
  if (import_dsh_client_ui_primitives2.DisclosureRow === void 0) {
    return (0, import_react4.createElement)(
      "details",
      { className: "dcr-reasoning" },
      (0, import_react4.createElement)("summary", null, label),
      body
    );
  }
  return (0, import_react4.createElement)(
    "div",
    {
      className: "dcr-reasoning",
      "data-variant": "think",
      "data-state": running ? "running" : "ok",
      ...expanded ? { "data-expanded": "true" } : {}
    },
    (0, import_react4.createElement)(import_dsh_client_ui_primitives2.DisclosureRow, {
      rowClassName: "dcr-reasoning-row",
      leadingClassName: "dcr-reasoning-leading",
      titleClassName: "dcr-reasoning-title",
      chevronClassName: "dcr-reasoning-chevron",
      icon: import_dsh_client_ui_primitives2.IconThinkOutline14 !== void 0 ? (0, import_react4.createElement)(import_dsh_client_ui_primitives2.IconThinkOutline14, { size: 14 }) : null,
      title: label,
      open: expanded,
      expandable: true,
      expandOnRowClick: true,
      onToggle: () => setExpanded((value) => !value),
      collapsedContent: (0, import_react4.createElement)(
        import_react4.Fragment,
        null,
        (0, import_react4.createElement)("span", { className: "dcr-reasoning-separator", "aria-hidden": "true" }),
        (0, import_react4.createElement)(
          "span",
          { className: "dcr-reasoning-summary" },
          (0, import_react4.createElement)("span", { className: "dcr-reasoning-summary-text" }, summary)
        )
      )
    }, body)
  );
}
function relativeForFooter(absPath, cwd) {
  const normalized = normalizeMatchPath(absPath);
  if (cwd === void 0) return normalized;
  const root = normalizeMatchPath(cwd).replace(/\/+$/, "");
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
}
function ReferenceMenu({ menu, props, onClose }) {
  if (menu === null) return null;
  const width = 240;
  const left = Math.max(8, Math.min(menu.x, (typeof window === "undefined" ? 1200 : window.innerWidth) - width - 8));
  const top = Math.max(8, Math.min(menu.y, (typeof window === "undefined" ? 800 : window.innerHeight) - 120));
  const items = [
    { id: "explorer", label: "\u5728\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u6253\u5F00", icon: (0, import_react4.createElement)(import_dsh_client_ui_primitives2.IconFolderOpenOutline16, { size: 16 }) },
    { type: "separator", id: "s1" },
    { id: "copy", label: "\u590D\u5236\u8DEF\u5F84", icon: (0, import_react4.createElement)(import_dsh_client_ui_primitives2.IconCopyOutline16, { size: 16 }) }
  ];
  const onSelect = (id) => {
    if (id === "explorer") {
      void revealInExplorer({ file: menu.file });
    } else if (id === "copy") {
      void copyToClipboard(`${menu.file}:${menu.line ?? 1}`);
    }
    onClose();
  };
  return (0, import_react4.createElement)(
    "span",
    { "data-coderef-menu": "true" },
    (0, import_react4.createElement)(import_dsh_client_ui_primitives2.Menu, {
      open: true,
      autoFocus: true,
      portal: true,
      dense: true,
      compact: true,
      align: "start",
      side: "bottom",
      anchor: (0, import_react4.createElement)("span", { style: { position: "fixed", left, top, width: 0, height: 0 } }),
      getAnchorRect: () => new DOMRect(left, top, 0, 0),
      items,
      onSelect,
      onClose
    })
  );
}
function commandDisplayLabel(command) {
  const firstLine2 = command.split("\n")[0] ?? command;
  return firstLine2.length > 96 ? `${firstLine2.slice(0, 93)}\u2026` : firstLine2;
}
function RefGlyph(props) {
  return (0, import_react4.createElement)("span", {
    className: "dcr-link-icon",
    "aria-hidden": "true",
    style: { display: "inline-block", width: "11px", height: "11px", lineHeight: "11px", textAlign: "center" }
  }, props.kind === "url" ? "\u2197" : "\u203A");
}
function RefsFooter({ ledger, cwd, props, onContextMenu, onRunCommand }) {
  const files = (ledger?.refs?.files ?? []).filter((ref) => ref.visible === true);
  const urls = (ledger?.refs?.urls ?? []).filter((ref) => ref.visible === true);
  const commands = (ledger?.refs?.commands ?? []).filter((ref) => ref.visible === true);
  if (files.length === 0 && urls.length === 0 && commands.length === 0) return null;
  const sortedFiles = [...files].sort((a, b) => (b.visibleSeqs?.at(-1) ?? 0) - (a.visibleSeqs?.at(-1) ?? 0));
  const countBadge = (count, suffix) => (0, import_react4.createElement)("span", {
    style: { fontSize: "11px", color: "var(--dsw-alias-label-tertiary)" }
  }, `${count} ${suffix}`);
  const group = (key, title, count, children) => (0, import_react4.createElement)(
    "details",
    {
      key,
      className: "dcr-ref-group",
      open: true
    },
    (0, import_react4.createElement)(
      "summary",
      { className: "dcr-ref-group-summary" },
      (0, import_react4.createElement)("span", null, title),
      countBadge(count, "")
    ),
    (0, import_react4.createElement)("div", { className: "dcr-ref-group-body" }, ...children)
  );
  return (0, import_react4.createElement)(
    "details",
    { className: "dcr-refs", "data-coderef-refs": "true" },
    (0, import_react4.createElement)(
      "summary",
      null,
      (0, import_react4.createElement)("span", { style: { fontWeight: 500 } }, "\u5F15\u7528"),
      countBadge(files.length, "\u6587\u4EF6"),
      urls.length > 0 ? countBadge(urls.length, "\u94FE\u63A5") : null,
      commands.length > 0 ? countBadge(commands.length, "\u547D\u4EE4") : null
    ),
    (0, import_react4.createElement)(
      "div",
      { className: "dcr-refs-body" },
      files.length > 0 ? group("files", "\u6587\u4EF6", files.length, sortedFiles.map((ref) => {
        const line = ref.lines?.[0]?.start;
        const label = relativeForFooter(ref.absPath ?? ref.path, cwd);
        const sources = [...new Set((ref.occurrences ?? []).map((occ) => occ.source))].join("/");
        const target = { file: ref.absPath ?? ref.path, line: line ?? 1, title: label };
        return (0, import_react4.createElement)(
          "div",
          { key: `f:${ref.absPath ?? ref.path}`, className: "dcr-ref-item" },
          (0, import_react4.createElement)(
            "button",
            {
              type: "button",
              title: ref.absPath ?? ref.path,
              onClick: () => {
                void openReference(props, { file: ref.absPath ?? ref.path, line: line ?? 1 });
              },
              onContextMenu: (event) => {
                event.preventDefault();
                onContextMenu(event, target);
              }
            },
            (0, import_react4.createElement)(RefGlyph, { kind: "code" }),
            label + (line === void 0 ? "" : `:${line}`)
          ),
          (0, import_react4.createElement)(
            "span",
            { className: "dcr-ref-meta" },
            [sources, ref.occurrences?.length > 1 ? `${ref.occurrences.length} \u6B21` : ""].filter(Boolean).join(" \xB7 ")
          )
        );
      })) : null,
      urls.length > 0 ? group("urls", "\u94FE\u63A5", urls.length, urls.map((ref) => (0, import_react4.createElement)(
        "div",
        { key: `u:${ref.canonical}`, className: "dcr-ref-item" },
        (0, import_react4.createElement)(
          "button",
          {
            type: "button",
            title: ref.url,
            onClick: () => {
              if (typeof window !== "undefined") window.open(ref.url, "_blank", "noopener,noreferrer");
            }
          },
          (0, import_react4.createElement)(RefGlyph, { kind: "url" }),
          ref.title ?? ref.url
        ),
        (0, import_react4.createElement)("span", { className: "dcr-ref-meta" }, "web")
      ))) : null,
      commands.length > 0 ? group("commands", "\u547D\u4EE4", commands.length, commands.map((ref) => (0, import_react4.createElement)(
        "div",
        { key: `c:${ref.command}`, className: "dcr-ref-item" },
        (0, import_react4.createElement)(
          "button",
          {
            type: "button",
            title: `\u70B9\u51FB\u586B\u5165\u4FA7\u8FB9\u680F\u7EC8\u7AEF\uFF08\u4E0D\u6267\u884C\uFF09
${ref.command}`,
            onClick: () => onRunCommand(ref.command),
            className: "dcr-command-row"
          },
          (0, import_react4.createElement)(RefGlyph, { kind: "code" }),
          commandDisplayLabel(ref.command)
        ),
        (0, import_react4.createElement)("span", { className: "dcr-ref-meta" }, ref.command.length > 96 ? "terminal \xB7 long" : "terminal")
      ))) : null
    )
  );
}
var CoderefRenderer = (0, import_react4.memo)(function CoderefRenderer2(props) {
  ensureStyles();
  const node2 = props?.node;
  const data = node2 !== null && typeof node2 === "object" ? node2.data : void 0;
  const blocks = data !== null && typeof data === "object" && Array.isArray(data.blocks) ? data.blocks : [];
  const streaming = data !== null && typeof data === "object" && data.status === "running";
  const interrupted = data !== null && typeof data === "object" && data.status === "interrupted";
  const cwd = typeof props?.cwd === "string" ? props.cwd : void 0;
  const sessionId = resolveCurrentSessionId();
  const tail = typeof props?.useTurnData === "function" ? props.useTurnData("turn-tail") : void 0;
  const turn = node2?.location?.kind === "turn" || node2?.location?.kind === "step" ? node2.location.turn : void 0;
  const isClosing = turn?.status === "closed" && data?.finalNode !== void 0 && tail?.closing?.finalNode?.seq === data.finalNode.seq;
  const [items, setItems] = (0, import_react4.useState)(EMPTY_MAP);
  const [resolveRetry, setResolveRetry] = (0, import_react4.useState)(0);
  const resolveRetryTimer = (0, import_react4.useRef)(null);
  const retryTokenRef = (0, import_react4.useRef)("");
  const [ledger, setLedger] = (0, import_react4.useState)(null);
  const [menu, setMenu] = (0, import_react4.useState)(null);
  const [toast, setToast] = (0, import_react4.useState)(null);
  const toastTimer = (0, import_react4.useRef)(null);
  const lastKeyRef = (0, import_react4.useRef)("");
  const tokens = (0, import_react4.useMemo)(() => collectTokens(blocks), [blocks]);
  const tokenKey = (0, import_react4.useMemo)(
    () => `${tokens.bold.join("\0")}${tokens.inline.join("\0")}`,
    [tokens]
  );
  (0, import_react4.useEffect)(() => {
    if (cwd === void 0 || sessionId === void 0) return void 0;
    return subscribeLedger(sessionId, cwd, (data2) => {
      setLedger(data2);
    });
  }, [sessionId, cwd]);
  (0, import_react4.useEffect)(() => () => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    if (resolveRetryTimer.current !== null) clearTimeout(resolveRetryTimer.current);
    toastTimer.current = null;
    resolveRetryTimer.current = null;
  }, []);
  const runCommand = (0, import_react4.useCallback)((command) => {
    return (async () => {
      const mode = await fillTerminalInput(command);
      setToast(mode === "terminal" ? "\u5DF2\u586B\u5165\u4FA7\u8FB9\u680F\u7EC8\u7AEF\uFF08\u672A\u6267\u884C\uFF09" : mode === "clipboard" ? "\u7EC8\u7AEF\u4E0D\u53EF\u7528\uFF0C\u5DF2\u590D\u5236\u547D\u4EE4" : "\u65E0\u6CD5\u5199\u5165\u7EC8\u7AEF");
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2600);
    })();
  }, []);
  const textMentions = (0, import_react4.useMemo)(
    () => ledger === null ? void 0 : createTextMatcher(ledger, cwd, props, (command) => {
      void runCommand(command);
    }),
    [ledger, cwd, props, runCommand]
  );
  const commandMentions = (0, import_react4.useMemo)(() => ({
    resolve(value) {
      const command = value.trim();
      if (!looksLikeCommandText(command)) return void 0;
      return {
        label: value,
        title: "\u547D\u4EE4 \xB7 \u70B9\u51FB\u586B\u5165\u7EC8\u7AEF\uFF08\u4E0D\u6267\u884C\uFF09",
        run: () => {
          void runCommand(command);
        }
      };
    }
  }), [runCommand]);
  const showContextMenu = (event, target) => {
    if (target?.file === void 0) return;
    event.preventDefault();
    setMenu({
      x: event.clientX,
      y: event.clientY,
      file: target.file,
      line: target.line ?? 1,
      endLine: target.endLine,
      title: target.title
    });
  };
  (0, import_react4.useEffect)(() => {
    if (retryTokenRef.current === tokenKey) return void 0;
    retryTokenRef.current = tokenKey;
    setResolveRetry(0);
    return () => {
      if (resolveRetryTimer.current !== null) {
        clearTimeout(resolveRetryTimer.current);
        resolveRetryTimer.current = null;
      }
    };
  }, [tokenKey]);
  (0, import_react4.useEffect)(() => {
    if (streaming || cwd === void 0) {
      setItems(EMPTY_MAP);
      return void 0;
    }
    if (tokens.bold.length === 0 && tokens.inline.length === 0) {
      setItems(EMPTY_MAP);
      return void 0;
    }
    const key = `${sessionId ?? ""}|${cwd}|${tokenKey}|${resolveRetry}`;
    if (lastKeyRef.current === key) return void 0;
    lastKeyRef.current = key;
    let cancelled = false;
    resolveTokens({ cwd, sessionId, bold: tokens.bold, inline: tokens.inline }).then((next) => {
      if (cancelled) return;
      setItems(next);
      const unresolved = next instanceof Map && [...next.values()].some((item) => item !== null && typeof item === "object" && item.status === "unresolved");
      if (unresolved && resolveRetry < 4) {
        if (resolveRetryTimer.current !== null) clearTimeout(resolveRetryTimer.current);
        resolveRetryTimer.current = setTimeout(() => {
          setResolveRetry((value) => value + 1);
        }, 4e3);
      }
    }).catch((error) => {
      if (cancelled) return;
      debug.lastError = String(error?.message ?? error);
    });
    return () => {
      cancelled = true;
    };
  }, [streaming, cwd, sessionId, tokenKey, tokens, resolveRetry]);
  const hits = (0, import_react4.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    for (const [text4, item] of items instanceof Map ? items : []) {
      if (item !== null && typeof item === "object" && item.status === "linked" && item.chosen !== null && item.chosen !== void 0) {
        map.set(text4, item.chosen);
      }
    }
    return map;
  }, [items]);
  const snippets = (0, import_react4.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    for (const ref of ledger?.refs?.snippets ?? []) {
      if (typeof ref?.snippet === "string") map.set(normalizeSnippetText(ref.snippet), ref);
    }
    return map;
  }, [ledger]);
  const mentions = (0, import_react4.useMemo)(() => ({
    resolve(value) {
      const snippet = snippets.get(normalizeSnippetText(value));
      if (snippet !== void 0) {
        return {
          label: value,
          title: `${snippet.file}:${snippet.line}`,
          file: snippet.absPath ?? snippet.file,
          line: snippet.line,
          open: () => {
            void openReference(props, { file: snippet.absPath ?? snippet.file, line: snippet.line });
          }
        };
      }
      const hit = hits.get(value);
      if (hit === void 0) return void 0;
      return {
        label: hit.file,
        title: formatTitle(hit),
        file: absoluteRefFile(hit.file, cwd, ledger),
        line: hit.line,
        endLine: hit.endLine,
        open: () => {
          void openReference(props, { ...hit, file: absoluteRefFile(hit.file, cwd, ledger) });
        }
      };
    }
  }), [hits, snippets, props, cwd, ledger]);
  const rootRef = (0, import_react4.useRef)(null);
  const textMentionsWithHits = (0, import_react4.useMemo)(() => {
    if (textMentions === void 0) return void 0;
    return {
      match(value) {
        const spans = [...textMentions.match(value)];
        const covered = (start, end) => spans.some((span) => start < span.end && end > span.start);
        const pattern = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g;
        let token;
        while ((token = pattern.exec(value)) !== null) {
          const start = token.index;
          const end = start + token[0].length;
          if (covered(start, end) || !hits.has(token[0])) continue;
          const mention = mentions.resolve(token[0]);
          if (mention === void 0) continue;
          spans.push({
            start,
            end,
            kind: "symbol",
            label: token[0],
            title: mention.title,
            file: mention.file,
            line: mention.line,
            endLine: mention.endLine,
            open: mention.open
          });
        }
        return spans.sort((left, right) => left.start - right.start || right.end - left.end);
      }
    };
  }, [textMentions, mentions, hits]);
  (0, import_react4.useEffect)(() => {
    if (streaming || rootRef.current === null) return void 0;
    let timer = null;
    const run = () => {
      if (rootRef.current !== null) decorateCodeBlocks(rootRef.current, textMentions, mentions, hits);
    };
    const schedule = () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(run, 40);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(rootRef.current, { childList: true, subtree: true });
    const settle = setTimeout(() => {
      observer.disconnect();
      run();
    }, 1500);
    return () => {
      if (timer !== null) clearTimeout(timer);
      clearTimeout(settle);
      observer.disconnect();
    };
  }, [streaming, textMentions, textMentionsWithHits, mentions, hits, blocks, ledger]);
  const coderefLinks = (0, import_react4.useMemo)(() => ({
    open(href) {
      const parsed = parseCoderefHref(href);
      if (parsed === void 0) return;
      if (parsed.kind === "command") {
        if (typeof parsed.command === "string" && parsed.command !== "") void runCommand(parsed.command);
        return;
      }
      if (parsed.kind === "symbol") {
        const name2 = parsed.name;
        const candidates = (ledger?.refs?.symbols ?? []).filter((ref2) => ref2.name === name2).sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        const ref = candidates[0];
        if (ref !== void 0) {
          void openReference(props, { file: ref.absPath ?? ref.file, line: ref.line ?? 1 });
          return;
        }
        const sessionId2 = resolveCurrentSessionId();
        if (cwd !== void 0 && sessionId2 !== void 0) {
          void resolveTokens({ cwd, sessionId: sessionId2, bold: [name2], inline: [] }).then((items2) => {
            const item = items2.get(name2);
            if (item !== void 0 && item !== null && item.status === "linked" && item.chosen !== null && item.chosen !== void 0) {
              void openReference(props, item.chosen);
            }
          }).catch(() => {
          });
        }
        return;
      }
      void openReference(props, { ...parsed, file: absoluteRefFile(parsed.file, cwd, ledger) });
    }
  }), [props, ledger, cwd, runCommand]);
  const labels = (0, import_react4.useMemo)(() => ({
    code: {
      copyLabel: translate(props?.t, "copy", "\u590D\u5236"),
      copiedLabel: translate(props?.t, "copied", "\u5DF2\u590D\u5236")
    },
    footnotes: translate(props?.t, "markdown.footnotes", "\u811A\u6CE8")
  }), [props?.t]);
  const rendered = [];
  blocks.forEach((block, index2) => {
    if (block === null || typeof block !== "object") return;
    if (block.kind === "text") {
      rendered.push((0, import_react4.createElement)(MarkdownText, {
        key: `b${index2}`,
        text: block.text ?? "",
        streaming,
        labels,
        fileMentions: streaming ? void 0 : mentions,
        coderefLinks: streaming ? void 0 : coderefLinks,
        textMentions: streaming ? void 0 : textMentionsWithHits,
        commandMentions: streaming ? void 0 : commandMentions,
        onReferenceContextMenu: streaming ? void 0 : showContextMenu
      }));
    } else if (block.kind === "reasoning") {
      rendered.push((0, import_react4.createElement)(ReasoningBlock, {
        key: `b${index2}`,
        text: block.text ?? "",
        running: streaming,
        t: props?.t
      }));
    } else if (block.kind === "image") {
      rendered.push((0, import_react4.createElement)("span", { key: `b${index2}`, className: "dcr-image-alt" }, "[image]"));
    }
  });
  debug.renders += 1;
  return (0, import_react4.createElement)(
    "div",
    {
      className: "dcr-root",
      ref: rootRef,
      "data-coderef-renderer": "fork",
      ...streaming ? { "data-streaming": "true" } : {}
    },
    (0, import_react4.createElement)(
      "div",
      { className: "dcr-body" },
      rendered,
      interrupted ? (0, import_react4.createElement)("span", { key: "stopped", className: "dcr-stopped" }, "stopped") : null
    ),
    isClosing && ledger !== null ? (0, import_react4.createElement)(RefsFooter, { ledger, cwd, props, onContextMenu: showContextMenu, onRunCommand: (command) => {
      void runCommand(command);
    } }) : null,
    menu === null ? null : (0, import_react4.createElement)(ReferenceMenu, { menu, props, onClose: () => setMenu(null) }),
    toast === null ? null : (0, import_react4.createElement)("div", { className: "dcr-toast", "data-coderef-toast": "true", role: "status" }, toast)
  );
});
var RendererErrorBoundary = class extends import_react4.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    debug.lastError = String(error?.stack ?? error?.message ?? error);
    debug.lastComponentStack = String(info?.componentStack ?? "");
  }
  render() {
    if (this.state.error !== null) {
      return (0, import_react4.createElement)("pre", { className: "dcr-fallback" }, this.props.fallbackText);
    }
    return this.props.children;
  }
};
function blockText(blocks) {
  return (Array.isArray(blocks) ? blocks : []).filter((block) => block !== null && typeof block === "object" && (block.kind === "text" || block.kind === "reasoning")).map((block) => block.text ?? "").join("\n\n");
}
function CoderefAssistantStep(props) {
  const node2 = props?.node;
  const data = node2 !== null && typeof node2 === "object" ? node2.data : void 0;
  const blocks = data !== null && typeof data === "object" && Array.isArray(data.blocks) ? data.blocks : [];
  return (0, import_react4.createElement)(
    RendererErrorBoundary,
    { fallbackText: blockText(blocks) },
    (0, import_react4.createElement)(CoderefRenderer, props)
  );
}
var inject = ["slots"];
function apply(ctx) {
  try {
    if (ctx === void 0 || ctx === null) return;
    clientCtx = ctx;
    ensureStyles();
    const slots = ctx.slots;
    if (slots === void 0 || typeof slots.inject !== "function" || typeof slots.register !== "function") {
      debug.lastError = "slots-unavailable";
      return;
    }
    const register = () => slots.register({
      name: "conversation.chat.node",
      key: "assistant-step",
      priority: SLOT_PRIORITY,
      locale: "chat"
    }, CoderefAssistantStep);
    if (typeof ctx.effect === "function") {
      ctx.effect(() => {
        const dispose = slots.inject("conversation.chat.node", register);
        return () => {
          try {
            if (typeof dispose === "function") dispose();
          } catch {
          }
        };
      }, "dsh-coderef-renderer: shadow assistant-step");
    } else {
      slots.inject("conversation.chat.node", register);
    }
    debug.mounted = true;
    console.info(`[${PLUGIN_ID}] fork renderer loaded (v${VERSION}), shadow conversation.chat.node[assistant-step] @ priority ${SLOT_PRIORITY}`);
  } catch (error) {
    debug.lastError = String(error?.message ?? error);
    console.warn(`[${PLUGIN_ID}] client apply failed`, error);
  }
}
function __resetState() {
  clientCtx = null;
  tokenCache.clear();
  debug.mounted = false;
  debug.renders = 0;
  debug.lastError = null;
  debug.lastResolve = null;
  debug.lastOpen = null;
  debug.lastPing = null;
  pingGeneration += 1;
}
var name = PLUGIN_ID;
var version = VERSION;

		return module.exports;
	},
});
