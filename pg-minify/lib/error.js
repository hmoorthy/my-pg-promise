'use strict';

var EOL = require('os').EOL;

var parsingErrorCode = {
    unclosedMLC: 0, // Unclosed multi-line comment.
    unclosedText: 1, // Unclosed text block.
    unclosedQI: 2, // Unclosed quoted identifier.
    multiLineQI: 3 // Multi-line quoted identifiers are not supported.
};

Object.freeze(parsingErrorCode);

var errorMessages = [
    {name: "unclosedMLC", message: "Unclosed multi-line comment."},
    {name: "unclosedText", message: "Unclosed text block."},
    {name: "unclosedQI", message: "Unclosed quoted identifier."},
    {name: "multiLineQI", message: "Multi-line quoted identifiers are not supported."}
];

function SQLParsingError(code, position) {
    var temp = Error.apply(this, arguments);
    temp.name = this.name = 'SQLParsingError';
    this.stack = temp.stack;
    this.code = code; // one of parsingErrorCode values;
    this.error = errorMessages[code].message;
    this.position = position; // Error position in the text: {line, column}
    this.message = "Error parsing SQL at {line:" + position.line + ",col:" + position.column + "}: " + this.error;
}

SQLParsingError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: SQLParsingError,
        writable: true,
        configurable: true
    }
});

SQLParsingError.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    var gap = messageGap(level + 1);
    var lines = [
        'SQLParsingError {',
        gap + 'code: parsingErrorCode.' + errorMessages[this.code].name,
        gap + 'error: "' + this.error + '"',
        gap + 'position: {line: ' + this.position.line + ", col: " + this.position.column + '}',
        messageGap(level) + '}'
    ];
    return lines.join(EOL);
};

function messageGap(level) {
    return Array(1 + level * 4).join(' ');
}

SQLParsingError.prototype.inspect = function () {
    return this.toString();
};

module.exports = {
    SQLParsingError: SQLParsingError,
    parsingErrorCode: parsingErrorCode
};
