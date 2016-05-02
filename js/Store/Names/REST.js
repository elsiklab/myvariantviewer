define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/store/util/QueryResults',
            'dojo/request/xhr',
            'dojo/io-query',
            'JBrowse/Store/Hash'
        ],
        function(
            declare,
            array,
            QueryResults,
            xhr,
            ioQuery,
            HashStore
        ) {

return declare( null,
{
    constructor: function( args ) {
        this.url = args.url;
    },

    query: function( query, options ) {
        var thisB = this;
        var name = ''+query.name;
        if( /\*$/.test( name ) ) {
            name = name.replace(/\*$/,'');
        }
        return xhr( thisB.url+"?"+ioQuery.objectToQuery({q: name} ),
                    { handleAs: "json" }
        ).then(function(data){
            var res = array.map(data.hits, function(dat) {
                var ret = dat._id.match(/(chr.*):g.([0-9]+)/);
                var chr = ret[1];
                var start = +ret[2];
                var val = Object.keys(dat).filter(function(key) { return !key.startsWith("_"); }).map(function(elt) { return {label: "MyVariant.info "+elt}; });
                return {
                    label: name + " ("+dat._id+")",
                    name: name + " ("+dat._id+")",
                    location: {ref: chr, start: start, end: (start+1), tracks: val},
                };
            });
            return QueryResults( res );
        }, function(err){
            // Handle the error condition
            return QueryResults( [] );
        });
    },

    get: function( id ) {
        return this.query(id, undefined);
    },

    getIdentity: function( object ) {
        return object.id;
    }

});
});
