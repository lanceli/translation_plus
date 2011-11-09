/**
 * $Rev: 25 $
 * $LastChangedDate: 2011-06-20 15:03:36 +0800 (一, 20  6 2011) $
 * $LastChangedBy: lyfuture $
 *
 * @author      Lance LI <lyfuture@gmail.com>
 * @version     $Id: main.js 25 2011-06-20 07:03:36Z lyfuture $
 */

(function() {
    var translati0n = {
        version: '1.0',
        defaults: {
            enabled: true,
            immediately: false, // translate immediately without icon
            immediatelyWithKey: [ // if immediately is false and with key down, show translation 
                'altKey'
            ], 
            selectText: true, // work on selection text
            dbclick: true, // work on dbclick
            draggable: false,
            suggestible: true,
            api: [ // support multi api
                'dictCn'
            ],
            google: {
                target: 'en',
                source: 'zh'
            },
            icon: {
                name: 'icon',
                opacityLeave: 0,
                opacityEnter: 1,
            },
            animation: false
        },
        status: 0,
        log: true,
        selectedText: 'Lorem',
        lastText: 'Lorem',
        lastResponse : {},
        icon: null, // icon dom
        iconKey: 'translati0n-icon',
        hidden: '-9999px',
        absolute: 'absolute',
        iconSrc: chrome.extension.getURL('translati0n_icon.png'),
        iconOffsetTop: 10,
        iconOffsetLeft: 10,
        wrapper: null, // wrapper dom
        wrapperKey: 'translati0n',
        wrapperMaxWidth: 250,
        wrapperMaxHeight: 235,
        uuid: 0,
        maxZ: 0,
        init: function() {
            var options = arguments[0] || {};

            var base = this;
            var d = base.defaults;

            d = base.extend(d, options);

            base.log('translation+\'s settings:');
            base.log(d);

            // Check if translation is initialized
            if (1 === base.status) {
                base.log('Dict is already initalized');
                return;
            }

            // Check if dom is ready
            if (!document || !document.body) {
                base.log('Dom is not ready');
                setTimeout('base.init(s)', 1000);
                return;
            }

            base.prepare();
        },
        extend: function() {
            var options = arguments[1] || {}, 
                d = arguments[0] || {},
                i = 1, name, src, copy;

            var base = this;

            // Handler case when options is not object
            if (typeof options !== 'object' || null === options) {
                options = {};
            }

            // Merge the contents of defaults and options together into defaults.
            for (name in d) {
                src = d[name];
                copy = options[name];
                
                if (typeof copy !== 'undefined') {
                    d[name] = copy;
                }
                if (typeof copy === 'object' && typeof copy.push === 'undefined') {
                    d[name] = base.extend(src, copy);
                }
            }
            return d;
        },
        prepare: function() {
            var base = this;
            var d = base.defaults;
            base.uuid = +new Date();

            // prepare style sheet
            var doc = document.getElementsByTagName('head')[0];
            var css = document.createElement('link');
            css.setAttribute('rel', 'stylesheet');
            css.setAttribute('type', 'text/css');
            css.setAttribute('href', chrome.extension.getURL('main.css'));
            doc.appendChild(css);
            

            // prepare translation icon
            var icon = document.createElement('img');
            icon.id = base.iconKey + base.uuid;
            icon.className = base.iconKey;
            icon.style.opacity = d.icon.opacityLeave;
            icon.style.top = base.hidden;
            icon.style.position = base.absolute;
            icon.src = base.iconSrc;

            base.icon = icon;
            document.body.appendChild(icon);

            // translation block
            var wrapper = document.createElement('div');
            wrapper.id = base.wrapperKey + base.uuid;
            wrapper.className = base.wrapperKey;
            wrapper.style.top = base.hidden;
            wrapper.style.position = base.absolute;
            // for transition animation
            if (d.animation) {
                wrapper.className += ' ' + base.wrapperKey + '-aniamtion';
            }

            // head
            var head = document.createElement('div');
            head.className = base.wrapperKey + '-head';

            // search icon
            var search = document.createElement('div');
            search.className = base.wrapperKey + '-search';
            head.appendChild(search);
            var searchD = document.createElement('div');
            searchD.className = base.wrapperKey + '-search-decoration';
            head.appendChild(searchD);

            // head input
            var headInput = document.createElement('input');
            headInput.className = base.wrapperKey + '-text';
            headInput.type = 'text';
            headInput.onkeyup = function(e) {
                e = e || window.event;
                if ('keyup' === e.type && e.keyCode === 13) {
                    base.translate(headInput.value);
                }
            };
            search.onclick = function() {
                base.translate(headInput.value);
            };
            head.appendChild(headInput);

            // cancel icon
            var cancel = document.createElement('div');
            cancel.className = base.wrapperKey + '-cancel';
            cancel.innerHTML = '&#10008;';
            cancel.onclick = function() {
                this.previousSibling.value = '';
            };
            head.appendChild(cancel);

            // tip
            var tip = document.createElement('div');
            tip.className = base.wrapperKey + '-tip';
            head.appendChild(tip);

            wrapper.appendChild(head);

            // body
            var body = document.createElement('div');
            body.className = base.wrapperKey + '-body';
            body.innerText = 'body here!';
            wrapper.appendChild(body);

            // foot
            var foot = document.createElement('div');
            foot.className = base.wrapperKey + '-foot';
            foot.draggable = true;
            wrapper.appendChild(foot);

            base.wrapper = wrapper;
            document.body.appendChild(wrapper);

            base.eventHandler();
        },
        buildWrapper: function(api) {
            var base = this,
                d = base.defaults,
                multiapi = d.api.length > 1 ? true : false,
                icon = base.icon,
                wrapper = base.wrapper,
                response = base.lastResponse[api];

            var headInput = wrapper.
                getElementsByClassName(base.wrapperKey + '-text')[0];
            headInput.value = base.lastText;

            // item container
            var item = document.createElement('div');
            item.className = base.wrapperKey + '-item';

            // def
            var def = document.createElement('div');
            def.innerText = response.def;
            def.className = base.wrapperKey + '-def';

            // pron
            var pron = document.createElement('div');
            pron.innerText = response.pron;
            pron.className = base.wrapperKey + '-pron';

            var body = wrapper.children[1];

            // check if extend
            var loading = body.getElementsByClassName(
                base.wrapperKey + '-loading'
            )[0];
            if (!multiapi || typeof loading !== 'undefined') {
                body.innerText = '';
                body.innerHTML = '';
            }
            
            // check if multi-api
            if (multiapi) {
                // power
                var power = document.createElement('div');
                power.innerText = response.api.copyright;
                power.className = base.wrapperKey + '-power';
                var hideNext = function(next) {
                    if (next.className.indexOf('-power') === -1) {
                        next.style.display = 'none';
                        return true;
                    }
                    return false;
                };
                power.onclick = function() {
                    var item = this.parentNode;
                    if (item.className.indexOf('-collapsed') === -1) {
                        item.className = item.className + ' ' +
                            base.wrapperKey + '-collapsed';
                        item.oldHeight = item.offsetHeight;
                        item.style.height =
                            item.firstChild.offsetHeight - 2 + 'px';
                    } else {
                        item.className = item.className.replace(
                            ' ' + base.wrapperKey + '-collapsed', ''
                        );
                        item.style.height = item.oldHeight + 'px';
                    }
                };

                var arrow = document.createElement('div');
                arrow.innerHTML = '&#12296;';
                arrow.className = base.wrapperKey + '-power-arrow';
                power.appendChild(arrow);

                item.appendChild(power);
            }

            item.appendChild(pron);
            item.appendChild(def);

            // example
            if (typeof response.example !== 'undefined') {
                var example = document.createElement('div');
                example.className = base.wrapperKey + '-example';
                for (var i in response.example) {
                    var orig = document.createElement('span');
                    orig.innerHTML = response.example[i].orig;
                    orig.className = base.wrapperKey + '-orig';
                    example.appendChild(orig);

                    var trans = document.createElement('span');
                    trans.innerHTML = response.example[i].trans;
                    trans.className = base.wrapperKey + '-trans';
                    example.appendChild(trans);
                }
                item.appendChild(example);
            }

            var suggestions = body.getElementsByClassName(
                base.wrapperKey + '-suggs'
            )[0];
            if (typeof suggestions === 'undefined') {
                body.appendChild(item);
            } else {
                suggestions.parentNode.insertBefore(item, suggestions);
            }

            // for transition animation
            item.style.height = item.offsetHeight + 'px';

            // foot
            var foot = wrapper.children[2];
            foot.innerText = '';
            foot.innerHTML = 'Powered By &copy; ';
            var power = document.createElement('a');
            power.innerHTML = response.api.copyright;
            power.href = 'http://' + response.api.website;
            power.target = '_blank';
            power.className = base.wrapperKey + '-power';

            foot.appendChild(power);

            // show wrapper
            if (base.immediately) {
                base.showWrapper();
            }
        },
        showWrapper: function(isLoading) {
            var base = this,
                d = base.defaults,
                icon = base.icon,
                wrapper = base.wrapper,
                isLoading = isLoading || false;

            if (isLoading) {
                var headInput = wrapper.
                    getElementsByClassName(base.wrapperKey + '-text')[0];
                headInput.value = base.selectedText;

                var body = wrapper.getElementsByClassName(
                    base.wrapperKey + '-body'
                )[0];
                body.innerHTML = '';
                body.innerText = '';
                var loading = document.createElement('div');
                loading.className = base.wrapperKey + '-loading';
                loading.innerText = 'Loading...';
                body.appendChild(loading);
            }

            if (isLoading && !base.immediately) {
            } else {
                // hide icon
                base.hideIcon();

                var position = base.detectPosition(wrapper);

                // show wrapper
                wrapper.style.top = position.y + 'px';
                wrapper.style.left = position.x + 'px';
            }
        },
        hideWrapper: function() {
            var base = this,
                wrapper = base.wrapper;

            // hide wrapper
            if (wrapper.style.top !== base.hidden) {
                wrapper.style.top = base.hidden;
            }
        },
        hideIcon: function() {
            var base = this,
                icon = base.icon;

            // hide icon
            if (icon.style.top !== base.hidden) {
                icon.style.top = base.hidden;
            }
        },
        insertSuggestion: function() {
            var base = this,
                d = base.defaults,
                wrapper = base.wrapper,
                response = base.lastResponse;
            // suggestion
            if (
                typeof response.sugg !== 'undefined' &&
                response.sugg.length > 0
            ) {
                var body = wrapper.getElementsByClassName(
                    base.wrapperKey + '-body'
                )[0];
                var suggsWrapper = wrapper.getElementsByClassName(
                    base.wrapperKey + '-suggs'
                );
                if (suggsWrapper.length > 0) {
                    return;
                }
                var suggs = document.createElement('div');
                suggs.onclick = function(e) {
                    e = e || window.event;
                    var target = e.target || e.srcElement;
                    if (target.className === base.wrapperKey + '-sugg') {
                        base.translate(target.innerText);
                    }
                };
                suggs.className = base.wrapperKey + '-suggs';
                for (var i in response.sugg) {
                    if (response.sugg[i] === base.lastText) {
                        continue;
                    }
                    var sugg = document.createElement('span');
                    sugg.innerText = response.sugg[i];
                    sugg.className = base.wrapperKey + '-sugg';
                    suggs.appendChild(sugg);
                }
                body.appendChild(suggs);

                // for transition animation
                suggs.style.height = suggs.offsetHeight + 'px';
            }
        },
        // hide redundant suggestion if suggestions more than three lines
        hideSuggestion: function() {
            var base = this,
                d = base.defaults,
                wrapper = base.wrapper;
            
            var body = wrapper.getElementsByClassName(base.wrapperKey + '-body')[0];
            var suggs = wrapper.getElementsByClassName(base.wrapperKey + '-suggs')[0];
            if (typeof suggs !== 'undefined') {
                if (
                    suggs.offsetHeight > 55
                    &&
                    body.clientHeight < body.scrollHeight
                ) {
                    suggs.actualHeight = suggs.offsetHeight;
                    suggs.style.height = '31px';
                    suggs.style.overflow = 'hidden';
                    var showMore = document.createElement('div');
                    showMore.className = base.wrapperKey + '-suggs-more';
                    showMore.innerText = '- Show more suggestion -';
                    showMore.onclick = function(e) {
                        e = e || window.event;
                        if (typeof suggs.actualHeight !== 'undefined') {
                            suggs.style.height = suggs.actualHeight + 'px';
                            showMore.style.display = 'none';
                            body.scrollTop = 9999;
                        }
                    };
                    body.appendChild(showMore);
                }
            }
        },
        hide: function() {},
        update: function() {},
        destroy: function() {},
        reposition: function() {},
        eventHandler: function() {
            var base = this,
                d = base.defaults,
                position = {},
                oldPos = {},
                lastText = '',
                icon = base.icon,
                wrapper = base.wrapper;
            base.getSelectedTextEvent();

            // get screen text on ctrl key down, it's bad experience.
            //base.getScreenTextEvent();

            icon.onclick = function(e) {
                e = e || window.event;
                base.showWrapper();
            };
            icon.onmouseover = function(e) {
                if (+icon.style.opacity !== d.icon.opacityEnter) {
                    icon.style.opacity = d.icon.opacityEnter;
                }
            };
            icon.onmouseout = function(e) {
                icon.style.opacity = d.icon.opacityLeave;
            };
            wrapper.onmousedown = function(e) {
                e = e || window.event;
                wrapper.lastMousePosition = base.mousePosition(e);
            };
            if (d.draggable) {
                wrapper.addEventListener('dragover', function(e) {
                    var target = e.target || e.srcElement;

                    if (e.preventDefault) {
                        e.preventDefault();
                    }

                    var mousePosition = base.mousePosition(e);
                    // detect os
                    if (navigator.platform === 'Mac') {
                    } else {
                        if (+wrapper.style.opacity !== 0.3) {
                            wrapper.style.opacity = 0.3;
                        }
                        if (
                            typeof wrapper.lastMousePosition === 'undefined'
                        ) {
                            wrapper.lastMousePosition = {x:'', y:''};
                        }
                        if (
                            mousePosition.x !== wrapper.lastMousePosition.x
                            || 
                            mousePosition.y !== wrapper.lastMousePosition.y
                        ) {
                            var left = parseInt(wrapper.style.left, 10);
                            var top = parseInt(wrapper.style.top, 10);
                            var rangLeft = wrapper.lastMousePosition.x - mousePosition.x;
                            var rangTop = wrapper.lastMousePosition.y - mousePosition.y;
                            if (rangLeft !== 0) {
                                wrapper.style.left = left - rangLeft + 'px';
                            }
                            if (rangTop !== 0) {
                                wrapper.style.top = top - rangTop + 'px';
                            }
                            wrapper.lastMousePosition = {
                                x: mousePosition.x,
                                y: mousePosition.y
                            };
                        }
                    }
                    return false;
                }, false);
                document.addEventListener('drop', function(e) {
                    if (e.preventDefault) {
                        e.preventDefault();
                    }
                    if (+wrapper.style.opacity === 0.3) {
                        wrapper.style.opacity = 1;
                    }
                });
            }
        },
        getScreenTextEvent: function() {
            var base = this,
                d = base.defaults,
                icon = base.icon,
                wrapper = base.wrapper,
                lastText = '';
            var mouseOverEvent = function(e) {
                var isAlpha = function(str){return /[a-zA-Z']+/.test(str)};
                e = e || window.event;
                if (!e.ctrlKey) {
                    return;
                }
                var mousePosition = base.mousePosition(e),
                    pageX = mousePosition.x,
                    pageY = mousePosition.y;
                // the arguments of caretRangeFromPoint should be clientX,clientY
                var range = document.caretRangeFromPoint(
                    mousePosition.clientX,
                    mousePosition.clientY
                );
                if (range !== null) {
                    var startOffset = range.startOffset,
                        endOffset = range.endOffset,
                        cloneRange = range.cloneRange(),
                        text = '';
                    if (range.startContainer.data) {
                        while (startOffset >= 1) {
                            cloneRange.setStart(range.startContainer, --startOffset);
                            text = cloneRange.toString();
                            base.log('start:' + text);
                            if (!isAlpha(text.charAt(0))){
                                cloneRange.setStart(range.startContainer, startOffset + 1);
                                break;
                            }
                        }
                    }
                    if (range.endContainer.data) {
                        while (endOffset < range.endContainer.data.length) {
                            cloneRange.setEnd(range.endContainer, ++endOffset);
                            text = cloneRange.toString();
                            base.log('end:' + text);
                            if (!isAlpha(text.charAt(text.length - 1))){
                                cloneRange.setEnd(range.endContainer, endOffset - 1);
                                break;
                            }
                        }
                    }
                    var word = cloneRange.toString();
                    if (word !== '' && word !== lastText) {
                        var selectRange = window.getSelection();
                        selectRange.removeAllRanges();
                        selectRange.addRange(cloneRange);
                        base.translate(word);
                    }
                }
            };
            document.addEventListener('mouseover', mouseOverEvent, false);
            var dispatchMouseEvent = function(target, var_args) {
                var e = document.createEvent("MouseEvents");
                // If you need clientX, clientY, etc., you can call
                // initMouseEvent instead of initEvent
                e.initEvent.apply(e, Array.prototype.slice.call(arguments, 1));
                target.dispatchEvent(e);
            };
        },
        getSelectedTextEvent: function() {
            var base = this,
                d = base.defaults,
                position = {},
                oldPos = {},
                lastText = '',
                icon = base.icon,
                wrapper = base.wrapper;
            var mouseUpEvent = function(e) {
                e = e || window.event;
                var target = e.target || e.srcElement;

                // check if is not left click
                if (e.button !== 0) {
                    return;
                }

                // get options
                base.getOptinos();

                // check if click on translation icon
                if (target.id === icon.id) {
                    return;
                }

                // check if click on translation container
                if (
                    target.parentNode
                    && (
                    target.parentNode.id === wrapper.id
                    ||
                    target.className.indexOf(base.wrapperKey) !== -1
                    ||
                    (target.parentNode.className
                    &&
                    target.parentNode.className.indexOf(base.wrapperKey) !== -1
                    )
                    )
                ) {
                    return;
                }

                // hide existed popup
                base.hideWrapper();
                base.hideIcon();


                var text = '';

                // 延时区分上一个选中的文本, 在textarea中
                //window.setTimeout(function() {

                    // Check if translation is enabled
                    if (!d.enabled) {
                        base.log('Dict is diabled');
                        return;
                    }

                    text = base.getSelectedText();

                    if ('' !== text) {
                        base.log('text:' + text + ', length:' + text.length);
                        lastText = text;
                        icon.mousePosition = base.mousePosition(e);

                        if (typeof icon.preMousePosition === 'undefined') {
                            icon.preMousePosition = {x: '', y: ''};
                        }

                        // check if mouse is moved
                        if (
                            icon.mousePosition.x === icon.preMousePosition.x
                            &&
                            icon.mousePosition.y === icon.preMousePosition.y
                            &&
                            !d.dbclick
                        ) {
                            return;
                        }
                        position = base.detectPosition(icon);
                        icon.style.left = position.x + 'px';

                        // check if set immediate key
                        var immediatelyWithKey = true;
                        if (d.immediatelyWithKey.length && !d.immediately) {
                            for (var i = 0; i < d.immediatelyWithKey.length; i++) {
                                if (e[d.immediatelyWithKey[i]]) {
                                    continue;
                                } else {
                                    immediatelyWithKey = false;
                                }
                            }
                        } else {
                            immediatelyWithKey = false;
                        }
                        if (!d.immediately && !immediatelyWithKey) {
                            base.immediately = false;
                            icon.style.opacity = d.icon.opacityLeave;
                            icon.style.top = position.y + 'px';
                        } else {
                            base.immediately = true;
                            base.hideIcon();
                        }
                        base.translate(lastText);
                    } else {
                        icon.preMousePosition = base.mousePosition(e);
                    }
                //}, 30);
            };
            document.addEventListener('mouseup', mouseUpEvent, false);
        },
        getSelectedText: function() {
            var base = this;

            var text = '';
            if (window.getSelection) {
                text = window.getSelection();
            } else if (document.getSelection) {
                text = document.getSelection();
            } else if (document.selection) {
                text = document.selection.createRange().text;
            }

            if (typeof text === 'object') {

                // remove line breaks
                text = text.toString().replace(/(\r\n|\n|\r)/gm, ' ');

                // trim whitespaces
                if (typeof String.prototype.trim === 'function') {
                    text = text.trim();
                } else {
                    text = text.replace(/^\s+|\s+$/g, '');
                }
            } else {
                text = '';
            }

            return text;
        },
        getOptinos: function() {
            var base = this;
            var d = base.defaults;
            chrome.extension.sendRequest(
                {get: 'options'},
                function(response) {
                    if (response) {
                        d = base.extend(d, response);

                        // the last text should be remove if options is changed
                        base.lastText = '';
                    }
                }
            );
        },
        translate: function(text, isGetSuggestion) {
            var base = this;
            var d = base.defaults;
            // check if text is the same as last text
            if (text === base.lastText) {
                if (base.immediately) {
                    base.showWrapper();
                }
            } else {
                base.log('begin translating text :' + text);
                if (!isGetSuggestion) {
                    base.selectedText = text;
                    base.showWrapper(true);
                }
                var apis = d.api;
                var params = {
                    text: text
                };

                for (var i = 0; i < apis.length; i++) {
                    params.api = apis[i];
                    base.sendRequest(params, i);
                }
            }
        },
        sendRequest: function(params, index) {
            var base = this;
            var d = base.defaults;
            var text = params.text;
            var api = params.api;
            chrome.extension.sendRequest(params,
                function(response) {
                    if (typeof response.sugg === 'undefined') {
                        if (response.selectedText !== base.selectedText) {
                            return;
                        }

                        // check if suggest is enabled
                        if (d.suggestible && index === 0) {
                            params.text = '[' + text + ']';
                            params.isGetSuggestion = true;
                            base.sendRequest(params);
                        }

                        base.log('translated text :' + text + ' done');
                        base.lastText = text;
                        base.lastResponse[api] = response;
                        base.buildWrapper(api);
                    } else if (text == '[' + base.lastText + ']') {
                        base.log('get suggestion of text :' + text + ' done');
                        base.lastResponse.sugg = response.sugg;
                        base.insertSuggestion();
                    }
                }
            );
        },
        mousePosition: function(e) {
            var base = this;

            var pageX = e.pageX || (e.clientX ? e.clientX +
                document.documentElement.scrollLeft +
                document.body.scrollLeft : 0);
            var pageY = e.pageY || (e.clientY ? e.clientY +
                document.documentElement.scrollTop +
                document.body.scrollTop : 0);
            return {
                x: pageX,
                y: pageY,
                clientX: e.clientX,
                clientY: e.clientY
            };
        },
        detectPosition: function(element) {
            var base = this,
                icon = base.icon,
                windowHeight = document.documentElement.clientHeight ||
                    document.body.clientHeight,
                windowWidth = document.documentElement.clientWidth ||
                    document.body.clientWidth,
                scrollTop = document.documentElement.scrollTop +
                    document.body.scrollTop,
                scrollLeft = document.documentElement.scrollLeft +
                    document.body.scrollLeft,
                mousePosition = icon.mousePosition,
                elementWidth = element.offsetWidth + 20, // maybe have scrollbar
                elementHeight = element.offsetHeight;
            var left, right, top, bottom, pageX, pageY;
            left = mousePosition.clientX;
            top = mousePosition.clientY;
            right = windowWidth - mousePosition.clientX;
            bottom = windowHeight - mousePosition.clientY;
            var pageX = mousePosition.x + base.iconOffsetLeft,
                pageY = mousePosition.y + base.iconOffsetTop;
            if (right < elementWidth && left < elementWidth) {
                pageX = scrollLeft + 2;
            } else if (right < elementWidth && right < left) {
                pageX -= elementWidth;
            }
            if (bottom < elementHeight && top < elementHeight) {
                pageY = scrollTop + 2;
            } else if (bottom < elementHeight && bottom < top) {
                pageY -= elementHeight;
            }
            return {
                x: pageX,
                y: pageY
            };
        },
        log: function(m) {
            var base = this;
            if (!base.log) {
                return;
            }
            if (window.console && window.console.log) {
                window.console.log(m);
            } else {
                alert(message);
            }
        }
    };
    chrome.extension.sendRequest({get: 'options'}, function(response) {
        translati0n.init(response);
    });

})();
