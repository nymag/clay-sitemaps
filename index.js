'use strict';

const _ = require('lodash'),
  handlebars = require('handlebars'),
  express = require('express'),
  streamPages = require('./lib/stream-pages'),
  Filters = require('./lib/filters'),
  Transforms = require('./lib/transforms'),
  DEFAULT_XML_PRELUDE = require('./lib/constants').DEFAULT_XML_PRELUDE,
  DEFAULT_XML_POSTLUDE = require('./lib/constants').DEFAULT_XML_POSTLUDE;

/**
 * Generate a standard text sitemap middleware for Clay. The page URL of each page is included.
 * Only published, public pages are included.
 * @param  {object} amphora
 * @return {string}
 */
function standardText(amphora) {
  const filters = Filters(amphora),
    transforms = Transforms(amphora);

  return (req, res) => {
    res.type('text');
    streamPages(amphora, res.locals.site.prefix)
      .pipe(filters.published())
      .pipe(filters.public())
      .pipe(transforms.pages.toText(res.locals))
      .pipe(res);
  };
}

/**
 * Generate a standard XML sitemap middleware for Clay. This includes only published, public pages.
 * The "sitemap" templates of all the components on each page are rendered and included in
 * the sitemap.
 * @param  {object} amphora
 * @param  {object} opts
 * @param  {string} opts.prelude - XML to appear before any <url> object
 * @param  {string} opts.postlude - XML to appear after last <url> object
 * @param  {object} opts.engines - Multiplex engines configuration.
 * @return {function}
 */
function standardXML(amphora, opts) {
  const filters = Filters(amphora),
    transforms = Transforms(amphora);

  opts = opts || {};

  _.defaults(opts, {
    prelude: DEFAULT_XML_PRELUDE,
    postlude: DEFAULT_XML_POSTLUDE,
    engines: {handlebars: handlebars}
  });

  return (req, res) => {
    res.type('xml');
    streamPages(amphora, res.locals.site.prefix)
      .pipe(filters.published())
      .pipe(filters.public())
      .pipe(transforms.pages.compose(res.locals))
      .pipe(transforms.pages.toXML(res.locals, opts.engines))
      .pipe(transforms.strings.addBookends(opts.prelude, opts.postlude))
      .pipe(res);
  };
}

function middleware(amphora, xmlOpts) {
  return express.Router()
    .get('/sitemap.txt', standardText(amphora))
    .get('/sitemap.xml', standardXML(amphora, xmlOpts));
}

/**
 * Binds amphora to each method as necessary so devs don't
 * have to keep passing it around on the outside.
 * @param  {object} amphora
 * @return {object} - This lib, with amphora bound to all methods that use it
 */
module.exports = function (amphora, db) {
  return {
    middleware: middleware.bind(this, amphora),
    standardText: standardText.bind(this, amphora),
    standardXML: standardXML.bind(this, amphora),
    streamPages: streamPages.bind(this, amphora, db),
    filters: Filters(amphora, db),
    transforms: Transforms(amphora, db),
    defaultXmlPrelude: DEFAULT_XML_PRELUDE,
    defaultXmlPostlude: DEFAULT_XML_POSTLUDE
  };
};
