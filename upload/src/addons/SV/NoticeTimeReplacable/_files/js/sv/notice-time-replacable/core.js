var SV = window.SV || {};
SV.NoticeTimeReplacable = SV.NoticeTimeReplacable || {};

if (typeof moment === 'function')
{
    /**
     * @see https://gist.github.com/phpmypython/f97c5f5f59f2a934599d
     */
    (function (m)
    {
        /*
         * PHP => moment.js
         * Will take a php date format and convert it into a JS format for moment
         * http://www.php.net/manual/en/function.date.php
         * http://momentjs.com/docs/#/displaying/format/
         */
        var formatMap = {
                d: 'DD',
                D: 'ddd',
                j: 'D',
                l: 'dddd',
                N: 'E',
                S: function ()
                {
                    return '[' + this.format('Do').replace(/\d*/g, '') + ']';
                },
                w: 'd',
                z: function ()
                {
                    return this.format('DDD') - 1;
                },
                W: 'W',
                F: 'MMMM',
                m: 'MM',
                M: 'MMM',
                n: 'M',
                t: function ()
                {
                    return this.daysInMonth();
                },
                L: function ()
                {
                    return this.isLeapYear() ? 1 : 0;
                },
                o: 'GGGG',
                Y: 'YYYY',
                y: 'YY',
                a: 'a',
                A: 'A',
                B: function ()
                {
                    var thisUTC = this.clone().utc(),
                        // Shamelessly stolen from http://javascript.about.com/library/blswatch.htm
                        swatch = ((thisUTC.hours() + 1) % 24) + (thisUTC.minutes() / 60) + (thisUTC.seconds() / 3600);
                    return Math.floor(swatch * 1000 / 24);
                },
                g: 'h',
                G: 'H',
                h: 'hh',
                H: 'HH',
                i: 'mm',
                s: 'ss',
                u: '[u]', // not sure if moment has this
                e: '[e]', // moment does not have this
                I: function () {
                    return this.isDST() ? 1 : 0;
                },
                O: 'ZZ',
                P: 'Z',
                T: '[T]', // deprecated in moment
                Z: function () {
                    return parseInt(this.format('ZZ'), 10) * 36;
                },
                c: 'YYYY-MM-DD[T]HH:mm:ssZ',
                r: 'ddd, DD MMM YYYY HH:mm:ss ZZ',
                U: 'X'
            },
            formatEx = /[dDjlNSwzWFmMntLoYyaABgGhHisueIOPTZcrU]/g;

        moment.fn.formatPHP = function (format)
        {
            var that = this;

            return this.format(format.replace(formatEx, function (phpStr)
            {
                if (typeof formatMap[phpStr] === 'function')
                {
                    return formatMap[phpStr].call(that);
                }

                return formatMap[phpStr];
            }));
        };
    }(moment));
}

!function($, window, document, _undefined)
{
    "use strict";

    SV.NoticeTimeReplacable.RelativeTimestamp = XF.Element.newHandler({
        options: {
            timestamp: null,
            dateFormat: null,
            timeFormat: null
        },

        timer: null,

        init: function()
        {
            if (!this.options.timestamp)
            {
                console.error('Timestamp is missing.');
                return;
            }

            if (!this.options.dateFormat)
            {
                console.error('Date format missing.');
                return;
            }

            if (!this.options.timeFormat)
            {
                console.error('Time format missing.');
                return;
            }

            if (typeof moment !== 'function')
            {
                console.error('Moment.js not loaded.');
                return;
            }

            this.timer = setInterval(XF.proxy(this, 'updateTime'), 1000);
        },

        updateTime: function ()
        {
            var self = this,
                now = Math.floor(Date.now() / 1000) * 1000,
                end = this.options.timestamp * 1000,
                momentObj,
                timeArr = [];

            if (now <= end)
            {
                momentObj = moment.duration(end - now, 'milliseconds');
            }
            else
            {
                this.clearTimer();

                var $noticeContent = this.$target.closest('.notice-content'),
                    $noticeDismissButton = $noticeContent.length() ? $noticeContent.find('.notice-dismiss') : null;

                if ($noticeDismissButton.length)
                {
                    $noticeDismissButton.trigger('click');
                }

                momentObj = moment.unix(end / 1000);
                var fullEnd = this.getPhrase('svNoticeTimeReplacables_date_x_at_time_y', {
                    '{date}': momentObj.formatPHP(this.options.dateFormat),
                    '{time}': momentObj.formatPHP(this.options.timeFormat),
                });
                if (!fullEnd)
                {
                    console.error('Unable to get full end date.');
                    return;
                }

                this.$target.text(fullEnd);

                return;
            }

            var timePartStr;
            $.each(['year', 'month', 'day', 'hour', 'minute', 'second'], function(index, type)
            {
                timePartStr = self.getDatePart(momentObj, type);
                if (typeof timePartStr !== 'string')
                {
                    return;
                }

                timeArr.push(timePartStr);
            });

            if (!timeArr.length)
            {
                this.clearTimer();
                return;
            }

            this.$target.text(timeArr.join(', '));
        },

        /**
         * @param {moment} momentObj
         * @param {String} type
         */
        getDatePart: function (momentObj, type)
        {
            if (typeof type !== 'string')
            {
                console.error('Invalid date type provided.', type);
                return false;
            }

            var methodName = type + 's';
            if (typeof momentObj[methodName] !== 'function')
            {
                console.error('Invalid date type provided.', type);
                return false;
            }

            var value = parseInt(momentObj[methodName]()),
                phrase = 'svNoticeTimeReplacables_' + type + (value > 1 ? 's' : '');

            return this.getPhrase(phrase, {
                '{count}': value
            });
        },

        /**
         * @param {String} phrase
         * @param {Object} args
         *
         * @returns {boolean|string}
         */
        getPhrase: function (phrase, args)
        {
            args = typeof args === 'object' ? args : {};

            if (typeof phrase !== 'string' || !phrase)
            {
                this.clearTimer();

                console.error('Invalid phrase provided.', phrase);
                return false;
            }

            if (!(phrase in XF.phrases))
            {
                this.clearTimer();

                console.error('Phrase is not available.', phrase);
                return false;
            }

            var translatedValue = XF.phrase(phrase, args, null);
            if (translatedValue === null)
            {
                this.clearTimer();

                console.error('Phrase translation failed.', phrase);
                return false;
            }

            return translatedValue;
        },

        clearTimer: function ()
        {
            if (this.timer)
            {
                clearInterval(this.timer);
            }
        }
    });

    XF.Element.register('sv-notice-time-replacable--relative-timestamp', 'SV.NoticeTimeReplacable.RelativeTimestamp');
}
(jQuery, window, document);