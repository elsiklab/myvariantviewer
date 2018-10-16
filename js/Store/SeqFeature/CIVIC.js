define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/request',
            'dojo/Deferred',
            'JBrowse/Util',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
            'JBrowse/Store/SeqFeature/RegionStatsMixin',
        ],
        function(
            declare,
            lang,
            array,
            dojoRequest,
            Deferred,
            Util,
            SimpleFeature,
            SeqFeatureStore,
            DeferredFeatures,
            DeferredStats,
            GlobalStatsEstimationMixin,
            RegionStatsMixin,
        ) {

return declare([ SeqFeatureStore, DeferredFeatures, DeferredStats, GlobalStatsEstimationMixin, RegionStatsMixin ],
{
    _defaultConfig() {
        return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
            urlTemplate: 'https://civicdb.org/api/variants?count=9999999&page=1'
        });
    },

    constructor( args ) {
        this.features = [];
        this._loadFeatures();
    },

    _loadFeatures() {
        const features = this.bareFeatures = [];

        let featuresSorted = false;
        const seenRefs = this.refSeqs = {};

        let addFeature = feature => {
            // skip variants with no location
            if (!feature.coordinates.chromosome) return

            // TODO: synthesize two features for multi-location variants
            var prevFeature = features[ features.length-1 ];
            var regRefName = this.browser.regularizeReferenceName( feature.coordinates.chromosome );
            if( !( regRefName in seenRefs ))
                seenRefs[ regRefName ] = features.length;

            features.push( feature );
        }

        let endFeatures = () => {
            if( ! featuresSorted ) {
                features.sort( this._compareFeatureData );
                // need to rebuild the refseq index if changing the sort order
                this._rebuildRefSeqs( features );
            }

            this._estimateGlobalStats()
                 .then( stats => {
                    this.globalStats = stats;
                    this._deferred.stats.resolve();
                 })

            this._deferred.features.resolve( features );
        }

        const fail = this._failAllDeferred.bind(this)

        // fetch the whole file, parse, and store
        dojoRequest(this.getConf('urlTemplate'), {
            method: 'GET',
            handleAs: 'json',
            headers: {
                "X-Requested-With": null
            }
        })
        .then(civicData => civicData.records.forEach(addFeature))
        .then(endFeatures, fail)
    },

    _rebuildRefSeqs: function( features ) {
        const refs = {}
        for( var i = 0; i<features.length; i++ ) {
            var regRefName = this.browser.regularizeReferenceName(features[i].coordinates.chromosome)

            if( !( regRefName in refs ) )
                refs[regRefName] = i
        }
        this.refSeqs = refs
    },

    _compareFeatureData: function( a, b ) {
        const ac = a.coordinates
        const bc = b.coordinates
        if( ac.chromosome < bc.chromosome )
            return -1;
        else if( ac.chromosome > bc.chromosome )
            return 1;

        return ac.start - bc.start;
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB._deferred.features.then( function() {
            thisB._search( query, featureCallback, finishedCallback, errorCallback );
        });
    },

    _search: function( query, featureCallback, finishCallback, errorCallback ) {
        // search in this.features, which are sorted
        // by ref and start coordinate, to find the beginning of the
        // relevant range
        var bare = this.bareFeatures;
        var converted = this.features;

        var refName = this.browser.regularizeReferenceName( query.ref );

        var i = this.refSeqs[ refName ];
        if( !( i >= 0 )) {
            finishCallback();
            return;
        }

        var checkEnd = 'start' in query
            ? function(f) { return f.get('end') >= query.start; }
            : function() { return true; };

        for( ; i<bare.length; i++ ) {
            // lazily convert the bare feature data to JBrowse features
            var f = converted[i] ||
                ( converted[i] = function(b,i) {
                      bare[i] = false;
                      return this._formatFeature( b );
                  }.call( this, bare[i], i )
                );
            // features are sorted by ref seq and start coord, so we
            // can stop if we are past the ref seq or the end of the
            // query region
            if( f._reg_seq_id != refName || f.get('start') > query.end )
                break;

            if( checkEnd( f ) ) {
                this.applyFeatureTransforms([f]).forEach(featureCallback)
            }
        }

        finishCallback();
    },

    supportsFeatureTransforms: true,

    _formatFeature: function( data ) {
        var f = new SimpleFeature({
            data: this._featureData( data ),
            id: data.id
        });
        f._reg_seq_id = this.browser.regularizeReferenceName( data.coordinates.chromosome );
        return f;
    },

    _featureData: function( data ) {
        const f = lang.mixin( {}, data )
        const { coordinates } = data
        if (coordinates.start >= coordinates.end) {
            f.start = coordinates.start - 1
            f.end = f.start
        } else {
            f.start = coordinates.start - 1
            f.end = coordinates.stop
        }
        f.seq_id = coordinates.chromosome
        return f
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     *
     * Implemented as a binary interrogation because some stores are
     * smart enough to regularize reference sequence names, while
     * others are not.
     */
    hasRefSeq: function( seqName, callback, errorCallback ) {
        var thisB = this;
        this._deferred.features.then( function() {
            callback( thisB.browser.regularizeReferenceName( seqName ) in thisB.refSeqs );
        });
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.urlTemplate
        };
    }

});
});
