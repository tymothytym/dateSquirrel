#dateSquirrel
A date picker with a nutty tang
Version: 0.1.0 (Bangs mountain - alpha)

![alt text][dateSquirrel_demo]
[dsq_Timeline2]: https://preview.ibb.co/e1FFz6/date_Squirrel_demo.gif "dateSquirrel"

##TODO - This is an alpha-stage project
- [x] Make dsq stay in viewport when opened at edges
- [x] Add min / max check from input data attr
- [x] Add keyboard navigation in lists
- [x] Hide keyboard on mobile (tested on android)
- [x] Fix bug with new colours being ditched when closing dsq (move SCSS to JS)
- [x] Fix bug re-opened lists do not have previous selection set to active
- [x] Non-activation error message when resizing browser (investigate "Uncaught Browser doesn't meet the minimum dateSquirrel activation requirements")
- [ ] Uncrappify open and close animation
- [ ] Tidy up readme
- [ ] Optimise

##IE11 bugs remaining
- [x] Polyfill for Element.closest
- [x] Polyfill for Array.from
- [x] Polyfill for childNode.remove
- [ ] Lists not adjusting so end up being displayed partly off-page if field is close to `window` edge
- [ ] When resetting date, year and month both show at once - This should probably be made a general feature

\*Sadly no polyfill for the general user experience

#####Table of Contents
- [About](#About)
- [Before you get started](#warning)
    * [Months start at 0](#monthsStart)
    * [dateSquirrel sees days as indivisible](#dsqWhut)
    * [Browser support](#Browser)
- [Use](#Use)
    * [Deployment](#Deployment)
    * [Conditions](#Conditions)
- [Options](#Options)
- [Date output formatting](#formatting)
- [Methods](#Methods)
- [Helper functions](#Helper)
- [Setup (for development)](#Setup)
    * [Build requirements](#requirements)
    * [Cloning & installation](#Cloning)
    * [Developing locally](#Developing)
    * [Cloning & installation](#Cloning)
    * [Building for production](#Building)

<a name="About"/>
##About

dateSquirrel is a date picker with calendar dates. It's modal-free, dependency-free and free-free. The aim is to put the date picking into a single field and make it so you can pick any date in three clicks. It is not trying to be better than the Google style modal or the Bootstrap calendar style drop down, dateSquirrel is for wide date possibilities (like date of birth) that are a pain to pick when you have to navigate through several decades worth of months to get to the date you want.

<a name="warning"/>
##Before you get started
<a name="monthsStart"/>
###Months start at 0
dateSquirrel gets all it's information from the JavaScripts [Date.prototype](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/prototype) which means that when you give it date information, it's expecting the format to match that of the `Date` object.

1. `Date` objects are in the format: YEAR, MONTH, DAY
2. YEAR, MONTH & DAY are all **numbers**
3. **Months start at 0 when using** `Date` objects - January === 0 and December === 11 
4. (But dateSquirrel will parse the dates it outputs as you [specify](#formatting))

So if you wanted to have the 7th of March 1983 as a `Date` object:

```javascript
const myDate = new Date(1983,2,7) // Mon Mar 07 1983 00:00:00
```

However if you were to get the same date back from a user (via dateSquirrel) in, say, `dd/mm/yyyy` [format](#formatting)), then you would get `07/03/1983` (Monday 7th March 1983).

It's not because dateSquirrel was created by a crazy person (that's simply a coincidence), it's one of the legacy hangups of JavaScript. [Blame `java.util.Date` apparently](https://stackoverflow.com/questions/2552483/why-does-the-month-argument-range-from-0-to-11-in-javascripts-date-constructor#answer-41992352).

<a name="dsqWhut"/>
###dateSquirrel sees days as indivisible
When you give dateSquirrel a date it assumes two things right off the bat:

1. You mean the **whole** of that day regardless of any time you may indicate
2. You want to **include** that day in whatever circumstance you're identifying (e.g day-a to day-n **includes** both day-a and day-n)

This means that if you asked for a range from now to 5 days hence, but excluding the third day, you would only need to indicate a point at any time during a day to indicate the whole day. e.g.

```javascript
const today = new Date(),
    // current time and date
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
    // 5 days hence at 00:00:00
    dayThree = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
    // 3 days hence at 00:00:00
```

![alt text][dsq_Timeline2]
[dsq_Timeline2]: https://s14.postimg.org/erp1c8gxt/dsq_Timeline2.jpg "Difference between Date.prototype and dateSquirrel"

<a name="Browser"/>
###Browser support

dateSquirrel supports recent(ish) browsers but needs access to the newer (but not bleeding-edge) JavaScript DOM methods & properties; [`Element.querySelector()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector), [`EventTarget.addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener), [`Element.closest()`](), [`Element.classList`]() and [`Node.insertBefore()`]()

<a name="Use"/>
##Use

<a name="Deployment"/>
###Deployment

####ES5
As dateSquirrel has no dependencies and setup is pretty simple. 

Include the script tag in the `<body>` (or `<head>` tag) and add the css to the `<head>` tag then add your date inputs to the `<body>`.

```html
<body>
	<head>
		<link rel="stylesheet" href="path/to/dsq.min.css">
	</head>
	<!-- page HTML -->
	<label for="#myDateInput">
        My label
        <input id="myDateInput" type="date" min="2017-04-01" max="2017-04-30" placeholder="Pick a date">
    </label>
	<!-- more page HTML -->
	<script>path/to/dsq.min.js</script>
	<!-- other scripts that are dependent on dsq -->
</body>
```

Initialise dateSquirrel in your JavaScript: 

```javascript
new dsq('#myDateInput');
```

N.B. It's recommended that you wrap the initialisation code in a listener that waits for the DOM to load before triggering if your input(s) are dynamically created

```javascript
document.addEventListener("DOMContentLoaded", function() { // Listen for DOM to be ready
	new dsq('#myDateInput'); // create new dateSquirrel instance
});
```

####ES6

```javascript
import dsq from './path/to/dsq.min.js';
new dsq('#myDateInput');
```

####CommonJS

```javascript
var dsq = require('./path/to/dsq.min.js');
new dsq('#myDateInput');
```

Don't forget to [set your options](#Options) if you don't like the defaults.

```javascript
new dsq('#myDateInput', {
   pattern: 'dx mmm yyyy' 
});
```


<a name="Conditions"/>
###Conditions for use

- Each instance of dateSquirrel must have a unique ID (on the `<input>`)
- A `<label>` must wrap the `<input>`
- Styling for fallbacks or [non-activating](#Activation) scenarios is not included, so you have to add your own (S)CSS for that
- Resetting and / or normalisation of your page styles is assumed (you can copy the reset used for the demo [here](#reset-file) if you don't have one)

<a name="Options"/>
##Options

```javascript
defaults = {
    start: new Date(), // first selectable day
    end: { // last selectable day
        d: new Date().getDate(),
        m: new Date().getMonth(),
        y: new Date().getFullYear() + 10
    },
    pattern: 'dx mmm yyyy', // visual output format (displayed in the input) 
    patternSave: 'yyyy,mm,dd', // data-date value output format 
    day: true, // if true then a day is selectable
    month: true, // if true then a month is selectable
    disableDates: false, // a list of Date objects or ranges [from, to] that define days to exclude as selectable
    markToday: true, // if true then the "today" indicator is shown
    primaryColour: '#1976d2', // sets main hover and CTA colour
    primaryTextColour: '#002171', // sets link and selected text colour
    textOnPrimaryColour: '#e1f5fe', // sets text colour when over CTA colour
    hideScrollbars: false, // if true then a scrollbars on year and month list are hidden (visual effect only)
    activation: function() { // if the function evaluates to true then dateSquirrel activates
        if (window.screen.width > 319) {
            return true;
        } else {
            return false;
        }
    },
    callback: function() {}, // optional callback fired on date completion
```

####`start` & `end` (array, function, Date)
The start and end of the range the user can select from. The range **includes** the start and end day.

Can be set with:
Literal dates (numbers) - d = day, m = month, y = year

```javascript
    // with literal dates
    new dsq('#eg0', {
        start: {
            d: 28, // the 28th day
            m: 1, // the SECOND month (February)
            y: 1990 // the full year
        },
        end: {
            d: 1, // the 1st day
            m: 6, // the SEVENTH month (July)
            y: 2000 // the full year
        } 
    });
```

Via individual functions that return numbers:

```javascript
    var today = new Date();
    new dsq('#eg1', {
        start: {
            d: 1, // Beginning of the month (1st)
            m: today.getMonth(), // Today's month
            y: today.getFullYear() + 1 // next year
        } 
    });

    // note: dsq automatically changes impossible dates **downward** to the nearest possible value 
    {
        d: 31, // becomes => 29
        m: 2, // March
        y: 2364 // leap year
        // result = 29th Mar 2364
    } 
    {
        d: 34, // becomes => 31
        m: 15, // becomes => 11 (December)
        y: 1999
        // result = 31st Dec 1999
    } 
```

Or via a date object:

```javascript
    new dsq('#eg2', {
        start: new Date(new Date().getFullYear() - 10, new Date().getMonth(), new Date().getDate()) 
        // ten years ago
    });

    // note: ranges INCLUDE start and end day
    // note: Months are expected as: 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec
```

####`pattern` & `patternSave` (text)
Sets the pattern that is displayed in the `<input>` (`pattern`) or the pattern saved to the `data-dsq-date` attribute of the `<input>`. [Pattern syntax and available formats](#formatting)

```javascript
    new dsq('#eg3', {
        pattern: 'wwww, dx mmmm yyyy', // e.g. Monday, 4th December 2017
        patternSave: 'd/m/yyyy', // e.g. 4/12/2017
    });
```

####`day` (boolean)
If set to `false` dateSquirrel **won't** prompt the user for a day and will assume that it should be the 1st of any selected month for the purposes of any callback or output. You can remove the day from the output with `pattern` &/or `patternSave`. (default `true`)

####`month` (boolean)
If set to `false` dateSquirrel **won't** prompt the user for a month and will assume that it should be the 1st of January for any selected year for the purposes of any callback or output. You can remove the month (& day) from the output with `pattern` &/or `patternSave`. Setting `month` to `false` also sets `day` to `false`. (default `true`)

N.B. There is no "year" option as you can disable that by setting the range (`start` & `end`) to be less than a year

####`disableDates` (array [number, Date, text])
Disable days, months, years, date ranges and recurring dates within the `start` & `end` range so they can't be selected by the user. Ranges and / or recurring dates can overlap.

```javascript
new dsq('#eg4', {
    disabledDates: [
        "wed", // recurring days ("mon", "tue",..., "sun")
        "11/25", // recurring dates ("mm/dd" n.b. 00/01 === January 1st)
        new Date(2019, 0, 31), // single dates (Date objects)
        [new Date(2008,3,15), new Date(2009,4,14)], // date ranges ([start, end]) N.B. inclusive of start and end dates
        2006, // whole years (1999, 2000,..., 2999)
        5 // recurring months (0, 1,..., 11)
    ]
});
```

#####text (recurring days and dates)
Dates that occur at regular intervals can be disabled either by day of the week - in the format `www` - or date - in the format `mm/dd`. These disable all instances of that day or date throughout the available range (between `start` & `end`).

```javascript
new dsq('#eg5', {
    disabledDates: [
        "wed", // recurring days ("mon", "tue",..., "sun")
        "11/25", // recurring dates ("mm/dd" n.b. 00/01 === January 1st)
    ]
});
```

#####number (Whole years and recurring months)
Disables the whole of a month (recurring) or year so it (and its child-days) can't be selected by the user.

```javascript
new dsq('#eg6', {
    disabledDates: [
        2006, // whole years (1999, 2000,..., 2999)
        5 // recurring months (0, 1,..., 11)
    ]
});
```

#####Single Date objects and ranges specified by Date objects
Specifies a single day to be disabled.

```javascript
new dsq('#eg7', {
    disabledDates: [
        new Date(2019, 0, 31), // 31st of January 2019
    ]
});
```

#####Date ranges specified by Date objects
Specifies a continuous range of days to be disabled.

```javascript
new dsq('#eg7', {
    disabledDates: [
        [new Date(2008,3,15), new Date(2009,4,14)], // From the 15th of April 2008 to the 14th of May 2009
    ]
});
```

N.B. inclusive of start and end dates
####`markToday` (boolean)
If set to `false` the indicator on the list of days showing the current day is disabled. (default `true`)

####`primaryColour` (text => CSS colour)
The background highlighting colour for items that are highlighted or selected. Accepts all valid CSS colours as a text string.

```javascript
new dsq('#eg8', {
    primaryColour: 'hsla(340, 82%, 52%, 0.95)'
});
```

####`primaryTextColour` (text => CSS colour)
The colour of the text when it is selected on a 'white' background. Accepts all valid CSS colours as a text string.

```javascript
new dsq('#eg9', {
    primaryTextColour: 'rgba(160, 12, 62, 1)'
});
```

####`textOnPrimaryColour` (text => CSS colour)
The colour of the text when its background is highlighted or selected (i.e. when on `primaryColour`). Accepts all valid CSS colours as a text string.

```javascript
new dsq('#eg10', {
    textOnPrimaryColour: '#fbfffe'
});
```

####`hideScrollbars` (boolean)
If set to `true`; hides the native scrollbars inside dateSquirrel.

```javascript
new dsq('#eg10', {
    hideScrollbars: false
});
```

**WARNING - Disabling scrollbars without replacement indicators / functionality can damage user experience**
####`activation` (function)
dateSquirrel checks this function to see if it should activate when it first loads. If the function returns `true` then it activates.

```javascript
new dsq('#eg11', {
    activation: function() { // if the function evaluates to true then dateSquirrel activates
        if (window.screen.width > 319) {
            return true;
        } else {
            return false;
        }
    }
});
```

N.B. This function only runs on initial activation, not on resize.

####`callback` (function)
A custom function fired when a user finishes changing the date.

```javascript
new dsq('#eg12', {
    callback: function() {
        console.log('Date set: ', this.date);
        console.log('The input element: ', this.input);
        console.log('The dateSquirrel wrapper: ', this.wrapper);
        console.log('Date in human format: ', this.human);
        console.log('Date in save format: ', this.save);
    }
});
```

#####Constants available in the callback function

| Constant | Description | Type | Example |
| :---- | :---- | :---- |
| `this.date` | Date set | Date | 'Wed Nov 13 2024 00:00:00 GMT+0000 (GMT Standard Time)' |
| `this.input` | The `<input>` element | DOM element | <input type="text" id="eg12"... | 
| `this.wrapper` | The `<div>` element added by dateSquirrel | DOM element | <div class="dsq"... | 
| `this.human` | The date set in the format specified by `pattern` | text | "13th Nov 2024" | 
| `this.save` | The date set in the format specified by `patternSave` | text | "2024,11,13" | 

<a name="formatting"/>
##Date output formatting

| Syntax | Description | Example |
| :---- | :---- | :---- |
| d | Day of month | 1, 2, ..., 31 |
| dx | Day of month with ordinal suffix | 1st, 2nd, ..., 31st | 
| dd | Day of month with leading zero (if required) | 01, 02, ..., 31 | 
| w | Day of week (numeric) | 0, 1, ..., 6 | 
| ww | Day of week abbreviated to two letters | Su, Mo, ..., Sa | 
| www | Day of week abbreviated to three letters | Sun, Mon, ..., Sat |
| wwww | Day of week unabbreviated | Sunday, Monday, ..., Saturday |
| m | The month | 1, 2, ..., 12 | 
| mx | The month with ordinal suffix | 1st, 2nd, ..., 12th | 
| mm | The month with leading zero if required. | 01, 02, ..., 12 | 
| mmm | The month abbreviated to three letters | Jan, Feb, ..., Dec |  
| mmmm | The month unabbreviated | "Monday" to "Sunday" | 
| yy | The month of the year between 1-12. | "1" to "12" | 
| yyyy | The month of the year with leading zero if required. | January, February, ..., December | 

**N.B. The dateSquirrel parser returns dates in human-readable formats. e.g. January = 1 or 01**

<a name="Methods"/>
##Methods (Getters)

dateSquirrel has a few methods you can use to modify an existing instance. All methods assume you have attached the instance to a JavaScript variable like so:

```javascript
const myDsq = new dsq('#theInputsId', options);
```

<a name="destroy"/>
###Destroy an instance

```javascript
myDsq.destroy();
``` 

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| none | nemo | keiner | hakuna |

Removes all listeners and additional HTML added by dateSquirrel and returns the `<input>` field and `<label>` to the state it found them in. Doesn't accept arguments.

```javascript
const myDsq = new dsq('#theInputsId', options);
myDsq.destroy();
```  

<a name="getValue"/>
###Get the current value 

```javascript
myDsq.getValue([pattern]);
``` 

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| pattern | The date to modify | text string | `'dx of mmmm, yyyy'` |

dateSquirrel doesn't mess with the standard `element.value` so you can use that to get the human-readable value (same format as `options.pattern`) if you like. However you might want something a bit spicier so you can get the `Date` object with:

```javascript
const myDsq = new dsq('#theInputsId', options);

console.log(myDsq.getValue());

``` 

####But wait; there's more

As dateSquirrel has a date parser, like, [right there](#format), it seemed churlish to not to use it. Pass a [pattern](#formatting) as a parameter (e.g. `'dd-mm-yy'`) and dateSquirrel will format the value before it returns it.

```javascript
const myDsq = new dsq('#theInputsId', options);

console.log(myDsq.getValue('wwww the dx')); // e.g. 'Wednesday the 6th'

``` 

<a name="Helper"/>
##Helper functions

dateSquirrel uses a bunch of micro-functions to work out dates and ranges and stuff like that. Since they are not doing anything in particular in their downtime, they have been exposed so you can use them in your own code as date helpers. All these functions operate with no impact on any instance of dateSquirrel and don't require an instance on the page to work.

<a name="modMonths"/>
###`dsq.modMonths(date, add)`

Modifies a date by a number of months (positive or negative).

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| date | The date to modify | Date Object | `new Date()` |
| add | The number of months to increase (+) or decrease (-) by | number | -n, ..., -2, -1, 1, 2, 3, ..., n |


```javascript
const someDay = new Date(2000, 0, 1);

console.log(dsq.modMonths(someDay, -1)); // Wed Dec 01 1999
```

<a name="countMonths"/>
###`dsq.countMonths(startDate, endDate [, whole])`

Counts the number of (optionally whole) calendar months between two dates. 

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| startDate | The date to count from | Date Object | `new Date()` |
| endDate | The date to count to | Date Object | `new Date()` |
| whole | Whether to return whole months (1st to nth) or months (yth to yth) counted | boolean | `true` or `false` |

####`whole` (optional)
When `whole` is set to `true` dateSquirrel looks to see if the 1st to the nth (28th-31st) of the month are included in their entirety before counting a month. In the example below setting `whole` to `true` means that the first "whole" month is counted on Feb (month 1) the 29th (it was a leap year) 2000 and the last one is counted on Nov (month 10) the 31st 2003. However if `whole` is set to `false` (default setting if omitted) then the first month is counted on Feb (month 1) the **20th**and the last is counted on **Dec (month 11)** the **20th** 2003. So setting to false in this instance means an additional month counted.

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);

console.log(dsq.countMonths(someDay, someOtherDay, true)); // 46
console.log(dsq.countMonths(someDay, someOtherDay, false)); // 47
```

<a name="isBetweenDates"/>
###`dsq.isBetweenDates(test,start,end)`

Checks to see if a date falls between two other dates and returns `true` if it is. Being on the first or last day is considered within the range.

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| test | The date to check | Date Object | `new Date()` |
| start | The start of the range to check | Date Object | `new Date()` |
| end | The end of the range to check | Date Object | `new Date()` |


```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21),
    thatDay = new Date(2002, 7, 15);
console.log(dsq.isBetweenDates(thatDay,someDay,someOtherDay)); // true
```

<a name="isSameDay"/>
###`dsq.isSameDay(date1,date2)`

Checks to see if a date is the on the same **day** (and same month & year) as another date and returns `true` if it is.

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| date1 | The first date to check | Date Object | `new Date()` |
| date2 | The second date to check | Date Object | `new Date()` |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.isSameDay(someDay,someOtherDay)); // false
```

<a name="daysInMonth"/>
###`dsq.daysInMonth(year,month)`

Returns the number of days in any given month. It accounts for leap years. 

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| year | The year containing the month to check | Number | 1899, 1900, 1901, ..., 2999 |
| month | The month to check | Number | 0, 1, 2,..., 11 |

```javascript
const year = 2000, 
    month = 1; // February
console.log(dsq.daysInMonth(year,month)); // 29 (Leap year)
```

<a name="dayOfYear"/>
###`dsq.dayOfYear(date)`

Returns the number of a day in its year from a date object, between 1 and 366 (where January the 1st === `1`, December the 31st in 2000 would return `366` [leap year] & while December 31st 2003 would return `365`.

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| date | The date to check | Date Object | `new Date()` |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.dayOfYear(someDay)); // 20
console.log(dsq.dayOfYear(someOtherDay)); // 355
```

<a name="daysBetween"/>
###`dsq.daysBetween(startDate, endDate)`

Returns the number of days between two dates (accounting for leap years).

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| startDate | The date to count from | Date Object | `new Date()` |
| endDate | The date to count to | Date Object | `new Date()` |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.daysBetween(someDay, someOtherDay)); // 1431
```

<a name="format"/>
###`dsq.format(date, format)`

Formats the given date according to the dateSquirrel [date formats](#formatting). N.B. Output formats are human-readable (i.e. January = 1)

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| date | The date to format | Date Object | `new Date()` |
| format | The desired output format | Text string | 'wwww, dd/mm/yyyy' |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.daysBetween(someDay, someOtherDay)); // 1431
```

<a name="format"/>
###`dsq.format(date, format)`

Formats the given date according to the dateSquirrel [date formats](#formatting). N.B. Output formats are human-readable (i.e. January = 1)

| Argument | Description | Type | Example |
| :---- | :---- | :---- |
| date | The date to format | Date Object | `new Date()` |
| format | The desired output format | Text string | 'wwww, dd/mm/yyyy' |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.daysBetween(someDay, someOtherDay)); // 1431
```


<a name="Setup"/>
##Setup (for development)

<a name="requirements"/>
###Build requirements

To use the build environment, your computer needs:

- [NodeJS](https://nodejs.org/en/) (v6.xx or greater)
- [Git](https://git-scm.com/)
- Gulp version 4 or greater must be installed globally (e.g. `npm install gulpjs/gulp#4.0 -g`) before installing locally (["Why do we need to install gulp globally and locally?" - Stack Overflow](https://stackoverflow.com/questions/22115400/why-do-we-need-to-install-gulp-globally-and-locally))

<a name="Cloning"/>
###Cloning & installation

```bash
git clone https://bitbucket.org/tymothtym/datesquirrel.git [your_project_name]

cd [your_project_name]

npm install
```

<a name="Developing"/>
###Developing locally

To create uncompressed assets and fire up Gulp, Webpack et al on a local webserver:

```bash
gulp
```

or

```bash
npm start
```

A test site site will be created in a folder called `dist`. To view; navigate to this URL (it should pop up in your default browser on it's own when you first run the command):

```
http://localhost:8042
```

<a name="Building"/>
###Building for production

To create compressed assets:

```bash
gulp build --production
```

or

```bash
npm run build
```

These will be put into a the `dist` folder

