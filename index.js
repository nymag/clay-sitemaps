'use strict';

const PageStreams = require('./page-streams'),
  sitemapStreams = require('./sitemap-streams'),
  _ = require('lodash'),
  multiplexTemplates = require('multiplex-templates'),
  handlebars = require('handlebars'),
  ARTICLE_XML_PRELUDE = require('./constants').ARTICLE_XML_PRELUDE;

/**
 * Returns an Express router for an article sitemap.
 * @param  {object} amphora - An instance of amphora
 * @param  {object} opts - Configuration options
 * @param  {string} opts.xmlPrelude - String to prepend to the XML
 * @param  {string} opts.xmlPostlude - String to append to the XML
 * @param  {function} opts.xmlTransform - Function that receives `locals` and returns a custom
 * stream transform object that converts each item in the stream into XML.
 * @param  {object} opts.engines - Multiplex engines object, for rendering sitemap template, if
 * no custom xmlTransform is defined.
 * @return {object} An express.Router()
 */
function generateSitemap(amphora, opts) {
  const pageStreams = PageStreams(amphora);

  opts = _.defaults(opts, {
    engines: {handlebars: handlebars},
    xmlPrelude: ARTICLE_XML_PRELUDE,
    xmlPostlude: '</urlset>',
    xmlTransform: (locals) => sitemapStreams.pagesToXML(locals, multiplexTemplates(opts.engines))
  });

  return {
    txt: function (req, res) {
      res.type('text');
      pageStreams.streamPages(res.locals.site.prefix)
        .pipe(pageStreams.filterPublished())
        .pipe(pageStreams.filterPublic())
        .pipe(sitemapStreams.pagesToText(res.locals))
        .pipe(res);
    },
    xml: function (req, res) {
      res.type('xml');
      pageStreams.streamPages(res.locals.site.prefix)
        .pipe(pageStreams.filterPublished())
        .pipe(pageStreams.filterPublic())
        .pipe(pageStreams.composePages(res.locals))
        .pipe(opts.xmlTransform(res.locals))
        .pipe(sitemapStreams.addBookends(opts.xmlPrelude, opts.xmlPostlude))
        .pipe(res);
    }
  };
};


module.exports.generateSitemap = generateSitemap;
module.exports.pageStreams = PageStreams;
module.exports.sitemapStreams = sitemapStreams;
