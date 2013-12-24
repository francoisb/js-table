"use strict";

// global namespace
window.my = window.my || {};

// tools namespace
window.my.jstable = (function(jQuery) {

    var _formatters = {
        boolean: function(value) {
            if (typeof value === 'string') {
                switch(value.toLowerCase()) {
                    case "true":
                    case "yes":
                    case "1":
                        value = true;
                        break;
                    case "false":
                    case "no":
                    case "0":
                        value = false;
                }
            }

            if (value === null) {
                value = false;
            }

            if (typeof value !== 'boolean') {
                value = Boolean(value);
            }

            return value;
        },
        integer: function(value) {
            if (isNaN(value)) {
                value = 0;
            }
            return parseInt(value);
        },
        float: function(value) {
            if (typeof value === 'string') {
                value = value.replace(',', '.');
            }
            if (isNaN(value)) {
                value = 0;
            }
            return parseFloat(value);
        },
        string: function(value) {
            if (typeof value !== 'string') {
                value = '' + value;
            }
            return value.toLowerCase();
        }
    };

    function _format(subject, params) {
        var exp, name, param, result;

        result = subject;
        for (name in params) {
          param = params[name];
          exp   = new RegExp("\\$\{" + name + "}", 'g');
          result = result.replace(exp, param);
        }

        return result;
    }

    // JsTable constructor
    function JsTable(container, data, options) {
        jQuery(container).html('<table class="js-table"><thead></thead><tbody></tbody></table>');

        this._tableElm     = jQuery('#table-container').find('table:first');
        this._tableHeadElm = jQuery('#table-container').find('thead:first');
        this._tableBodyElm = jQuery('#table-container').find('tbody:first');

        this.data = jQuery.extend(true, {}, data);
        // init options
        if (typeof options === 'object') {
            for (name in options) {
                this['opt_' + name] = options[name];
            }
        }
    }
    // Apply constructor.
    JsTable.prototype.constructor = JsTable;

    JsTable.prototype.render = function() {
        this.renderHeader();
        this.renderBody();
        return this;
    };

    JsTable.prototype.renderHeader = function() {
        var
            name, attrName,
            self       = this,
            attributes = [],
            contents   = [],
            column     = null;

        for (name in this.data.columns) {
            column = this.data.columns[name];
            if (column.visible === false) {
                continue;
            }

            attributes = []
            if (!column.attributes) {
                column.attributes = {};
            }
            if (!column.attributes['class']) {
                column.attributes['class'] = '';
            }
            column.attributes['class'] += ' ' + name;
            if (column.sortable) {
                column.attributes['class'] += ' sortable';
            }

            for(attrName in column.attributes) {
                attributes.push(attrName + '="' + column.attributes[attrName] + '"');
            }

            contents.push('<th data-column="' + name + '" ' + attributes.join(' ') + '><span>' + column.label + '</span></th>');
        }

        if (this.data.actions.length === 1) {
            contents.push('<th class="actions">' + (this.opt_action_label || 'Action') + '</th>');
        } else if (this.data.actions.length > 1) {
            contents.push('<th class="actions">' + (this.opt_actions_label || 'Actions') + '</th>');
        }

        this._tableHeadElm.html('<tr>' + contents.join('') + '</tr>');

        // have to wait a bit to be sure that DOM is ok before setup events
        setTimeout(function() {
            self._tableHeadElm.find('th').click(function(event){
                var
                    element    = jQuery(event.srcElement || event.target).closest('th'),
                    column     = jQuery(this).data('column'),
                    columnData = self.data.columns[column],
                    order      = 'asc';

                if (column && columnData && columnData.sortable === true) {
                    if (element.hasClass('asc')) {
                        order = 'desc';
                    }
                    self._tableHeadElm.find('th').removeClass('asc').removeClass('desc');
                    element.addClass(order);
                    self.data.rows.sort(function(a, b) {
                        if (a[column] < b[column]) {
                            return (order === 'asc') ? -1 : 1;
                        }
                        if (a[column] > b[column]) {
                            return (order === 'asc') ? 1 : -1;
                        }
                        return 0;
                    });

                    self.renderBody();
                    if (typeof self.opt_callback_sort == 'function') {
                        self.opt_callback_sort(element, column);
                    }
                }
            });
        }, 100);

        return this;
    };

    JsTable.prototype.renderBody = function() {
        var
            i, name, y, attributes,
            self           = this,
            contents       = [],
            actionContents = [],
            rowContents    = [],
            column         = null,
            action         = null,
            row            = null,
            colValue       = null;

        for (i=0; i<this.data.rows.length; i++) {
            row         = this.data.rows[i];
            rowContents = [];
            for (name in row) {
                column = this.data.columns[name];
                if (column.visible === false) {
                    continue;
                }

                colValue = row[name];
                if (column.prepend) {
                    colValue = column.prepend + colValue;
                }
                if (column.append) {
                    colValue += column.append;
                }
                rowContents.push('<td>' + colValue + '</td>');
            }

            if (this.data.actions.length > 0) {
                actionContents = [];
                for (y=0; y<this.data.actions.length; y++) {
                    action     = this.data.actions[y];
                    attributes = [];

                    if (!action.attributes) {
                        action.attributes = {};
                    }
                    if (!action.attributes['class']) {
                        action.attributes['class'] = '';
                    }
                    column.attributes['class'] += ' ' + action.id;
                    for(name in action.attributes) {
                        if (name === 'class') {
                            attributes.push(name + '="' + action.id + ' ' + action.attributes[name] + '"');
                        } else {
                            attributes.push(name + '="' + action.attributes[name] + '"');
                        }
                    }
                    actionContents.push('<button type="button" data-action="' + action.id + '" ' + attributes.join(' ') +'>' + action.label + '</button>');
                }
                rowContents.push('<td class="actions">' + actionContents.join('') + '</td>');
            }

            contents.push(rowContents.join(''));
        }

        this._tableBodyElm.html('<tr>' + contents.join('</tr><tr>') + '</tr>');

        // have to wait a bit to be sure that DOM is ok before setup events
        setTimeout(function() {
            self._tableBodyElm.find('.actions button').click(function(event){
                var
                    element    = jQuery(event.srcElement || event.target),
                    trElm      = element.closest('tr'),
                    action     = jQuery(this).data('action'),
                    actionData = null,
                    rowData    = null;

                for (var i=0; i<self.data.actions.length; i++) {
                    if (self.data.actions[i].id === action) {
                        actionData = self.data.actions[i];
                    }
                }

                if (action && actionData) {
                    rowData = self.data.rows[trElm.index()];
                    if (rowData) {
                        if (actionData.confirm && !confirm(actionData.confirm)) {
                            return false;
                        }
                        if (typeof self.opt_callback_action == 'function') {
                            self.opt_callback_action(element, actionData.id, format(actionData.url, rowData), rowData);
                        }
                    }
                }
            });
        }, 100);

        return this;
    }

    JsTable.prototype.find = function(criterias) {
        var
            founded, colname, i, row, column, searchValue, value,
            exclude = [],
            trElms  = this._tableBodyElm.find('tr');

        for (colname in criterias) {
            if (exclude.length === this.data.rows.length) {
                break;
            }

            column = this.data.columns[colname];
            if (!column) {
                continue;
            }

            searchValue = criterias[colname];
            if (typeof _formatters[column.type] === 'function') {
                searchValue = _formatters[column.type](searchValue);
            }

            for (i=0; i<this.data.rows.length; i++) {
                row   = this.data.rows[i];
                value = row[colname];
                if (
                    value === searchValue
                    || ((typeof value === 'string') && (value.indexOf(searchValue) > -1))
                ) {
                    // ok
                } else {
                    exclude.push(i);
                }
            }
        }

        trElms.removeClass('hidden');
        for (i=0; i<exclude.length; i++) {
            trElms.eq(exclude[i]).addClass('hidden');
        }

        return this;
    };

    return JsTable;

})(window.jQuery);

