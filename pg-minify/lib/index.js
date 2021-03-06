'use strict';

var parser = require('./parser');
var error = require('./error');

parser.minify.SQLParsingError = error.SQLParsingError;
parser.minify.parsingErrorCode = error.parsingErrorCode;

module.exports = parser.minify;
