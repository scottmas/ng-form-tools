(function(window, angular){

var app = angular.module('ngFormTools', ['ngExtender']);
app.directive("uiForm", ["$q", "$compile", function($q, $compile) {
    "use strict";
    var inputNum = 1;

    var masterController = {
        dName : 'uiForm',
        dCount: 1,
        newID : function(){
            return this.dName + this.dCount;
        }
    }

    return {
        restrict: 'E',
        scope: {
            formInfo : "=",
            initVals : "=",
            formConfig: "="
        },
        template: '<form role="form" novalidate></form>',
        link: function (scope, elm, attrs){

            var formInfo = scope.formInfo,
                initVals = scope.initVals || {},
                modelNames = [];

            renderForm(formInfo, initVals, modelNames, elm, scope)

            scope.$watch('formInfo', function(newVal, oldVal){
                if(newVal !== oldVal){
                    formInfo = newVal;
                    renderForm(formInfo, initVals, modelNames, elm, scope)
                }
            }, true);

            scope.$watch('initVals', function(newVal, oldVal){
                if(newVal !== oldVal){
                    initVals = newVal;
                    renderForm(formInfo, initVals, modelNames, elm, scope)
                }
            }, true);

            scope.submitForm = function(){

                var formVals = {};
                for(var i = 0, len = modelNames.length; i < len; i++){
                    formVals[modelNames[i]] = scope[modelNames[i]];
                }

                if(elm.find('form').tooltipValidateForm()){

                    if(scope.$triggerHook("uiForm.beforeSubmit", formVals) === false)
                        return;

                    var promise = scope.$triggerHook('uiForm.beforeSubmitPromise', formVals);
                    if(promise) {
                        var ajaxLoadElm = elm.find("[type='submit']").ajaxOverlay('white');
                        promise.then(function(success){
                            ajaxLoadElm.ajaxOff();
                            if(success){
                                scope.$triggerHook("uiForm.submitSuccess", formVals);
                            }
                        })
                    } else{
                        scope.$triggerHook("uiForm.submitSuccess", formVals);
                    }
                }
            }

            //Directive API
            var submitError, errorClone;
            scope.$onHookCall("uiForm.submitError", function(msg){
                if(!submitError){
                    submitError = angular.element("<alert class='nonUnique' close='closeUniqueAlert()'></alert>");
                }

                if(errorClone){
                    errorClone.remove();
                }

                submitError.html(msg);
                errorClone = $compile(submitError.clone())(scope);
                angular.element(document).find("body").append(errorClone);
                scope.$on("$destroy", function(){
                    if(errorClone) errorClone.remove();
                })

            })
            scope.closeUniqueAlert = function(){
                errorClone.remove();
            }
        }
    }

    function renderForm(formInfo, initVals, modelNames, elm, scope){
        elm.find('form').html("");
        modelNames.length = 0;

        for(var prop in formInfo){
            if(!formInfo.hasOwnProperty(prop))
                continue;

            modelNames.push(prop);

            scope[prop] = null;
            var row = angular.extend({}, formInfo[prop]),
                rowElm, tempElm, tempVal;

            //Type
            if(!row['type']) row['type'] = 'text';//default to text inputs

            tempElm = scope.$triggerHook('uiForm.' + row['type'], prop, row);

            if(tempElm && tempElm[0] && tempElm[0] instanceof HTMLElement){
                rowElm = angular.extend({}, tempElm);
            } else{
                switch (row['type']){
                    case "textarea":
                        tempVal = initVals[prop] || row['value'] || "";
                        rowElm = angular.element("<textarea ng-model='" + prop + "' id='nj-form-" + inputNum + "' class='form-control' >" + tempVal + "</textarea>")
                        delete row['value'];
                        break;
                    case "select":
                        rowElm = angular.element("<select ng-model='" + prop + "' id='nj-form-" + inputNum + "'class='form-control'></select>")
                        if(row['options']){

                            var defaultSet;
                            for(var i = 0, len = row['options'].length; i < len; i++){
                                var optionElm = angular.element("<option value='" + row['options'][i] + "'>" + row['options'][i] + "</option>");
                                rowElm.append(optionElm);

                                if(!defaultSet &&
                                    (defaultSet = initVals[prop] == row['options'][i] || row['selected'] == row['options'][i])){
                                    optionElm[0].setAttribute("selected", "");
                                }
                            }
                            delete row['options'];
                        }
                        break;

                    default:
                        tempVal = initVals[prop] || row['value'] || "";
                        rowElm = angular.element("<input ng-model='" + prop + "' type='" + row['type'] + "' id='nj-form-" + inputNum + "' value='" + tempVal + "' class='form-control'/>")
                        delete row['value'];
                        break;
                }
            }
            if((tempVal = rowElm.val()) !== 'undefined'){
                scope[prop] = tempVal;
            } else{
                scope[prop] = initVals[prop] || "";
            }
            delete row['type'];

            //Label
            var label = "";
            if(row['label']){
                label = angular.element("<label for='nj-form-" + inputNum + "'>" + row['label'] + "</label>");
                delete row['label'];
            }


            //Remaining attributes
            for(var attr in row){
                if(!row.hasOwnProperty(attr))
                    continue;
                if(row[attr] === true)
                    rowElm[0].setAttribute(camelcaseToHyphen(attr), "");
                else
                    rowElm[0].setAttribute(camelcaseToHyphen(attr), row[attr]);
            }

            rowElm.on('blur', blurHandler);
            var completeRow = angular.element("<div class='form-group'></div>").append(label).append(rowElm);

            elm.find('form').append(completeRow);
            inputNum++;
        }

        elm.find('form').append('<button type="submit" class="btn btn-default" ng-click="submitForm()">Submit</button>');

        $compile(elm.find("form"))(scope);

        function blurHandler(event){
            var thisElm = angular.element(event.target);
            scope.$triggerHook("uiForm.inputBlur", thisElm.attr('ng-model'), thisElm.val());

        };
    }

    function camelcaseToHyphen(string){
        return string.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
}]);



    /*
    *       Validation Tools
    *
    */

    app.config(function(){

        //Todo: don't extend angular.element move these methods to a mini internal library
        //Extend angular.element.find() to include class, id, and attr selectors
        angular.element.prototype.find = function(){
            var args = Array.prototype.slice.call(arguments).join();
            return angular.element(this[0].querySelectorAll(args));
        }

        //Similar to jQuery offset
        angular.element.prototype.offset = function(){
            var curleft = 0,
                curtop = 0,
                obj = this[0];

            if (obj.offsetParent) {
                do {
                    curleft += obj.offsetLeft;
                    curtop += obj.offsetTop;
                } while (obj = obj.offsetParent);
                return {left: curleft, top: curtop};
            } else{
                return {left: 0, top:0};
            }
        }

        //Similar to jQuery each
        angular.element.prototype.each = function(callback){
            for(var i = 0, len=this.length; i < len; i++){
                callback.apply(this[i])
            }
            return this;
        };

        angular.element.prototype.tooltipValidateForm = function() {
            if(angular.element(this).hasClass("ng-invalid")){
                angular.element(this).find('[ng-model]').each(function(){
                    angular.element(this).tooltipValidate();
                })
                return false;
            } else{
                return true;
            }
        }

        angular.element.prototype.tooltipValidate = (function(){
            var rules = {
                ".input-error": "{ " +
                    "position:absolute; " +
                    "background: white; " +
                    "border-radius:4px; " +
                    "padding: 10px;" +
                    "box-shadow: 1px 2px 2px #888888;" +
                    "user-select: none;" +
                    "border: 1px solid rgb(235,235,235);" +
                    "cursor: default;" +
                    "}",
                ".input-error div.input-error-inner": "{" +
                    "font-size: 14px;" +
                    "color: #888888;" +
                    "margin-left:30px;" +
                    "display:inline-block;" +
                    "}",
                ".input-error img": "{" +
                    "width: 20px;" +
                    "height: auto;" +
                    "position: absolute;" +
                    "}",
                ".input-error:after, .input-error:before": "{" +
                    "content: '';" +
                    "display: block;" +
                    "position: absolute;" +
                    "width: 0;" +
                    "height: 0;" +
                    "border-style: solid;" +
                    "}",
                ".input-error:before": "{" +
                    "top:10px;" +
                    "border-color: transparent white transparent transparent ;" +
                    "border-width: 10px;" +
                    "left: -20px;" +
                    "z-index:100;" +
                    "}",
                ".input-error:after": "{" +
                    "top:9px;" +
                    "border-color: transparent rgb(235,235,235) transparent  transparent ;" +
                    "border-width: 11px;" +
                    "left: -22px;" +
                    "}"


            }
            injectCSS(rules);

            return function(){
                var thisElm = angular.element(this[0]);
                var invalidName = 'ng-invalid';
                if(thisElm.hasClass(invalidName)){
                    var classList = thisElm[0].classList;
                    var start, whyInvalid = [];
                    for(var j in classList){
                        if(classList.hasOwnProperty(j) && typeof classList[j] === 'string'){
                            if(start = classList[j].indexOf(invalidName + "-") !== -1){
                                whyInvalid.push(classList[j].substr(start + invalidName.length));
                            }
                        }
                    }

                    if(whyInvalid.length > 0){
                        var message = "";
                        for(var i = 0, len = whyInvalid.length; i < len; i++ ){
                            switch(whyInvalid[i]){
                                case 'required':
                                    message += "You must enter a value <br/>"
                                    break;
                                case 'email':
                                    message += "You must enter a valid email address <br/>"
                                    break;
                                case 'confirm':
                                    message += "Your passwords must match <br/>";
                                    break;
                                case 'date':
                                    message += "You must enter a date in the format YYYY-MM-DD <br/>"
                                    break;
                                case 'number':
                                    message += "You must enter only numbers <br/>"
                                    break;
                                case 'url':
                                    message += "You must enter a valid URL <br/>"
                                    break;
                                default:
                                    message += "This item fails the following criteria: " + whyInvalid[i] + "<br/>"
                            }
                        }
                        var error = angular.element("<div class='input-error'><img src='assets/warning-icon.jpg'/> <div class='input-error-inner'>" + message + "</div></div>");
                        var pos = {
                            top: (thisElm.offset().top - 10) + 'px',
                            left: (thisElm.offset().left + thisElm[0].offsetWidth + 10) + 'px'
                        }
                        error.css(pos);
                        angular.element(document.getElementsByTagName("body"))
                            .append(error)

                        //Some browsers trigger this on the submit click, so delay a sec.
                        setTimeout(function(){
                            angular.element(window)
                                .bind("click keypress resize", function alertHandler() {
                                    error.remove();
                                    angular.element(document)
                                        .off("click keypress resize", alertHandler)
                                })
                        },100);
                    }
                    return false;
                } else{
                    return true;
                }
            }
        })()
    })

    app.directive('valEquals', function() {
        return {
            require: '?ngModel',
            link: function(scope, elm, attrs, ctrl) {
                if(ctrl){ //Silent fail if the element does not have a ngModel directive also
                    ctrl.$setValidity('confirm', false);

                    var checkMatch = function (){
                        scope.$evalAsync(function(){
                            var valid = elm.val() == scope.$eval(attrs['valEquals'])
                            ctrl.$setValidity('confirm', valid);
                        })

                    }

                    angular.element(document).bind("keypress", checkMatch)

                    scope.$on('$destroy', function(){
                        angular.element(document).unbind('keypress', checkMatch)
                    });

                }
            }
        };
    });


    /*
     *       AJAX Visualization Helpers
     *
     */

    app.config(function(){

        //Todo: There's no reason we need to extend angular.element. Push these methods into a mini library

        //Removes all ajax icons from the element
        angular.element.prototype.ajaxOff = function() {
            var sibling;
            if(this.hasClass('ajax-icon') && (sibling = this.next()).hasClass('ajax-image')){
                sibling.remove();
            }
            this.removeClass('ajax-icon ajax-overlay ajax-overlay-white ajax-overlay-black');
            return this;
        }


        /*
         A visual helper function. Allow easy toggling of little ajax symbols to right of inputs:

         angular.element(".someElement").ajaxIcon('start'); //Appends the loader symbol to the right of the element. If not removed within 5 seconds, assumes failure

         function someAjaxCallback(success){
         if(success)
         angular.element(someElement).ajaxIcon('success') //green checkmark that goes away after a while.
         else
         angular.element(someElement).ajaxIcon('failure') //red x mark that goes away after a while.
         }
         */

        angular.element.prototype.ajaxIcon = function(type, position) {
            this.ajaxOff().addClass("ajax-icon");
            var ajaxLoader = angular.element("<img class='ajax-image' src=''/>");

            if (type == 'start' || !type){
                ajaxLoader.attr("src", "./assets/white-bg-gif.gif");
                this.after(ajaxLoader);
                window.setTimeout(function() {
                    this.ajaxIcon('failure');
                }, 5000)
            }
            else if (type == "success") {
                ajaxLoader.attr("src", "./assets/tick_animated.gif");
                this.after(ajaxLoader);
                window.setTimeout(function() {
                    if (ajaxLoader) ajaxLoader.remove();
                }, 3000)
            } else if (type == "failure") {
                ajaxLoader.attr("src", "./assets/cross_animated.gif");
                this.after(ajaxLoader);
                window.setTimeout(function() {
                    if (ajaxLoader) ajaxLoader.remove();
                }, 3000)
            }

            if(position == 'right' || !position){
                ajaxLoader.css({
                    position: "absolute",
                    'margin-top': "12px",
                    'margin-left': "3px"
                })
            } else if (position = 'left'){
                ajaxLoader.css({
                    position: "absolute",
                    'margin-top': "12px",
                    'margin-left': "3px",
                    left: "-13px"
                })
            }

            return this;
        };

        angular.element.prototype.ajaxOverlay = (function() {

            var rules = {
                '.ajax-overlay': "{" +
                    "position: relative;" +
                    "}",

                ".ajax-overlay:after": "{" +
                    "content: '';" +
                    "position:absolute;" +
                    "left:0;" +
                    "right:0;" +
                    "bottom:0;" +
                    "top:0;" +
                    "background-repeat:no-repeat;" +
                    "background-position:center;" +
                    "z-index: 99999;" +
                    "}",
                ".ajax-overlay-black:after": "{" +
                    "background-image: url(assets/black-bg-ajax.gif);" +
                    "background-color:rgba(0,0,0,.5);" +
                    "}",
                ".ajax-overlay-white:after": "{" +
                    "background-image: url(assets/white-bg-ajax.gif);" +
                    "background-color:rgba(255,255,255,.5);" +
                    "}"
            };

            injectCSS(rules);

            return function(color) {
                this.addClass('ajax-overlay ajax-overlay-' + color)
                return this;
            }
        }())
    })

    //Although injecting CSS isn't standard, for a simple helper library like this it provides a good way to encapsulate the code
    //in a single javascript file and have no external dependencies.
    function injectCSS(rules) {
        /* Expect rules of the form:

         var rules = {
         ".woot" : "{ float: right; margin:10px; background-color:#ff0; border:5px solid #f00; text-align:center; width:100px; }",
         ".woot p" : "{ line-height:100px; margin:auto; color:#00f; font-weight:bold;}"
         }

         */

        //Ensure it hasn't been added yet. If so return
        if (injectCSS[JSON.stringify(rules)]) return;
        injectCSS[JSON.stringify(rules)] = true;

        // make a new stylesheet
        var ns = document.createElement('style');
        document.getElementsByTagName('head')[0].appendChild(ns);

        if (!window.createPopup) {
            ns.appendChild(document.createTextNode(''));
        }
        var s = document.styleSheets[document.styleSheets.length - 1];

        for (selector in rules) {
            if (s.insertRule) {
                // it's an IE browser
                try {
                    s.insertRule(selector + rules[selector], s.cssRules.length);
                } catch (e) {}
            } else {
                // it's a W3C browser
                try {
                    s.addRule(selector, rules[selector]);
                } catch (e) {}
            }
        }
    }

})(window, window.angular);
