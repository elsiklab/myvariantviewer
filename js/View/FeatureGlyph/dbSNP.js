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
            if(feature.get('dbsnp_alleles')) {
                console.log('dbsnp',feature.get('dbsnp_alleles'));
                var alleles = feature.get('dbsnp_alleles');
                var accum = 0;
                var preaccum = 0;
                var colors = ['blue','orange','green','red'];
                for(key in alleles) {
                    var allele=alleles[key];
                    console.log(allele);
                    if(!allele.freq) continue;
                    accum+=allele.freq;
                    context.beginPath();
                    context.moveTo(cx, cy);
                    context.arc(cx, cy, rad, preaccum*Math.PI*2, accum *2* Math.PI, false);
                    context.closePath();
                    console.log(key,colors[key]);
                    context.fillStyle = colors[key];
                    context.fill();
                    preaccum=accum;
                }
            }
        }
        else {
            context.clearRect( left, top, Math.max(1,width), height );
        }
    }

});
});
