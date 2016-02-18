define([
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/View/FeatureGlyph/Box'
       ],
       function(
            declare,
            lang,
            Box
       ) {

return declare(Box, {

    renderBox: function( context, viewInfo, feature, top, overallHeight, parentFeature, style ) {

        var left  = viewInfo.block.bpToX( feature.get('start') );
        var width = viewInfo.block.bpToX( feature.get('end') ) - left;

        style = style || lang.hitch( this, 'getStyle' );

        var height = this._getFeatureHeight( viewInfo, feature );
        if( ! height )
            return;
        if( height != overallHeight )
            top += Math.round( (overallHeight - height)/2 );

        // background
        var cx=left+4;
        var cy=top+10;
        var rad=10;


        var bgcolor = style( feature, 'color' );
        if( bgcolor ) {
            context.beginPath();
            if(feature.get('dbnsfp_exac')) {
                console.log('exac',feature.get('dbnsfp_exac'));
                var af = feature.get('dbnsfp_exac').af;
                console.log('exac',af);

                context.beginPath();
                context.moveTo(cx, cy);
                context.arc(cx, cy, rad, 0, af*2 * Math.PI, false);
                context.closePath();
                context.fillStyle = 'orange';
                context.fill();

                context.beginPath();
                context.moveTo(cx, cy);
                context.arc(cx, cy, rad, af*2 * Math.PI,2*Math.PI, false);
                context.closePath();
                context.fillStyle = 'blue';
                context.fill();
            }
        }
        else {
            context.clearRect( left, top, Math.max(1,width), height );
        }
    }

});
});
