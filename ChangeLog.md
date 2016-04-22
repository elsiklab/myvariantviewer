# Version 0.3.0

- Name the specialized queries implemented in 0.2.0 in new category in the test data directory
- Add Name store to query myvariant.info for variants using the searchbar in JBrowse with demo in test data directory

# Version 0.2.0

- Add ability to query some indexed start/end coordinates for specific databases
- New query format query?q=evs.chrom:[{refseq} TO {refseq}] AND evs.hg19.start:<={end} AND evs.hg19.end:>={start}&size=1000&email=colin.diesh@gmail.com&fields=evs
- Old query format query?q={refseq}:{start}-{end} AND _exists_:gwassnps&size=1000&email=colin.diesh@gmail.com&fields=gwassnps
- Note: not all database annotations have the new format, but those that are available have been setup in test/trackList.json

# Version 0.1.0

- Added ability to get variants from myvariant.info and genes from mygene.info
- Uses scrolling query if there are a large number of variant in a region
- Adds a diamond glyph for nice rendering
- Parses all information from the different databases to display in View
  details popup
- Adds a test dataset
