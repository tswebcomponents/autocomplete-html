/// <reference path="typings/atompromise.d.ts" />
/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/typescript.d.ts" />

var resolve: typeof Promise.resolve = Promise.resolve.bind(Promise);

// danielm
/*
var s = atom.packages.resolvePackagePath('atom-typescript');
console.log(s);
var parent = require(s + '/dist/worker/parent');
console.log(parent);
var projectService = require(s + '/dist/main/lang/projectService');
*/
// end danielm

var attributePattern, fs, path, tagPattern, trailingWhitespace;

path = require('path');
import ts = require('typescript');

trailingWhitespace = /\s$/;

attributePattern = /\s+([a-zA-Z][-a-zA-Z]*)\s*=\s*$/;

tagPattern = /<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/;

class Provider {
  public selector:string = '.text.html';

  //public excludeLowerPriority = true;

  //public inclusionPriority = 10;

  public tsProvider = null;

  private completions;

  getSuggestions(request: autocompleteplus.RequestOptions): Promise<autocompleteplus.Suggestion[]> {
    if (this.isAttributeValueStartWithNoPrefix(request)) {
      return resolve(this.getAllAttributeValueCompletions(request));
    } else if (this.isAttributeValueStartWithPrefix(request)) {
      return resolve(this.getAttributeValueCompletions(request));
    } else if (this.isAttributeStartWithNoPrefix(request)) {
      return resolve(this.getAllAttributeNameCompletions(request));
    } else if (this.isAttributeStartWithPrefix(request)) {
      return resolve(this.getAttributeNameCompletions(request));
    } else if (this.isTagStartWithNoPrefix(request)) {
      return resolve(this.getAllTagNameCompletions());
    } else if (this.isTagStartTagWithPrefix(request)) {
      return resolve(this.getTagNameCompletions(request));
    } else {
      return resolve(new Array());
    }
  }

  isTagStartWithNoPrefix(arg: autocompleteplus.RequestOptions) {
    var prefix, scopeDescriptor, scopes;
    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    scopes = scopeDescriptor.getScopesArray();
    return prefix === '<' && scopes.length === 1 && scopes[0] === 'text.html.basic';
  }

  isTagStartTagWithPrefix(arg: autocompleteplus.RequestOptions) {
    var prefix, scopeDescriptor;
    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    if (!prefix) {
      return false;
    }
    if (trailingWhitespace.test(prefix)) {
      return false;
    }
    return this.hasTagScope(scopeDescriptor.getScopesArray());
  }

  isAttributeStartWithNoPrefix(arg: autocompleteplus.RequestOptions) {
    var prefix, scopeDescriptor;
    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    if (!trailingWhitespace.test(prefix)) {
      return false;
    }
    return this.hasTagScope(scopeDescriptor.getScopesArray());
  }

  isAttributeStartWithPrefix(arg: autocompleteplus.RequestOptions) {
    var prefix, scopeDescriptor, scopes;
    prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
    if (!prefix) {
      return false;
    }
    if (trailingWhitespace.test(prefix)) {
      return false;
    }
    scopes = scopeDescriptor.getScopesArray();
    if (scopes.indexOf('entity.other.attribute-name.html') !== -1 || scopes.indexOf('meta.tag.other.html') !== -1) {
      return true;
    }
    if (!this.hasTagScope(scopes)) {
      return false;
    }
    return scopes.indexOf('punctuation.definition.tag.html') !== -1 || scopes.indexOf('punctuation.definition.tag.end.html') !== -1;
  }

  isAttributeValueStartWithNoPrefix(arg: autocompleteplus.RequestOptions) {
    var lastPrefixCharacter, prefix, scopeDescriptor, scopes;
    scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix;
    lastPrefixCharacter = prefix[prefix.length - 1];
    if (lastPrefixCharacter !== '"' && lastPrefixCharacter !== "'") {
      return false;
    }
    scopes = scopeDescriptor.getScopesArray();
    return this.hasStringScope(scopes) && this.hasTagScope(scopes);
  }

  isAttributeValueStartWithPrefix(arg: autocompleteplus.RequestOptions) {
    var lastPrefixCharacter, prefix, scopeDescriptor, scopes;
    scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix;
    lastPrefixCharacter = prefix[prefix.length - 1];
    if (lastPrefixCharacter === '"' || lastPrefixCharacter === "'") {
      return false;
    }
    scopes = scopeDescriptor.getScopesArray();
    return this.hasStringScope(scopes) && this.hasTagScope(scopes);
  }

  hasTagScope(scopes) {
    return scopes.indexOf('meta.tag.any.html') !== -1 || scopes.indexOf('meta.tag.other.html') !== -1 || scopes.indexOf('meta.tag.block.any.html') !== -1 || scopes.indexOf('meta.tag.inline.any.html') !== -1 || scopes.indexOf('meta.tag.structure.any.html') !== -1;
  }

  hasStringScope(scopes) {
    return scopes.indexOf('string.quoted.double.html') !== -1 || scopes.indexOf('string.quoted.single.html') !== -1;
  }

  /*
   * Getters
   */

  getAllTagNameCompletions(): autocompleteplus.Suggestion[] {
    var attributes, ref, tag;
    var completions:Array<autocompleteplus.Suggestion> = [];
    ref = this.completions.tags;
    for (tag in ref) {
      attributes = ref[tag];
      var c:autocompleteplus.Suggestion = {
        type: "tag",
        text: tag,
        replacementPrefix: ''
      };
      completions.push(c);
    }
    return completions;
  }

  getTagNameCompletions(arg): autocompleteplus.Suggestion[] {
    var attributes, lowerCasePrefix, prefix, ref, tag;
    prefix = arg.prefix;
    var completions:Array<autocompleteplus.Suggestion> = [];
    lowerCasePrefix = prefix.toLowerCase();
    ref = this.completions.tags;
    for (tag in ref) {
      attributes = ref[tag];
      if (tag.indexOf(lowerCasePrefix) === 0) {
        var c:autocompleteplus.Suggestion = {
          type: "tag",
          text: tag,
          replacementPrefix: prefix
        };

        completions.push(c);
      }
    }
    return completions;
  }

  // TODO: filter on element class
  getAllAttributeNameCompletions(arg) {
    var attribute, bufferPosition, editor, i, len, options, ref, tagAttributes;
    editor = arg.editor, bufferPosition = arg.bufferPosition;
    var completions:Array<autocompleteplus.Suggestion> = [];
    ref = this.completions.attributes;
    for (attribute in ref) {
      options = ref[attribute];
      if (options.global) {
        var c:autocompleteplus.Suggestion = {
          type: "attribute",
          text: attribute,
          replacementPrefix: ''
        };
      }
    }
    tagAttributes = this.getTagAttributes(editor, bufferPosition);
    for (i = 0, len = tagAttributes.length; i < len; i++) {
      attribute = tagAttributes[i];

      var c:autocompleteplus.Suggestion = {
        type: "attribute",
        text: attribute,
        replacementPrefix: ''
      };

      completions.push(c);
    }
    return completions;
  }

  getAttributeNameCompletions(arg) {
    var attribute, bufferPosition, editor, i, len, lowerCasePrefix, options, prefix, ref, tagAttributes;
    editor = arg.editor, bufferPosition = arg.bufferPosition, prefix = arg.prefix;
    var completions:Array<autocompleteplus.Suggestion> = [];
    lowerCasePrefix = prefix.toLowerCase();
    ref = this.completions.attributes;
    for (attribute in ref) {
      options = ref[attribute];
      if (attribute.indexOf(lowerCasePrefix) === 0) {
        if (options.global) {
          var c:autocompleteplus.Suggestion = {
            type: "attribute",
            text: attribute,
            replacementPrefix: ''
          };
          completions.push(c);
        }
      }
    }
    tagAttributes = this.getTagAttributes(editor, bufferPosition);
    for (i = 0, len = tagAttributes.length; i < len; i++) {
      attribute = tagAttributes[i];
      if (attribute.indexOf(lowerCasePrefix) === 0) {
        var c:autocompleteplus.Suggestion = {
          type: "attribute",
          text: attribute,
          replacementPrefix: ''
        };
        completions.push(c);
      }
    }
    return completions;
  }

  getAllAttributeValueCompletions(arg: autocompleteplus.RequestOptions) {
    var bufferPosition, completions, editor, i, len, value, values;
    editor = arg.editor, bufferPosition = arg.bufferPosition;
    completions = [];
    values = this.getAttributeValues(editor, bufferPosition);
    for (i = 0, len = values.length; i < len; i++) {
      value = values[i];
      completions.push({
        text: value,
        replacementPrefix: ''
      });
    }
    return completions;
  }

  getAttributeValueCompletions(arg: autocompleteplus.RequestOptions) {
    var bufferPosition, completions, editor, i, len, lowerCasePrefix, prefix, value, values;
    editor = arg.editor, bufferPosition = arg.bufferPosition, prefix = arg.prefix;
    completions = [];
    values = this.getAttributeValues(editor, bufferPosition);
    lowerCasePrefix = prefix.toLowerCase();
    for (i = 0, len = values.length; i < len; i++) {
      value = values[i];
      if (value.indexOf(lowerCasePrefix) === 0) {
        completions.push({
          text: value,
          replacementPrefix: prefix
        });
      }
    }
    return completions;
  }

  public loadCompletions() {
    var symbols:Promise<ts.Declaration[]> = this.tsProvider.getNamedDeclarations();
    this.completions = {};
    this.completions.tags = {};

    if (symbols) {
      symbols.then(r => r.forEach(s => {

        var attributes = [];
        var members:ts.SymbolTable = s.symbol.members;
        for (var m in members) {
          var _symbol:ts.Symbol = members[m];
          if (_symbol.getFlags() === ts.SymbolFlags.Property) {
            attributes.push(m);
          }
        }

        var tag = {
          "attributes": attributes
        };

        // Convert camelCase classname to prefixed tag

        var tagName = s.name.getText().replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase();
        this.completions.tags[tagName] = tag;
        this.completions.attributes = [];
      }));
    }
  }

  getPreviousTag(editor, bufferPosition) {
    var ref, row, tag;
    row = bufferPosition.row;
    while (row >= 0) {
      tag = (ref = tagPattern.exec(editor.lineTextForBufferRow(row))) != null ? ref[1] : void 0;
      if (tag) {
        return tag;
      }
      row--;
    }
  }

  getPreviousAttribute(editor, bufferPosition) {
    var line, quoteIndex, ref, ref1;
    line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]).trim();
    quoteIndex = line.length - 1;
    while (line[quoteIndex] && !((ref = line[quoteIndex]) === '"' || ref === "'")) {
      quoteIndex--;
    }
    line = line.substring(0, quoteIndex);
    return (ref1 = attributePattern.exec(line)) != null ? ref1[1] : void 0;
  }

  getAttributeValues(editor, bufferPosition):string[] {
    var attribute, ref;
    var tag:string = this.getPreviousTag(editor, bufferPosition);
    attribute = this.completions.tags[tag].attributes[this.getPreviousAttribute(editor, bufferPosition)];

    // TODO: global attribute values
    //attribute = this.completions.attributes[this.getPreviousAttribute(editor, bufferPosition)];

    return (ref = attribute != null ? attribute.attribOption : void 0) != null ? ref : [];
  }

  getTagAttributes(editor, bufferPosition) {
    var ref, ref1, tag;
    tag = this.getPreviousTag(editor, bufferPosition);
    return (ref = (ref1 = this.completions.tags[tag]) != null ? ref1.attributes : void 0) != null ? ref : [];
  }
};

export = new Provider();

/*
** TODO
*/
declare module TextBuffer {
  interface IPoint {}
};

declare module autocompleteplus {
    /** What gets passed into the handler */
    export interface RequestOptions {
        editor: AtomCore.IEditor;
        bufferPosition: TextBuffer.IPoint; // the position of the cursor
        prefix: string;
        scopeDescriptor: { scopes: string[] };
    }

    /** The suggestion */
    export interface Suggestion {
        //Either text or snippet is required

        text?: string;
        snippet?: string;

        replacementPrefix?: string;

        rightLabel?: string;
        rightLabelHTML?: string;
        type: string;

        atomTS_IsReference?: {
            relativePath: string
        };
        atomTS_IsImport?: {
            relativePath: string
        };
        atomTS_IsES6Import?: {
            relativePath: string
        };
    }

    /** What the provider needs to implement */
    export interface Provider {
        selector: string;
        getSuggestions: (options: RequestOptions) => Promise<Suggestion[]>;
        onDidInsertSuggestion?: (args: { editor: AtomCore.IEditor; triggerPosition: TextBuffer.IPoint; suggestion: Suggestion }) => any;
    }
}
