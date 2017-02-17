'use strict';

const _ = require('lodash'),
  multiplexTemplates = require('multiplex-templates'),
  handlebars = require('handlebars'),
  streamPages = require('./page-streams').streamPages,
  composePages = require('./page-streams').composePages,
  filters = require('./filters'),
  transforms = require('./transforms'),
  DEFAULT_XML_PRELUDE = require('./constants').DEFAULT_XML_PRELUDE,
  DEFAULT_XML_POSTLUDE = require('./constants').DEFAULT_XML_POSTLUDE;

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

  opts = _.defaults(opts, {
    engines: {handlebars: handlebars},
    xmlPrelude: DEFAULT_XML_PRELUDE,
    xmlPostlude: DEFAULT_XML_POSTLUDE,
    xmlTransform: (locals) => transforms.pages.toXML(locals, multiplexTemplates(opts.engines))
  });

  return {
    txt: function (req, res) {
      res.type('text');
      streamPages(amphora, res.locals.site.prefix)
        .pipe(filters.published())
        .pipe(filters.public(amphora))
        .pipe(transforms.pages.toText(res.locals))
        .pipe(res);
    },
    xml: function (req, res) {
      res.type('xml');
      streamPages(amphora, res.locals.site.prefix)
        .pipe(filters.published())
        .pipe(filters.public(amphora))
        .pipe(composePages(amphora, res.locals))
        .pipe(opts.xmlTransform(res.locals))
        .pipe(transforms.strings.addBookends(opts.xmlPrelude, opts.xmlPostlude))
        .pipe(res);
    }
  };
};

module.exports.filters = filters;
module.exports.generateSitemap = generateSitemap;
