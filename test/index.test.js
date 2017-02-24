'use strict';

const lib = require('../index')(require('amphora')),
  expect = require('chai').expect,
  sinon = require('sinon'),
  db = require('amphora').db,
  components = require('amphora').components,
  multiplex = require('multiplex-templates')(require('handlebars')),
  composer = require('amphora').composer,
  stream = require('stream'),
  mockStream = (chunks, objectMode) => {
    const s = new stream.Readable({objectMode: objectMode, encoding: objectMode ? null : 'utf8'});

    chunks.forEach(chunk => s.push(chunk));
    s.push(null);
    return s;
  },
  expectValues = (values) => {
    let i = 0;

    return (val) => {
      const compare = values[i++];

      if (typeof compare === 'object') {
        expect(val).to.deep.equal(compare);
      } else {
        expect(val).to.equal(compare);
      }
    };
  };

describe('stream-pages', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(db);
    sandbox.stub(components, 'getTemplate');
    sandbox.stub(multiplex, 'render');
    sandbox.stub(composer, 'composePage');
    db.list.returns(mockStream([{
      key: '/foo/bar',
      value: '{"url": "bar"}'
    }, {
      key: '/baz/zar@published',
      value: '{"url": "zar"}'
    }], true));
  });

  afterEach(function () {
    sandbox.restore();
  });


  describe('streamPages', function () {
    it ('Streams and parses pages', function (done) {
      lib.streamPages('/some/site/prefix')
        .on('data', expectValues([
          {
            pageRef: '/foo/bar',
            pageData: {url: 'bar'}
          },
          {
            pageRef: '/baz/zar@published',
            pageData: {url: 'zar'}
          }
        ]))
        .on('end', ()=> done())
        .on('error', done);
    });
  });

  describe('filterPublished', function () {
    it ('Filters out unpublished pages', function (done) {
      lib.streamPages('/some/site/prefix')
        .pipe(lib.filters.published())
        .on('data', expectValues([
          {
            pageRef: '/baz/zar@published',
            pageData: {url: 'zar'}
          }
        ]))
        .on('end', ()=>done())
        .on('error', done);
    });
  });

  describe('transforms.pages.toText', function () {
    it ('Transforms each page to text', function (done) {
      lib.streamPages('/some/site/prefix')
        .pipe(lib.transforms.pages.toText())
        .on('data', expectValues([
          'bar\n',
          'zar\n'
        ]))
        .on('end', () => done())
        .on('error', done);
    });
  });

  describe('transforms.pages.compose', function () {
    it ('Composes each page in the stream, retaining page configuration data', function (done) {
      composer.composePage.onCall(0).returns(Promise.resolve({a: 'b'}));
      composer.composePage.onCall(1).returns(Promise.resolve({c: 'd'}));
      lib.streamPages('/some/site/prefix')
        .pipe(lib.transforms.pages.compose())
        .on('data', expectValues([
          {
            pageRef: '/foo/bar',
            pageData: {
              a: 'b',
              url: 'bar'
            }
          },
          {
            pageRef: '/baz/zar@published',
            pageData: {
              url: 'zar',
              c: 'd'
            }
          }
        ]))
        .on('end', ()=>done())
        .on('error', done);
    });
  });

  describe('transforms.strings.addBookends', function () {
    it('Adds a string to the start of a stream', function (done) {
      mockStream(['1','2','3'], false)
        .pipe(lib.transforms.strings.addBookends('start'))
        .setEncoding('utf8')
        .on('data', expectValues(['start','1','2','3']))
        .on('end', () => done())
        .on('error', done);
    });
    it('Adds a string to the end of a stream', function (done) {
      mockStream(['1','2','3'], false)
        .pipe(lib.transforms.strings.addBookends(null, 'end'))
        .setEncoding('utf8')
        .on('data', expectValues(['1','2','3','end']))
        .on('end', () => done())
        .on('error', done);
    });
    it('Adds both a prelude and postlude if both are specified', function (done) {
      mockStream(['1','2','3'], false)
        .pipe(lib.transforms.strings.addBookends('start', 'end'))
        .setEncoding('utf8')
        .on('data', expectValues(['start', '1','2','3','end']))
        .on('end', () => done())
        .on('error', done);
    });
    it('Adds a prelude and postlude even if there are no chunks in the stream', function (done) {
      mockStream([], false)
      .pipe(lib.transforms.strings.addBookends('start', 'end'))
      .setEncoding('utf8')
      .on('data', expectValues(['start', 'end']))
      .on('end', () => done())
      .on('error', done);
    });
  });

  describe('transforms.pages.toXML', function () {

    it('Transforms a page to XML, rendering its component sitemap templates', function (done) {
      const stream = mockStream([
        {
          pageData: {
            head: [
              {
                foo: 'bar',
                _ref: '/components/a/i'
              },
              {
                _ref: '/components/withNoTemplate'
              }
            ],
            url: 'http://a/url.html'
          },
          pageRef: '/foo/bar'
        }
      ], true);

      components.getTemplate.withArgs('/components/a/i', 'sitemap').returns('sitemap.handlebars');
      multiplex.render.returns('<foo>bar</foo>');

      stream
        .pipe(lib.transforms.pages.toXML({}, multiplex))
        .on('data', expectValues([
          '<url><loc>http://a/url.html</loc><foo>bar</foo></url>'
        ]))
        .on('end', () => done())
        .on('error', done);
    });

    it('Throws an error if it receives a page with no URL', function (done) {
      const stream = mockStream([{}], true);

      stream
        .pipe(lib.transforms.pages.toXML({}, multiplex))
        .on('error', ()=>done());
    });

  });
});
