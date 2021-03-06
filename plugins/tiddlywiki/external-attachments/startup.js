/*\
title: $:/plugins/tiddlywiki/external-attachments/startup.js
type: application/javascript
module-type: startup

Startup initialisation

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var ENABLE_EXTERNAL_ATTACHMENTS_TITLE = "$:/config/ExternalAttachments/Enable",
	USE_ABSOLUTE_FOR_DESCENDENTS_TITLE = "$:/config/ExternalAttachments/UseAbsoluteForDescendents",
	USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE = "$:/config/ExternalAttachments/UseAbsoluteForNonDescendents";

// Export name and synchronous status
exports.name = "external-attachments";
exports.platforms = ["browser"];
exports.after = ["startup"];
exports.synchronous = true;

exports.startup = function() {
	test_makePathRelative();
	$tw.hooks.addHook("th-importing-file",function(info) {
		if(document.location.protocol === "file:" && info.isBinary && info.file.path && $tw.wiki.getTiddlerText(ENABLE_EXTERNAL_ATTACHMENTS_TITLE,"") === "yes") {
console.log("Wiki location",document.location.pathname)
console.log("File location",info.file.path)
			info.callback([
				{
					title: info.file.name,
					type: info.type,
					"_canonical_uri": makePathRelative(
						info.file.path,
						document.location.pathname,
						{
							useAbsoluteForNonDescendents: $tw.wiki.getTiddlerText(USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE,"") === "yes",
							useAbsoluteForDescendents: $tw.wiki.getTiddlerText(USE_ABSOLUTE_FOR_DESCENDENTS_TITLE,"") === "yes"
						}
					)
				}
			]);
			return true;
		} else {
			return false;
		}
	});
};

/*
Given a source absolute filepath and a root absolute path, returns the source filepath expressed as a relative filepath from the root path.

sourcepath comes from the "path" property of the file object, with the following patterns:
	/path/to/file.png for Unix systems
	C:\path\to\file.png for local files on Windows
	\\sharename\path\to\file.png for network shares on Windows
rootpath comes from document.location.pathname with urlencode applied with the following patterns:
	/path/to/file.html for Unix systems
	/C:/path/to/file.html for local files on Windows
	/sharename/path/to/file.html for network shares on Windows
*/
function makePathRelative(sourcepath,rootpath,options) {
	options = options || {};
	// First we convert the source path from OS-dependent format to generic file:// format
	if(options.isWindows || $tw.platform.isWindows) {
		sourcepath = sourcepath.replace(/\\/g,"/");
		// If it's a local file like C:/path/to/file.ext then add a leading slash
		if(sourcepath.charAt(0) !== "/") {
			sourcepath = "/" + sourcepath;
		}
		// If it's a network share then remove one of the leading slashes
		if(sourcepath.substring(0,2) === "//") {
			sourcepath = sourcepath.substring(1);
		}
	}
	// Split the path into parts
	var sourceParts = sourcepath.split("/"),
		rootParts = rootpath.split("/"),
		outputParts = [];
	// urlencode the parts of the sourcepath
	$tw.utils.each(sourceParts,function(part,index) {
		sourceParts[index] = encodeURI(part);
	});
	// Identify any common portion from the start
	var c = 0,
		p;
	while(c < sourceParts.length && c < rootParts.length && sourceParts[c] === rootParts[c]) {
		c += 1;
	}
	// Use an absolute path if there's no common portion, or if specifically requested
	if(c === 1 || (options.useAbsoluteForNonDescendents && c < rootParts.length) || (options.useAbsoluteForDescendents && c === rootParts.length)) {
		return sourcepath;
	}
	// Move up a directory for each directory left in the root
	for(p = c; p < rootParts.length; p++) {
		outputParts.push("..");
	}		
	// Add on the remaining parts of the source path
	for(p = c; p < sourceParts.length; p++) {
		outputParts.push(sourceParts[p]);
	}
	return outputParts.join("/");
}

function test_makePathRelative() {
	var test = function(sourcepath,rootpath,result,options) {
		if(makePathRelative(sourcepath,rootpath,options) !== result) {
			throw "makePathRelative test failed: makePathRelative(" + sourcepath + "," + rootpath + "," + JSON.stringify(options) + ") is not equal to " + result;			
		}
	};
	test("/Users/me/something/file.png","/Users/you/something","../../me/something/file.png");
	test("/Users/me/something/file.png","/Users/you/something","/Users/me/something/file.png",{useAbsoluteForNonDescendents: true});
	test("/Users/me/something/else/file.png","/Users/me/something","else/file.png");
	test("/Users/me/something/file.png","/Users/me/something/new","../file.png");
	test("/Users/me/something/file.png","/Users/me/something/new","/Users/me/something/file.png",{useAbsoluteForNonDescendents: true});
	test("/Users/me/something/file.png","/Users/me/something","file.png");
	test("C:\\Users\\me\\something\\file.png","/C:/Users/me/something","file.png",{isWindows: true});
	test("\\\\SHARE\\Users\\me\\something\\file.png","/SHARE/Users/me/somethingelse","../something/file.png",{isWindows: true});
	test("\\\\SHARE\\Users\\me\\something\\file.png","/C:/Users/me/something","/SHARE/Users/me/something/file.png",{isWindows: true});
}


})();
