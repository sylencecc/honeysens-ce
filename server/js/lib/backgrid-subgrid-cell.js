/*
  backgrid-subgrid-cell
  David Crossman - October 8, 2013
  Patched by Pascal Brückner
*/

(function (window, $, _, Backbone, Backgrid) {

    function requireOptions(options, requireOptionKeys) {
        for (var i = 0; i < requireOptionKeys.length; i++) {
            var key = requireOptionKeys[i];
            if (_.isUndefined(options[key])) {
                throw new TypeError("'" + key + "' is required");
            }
        }
    }
    function requireTypeOrder(options, requireOptionType, placement) {
        var optionsModels = options.collection.models;
        for (var i = 0; i < optionsModels.length; i++) {
            if (!(optionsModels[placement]._previousAttributes.cell == requireOptionType)) {
                throw new TypeError("'" + requireOptionType + "' is not in the required column");
            }
        }
    }
    function resolveNameToClass(name, suffix) {
        if (_.isString(name)) {
            var key = capitalize(name) + suffix;
            var klass = Backgrid[key] || Backgrid.Extension[key];
            if (_.isUndefined(klass)) {
                throw new ReferenceError("Class '" + key + "' not found");
            }
            return klass;
        }

        return name;
    }

    /*
       SubgridRow is a simple container view that takes a grid instance and renders a
       grid within the specific column.
    
       @class Backgrid.SubgridRow
       @extends Backbone.View
     */
    var SubgridRow = Backgrid.SubgridRow = Backbone.View.extend({

        tagName: "tr",

        className: "backgrid-subgrid-row",

        submodel: Backbone.Model.extend({}),

        /**
           Initializes a row view instance.
      
           @param {Object} options
           @param {Backbone.Collection.<Backgrid.Column>|Array.<Backgrid.Column>|Array.<Object>} options.columns Column metadata.
           @param {Backbone.Model} options.model The model instance to render.
      
           @throws {TypeError} If options.columns or options.model is undefined.
         */
        initialize: function (options) {
            var thisView = this;
            this.model = this.parent = options.model;
            var GridColumnView = Backbone.View.extend({ tagName: "td" });
            var SubCollection = Backbone.Collection.extend({ model: this.submodel });
            this.gridColumnView = new GridColumnView({});
            this.sideColumnView = new GridColumnView({});

            this.el.id = this.model.get("id");
            requireOptions(options, ["columns", "model"]);
            this.columns = options.columns;
            var subcolumns = this.subcolumns = this.model.get("subcolumns");
            if (!(subcolumns instanceof Backgrid.Columns)) {
                subcolumns = this.subcolumns = this.model.subcolumns = new Backgrid.Columns(subcolumns);
            }
            var subcollection = this.subcollection = this.model.get("subcollection");
            if (!(subcollection instanceof Backbone.Collection)) {
                subcollection = this.subcollection = this.model.subcollection = new SubCollection(subcollection);
            }

            thisView = this;
            this.subcollection.forEach(function (item) {
                item.parent = thisView.parent;
            });
            this.subgrid = new Backgrid.Grid({
                columns: this.subcolumns,
                collection: this.subcollection,
                className: 'table'
            });

            this.listenTo(Backbone, "SubgridCell:remove", this.render);
            this.listenTo(this.model, "change", this.render);
        },
        /**
           Renders a row containing a subgrid for this row's model.
         */
        render: function () {
            this.$el.empty();
            this.gridColumnView.el.colSpan = (this.columns.length - 0);
            // Appends the first  empty column
            //this.$el.append(this.sideColumnView.render().$el);
            // Appends the subgrid column that spans the rest of the table 
            this.$el.append(this.gridColumnView.render().$el);
            // Appends the Subgrid
            this.gridColumnView.$el.append(this.subgrid.render().$el);
            return this;
        }
    });

    /*
      SubgridCell is a cell class to expand and collaspe another grid within
      the grid specific to each row.
    
      @class Backgrid.Subgrid
      @extends Backgrid.Cell
    */

    var SubgridCell = Backgrid.SubgridCell = Backgrid.Cell.extend({

        /** @property */
        className: "subgrid-cell",
        // define the icon within the cell
        icon: function () {
            var iconOptions = "+";
            if (this.model.get("substate") == "expanded")
                iconOptions = "-";

            return (iconOptions);
        },
        optionValues: undefined,

        /**
           Initializer.
      
           @param {Object} options
           @param {Backbone.Model} options.model
           @param {Backgrid.Column} options.column
           @param {Backgrid.Columns} options.column.attributes
      
           @throws {ReferenceError} If formatter is a string but a formatter class of
           said name cannot be found in the Backgrid module.
        */
        initialize: function (options) {
            requireOptions(options, ["model", "column"]);
            requireOptions(options.column.attributes, ["optionValues"]);
            if (typeof this.model.get('subcolumns') == "undefined")
                this.model.set("subcolumns", options.column.get("optionValues"));
            //requireTypeOrder(options.column, "subgrid", 0);

            this.column = options.column;
            if (!(this.column instanceof Backgrid.Column)) {
                this.column = new Backgrid.Column(this.column);
            }
            this.listenToOnce(this.model.collection, "backgrid:sort", this.clearSubgrid);
            this.model.bind("remove", this.clearSubgrid, this);
            this.listenTo(this.model, "change", this.updateSubrow);
        },
        /**
          Renders a view.
        */
        render: function () {
            if (this.model.has("substate")) {
                if (this.model.get("substate") == "collasped") {
                    this.renderCollasped();
                } else {
                    this.renderExpanded();
                }
            } else {
                this.model.set("substate", "collasped");
            }
            this.$el.append(this.icon());
            return this;
        },

        events: {
            "click": "stateConverter"
        },

        /**
          Renders a Expanded view.
        */
        renderExpanded: function () {
            this.model.set("substate", "expanded");
            this.renderSubrow();
            this.model.set("subcollection", this.subrow.subcollection);
        },

        /**
          Renders a Collasped view.
        */
        renderCollasped: function () {
            this.model.set("substate", "collasped");
            if (this.subrow != undefined)
                this.subrow.remove();
        },

        /**
          Updates the Subrow's model to Parent's model
        */
        renderSubrow: function () {
            if (this.subrow) {
                this.subrow.remove();
            }
            this.subrow = new SubgridRow({ columns: this.column.collection, model: this.model });
            /* TO DO: Fix hacky solution */
            this.$el.parent("tr").after(this.subrow.render().$el);
            this.model.set("subgrid", this.subrow.subgrid);
        },
        /**
          Checks the current state of the cell, either:
          appends another row for the subgrid and appends the grid to the row 
          or removes the row from the parent grid,
          and saves the current data the model.
        */
        stateConverter: function () {
            this.$el.html("");
            if (this.model.get("substate") == "collasped") {
                this.renderExpanded();
            } else {
                this.renderCollasped();
            }
            this.model.set("subgrid", this.subrow.subgrid);
            this.model.set("subcollection", this.subrow.subcollection);
            if (this.model.has('url'))
                this.model.save();
            this.$el.append(this.icon());
        },
        /**
          Binds the remove function with the row when a model is removed.
        */
        clearSubgrid: function () {
            var thisView = this;
            // TO DO : Clean up code
            $(".backgrid-subgrid-row").filter(function () {
                return ($(this).attr("id") == thisView.model.get('id'));
            }).remove();
        },
        /**
          Removes the View.
        */
        remove: function () {
            this.model.unset("substate");
            if (this.subrow) {
                this.subrow.remove.apply(this, arguments);
                delete this.subrow;
            }
            return Backbone.View.prototype.remove.apply(this, arguments);
        }
    });

}(window, jQuery, _, Backbone, Backgrid));