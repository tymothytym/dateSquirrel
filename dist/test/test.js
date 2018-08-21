(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["dsq"] = factory();
	else
		root["dsq"] = factory();
})(window, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/assets/js/app.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/assets/js/app.js":
/*!******************************!*\
  !*** ./src/assets/js/app.js ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\n// --------------------------------------------------------\n// Imports\n// --------------------------------------------------------\n\n//import dsq from '../../plugin/dsq';\n\nconsole.log('app.js');\n\n//******************************************\n// page functions\n//******************************************\n\n// ...back to top\nfunction bttVisibility() {\n    if (document.documentElement.scrollTop >= window.innerHeight) {\n        document.querySelector('footer a.navigation-icon').classList.add('dsq-shown');\n    } else {\n        document.querySelector('footer a.navigation-icon').classList.remove('dsq-shown');\n    }\n}\ndocument.addEventListener(\"scroll\", bttVisibility, false);\n// date helpers\nfunction addDays(d, days) {\n    var dat = new Date(d.valueOf());\n    dat.setDate(dat.getDate() + days);\n    return dat;\n}\nfunction pastNine(n) {\n    return new Date().getHours() > 9 ? n : 0;\n}\nfunction futureDate() {\n    var today = new Date(),\n        uiDate = today.toLocaleString('en-gb', { weekday: \"short\" }).slice(0, 2),\n        dueBy;\n    if (uiDate === 'Mo') {\n        dueBy = addDays(today, 3 + pastNine(1));\n    } else if (uiDate === 'Tu') {\n        dueBy = addDays(today, 3 + pastNine(5));\n    } else if (uiDate === 'We' || uiDate === 'Th' || uiDate === 'Fr') {\n        dueBy = addDays(today, 5 + pastNine(1));\n    } else if (uiDate === 'Sa') {\n        dueBy = addDays(today, 5);\n    } else {\n        dueBy = addDays(today, 4);\n    }\n    return dueBy;\n}\nfunction daysInMonth(y, m) {\n    // expects JS month\n    var isLeap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);\n    return [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];\n}\nfunction threeHence() {\n    // a simple function to calculate the date three days in the future excluding weekends\n    var today = new Date(),\n        dayName = today.toLocaleString('en-gb', { weekday: \"short\" }),\n        workDaysHence = void 0,\n        addD = function addDays(d, days) {\n        return new Date(d.valueOf()).setDate(new Date(d.valueOf()).getDate() + days);\n    };\n    if (dayName === 'Mon' || dayName === 'Tue') {\n        workDaysHence = addD(today, 3);\n    } else if (dayName === 'Wed' || dayName === 'Thu' || dayName === 'Fri' || dayName === 'Sat') {\n        workDaysHence = addD(today, 5);\n    } else {\n        workDaysHence = addD(today, 4);\n    }\n    return new Date(workDaysHence);\n}\nfunction diffInDays(earlier, later) {\n    var oneDay = 24 * 60 * 60 * 1000,\n        // hours*minutes*seconds*milliseconds\n    firstDate = parse(earlier),\n        secondDate = parse(later);\n    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay));\n}\n// utility functions\nfunction numberWithCommas(x) {\n    return x.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, \",\");\n}\nfunction randomKey(data) {\n    return data.length === undefined ? Object.keys(qData)[Math.floor(Math.random() * Object.keys(data).length)] : data[Math.floor(Math.random() * data.length)];\n}\n\n//******************************************\n// page runtime\n//******************************************\n\n//console.log('page.js');\n\n//******************************************\n// onload\n//******************************************\n\nwindow.onload = function () {\n    // examples initialisation\n    var today = new Date();\n\n    new dsq('#eg0');\n    new dsq('#eg1', {\n        pattern: 'dx mmm yyyy'\n    });\n    new dsq('#eg2', {\n        pattern: 'wwww, dx mmmm yyyy'\n    });\n    new dsq('#eg03', {\n        initial: '4/12/2022' // e.g. Monday, 4th December 2022\n    });\n    new dsq('#eg3', {\n        start: new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()),\n        end: {\n            d: today.getDate(),\n            m: today.getMonth(), // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec\n            y: today.getFullYear() + 1\n        }\n    });\n    new dsq('#eg4', {\n        start: function start() {\n            // a simple function to calculate the date three days in the future excluding weekends\n            var today = new Date(),\n                dayName = today.toLocaleString('en-gb', { weekday: \"short\" }),\n                workDaysHence,\n                addD = function addDays(d, days) {\n                return new Date(d.valueOf()).setDate(new Date(d.valueOf()).getDate() + days);\n            };\n            if (dayName === 'Mon' || dayName === 'Tue') {\n                workDaysHence = addD(today, 3);\n            } else if (dayName === 'Wed' || dayName === 'Thu' || dayName === 'Fri' || dayName === 'Sat') {\n                workDaysHence = addD(today, 5);\n            } else {\n                workDaysHence = addD(today, 4);\n            }\n            return new Date(workDaysHence);\n        },\n        end: new Date(today.getFullYear(), today.getMonth() + 2, 1) // the first of the month following next\n    });\n    new dsq('#eg5', {\n        day: false,\n        pattern: 'mmm \\'yy'\n    });\n    new dsq('#eg6', {\n        day: false,\n        month: false,\n        pattern: 'yyyy'\n    });\n    new dsq('#eg7', {\n        // beginning of this month\n        start: new Date(today.getFullYear(), today.getMonth(), 1),\n        // end of this month\n        end: {\n            d: 32, // becomes => last of month\n            m: today.getMonth(), // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec\n            y: today.getFullYear()\n        }\n    });\n    var firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);\n    new dsq('#eg8', {\n        start: new Date(2000, 0, 1),\n        end: new Date(2020, 6, 10),\n        disabledDates: [\"wed\", // recurring days (\"mon\", \"tue\",..., \"sun\")\n        \"11/25\", // recurring dates (\"mm/dd\" n.b. 00/01 === January 1st)\n        new Date(2019, 0, 31), // single dates (Date objects)\n        //[new Date(2015,3,15), new Date(2017,3,15)], // date ranges ([Date object, Date object])\n        //[new Date(2010,11,25), new Date(2011,1,15)], // date ranges ([Date object, Date object])\n        [new Date(2008, 3, 15), new Date(2008, 4, 14)], // date ranges ([Date object, Date object])\n        //[new Date(2012,0,1), new Date(2012,11,31)], // date ranges ([Date object, Date object])\n        //[new Date(2010,0,1), new Date(2018,11,31)], // date ranges ([Date object, Date object])\n        //[new Date(2010,0,1), new Date(2018,11,25)], // date ranges ([Date object, Date object])\n        //[new Date(2010,0,31), new Date(2018,11,31)], // date ranges ([Date object, Date object])\n        //[new Date(2010,0,2), new Date(2011,11,30)], // date ranges ([Date object, Date object])\n        //[new Date(2000,0,1), new Date(2001,11,31)], // date ranges ([Date object, Date object])\n        //[new Date(2002,7,2), new Date(2003,9,22)], // date ranges ([Date object, Date object])\n        [new Date(2000, 7, 2), new Date(2003, 9, 22)], // date ranges ([Date object, Date object])\n        //[new Date(2000,7,2), new Date(2003,0,31)], // date ranges ([Date object, Date object])\n        [new Date(2001, 7, 2), new Date(2003, 0, 31)], // date ranges ([Date object, Date object])\n        //[new Date(2017,7,2), new Date(2017,7,31)], // date ranges ([Date object, Date object])\n        [new Date(2010, 0, 1), new Date(2013, 0, 14)], // date ranges ([Date object, Date object])\n        //[new Date(2016,6,1), new Date(2018,0,14)], // date ranges ([Date object, Date object])\n        [new Date(2014, 6, 1), new Date(2016, 2, 14)], // date ranges ([Date object, Date object])\n        2006, // whole years (1999, 2000,..., 2999)\n        5]\n    });\n    new dsq('#eg9', {\n        start: new Date(2020, 0, 1),\n        end: new Date(2020, 3, 30)\n    });\n    new dsq('#eg10', {\n        primaryColour: 'hsla(340, 82%, 52%, 0.95)',\n        primaryTextColour: 'rgba(160, 12, 62, 1)',\n        textOnPrimaryColour: '#fbfffe'\n    });\n    //var egtest = \n    new dsq('#eg11');\n    //console.log('Date egtest: ', egtest.getValue('dd/mm/yy'));\n    //egtest.destroy();\n    new dsq('#eg12', {\n        activation: function activation() {\n            if (window.innerWidth > 1024) {\n                return true;\n            } else {\n                return false;\n            }\n        }\n    });\n    new dsq('#eg13', {\n        callback: function callback() {\n            alert('The date set is: ' + this.date);\n            console.log('Date set: ', this.date);\n            console.log('The input element: ', this.input);\n            console.log('The dateSquirrel wrapper: ', this.wrapper);\n            console.log('Date in human format: ', this.human);\n            console.log('Date in save format: ', this.save);\n        }\n    });\n    new dsq('#eg14', {\n        start: {\n            d: 1,\n            m: 10, // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec\n            y: 2029\n        },\n        end: {\n            d: 32,\n            m: 3, // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec\n            y: 2030\n        }\n    });\n    new dsq('#eg15', {\n        hideScrollbars: true\n    });\n    var dateA = new Date(),\n        boxA = new dsq('#eg16', {\n        start: today,\n        end: {\n            d: today.getDate(),\n            m: today.getMonth(),\n            y: today.getFullYear() + 3\n        },\n        callback: function callback() {\n            dateA = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + 1);\n            boxB.destroy();\n            boxB = new dsq('#eg17', {\n                start: dateA,\n                end: {\n                    d: today.getDate(),\n                    m: today.getMonth(),\n                    y: today.getFullYear() + 5\n                },\n                callback: function callback() {\n                    var difference = new Date(this.date - dateA);\n                    document.getElementById('eg17Output').innerHTML = \"That's \" + (difference.toISOString().slice(0, 4) - 1970) + \" years, \" + difference.getMonth() + \" months and \" + difference.getDate() + \" days\";\n                }\n            });\n            document.getElementById('eg17').disabled = false;\n        }\n    }),\n        boxB = new dsq('#eg17');\n\n    new dsq('#eg18', {\n        parse: {\n            active: true, // if true dateSquirrel will (after [parseDelay]ms) parse, format and rewrite a user given date\n            delay: 100, // the delay in ms before dateSquirrel will parse, format and rewrite a user given date\n            etype: 'change', // the type of event dateSquirrel will listen for before parsing >> https://developer.mozilla.org/en-US/docs/Web/Events\n            rule: 'dmy' // the expected order a user will input a date (default = day > month > year)\n        }\n    });\n    //window.uberTest = \n    new dsq('#eg19', {\n        overlay: true\n        //pattern: 'mmmm dx yyyy'\n    });\n    //uberTest.setValue('march 2nd 2010', 'mdy');\n    //console.log('Date set: ', uberTest.getValue())\n    document.querySelector('body.dateSquirrelled').classList.remove('loading');\n    document.querySelector('body.dateSquirrelled').classList.remove('loading-lg');\n};\n\n//# sourceURL=webpack://dsq/./src/assets/js/app.js?");

/***/ })

/******/ });
});