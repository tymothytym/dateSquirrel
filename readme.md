# dateSquirrel
A date picker with a nutty tang
##### Release: Version: 0.2.0
##### In master: Version: 0.2.1
![dateSquirrel Demo](https://media.giphy.com/media/l0HUo04xCeDlNmVeU/giphy.gif)

| File | Type | Size |
| :---- | :---- | :---- |
| dsq.css | style | 14.1 KB |
| dsq.min.css | style | 10.1 KB |
| **dsq.min.css.gz** | **style** | **1.76 KB** |
| dsq.js | functions | 81.0 KB |
| dsq.min.js | functions | 32.8 KB |
| **dsq.min.js.gz** | **functions** | **7.99 KB** |

## TODO - This is an alpha-stage project
- [ ] Uncrappify open and close animation
- [ ] Fix keyboard navigation (tab out)
- [ ] Tidy up / correct readme
- [ ] Optimise

## Table of Contents
- [About](#About)
- [Before you get started](#warning)
    * [Months start at 0](#monthsStart)
    * [dateSquirrel sees days as indivisible](#dsqWhut)
    * [Browser support](#Browser)
- [Use](#Use)
    * [Deployment](#Deployment)
    * [Conditions](#Conditions)
- [Options](#Options)
    * [`start` & `end` (array, function, Date)](#startEnd)
    * [`initial` (text)](#initial)
    * [`pattern` & `patternSave` (text)](#pattern)
    * [`day`](#day)
    * [`month`](#month)
    * [`disableDates`](#disableDates)
    * [`markToday`](#markToday)
    * [`hideScrollbars`](#hideScrollbars)
    * [`activation`](#activation)
    * [`callback`](#callback)
- [Date output formatting](#formatting)
- [Methods & Getters](#Methods)
    * [Destroy an instance](#destroy)
    * [Get the current value](#getValue)
    * [Set the current value](#setValue)
- [Helper functions](#Helper)
    * [Change date by `n` months](#modMonths)
    * [Count months between dates](#countMonths)
    * [Check if a date is between two other dates](#isBetweenDates)
    * [Check if two dates are the same day](#isSameDay)
    * [Get days in a month](#daysInMonth)
    * [Get the day of the year](#dayOfYear)
    * [Get days between two dates](#daysBetween)
    * [Format a date](#format)
- [Setup (for development)](#Setup)
    * [Build requirements](#requirements)
    * [Cloning & installation](#Cloning)
    * [Developing locally](#Developing)
    * [Cloning & installation](#Cloning)
    * [Building for production](#Building)

<a name="About"/></a>
## About
dateSquirrel is a date picker with calendar dates. It's modal-free, dependency-free, library-free and free-free. The aim is to put the date picking into a single field and make it so you can pick any date in three clicks. It's not trying to be better than other date pickers, just a bit different. dateSquirrel is for wide date possibilities (like date of birth) that are a pain to pick when you have to navigate through several decades worth of months to get to the date you want.

<a name="warning"/></a>
## Before you get started
<a name="monthsStart"/></a>
### Months start at 0
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

It's not because dateSquirrel was made by a crazy person (that's simply a coincidence), it's one of the legacy hangups of JavaScript. [Blame `java.util.Date` apparently](https://stackoverflow.com/questions/2552483/why-does-the-month-argument-range-from-0-to-11-in-javascripts-date-constructor#answer-41992352).

<a name="dsqWhut"/></a>
### dateSquirrel sees days as indivisible
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

![Difference between Date.prototype and dateSquirrel](https://s14.postimg.org/erp1c8gxt/dsq_Timeline2.jpg)

<a name="Browser"/></a>
### Browser support

dateSquirrel supports recent(ish) browsers but needs access to the newer (but not bleeding-edge) JavaScript DOM methods & properties; [`Element.querySelector()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector), [`EventTarget.addEventListener()`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) and [`Element.classList`](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList).

<a name="Use"/></a>
## Use

<a name="Deployment"/></a>
### Deployment

#### ES5
As dateSquirrel has no dependencies and setup is pretty simple. 

Include the script tag in the `<body>` (or `<head>` tag) and add the css to the `<head>` tag then add your date inputs to the `<body>`.

```html
<body>
    <head>
        <link rel="stylesheet" href="path/to/dsq.min.css">
    </head>
	<!-- page HTML -->
	<label for="#myDateInput">My label
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

#### ES6

```javascript
import dsq from './path/to/dsq.min.js';
new dsq('#myDateInput');
```

#### CommonJS (untested!)

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

<a name="Conditions"/></a>
### Conditions for use

- Each instance of dateSquirrel must have a unique ID (on the `<input>`)
- A `<label>` must wrap the `<input>`
- Styling for fallbacks or [non-activating](#Activation) scenarios is not included, so you have to add your own (S)CSS for that
- Resetting and / or normalisation of your page styles is assumed (you can copy the reset used for the demo [here](#reset-file) if you don't have one)

<a name="Options"/></a>
## Options

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
}
```

<a name="startEnd"/></a>
### `start` & `end` (array, function, Date)
The start and end of the range the user can select from. The range **includes** the start and end day.

#### Can be set with...
##### Numbers 
Where `d` = day, `m` = month and `y` = year

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

##### Functions (that return numbers)

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
        m: 1, // February
        y: 2364 // leap year
        // result = 29th Feb 2364
    } 
    // or even:
    {
        d: 34, // becomes => 31
        m: 15, // becomes => 11 (December)
        y: 1999
        // result = 31st Dec 1999
    } 
```

##### `Date()` objects

```javascript
    new dsq('#eg2', {
        start: new Date(new Date().getFullYear() - 10, new Date().getMonth(), new Date().getDate()) 
        // ten years ago
    });

    // note: ranges INCLUDE start and end day
    // note: Months are expected as: 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec
```
<a name="initial"/></a>
### `initial` (text)
The initial date (visible to the user and programatically set) an input will be set to.

```javascript
    new dsq('#eg03', {
        initial: '4/12/2022', // e.g. Monday, 4th December 2022
    });
```
##### Caveats!
- dateSquirrel doesn't check to see if the initial date is within the range specified (you can use the [`isBetweenDates`](#isBetweenDates) function to check prior to passing to dateSquirrel if you need to)
- dateSquirrel will try and parse the entered date using it's internal parser: this __only__ accepts a **UK date format** like dd-mm-yyyy, dd mm yyyy, dd/mm/yy

<a name="pattern"/></a>
### `pattern` & `patternSave` (text)
Sets the pattern that is displayed in the `<input>` (`pattern`) or the pattern saved to the `data-dsq-date` attribute of the `<input>`. [Pattern syntax and available formats](#formatting)

```javascript
    new dsq('#eg3', {
        pattern: 'wwww, dx mmmm yyyy', // e.g. Monday, 4th December 2017
        patternSave: 'd/m/yyyy', // e.g. 4/12/2017
    });
```

<a name="day"/></a>
### `day` (boolean)
If set to `false` dateSquirrel **won't** prompt the user for a day and will assume that it should be the 1st of any selected month for the purposes of any callback or output. You can remove the day from the output with `pattern` &/or `patternSave`. (default `true`)


<a name="month"/></a>
### `month` (boolean)
If set to `false` dateSquirrel **won't** prompt the user for a month and will assume that it should be the 1st of January for any selected year for the purposes of any callback or output. You can remove the month (& day) from the output with `pattern` &/or `patternSave`. Setting `month` to `false` also sets `day` to `false`. (default `true`)

N.B. There is no "year" option as you can disable that by setting the range (`start` & `end`) to be less than a year

<a name="disableDates"/></a>
### `disableDates` (array [number, Date, text])
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

#### text (recurring days and dates)
Dates that occur at regular intervals can be disabled either by day of the week - in the format `www` - or date - in the format `mm/dd`. These disable all instances of that day or date throughout the available range (between `start` & `end`).

```javascript
new dsq('#eg5', {
    disabledDates: [
        "wed", // recurring days ("mon", "tue",..., "sun")
        "11/25", // recurring dates ("mm/dd" n.b. 00/01 === January 1st)
    ]
});
```

#### number (Whole years and recurring months)
Disables the whole of a month (recurring) or year so it (and its child-days) can't be selected by the user.

```javascript
new dsq('#eg6', {
    disabledDates: [
        2006, // whole years (1999, 2000,..., 2999)
        5 // recurring months (0, 1,..., 11)
    ]
});
```

#### Single Date objects and ranges specified by Date objects
Specifies a single day to be disabled.

```javascript
new dsq('#eg7', {
    disabledDates: [
        new Date(2019, 0, 31), // 31st of January 2019
    ]
});
```

#### Date ranges specified by Date objects
Specifies a continuous range of days to be disabled.

```javascript
new dsq('#eg7', {
    disabledDates: [
        [new Date(2008,3,15), new Date(2009,4,14)], // From the 15th of April 2008 to the 14th of May 2009
    ]
});
```

N.B. inclusive of start and end dates

<a name="markToday"/></a>
### `markToday` (boolean)
If set to `false` the indicator on the list of days showing the current day is disabled. (default `true`)

<a name="hideScrollbars"/></a>
### `hideScrollbars` (boolean)
If set to `true`; hides the native scrollbars inside dateSquirrel.

```javascript
new dsq('#eg10', {
    hideScrollbars: false
});
```

**WARNING - Disabling scrollbars without replacement indicators / functionality can damage user experience**

<a name="activation"/></a>
### `activation` (function)
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

<a name="callback"/></a>
### `callback` (function)
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

#### Constants available in the callback function

| Constant | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| `this.date` | Date set | Date | 'Wed Nov 13 2024 00:00:00 GMT+0000 (GMT Standard Time)' |
| `this.input` | The `<input>` element | DOM element | <input type="text" id="eg12"... | 
| `this.wrapper` | The `<div>` element added by dateSquirrel | DOM element | <div class="dsq"... | 
| `this.human` | The date set in the format specified by `pattern` | text | "13th Nov 2024" | 
| `this.save` | The date set in the format specified by `patternSave` | text | "2024,11,13" | 

<a name="formatting"/></a>
## Date output formatting

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
| mmmm | The month unabbreviated | January, February, ..., December | 
| yy | The year abbreviated | 00, 01, 02, ..., 99 | 
| yyyy | The year unabbreviated | 1900, 1901, 1902, ..., 1999 | 

**N.B. The dateSquirrel parser returns dates in human-readable formats. e.g. January = 1 or 01**

<a name="Methods"/></a>
## Methods & Getters

dateSquirrel has a few ways you can use to modify an existing instance or get things from it. All methods assume you have attached the instance to a JavaScript variable like so:

```javascript
const myDsq = new dsq('#theInputsId', options);
```

<a name="destroy"/></a>
### Destroy an instance

```javascript
myDsq.destroy();
``` 

| Argument | Description | Type | Example | Returns |
| :---- | :---- | :---- | :---- | :---- |
| none | nemo | keiner | hakuna | nada |

Removes all listeners and additional HTML added by dateSquirrel and returns the `<input>` field and `<label>` to the state it found them in. Doesn't accept arguments.

```javascript
const myDsq = new dsq('#theInputsId', options);
myDsq.destroy();
```  

<a name="getValue"/></a>
### Get the current value 

```javascript
myDsq.getValue([pattern]);
``` 

| Argument | Description | Type | Example | Returns |
| :---- | :---- | :---- | :---- | :---- |
| pattern | The date to modify | text string | `'dx of mmmm, yyyy'` | date object or string |

dateSquirrel doesn't mess with the standard `element.value` so you can use that to get the human-readable value (same format as `options.pattern`) if you like. However you might want something a bit spicier so you can get the `Date` object with:

```javascript
const myDsq = new dsq('#theInputsId', options);

console.log(myDsq.getValue());
``` 

#### But wait; there's more

As dateSquirrel has a date formatter, like, [right there](#format), it seemed churlish to not to use it. Pass a [pattern](#formatting) as a parameter (e.g. `'dd-mm-yy'`) and dateSquirrel will format the value before it returns it.

```javascript
const myDsq = new dsq('#theInputsId', options);

console.log(myDsq.getValue('wwww the dx')); // e.g. 'Wednesday the 6th'
``` 
<a name="setValue"/></a>
### Set the current value 

```javascript
myDsq.setValue(valueAsString);
``` 
***This function expects a human readable date (01/02/2003, 1st Feb 2003) - it will do its best to interpret it***

| Argument | Description | Type | Example | Returns |
| :---- | :---- | :---- | :---- |
| valueAsString | The date to set | text string | `'1-1-01'` | none |

This function simply sets the visible and programatic values of the input filed and dateSquirrel to the given date. It expects a string but you can use the [inbuilt parser](#format) if you need to convert from an object.

```javascript
const myDsq = new dsq('#theInputsId', options);

myDsq.setValue('01.01.2001'); // 1st Jan 2001

// or with a Date object

const newDate = new Date(1,0,2001);

myDsq.setValue(dsq.format(newDate,'dd/mm/yyyy')); // 1st Jan 2001
``` 

<a name="Helper"/></a>
## Helper functions

dateSquirrel uses a bunch of micro-functions to work out dates and ranges and stuff like that. Since they are not doing anything in particular in their downtime, they have been exposed so you can use them in your own code as date helpers. All these functions operate with no impact on any instance of dateSquirrel and don't require an instance on the page to work.

<a name="modMonths"/></a>
### Change date by `n` months
```javascript
dsq.modMonths(date, modBy)
```

Modifies a date by a number of months (positive or negative).

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| date | The date to modify | Date Object | `new Date()` |
| modBy | The number of months to increase (+) or decrease (-) by | number | -n, ..., -2, -1, 1, 2, 3, ..., n |


```javascript
const someDay = new Date(2000, 0, 1);

console.log(dsq.modMonths(someDay, -1)); // Wed Dec 01 1999
```

<a name="countMonths"/></a>
### Count months between dates
```javascript
dsq.countMonths(startDate, endDate [, whole])
```

Counts the number of (optionally whole) calendar months between two dates. 

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| startDate | The date to count from | Date Object | `new Date()` |
| endDate | The date to count to | Date Object | `new Date()` |
| whole | Whether to return whole months (1st to nth) or months (yth to yth) counted | boolean | `true` or `false` |

#### `whole` (optional)
When `whole` is set to `true` dateSquirrel looks to see if the 1st to the nth (28th-31st) of the month are included in their entirety before counting a month. In the example below setting `whole` to `true` means that the first "whole" month is counted on Feb (month 1) the 29th (it was a leap year) 2000 and the last one is counted on Nov (month 10) the 31st 2003. However if `whole` is set to `false` (default setting if omitted) then the first month is counted on Feb (month 1) the **20th**and the last is counted on **Dec (month 11)** the **20th** 2003. So setting to false in this instance means an additional month counted.

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);

console.log(dsq.countMonths(someDay, someOtherDay, true)); // 46
console.log(dsq.countMonths(someDay, someOtherDay, false)); // 47
```

<a name="isBetweenDates"/></a>
### Check if a date is between two other dates
```javascript
dsq.isBetweenDates(test,start,end)
```

Checks to see if a date falls between two other dates and returns `true` if it is. Being on the first or last day is considered within the range.

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| test | The date to check | Date Object | `new Date()` |
| start | The start of the range to check | Date Object | `new Date()` |
| end | The end of the range to check | Date Object | `new Date()` |


```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21),
    thatDay = new Date(2002, 7, 15);
console.log(dsq.isBetweenDates(thatDay,someDay,someOtherDay)); // true
```

<a name="isSameDay"/></a>
### Check if two dates are the same day
```javascript
dsq.isSameDay(date1,date2)
```

Checks to see if a date is the on the same **day** (and same month & year) as another date and returns `true` if it is.

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| date1 | The first date to check | Date Object | `new Date()` |
| date2 | The second date to check | Date Object | `new Date()` |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.isSameDay(someDay,someOtherDay)); // false
```

<a name="daysInMonth"/></a>
### Get days in a month
```javascript
dsq.daysInMonth(year,month)
```

Returns the number of days in any given month. It accounts for leap years. 

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| year | The year containing the month to check | Number | 1899, 1900, 1901, ..., 2999 |
| month | The month to check | Number | 0, 1, 2,..., 11 |

```javascript
const year = 2000, 
    month = 1; // February
console.log(dsq.daysInMonth(year,month)); // 29 (Leap year)
```

<a name="dayOfYear"/></a>
### Get the day of the year
```javascript
dsq.dayOfYear(date)
```

Returns the number of a day in its year from a date object, between 1 and 366 (where January the 1st === `1`, December the 31st in 2000 would return `366` [leap year] & while December 31st 2003 would return `365`.

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| date | The date to check | Date Object | `new Date()` |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.dayOfYear(someDay)); // 20
console.log(dsq.dayOfYear(someOtherDay)); // 355
```

<a name="daysBetween"/></a>
### Get days between two dates
```javascript
dsq.daysBetween(startDate, endDate)
```

Returns the number of days between two dates (accounting for leap years).

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| startDate | The date to count from | Date Object | `new Date()` |
| endDate | The date to count to | Date Object | `new Date()` |

```javascript
const someDay = new Date(2000, 0, 20),
    someOtherDay = new Date(2003, 11, 21);
console.log(dsq.daysBetween(someDay, someOtherDay)); // 1431
```

<a name="format"/></a>
### Format a date
```javascript
dsq.format(date, format)
```

Formats the given date according to the dateSquirrel [date formats](#formatting). N.B. Output formats are human-readable (i.e. January = 1)

| Argument | Description | Type | Example |
| :---- | :---- | :---- | :---- |
| date | The date to format | Date Object | `new Date()` |
| format | The desired output format | Text string | 'wwww, dd/mm/yyyy' |

```javascript
const someDay = new Date(2000, 0, 20);
console.log(dsq.format(someDay, 'dd/mm/yy')); // 20/01/00
```

<a name="Setup"/></a>
## Setup (for development)

<a name="requirements"/></a>
### Build requirements

To use the build environment, your computer needs:

- [Node.js v6.xx or greater](http://nodejs.org) (On mac, you can install via [homebrew](http://brew.sh/): `brew install node`)
- [Brunch](http://brunch.io): Install brunch globally `npm install -g brunch` or `sudo npm install -g brunch`
- [Git](https://git-scm.com/)

<a name="Cloning"/></a>
### Cloning & installation

This will create a local instance of the repo on your machine using the Master branch

```bash
git clone https://github.com/tymothtym/dateSquirrel.git [your_project_name]

cd [your_project_name]

npm install
```

<a name="Developing"/></a>
### Developing locally

To create uncompressed assets and fire the HTTP server and watch processes via Brunch:

```bash
npm run start

# or

brunch watch --server --port 4444
```
This will also launch HTTP server with [pushState](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history) at [localhost:4444](http://localhost:4444)

The test site is created in a folder called `public` and includes a page of simple tests to see if the build is working correctly. You can see the site by navigating to:

```
http://localhost:4444
```

<a name="Building"/></a>
### Building for production

To create compressed assets:

```bash
npm run build

#or

brunch build --production
```

These will be put into a the `public/` folder. The dateSquirrel plugin files are all in `public/dist`

### Other notes:
* `public/` directory is auto-generated and served by HTTP server.  Make your changes in the `app/` directory.
* Place static files you want to be copied in `app/assets/`. These will be copied (untouched) to `public/`.

### Plugins used:
* [Brunch](http://brunch.io), [Getting started guide](https://github.com/brunch/brunch-guide#readme)
* [SASS](http://sass-lang.com/), using the scss syntax and the [7-1 architecture pattern](http://sass-guidelin.es/#architecture) and sticking to [Sass Guidelines](http://sass-guidelin.es) writing conventions.
* [html-brunch-static](https://github.com/bmatcuk/html-brunch-static) enables [handlebars](http://handlebarsjs.com/) precompiled templates.
* [Handlebars](http://handlebarsjs.com) Static site templating structure is written in `layouts`, `partials`, and `pages` (part of html-brunch-static).
* [postcss](https://github.com/postcss/postcss) inc. [autoprefixer](https://github.com/postcss/autoprefixer) which uses [can-i-use](http://caniuse.com/) to vendor-prefix more current (S)CSS to be backward compatible with the last 3 major browser versions.