const defaults = { // dsq defaults
	    start: new Date(), // first selectable day
	    end: { // last selectable day
	        d: new Date().getDate(),
	        m: new Date().getMonth(),
	        y: new Date().getFullYear() + 10
	    },
	    initial: false, // set the value the field should be set to on initialisation (before user input)
	    pattern: 'dx mmm yyyy', // visual output format (displayed in the input) 
	    patternSave: 'yyyy,mm,dd', // data-date value output format 
	    day: true, // if true then a day is selectable
	    month: true, // if true then a month is selectable
	    disableDates: false, // a list of Date objects or ranges [from, to] that define days to exclude as selectable
	    markToday: true, // if true then the "today" indicator is shown
	    classPrefix: 'dsq-', // prefix JS-added classes - if changed scss variable "$dsq-prefix" must be updated too
	    hideScrollbars: false, // if true then a scrollbars on year and month list are hidden (visual effect)
	    activation: function() { // if the function evaluates to true when DOM loads then dateSquirrel activates
	        if (window.screen.width > 250) {
	            return true;
	        } else {
	            return false;
	        }
	    },
	    callback: function() { // optional callback fired on date completion
	        //console.log('Date set: ', this.date);
	        //console.log('The input element: ', this.input);
	        //console.log('The dateSquirrel wrapper: ', this.wrapper);
	    },
	    parse: false, // if true dateSquirrel will (after [parseDelay]ms) parse, format and rewrite a user given date
	    parseDelay: 100, // the delay in ms before dateSquirrel will parse, format and rewrite a user given date
	    parseEvent: 'change', // the type of event dateSquirrel will listen for before parsing >> https://developer.mozilla.org/en-US/docs/Web/Events
	    overlay: false, // if true dateSquirrel will position the generated submenus absolutely
	    monthList: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] // The list of months
	};

export default defaults;