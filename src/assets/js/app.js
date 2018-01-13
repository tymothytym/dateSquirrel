'use strict';

// demo imports
// what-input for detecting touch
//import whatInput from 'what-input';
// prism for highlighting demo code
import Prism from 'prismjs';
import Normalizer from 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace';
// clipboard for copying code snippets
import Clipboard from 'clipboard';
const isNative = function(object, method) {
    return object && method in object &&
      typeof object[method] != 'string' &&
      // IE/W3C browsers will return [native code]
      // Safari 2.0.x and older will return [function]
      (/\{\s*\[native code[^\]]*\]\s*\}|^\[function\]$/).
      test(object[method]);
    };
//console.log('isNative ontouchstart: ', isNative(window.document, 'ontouchstart'));
//let testDiv = document.querySelector('.quiz-btns');
//testDiv.insertAdjacentHTML('beforeend', '<p>isNative ontouchstart: ' + isNative(window.document, 'ontouchstart') + '</p>');
// nav
(function(window) {
    // http://stackoverflow.com/a/11381730/989439
    function mobilecheck() {
        //console.log('whatInput.ask();', whatInput.ask('intent'));
        //no-js whatinput-types-initial whatinput-types-mouse
        //data-whatinput=mouse
        var check = false;
        (function(a){if(/(android|ipad|playbook|silk|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    }

    function gnMenu( el, options ) {    
        this.el = el;
        this._init();
    }

    gnMenu.prototype = {
        _init : function() {
            this.trigger = this.el.querySelector( 'a.gn-icon-menu' );
            this.menu = this.el.querySelector( 'nav.gn-menu-wrapper' );
            this.isMenuOpen = false;
            this.eventtype = mobilecheck() ? 'touchstart' : 'click';
            this._initEvents();

            var self = this;
            this.bodyClickFn = function() {
                self._closeMenu();
                this.removeEventListener( self.eventtype, self.bodyClickFn );
            };
        },
        _initEvents : function() {
            var self = this;

            if( !mobilecheck() ) {
                this.trigger.addEventListener( 'mouseover', function() { self._openIconMenu(); } );
                this.trigger.addEventListener( 'mouseout', function() { self._closeIconMenu(); } );
            
                this.menu.addEventListener( 'mouseover', function() {
                    self._openMenu(); 
                    document.addEventListener( self.eventtype, self.bodyClickFn ); 
                } );
            }
            this.trigger.addEventListener( this.eventtype, function( ev ) {
                ev.stopPropagation();
                ev.preventDefault();
                if( self.isMenuOpen ) {
                    self._closeMenu();
                    document.removeEventListener( self.eventtype, self.bodyClickFn );
                } else {
                    self._openMenu();
                    document.addEventListener( self.eventtype, self.bodyClickFn );
                }
            } );
            this.menu.addEventListener( this.eventtype, function(ev) { ev.stopPropagation(); } );
        },
        _openIconMenu : function() {
            this.menu.classList.add('gn-open-part');
            //classie.add( this.menu, 'gn-open-part' );
        },
        _closeIconMenu : function() {
            this.menu.classList.remove('gn-open-part');
            //classie.remove( this.menu, 'gn-open-part' );
        },
        _openMenu : function() {
            if( this.isMenuOpen ) return;
            this.menu.classList.add('gn-selected');
            //classie.add( this.trigger, 'gn-selected' );
            this.isMenuOpen = true;
            this.menu.classList.add('gn-open-all');
            //classie.add( this.menu, 'gn-open-all' );
            this._closeIconMenu();
        },
        _closeMenu : function() {
            if( !this.isMenuOpen ) return;
            this.trigger.classList.remove('gn-selected');
            //classie.remove( this.trigger, 'gn-selected' );
            this.isMenuOpen = false;
            this.menu.classList.remove('gn-open-all');
            //classie.remove( this.menu, 'gn-open-all' );
            this._closeIconMenu();
        },
        toggleMenu : function() {
            if (!this.isMenuOpen) {
                self._closeMenu();
            } else {
                self._openMenu();
            }
        }
    };

    // add to global namespace
    window.gnMenu = gnMenu;
})(window);

// DOM
document.addEventListener("DOMContentLoaded", function(e) {
	//console.log('DOMContentLoaded');
	// initialise...

	// ...clipboard
	new Clipboard('.clipboard');

	// ...back to top
    function bttVisibility () {
        if (document.documentElement.scrollTop >= window.innerHeight) {
            document.querySelector('footer a.navigation-icon').classList.add('dsq-shown');
        } else {
            document.querySelector('footer a.navigation-icon').classList.remove('dsq-shown');
        }
    }
    document.addEventListener("scroll", bttVisibility);

	// ...nav
	new gnMenu(document.getElementById('gn-menu'));

	// ..scroll
	//smooth_scroll.init({
    //    header_id : "gn-menu"
    //});
        /*list = [];
    for (var i = 0; i < Object.keys(qData).length; i++) {
        list[i] = Object.keys(qData)[i];
    }*/

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
    //console.log(futureDate());
    // examples initialisation
    let today = new Date();
    new dsq('#eg0');
    new dsq('#eg1', {
        pattern: 'dx mmm yyyy'
    });
    new dsq('#eg2', {
        pattern: 'wwww, dx mmmm yyyy'
    });
    new dsq('#eg3', {
        start: new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()),
        end: {
            d: today.getDate(), 
            m: today.getMonth(), // 0 = Jan, 1 = Feb, 2 = Mar..., 11 = Dec
            y: today.getFullYear() + 1 
        }
    });
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
            primaryColour: '#ff5a9f',
            primaryTextColour: '#de0067',
            textOnPrimaryColour: '#fefefe',
            activation: function() {
                if (window.innerWidth > 1024) {
                    return true;
                } else {
                    return false;
                }
            }
        });
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
    //egtest.destroy();
    console.log('egtest.getValue: ', egtest.getValue());
/*
	// page listening
	document.addEventListener("click", function(e) {
		console.log('e.target.href: ', e.target.href);
        console.log('e.target: ', e.target);
    	if (e.target.href !== undefined && e.target.href.startsWith("#")) {
    		e.preventDefault();
    		if (this.className === "gn-icon" && bonzo(this).parent().className !== 'gn-trigger') {
				document.querySelectorAll('body').click();
			}
			if (this.href.endsWith("#") && this.hash === "") {
				document.querySelectorAll('body').scrollIntoView();
			} else {
				document.getElementById(this.hash).scrollIntoView();
			}
	    }
        if (e.target.id === 'goAgain') {
            bonzo(output).removeClass('is-active');
            bonzo(eg0).val('')
            //dsq(eg0, 'destroy');
            quiz();
        }
	});*/
}, false);

// functions

function smoothScrollingTo(target){
    // need es2015 solution
    //bonzo('html,body').animate({scrollTop:bonzo(target).offset().top - 60}, 250);
}
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function randomKey(data) {
    return data.length === undefined ? Object.keys(qData)[Math.floor((Math.random() * Object.keys(data).length))] : data[Math.floor((Math.random() * data.length))];
}
function diffInDays(earlier, later) {
    var oneDay = 24*60*60*1000, // hours*minutes*seconds*milliseconds
        firstDate = parse(earlier),
        secondDate = parse(later);
        
    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
}
