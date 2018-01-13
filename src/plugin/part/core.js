// default settings
import defaults from './settings';

class dsq {
    // create instance
    constructor(element, options) {
            // check element exists
            if (!element.nodeName) {
                element = document.querySelector(element);
                if (element == null) {
                    throw 'dateSquirrel was unable to find the element!'
                }
            }

            // check dsq is on an <input>
            if (element.nodeName !== "INPUT") {
                throw 'dateSquirrel only works on <input> fields!'
            }

            // polyfill for Element.closest --> https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
            if (!Element.prototype.matches) {
                Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
            }
            if (!Element.prototype.closest) {
                Element.prototype.closest = function(s) {
                    let el = this;
                    if (!document.documentElement.contains(el)) return null;
                    do {
                        if (el.matches(s)) return el;
                        el = el.parentElement || el.parentNode;
                    } while (el !== null && el.nodeType === 1);
                    return null;
                };
            }
            // polyfill for Array.from --> https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Polyfill
            if (!Array.from) {
                Array.from = (function() {
                    var toStr = Object.prototype.toString;
                    var isCallable = function(fn) {
                        return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
                    };
                    var toInteger = function(value) {
                        var number = Number(value);
                        if (isNaN(number)) {
                            return 0;
                        }
                        if (number === 0 || !isFinite(number)) {
                            return number;
                        }
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
            // yet more IE polyfill - for childNode.remove()
            // from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md
            (function(arr) {
                arr.forEach(function(item) {
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
            // check to see if there is a max or min on the input
            if (element.hasAttribute('min')) {
                //console.log('min: ', element.hasAttribute('min'));
                let min = element.getAttribute('min').split('-');
                defaults.start = new Date(min[0], (min[1] * 1) - 1, min[2]);
                //console.log('defaults.start: ', defaults.start);
            }
            if (element.hasAttribute('max')) {
                //console.log('max: ', element.hasAttribute('max'));
                let max = element.getAttribute('max').split('-');
                defaults.end = new Date(max[0], (max[1] * 1) - 1, max[2]);
                //console.log('defaults.end: ', defaults.end);
            }

            // merge options & defaults
            this.options = this.extend(defaults, options || {});

            // create a new dateSquirrel instance
            this.o = element;
            this.label = element.parentElement;
            this.uid = '_dsq' + this.newId();

            // check browser feature compatibility <-- Doesn't work in IE11?!
            //const features = 'querySelector' in document && 'addEventListener' in window && 'classList' in window.Element.prototype;

            // check activation criteria
            //if (!features) {
            if (!'querySelector' in document) { // stupid
                console.log('queryselector', 'querySelector' in document);
                if (!'addEventListener' in window) { // IE 11
                    console.log('addEventListener', 'addEventListener' in window);
                    if (!'classList' in window) { // bugs
                        console.log('classList', 'addEventListener' in window.Element.prototype);
                        throw 'Browser doesn\'t meet the minimum dateSquirrel activation requirements';
                        return;
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
            let instanceId = '#' + this.uid,
                cssRules = "",
                cssClass = this.options.cssContainerClass + '_' + this.uid,
                primaryTextCss = instanceId + ' .' + this.options.classPrefix + 'lists ul>li.' + this.options.classPrefix + 'active{color:' + this.options.primaryTextColour + '}',
                primaryColourCss = instanceId + ' .' + this.options.classPrefix + 'lists ul>li:not(.' + this.options.classPrefix + 'dow-header):not(.' + this.options.classPrefix + 'disabled):hover{background-color:' + this.options.primaryColour + ';color:' + this.options.textOnPrimaryColour + '}' +
                instanceId + ' .' + this.options.classPrefix + 'lists ul>li:not(.' + this.options.classPrefix + 'dow-header):active{background-color:' + this.options.primaryColour + ';color:' + this.options.textOnPrimaryColour + '}' +
                '@media only screen and (min-width: ' + this.options.breakpoint + ') {' +
                instanceId + ' .' + this.options.classPrefix + 'side{background-color:' + this.options.primaryColour + '}' +
                instanceId + ' .' + this.options.classPrefix + 'reminder-month,' +
                instanceId + ' .' + this.options.classPrefix + 'reminder-year {color:' + this.options.textOnPrimaryColour + '}}';

            // process options
            this.options.start = this.processUd(this.options.start);
            this.options.end = this.processUd(this.options.end);

            // add lists & sizes
            this.monthList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            this.rowHeight = 40;
            this.listHeight = (6 * this.rowHeight) + (this.rowHeight / 2);

            // wrap input field
            if (!this.options.dontWrap) {
                this.wrap();
            }

            // change to text field
            this.o.setAttribute('type', 'text');

            // add colours to page
            if (this.options.primaryTextColour !== defaults.primaryTextColour) {
                cssRules += primaryTextCss;
            }
            if (this.options.primaryColour !== defaults.primaryColour || this.options.textOnPrimaryColour !== defaults.textOnPrimaryColour) {
                cssRules += primaryColourCss;
            }
            if (this.options.hideScrollbars) {
                cssRules += instanceId + ' .' + this.options.classPrefix + 'lists > .' + this.options.classPrefix + 'list-years{width:calc(100% + 30px)}' + instanceId + ' .' + this.options.classPrefix + 'lists > .' + this.options.classPrefix + 'list-months{left:calc(100% + 30px);width:calc(100% - 50px);}';
            }
            this.injectCss(cssClass, cssRules);

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
                    this.rmEvt(this.lists.querySelector('.dsq-reminder-month'), 'click', this.reminderMonthFn, false);
                    this.rmEvt(this.lists.querySelector('.dsq-reminder-year'), 'click', this.reminderYearFn, false);
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

                // html
                this.rmEvt(document.documentElement, 'click', this.htmlClickFn, false);

                // reset to date
                this.o.setAttribute('type', 'date');

                // remove dsq wrapper
                this.unwrap(document.getElementById(this.uid));

                // remove data
                this.removeData(this);
            }
            // purge associations
            this.o = null;
            this.label = null;
            this.uid = null;
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
                    console.error('Format "' + this.options.disabledDates[item] + '" in dsq.options.disabledDates not recognised');
                }
            }
            // convert arrays to sets of unique entries
            this.disDates.days = new Set(this.uniqBy(this.disDates.days, JSON.stringify));
            this.disDates.months = new Set(this.uniqBy(this.disDates.months, JSON.stringify));
            this.disDates.years = new Set(this.uniqBy(this.disDates.years, JSON.stringify));
            this.disDates.recurringDays = new Set(this.uniqBy(this.disDates.recurringDays, JSON.stringify));
            this.disDates.recurringDates = new Set(this.uniqBy(this.disDates.recurringDates, JSON.stringify));
        } else {
            //this.disDates = false;
            this.disDates.days = false;
            this.disDates.months = false;
            this.disDates.years = false;
            this.disDates.recurringDays = false;
            this.disDates.recurringDates = false;
        }
        // generate month & year lists
        if (this.hasYear) {
            for (let y = this.options.start.y; y < this.options.end.y + 1; y++) {
                let cl = '';
                if (this.disDates.years !== false && this.disDates.years.has(y)) {
                    cl = 'class="' + this.options.classPrefix + 'disabled" tabindex="-1"';
                } else {
                    cl = 'tabindex="0"';
                }
                this.lists.querySelector('.dsq-list-years').insertAdjacentHTML('afterbegin', '<li id="' + this.uid + '_y_' + y + '" ' + cl + ' data-year="' + y + '" role="option">' + y + '</li>');
            }
        } else {
            this.lists.querySelector('.dsq-list-years').insertAdjacentHTML('afterbegin', '<li id="' + this.uid + '_y_0" class="' + this.options.classPrefix + 'active" data-year="' + this.options.start.y + '" tabindex="0" role="option">' + this.options.start.y + '</li>');
        }
        if (this.hasMonth) {
            for (let m = 0; m < 12; m++) {
                this.lists.querySelector('.dsq-list-months').insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_m_' + m + '" data-month="' + m + '" tabindex="0" role="option">' + this.monthList[m] + '</li>');
            }
        } else {
            this.lists.querySelector('.dsq-list-months').insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_m_0" class="' + this.options.classPrefix + 'active" data-month="' + dsq.format(this.options.start, 'mmm') + '" tabindex="0" role="option">' + dsq.format(this.options.start, 'mmm') + '</li>');
            // generate days early
            this.addDays();
        }

        // add listeners
        let yearRows = this.lists.years.querySelectorAll('li'),
            monthRows = this.lists.months.querySelectorAll('li'),
            that = this;

        this.focFn = {
            handleEvent: function(e) {
                //suppress mobile keyboard
                that.o.setAttribute('readonly', 'readonly');

                // add window event to watch hardware keyboard
                that.addEvt(window, 'keydown', that.keydownFn, false);

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
                    } else {
                        that.o.focus();
                    }
                    that.listHeightCalc();
                    // check for lists opening offscreen and invert if required
                    let listPos = that.wouldBeInView(that.lists, true);
                    if (listPos === 'above') {
                        that.lists.classList.add(that.options.classPrefix + 'down');
                    } else if (listPos === 'below') {
                        that.lists.classList.add(that.options.classPrefix + 'up');
                    } else { // in view or error
                        that.lists.classList.remove(that.options.classPrefix + 'up', that.options.classPrefix + 'down');
                    }
                }
                that.addEvt(document.documentElement, 'click', that.htmlClickFn, false);

            }
        };
        this.blurFn = {
            handleEvent: function(e) {
                // un-suppress mobile keyboard
                that.o.removeAttribute('readonly');
                that.clearFocus();
            }
        };
        this.yrClickFn = {
            handleEvent: function(e) {
                if (!e.target.classList.contains(that.options.classPrefix + 'disabled')) {
                    e.stopPropagation();
                    // remove previous selection indicator
                    let yearRows = that.lists.years.querySelectorAll('li'),
                        monthRows = that.lists.months.querySelectorAll('li');
                    for (let i = 0; i < yearRows.length; i++) {
                        yearRows[i].classList.remove(that.options.classPrefix + 'active');
                    }
                    // make e.target active
                    e.target.classList.add(that.options.classPrefix + 'active');
                    that.selectedYear = e.target.getAttribute('data-year') * 1;
                    that.o.value = that.selectedYear;
                    // animate if reselecting
                    if (that.lists.classList.contains(that.options.classPrefix + 'month') && !that.lists.classList.contains(that.options.classPrefix + 'day')) {
                        that.lists.months.classList.add(that.options.classPrefix + 'switch');
                        setTimeout(function() {
                            that.lists.months.classList.remove(that.options.classPrefix + 'switch');
                        }, 350);
                    }

                    if (that.options.month) {
                        that.lists.classList.add(that.options.classPrefix + 'month');
                        // check months
                        that.checkMonths();
                        that.listHeightCalc();
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
            handleEvent: function(e) {
                if (!e.target.classList.contains(that.options.classPrefix + 'disabled')) {
                    e.stopPropagation();
                    let monthRows = that.lists.months.querySelectorAll('li');
                    for (let i = 0; i < monthRows.length; i++) {
                        monthRows[i].classList.remove(that.options.classPrefix + 'active');
                    }
                    e.target.classList.add(that.options.classPrefix + 'active');
                    that.selectedMonth = e.target.getAttribute('data-month') * 1;
                    if (that.options.day) {
                        that.o.value = that.monthList[that.selectedMonth] + ' ' + that.selectedYear;
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
            handleEvent: function(e) {
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
            handleEvent: function(e) {
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
                    firstTime = true,
                    blockOn = 0,
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
                let focusedOn = that.findFocus(blocks);
                firstTime = focusedOn[0];
                blockOn = focusedOn[1];

                // key action modification
                switch (e.which) {
                    case 40:
                        e.preventDefault();
                        if (blockOn !== blocks.length - 1 && !firstTime) {
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
                    case 39:
                        e.preventDefault();
                        if (blockOn !== blocks.length - 1 && !firstTime && unitId === 2) blockOn++;
                        break;
                    case 38:
                        e.preventDefault();
                        if (blockOn !== 0 && !firstTime) {
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
                        }
                        break;
                    case 37:
                        e.preventDefault();
                        if (blockOn !== 0 && !firstTime && unitId === 2) {
                            blockOn--;
                        } else if (!firstTime && unitId === 1 && that.hasYear) {
                            that.goToYear();
                            let lastActive = that.lists.years.querySelector('.' + that.options.classPrefix + 'active');
                            that.lists.years.setAttribute('aria-activedescendant', lastActive.id);
                            that.setFocus(lastActive);
                        }
                        break;
                    case 13:
                        e.preventDefault();
                        e.target.click();
                        that.clearFocus(); // clear all focus
                        break;
                    case 9:
                        let focusedOn = that.findFocus(blocks);
                        firstTime = false;
                        blockOn = focusedOn[1];
                        if (e.shiftKey === false) {
                            if (blockOn === blocks.length - 1) {
                                if (unitId !== 2) {
                                    e.preventDefault();
                                } else {
                                    document.body.click();
                                }
                            } else {
                                that.clearFocus();
                            }
                        } else {
                            if (blockOn === 0) {
                                if (unitId !== 0) {
                                    e.preventDefault();
                                } else {
                                    document.body.click();
                                }
                            } else {
                                that.clearFocus();
                            }
                        }
                        break;
                    case 8:
                        document.body.click();
                        break;
                    default:
                        // go on merry way
                }
                if (e.which >= 37 && e.which <= 40) {
                    // set parent to active
                    unit.setAttribute('aria-activedescendant', blocks[blockOn].id);
                    // focus block
                    that.setFocus(blocks[blockOn])
                }
            }
        };

        // year select
        if (this.hasYear) {
            for (let i = 0; i < yearRows.length; i++) {
                this.addEvt(yearRows[i], 'click', this.yrClickFn, false);
            }
        } else {
            yearRows[0].classList.add(this.options.classPrefix + 'noh')
        }

        // month select
        if (this.hasMonth) {
            for (let i = 0; i < monthRows.length; i++) {
                this.addEvt(monthRows[i], 'click', this.mthClickFn, false);
            }
        } else {
            monthRows[0].classList.add(this.options.classPrefix + 'noh')
        }

        //focus event
        this.addEvt(this.o, 'focus', this.focFn, false);
        this.addEvt(this.o, 'blur', this.blurFn, false);
    }
    findFocus(blocks) {
        let i = 0;
        for (; i < blocks.length; i++) {
            if (blocks[i] === document.activeElement) {
                return [false, i];
            }
        }
        return [true, 0];
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
            this.wrapper.classList.remove(this.options.classPrefix + 'closing')
        }, duration);
    }
    checkMonths() {
        if (this.lists.classList.contains(this.options.classPrefix + 'month') && !this.lists.classList.contains(this.options.classPrefix + 'day')) {
            let firstActive = false;
            for (let m = 0; m < 12; m++) {
                let daysInCurrentMonth = dsq.daysInMonth(this.selectedYear, m);
                if ((dsq.isBetweenDates(new Date(this.selectedYear, m, 1), this.options.start, this.options.end) || dsq.isBetweenDates(new Date(this.selectedYear, m, daysInCurrentMonth), this.options.start, this.options.end)) && (this.disDates.months === false || !this.disDates.months.has(this.selectedYear + '/' + m))) {
                    this.lists.querySelectorAll('.dsq-list-months li')[m].classList.remove(this.options.classPrefix + 'disabled');
                    this.lists.querySelectorAll('.dsq-list-months li')[m].setAttribute('tabindex', '0');
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
        this.reminder.innerHTML = '<a class="' + this.options.classPrefix + 'reminder-month">' + this.monthList[this.selectedMonth] + '</a>&nbsp;<a class="' + this.options.classPrefix + 'reminder-year">' + this.selectedYear + '</a>';
        this.lists.days.innerHTML = '<li class="' + this.options.classPrefix + 'dow-header">Mon</li><li class="' + this.options.classPrefix + 'dow-header">Tue</li><li class="' + this.options.classPrefix + 'dow-header">Wed</li><li class="' + this.options.classPrefix + 'dow-header">Thu</li><li class="' + this.options.classPrefix + 'dow-header">Fri</li><li class="' + this.options.classPrefix + 'dow-header">Sat</li><li class="' + this.options.classPrefix + 'dow-header">Sun</li>';
        firstOfMonth = new Date(this.selectedYear, this.selectedMonth, 1).getDay() === 0 ? 6 : new Date(this.selectedYear, this.selectedMonth, 1).getDay() - 1;
        // set container size & 1st of month
        for (let f = 0; f < firstOfMonth; f++) {
            this.lists.days.insertAdjacentHTML('beforeend', '<li data-day class="' + this.options.classPrefix + 'padding"></li>');
        }
        for (let d = 1; d < numberOfDays + 1; d++) {
            let theDay = daysOfWeek[new Date(this.selectedYear, this.selectedMonth, d).getDay()];
            if (dsq.isBetweenDates(new Date(this.selectedYear, this.selectedMonth, d), this.options.start, this.options.end) && (this.disDates.days === false || (!this.disDates.days.has(this.selectedYear + '/' + this.selectedMonth + '/' + d) && !this.disDates.recurringDays.has(theDay) && !this.disDates.recurringDates.has(this.selectedYear + '/' + this.selectedMonth + '/' + d)))) {
                //console.log('Date ' + d + ' enabled (' + theDay + ')');
                this.lists.days.insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_d_' + d + '" data-day="' + d + '" tabindex="0" role="option">' + d + '</li>');
            } else {
                this.lists.days.insertAdjacentHTML('beforeend', '<li id="' + this.uid + '_d_' + d + '" class="' + this.options.classPrefix + 'disabled" data-day="' + d + '" tabindex="-1" role="option">' + d + '</li>');
            }
            if (dsq.isSameDay(new Date(), new Date(this.selectedYear, this.selectedMonth, d)) && this.options.markToday) {
                this.lists.days.querySelector('li[data-day="' + d + '"]').classList.add(this.options.classPrefix + 'today');
            }
        }
        this.listHeightCalc();
        // day select
        let activeDays = this.lists.days.querySelectorAll('li[data-day]'),
            that = this;
        this.dayClickFn = {
            handleEvent: function(e) {
                e.stopPropagation();
                if (!e.target.classList.contains(that.options.classPrefix + 'disabled')) {
                    that.selectedDay = e.target.getAttribute('data-day') * 1;
                    that.finishUp();

                    // reset
                    that.setFocus(e.target);
                }

            }
        };
        this.reminderMonthFn = {
            handleEvent: function(e) {
                e.stopPropagation();
                that.lists.dayWrap.classList.add(that.options.classPrefix + 'sout');
                setTimeout(function() {
                    that.lists.classList.remove(that.options.classPrefix + 'day');
                    that.lists.dayWrap.classList.remove(that.options.classPrefix + 'sout');
                    that.listHeightCalc();
                }, 150);
            }
        };
        this.reminderYearFn = {
            handleEvent: function(e) {
                e.stopPropagation();
                that.goToYear();
            }
        };
        // add day click event
        for (let i = 0; i < activeDays.length; i++) {
            this.addEvt(activeDays[i], 'click', this.dayClickFn, false);
        }

        // add "return to month or year" event if applicable
        if (this.hasYear) {
            this.addEvt(this.lists.querySelector('.dsq-reminder-year'), 'click', this.reminderYearFn, false);
        } else {
            // remove css click indicators / hovers
            this.lists.querySelector('.dsq-reminder-year').classList.add(this.options.classPrefix + 'noh');
        }
        if (this.hasMonth) {
            this.addEvt(this.lists.querySelector('.dsq-reminder-month'), 'click', this.reminderMonthFn, false);
        } else {
            // remove css click indicators / hovers
            this.lists.querySelector('.dsq-reminder-month').classList.add(this.options.classPrefix + 'noh');
        }
    }
    goToYear() {
        this.lists.dayWrap.classList.add(this.options.classPrefix + 'sout');
        setTimeout(() => {
            this.lists.dayWrap.classList.remove(this.options.classPrefix + 'sout');
            this.lists.classList.remove(this.options.classPrefix + 'day');
            this.lists.months.classList.add(this.options.classPrefix + 'sout');
            setTimeout(() => {
                this.lists.classList.remove(this.options.classPrefix + 'month');
                this.lists.months.classList.remove(this.options.classPrefix + 'sout');
                this.listHeightCalc();
            }, 150);
        }, 150);
        this.lists.months.removeAttribute('aria-activedescendant');
    }
    finishUp() {
            const delay = 250; // ms
            if (typeof this.selectedDay === 'undefined') {
                // month only
                this.selectedDay = 1;
            }
            if (typeof this.selectedMonth === 'undefined') {
                // year only
                this.selectedMonth = 1;
            }
            this.setDate = new Date(this.selectedYear, this.selectedMonth, this.selectedDay);
            // format output & associate
            this.setDate.save = dsq.format(this.setDate, this.options.patternSave);
            this.setDate.human = dsq.format(this.setDate, this.options.pattern);
            // input & attribute values
            // user
            this.o.value = this.setDate.human;
            // data-dsq-date
            this.o.setAttribute('data-dsq-date', this.setDate.save);
            // value attr
            this.o.setAttribute('value', this.selectedYear + '-' + (this.selectedMonth + 1) + '-' + this.selectedDay);
            // set status to done
            this.wrapper.classList.add(this.options.classPrefix + 'done');
            // remove active class
            //that.wrapper.classList.remove(that.options.classPrefix + 'active');
            this.removeActive(delay);
            // remove listener
            this.rmEvt(document.documentElement, 'click', this.htmlClickFn, false);
            // remove stage indicator class(es)
            this.lists.classList.remove(this.options.classPrefix + 'day', this.options.classPrefix + 'month');
            setTimeout(() => {
                // make callback
                this.makeCallback();
                // remove done indicator
                this.wrapper.classList.remove(this.options.classPrefix + 'done');
            }, delay);
        }
    // event functions
    makeCallback() {
            let args = {
                    date: this.setDate,
                    input: this.o,
                    wrapper: this.wrapper,
                    human: this.setDate.human,
                    save: this.setDate.save
                },
                callback = this.options.callback.call(args); 
            if (typeof this.options.callback === 'function') {
                callback;
            } else {
                console.error('Datesqrl: Callback not a function');
            }
        }
        // DOM checks
    wouldBeInView(el, retDir) {
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
        }
        // utility functions
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
                    el.addEventListener(evt, function(e) {
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
                el.attachEvent('on' + evt, function() {
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
                        el.removeEventListener(evt, function(e) {
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
                    el.detachEvent("on" + evt, function() {
                        // Bind fn as this
                        fn.handleEvent.call(fn);
                    });
                } else {
                    el.detachEvent('on' + evt, fn);
                }
            }
        }
    // calculate correct hight for list
    listHeightCalc() {
            let daysHeight = (Math.ceil(this.lists.querySelectorAll('.dsq-days > .dsq-list-days > li[data-day]').length / 7) + 1) * this.rowHeight + 20; 

            if (!this.wrapper.classList.contains(this.options.classPrefix + 'active')) {
                this.lists.style.height = this.o.offsetHeight;
            } else if (this.lists.classList.contains(this.options.classPrefix + 'day')) {
                this.lists.style.height = daysHeight + 'px';
            } else {
                this.lists.style.height = this.listHeight + 'px';
            }
        }
    // inject css
    injectCss(theClass, rules) {
            if (rules === "") {
                return false;
            } else if (document.querySelector('#dsq_styles') === null) {
                let styleDiv = document.createElement('div');
                styleDiv.id = 'dsq_styles';
                styleDiv.innerHTML = '<style class="' + theClass + '">' + rules + '</style>';
                document.body.appendChild(styleDiv);
            } else {
                document.querySelector('#dsq_styles').insertAdjacentHTML('beforeend', '<style class="' + theClass + '">' + rules + '</style>');
            }
        }
    // wrap in HTML
    wrap() {
        // wrapper
        let wrapping = document.createElement('div');
        wrapping.className = 'dsq';
        wrapping.id = this.uid;
        this.label.parentNode.insertBefore(wrapping, this.label);
        wrapping.appendChild(this.label);
        wrapping.insertAdjacentHTML('beforeend', '<div class="' + this.options.classPrefix + 'lists"><ul class="' + this.options.classPrefix + 'list-years" role="listbox"></ul><ul class="' + this.options.classPrefix + 'list-months" role="listbox"></ul><div class="' + this.options.classPrefix + 'days"><span class="' + this.options.classPrefix + 'side"><p class="' + this.options.classPrefix + 'reminder"></p></span><ul class="' + this.options.classPrefix + 'list-days" role="listbox"></ul></div></div>');
        this.wrapper = wrapping;
        this.lists = this.wrapper.querySelector('.' + this.options.classPrefix + 'lists');
        this.reminder = this.lists.querySelector('.' + this.options.classPrefix + 'reminder');
        this.lists.dayWrap = this.lists.querySelector('.' + this.options.classPrefix + 'days');
        this.lists.days = this.lists.querySelector('.' + this.options.classPrefix + 'days .' + this.options.classPrefix + 'list-days');
        this.lists.months = this.lists.querySelector('.' + this.options.classPrefix + 'list-months');
        this.lists.years = this.lists.querySelector('.' + this.options.classPrefix + 'list-years');
    }
    unwrap(wrapping) {
        // remove lists
        document.querySelector('#' + this.uid + ' .dsq-lists').remove();
        // https://stackoverflow.com/questions/19261197/how-can-i-remove-wrapper-parent-element-without-removing-the-child#answer-33401932
        // place childNodes in document fragment
        let docFrag = document.createDocumentFragment();
        while (wrapping.firstChild) {
            let child = wrapping.removeChild(wrapping.firstChild);
            docFrag.appendChild(child);
        }
        // replace wrapper with document fragment
        wrapping.parentNode.replaceChild(docFrag, wrapping);
    }
    extend() {
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
        let merge = function(obj) {
            for (var prop in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    // If deep merge and property is an object, merge properties
                    if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
                        extended[prop] = extend(true, extended[prop], obj[prop]);
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
    newId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }
    getChildren(n, skipMe) {
        var r = [];
        for (; n; n = n.nextSibling)
            if (n.nodeType == 1 && n != skipMe)
                r.push(n);
        return r;
    }
    getSiblings(n) {
            return getChildren(n.parentNode.firstChild, n);
        }
    isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }
    findPos(obj) {
            let curtop = 0;
            if (obj.offsetParent) {
                do {
                    curtop += obj.offsetTop;
                } while (obj = obj.offsetParent);
                return [curtop];
            }
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
            } else {

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
            let stepDate = new Date(startDate),
                fnStart = new Date(startDate),
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
                    timeAtYn = new Date(fnDates.years[fnDates.years.length - 1], 11, 31).getTime(),
                    timeAtM0 = new Date(fnDates.months[0].split('/')[0], fnDates.months[0].split('/')[1]).getTime(),
                    timeAtMn = new Date(fnDates.months[fnDates.months.length - 1].split('/')[0], fnDates.months[fnDates.months.length - 1].split('/')[1]).getTime();
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
            return fnDates;
        }
        // getters
    getValue(pattern) {
            if (pattern === undefined) {
                //console.log('pattern: ',pattern);
                return this.setDate
            } else {
                return dsq.format(this.setDate, pattern);
            }
        }
        // static functions
    static modMonths(date, add) {
        let d = new Date(date),
            n = d.getDate();
        d.setDate(1);
        d.setMonth(d.getMonth() + add);
        d.setDate(Math.min(n, dsq.daysInMonth(d.getFullYear(), d.getMonth())));
        return d;
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

        let leadingZero = function(number, length) {
                number = number.toString();
                length = length || 2;
                while (number.length < length)
                    number = '0' + number;
                return number;
            },

            // ordinal suffix 
            ordinalSuffix = function(i) {
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
                w: dateObj.toLocaleString('en-gb', {
                    weekday: "narrow"
                }), // S, M, ..., S
                dddd: leadingZero(dsq.dayOfYear(dateObj), 3), // 001, 002, ..., 366
                dddx: ordinalSuffix(dsq.dayOfYear(dateObj)), // 1st, 2nd, ..., 366th
                ddd: dsq.dayOfYear(dateObj), // 1, 2, ..., 366
                dd: leadingZero(dateObj.getDate()), // 01, 02, ..., 31
                dx: ordinalSuffix(dateObj.getDate()), // 1st, 2nd, ..., 31st
                d: dateObj.getDate(), // 1, 2, ..., 31
            },

            // make pattern
            pattern = '(' + Object.keys(formats).join(')|(') + ')';

        return format.replace(new RegExp(pattern, 'g'), function(match) {
            return formats[match];
        });
    }
}

// helper functions
// insertAfter
function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
export default dsq;