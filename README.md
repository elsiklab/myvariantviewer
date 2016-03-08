# myvariantviewer

A JBrowse plugin that fetches info from MyVariant.info and MyGene.info and displays them.

## Example configuration

Fetch genes and variants from hg19:

      {
         "storeClass" : "MyVariantViewer/Store/SeqFeature/Genes",
         "urlTemplate" : "http://mygene.info/v2/query?q=hg19.{refseq}:{start}-{end}&fields=all&email=colin.diesh@gmail.com&size=1000",
         "subParts" : [
            "exon"
         ],
         "type" : "CanvasFeatures",
         "label" : "MyGene.info",
         "hg19" : true
      },
      {
         "storeClass" : "MyVariantViewer/Store/SeqFeature/Variants",
         "urlTemplate" : "query?q={refseq}:{start}-{end}&size=1000&fetch_all=true&email=colin.diesh@gmail.com",
         "baseUrl": "http://myvariant.info/v1/",
         "type" : "CanvasFeatures",
         "label" : "MyVariant.info"
      }

Note: we now use a "scroll query" so fetch_all should be supplied in the URL template

## Example color config

To color variants according to whether they appear in some given database, for example, you can try the following function:

If for example a variant exists in COSMIC, you know it's trouble!

```
colorfun=function(feature) {
    if(feature.get('cosmic_attrs')) return 'red';
    if(feature.get('dbsnp_attrs')) return 'green';
    else if(feature.get('snpeff_attrs')) return 'goldenrod';
    else if(feature.get('snpeff_0_attrs')) return 'orange';
    else if(feature.get('clinvar_attrs')) return 'blue';
    else if(feature.get('wellderly_attrs')) return 'purple';
    else return 'lightgreen';
  }
```



## Screenshots

![](img/out.png)

![](img/example.png)


