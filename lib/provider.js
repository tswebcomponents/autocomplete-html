/// <reference path="typings/atompromise.d.ts" />
/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/typescript.d.ts" />
var resolve = Promise.resolve.bind(Promise);
var attributePattern, fs, path, tagPattern, trailingWhitespace;
path = require('path');
var ts = require('typescript');
trailingWhitespace = /\s$/;
attributePattern = /\s+([a-zA-Z][-a-zA-Z]*)\s*=\s*$/;
tagPattern = /<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/;
var Provider = (function () {
    function Provider() {
        this.selector = '.text.html';
        this.tsProvider = null;
    }
    Provider.prototype.getSuggestions = function (request) {
        if (this.isAttributeValueStartWithNoPrefix(request)) {
            return resolve(this.getAllAttributeValueCompletions(request));
        }
        else if (this.isAttributeValueStartWithPrefix(request)) {
            return resolve(this.getAttributeValueCompletions(request));
        }
        else if (this.isAttributeStartWithNoPrefix(request)) {
            return resolve(this.getAllAttributeNameCompletions(request));
        }
        else if (this.isAttributeStartWithPrefix(request)) {
            return resolve(this.getAttributeNameCompletions(request));
        }
        else if (this.isTagStartWithNoPrefix(request)) {
            return resolve(this.getAllTagNameCompletions());
        }
        else if (this.isTagStartTagWithPrefix(request)) {
            return resolve(this.getTagNameCompletions(request));
        }
        else {
            return resolve(new Array());
        }
    };
    Provider.prototype.isTagStartWithNoPrefix = function (arg) {
        var prefix, scopeDescriptor, scopes;
        prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
        scopes = scopeDescriptor.getScopesArray();
        return prefix === '<' && scopes.length === 1 && scopes[0] === 'text.html.basic';
    };
    Provider.prototype.isTagStartTagWithPrefix = function (arg) {
        var prefix, scopeDescriptor;
        prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
        if (!prefix) {
            return false;
        }
        if (trailingWhitespace.test(prefix)) {
            return false;
        }
        return this.hasTagScope(scopeDescriptor.getScopesArray());
    };
    Provider.prototype.isAttributeStartWithNoPrefix = function (arg) {
        var prefix, scopeDescriptor;
        prefix = arg.prefix, scopeDescriptor = arg.scopeDescriptor;
        if (!trailingWhitespace.test(prefix)) {
            return false;
        }
        return this.hasTagScope(scopeDescriptor.getScopesArray());
    };
    Provider.prototype.isAttributeStartWithPrefix = function (arg) {
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
    };
    Provider.prototype.isAttributeValueStartWithNoPrefix = function (arg) {
        var lastPrefixCharacter, prefix, scopeDescriptor, scopes;
        scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix;
        lastPrefixCharacter = prefix[prefix.length - 1];
        if (lastPrefixCharacter !== '"' && lastPrefixCharacter !== "'") {
            return false;
        }
        scopes = scopeDescriptor.getScopesArray();
        return this.hasStringScope(scopes) && this.hasTagScope(scopes);
    };
    Provider.prototype.isAttributeValueStartWithPrefix = function (arg) {
        var lastPrefixCharacter, prefix, scopeDescriptor, scopes;
        scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix;
        lastPrefixCharacter = prefix[prefix.length - 1];
        if (lastPrefixCharacter === '"' || lastPrefixCharacter === "'") {
            return false;
        }
        scopes = scopeDescriptor.getScopesArray();
        return this.hasStringScope(scopes) && this.hasTagScope(scopes);
    };
    Provider.prototype.hasTagScope = function (scopes) {
        return scopes.indexOf('meta.tag.any.html') !== -1 || scopes.indexOf('meta.tag.other.html') !== -1 || scopes.indexOf('meta.tag.block.any.html') !== -1 || scopes.indexOf('meta.tag.inline.any.html') !== -1 || scopes.indexOf('meta.tag.structure.any.html') !== -1;
    };
    Provider.prototype.hasStringScope = function (scopes) {
        return scopes.indexOf('string.quoted.double.html') !== -1 || scopes.indexOf('string.quoted.single.html') !== -1;
    };
    Provider.prototype.getAllTagNameCompletions = function () {
        var attributes, ref, tag;
        var completions = [];
        ref = this.completions.tags;
        for (tag in ref) {
            attributes = ref[tag];
            var c = {
                type: "tag",
                text: tag,
                replacementPrefix: ''
            };
            completions.push(c);
        }
        return completions;
    };
    Provider.prototype.getTagNameCompletions = function (arg) {
        var attributes, lowerCasePrefix, prefix, ref, tag;
        prefix = arg.prefix;
        var completions = [];
        lowerCasePrefix = prefix.toLowerCase();
        ref = this.completions.tags;
        for (tag in ref) {
            attributes = ref[tag];
            if (tag.indexOf(lowerCasePrefix) === 0) {
                var c = {
                    type: "tag",
                    text: tag,
                    replacementPrefix: prefix
                };
                completions.push(c);
            }
        }
        return completions;
    };
    Provider.prototype.getAllAttributeNameCompletions = function (arg) {
        var attribute, bufferPosition, editor, i, len, options, ref, tagAttributes;
        editor = arg.editor, bufferPosition = arg.bufferPosition;
        var completions = [];
        ref = this.completions.attributes;
        for (attribute in ref) {
            options = ref[attribute];
            if (options.global) {
                var c = {
                    type: "attribute",
                    text: attribute,
                    replacementPrefix: ''
                };
            }
        }
        tagAttributes = this.getTagAttributes(editor, bufferPosition);
        for (i = 0, len = tagAttributes.length; i < len; i++) {
            attribute = tagAttributes[i];
            var c = {
                type: "attribute",
                text: attribute,
                replacementPrefix: ''
            };
            completions.push(c);
        }
        return completions;
    };
    Provider.prototype.getAttributeNameCompletions = function (arg) {
        var attribute, bufferPosition, editor, i, len, lowerCasePrefix, options, prefix, ref, tagAttributes;
        editor = arg.editor, bufferPosition = arg.bufferPosition, prefix = arg.prefix;
        var completions = [];
        lowerCasePrefix = prefix.toLowerCase();
        ref = this.completions.attributes;
        for (attribute in ref) {
            options = ref[attribute];
            if (attribute.indexOf(lowerCasePrefix) === 0) {
                if (options.global) {
                    var c = {
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
                var c = {
                    type: "attribute",
                    text: attribute,
                    replacementPrefix: ''
                };
                completions.push(c);
            }
        }
        return completions;
    };
    Provider.prototype.getAllAttributeValueCompletions = function (arg) {
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
    };
    Provider.prototype.getAttributeValueCompletions = function (arg) {
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
    };
    Provider.prototype.loadCompletions = function () {
        var _this = this;
        var symbols = this.tsProvider.getNamedDeclarations();
        this.completions = {};
        this.completions.tags = {};
        if (symbols) {
            symbols.then(function (r) { return r.forEach(function (s) {
                var attributes = [];
                var members = s.symbol.members;
                for (var m in members) {
                    var _symbol = members[m];
                    if (_symbol.getFlags() === 4) {
                        attributes.push(m);
                    }
                }
                var tag = {
                    "attributes": attributes
                };
                var tagName = s.name.getText().replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase();
                _this.completions.tags[tagName] = tag;
                _this.completions.attributes = [];
            }); });
        }
    };
    Provider.prototype.getPreviousTag = function (editor, bufferPosition) {
        var ref, row, tag;
        row = bufferPosition.row;
        while (row >= 0) {
            tag = (ref = tagPattern.exec(editor.lineTextForBufferRow(row))) != null ? ref[1] : void 0;
            if (tag) {
                return tag;
            }
            row--;
        }
    };
    Provider.prototype.getPreviousAttribute = function (editor, bufferPosition) {
        var line, quoteIndex, ref, ref1;
        line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]).trim();
        quoteIndex = line.length - 1;
        while (line[quoteIndex] && !((ref = line[quoteIndex]) === '"' || ref === "'")) {
            quoteIndex--;
        }
        line = line.substring(0, quoteIndex);
        return (ref1 = attributePattern.exec(line)) != null ? ref1[1] : void 0;
    };
    Provider.prototype.getAttributeValues = function (editor, bufferPosition) {
        var attribute, ref;
        var tag = this.getPreviousTag(editor, bufferPosition);
        attribute = this.completions.tags[tag].attributes[this.getPreviousAttribute(editor, bufferPosition)];
        return (ref = attribute != null ? attribute.attribOption : void 0) != null ? ref : [];
    };
    Provider.prototype.getTagAttributes = function (editor, bufferPosition) {
        var ref, ref1, tag;
        tag = this.getPreviousTag(editor, bufferPosition);
        return (ref = (ref1 = this.completions.tags[tag]) != null ? ref1.attributes : void 0) != null ? ref : [];
    };
    return Provider;
})();
;
;
module.exports = new Provider();
