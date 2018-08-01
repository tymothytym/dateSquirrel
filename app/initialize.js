"use strict";

// --------------------------------------------------------
// Imports
// --------------------------------------------------------

//import dsq from 'dsq/dsq';

console.log('initialize.js');

//******************************************
// page functions
//******************************************

// ...back to top
function bttVisibility () {
    if (document.documentElement.scrollTop >= window.innerHeight) {
        document.querySelector('footer a.navigation-icon').classList.add('dsq-shown');
    } else {
        document.querySelector('footer a.navigation-icon').classList.remove('dsq-shown');
    }
}
document.addEventListener("scroll", bttVisibility, false);
// date helpers
function addDays(d, days) {
  var dat = new Date(d.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
}
function pastNine(n) {
  return new Date().getHours() > 9 ? n : 0;
}
function futureDate() {
    var today = new Date(),
        uiDate = today.toLocaleString('en-gb', { weekday: "short" }).slice(0, 2),
        dueBy;
    if (uiDate === 'Mo') {
        dueBy = addDays(today, 3 + pastNine(1));
    } else if (uiDate === 'Tu') {
        dueBy = addDays(today, 3 + pastNine(5));
    } else if (uiDate === 'We' || uiDate === 'Th' || uiDate === 'Fr') {
        dueBy = addDays(today, 5 + pastNine(1));
    } else if (uiDate === 'Sa') {
        dueBy = addDays(today, 5);
    } else {
        dueBy = addDays(today, 4);
    }
    return dueBy;
}
function daysInMonth(y,m) { // expects JS month
    let isLeap = ((y % 4) == 0 && ((y % 100) != 0 || (y % 400) == 0));
    return [31, (isLeap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
}
function threeHence() {
// a simple function to calculate the date three days in the future excluding weekends
    let today = new Date(),
        dayName = today.toLocaleString('en-gb', { weekday: "short" }),
        workDaysHence,
        addD = function addDays(d, days) {
            return new Date(d.valueOf()).setDate(new Date(d.valueOf()).getDate() + days);
        };
    if (dayName === 'Mon' || dayName === 'Tue') {
        workDaysHence = addD(today, 3);
    } else if (dayName === 'Wed' || dayName === 'Thu' || dayName === 'Fri' || dayName === 'Sat') {
        workDaysHence = addD(today, 5);
    } else {
        workDaysHence = addD(today, 4);
    }
    return new Date(workDaysHence);
}
function diffInDays(earlier, later) {
    var oneDay = 24*60*60*1000, // hours*minutes*seconds*milliseconds
        firstDate = parse(earlier),
        secondDate = parse(later);
    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
}
// utility functions
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function randomKey(data) {
    return data.length === undefined ? Object.keys(qData)[Math.floor((Math.random() * Object.keys(data).length))] : data[Math.floor((Math.random() * data.length))];
}

//******************************************
// page runtime
//******************************************

//console.log('page.js');

//******************************************
// onload
//******************************************

window.onload = function() {
    // examples initialisation
    let today = new Date();

    new dsq('#eg0');
    new dsq('#eg1', {
        pattern: 'dx mmm yyyy'
    });
    new dsq('#eg2', {
        pattern: 'wwww, dx mmmm yyyy'
    });
    new dsq('#eg03', {
        initial: '4/12/2022', // e.g. Monday, 4th December 2022
    });
    new dsq('#eg3', {
        start: new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()),
        end: {
            d: today.getDate(), 
            m: today.getMonth(), // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec
            y: today.getFullYear() + 1 
        }
    });
    new dsq('#eg4', {
        start: function() {
            // a simple function to calculate the date three days in the future excluding weekends
            var today = new Date(),
                dayName = today.toLocaleString('en-gb', { weekday: "short" }),
                workDaysHence,
                addD = function addDays(d, days) {
                    return new Date(d.valueOf()).setDate(new Date(d.valueOf()).getDate() + days);
                };
            if (dayName === 'Mon' || dayName === 'Tue') {
                workDaysHence = addD(today, 3);
            } else if (dayName === 'Wed' || dayName === 'Thu' || dayName === 'Fri' || dayName === 'Sat') {
                workDaysHence = addD(today, 5);
            } else {
                workDaysHence = addD(today, 4);
            }
            return new Date(workDaysHence);
        },
        end: new Date(today.getFullYear(), today.getMonth() + 2, 1) // the first of the month following next
    });
    new dsq('#eg5', {
        day: false,
        pattern: 'mmm \'yy'
    });
    new dsq('#eg6', {
        day: false,
        month: false,
        pattern: 'yyyy'
    });
    new dsq('#eg7', {
        // beginning of this month
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        // end of this month
        end: {
            d: 32, // becomes => last of month
            m: today.getMonth(), // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec
            y: today.getFullYear()
        }
    });
    var firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    new dsq('#eg8', {
        start: new Date(2000,0,1),
        end:  new Date(2020,6,10),
        disabledDates: [
            "wed", // recurring days ("mon", "tue",..., "sun")
            "11/25", // recurring dates ("mm/dd" n.b. 00/01 === January 1st)
            new Date(2019, 0, 31), // single dates (Date objects)
            //[new Date(2015,3,15), new Date(2017,3,15)], // date ranges ([Date object, Date object])
            //[new Date(2010,11,25), new Date(2011,1,15)], // date ranges ([Date object, Date object])
            [new Date(2008,3,15), new Date(2008,4,14)], // date ranges ([Date object, Date object])
            //[new Date(2012,0,1), new Date(2012,11,31)], // date ranges ([Date object, Date object])
            //[new Date(2010,0,1), new Date(2018,11,31)], // date ranges ([Date object, Date object])
            //[new Date(2010,0,1), new Date(2018,11,25)], // date ranges ([Date object, Date object])
            //[new Date(2010,0,31), new Date(2018,11,31)], // date ranges ([Date object, Date object])
            //[new Date(2010,0,2), new Date(2011,11,30)], // date ranges ([Date object, Date object])
            //[new Date(2000,0,1), new Date(2001,11,31)], // date ranges ([Date object, Date object])
            //[new Date(2002,7,2), new Date(2003,9,22)], // date ranges ([Date object, Date object])
            [new Date(2000,7,2), new Date(2003,9,22)], // date ranges ([Date object, Date object])
            //[new Date(2000,7,2), new Date(2003,0,31)], // date ranges ([Date object, Date object])
            [new Date(2001,7,2), new Date(2003,0,31)], // date ranges ([Date object, Date object])
            //[new Date(2017,7,2), new Date(2017,7,31)], // date ranges ([Date object, Date object])
            [new Date(2010,0,1), new Date(2013,0,14)], // date ranges ([Date object, Date object])
            //[new Date(2016,6,1), new Date(2018,0,14)], // date ranges ([Date object, Date object])
            [new Date(2014,6,1), new Date(2016,2,14)], // date ranges ([Date object, Date object])
            2006, // whole years (1999, 2000,..., 2999)
            5, // recurring months (0, 1,..., 11)
            //function(){}
        ]
    });
    new dsq('#eg9', {
        start: new Date(2020,0,1),
        end: new Date(2020,3,30)
    });
    new dsq('#eg10', {
        primaryColour: 'hsla(340, 82%, 52%, 0.95)',
        primaryTextColour: 'rgba(160, 12, 62, 1)',
        textOnPrimaryColour: '#fbfffe'
    });
    var egtest = new dsq('#eg11', {
            activation: function() {
                if (window.innerWidth > 1024) {
                    return true;
                } else {
                    return false;
                }
            }
        });
	//console.log('Date egtest: ', egtest.getValue('dd/mm/yy'));
    //egtest.destroy();
    new dsq('#eg12', {
        activation: function() {
            if (window.innerWidth > 1024) {
                return true;
            } else {
                return false;
            }
        }
    });
    new dsq('#eg13', {
        callback: function() {
            alert('The date set is: ' + this.date);
            console.log('Date set: ', this.date);
            console.log('The input element: ', this.input);
            console.log('The dateSquirrel wrapper: ', this.wrapper);
            console.log('Date in human format: ', this.human);
            console.log('Date in save format: ', this.save);
        }
    });
    new dsq('#eg14', {
        start:  {
            d: 1, 
            m: 10, // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec
            y: 2029 
        },
        end: {
            d: 32, 
            m: 3, // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec
            y: 2030 
        }
    });
    new dsq('#eg15', {
        hideScrollbars: true
    });
    let dateA = new Date(),
        boxA = new dsq('#eg16', {
            start: today,
            end: {
                d: today.getDate(),
                m: today.getMonth(),
                y: today.getFullYear() + 3
            },
            callback: function() {
                dateA = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + 1);
                boxB.destroy();
                boxB = new dsq('#eg17', {
                   start: dateA,
                    end: {
                        d: today.getDate(),
                        m: today.getMonth(),
                        y: today.getFullYear() + 5
                    },
                    callback: function() {
                        const difference = new Date(this.date - dateA);
                        document.getElementById('eg17Output').innerHTML = "That's " + (difference.toISOString().slice(0, 4) - 1970) + " years, " + (difference.getMonth()) + " months and " + difference.getDate() + " days";
                    }
                });
                document.getElementById('eg17').disabled = false;
            }
        }),
        boxB = new dsq('#eg17');

    new dsq('#eg18', {
    	parse: true,
    	parseDelay: 2000
    });
    //uberTest.setValue('2nd march 2010');
	//console.log('Date set: ', uberTest.getValue())
};