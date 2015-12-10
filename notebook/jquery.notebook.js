/*
 * jQuery Notebook 1.0
 *
 * Copyright (c) 2015
 * date 2015-12-08
 * author rong
 *
 */

(function($, d, w) {

    /*
     * This module deals with the CSS transforms. As it is not possible to easily
     * combine the transform functions with JavaScript this module abstract those
     * functions and generates a raw transform matrix, combining the new transform
     * with the others that were previously applied to the element.
     */

     var transform = (function() {
        var matrixToArray = function(str) {
            if (!str || str == 'none') {
                return [1, 0, 0, 1, 0, 0];
            }
            return str.match(/(-?[0-9\.]+)/g);
        };

        var getPreviousTransforms = function(elem) {
            return elem.css('-webkit-transform') || elem.css('transform') || elem.css('-moz-transform') ||
                elem.css('-o-transform') || elem.css('-ms-transform');
        };

        var getMatrix = function(elem) {
            var previousTransform = getPreviousTransforms(elem);
            return matrixToArray(previousTransform);
        };

        var applyTransform = function(elem, transform) {
            elem.css('-webkit-transform', transform);
            elem.css('-moz-transform', transform);
            elem.css('-o-transform', transform);
            elem.css('-ms-transform', transform);
            elem.css('transform', transform);
        };

        var buildTransformString = function(matrix) {
            return 'matrix(' + matrix[0] +
                ', ' + matrix[1] +
                ', ' + matrix[2] +
                ', ' + matrix[3] +
                ', ' + matrix[4] +
                ', ' + matrix[5] + ')';
        };

        var getTranslate = function(elem) {
            var matrix = getMatrix(elem);
            return {
                x: parseInt(matrix[4]),
                y: parseInt(matrix[5])
            };
        };

        var scale = function(elem, _scale) {
            var matrix = getMatrix(elem);
            matrix[0] = matrix[3] = _scale;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        var translate = function(elem, x, y) {
            var matrix = getMatrix(elem);
            matrix[4] = x;
            matrix[5] = y;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        var rotate = function(elem, deg) {
            var matrix = getMatrix(elem);
            var rad1 = deg * (Math.PI / 180);
            var rad2 = rad1 * -1;
            matrix[1] = rad1;
            matrix[2] = rad2;
            var transform = buildTransformString(matrix);
            applyTransform(elem, transform);
        };

        return {
            scale: scale,
            translate: translate,
            rotate: rotate,
            getTranslate: getTranslate
        };
    })();

    var isMac = w.navigator.platform == 'MacIntel',
        mouseX = 0,
        mouseY = 0,
        cache = {
            ctrl: false,
            shift: false,
            isSelecting: false
        },
        options,
        utils = {
            commandMap: {
                'font':'FontName',
                'size':'fontSize',
                'bold':'bold',
                'italic':'italic',
                'underline':'underline',
                'color':'ForeColor',
                'bgcolor':'BackColor',
                'indent':'Indent',
                'outdent':'Outdent',
                'left':'JustifyLeft',
                'center':'JustifyCenter',
                'right':'JustifyRight',
                'justify':'JustifyFull',
                'ol':'insertOrderedList',
                'ul':'insertUnorderedList',
                'anchor':'createLink',
                'clear':'RemoveFormat'
            },
            keyboard: {
                isCtrl: function(e, callbackTrue, callbackFalse) {
                    if (isMac && e.metaKey || !isMac && e.ctrlKey) {
                        callbackTrue();
                    } else {
                        callbackFalse();
                    }
                },
                isShift: function(e, callbackTrue, callbackFalse) {
                    if (e.shiftKey) {
                        callbackTrue();
                    } else {
                        callbackFalse();
                    }
                },
                isModifier: function(e, callback) {
                    var key = e.which,
                        cmd = options.hotKeys[key];
                    if (cmd) {
                        callback.call(this, cmd);
                    }
                },
                isEnter: function(e, callback) {
                    if (e.which === 13) {
                        callback();
                    }
                }
            },
            html: {
                addTag: function(elem, tag, focus, editable) {
                    var newElement = $(d.createElement(tag));
                    if(Boolean(editable) == false){
                        newElement.attr('contenteditable', Boolean(editable));
                    }
                    if(/^p$/i.test(tag)){
                        newElement.html("</br>");
                    }
                    elem.append(newElement);
                    if (focus) {
                        cache.focusedElement = elem.children().last();
                        utils.cursor.set(elem, 0, cache.focusedElement);
                    }
                    return newElement;
                }
            },
            cursor: {
                set: function(editor, pos, elem) {
                    var range;
                    if (d.createRange) {
                        range = d.createRange();
                        var selection = w.getSelection(),
                            lastChild = editor.children().last(),
                            length = lastChild.html().length - 1,
                            toModify = elem ? elem[0] : lastChild[0],
                            theLength = typeof pos !== 'undefined' ? pos : length;
                        elem ? range.setStartAfter(elem[0]):range.setStart(toModify, theLength);;
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        range = d.body.createTextRange();
                        range.moveToElementText(elem);
                        range.collapse(false);
                        range.select();
                    }
                }
            },
            selection: {
                save: function() {
                    if (w.getSelection) {
                        var sel = w.getSelection();
                        if (sel.rangeCount > 0) {
                            return sel.getRangeAt(0);
                        }
                    } else if (d.selection && d.selection.createRange) { // IE
                        return d.selection.createRange();
                    }
                    return null;
                },
                restore: function(range) {
                    if (range) {
                        if (w.getSelection) {
                            var sel = w.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        } else if (d.selection && range.select) { // IE
                            range.select();
                        }
                    }
                },
                getText: function() {
                    var txt = '';
                    if (w.getSelection) {
                        txt = w.getSelection().toString();
                    } else if (d.getSelection) {
                        txt = d.getSelection().toString();
                    } else if (d.selection) {
                        txt = d.selection.createRange().text;
                    }
                    return txt;
                },
                clear: function() {
                    if (window.getSelection) {
                        if (window.getSelection().empty) { // Chrome
                            window.getSelection().empty();
                        } else if (window.getSelection().removeAllRanges) { // Firefox
                            window.getSelection().removeAllRanges();
                        }
                    } else if (document.selection) { // IE?
                        document.selection.empty();
                    }
                },
                getContainer: function(sel) {
                    if (w.getSelection && sel && sel.commonAncestorContainer) {
                        return sel.commonAncestorContainer;
                    } else if (d.selection && sel && sel.parentElement) {
                        return sel.parentElement();
                    }
                    return null;
                },
                getSelection: function() {
                    if (w.getSelection) {
                        return w.getSelection();
                    } else if (d.selection && d.selection.createRange) { // IE
                        return d.selection;
                    }
                    return null;
                }
            },
            validation: {
                isUrl: function(url) {
                    return (/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/).test(url);
                }
            }
        },
        bubble = {
            /*
             * This is called to position the bubble above the selection.
             */
            updatePos: function(editor, elem) {
                if(editor.attr('is-translate') == "true"){
                    var sel = w.getSelection(),
                    range = sel.getRangeAt(0),
                    boundary = range.getBoundingClientRect(),
                    bubbleWidth = elem.width(),
                    bubbleHeight = elem.height(),
                    offset = editor.offset().left,
                    pos = {
                        x: ((boundary.left + boundary.width / 2) - (bubbleWidth / 2))<0 ? 0 : ((boundary.left + boundary.width / 2) - (bubbleWidth / 2)),
                        y: (boundary.top - bubbleHeight - 8 + $(document).scrollTop())<0 ? 0 : (boundary.top - bubbleHeight - 8 + $(document).scrollTop())
                    };
                    transform.translate(elem, pos.x, pos.y);
                }else{
                   elem.css('position','relative');
                   var l = elem.find('.tool li').length;
                   var width = l*25+10;
                   elem.css('width',width+'px');
                }
            },
            /*
             * Updates the bubble to set the active formats for the current selection.
             */
            updateState: function(elem) {
                elem.find('button').removeClass('active');
                var sel = w.getSelection(),
                    formats = [];
                bubble.checkForFormatting(sel.focusNode, formats);
                var formatDict = {
                    'b': 'bold',
                    'i': 'italic',
                    'u': 'underline',
                    'a': 'anchor',
                    'ul': 'ul',
                    'ol': 'ol'
                };
                for (var i = 0; i < formats.length; i++) {
                    var format = formats[i];
                    elem.find('button.' + formatDict[format]).addClass('active');
                }
            },
            /*
             * Recursively navigates upwards in the DOM to find all the format
             * tags enclosing the selection.
             */
            checkForFormatting: function(currentNode, formats) {
                var validFormats = ['b', 'i', 'u','a', 'ul','ol'];
                if (currentNode && (currentNode.nodeName === '#text' ||
                    validFormats.indexOf(currentNode.nodeName.toLowerCase()) != -1)) {
                    if (currentNode.nodeName != '#text') {
                        formats.push(currentNode.nodeName.toLowerCase());
                    }
                    bubble.checkForFormatting(currentNode.parentNode, formats);
                }
            },
            getCurEditor:function(node){
                var cls = node.className;
                if(cls && cls.indexOf instanceof Function && cls.indexOf('jquery-notebook')>-1){
                    return cls;
                }else{
                    return bubble.getCurEditor(node.parentNode);
                } 
            },
            buildMenu: function(editor, elem) {
                var ul = utils.html.addTag(elem, 'ul', false, false);
                ul.addClass('tool');
                for (var cls in options.modifiers) {
                    var li = utils.html.addTag(ul, 'li', false, false);
                    var btn = utils.html.addTag(li, 'button', false, false);
                    var btnClass = options.modifiers[cls];
                    if(btnClass === 'font'){  //font family
                        var familyPanel =  utils.html.addTag(elem, 'div', false, false);
                        familyPanel.addClass('menu-panel');
                        familyPanel.addClass('family-panel');
                        var familyul = '<ul>';
                        for (var i in options.fontfamily) {
                            var font = options.fontfamily[i];
                            familyul += '<li><a data-command="fontName '+font+'" style="font-family: \''+font+'\'">'+font+'</a></li>';
                        }
                        familyul += '</ul>';
                        familyPanel.append(familyul);
                        btn.attr('dropdown-menu','bubble.showFont');
                    }else if(btnClass === 'size'){  //font size
                        var sizePanel = utils.html.addTag(elem, 'div', false, false);
                        sizePanel.addClass('menu-panel');
                        sizePanel.addClass('size-panel');
                        var sizeul = '<ul>';
                        for (var i in options.fontsize) {
                            var size = options.fontsize[i];
                            sizeul += '<li><a data-val="'+size+'">'+size+'</a></li>';
                        }
                        sizeul += '</ul>';
                        sizePanel.append(sizeul);
                        btn.attr('dropdown-menu','bubble.showSize');
                    }else if(btnClass === 'color' || btnClass === 'bgcolor'){ //color panel
                        if(!$(elem).find('.menu-panel.color-panel').html()){
                            var colorPanel = utils.html.addTag(elem, 'div', false, false);
                            colorPanel.addClass('menu-panel');
                            colorPanel.addClass('color-panel');
                            var colorHtml = '<ul><li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: transparent;"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(249, 110, 87);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(95, 156, 239);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(142, 201, 101);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(71, 193, 168);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(255, 255, 255);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(160, 160, 160);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(255, 129, 36);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(166, 91, 203);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(255, 202, 0);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(211, 173, 28);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(156, 132, 40);"></span>/span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(14, 23, 74);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(22, 48, 193);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(216, 3, 3);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(154, 11, 53);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(0, 0, 0);"></span></span></li>\
                                <li class="color-item"><span class="tn-color-circle"><span class="face" style="background-color: rgb(98, 40, 165);"></span></span></li></ul>\
                                <div class="action-area"><span class="tn-color-picker"><input class="input-small" style="display: none;">\
                                <div class="sp-preview"><div class="sp-preview-inner" style="background-color: rgb(14, 23, 74);"></div></div></span></div>';
                            colorPanel.html(colorHtml);
                        }
                        btn.attr('dropdown-menu','bubble.showColor');
                    }else if(btnClass === 'anchor'){
                        //link input
                        var linkArea = utils.html.addTag(elem, 'div', false, false);
                        linkArea.addClass('menu-panel');
                        linkArea.addClass('link-area');
                        var linkInput = utils.html.addTag(linkArea, 'input', false, false);
                        linkInput.attr({
                            type: 'text'
                        });
                        var closeBtn = utils.html.addTag(linkArea, 'button', false, false);
                        closeBtn.click(function(e) {
                            e.preventDefault();
                            var editor = $(this).closest('.editor');
                            $(this).closest('.link-area').hide();
                            $(this).closest('.bubble').find('ul').show();
                        });
                        btn.attr('dropdown-menu','bubble.showLinkInput');
                    }else{
                        btn.attr('data-command', utils.commandMap[btnClass]);
                    }
                    btn.addClass(options.modifiers[cls]);
                }
                elem.find('a[data-command],button[data-command]').click(function(e) {
                    e.preventDefault();
                    bubble.hiddenMenu(elem);
                    var cmd = $(this).attr('data-command');
                    bubble.execCommand.call(elem,cmd);
                });
                elem.find('button[dropdown-menu]').click(function(e) {
                    e.preventDefault();
                    bubble.hiddenMenu(elem);
                    var menu = $(this).attr('dropdown-menu');
                    var func = eval(menu); //执行下拉方法
                    var s = utils.selection.save();
                    func.call(elem,s,this.className);
                });
            },
            show: function() {
                var tag;
                if($(this).attr('is-translate') == "true"){
                    tag = $('.jquery-notebook.bubble.translate');
                    if (!tag.length) {
                        tag = utils.html.addTag($(d.body), 'div', false, false);
                        tag.addClass('jquery-notebook bubble translate');
                        if(!tag.hasClass(toolbar)){
                            tag.addClass(toolbar);
                        }
                        tag.empty();
                        bubble.buildMenu(this, tag);
                    }
                    tag.show();
                    bubble.updateState(tag);
                    if (!tag.hasClass('active')) {
                        tag.addClass('jump');
                    } else {
                        tag.removeClass('jump');
                    }
                    bubble.updatePos($(this), tag);
                    tag.addClass('active');
                }else{
                    var toolbar = $(this).attr('toolbar');
                    var prev = $(this).prev();
                    if(!prev.hasClass(toolbar)){
                        tag = $('<div class="jquery-notebook bubble active '+toolbar+'"></div>');
                        prev.after(tag);
                        bubble.buildMenu(this, tag);
                        bubble.updatePos($(this), tag);
                        bubble.updateState(tag);
                    }
                }
            },
            hide: function() {
                if($(this).attr('is-translate') == "true"){
                    var tag = $('.jquery-notebook.bubble.translate');;
                    if (!tag.hasClass('active')) return;
                    tag.removeClass('active');
                    setTimeout(function() {
                        if (tag.hasClass('active')) return;
                        tag.hide();
                    }, 500);
                }
            },
            hiddenMenu:function(elem){
                elem.find('.menu-panel').hide();
            },
            showLinkInput: function(selection) {
                var _this = this;
                var elem = $(_this).find('.link-area input[type=text]');
                var hasLink = elem.closest('.jquery-notebook').find('button.anchor').hasClass('active');
                elem.unbind('keydown');
                elem.keydown(function(e) {
                    var elem = $(this);
                    utils.keyboard.isEnter(e, function() {
                        e.preventDefault();
                        var url = elem.val();
                        if (utils.validation.isUrl(url)) {
                            utils.selection.restore(selection);
                            bubble.execCommand('createLink '+url);
                        } else if (url === '' && hasLink) {
                            var el = $(utils.selection.getContainer(selection)).closest('a');
                            el.contents().first().unwrap();
                            bubble.updateState(_this);
                        }
                        $(_this).find('.link-area').hide();
                    });
                });
                elem.bind('paste', function(e) {
                    var elem = $(this);
                    setTimeout(function() {
                        var text = elem.val();
                        if (/http:\/\/https?:\/\//.test(text)) {
                            text = text.substring(7);
                            elem.val(text);
                        }
                    }, 1);
                });
                var linkText = 'http://';
                if (hasLink) {
                    var anchor = $(utils.selection.getContainer(selection)).closest('a');
                    linkText = anchor.prop('href') || linkText;
                }
                $(_this).find('.link-area').show();
                elem.val(linkText).focus();
            },
            showColor:function(selection,cmd){
                var _this = this;
                cmd = (cmd=='color' ? 'ForeColor' : 'BackColor');
                var panel = $(_this).find('.color-panel');
                if($(this).parent().hasClass('col-active')){
                    panel.find('.input-small').minicolors('destroy');
                }
                panel.show();
                panel.find(".color-item").off('click').on('click',function(e){
                    var color = $(this).find('.face').css('background-color');
                    utils.selection.restore(selection);
                    bubble.execCommand.call(_this,cmd+" "+color);
                    panel.hide();
                });
                panel.find('.sp-preview-inner').off('click').on('click',function(e){
                    if($(this).parent().hasClass('col-active')){
                        var color = $(this).css('background-color');
                        utils.selection.restore(selection);
                        bubble.execCommand.call(_this,cmd+" "+color);
                        panel.find('.input-small').minicolors('destroy');
                        $(this).parent().removeClass('col-active');
                        panel.hide();
                    }else{
                        var format = 'rgb';
                        var opacity = '1';
                        if(cmd === 'ForeColor'){
                            format = 'hex';
                            opacity = undefined;
                        }
                        panel.find('.input-small').minicolors({
                            control: 'hue',
                            defaultValue: '',
                            format: format,
                            inline: 'true',
                            opacity:opacity,
                            letterCase: 'lowercase',
                            position: 'top right',
                            change: function(hex, opacity) {
                                var color;
                                try {
                                    color = hex ? hex : 'transparent';
                                    panel.find('.sp-preview-inner').css({
                                        'background-image':'',
                                        'background-color':color
                                    });
                                } catch(e) {}
                            },
                            theme: 'default'
                        });
                        $(this).parent().addClass('col-active');
                    }
                });
            },
            showSize:function(selection){
                var _this = this;
                var panel = $(_this).find('.size-panel');
                panel.find("li>a").off('click').on('click',function(e){
                    var cls = bubble.getCurEditor(selection.commonAncestorContainer);
                    utils.selection.restore(selection);
                    d.execCommand("fontSize", 0, "1");
                    var editor = "."+cls.split(" ").join(".");
                    var edit = $(editor);
                    var fontElements = edit.find("font");
                    var size = $(this).attr('data-val');
                    for (var i = 0, len = fontElements.length; i < len; ++i) {
                        if (fontElements[i].size == "1") {
                            fontElements[i].removeAttribute("size");
                            fontElements[i].style.fontSize = size;
                        }
                    }
                    panel.hide();
                });
                panel.show();
            },
            showFont:function(selection){
                var _this = this;
                var panel = $(_this).find('.family-panel');
                panel.find("li>a").off('click').on('click',function(e){
                    utils.selection.restore(selection);
                    var cmd = $(this).attr('data-command');
                    bubble.execCommand.call(_this,cmd);
                    panel.hide();
                });
                panel.show();
            },
            execCommand:function (commandWithArgs, valueArg) {
                var commandArr = commandWithArgs.split(' '),
                    command = commandArr.shift(),
                    args = commandArr.join(' ') + (valueArg || '');
                d.execCommand(command, 0, args);
                bubble.updateState(this);
            }
        },
        actions = {
            bindEvents: function(editor) {
                editor.keydown(events.keydown);
                editor.keyup(events.keyup);
                editor.bind('paste', events.paste);
                editor.mousedown(events.mouseClick);
                editor.mouseup(events.mouseUp);
                editor.mousemove(events.mouseMove);
                $(document).on('mouseup',function(e) {
                    if (e.target == e.currentTarget && cache.isSelecting) {
                        events.mouseUp.call(editor, e);
                    }else if(!$(e.target).parents().hasClass('jquery-notebook')){
                        bubble.hide.call(editor);
                    }
                });
            },
            setPlaceholder: function(e) {
                if (/^\s*$/.test($(this).text())) {
                    $(this).empty();
                    var placeholder = utils.html.addTag($(this), 'p',true,true);
                    placeholder.html($(this).attr('editor-placeholder'));
                } else {
                    $(this).find('.placeholder').remove();
                }
            },
            preserveElementFocus: function() {
                var anchorNode = w.getSelection() ? w.getSelection().anchorNode : d.activeElement;
                if (anchorNode) {
                    var current = anchorNode.parentNode,
                        diff = current !== cache.focusedElement,
                        children = this.children,
                        elementIndex = 0;
                    if (current === this) {
                        current = anchorNode;
                    }
                    for (var i = 0; i < children.length; i++) {
                        if (current === children[i]) {
                            elementIndex = i;
                            break;
                        }
                    }
                    if (diff) {
                        cache.focusedElement = current;
                        cache.focusedElementIndex = elementIndex;
                    }
                }
            },
            prepare: function(editor, customOptions) {
                options = customOptions;
                editor.attr('editor-mode', options.mode);
                editor.attr('editor-placeholder', options.placeholder);
                editor.attr('contenteditable', true);
                editor.attr('is-translate',options.toolbarTranslate);
                editor.addClass('jquery-notebook editor');
                actions.setPlaceholder.call(editor, {});
                actions.preserveElementFocus.call(editor);
                if (options.autoFocus === true) {
                    // var firstP = elem.find('p:not(.placeholder)');
                    var firstP = editor.find('p');
                    if(firstP.html()){
                        utils.cursor.set(editor, 0, firstP);
                    }
                }
                if(!options.toolbarTranslate){
                    editor.attr('toolbar',$(editor).attr("id"));
                    bubble.show.call(editor);
                }
            }
        },
        events = {
            keydown: function(e) {
                var editor = this;
                utils.keyboard.isCtrl(e, function() {
                    cache.ctrl = true;
                }, function() {
                    cache.ctrl = false;
                });
                utils.keyboard.isShift(e, function() {
                    cache.shift = true;
                }, function() {
                    cache.shift = false;
                });
                utils.keyboard.isModifier.call(this, e, function(cmd) {
                    if (cache.ctrl) {
                        e.preventDefault();
                        e.stopPropagation();
                        bubble.execCommand.call(editor,cmd);
                    }
                });
                if (e.which === 13) { //enter
                    events.enterKey.call(editor, e);
                }else if (e.which === 27) { //esc
                    e.preventDefault();
                    e.stopPropagation();
                    bubble.hide.call(editor);
                }else if (e.which === 86 && cache.ctrl) { //ctrl + V
                    events.paste.call(editor, e);
                }else if(e.which === 8){  //backspace
                     events.backspace.call(this, e);
                }else if (cache.shift && e.keyCode == 9){  //shift + tab
                    e.preventDefault();
                    e.stopPropagation();
                    d.execCommand("Outdent");
                }else if(e.which === 9){   //tab
                    e.preventDefault();
                    e.stopPropagation();
                    d.execCommand("Indent");
                }
            },
            keyup: function(e) {
                var editor = this;
                actions.preserveElementFocus.call(this);
                if (cache.shift && e.which >= 37 && e.which <= 40) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(function() {
                        var txt = utils.selection.getText();
                        if (txt !== '') {
                            bubble.show.call(elem);
                        } else {
                            bubble.hide.call(elem);
                        }
                    }, 100);
                }
                if (cache.ctrl && e.which === 65) { //ctrl + A
                    setTimeout(function() {
                        bubble.show.call(elem);
                    }, 50);
                }
                /*
                 * This breaks the undo when the whole text is deleted but so far
                 * it is the only way that I fould to solve the more serious bug
                 * that the editor was losing the p elements after deleting the whole text
                 */
                if (e.which !== 8 && /^\s*$/.test($(this).text())) {
                    $(this).empty();
                    utils.html.addTag($(this), 'p', true, true);
                }
            },
            mouseClick: function(e) {
                cache.isSelecting = true;
                if ($(this).parent().find('.bubble:visible').length) {
                    var bubbleTag = $(this).parent().find('.bubble:visible'),
                        bubbleX = bubbleTag.offset().left,
                        bubbleY = bubbleTag.offset().top,
                        bubbleWidth = bubbleTag.width(),
                        bubbleHeight = bubbleTag.height();
                    if (mouseX > bubbleX && mouseX < bubbleX + bubbleWidth &&
                        mouseY > bubbleY && mouseY < bubbleY + bubbleHeight) {
                        return;
                    }
                }
            },
            mouseUp: function(e) {
                var editor = this;
                cache.isSelecting = false;
                setTimeout(function() {
                    var s = utils.selection.save();
                    if (s) {
                        if (s.collapsed) {
                            bubble.hide.call(editor);
                        } else {
                            e.preventDefault();
                            e.stopPropagation();
                            bubble.show.call(editor);
                        }
                    }
                }, 50);
            },
            mouseMove: function(e) {
                mouseX = e.pageX;
                mouseY = e.pageY;
            },
            enterKey: function(e) {
                if ($(this).attr('editor-mode') === 'inline') {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                var sel = utils.selection.getSelection();
                var elem = $(sel.focusNode.parentElement);
                var nextElem = elem.next();
                if(!nextElem.length && elem.prop('tagName') != 'LI') {
                    e.preventDefault();
                    e.stopPropagation();
                    var tagName = elem.prop('tagName');
                    if(tagName === 'OL' || tagName === 'UL') {
                        var lastLi = elem.children().last();
                        if(lastLi.length && lastLi.text() === '') {
                            lastLi.remove();
                        }
                    }
                    utils.html.addTag($(this), 'p', true, true);
                }
            },
            backspace:function(e){
                if (/^\s*$/.test($(this).text())) {
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).empty();
                    utils.html.addTag($(this), 'p', true, true);
                }
            },
            paste: function(e) {
                var id = 'jqeditor-temparea',
                    range = utils.selection.save(),
                    tempArea = $('#' + id);
                if (tempArea.length < 1) {
                    var body = $('body');
                    tempArea = $('<textarea></textarea>');
                    tempArea.css({
                        position: 'absolute',
                        left: -1000
                    });
                    tempArea.attr('id', id);
                    body.append(tempArea);
                }
                tempArea.focus();
                setTimeout(function() {
                    var clipboardContent = '',
                        paragraphs = tempArea.val().split('\n');
                    for(var i = 0; i < paragraphs.length; i++) {
                        clipboardContent += ['<p>', paragraphs[i], '</p>'].join('');
                    }
                    tempArea.val('');
                    utils.selection.restore(range);
                    //d.execCommand('delete');
                    d.execCommand('insertHTML', 0, clipboardContent);
                }, 500);
            }
        };

    $.fn.notebook = function(opt) {
        opt = $.extend({}, $.fn.notebook.defaults, opt);
        actions.prepare(this, opt);
        actions.bindEvents(this);
        return this;
    };
    $.fn.notebook.defaults = {
        hotKeys: {
            66 : 'bold',//ctrl+b meta+b
            73 : 'italic', //ctrl+i meta+i
            85 : 'underline', //ctrl+u meta+u
            90 : 'undo',  //ctrl+z meta+z
            89 : 'redo',  //ctrl+y meta+y
            76 : 'justifyleft',  //ctrl+l meta+l
            82 : 'justifyright',  //ctrl+r meta+r
            69 : 'justifycenter',  //ctrl+e meta+e
            74 : 'justifyfull',  //ctrl+j meta+j
        },
        toolbarTranslate:true,
        autoFocus: false,
        placeholder: '请在此输入文字',
        mode: 'multiline',
        modifiers: ['font','size','bold', 'italic', 'underline','color','bgcolor','indent','outdent', 'left','center','right','justify','ol', 'ul', 'anchor','clear'],
        fontfamily:['微软雅黑','Serif','Sans','Arial','Arial Black','Courier','Courier New','Comic Sans MS','Helvetica','Impact','Lucida Grande','Lucida Sans','Tahoma','Times','Times New Roman','Verdana'],
        fontsize:['12px','14px','16px','18px','20px','22px','24px','26px','28px','30px','34px','38px','42px','48px','54px','60px','70px','80px','90px','110px','150px','200px','300px']
    };

})(jQuery, document, window);
