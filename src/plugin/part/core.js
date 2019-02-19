"use strict";

// --------------------------------------------------------
// dateSquirrel (dsq) 
// A date picker with a nutty tang
// https://github.com/tymothytym/dateSquirrel
// License MIT
// (c) tymothytym 2019
// --------------------------------------------------------

// --------------------------------------------------------
// Imports
// --------------------------------------------------------

// default settings
import defaults from './settings.js';


// --------------------------------------------------------
// dateSquirrel Class
// --------------------------------------------------------

class dsq {
	// create instance
	constructor(identifier, options) {
		// check identifier exists
		if (!identifier.nodeName) {
			this.o = document.querySelector(identifier);
			if (identifier == null) {
				throw 'dateSquirrel was unable to find the element(s)!';
			}
		} else {
			this.o = identifier;
		}

		// check dsq is on an <input>
		if (this.o.nodeName !== "INPUT") {
			throw 'dateSquirrel only works on <input>';
		}

		// polyfill for Element.closest --> https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
		if (!Element.prototype.matches) {
			Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
		}
		if (!Element.prototype.closest) {
			Element.prototype.closest = function (s) {
				let el = this;
				if (!document.documentElement.contains(el)) return null;
				do {
					if (el.matches(s)) return el;
					el = el.parentElement || el.parentNode;
				} while (el !== null && el.nodeType === 1);
				return null;
			};
		}
		// IE polyfill - for childNode.remove()
		// https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove#Polyfill
		// from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md
		(function (arr) {
			arr.forEach(function (item) {
				if (item.hasOwnProperty('remove')) {
					return;
				}
				Object.defineProperty(item, 'remove', {
					configurable: true,
					enumerable: true,
					writable: true,
					value: function remove() {
						if (this.parentNode !== null)
							this.parentNode.removeChild(this);
					}
				});
			});
		})([Element.prototype, CharacterData.prototype, DocumentType.prototype]);

		// Array.from()
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
		// Production steps of ECMA-262, Edition 6, 22.1.2.1
		if (!Array.from) {
		    Array.from = (function() {
		        var toStr = Object.prototype.toString;
		        var isCallable = function(fn) {
		            return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
		        };
		        var toInteger = function(value) {
		            var number = Number(value);
		            if (isNaN(number)) { return 0; }
		            if (number === 0 || !isFinite(number)) { return number; }
		            return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
		        };
		        var maxSafeInteger = Math.pow(2, 53) - 1;
		        var toLength = function(value) {
		            var len = toInteger(value);
		            return Math.min(Math.max(len, 0), maxSafeInteger);
		        };

		        // The length property of the from method is 1.
		        return function from(arrayLike /*, mapFn, thisArg */ ) {
		            // 1. Let C be the this value.
		            var C = this;

		            // 2. Let items be ToObject(arrayLike).
		            var items = Object(arrayLike);

		            // 3. ReturnIfAbrupt(items).
		            if (arrayLike == null) {
		                throw new TypeError('Array.from requires an array-like object - not null or undefined');
		            }

		            // 4. If mapfn is undefined, then let mapping be false.
		            var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
		            var T;
		            if (typeof mapFn !== 'undefined') {
		                // 5. else
		                // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
		                if (!isCallable(mapFn)) {
		                    throw new TypeError('Array.from: when provided, the second argument must be a function');
		                }

		                // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
		                if (arguments.length > 2) {
		                    T = arguments[2];
		                }
		            }

		            // 10. Let lenValue be Get(items, "length").
		            // 11. Let len be ToLength(lenValue).
		            var len = toLength(items.length);

		            // 13. If IsConstructor(C) is true, then
		            // 13. a. Let A be the result of calling the [[Construct]] internal method 
		            // of C with an argument list containing the single item len.
		            // 14. a. Else, Let A be ArrayCreate(len).
		            var A = isCallable(C) ? Object(new C(len)) : new Array(len);

		            // 16. Let k be 0.
		            var k = 0;
		            // 17. Repeat, while k < len… (also steps a - h)
		            var kValue;
		            while (k < len) {
		                kValue = items[k];
		                if (mapFn) {
		                    A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
		                } else {
		                    A[k] = kValue;
		                }
		                k += 1;
		            }
		            // 18. Let putStatus be Put(A, "length", len, true).
		            A.length = len;
		            // 20. Return A.
		            return A;
		        };
		    }());
		}
		// check to see if there is a max or min on the input
		if (this.o.hasAttribute('min')) {
			let min = this.o.getAttribute('min').split('-');
			defaults.start = new Date(min[0], (min[1] * 1) - 1, min[2]);
		}
		if (this.o.hasAttribute('max')) {
			let max = this.o.getAttribute('max').split('-');
			defaults.end = new Date(max[0], (max[1] * 1) - 1, max[2]);
		}

		// check for touch
		this.touch = false;
		window.addEventListener('touchstart', function onFirstTouch() {
		  	dsq.touchSet();
		  	window.removeEventListener('touchstart', onFirstTouch, false);
		}, false);

		// merge options & defaults
		this.options = this.extend(defaults, options || {});

		// create a new dateSquirrel instance
		this.uid = '_dsq__' + this.o.id;

		// check browser feature compatibility <-- Doesn't work in IE11?!
		//const features = 'querySelector' in document && 'addEventListener' in window && 'classList' in window.Element.prototype;

		// check activation criteria
		if (!('querySelector' in document)) { // stupid
			if (!('addEventListener' in window)) { // IE 11
				if (!('classList' in window)) { // bugs
					throw 'Browser doesn\'t meet the minimum dateSquirrel activation requirements';
				}
			}
		} else if (!this.options.activation.call(this)) {
			return;
		} else {
			// start
			this.init();
		}
	}
	// initialise instance
	init() {
		let instanceId = '#' + this.uid;

		// process options
		this.options.start = this.processUd(this.options.start);
		this.options.end = this.processUd(this.options.end);

		// add lists & sizes
		this.rowHeight = 40;
		this.listHeight = (6 * this.rowHeight) + (this.rowHeight / 2);

		// wrap input field
		this.wrap();

		// change to text field
		this.o.setAttribute('type', 'text');

		// scrollbar hide class
		if (this.options.hideScrollbars) {
			this.wrapper.classList.add(this.options.classPrefix + 'noscrl');
		}

		// specify activation
		this.isActive = true;

		// add lists
		this.makeLists();
	}
	// remove instance
	destroy() {
		// remove event listeners
		if (this.isActive) {
			let yearRows = this.lists.years.querySelectorAll('li') || false,
				monthRows = this.lists.months.querySelectorAll('li') || false,
				activeDays = this.lists.querySelectorAll('.dsq-list-days > li[data-day]') || false;
			if (!activeDays) {
				// reminders
				this.rmEvt(this.lists.querySelector('.dsq-reminder-month'), 'click', this.reminderFn, false);
				this.rmEvt(this.lists.querySelector('.dsq-reminder-year'), 'click', this.reminderFn, false);
				// days
				for (let i = 0; i < activeDays.length; i++) {
					this.rmEvt(activeDays[i], 'click', this.dayClickFn, false);
				}
			}
			if (!monthRows) {
				for (let i = 0; i < monthRows.length; i++) {
					this.rmEvt(monthRows[i], 'click', this.mthClickFn, false);
				}
			}
			if (!yearRows) {
				for (let i = 0; i < yearRows.length; i++) {
					this.rmEvt(yearRows[i], 'click', this.yrClickFn, false);
				}
			}
			// input
			this.rmEvt(this.o, 'blur', this.blurFn, false);
			this.rmEvt(this.o, 'focus', this.focFn, false);
			this.rmEvt(this.o, this.options.parse.etype, this.eventFn, false);

			// html
			this.rmEvt(document.documentElement, 'click', this.htmlClickFn, false);

			// dataset
			this.o.removeAttribute('data-dsq-date');

			// reset to date
			this.o.setAttribute('type', 'date');

			// remove dsq wrapper
			this.unwrap();

			// remove data
			this.removeData(this);

			// delete callback & options
			delete this.options.callback;
			delete this.options;
		}
	}
	// construction functions
	makeLists() {
		// same year?
		if (this.options.end.y === this.options.start.y) {
			this.hasYear = false;
			this.selectedYear = this.options.start.y;
			// same month?
			if (this.options.end.m === this.options.start.m && this.options.end.y === this.options.start.y) {
				this.hasMonth = false;
				this.selectedMonth = this.options.start.m;
			} else {
				this.hasMonth = true;
			}
		} else {
			this.hasYear = true;
			this.hasMonth = true;
			this.selectedYear = false;
			this.selectedMonth = false;
		}
		// empty previous lists
		this.lists.querySelector('.dsq-list-years').innerHTML = '';
		this.lists.querySelector('.dsq-list-months').innerHTML = '';

		// check disabled dates
		this.disDates = [];
		if (this.options.disabledDates) {
			this.disDates.days = [];
			this.disDates.months = [];
			this.disDates.years = [];
			this.disDates.recurringDays = [];
			this.disDates.recurringDates = [];
			for (let item in this.options.disabledDates) {
				if (typeof this.options.disabledDates[item] === 'string') {
					if (/^\w{3}$/.test(this.options.disabledDates[item])) { // recurring days
						this.disDates.recurringDays.push(this.options.disabledDates[item].toLowerCase());
					} else { // recurring dates
						this.disDates.recurringDates.push(this.options.disabledDates[item]);
						for (let x = this.options.start.getFullYear(); x < this.options.end.getFullYear(); x++) {
							this.disDates.days.push(x + '/' + this.options.disabledDates[item]);
						}
						// add day in last year if needed
						if (this.options.end.getTime() >= new Date(this.options.end.getFullYear() + '/' + this.options.disabledDates[item]).getTime()) {
							this.disDates.days.push(this.options.end.getFullYear() + '/' + this.options.disabledDates[item]);
						}
					}
				} else if (this.options.disabledDates[item] instanceof Date) {
					// range of dates
					this.disDates.days.push(this.options.disabledDates[item].getFullYear() + '/' + this.options.disabledDates[item].getMonth() + '/' + this.options.disabledDates[item].getDate());
				} else if (typeof this.options.disabledDates[item] === 'object') {
					// range of dates
					let range = this.tagDisabled(this.options.disabledDates[item][0], this.options.disabledDates[item][1]);
					this.disDates.days.push(...range.days);
					this.disDates.months.push(...range.months);
					this.disDates.years.push(...range.years);

				} else if (typeof this.options.disabledDates[item] === 'number') {
					// range of dates
					if (this.options.disabledDates[item].toString().length > 2) { // year
						this.disDates.years.push(this.options.disabledDates[item]);
					} else { // month
						for (let x = this.options.start.getFullYear(); x < this.options.end.getFullYear(); x++) {
							this.disDates.months.push(x + '/' + this.options.disabledDates[item]);
						}
						// add month in last year if needed
						if (this.options.end.getTime() >= new Date(this.options.end.getFullYear(), this.options.disabledDates[item], 1).getTime()) {
							this.disDates.months.push(this.options.end.getFullYear() + '/' + this.options.disabledDates[item]);
						}
					}
				} else {
					// not accepted input
					/* eslint-disable no-console */
					console.error('Format "' + this.options.disabledDates[item] + '" in dsq.options.disabledDates not recognised');
					/* eslint-enable no-console */
				}
			}
			// convert arrays to sets of unique entries
			this.disDates.days = new Set(this.uniqBy(this.disDates.days, JSON.stringify));
			this.disDates.months = new Set(this.uniqBy(this.disDates.months, JSON.stringify));
			this.disDates.years = new Set(this.uniqBy(this.disDates.years, JSON.stringify));
			this.disDates.recurringDays = new Set(this.uniqBy(this.disDates.recurringDays, JSON.stringify));
			this.disDates.recurringDates = new Set(this.uniqBy(this.disDates.recurringDates, JSON.stringify));
			//console.log('this.disDates.years: ', this.disDates.years);
		} else {
			this.disDates.days = false;
			this.disDates.months = false;
			this.disDates.years = false;
			this.disDates.recurringDays = false;
			this.disDates.recurringDates = false;
		}
		// generate month & year lists
		if (this.hasYear) {
			for (let y = this.options.start.y; y < this.options.end.y + 1; y++) {
				let cl = document.createElement('li');
				if (this.disDates.years !== false && this.disDates.years.has(y)) {
					cl.className = this.options.classPrefix + 'disabled';
				}
				cl.id = `${this.uid}_y_${y}`;
				cl.dataset.year = y;
				cl.tabIndex = -1;
				cl.setAttribute('role', 'option');
				cl.innerHTML = `${y}`;
				this.lists.years.insertBefore(cl, this.lists.years.firstChild);
			}
		} else {
			this.lists.years.insertAdjacentHTML('afterbegin', '<li id="' + this.uid + '_y_0" class="' + this.options.classPrefix + 'active" data-year="' + this.options.start.y + '" tabindex="-1" role="option">' + this.options.start.y + '</li>');
		}
		if (this.hasMonth) {
			for (let m = 0; m < 12; m++) {
				this.lists.months.insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_m_' + m + '" data-month="' + m + '" tabindex="-1" role="option">' + this.options.monthList[m] + '</li>');
			}
		} else {
			this.lists.months.insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_m_0" class="' + this.options.classPrefix + 'active" data-month="' + dsq.format(this.options.start, 'mmm') + '" tabindex="-1" role="option">' + dsq.format(this.options.start, 'mmm') + '</li>');
			// generate days early
			this.addDays();
		}

		// check for overlay request
		if (this.options.overlay) {
			this.lists.classList.add(this.options.classPrefix + 'overlay');
		}

		// add listeners
		let yearRows = this.lists.years.querySelectorAll('li'),
			monthRows = this.lists.months.querySelectorAll('li'),
			that = this;
		this.focFn = {
			handleEvent: function () {
				//suppress mobile keyboard
				if (that.wrapper.classList.contains('dsq-touch')) {
					that.o.setAttribute('readonly', 'readonly');
				}

				// if not open... open!
				if (!that.wrapper.classList.contains(that.options.classPrefix + 'active')) {
					that.wrapper.classList.add(that.options.classPrefix + 'active');
					if (!that.hasYear && that.hasMonth) {
						that.lists.classList.add(that.options.classPrefix + 'month');
						// check months
						if (monthRows.length === 12 && yearRows.length === 1) {
							that.checkMonths();
						}
					} else if (!that.hasYear && !that.hasMonth) {
						that.lists.classList.add(that.options.classPrefix + 'month', that.options.classPrefix + 'day');
					}
				}
				
				// add window event to watch hardware keyboard
				that.addEvt(window, 'keydown', that.keydownFn, false);
				// ...and to shut
				that.addEvt(document.documentElement, 'click', that.htmlClickFn, false);

			}
		};
		this.blurFn = {
			handleEvent: function () {
				// un-suppress mobile keyboard
				if (that.wrapper.classList.contains('dsq-touch')) {
					that.o.removeAttribute('readonly');
				}
				that.clearFocus();
			}
		};
		this.yrClickFn = {
			handleEvent: function (e) {

				if (!e.target.classList.contains(that.options.classPrefix + 'disabled')) {
					e.stopPropagation();
					// clear saved date as must be starting again
					that.clearStored();
					// remove previous selection indicator
					let yearRows = that.lists.years.querySelectorAll('li'),
						monthRows = that.lists.months.querySelectorAll('li')
					for (let i = 0; i < yearRows.length; i++) {
						yearRows[i].classList.remove(that.options.classPrefix + 'active');
					}
					for (let j = 0; j < monthRows.length; j++) {
						monthRows[j].classList.remove(that.options.classPrefix + 'active');
					}
					// make e.target active
					e.target.classList.add(that.options.classPrefix + 'active');
					that.selectedYear = e.target.getAttribute('data-year') * 1;
					that.o.value = that.selectedYear;
					// animate if reselecting
					if (that.lists.classList.contains(that.options.classPrefix + 'month') && !that.lists.classList.contains(that.options.classPrefix + 'day')) {
						that.lists.months.classList.add(that.options.classPrefix + 'switch');
						setTimeout(function () {
							that.lists.months.classList.remove(that.options.classPrefix + 'switch');
						}, 300);
					}

					if (that.options.month) {
						that.lists.classList.add(that.options.classPrefix + 'month');
						// check months
						that.checkMonths();
					} else {
						// finished dating section
						that.finishUp();
					}
					that.clearFocus();
					e.target.blur();
				}

			}
		};
		this.mthClickFn = {
			handleEvent: function (e) {
				if (!e.target.classList.contains(that.options.classPrefix + 'disabled')) {
					e.stopPropagation();
					// clear previous data
					that.clearStored();
					let monthRows = that.lists.months.querySelectorAll('li');
					for (let i = 0; i < monthRows.length; i++) {
						monthRows[i].classList.remove(that.options.classPrefix + 'active');
					}
					e.target.classList.add(that.options.classPrefix + 'active');
					that.selectedMonth = e.target.getAttribute('data-month') * 1;
					if (that.options.day) {
						that.o.value = that.options.monthList[that.selectedMonth] + ' ' + that.selectedYear;
						that.o.classList.remove(that.options.classPrefix + 'active');
						that.lists.classList.add(that.options.classPrefix + 'day');
						that.addDays();
					} else {
						// finished dating section
						that.finishUp();
					}
					that.clearFocus();
				}
			}
		};
		this.htmlClickFn = {
			handleEvent: function (e) {
				if (e.target.closest('.dsq') !== that.wrapper) {
					// remove keyboard listener from window
					that.rmEvt(window, 'keydown', that.keydownFn, false);
					// clear any focus 
					that.clearFocus();
					if (that.wrapper.classList.contains(that.options.classPrefix + 'active')) {
						// remove active class
						that.removeActive(300);

						// remove this listener
						that.rmEvt(document.documentElement, 'click', that.htmlClickFn, false);
					}
				}
			}
		};
		this.keydownFn = {
			handleEvent: function (e) {
				// up === 38
				// left === 37
				// right === 39
				// down === 40
				// return === 13
				// space === 32
				// tab === 9
				// backspace === 8
				let blocks,
					unit,
					unitId;

				// which list is active
				if (that.lists.classList.contains(that.options.classPrefix + 'day')) {
					unit = that.lists.days;
					unitId = 2;
					// active blocks (days)
					blocks = unit.querySelectorAll('li[data-day]:not(.' + that.options.classPrefix + 'disabled):not(.' + that.options.classPrefix + 'padding)');
					that.lists.months.removeAttribute('aria-activedescendant');
					that.lists.years.removeAttribute('aria-activedescendant');
				} else if (that.lists.classList.contains(that.options.classPrefix + 'month')) {
					unit = that.lists.months;
					unitId = 1;
					// active blocks (months)
					blocks = unit.querySelectorAll('li:not(.' + that.options.classPrefix + 'disabled)');
					that.lists.days.removeAttribute('aria-activedescendant');
					that.lists.years.removeAttribute('aria-activedescendant');
				} else {
					unit = that.lists.years;
					unitId = 0;
					// active blocks (years)
					blocks = unit.querySelectorAll('li:not(.' + that.options.classPrefix + 'disabled)');
					that.lists.days.removeAttribute('aria-activedescendant');
					that.lists.months.removeAttribute('aria-activedescendant');
				}

				// find any existing focus
				let blockOn = that.findFocus(blocks),
					refocus = true;

				// check user is not typing a date
				if (document.activeElement.id !== that.o.id) {

					// key action modification
					switch (e.which) {
						case 40: {
							e.preventDefault();
							if (blockOn !== blocks.length - 1) {
								if (unitId !== 2) {
									blockOn++;
								} else {
									let disCheck = 0;
									const step = that.lists.days.querySelectorAll('li:not(.' + that.options.classPrefix + 'dow-header):not(.' + that.options.classPrefix + 'padding)'),
										endStep = step.length < blockOn + 7 ? step.length : blockOn + 7;
									for (let i = blockOn; i < endStep; i++) {
										if (step[i].classList.contains(that.options.classPrefix + 'disabled')) {
											disCheck++;
										}
									}
									blockOn = blockOn + 7 - disCheck < blocks.length - 1 ? blockOn + 7 - disCheck : blocks.length - 1;
								}
							}
							break;
						}
						case 39: {
							e.preventDefault();
							if (blockOn !== blocks.length - 1 && unitId === 2) blockOn++;
							break;
						}
						case 38: { // up
							e.preventDefault();
							if (blockOn !== 0) {
								if (unitId !== 2) {
									blockOn--;
								} else {
									let disCheck = 0;
									const step = that.lists.days.querySelectorAll('li:not(.' + that.options.classPrefix + 'dow-header):not(.' + that.options.classPrefix + 'padding)'),
										endStep = 0 > blockOn - 7 ? 0 : blockOn - 7;
									for (let j = blockOn; j > endStep; j--) {
										if (step[j].classList.contains(that.options.classPrefix + 'disabled')) {
											disCheck++;
										}
									}
									blockOn = blockOn - 7 + disCheck > -1 ? blockOn - 7 + disCheck : 0;
								}
							} else {
								// back to input
								that.o.focus();
								that.o.select();
								refocus = false;
							}
							break;
						}
						case 37: { // left
							e.preventDefault();
							if (blockOn !== 0 && unitId === 2) {
								blockOn--;
							} else if (unitId === 1 && that.hasYear) {
								that.goToYear();
								let lastActive = that.lists.years.querySelector('.' + that.options.classPrefix + 'active');
								that.lists.years.setAttribute('aria-activedescendant', lastActive.id);
								that.setFocus(lastActive);
							}
							break;
						}
						case 13: {
							e.preventDefault();
							e.target.click();
							that.clearFocus(); // clear all focus
							
							break;
						}
						case 9: {
							that.removeActive(0);
							// remove keyboard listener from window
							that.rmEvt(window, 'keydown', that.keydownFn, false);
							// parse
							if (that.options.parse.active) {
								that.setValue(that.o.value, that.options.parse.rule);
							}
							break;
						}
						case 8: {
							document.body.click();
							break;
						}
						default: {
							// go on merry way
						}
					}
					if (e.which >= 37 && e.which <= 40 && refocus) {
						// set parent to active
						unit.setAttribute('aria-activedescendant', blocks[blockOn].id);
						// focus block
						that.setFocus(blocks[blockOn]);
					}
				} else {
					if (e.which === 8) { // backspace
						// clear previous data
						that.clearStored();
					} else if (e.which === 13) { // return
						e.preventDefault();
						e.target.click();
						that.clearFocus(); // clear all focus
						// close list
						if (that.wrapper.classList.contains(that.options.classPrefix + 'active')) {
							that.wrapper.classList.remove(that.options.classPrefix + 'active');
						}
						if (that.options.parse.active) {
							that.setValue(that.o.value, that.options.parse.rule);
						}
					} else if (e.which === 9) { // tab
						// close list
						that.removeActive(300);
						// remove keyboard listener from window
						that.rmEvt(window, 'keydown', that.keydownFn, false);
						// parse
						if (that.options.parse.active) {
							that.setValue(that.o.value, that.options.parse.rule);
						}
					} else if (e.which === 40) { // down
						e.preventDefault();

						// set parent to active
						unit.setAttribute('aria-activedescendant', blocks[blockOn].id);
						// focus block
						that.setFocus(blocks[blockOn]);
					}
				}
			}
		};
		let delay = (function(){
		  	let timer = 0;
		  	return function(callback, ms){
		    	clearTimeout (timer);
		    	timer = setTimeout(callback, ms);
		  	};
		})();
		this.eventFn = {
			handleEvent: function (e) {
				delay(function() {
					if (!that.wrapper.classList.contains(that.options.classPrefix + 'active')) {
						if (dsq.isValidDate(that.parseDateString(e.target.value, that.options.parse.rule))) {
							that.setValue(e.target.value, that.options.parse.rule);
						} else {
							that.clearStored();
							that.makeCallback();
						}
			    	}
			    }, that.options.parse.delay);
			}
		};
		// year select
		if (this.hasYear) {
			for (let i = 0; i < yearRows.length; i++) {
				this.addEvt(yearRows[i], 'click', this.yrClickFn, false);
			}
		} else {
			yearRows[0].classList.add(this.options.classPrefix + 'noh');
		}

		// month select
		if (this.hasMonth) {
			for (let i = 0; i < monthRows.length; i++) {
				this.addEvt(monthRows[i], 'click', this.mthClickFn, false);
			}
		} else {
			monthRows[0].classList.add(this.options.classPrefix + 'noh');
		}

		//focus event
		this.addEvt(this.o, 'focus', this.focFn, false);
		this.addEvt(this.o, 'blur', this.blurFn, false);
		if (!this.wrapper.classList.contains('dsq-touch') && this.options.parse.active) {
			this.addEvt(this.o, this.options.parse.etype, this.eventFn, false);
		}

		// set initial date
		if (this.options.initial !== false) {
			this.finishUp(this.options.initial, this.options.parse.rule);
		}
	}
	findFocus(blocks) {
		for (let i = 0; i < blocks.length; i++) {
			if (blocks[i] === document.activeElement) {
				return i;
			}
		}
		return 0;
	}
	setFocus(el, startNext) {
		this.clearFocus();
		if (el !== undefined) {
			// remove aria
			el.parentElement.removeAttribute('aria-activedescendant');

			// add new focus
			el.focus();
			el.classList.add(this.options.classPrefix + 'focused');
			el.parentElement.setAttribute('aria-activedescendant', el.id);
		}
		if (startNext !== undefined) {
			startNext.childNodes[0].focus();
		}
	}
	clearStored() {
		this.o.removeAttribute('data-dsq-date');
		this.setDate = undefined;
	}
	clearFocus() {
		// clear all
		const listOn = [this.lists.years, this.lists.months, this.lists.days];
		for (let l = 0; l < listOn.length; l++) {
			listOn[l].removeAttribute('aria-activedescendant');
			let focustedLi = listOn[l].querySelectorAll('.' + this.options.classPrefix + 'focused');
			for (let x = 0; x < focustedLi.length; x++) {
				focustedLi[x].classList.remove(this.options.classPrefix + 'focused');
				focustedLi[x].blur();
			}
		}
	}
	removeActive(duration) {
		this.wrapper.classList.add(this.options.classPrefix + 'closing');
		this.wrapper.classList.remove(this.options.classPrefix + 'active');
		setTimeout(() => {
			this.wrapper.classList.remove(this.options.classPrefix + 'closing');
		}, duration);
	}
	checkMonths() {
		if (this.lists.classList.contains(this.options.classPrefix + 'month') && !this.lists.classList.contains(this.options.classPrefix + 'day')) {
			let firstActive = false;
			for (let m = 0; m < 12; m++) {
				let daysInCurrentMonth = dsq.daysInMonth(this.selectedYear, m);
				if ((dsq.isBetweenDates(new Date(this.selectedYear, m, 1), this.options.start, this.options.end) || dsq.isBetweenDates(new Date(this.selectedYear, m, daysInCurrentMonth), this.options.start, this.options.end)) && (this.disDates.months === false || !this.disDates.months.has(this.selectedYear + '/' + m))) {
					this.lists.querySelectorAll('.dsq-list-months li')[m].classList.remove(this.options.classPrefix + 'disabled');
					this.lists.querySelectorAll('.dsq-list-months li')[m].setAttribute('tabindex', '-1');
					if (firstActive === false) {
						firstActive = m * this.rowHeight;
					}
				} else {
					this.lists.querySelectorAll('.dsq-list-months li')[m].classList.add(this.options.classPrefix + 'disabled');
					this.lists.querySelectorAll('.dsq-list-months li')[m].setAttribute('tabindex', '-1');
				}
			}
			this.lists.months.scrollTop = firstActive;
		}
	}
	addDays() {
		let numberOfDays = dsq.daysInMonth(this.selectedYear, this.selectedMonth),
			daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
			firstOfMonth;

		this.reminder.innerHTML = '<span class="' + this.options.classPrefix + 'reminder-month">' + this.options.monthList[this.selectedMonth] + '</span>&nbsp;<span class="' + this.options.classPrefix + 'reminder-year">' + this.selectedYear + '</span>';

		this.lists.days.innerHTML = '<li class="' + this.options.classPrefix + 'dow-header">Mon</li><li class="' + this.options.classPrefix + 'dow-header">Tue</li><li class="' + this.options.classPrefix + 'dow-header">Wed</li><li class="' + this.options.classPrefix + 'dow-header">Thu</li><li class="' + this.options.classPrefix + 'dow-header">Fri</li><li class="' + this.options.classPrefix + 'dow-header">Sat</li><li class="' + this.options.classPrefix + 'dow-header">Sun</li>';
		firstOfMonth = new Date(this.selectedYear, this.selectedMonth, 1).getDay() === 0 ? 6 : new Date(this.selectedYear, this.selectedMonth, 1).getDay() - 1;
		// set container size & 1st of month
		for (let f = 0; f < firstOfMonth; f++) {
			this.lists.days.insertAdjacentHTML('beforeend', '<li data-day class="' + this.options.classPrefix + 'padding"></li>');
		}
		for (let d = 1; d < numberOfDays + 1; d++) {
			let theDay = daysOfWeek[new Date(this.selectedYear, this.selectedMonth, d).getDay()];
			if (dsq.isBetweenDates(new Date(this.selectedYear, this.selectedMonth, d), this.options.start, this.options.end) && (this.disDates.days === false || (!this.disDates.days.has(this.selectedYear + '/' + this.selectedMonth + '/' + d) && !this.disDates.recurringDays.has(theDay) && !this.disDates.recurringDates.has(this.selectedYear + '/' + this.selectedMonth + '/' + d)))) {
				this.lists.days.insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_d_' + d + '" data-day="' + d + '" tabindex="-1" role="option">' + d + '</li>');
			} else {
				this.lists.days.insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_d_' + d + '" class="' + this.options.classPrefix + 'disabled" data-day="' + d + '" tabindex="-1" role="option">' + d + '</li>');
			}
			if (dsq.isSameDay(new Date(), new Date(this.selectedYear, this.selectedMonth, d)) && this.options.markToday) {
				this.lists.days.querySelector('li[data-day="' + d + '"]').classList.add(this.options.classPrefix + 'today');
			}
		}
		// day select
		let activeDays = this.lists.days.querySelectorAll('li[data-day]'),
			that = this;
		this.dayClickFn = {
			handleEvent: function (e) {
				e.stopPropagation();
				if (!e.target.classList.contains(that.options.classPrefix + 'disabled') && !e.target.classList.contains(that.options.classPrefix + 'padding')) {
					that.selectedDay = e.target.getAttribute('data-day') * 1;
					that.finishUp();

					// reset
					that.setFocus(e.target);
				}

			}
		};
		this.reminderFn = {
			handleEvent: function (e) {
				e.stopPropagation();
				that.lists.classList.add(that.options.classPrefix + 'out');
				setTimeout(function () {
					that.lists.classList.remove(that.options.classPrefix + 'out');
				}, 200);
				that.lists.classList.remove(that.options.classPrefix + 'day');
			}
		};
		// add day click event
		for (let i = 0; i < activeDays.length; i++) {
			this.addEvt(activeDays[i], 'click', this.dayClickFn, false);
		}
		if (this.hasYear || this.hasMonth) {
			this.addEvt(this.reminder, 'click', this.reminderFn, false);
		} else {
			this.reminder.classList.add(this.options.classPrefix + 'noh');
		}
	}
	goToYear() {
		this.lists.classList.remove(this.options.classPrefix + 'day');
		this.lists.classList.remove(this.options.classPrefix + 'month');
		this.lists.months.removeAttribute('aria-activedescendant');
	}
	finishUp(makeDate, zoneOrder) {
		const delay = 300; // ms
		if (makeDate === undefined) {
			if (typeof this.selectedDay === 'undefined') {
				// month only
				this.selectedDay = 1;
			}
			if (typeof this.selectedMonth === 'undefined') {
				// year only
				this.selectedMonth = 1;
			}
			this.setDate = new Date(this.selectedYear, this.selectedMonth, this.selectedDay);
		} else {
			if (dsq.isValidDate(this.parseDateString(makeDate, zoneOrder))) {
				this.setDate = this.parseDateString(makeDate, zoneOrder);
				this.selectedYear = this.setDate.getFullYear();
				this.selectedMonth = this.setDate.getMonth();
				this.selectedDay = this.setDate.getDate();
			} else {
				// date can't be parsed
				return false;
			}
		}
		// format output & associate
		this.setDate.save = dsq.format(this.setDate, this.options.patternSave);
		this.setDate.human = dsq.format(this.setDate, this.options.pattern);
		// input & attribute values
		// user
		this.o.value = this.setDate.human;
		// data-dsq-date
		this.o.setAttribute('data-dsq-date', this.setDate.save);
		// update UI
		if (makeDate === undefined) {
			// set status to done
			this.wrapper.classList.add(this.options.classPrefix + 'done');
			this.removeActive(delay);
			// remove listener
			this.rmEvt(document.documentElement, 'click', this.htmlClickFn, false);
			setTimeout(() => {
				// make callback
				this.makeCallback();
				// remove done indicator
				this.wrapper.classList.remove(this.options.classPrefix + 'done');
				// remove stage indicator class(es)
				this.lists.classList.remove(this.options.classPrefix + 'day', this.options.classPrefix + 'month');
			}, delay);
		} else {
			// close UI and blur
			if (this.wrapper.classList.contains(this.options.classPrefix + 'active')) {
				this.wrapper.classList.remove(this.options.classPrefix + 'active');
			}

			// make callback
			this.makeCallback();
		}
	}
	// event functions
	makeCallback() {
		let callback = undefined,
			args = {
				date: this.setDate ? this.setDate : undefined,
				input: this.o,
				wrapper: this.wrapper,
				human: this.setDate ? this.setDate.human : undefined,
				save: this.setDate ? this.setDate.save : undefined
			};
		callback = this.options.callback.call(args);

		if (typeof this.options.callback === 'function') {
			callback;
		} else {
			/* eslint-disable no-console */
			console.error('dateSquirrel: Supplied callback is not a function');
			/* eslint-enable no-console */
		}
	}

	// utility functions
	// DOM checks
	/*wouldBeInView(el, retDir) {
		retDir = retDir || false;
		let rect = el.parentElement.getBoundingClientRect(),
			viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight),
			above = rect.top < 100,
			below = this.listHeight + rect.top - viewHeight >= 0;
		if (!above && !below) {
			return true;
		} else if (retDir && above) {
			return 'above';
		} else if (retDir && below) {
			return 'below';
		} else {
			return false;
		}
	}*/
	removeData(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	}
	addEvt(el, evt, fn, bubble) {
		if ('addEventListener' in el) {
			// BBOS6 doesn't support handleEvent, catch and polyfill
			try {
				el.addEventListener(evt, fn, bubble);
			} catch (e) {
				if (typeof fn === 'object' && fn.handleEvent) {
					el.addEventListener(evt, function (e) {
						// Bind fn as this and set first arg as event object
						fn.handleEvent.call(fn, e);
					}, bubble);
				} else {
					throw e;
				}
			}
		} else if ('attachEvent' in el) {
			// check if the callback is an object and contains handleEvent
			if (typeof fn === 'object' && fn.handleEvent) {
				el.attachEvent('on' + evt, function () {
					// Bind fn as this
					fn.handleEvent.call(fn);
				});
			} else {
				el.attachEvent('on' + evt, fn);
			}
		}
	}
	rmEvt(el, evt, fn, bubble) {
		if ('removeEventListener' in el) {
			// BBOS6 doesn't support handleEvent, catch and polyfill
			try {
				el.removeEventListener(evt, fn, bubble);
			} catch (e) {
				if (typeof fn === 'object' && fn.handleEvent) {
					el.removeEventListener(evt, function (e) {
						// Bind fn as this and set first arg as event object
						fn.handleEvent.call(fn, e);
					}, bubble);
				} else {
					throw e;
				}
			}
		} else if ('detachEvent' in el) {
			// check if the callback is an object and contains handleEvent
			if (typeof fn === 'object' && fn.handleEvent) {
				el.detachEvent("on" + evt, function () {
					// Bind fn as this
					fn.handleEvent.call(fn);
				});
			} else {
				el.detachEvent('on' + evt, fn);
			}
		}
	}
	// wrap in HTML
	wrap() {
		// wrapper
		this.lists = document.createElement('div');
		this.lists.className = `${this.options.classPrefix}lists`;
		this.reminder = this.lists.querySelector('.' + this.options.classPrefix + 'reminder');
		this.lists.dayWrap = this.lists.querySelector('.' + this.options.classPrefix + 'days');
		this.lists.days = this.lists.querySelector('.' + this.options.classPrefix + 'days .' + this.options.classPrefix + 'list-days');
		// day list
		this.lists.dayWrap = document.createElement('div');
		this.lists.dayWrap.className = `${this.options.classPrefix}days`;
		this.lists.days = document.createElement('ul');
		this.lists.days.className = `${this.options.classPrefix}list-days`;
		this.lists.days.role = `listbox`;
		this.lists.daySide = document.createElement('span');
		this.lists.daySide.className = `${this.options.classPrefix}side`;
		// reminder
		this.reminder = document.createElement('a');
		this.reminder.className = `${this.options.classPrefix}reminder`;
		// month list
		this.lists.months = document.createElement('ul');
		this.lists.months.className = `${this.options.classPrefix}list-months`;
		this.lists.months.role = `listbox`;
		// year list
		this.lists.years = document.createElement('ul');
		this.lists.years.className = `${this.options.classPrefix}list-years`;
		this.lists.years.role = `listbox`;
		// outer wrapper
		this.wrapper = document.createElement('div');
		this.wrapper.className = 'dsq';
		this.wrapper.id = this.uid;
		this.o.parentNode.insertBefore(this.wrapper, this.o.nextSibling);
		// merge
		this.lists.daySide.appendChild(this.reminder);
		this.lists.dayWrap.appendChild(this.lists.daySide);
		this.lists.dayWrap.appendChild(this.lists.days);
		this.lists.appendChild(this.lists.years);
		this.lists.appendChild(this.lists.months);
		this.lists.appendChild(this.lists.dayWrap);
		this.wrapper.appendChild(this.o);
		this.wrapper.appendChild(this.lists);
	}
	unwrap() {
		// remove lists
		this.lists.remove();
		// move input
		this.wrapper.parentNode.insertBefore(this.o, this.wrapper);
		// remove wrapper
		this.wrapper.remove();
	}
	extend() {
		// from https://www.gomakethings.com/merging-objects-with-vanilla-javascript/
		// Variables
		let extended = {},
			deep = false,
			i = 0,
			length = arguments.length;
		// Check if a deep merge
		if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
			deep = arguments[0];
			i++;
		}
		// Merge the object into the extended object
		let merge = function (obj) {
			for (var prop in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, prop)) {
					// If deep merge and property is an object, merge properties
					if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
						extended[prop] = this.extend(true, extended[prop], obj[prop]);
					} else {
						extended[prop] = obj[prop];
					}
				}
			}
		};
		// Loop through each object and conduct a merge
		for (; i < length; i++) {
			let obj = arguments[i];
			merge(obj);
		}
		return extended;
	}
	isFunction(obj) {
		return !!(obj && obj.constructor && obj.call && obj.apply);
	}
	// date functions
	processUd(obj) {
		if (this.isFunction(obj)) {
			obj = obj();
		} else if (!(obj instanceof Date)) {
			if (12 <= obj.m) {
				obj.m = 11;
			}
			let numDays = dsq.daysInMonth(obj.y, obj.m);
			if (numDays < obj.d) {
				obj.d = numDays;
			}
			obj = new Date(obj.y, obj.m, obj.d);
		}
		obj.y = obj.getFullYear();
		obj.m = obj.getMonth();
		obj.d = obj.getDate();
		return obj;
	}
	// merge array [!!mutates original array!!]
	uniqBy(a, key) {
		let seen = new Set();
		return a.filter(item => {
			let k = key(item);
			return seen.has(k) ? false : seen.add(k);
		});
	}
	tagDisabled(startDate, endDate) {
		let fnStart = new Date(startDate),
			fnEnd = new Date(endDate),
			difference = dsq.countMonths(fnStart, fnEnd, true),
			fnDates = [],
			thirdYear = new Date(fnStart.getFullYear() + 1, 11, 31);
		// calculate 1st disabled year
		if (fnStart.getDate() === 1 && fnStart.getMonth() === 0 && difference > 11) {
			fnDates.years = [fnStart.getFullYear()];
		} else if (thirdYear.getTime() <= fnEnd.getTime()) {
			//add a year
			fnDates.years = [fnStart.getFullYear() + 1];
		} else {
			fnDates.years = false;
		}
		// add remaining disabled years
		if (difference / 24 >= 1) {
			for (let i = 0; i <= (dsq.countMonths(new Date(fnDates.years[0], 11, 31), fnEnd, true) / 12) - 1; i++) {
				fnDates.years.push(fnDates.years[i] + 1);
			}
		}

		// calculate 1st disabled month(s) (before or after any years) 
		if (difference >= 1) { // at least one whole month difference
			if (fnDates.years[0] !== fnStart.getFullYear()) { // 1st year not already disabled
				if (fnStart.getDate() === 1) { // 1st of the month
					fnDates.months = [fnStart.getFullYear() + '/' + fnStart.getMonth()]; // the first month
				} else {
					if (fnStart.getMonth() + 1 <= 11 && new Date(fnStart.getFullYear(), fnStart.getMonth() + 1, 31).getTime() <= fnEnd.getTime()) { // added month in same year && within range
						fnDates.months = [fnStart.getFullYear() + '/' + (fnStart.getMonth() + 1)]; // the next month
					} else if (fnDates.years === false && new Date(fnStart.getFullYear() + 1, 0, 31).getTime() <= fnEnd.getTime()) { // no disabled years && within range
						fnDates.months = [fnStart.getFullYear() + 1 + '/0']; // next January 
					} else if (fnDates.years !== false && new Date(fnDates.years[fnDates.years.length - 1] + 1, 0, 31).getTime() <= fnEnd.getTime()) { // has disabled years && within range
						fnDates.months = [fnDates.years[fnDates.years.length - 1] + 1 + '/0']; // first non-disabled January
					} else {
						fnDates.months = false;
					}
				}
			} else { // 1st year disabled
				if (new Date(fnDates.years[fnDates.years.length - 1] + 1, 0, 31).getTime() <= fnEnd.getTime()) { // within range
					fnDates.months = [fnDates.years[fnDates.years.length - 1] + 1 + '/0']; // first non-disabled January
				} else {
					fnDates.months = false;
				}
			}
		} else {
			fnDates.months = false;
		}
		// add remaining disabled months
		let preDiff = dsq.countMonths(fnStart, new Date(fnDates.years[0], 0, 1), true), // months before
			postDiff = dsq.countMonths(new Date(fnDates.years[fnDates.years.length - 1] + 1, 0, 1), fnEnd, true); // months after
		if (preDiff >= 2) { // months before
			for (let b = 1; b < preDiff; b++) {
				fnDates.months.push(fnStart.getFullYear() + '/' + ((fnDates.months[b - 1].split('/')[1] * 1) + 1));
			}
		}
		if (postDiff >= 1) { // months after
			let a = 0;
			if (preDiff === 0) {
				a++;
			}
			for (a; a < postDiff; a++) {
				fnDates.months.push(fnDates.years[fnDates.years.length - 1] + 1 + '/' + a);
			}
		}
		if (preDiff === -1 && postDiff === -1 && fnDates.months[0]) { // no years
			let yrCount = fnDates.months[0].split('/')[0] * 1,
				mtCount;
			for (let d = 1; d < difference - 1; d++) { // d = 1 && difference -1 (first entry already calculated)
				mtCount = fnDates.months[d - 1].split('/')[1] * 1;
				if (mtCount === 11) {
					mtCount = 0;
					yrCount++;
				}
				fnDates.months.push(yrCount + '/' + (mtCount + 1));
				if (mtCount === 11) {
					mtCount = 0;
					yrCount++;
				} else {
					mtCount++;
				}
			}

		}
		// add remaining disabled days
		fnDates.days = [];

		if (fnDates.years === false && fnDates.months === false) { // range is all days
			let endIn = 0;
			if (fnStart.getMonth() !== fnEnd.getMonth()) { // ends next month
				endIn = fnEnd.getDate() + 1 + dsq.daysInMonth(fnStart.getFullYear(), fnStart.getMonth()); // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
			} else {
				endIn = fnEnd.getDate() + 1; // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
			}
			for (let i = fnStart.getDate(); i < endIn; i++) {
				if (i >= dsq.daysInMonth(fnStart.getFullYear(), fnStart.getMonth()) + 1) { // crosses into new month
					fnDates.days.push(fnStart.getFullYear() + '/' + fnEnd.getMonth() + '/' + (i - dsq.daysInMonth(fnStart.getFullYear(), fnStart.getMonth())));
				} else { // same month
					fnDates.days.push(fnStart.getFullYear() + '/' + fnStart.getMonth() + '/' + i);
				}
			}
		} else if (fnDates.years === false && fnDates.months !== false) { // range is months
			if (fnStart.getMonth() < fnDates.months[0].split('/')[1]) { // days at start of range
				for (let i = fnStart.getDate(); i < dsq.daysInMonth(fnStart.getFullYear(), (fnDates.months[0].split('/')[1] * 1) - 1) + 1; i++) { // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
					fnDates.days.push(fnStart.getFullYear() + '/' + fnStart.getMonth() + '/' + i);
				}
			}
			if (new Date(fnEnd.getFullYear(), (fnDates.months[fnDates.months.length - 1].split('/')[1] * 1) + 1).getTime() < fnEnd.getTime()) { // days at end of range
				for (let d = 1; d < fnEnd.getDate() + 1; d++) { // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
					fnDates.days.push(fnEnd.getFullYear() + '/' + fnEnd.getMonth() + '/' + d);
				}
			}
		} else if (fnDates.years !== false && fnDates.months === false) { // range is years
			if (fnStart.getFullYear() < fnDates.years[0]) { // days at start of range
				for (let i = fnStart.getDate(); i < dsq.daysInMonth(fnStart.getFullYear(), fnStart.getMonth()) + 1; i++) { // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
					fnDates.days.push(fnStart.getFullYear() + '/' + fnStart.getMonth() + '/' + i);
				}
			}
			if (new Date(fnDates.years[fnDates.years.length - 1] + 1, fnStart.getMonth()).getTime() < fnEnd.getTime()) { // days at end of range
				for (let d = 1; d < fnEnd.getDate() + 1; d++) { // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
					fnDates.days.push(fnEnd.getFullYear() + '/' + fnEnd.getMonth() + '/' + d);
				}
			}
		} else { // range is years && months [bug]
			let timeAtY0 = new Date(fnDates.years[0], 0, 1).getTime(),
				timeAtM0 = new Date(fnDates.months[0].split('/')[0], fnDates.months[0].split('/')[1]).getTime();
			if ((fnStart.getTime() < timeAtY0 && timeAtY0 < timeAtM0) || (fnStart.getTime() < timeAtM0 && timeAtM0 < timeAtY0)) { // starts before year (not month) | d < y < m
				for (let i = fnStart.getDate(); i < dsq.daysInMonth(fnStart.getFullYear(), fnStart.getMonth()) + 1; i++) { // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
					fnDates.days.push(fnStart.getFullYear() + '/' + fnStart.getMonth() + '/' + i);
				}
			} else { // starts after month or year) | y or m < d
				for (let d = 1; d < fnEnd.getDate() + 1; d++) { // fnEnd+1 because calculates to beginning of last day (00:00) but last day is also disabled
					fnDates.days.push(fnEnd.getFullYear() + '/' + fnEnd.getMonth() + '/' + d);
				}
			}
		}
		if (fnDates.days.length === 0) {
			fnDates.days = false;
		}
		this.disArray = fnDates;
		return fnDates;
	}
	// getters & setters
	getValue(pattern) {
		if (pattern === undefined || this.setDate === undefined) {
			//console.log('pattern: ',pattern);
			return this.setDate;
		} else {
			return dsq.format(this.setDate, pattern);
		}
	}
	setValue(setTo, zoneOrder) {
		if (setTo !== undefined) {
			this.finishUp(setTo, zoneOrder);
			return true;
		} else {
			return false;
		}
	}
	// parse string entered in UK date format
	parseDateString(str, zone) {
		let delimiter = false,
			delimiterPT = false,
			monthNum = null,
			dayNum = null,
			yearNum = null,
			monthPart = null,
			dayPart = null,
			yearPart = null,
			potentials = [' ', '.', '/', '-', ':', ';'],
			cleanerUI = str.replace(/,/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\[/g, '').replace(/\]/g, ''), //remove commas & brackets,
			cleanerPT = this.options.pattern.replace(/,/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\[/g, '').replace(/\]/g, ''); //remove commas & brackets

		// identify delimiter in user input & pattern
		potentials.forEach(function(instance) {
			if (cleanerUI.indexOf(instance) > 0) {
				if (instance === ' ') {
					cleanerUI = cleanerUI.replace(/  /g, ' '); //replace double spacing
				}
				delimiter = instance;
			}
			if (cleanerPT.indexOf(instance) > 0) {
				if (instance === ' ') {
					cleanerPT = cleanerPT.replace(/  /g, ' '); //replace double spacing
				}
				delimiterPT = instance;
			}
		});
		if (delimiter) {
			let parts = cleanerUI.split(delimiter),
				partsPT = cleanerPT.split(delimiterPT);
			// foreach parts check if day, if is: remove parts[x] & return true
			parts.some(function(part, i) {
				if (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(part.substring(0,3).toLowerCase()) > -1) {
					parts.splice(parts[i], 1);
				}
				return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(part.substring(0,3).toLowerCase()) > -1;
			});

			if (parts.length < 3 ) { // maybe partial or short pattern
				if (parts.length === partsPT.length) { // probably short pattern
					partsPT.forEach(function(partPT, j) {
						if (partPT.indexOf('w') > -1) {
							partsPT.splice(partsPT[j], 1);
						} else if (partsPT[j].indexOf('d') > -1) {
							dayPart = parts[j];
						} else if (partsPT[j].indexOf('m') > -1) {
							monthPart = parts[j];
						} else if (partsPT[j].indexOf('y') > -1) {
							yearPart = parts[j];
						}
					});
				} else {
					// inidentifiable parts
					return false;
				}
			} else if (parts.length === 3) { // e.g day, month, year
				// workout return order
				if (zone !== undefined) {
					if (zone[0] === 'y') {
						yearPart = parts[0];
						if (zone[1] === 'm') {
							monthPart = parts[1];
							dayPart = parts[2];
						} else { // assume; zone[x] === d
							monthPart = parts[2];
							dayPart = parts[1];
						}
					} else if (zone[0] === 'm') {
						monthPart = parts[0];
						if (zone[1] === 'y') {
							yearPart = parts[1];
							dayPart = parts[2];
						} else { // assume; zone[x] === d
							yearPart = parts[2];
							dayPart = parts[1];
						}
					} else { // assume; zone[x] === d
						dayPart = parts[0];
						if (zone[1] === 'y') {
							yearPart = parts[1];
							monthPart = parts[2];
						} else { // assume; zone[x] === m
							yearPart = parts[2];
							monthPart = parts[1];
						}
					}
				} else {
					yearPart = parts[2];
					monthPart = parts[1];
					dayPart = parts[0];
				}
				
			} else {
				// too many parts
				return false;
			}

			// check for words
			if (monthPart) {
				if (isNaN(monthPart * 1)) {
					monthNum = this.options.monthList.indexOf(monthPart.substring(0,3).charAt(0).toUpperCase() + monthPart.substring(0,3).slice(1));
				} else {
					monthNum = monthPart - 1;
				}
			} else {
				monthNum = 0;
			}
			if (dayPart) {
				if (isNaN(dayPart * 1)) {
					dayNum = dayPart.replace(/\D/g,'');
				} else {
					dayNum = dayPart;
				}
			} else {
				dayNum = 1;
			}

			// check year length and adjust
			if (yearPart) {
				if (yearPart.length === 4) {
					yearNum = yearPart;
				} else if (yearPart.length === 3) {
					yearNum = yearPart.replace(/\D/g,'');
				} else {
					if (yearPart * 1 > new Date().getFullYear().toString().slice(-2)) {
						yearNum = `19${yearPart}`;
					} else {
						yearNum = `20${yearPart}`;
					}
				}
			} else {
				yearNum = new Date().getFullYear();
			}

			const retDate = new Date(yearNum,monthNum,dayNum);
			if (dsq.isValidDate(retDate)) {
				return new Date(yearNum,monthNum,dayNum);
			} else {
				// invalid date
				return false;
			}
		} else {
			// no or unidentifiable delimiter
			return false;
		}
	}
	
	// add touch classes to dsq instances
	static touchSet() {
		// add touch class
		document.querySelectorAll('.dsq').forEach(function(element) {
			element.classList.add('dsq-touch');
		});
		//this.wrapper.classList.add(this.options.classPrefix + 'touch');
	}
	// check if a date is valid
	// https://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript#answer-1353711
	static isValidDate(d) {
	  	return d instanceof Date && !isNaN(d);
	}
	static countMonths(startDate, endDate, whole) {
		let stepDate = new Date(startDate),
			fnStart = new Date(startDate),
			fnEnd = new Date(endDate),
			monthCount = 0;
		if (whole) {
			if (fnStart.getDate() !== 1 && fnStart.getMonth() !== 0) {
				fnStart.setFullYear(fnStart.getFullYear(), fnStart.getMonth() + 1, 1);
			}
			if (fnEnd.getDate() === dsq.daysInMonth(fnEnd.getFullYear(), fnEnd.getMonth())) {
				fnEnd.setFullYear(fnEnd.getFullYear(), fnEnd.getMonth() + 1, 1);
			} else {
				fnEnd.setFullYear(fnEnd.getFullYear(), fnEnd.getMonth(), 1);
			}
		}
		stepDate = fnStart;
		while (stepDate.getTime() <= fnEnd.getTime()) {
			stepDate.setMonth(stepDate.getMonth() + 1);
			monthCount += 1;
		}
		if (stepDate !== fnEnd) {
			monthCount -= 1;
		}
		return monthCount;
	}
	static isBetweenDates(test, start, end) { // assumes END of test day
		const realEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999),
			realStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
		return ((test.getTime() <= realEnd.getTime() && test.getTime() >= realStart.getTime()));
	}
	static isSameDay(d1, d2) {
		return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
	}
	static daysInMonth(y, m) { // expects JS month
		let isLeap = ((y % 4) == 0 && ((y % 100) != 0 || (y % 400) == 0));
		return [31, (isLeap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
	}
	static dayOfYear(d) {
		let y = d.getFullYear(),
			m = d.getMonth();
		return m * 31 - (m > 1 ? (1054267675 >> m * 3 - 6 & 7) - (y & 3 || !(y % 25) && y & 15 ? 0 : 1) : 0) + d.getDate();
	}
	static treatAsUTC(date) {
		let result = new Date(date);
		result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
		return result;
	}
	static daysBetween(startDate, endDate) {
		let millisecondsPerDay = 24 * 60 * 60 * 1000;
		return (dsq.treatAsUTC(endDate) - dsq.treatAsUTC(startDate)) / millisecondsPerDay;
	}
	static format(dateObj, format) {
		// set default format if function argument not provided
		format = format || 'yyyy-mm-dd';

		let leadingZero = function (number, length) {
				number = number.toString();
				length = length || 2;
				while (number.length < length)
					number = '0' + number;
				return number;
			},

			// ordinal suffix 
			ordinalSuffix = function (i) {
				let j = i % 10,
					k = i % 100;
				if (j == 1 && k != 11) {
					return i + "st";
				}
				if (j == 2 && k != 12) {
					return i + "nd";
				}
				if (j == 3 && k != 13) {
					return i + "rd";
				}
				return i + "th";
			},

			// define formats
			formats = {
				yyyy: dateObj.getFullYear(), // 1900, 1901, ..., 2099
				yy: dateObj.getFullYear().toString().slice(2), //  00, 01, ..., 99
				mmmm: dateObj.toLocaleString('en-gb', {
					month: "long"
				}), // January, February, ..., December
				mmm: dateObj.toLocaleString('en-gb', {
					month: "short"
				}), // Jan, Feb, ..., Dec
				mm: leadingZero(dateObj.getMonth() + 1), // 01, 02, ..., 12
				mx: ordinalSuffix(dateObj.getMonth() + 1), // 1st, 2nd, ..., 12th
				m: dateObj.getMonth() + 1, // 1, 2, ..., 12
				wwww: dateObj.toLocaleString('en-gb', {
					weekday: "long"
				}), // Sunday, Monday, ..., Saturday
				www: dateObj.toLocaleString('en-gb', {
					weekday: "short"
				}), // Sun, Mon, ..., Sat
				ww: dateObj.toLocaleString('en-gb', {
					weekday: "short"
				}).slice(0, 2), // Su, Mo, ..., Sa
				w: dateObj.getDay(), // 0, 1, ..., 6
				dddd: leadingZero(dsq.dayOfYear(dateObj), 3), // 001, 002, ..., 366
				dddx: ordinalSuffix(dsq.dayOfYear(dateObj)), // 1st, 2nd, ..., 366th
				ddd: dsq.dayOfYear(dateObj), // 1, 2, ..., 366
				dd: leadingZero(dateObj.getDate()), // 01, 02, ..., 31
				dx: ordinalSuffix(dateObj.getDate()), // 1st, 2nd, ..., 31st
				d: dateObj.getDate(), // 1, 2, ..., 31
			},

			// make pattern
			pattern = '(' + Object.keys(formats).join(')|(') + ')';

		return format.replace(new RegExp(pattern, 'g'), function (match) {
			return formats[match];
		});
	}
};

export default dsq;
