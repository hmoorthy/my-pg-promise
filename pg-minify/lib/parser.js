'use strict';

var os = require('os');
var errorLib = require('./error');

var PEC = errorLib.parsingErrorCode;

// symbols that need no spaces around them:
var compressors = '.,;:()[]=<>+-*/|!?@#';

///////////////////////////////////////////
// Parses and minifies a PostgreSQL script.
function minify(sql, options) {

    if (typeof sql !== 'string') {
        throw new TypeError("Input SQL must be a text string.");
    }

    if (options !== undefined && typeof(options) !== 'object') {
        throw new TypeError("Parameter 'options' must be an object.");
    }

    if (!sql.length) {
        return '';
    }

    var idx = 0, // current index
        result = '', // resulting sql
        len = sql.length, // sql length
        EOL = getEOL(sql), // end-of-line
        space = false, // add a space on the next step
        compress = options && options.compress; // options 'compress'

    do {
        var s = sql[idx], // current symbol;
            s1 = idx < len - 1 ? sql[idx + 1] : ''; // next symbol;

        if (isGap(s)) {
            while (++idx < len && isGap(sql[idx]));
            if (idx < len) {
                space = true;
            }
            idx--;
            continue;
        }

        if (s === '-' && s1 === '-') {
            var lb = sql.indexOf(EOL, idx + 2);
            if (lb < 0) {
                break;
            }
            idx = lb - 1;
            skipGaps();
            continue;
        }

        if (s === '/' && s1 === '*') {
            var end = sql.indexOf('*/', idx + 2);
            if (end < 0) {
                throwError(PEC.unclosedMLC);
            }
            idx = end + 1;
            skipGaps();
            continue;
        }

        if (s === '"') {
            var closeIdx = sql.indexOf('"', idx + 1);
            if (closeIdx < 0) {
                throwError(PEC.unclosedQI);
            }
            var text = sql.substr(idx, closeIdx - idx + 1);
            if (text.indexOf(EOL) > 0) {
                throwError(PEC.multiLineQI);
            }
            if (compress) {
                space = false;
            }
            addSpace();
            result += text;
            idx = closeIdx;
            skipGaps();
            continue;
        }

        if (s === '\'') {
            var closeIdx = idx;
            do {
                closeIdx = sql.indexOf('\'', closeIdx + 1);
                if (closeIdx > 0) {
                    var step = closeIdx;
                    while (++step < len && sql[step] === '\'');
                    if ((step - closeIdx) % 2) {
                        closeIdx = step - 1;
                        break;
                    }
                    closeIdx = step === len ? -1 : step;
                }
            } while (closeIdx > 0);
            if (closeIdx < 0) {
                throwError(PEC.unclosedText);
            }
            if (compress) {
                space = false;
            }
            addSpace();
            var text = sql.substr(idx, closeIdx - idx + 1);
            var hasLB = text.indexOf(EOL) > 0;
            if (hasLB) {
                text = text.split(EOL).map(function (m) {
                    return m.replace(/^\s+|\s+$/g, '');
                }).join('\\n');
            }
            var hasTabs = text.indexOf('\t') > 0;
            if (hasLB || hasTabs) {
                var prev = idx ? sql[idx - 1] : '';
                if (prev !== 'E' && prev !== 'e') {
                    var r = result ? result[result.length - 1] : '';
                    if (r && r !== ' ' && compressors.indexOf(r) < 0) {
                        result += ' ';
                    }
                    result += 'E';
                }
                if (hasTabs) {
                    text = text.replace(/\t/g, '\\t');
                }
            }
            result += text;
            idx = closeIdx;
            skipGaps();
            continue;
        }

        if (compress && compressors.indexOf(s) >= 0) {
            space = false;
            skipGaps();
        }

        addSpace();
        result += s;

    } while (++idx < len);

    return result;

    function skipGaps() {
        if (compress) {
            while (idx < len - 1 && isGap(sql[idx + 1])) {
                idx++;
            }
        }
    }

    function addSpace() {
        if (space) {
            if (result.length) {
                result += ' ';
            }
            space = false;
        }
    }

    function throwError(code) {
        var position = getIndexPos(sql, idx, EOL);
        throw new errorLib.SQLParsingError(code, position);
    }
}

//////////////////////////////////////
// Returns the End-Of-Line from text.
function getEOL(text) {
    var idx = 0, unix = 0, windows = 0;
    while (idx < text.length) {
        idx = text.indexOf('\n', idx);
        if (idx == -1) {
            break;
        }
        if (idx > 0 && text[idx - 1] === '\r') {
            windows++;
        } else {
            unix++;
        }
        idx++;
    }
    if (unix === windows) {
        return os.EOL;
    }
    return unix > windows ? '\n' : '\r\n';
}

///////////////////////////////////////////////////////
// Returns {line, column} of an index within the text.
function getIndexPos(text, index, eol) {
    var lineIdx = 0, colIdx = index, pos = 0;
    do {
        pos = text.indexOf(eol, pos);
        if (pos == -1 || index < pos + eol.length) {
            break;
        }
        lineIdx++;
        pos += eol.length;
        colIdx = index - pos;
    } while (pos < index);
    return {
        line: lineIdx + 1,
        column: colIdx + 1
    };
}

////////////////////////////////////
// Identifies a gap / empty symbol.
function isGap(s) {
    return s === ' ' || s === '\t' || s === '\r' || s === '\n';
}

module.exports = {
    minify: minify,

    // these are exported only for testing:
    getEOL: getEOL,
    getIndexPos: getIndexPos
};
