# clay-sitemaps

A suite a tools for generating sitemaps for Clay sites.

Clay-sitemaps provides two "standard" sitemap middleware, one for text and one for XML, that can get you up and running quickly. It also provides utilities that can help you create your own sitemap logic.

## Quick Start

```
const sitemaps = require('clay-sitemaps')(someAmphoraInstance);

app
  .get('/sitemap.txt', sitemaps.standardText())
  .get('/sitemap.xml', sitemaps.standardXML({
    engines: { // engines for rendering sitemap templates
      handlebars: yourHandlebarsEngine
    }
  }));
```

This will create a textual sitemap at `/sitemap.txt` that includes URLs of published, public pages.

It will also create an XML sitemap at `/sitemap.xml` that includes published, public pages. Each page will appear as a `<url>` block with a `<loc>` set to the page's `url` property. Additionally, the `sitemap` template of each component on that page will be included in that block.



## Advanced usage

You can also use the functions behind clay-sitemaps to construct your own sitemap generation logic.

### sitemaps.streamPages(prefix) ###

Creates an object stream of ALL pages in amphora with `prefix`. These objects look like:

```
{
  pageRef: string,
  pageData: object
}
```

The `pageData` value is the page data **not** composed, i.e. it includes top-level component
references but no component data.

### Filters

Filters are functions that remove pages from the stream.

#### sitemaps.filters.publicFilter()

Returns a transform function that keeps only public pages from a pages stream.

#### sitemaps.filters.publishedFilter()

Returns a transform function that keeps only published pages from a pages stream.

### Transforms

Transforms are functions that modify a stream of pages or strings.

#### sitemaps.transforms.pages.toText()

Returns a transform function that converts a stream of pages to a stream of strings reflecting the URL of each page.

#### sitemaps.transforms.pages.toXML(locals, multiplex)

Returns a transform function that converts a stream of pages to a stream of XML including the URL of each page and rendered `sitemap` templates of all components on each page.

#### sitemaps.transforms.pages.compose(locals)

Returns a transform function that composes the `pageData` property in each item in a stream of pages so it includes all component data on that page.

#### sitemaps.transforms.strings.addBookends(prelude, postlude)

Returns a transform function that adds strings to the beginning and/or end of a stream of strings.
