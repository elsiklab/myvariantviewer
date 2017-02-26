define([
    'dojo/_base/declare',
    'JBrowse/View/Track/CanvasFeatures',
],
function(
    declare,
    CanvasFeatures
) {
    return declare(CanvasFeatures, {
        renderDetailValue: function(parent, title, val, f, class_) {
            if(!val) return;
            this.inherited(arguments);
        }
    });
});
